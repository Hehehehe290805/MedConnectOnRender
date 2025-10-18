import mongoose from "mongoose";

const Doctor_AppointmentSchema = new mongoose.Schema({
  // Appointment participants
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" }, // optional for labs/institutes

  // Schedule
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: {
    type: String,
    enum: ["booked", "cancelled", "confirmed", "completed"],
    default: "booked",
  },

  // Payment
  method: { type: String, enum: ["gcash", "paymongo"], required: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  paymentLink: { type: String },       // stores generated PayMongo/GCash link
  transactionId: { type: String },     // optional, store PayMongo payment ID
  amount: { type: Number, required: true },      // total price at booking time
  currency: { type: String, default: "PHP" },

  // Deposit
  paymentDeposit: { type: Number, required: true }, // 10% of total amount
  depositPaid: { type: Boolean, default: false },
  balancePaid: { type: Boolean, default: false },  // remaining 90% payment

  // Review
  rating: { type: Number, min: 1, max: 5 }, // star rating
  review: { type: String }, // textual feedback
}, { timestamps: true });

const Doctor_Appointment = mongoose.model("Doctor_Appointment", Doctor_AppointmentSchema);
export default Doctor_Appointment;
