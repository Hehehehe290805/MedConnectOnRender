import Appointment_Service from "../models/Appointment_Service.js";
import Pricing from "../models/Pricing.js";
import Report from "../models/Report.js";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Manila"); // Philippine Time UTC+8
const toPhTime = (date) => dayjs(date).tz("Asia/Manila");

export const bookAppointment = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { doctorId, start, end, serviceId, method } = req.body;

        if (!doctorId || !start || !end || !serviceId || !method) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const startPh = toPhTime(start);
        const endPh = toPhTime(end);

        if (!startPh.isValid() || !endPh.isValid()) {
            return res.status(400).json({ message: "Invalid date format" });
        }
        if (startPh.isAfter(endPh)) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        const startDate = startPh.toDate();
        const endDate = endPh.toDate();

        // ✅ Get the price from the Pricing model snapshot
        const pricingRecord = await Pricing.findOne({
            providerId: doctorId,
            serviceId: serviceId
        });
        
        if (!pricingRecord) {
            return res.status(404).json({ message: "Pricing information not found for this service" });
        }
        const amount = pricingRecord.price;

        // ❌ Prevent overlapping appointments for doctor
        const overlapping = await Appointment_Service.findOne({
            doctorId,
            $or: [
                { start: { $lt: endDate, $gte: startDate } },
                { end: { $lte: endDate, $gt: startDate } },
                { $and: [{ start: { $lte: startDate } }, { end: { $gte: endDate } }] } // covers full overlap too
            ],
            status: {
                $in: [
                    "pending_accept", "awaiting_deposit", "booked",
                    "pending_full_payment", "fully_paid", "confirmed", "ongoing"
                ]
            },
        });

        if (overlapping) {
            return res.status(400).json({ message: "Doctor not available at this time" });
        }

        // 💰 Calculate deposit
        const deposit = Math.round(amount * 0.1);

        // 🆕 Create appointment
        const newAppointment = new Appointment_Service({
            doctorId,
            patientId,
            serviceId,
            start: startDate,
            end: endDate,
            method,
            amount,
            paymentDeposit: deposit,
            balanceAmount: amount - deposit,
            status: "pending_accept",
        });

        await newAppointment.save();

        return res.status(201).json({
            success: true,
            message: "Appointment booked successfully. Waiting for doctor's acceptance.",
            appointment: {
                ...newAppointment.toObject(),
                phTime: {
                    start: startPh.format("YYYY-MM-DD HH:mm"),
                    end: endPh.format("YYYY-MM-DD HH:mm")
                }
            }
        });
    } catch (err) {
        console.error("Error booking appointment:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const payDeposit = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { appointmentId, referenceNumber } = req.body;

        const appointment = await Appointment_Service.findById(appointmentId);
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

        const appointment = await Appointment_Service.findById(appointmentId);
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

        const appointment = await Appointment_Service.findById(appointmentId);
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

        const appointment = await Appointment_Service.findById(appointmentId);
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
        const { appointmentId, reason } = req.body;
        const userId = req.user._id;

        const appointment = await Appointment_Service.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        const isPatient = appointment.patientId.toString() === userId.toString();
        const isDoctor = appointment.doctorId.toString() === userId.toString();
        if (!isPatient && !isDoctor) return res.status(403).json({ message: "Unauthorized" });

        const filedBy = userId;
        const filedAgainst = isPatient ? appointment.doctorId : appointment.patientId;
        const userRole = isPatient ? "patient" : "doctor";

        // Freeze appointment
        appointment.status = "freeze";
        await appointment.save();

        const report = new Report({
            appointmentId,
            filedBy,
            filedAgainst,
            reason,
            status: "pending"
        });
        await report.save();

        res.status(201).json({
            success: true,
            message: `Complaint filed by ${userRole}. Appointment frozen and under review.`,
            report
        });
    } catch (err) {
        console.error("Error filing complaint:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getUserAppointments = async (req, res) => {
    try {
        const patientId = req.user._id;
        const appointments = await Appointment_Service.find({
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
        const userId = req.user._id;
        const { appointmentId } = req.body;

        const appointment = await Appointment_Service.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        const isDoctor = appointment.doctorId.toString() === userId.toString();
        const isPatient = appointment.patientId.toString() === userId.toString();
        if (!isDoctor && !isPatient) return res.status(403).json({ message: "Unauthorized" });

        const now = new Date();
        if (now < appointment.start) return res.status(400).json({ message: "Too early to mark attendance" });

        if (isDoctor) appointment.doctorPresent = true;
        if (isPatient) appointment.patientPresent = true;

        if (appointment.doctorPresent && appointment.patientPresent) {
            appointment.bothPresent = true;
            if (["booked", "confirmed"].includes(appointment.status)) appointment.status = "ongoing";
        }

        await appointment.save();

        res.status(200).json({
            success: true,
            message: isDoctor ? "Doctor marked as present" : "Patient marked as present",
            appointment
        });
    } catch (err) {
        console.error("Error marking attendance:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const checkNoShows = async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    try {
        const appointments = await Appointment_Service.find({
            start: { $lte: fiveMinutesAgo },
            status: { $in: ["booked", "confirmed"] },
        });

        for (const appointment of appointments) {
            if (appointment.bothPresent || appointment.status === "ongoing" || appointment.status === "completed") continue;

            if (!appointment.doctorPresent && !appointment.patientPresent) {
                appointment.status = "no_show_both";
            } else if (appointment.doctorPresent && !appointment.patientPresent) {
                appointment.status = "no_show_patient";
            } else if (!appointment.doctorPresent && appointment.patientPresent) {
                appointment.status = "no_show_doctor";
            }

            await appointment.save();
        }
    } catch (err) {
        console.error("Error checking no-shows:", err);
    }
};

export const completeAppointment = async (req, res) => {
    try {
        const patientId = req.user._id;
        const { appointmentId } = req.body;

        const appointment = await Appointment_Service.findById(appointmentId);
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