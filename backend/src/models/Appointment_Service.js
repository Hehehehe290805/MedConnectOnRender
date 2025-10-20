import mongoose from "mongoose";

const Appointment_ServiceSchema = new mongoose.Schema({
  // Appointment participants
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" }, // optional for labs/institutes

  // Schedule
  start: { type: Date, required: true },
  end: { type: Date, required: true },

  // Status tracking
  status: {
    type: String,
    enum: [
      "pending_accept", 
      "awaiting_deposit",
      "booked",                 // deposit paid
      "confirmed",              // deposit confirmed by doctor
      "ongoing",
      "marked_complete",
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
    ],
    default: "pending_accept",
  },

  // Payment
  method: { type: String, enum: ["gcash"], required: true },
  amount: { type: Number, required: true },      // total price at booking time

  // Deposit
  paymentDeposit: { type: Number, required: true }, // 10% of total amount
  depositPaid: { type: Boolean, default: false },
  depositRef: { type: String },                    // GCash reference for deposit
  balanceAmount: { type: Number, default: 0 },    // remaining 90% payment
  balancePaid: { type: Boolean, default: false },
  balanceRef: { type: String },                   // GCash reference for remaining

  // Presence tracking
  patientPresent: { type: Boolean, default: false },
  doctorPresent: { type: Boolean, default: false },
  bothPresent: { type: Boolean, default: false },

  // Rejection & cancellation
  rejectionReason: { type: String },

  // Review
  rating: { type: Number, min: 1, max: 5 }, // star rating
  review: { type: String }, // textual feedback

}, { timestamps: true });

const Appointment_Service = mongoose.model("Appointment_Service", Appointment_ServiceSchema);
export default Appointment_Service;
