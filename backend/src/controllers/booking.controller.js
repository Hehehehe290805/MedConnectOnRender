import mongoose  from "mongoose";
import Service from "../models/Service.js";
import Institute_Service from "../models/Institute_Service.js";
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
        const { doctorId, instituteId, serviceId: providedServiceId, start } = req.body;
        const patientId = req.user.id;
        const providerId = doctorId || instituteId;
        const providerType = doctorId ? "doctor" : "institute";

        let serviceId = providedServiceId;

        // ✅ Step 1: Ensure we have a valid serviceId
        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            let appointmentService = await Service.findOne({ name: "Appointment" });

            if (!appointmentService) {
                appointmentService = await Service.create({
                    name: "Appointment",
                    status: "verified",
                });
            }

            serviceId = appointmentService._id;
        }

        // ✅ Step 2: Determine duration
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

        // ✅ Step 3: Validate schedule
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

        // ✅ Step 4: Conflict check (provider)
        const providerAppointments = await Appointment.find({
            $or: [{ doctorId }, { instituteId }],
            status: { $in: ["pending_accept", "awaiting_deposit", "booked", "confirmed", "ongoing"] },
        });

        const providerConflict = providerAppointments.some((appt) =>
            hasOverlap(appt, startTime, endTime)
        );

        if (providerConflict) {
            return res.status(400).json({ message: "Timeslot already taken by another booking." });
        }

        // ✅ Step 5: Conflict check (patient)
        const userAppointments = await Appointment.find({
            patientId,
            status: { $in: ["pending_accept", "awaiting_deposit", "booked", "confirmed", "ongoing"] },
        });

        const userConflict = userAppointments.some((appt) =>
            hasOverlap(appt, startTime, endTime)
        );

        if (userConflict) {
            return res.status(400).json({ message: "You already have a booking that overlaps with this timeslot." });
        }

        // ✅ Step 6: Pricing lookup
        const pricing = await Pricing.findOne({ providerId, serviceId });
        if (!pricing) {
            return res.status(400).json({ message: "Pricing not found for this service." });
        }

        const totalPrice = pricing.price;
        const deposit = totalPrice * 0.1;
        const balance = totalPrice - deposit;

        // ✅ Step 7: Create appointment
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

        return res.status(201).json({
            message: "Appointment booked successfully.",
            appointment,
        });

    } catch (error) {
        console.error("Error booking appointment:", error);
        return res.status(500).json({ message: "Internal server error." });
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

        if (appointment.status !== "confirm_fully_paid") {
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
        const userId = req.user.id || req.user._id;
        const { complaint } = req.body;

        console.log("Filing complaint:", { appointmentId, userId, complaint });

        if (!complaint || !complaint.trim()) {
            return res.status(400).json({ message: "Complaint message is required." });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            console.warn("Appointment not found:", appointmentId);
            return res.status(404).json({ message: "Appointment not found." });
        }

        const patientId = appointment.patientId?.toString();
        const doctorId = appointment.doctorId?.toString();
        const instituteId = appointment.instituteId?.toString();

        const isPatient = patientId && patientId === userId.toString();
        const isDoctor = doctorId && doctorId === userId.toString();
        const isInstitute = instituteId && instituteId === userId.toString();

        if (!isPatient && !isDoctor && !isInstitute) {
            console.warn("User not part of appointment:", userId);
            return res.status(403).json({ message: "You are not part of this appointment." });
        }

        // Freeze appointment when complaint is filed
        appointment.status = "freeze";
        await appointment.save();

        // Identify target (who the complaint is about)
        let againstId;
        if (isPatient) {
            againstId = doctorId || instituteId;
        } else {
            againstId = patientId;
        }

        if (!againstId) {
            console.warn("No target to file complaint against for appointment:", appointmentId);
            return res.status(400).json({ message: "Cannot determine target user for complaint." });
        }

        const targetUser = await User.findById(againstId);
        if (!targetUser) {
            console.warn("Target user not found:", againstId);
            return res.status(404).json({ message: "User to report not found." });
        }

        const report = new Report({
            appointmentId,
            reason: complaint,
            filedBy: userId,
            filedAgainst: againstId,
        });
        await report.save();

        console.log("Complaint filed successfully:", report._id);

        res.status(201).json({ message: "Complaint filed successfully." });
    } catch (error) {
        console.error("Error filing complaint:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};


export const getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;

    const query = {
      $or: [{ doctorId: userId }, { patientId: userId }, { instituteId: userId }], // Added instituteId
      status: {
        $in: [
          "pending_accept",
          "awaiting_deposit",
          "booked",
          "confirmed",
          "ongoing",
          "marked_complete",
          "completed",
          "fully_paid",
          "confirm_fully_paid",
          "cancelled_unpaid",
          "cancelled",
          "rejected",
          "no_show_patient",
          "no_show_doctor",
          "no_show_both",
          "freeze"
        ]
      }
    };

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'firstName lastName email profilePic') // Updated field names
      .populate('patientId', 'firstName lastName email profilePic') // Updated field names
      .populate('instituteId', 'facilityName email profilePic') // Added institute
      .populate('serviceId', 'name')
      .sort({ start: 1 });

    const formatted = appointments.map((appointment) => ({
      _id: appointment._id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      serviceId: appointment.serviceId,
      instituteId: appointment.instituteId,
      status: appointment.status,
      start: appointment.start,
      end: appointment.end,
      amount: appointment.amount,
      paymentDeposit: appointment.paymentDeposit,
      depositPaid: appointment.depositPaid,
      depositRef: appointment.depositRef,
      balanceAmount: appointment.balanceAmount,
      balancePaid: appointment.balancePaid,
      balanceRef: appointment.balanceRef,
      virtual: appointment.virtual,
      videoCallLink: appointment.videoCallLink, // ✅ ADD THIS LINE
      patientPresent: appointment.patientPresent,
      doctorPresent: appointment.doctorPresent,
      institutePresent: appointment.institutePresent,
      bothPresent: appointment.bothPresent,
      rejectionReason: appointment.rejectionReason,
      rating: appointment.rating,
      review: appointment.review,
      role: appointment.doctorId && String(appointment.doctorId._id) === String(userId)
        ? "doctor"
        : appointment.instituteId && String(appointment.instituteId._id) === String(userId)
        ? "institute"
        : String(appointment.patientId._id) === String(userId)
        ? "patient"
        : "unknown"
    }));

    res.status(200).json({
      success: true,
      appointments: formatted,
      timezone: "Asia/Manila (UTC+8)"
    });
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching appointments"
    });
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
                { start: { $lte: fiveMinutesAgo }, status: { $in: ["booked", "confirmed"] } },
                { end: { $lte: now }, status: { $in: ["ongoing"] } }
            ]
        });

        for (const appointment of appointments) {
            if (appointment.bothPresent && appointment.end <= now && appointment.status === "ongoing") {
                appointment.status = "completed";
                await appointment.save();
                continue;
            }

            if (appointment.bothPresent || appointment.status === "ongoing" || appointment.status === "completed") continue;

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

export const checkStartedAppointments = async () => {
  const now = new Date();
  try {
    const appointments = await Appointment.find({
      start: { $lte: now },
      status: "confirmed"
    })
    .populate('doctorId', '_id')
    .populate('patientId', '_id');

    if (appointments.length > 0) {
      console.log(`[CRON] Found ${appointments.length} appointments to mark as ongoing`);
    }

    for (const appointment of appointments) {
      try {
        const doctorId = appointment.doctorId._id.toString();
        const patientId = appointment.patientId._id.toString();
        
        // Generate channel ID (same logic as ChatPage)
        const channelId = [doctorId, patientId].sort().join("-");
        
        // Generate the call link
        const callUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/call/${channelId}`;
        
        // Update appointment
        appointment.status = "ongoing";
        appointment.videoCallLink = callUrl;
        await appointment.save();
        
        console.log(`[CRON] ✅ Marked appointment ${appointment._id} as ongoing`);
        console.log(`[CRON] 🎥 Video call link: ${callUrl}`);
      } catch (err) {
        console.error(`[CRON] ❌ Error updating appointment ${appointment._id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error checking started appointments:", err);
    throw err;
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

        if (!["confirmed", "ongoing", "confirm_fully_paid", "marked_complete"].includes(appointment.status)) {
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

