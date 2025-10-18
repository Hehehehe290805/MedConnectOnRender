import DoctorSchedule from "../models/DoctorSchedule.js";
import Appointment from "../models/Doctor_Appointment.js";
import User from "../models/User.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import { createPayMongoPayment } from "../utils/paymongo.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Manila"); // Philippine Time

const toPhTime = (date) => dayjs(date).tz("Asia/Manila");
const nowPhTime = () => dayjs().tz("Asia/Manila");

// Generate available slots in PH time
async function generateAvailableSlots(doctorId, daysAhead = 5) {
    if (!doctorId) return [];

    const availability = await DoctorSchedule.findOne({ doctorId });
    if (!availability || !availability.isActive) return [];

    const slotDuration = 30; // minutes
    const gap = 5; // minutes between slots
    const slots = [];
    const now = nowPhTime();

    let endHour = availability.endHour;
    if (endHour === "24:00") endHour = "00:00";

    for (let i = 0; i < daysAhead; i++) {
        const day = now.add(i, "day").startOf("day");
        const weekday = day.day();
        if (!availability.daysOfWeek.includes(weekday)) continue;

        let start = day
            .hour(Number(availability.startHour.split(":")[0]))
            .minute(Number(availability.startHour.split(":")[1]))
            .second(0);

        let end = day
            .hour(Number(endHour.split(":")[0]))
            .minute(Number(endHour.split(":")[1]))
            .second(0);

        if (endHour === "00:00") end = end.add(1, "day");

        let currentTime = start.clone();

        while (currentTime.add(slotDuration, "minute").isBefore(end)) {
            const slotStart = currentTime.toDate();
            const slotEnd = currentTime.add(slotDuration, "minute").toDate();

            const overlapping = await Appointment.findOne({
                doctorId,
                status: { $in: ["booked", "confirmed", "cancelled", "completed"] },
                $or: [
                    { start: { $lt: slotEnd, $gte: slotStart } },
                    { end: { $gt: slotStart, $lte: slotEnd } },
                    { start: { $lte: slotStart }, end: { $gte: slotEnd } },
                ],
            });

            if (!overlapping) {
                slots.push({ start: slotStart, end: slotEnd });
            }

            currentTime = currentTime.add(slotDuration + gap, "minute");
        }
    }

    return slots;
}

