import Doctor_Appointment from "../models/Doctor_Appointment.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

export const paymongoWebhook = async (req, res) => {
    try {
        const event = req.body;

        // Extract checkout URL and status
        const checkoutUrl = event.data.attributes.checkout_url;
        const status = event.data.attributes.status; // "paid", "unpaid", "expired"

        // Find appointment linked to this payment
        const appointment = await Doctor_Appointment.findOne({ paymentLink: checkoutUrl });
        if (!appointment) return res.sendStatus(404);

        if (status === "paid") {
            // Determine whether this payment is for deposit or balance
            if (!appointment.depositPaid) {
                appointment.depositPaid = true;
                appointment.paymentStatus = "deposit_paid";
            } else if (!appointment.balancePaid) {
                appointment.balancePaid = true;
                appointment.paymentStatus = "balance_paid";
            } else {
                // All payments already received
                appointment.paymentStatus = "paid";
            }

            // Store transaction ID
            appointment.transactionId = event.data.id;

        } else if (status === "expired" || status === "failed") {
            appointment.paymentStatus = "failed";
        }

        await appointment.save();

        res.status(200).json({ received: true });

    } catch (error) {
        console.error("PayMongo webhook error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export async function createPaymentRecord(appointment, type) {
    const doctor = await User.findById(appointment.doctorId);
    const patient = await User.findById(appointment.patientId);

    const amount = type === "deposit" ? appointment.paymentDeposit : appointment.amount - appointment.paymentDeposit;

    if (amount <= 0) return null; // no transaction needed

    const payment = await Payment.create({
        appointmentId: appointment._id,
        doctorId: doctor._id,
        patientId: patient._id,
        amount,
        method: appointment.method,
        status: "pending",
        transactionId: "", // to be updated by webhook
        type, // "deposit" or "balance"
    });

    return payment;
}