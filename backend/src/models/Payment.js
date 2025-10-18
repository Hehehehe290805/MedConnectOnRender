import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor_Appointment", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["gcash", "paymongo"], required: true },
    
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    transactionId: { type: String },   // PayMongo transaction ID
    createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;
