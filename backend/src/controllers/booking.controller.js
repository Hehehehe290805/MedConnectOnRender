import Appointment from "../models/Appointment.js";
import Pricing from "../models/Pricing.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Schedule from "../models/Schedule.js";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Manila"); // Philippine Time UTC+8
const toPhTime = (date) => dayjs(date).tz("Asia/Manila");

const GAP_MINUTES = 5;

// ✅ Helper: convert HH:mm to dayjs Date with same day
function applyTimeToDate(date, timeStr) {
    const [hour, minute] = timeStr.split(":").map(Number);
    return dayjs(date).hour(hour).minute(minute).second(0).millisecond(0);
}

// ✅ Helper: check overlap with 5-minute buffer
function hasOverlap(existing, start, end) {
    const gapStart = dayjs(start).subtract(GAP_MINUTES, "minute");
    const gapEnd = dayjs(end).add(GAP_MINUTES, "minute");
    return dayjs(existing.start).isBefore(gapEnd) && dayjs(existing.end).isAfter(gapStart);
}


// Appointments
export const bookAppointment = async (req, res) => {
    try {
        const { doctorId, instituteId, serviceId, start } = req.body;
        const patientId = req.user.id;
        const providerId = doctorId || instituteId;
        const providerType = doctorId ? "doctor" : "institute";

        // Parse start time and duration
        const startTime = dayjs(start);
        let durationMinutes;

        if (providerType === "doctor") {
            durationMinutes = 30;
        } else {
            const serviceData = await Institute_Service.findOne({ instituteId, serviceId });
            if (!serviceData) {
                return res.status(404).json({ message: "Service not found for institute." });
            }
            durationMinutes = serviceData.durationMinutes;
        }

        const endTime = startTime.add(durationMinutes, "minute");

        // ✅ Check schedule (operating hours)
        const schedule = await Schedule.findOne({
            $or: [{ doctorId }, { instituteId }],
        });

        if (!schedule) {
            return res.status(400).json({ message: "Provider schedule not found." });
        }

        const dayOfWeek = startTime.day();
        if (!schedule.daysOfWeek.includes(dayOfWeek)) {
            return res.status(400).json({ message: "Booking outside provider operating days." });
        }

        const dayStart = applyTimeToDate(startTime, schedule.startHour);
        const dayEnd = applyTimeToDate(startTime, schedule.endHour);

        if (startTime.isBefore(dayStart) || endTime.isAfter(dayEnd)) {
            return res.status(400).json({ message: "Booking out of operating hours." });
        }

        // ✅ Overlap check - provider side
        const providerAppointments = await Appointment.find({
            $or: [{ doctorId }, { instituteId }],
            status: { $in: ["pending_accept", "awaiting_deposit", "booked", "confirmed", "ongoing"] },
        });

        const providerConflict = providerAppointments.some(appt =>
            hasOverlap(appt, startTime, endTime)
        );

        if (providerConflict) {
            return res.status(400).json({ message: "Timeslot already taken by another booking." });
        }

        // ✅ Overlap check - patient side
        const userAppointments = await Appointment.find({
            patientId,
            status: { $in: ["pending_accept", "awaiting_deposit", "booked", "confirmed", "ongoing"] },
        });

        const userConflict = userAppointments.some(appt =>
            hasOverlap(appt, startTime, endTime)
        );

        if (userConflict) {
            return res.status(400).json({ message: "You already have a booking that overlaps with this timeslot." });
        }

        // ✅ Pricing
        const pricing = await Pricing.findOne({ providerId, serviceId });
        if (!pricing) {
            return res.status(400).json({ message: "Pricing not found for this service." });
        }

        const totalPrice = pricing.price;
        const deposit = totalPrice * 0.1;
        const balance = totalPrice - deposit;

        // ✅ Create Appointment
        const appointment = await Appointment.create({
            doctorId: doctorId || null,
            instituteId: instituteId || null,
            patientId,
            serviceId,
            virtual: providerType === "doctor",
            start: startTime.toDate(),
            end: endTime.toDate(),
            amount: totalPrice,
            paymentDeposit: deposit,
            balanceAmount: balance,
        });

        res.status(201).json({
            message: "Appointment booked successfully.",
            appointment,
        });

    } catch (error) {
        console.error("Error booking appointment:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const payDeposit = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { appointmentId, referenceNumber } = req.body;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        if (appointment.patientId.toString() !== patientId.toString())
            return res.status(403).json({ message: "You can only pay for your own appointments" });
        if (!appointmentId || !referenceNumber) 
            return res.status(403).json({ message: "Both Fields Required" });
        if (appointment.status !== "awaiting_deposit")
            return res.status(400).json({ message: "Cannot pay deposit at this stage" });

        // Record deposit
        appointment.depositPaid = true;
        appointment.depositRef = referenceNumber;
        appointment.status = "booked";

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Deposit paid successfully. Appointment is now booked.",
            appointment: {
                ...appointment.toObject(),
                phTime: {
                    start: toPhTime(appointment.start).format("YYYY-MM-DD HH:mm"),
                    end: toPhTime(appointment.end).format("YYYY-MM-DD HH:mm"),
                }
            }
        });
    } catch (err) {
        console.error("Error paying deposit:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const cancelAppointment = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { appointmentId } = req.body;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });
        if (appointment.patientId.toString() !== patientId.toString())
            return res.status(403).json({ message: "Not authorized" });

        // Can cancel if doctor hasn't accepted or deposit not paid yet
        if (["pending_accept", "awaiting_deposit"].includes(appointment.status)) {
            appointment.status = "cancelled_unpaid";
        } else if (appointment.status === "booked") {
            appointment.status = "cancelled"; // deposit forfeited
        } else {
            return res.status(400).json({ message: "Cannot cancel at this stage" });
        }

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully",
            appointment: {
                ...appointment.toObject(),
                phTime: {
                    start: toPhTime(appointment.start).format("YYYY-MM-DD HH:mm"),
                    end: toPhTime(appointment.end).format("YYYY-MM-DD HH:mm")
                }
            }
        });
    } catch (err) {
        console.error("Error cancelling appointment:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const submitReview = async (req, res) => {
    try {
        const { appointmentId, rating, review } = req.body;  // ← From request body now
        const patientId = req.user._id;

        if (!appointmentId) {
            return res.status(400).json({ message: "Appointment ID is required" });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be 1-5" });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.patientId.toString() !== patientId.toString()) {
            return res.status(403).json({ message: "You can only review your own appointments" });
        }

        if (appointment.status !== "completed") {
            return res.status(400).json({ message: "Cannot review incomplete appointment" });
        }

        appointment.rating = rating;
        appointment.review = review || "";
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Review submitted successfully",
            appointment
        });
    } catch (err) {
        console.error("Error submitting review:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const payRemaining = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { appointmentId, referenceNumber } = req.body;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        if (appointment.patientId.toString() !== patientId.toString())
            return res.status(403).json({ message: "You can only pay for your own appointments" });

        if (!appointment.depositPaid) {
            return res.status(400).json({ message: "Deposit has not been paid yet" });
        }

        if (!["completed"].includes(appointment.status)) {
            return res.status(400).json({ message: "Cannot pay remaining at this stage" });
        }

        // Record remaining payment
        appointment.balancePaid = true;
        appointment.balanceRef = referenceNumber;
        appointment.status = "fully_paid";

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Remaining balance paid successfully. Appointment is now fully paid.",
            appointment: {
                ...appointment.toObject(),
                phTime: {
                    start: toPhTime(appointment.start).format("YYYY-MM-DD HH:mm"),
                    end: toPhTime(appointment.end).format("YYYY-MM-DD HH:mm"),
                }
            }
        });

    } catch (err) {
        console.error("Error paying remaining balance:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const fileComplaint = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user.id;
        const { complaint } = req.body;

        if (!complaint || !complaint.trim()) {
            return res.status(400).json({ message: "Complaint message is required." });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        const isPatient = appointment.patientId?.toString() === userId;
        const isDoctor = appointment.doctorId?.toString() === userId;
        const isInstitute = appointment.instituteId?.toString() === userId;

        if (!isPatient && !isDoctor && !isInstitute) {
            return res.status(403).json({ message: "You are not part of this appointment." });
        }

        // Freeze appointment when complaint is filed
        appointment.status = "freeze";
        await appointment.save();

        // Identify target (who the complaint is about)
        let againstId;
        if (isPatient) {
            againstId = appointment.doctorId || appointment.instituteId;
        } else {
            againstId = appointment.patientId;
        }

        const targetUser = await User.findById(againstId);
        if (!targetUser) {
            return res.status(404).json({ message: "User to report not found." });
        }

        const report = new Report({
            appointmentId,
            complaint,
            filedBy: userId,
            against: againstId,
        });
        await report.save();

        res.status(201).json({ message: "Complaint filed successfully." });
    } catch (error) {
        console.error("Error filing complaint:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const getUserAppointments = async (req, res) => {
    try {
        const patientId = req.user._id;
        const appointments = await Appointment.find({
            patientId,
            status: { $in: [
                "pending_accept",
                "awaiting_deposit",
                "booked",                 // deposit paid
                "confirmed",              // deposit confirmed by doctor
                "ongoing",
                "completed",
                "fully_paid",             // waiting for remaining payment
                "confirm_fully_paid",     // full payment confirmed

                "cancelled_unpaid",
                "cancelled",
                "rejected",
                "no_show_patient",
                "no_show_doctor",
                "no_show_both",
                "freeze"
            ] }
        }).sort({ start: 1 });

        const formatted = appointments.map(a => ({
            _id: a._id,
            doctorId: a.doctorId,
            status: a.status,
            start: a.start,
            end: a.end,
            phTime: {
                start: toPhTime(a.start).format("YYYY-MM-DD HH:mm"),
                end: toPhTime(a.end).format("YYYY-MM-DD HH:mm")
            }
        }));

        res.status(200).json({ success: true, appointments: formatted, timezone: "Asia/Manila (UTC+8)" });
    } catch (err) {
        console.error("Error fetching appointments:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const markAttendance = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user.id;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        const isPatient = appointment.patientId?.toString() === userId;
        const isDoctor = appointment.doctorId?.toString() === userId;
        const isInstitute = appointment.instituteId?.toString() === userId;

        if (!isPatient && !isDoctor && !isInstitute) {
            return res.status(403).json({ message: "You are not part of this appointment." });
        }

        // Mark appropriate attendance
        if (isPatient) appointment.patientPresent = true;
        if (isDoctor) appointment.doctorPresent = true;
        if (isInstitute) appointment.institutePresent = true;

        // If both patient + provider (doctor/institute) are present, mark ongoing
        const providerPresent = appointment.doctorPresent || appointment.institutePresent;
        if (appointment.patientPresent && providerPresent && appointment.status === "booked") {
            appointment.status = "ongoing";
        }

        await appointment.save();
        res.status(200).json({ message: "Attendance marked successfully.", appointment });
    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const checkNoShows = async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    try {
        const appointments = await Appointment.find({
            $or: [
                // Appointments that started 5+ mins ago (for no-show check)
                { start: { $lte: fiveMinutesAgo }, status: { $in: ["booked", "confirmed"] } },
                // Appointments that ended (for auto-completion)
                { end: { $lte: now }, status: { $in: ["ongoing"] } }
            ]
        });

        for (const appointment of appointments) {
            // ✅ Auto-complete if both present and past end time
            if (appointment.bothPresent && appointment.end <= now && appointment.status === "ongoing") {
                appointment.status = "completed";
                await appointment.save();
                continue;
            }

            // ❌ Skip if already marked as ongoing/completed or both present
            if (appointment.bothPresent || appointment.status === "ongoing" || appointment.status === "completed") continue;

            // 🕒 No-show logic for appointments that started 5+ mins ago
            if (appointment.start <= fiveMinutesAgo && ["booked", "confirmed"].includes(appointment.status)) {
                if (!appointment.doctorPresent && !appointment.patientPresent) {
                    appointment.status = "no_show_both";
                } else if (appointment.doctorPresent && !appointment.patientPresent) {
                    appointment.status = "no_show_patient";
                } else if (!appointment.doctorPresent && appointment.patientPresent) {
                    appointment.status = "no_show_doctor";
                }

                await appointment.save();
            }
        }
    } catch (err) {
        console.error("Error checking no-shows:", err);
    }
};

export const completeAppointment = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { appointmentId } = req.body;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        if (appointment.patientId.toString() !== patientId.toString())
            return res.status(403).json({ message: "Only the patient can mark appointment as completed" });

        if (!["confirmed", "ongoing", "confirm_fully_paid"].includes(appointment.status)) {
            return res.status(400).json({ message: "Appointment cannot be completed at this stage" });
        }

        appointment.status = "completed";
        await appointment.save();

        res.status(200).json({ success: true, message: "Appointment marked as completed.", appointment });
    } catch (err) {
        console.error("Error completing appointment:", err);
        res.status(500).json({ message: "Server error" });
    }
};