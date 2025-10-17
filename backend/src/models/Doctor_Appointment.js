import mongoose from "mongoose";

const Doctor_AppointmentSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" }, // optional for lab
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: { type: String, enum: ["booked", "cancelled", "confirmed", "completed"], default: "booked" },
});

const Doctor_Appointment = mongoose.model("Doctor_Appointment", Doctor_AppointmentSchema);
export default Doctor_Appointment;
