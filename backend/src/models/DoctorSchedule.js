import mongoose from "mongoose";

const DoctorScheduleSchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    startHour: { type: String, required: true }, // e.g., "09:00"
    endHour: { type: String, required: true },   // e.g., "17:00"
        daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday
        isActive: { type: Boolean, default: true }, // toggle to close for long periods
});

const DoctorSchedule = mongoose.model("DoctorSchedule", DoctorScheduleSchema);
export default DoctorSchedule;
