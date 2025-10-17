import Doctor_Appointment from "../models/Doctor_Appointment.js";
import DoctorSchedule from "../models/DoctorSchedule.js";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Manila'); // Philippine Time UTC+8

const toPhTime = (date) => dayjs(date).tz('Asia/Manila');
const nowPhTime = () => dayjs().tz('Asia/Manila');

// ---------------------- Book Appointment ----------------------
export async function bookAppointment(req, res) {
    try {
        const { doctorId, start, end } = req.body;
        const patientId = req.user?._id;

        if (!doctorId || !start || !end) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const schedule = await DoctorSchedule.findOne({ doctorId });
        if (!schedule || !schedule.isActive) {
            return res.status(400).json({ message: "Doctor is not available" });
        }

        // Convert input to Philippine Time
        const appointmentStart = toPhTime(start);
        const appointmentEnd = toPhTime(end);
        const now = nowPhTime();

        // 1️⃣ Booking within 5 days
        if (appointmentStart.diff(now, 'day') > 5) {
            return res.status(400).json({ message: "Cannot book more than 5 days in advance" });
        }

        // 2️⃣ At least 1 hour before appointment
        if (appointmentStart.diff(now, 'hour') < 1) {
            return res.status(400).json({ message: "Must book at least 1 hour before appointment time" });
        }

        // 3️⃣ Doctor works on this day
        if (!schedule.daysOfWeek.includes(appointmentStart.day())) {
            return res.status(400).json({ message: "Doctor not working on this day" });
        }

        // 4️⃣ Within working hours
        let endHour = schedule.endHour === "24:00" ? "00:00" : schedule.endHour;
        const scheduleStartMinutes = Number(schedule.startHour.split(":")[0]) * 60 + Number(schedule.startHour.split(":")[1]);
        let scheduleEndMinutes = Number(endHour.split(":")[0]) * 60 + Number(endHour.split(":")[1]);
        if (endHour === "00:00") scheduleEndMinutes = 24 * 60;

        const appointmentStartMinutes = appointmentStart.hour() * 60 + appointmentStart.minute();
        const appointmentEndMinutes = appointmentEnd.hour() * 60 + appointmentEnd.minute();

        if (appointmentStartMinutes < scheduleStartMinutes || appointmentEndMinutes > scheduleEndMinutes) {
            return res.status(400).json({
                message: `Requested time outside doctor's working hours (${schedule.startHour} - ${schedule.endHour} Philippine Time)`
            });
        }

        // 5️⃣ Duration must be exactly 30 minutes
        if (appointmentEnd.diff(appointmentStart, 'minute') !== 30) {
            return res.status(400).json({ message: "Appointment must be exactly 30 minutes long" });
        }

        // 6️⃣ Check for overlapping appointments
        const overlapping = await Doctor_Appointment.findOne({
            doctorId,
            status: { $in: ["booked", "confirmed"] },
            $or: [
                { start: { $lt: new Date(end), $gte: new Date(start) } },
                { end: { $gt: new Date(start), $lte: new Date(end) } },
                { start: { $lte: new Date(start) }, end: { $gte: new Date(end) } },
            ],
        });

        if (overlapping) return res.status(400).json({ message: "Time slot already booked" });

        // 7️⃣ Create appointment (store as UTC)
        const appointment = await Doctor_Appointment.create({
            doctorId,
            patientId,
            start: new Date(start),
            end: new Date(end),
            status: "booked"
        });

        res.status(201).json({
            success: true,
            appointment,
            phTime: {
                start: toPhTime(start).format('YYYY-MM-DD HH:mm'),
                end: toPhTime(end).format('YYYY-MM-DD HH:mm')
            }
        });

    } catch (error) {
        console.error("Error booking appointment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

// ---------------------- Cancel Appointment ----------------------
export async function cancelAppointment(req, res) {
    try {
        const { appointmentId } = req.body;
        const patientId = req.user?._id;

        if (!appointmentId) {
            return res.status(400).json({ message: "Appointment ID is required" });
        }

        const appointment = await Doctor_Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Only the patient who booked can cancel
        if (appointment.patientId.toString() !== patientId.toString()) {
            return res.status(403).json({ message: "You can only cancel your own appointments" });
        }

        // Cannot cancel completed or no-show appointments
        if (["completed", "no show"].includes(appointment.status)) {
            return res.status(400).json({ message: `Cannot cancel a ${appointment.status} appointment` });
        }

        appointment.status = "cancelled";
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully",
            appointment,
            phTime: {
                start: toPhTime(appointment.start).format('YYYY-MM-DD HH:mm'),
                end: toPhTime(appointment.end).format('YYYY-MM-DD HH:mm')
            }
        });

    } catch (error) {
        console.error("Error cancelling appointment:", error);
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