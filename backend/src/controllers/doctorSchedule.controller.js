import DoctorSchedule from "../models/DoctorSchedule.js";
import Appointment from "../models/Doctor_Appointment.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Manila"); // Philippine Time

const toPhTime = (date) => dayjs(date).tz("Asia/Manila");
const nowPhTime = () => dayjs().tz("Asia/Manila");

// Generate available slots in PH time
export async function generateAvailableSlots(doctorId, daysAhead = 5) {
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
        const doctorId = req.user._id; // Assuming doctor is logged in

        if (!appointmentId) {
            return res.status(400).json({ message: "Appointment ID is required" });
        }

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if the logged-in user is the doctor for this appointment
        if (appointment.doctorId.toString() !== doctorId.toString()) {
            return res.status(403).json({ message: "You can only confirm your own appointments" });
        }

        // Check if appointment is already confirmed or in terminal state
        if (appointment.status === "confirmed") {
            return res.status(400).json({ message: "Appointment is already confirmed" });
        }

        if (appointment.status === "cancelled" || appointment.status === "completed" || appointment.status === "no show") {
            return res.status(400).json({ message: "Cannot confirm a cancelled, completed, or no-show appointment" });
        }

        // Update status to confirmed
        appointment.status = "confirmed";
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment confirmed successfully",
            appointment
        });

    } catch (error) {
        console.error("Error confirming appointment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function completeAppointment(req, res) {
    try {
        const { appointmentId, outcome } = req.body; // outcome: "completed" or "no show"
        const doctorId = req.user._id;

        if (!appointmentId || !outcome) {
            return res.status(400).json({ message: "Appointment ID and outcome are required" });
        }

        if (!["completed", "no show"].includes(outcome)) {
            return res.status(400).json({ message: "Outcome must be either 'completed' or 'no show'" });
        }

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if the logged-in user is the doctor for this appointment
        if (appointment.doctorId.toString() !== doctorId.toString()) {
            return res.status(403).json({ message: "You can only update your own appointments" });
        }

        // Check if appointment is already in terminal state
        if (appointment.status === "completed" || appointment.status === "no show") {
            return res.status(400).json({ message: "Appointment is already marked as completed or no show" });
        }

        // Check if appointment time has passed (for no show) or is ongoing (for completion)
        const now = dayjs();
        const appointmentStart = dayjs(appointment.start);

        if (outcome === "no show" && now.isBefore(appointmentStart)) {
            return res.status(400).json({
                message: "Cannot mark as no show before appointment start time"
            });
        }

        // Update status
        appointment.status = outcome;
        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Appointment marked as ${outcome} successfully`,
            appointment
        });

    } catch (error) {
        console.error("Error completing appointment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

