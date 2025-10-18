import Doctor_Appointment from "../models/Doctor_Appointment.js";
import DoctorSchedule from "../models/DoctorSchedule.js";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

import { createPayMongoPayment } from "../utils/paymongo.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Manila'); // Philippine Time UTC+8

const toPhTime = (date) => dayjs(date).tz('Asia/Manila');

// ---------------------- Book Appointment ----------------------
export async function bookAppointment(req, res) {
    try {
        const { doctorId, start, end, method } = req.body;
        const patientId = req.user?._id;

        if (!doctorId || !start || !end || !method)
            return res.status(400).json({ message: "Missing required fields" });

        const schedule = await DoctorSchedule.findOne({ doctorId });
        if (!schedule || !schedule.isActive)
            return res.status(400).json({ message: "Doctor is not available" });

        const appointmentStart = dayjs(start).tz('Asia/Manila');
        const appointmentEnd = dayjs(end).tz('Asia/Manila');
        const now = dayjs().tz('Asia/Manila');

        // Validate booking rules
        if (appointmentStart.diff(now, 'day') > 5) return res.status(400).json({ message: "Cannot book more than 5 days in advance" });
        if (appointmentStart.diff(now, 'hour') < 1) return res.status(400).json({ message: "Must book at least 1 hour before appointment time" });
        if (!schedule.daysOfWeek.includes(appointmentStart.day())) return res.status(400).json({ message: "Doctor not working on this day" });
        const scheduleStartMin = Number(schedule.startHour.split(":")[0]) * 60 + Number(schedule.startHour.split(":")[1]);
        let scheduleEndMin = Number(schedule.endHour.split(":")[0]) * 60 + Number(schedule.endHour.split(":")[1]);
        if (schedule.endHour === "24:00") scheduleEndMin = 24 * 60;
        const startMin = appointmentStart.hour() * 60 + appointmentStart.minute();
        const endMin = appointmentEnd.hour() * 60 + appointmentEnd.minute();
        if (startMin < scheduleStartMin || endMin > scheduleEndMin)
            return res.status(400).json({ message: `Outside doctor's working hours` });
        if (appointmentEnd.diff(appointmentStart, 'minute') !== 30) return res.status(400).json({ message: "Appointment must be 30 mins long" });

        // Check overlapping
        const overlap = await Doctor_Appointment.findOne({
            doctorId,
            status: { $in: ["booked", "confirmed"] },
            $or: [
                { start: { $lt: new Date(end), $gte: new Date(start) } },
                { end: { $gt: new Date(start), $lte: new Date(end) } },
                { start: { $lte: new Date(start) }, end: { $gte: new Date(end) } },
            ]
        });
        if (overlap) return res.status(400).json({ message: "Time slot already booked" });

        // Deposit & total
        const totalAmount = 1000; // example, replace with real price
        const depositAmount = Math.round(totalAmount * 0.1);

        const appointment = await Doctor_Appointment.create({
            doctorId,
            patientId,
            start: new Date(start),
            end: new Date(end),
            status: "booked",
            method,
            amount: totalAmount,
            paymentDeposit: depositAmount,
            depositPaid: false,
            balancePaid: false,
            currency: "PHP"
        });

        const doctor = await User.findById(doctorId);

        // Payment link
        if (method === "gcash" && doctor.gcashLink) appointment.paymentLink = doctor.gcashLink;
        else if (method === "paymongo") {
            const link = await createPayMongoPayment(appointment, doctor);
            appointment.paymentLink = link;
        }
        
        // After appointment creation
        await createPaymentRecord(appointment, "deposit");

        appointment.depositPaid = true;
        await appointment.save();

        res.status(201).json({
            success: true,
            appointment,
            phTime: { start: appointmentStart.format('YYYY-MM-DD HH:mm'), end: appointmentEnd.format('YYYY-MM-DD HH:mm') },
            paymentLink: appointment.paymentLink
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// ---------------------- Cancel Appointment ----------------------
export async function cancelAppointment(req, res) {
    try {
        const { appointmentId } = req.body;
        const patientId = req.user._id;

        const appointment = await Doctor_Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        if (appointment.patientId.toString() !== patientId.toString()) return res.status(403).json({ message: "Cannot cancel this appointment" });
        if (["completed", "no show"].includes(appointment.status))
            return res.status(400).json({ message: `Cannot cancel a ${appointment.status} appointment` });

        if (appointment.status === "booked") appointment.depositPaid = false; // refund deposit
        else if (appointment.status === "confirmed") appointment.depositPaid = true; // deposit goes to doctor

        appointment.status = "cancelled";
        await appointment.save();

        res.status(200).json({ success: true, message: "Appointment cancelled", appointment });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getUserAppointments(req, res) {
    try {
        const patientId = req.user?._id;  // Logged-in user
        if (!patientId) return res.status(401).json({ message: "Unauthorized" });

        // Fetch all appointments for this user
        const appointments = await Doctor_Appointment.find({ patientId })
            .sort({ start: 1 }); // Sort by upcoming first

        // Map to PH time
        const formatted = appointments.map(a => ({
            _id: a._id,
            doctorId: a.doctorId,
            status: a.status,
            start: a.start,
            end: a.end,
            phTime: {
                start: toPhTime(a.start).format('YYYY-MM-DD HH:mm'),
                end: toPhTime(a.end).format('YYYY-MM-DD HH:mm')
            }
        }));

        res.status(200).json({
            success: true,
            appointments: formatted,
            timezone: "Asia/Manila (UTC+8)"
        });

    } catch (error) {
        console.error("Error fetching user appointments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// Submit rating & review after appointment is completed
export async function submitReview(req, res) {
    try {
        const { appointmentId } = req.params;
        const { rating, review } = req.body;
        const patientId = req.user._id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        const appointment = await Doctor_Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        if (appointment.patientId.toString() !== patientId.toString()) {
            return res.status(403).json({ message: "You can only review your own appointments" });
        }

        if (appointment.status !== "completed") {
            return res.status(400).json({ message: "Cannot review an appointment that is not completed" });
        }

        appointment.rating = rating;
        appointment.review = review || "";
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Review submitted successfully",
            appointment
        });

    } catch (error) {
        console.error("Error submitting review:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}