// Doctor's private calendar (for logged-in doctor)
export async function getDoctorCalendar(req, res) {
    try {
        const { daysAhead = 5 } = req.query;
        const doctorId = req.user?._id;
        if (!doctorId) return res.status(400).json({ message: "doctorId is required" });

        const slots = await generateAvailableSlots(doctorId, Number(daysAhead));
        const appointments = await Appointment.find({
            doctorId,
            status: { $in: ["booked", "confirmed", "cancelled", "completed"] },
            start: { $gte: new Date() },
        });

        const events = [
            ...slots.map((s) => ({
                start: toPhTime(s.start).format(), // PH time ISO string
                end: toPhTime(s.end).format(),
                title: "Available",
                type: "availability",
                phTime:
                    toPhTime(s.start).format("YYYY-MM-DD HH:mm") +
                    " to " +
                    toPhTime(s.end).format("HH:mm"),
            })),
            ...appointments.map((a) => ({
                start: toPhTime(a.start).format(),
                end: toPhTime(a.end).format(),
                title: a.status.charAt(0).toUpperCase() + a.status.slice(1),
                type: "appointment",
                phTime:
                    toPhTime(a.start).format("YYYY-MM-DD HH:mm") +
                    " to " +
                    toPhTime(a.end).format("HH:mm"),
            })),
        ];

        res.status(200).json({
            success: true,
            events,
            timezone: "Asia/Manila (UTC+8)",
        });
    } catch (error) {
        console.error("Error fetching doctor calendar:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// Public calendar (anyone can view)
export async function getDoctorPublicCalendar(req, res) {
    try {
        const { doctorId, daysAhead = 5 } = req.query;
        if (!doctorId) return res.status(400).json({ message: "doctorId is required" });

        const slots = await generateAvailableSlots(doctorId, Number(daysAhead));
        const appointments = await Appointment.find({
            doctorId,
            status: { $in: ["booked", "confirmed", "cancelled", "completed"] },
            start: { $gte: new Date() },
        });

        const events = [
            ...slots.map((s) => ({
                start: toPhTime(s.start).format(),
                end: toPhTime(s.end).format(),
                title: "Available",
                type: "availability",
                phTime:
                    toPhTime(s.start).format("YYYY-MM-DD HH:mm") +
                    " to " +
                    toPhTime(s.end).format("HH:mm"),
            })),
            ...appointments.map((a) => ({
                start: toPhTime(a.start).format(),
                end: toPhTime(a.end).format(),
                title: a.status.charAt(0).toUpperCase() + a.status.slice(1),
                type: "appointment",
                phTime:
                    toPhTime(a.start).format("YYYY-MM-DD HH:mm") +
                    " to " +
                    toPhTime(a.end).format("HH:mm"),
            })),
        ];

        events.sort((a, b) => new Date(a.start) - new Date(b.start));

        res.status(200).json({
            success: true,
            events,
            timezone: "Asia/Manila (UTC+8)",
        });
    } catch (error) {
        console.error("Error fetching doctor public schedule:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function setAvailability(req, res) {
    const { doctorId, startHour, endHour, daysOfWeek, isActive } = req.body;

    if (!doctorId || !startHour || !endHour || !daysOfWeek) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const availability = await DoctorSchedule.findOneAndUpdate(
        { doctorId },
        { startHour, endHour, daysOfWeek, isActive },
        { upsert: true, new: true }
    );

    res.status(200).json({ success: true, availability });
}

export async function confirmAppointment(req, res) {
    try {
        const { appointmentId } = req.body;
        const doctorId = req.user._id;

        const appointment = await Doctor_Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        if (appointment.doctorId.toString() !== doctorId.toString()) return res.status(403).json({ message: "Cannot confirm this appointment" });

        if (["confirmed", "completed", "cancelled", "no show"].includes(appointment.status))
            return res.status(400).json({ message: `Cannot confirm appointment in status ${appointment.status}` });

        appointment.status = "confirmed";
        appointment.depositPaid = true; // deposit now belongs to doctor
        await appointment.save();

        res.status(200).json({ success: true, message: "Appointment confirmed", appointment });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function completeAppointment(req, res) {
    try {
        const { appointmentId } = req.body; // only "completed" is allowed now
        const doctorId = req.user._id;

        if (!appointmentId)
            return res.status(400).json({ message: "Appointment ID is required" });

        const appointment = await Doctor_Appointment.findById(appointmentId);
        if (!appointment)
            return res.status(404).json({ message: "Appointment not found" });

        if (appointment.doctorId.toString() !== doctorId.toString())
            return res.status(403).json({ message: "Cannot complete this appointment" });

        if (appointment.status === "completed")
            return res.status(400).json({ message: "Appointment already completed" });

        // Mark appointment as completed
        appointment.status = "completed";

        // Handle remaining balance payment
        if (!appointment.balancePaid) {
            const doctor = await User.findById(appointment.doctorId);
            const remainingAmount = appointment.amount - appointment.paymentDeposit;

            // Create a Payment record for balance
            await Payment.create({
                appointmentId: appointment._id,
                doctorId: doctor._id,
                patientId: appointment.patientId,
                amount: remainingAmount,
                method: appointment.method,
                status: "pending",
                type: "balance",
            });

            if (appointment.method === "paymongo") {
                const paymentLink = await createPayMongoPayment({ ...appointment.toObject(), amount: remainingAmount }, doctor);
                appointment.paymentLink = paymentLink;
            } else if (appointment.method === "gcash") {
                // Assume doctor collects manually
                appointment.balancePaid = true;
            }
        }

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment marked as completed",
            appointment
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}