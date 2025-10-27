import React, { useEffect, useState } from "react";
import axios from "axios";

const ViewPendingAppointmentPatientPopup = ({ appointment, onClose }) => {
    const [doctor, setDoctor] = useState(null);
    const [gcashRef, setGcashRef] = useState("");
    const [balanceRef, setBalanceRef] = useState("");
    const [qrUrl, setQrUrl] = useState(null);
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState("");
    const [loading, setLoading] = useState(false);

    const handleBalanceRefChange = (e) => setBalanceRef(e.target.value);

    const API_URL = import.meta.env.VITE_API_URL || "";

    useEffect(() => {
        const fetchDoctor = async () => {
            if (!appointment.doctorId) return;

            try {
                const doctorIdStr = typeof appointment.doctorId === "string"
                    ? appointment.doctorId
                    : appointment.doctorId._id || appointment.doctorId.toString();

                const res = await axios.get(`${API_URL}/api/users/${doctorIdStr}`, { withCredentials: true });
                setDoctor(res.data.data); // assume API returns { user: {...} }

                // Fetch GCash QR if available
                if (res.data.data.gcash?.qrData) {
                    setQrUrl(`${API_URL}/api/gcash-setup/gcash/qr/${doctorIdStr}`);
                }
            } catch (err) {
                console.error("Failed to fetch doctor info:", err);
            }
        };

        fetchDoctor();
    }, [appointment.doctorId]);

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        };
    };

    const getDuration = () => {
        const start = new Date(appointment.start);
        const end = new Date(appointment.end);
        return Math.round((end - start) / (1000 * 60));
    };

    const handlePayDeposit = async () => {
        if (!gcashRef.trim()) {
            alert("Please enter your GCash reference number");
            return;
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.post(
                `${API_URL}/api/booking/pay-deposit`,
                {
                    appointmentId: appointment._id,
                    referenceNumber: gcashRef,
                },
                { withCredentials: true } // to send cookies / session info if protected
            );

            if (res.data.success) {
                alert(res.data.message);
                // Optionally, update the local appointment state to reflect new status
                appointment.status = "booked";
            }
            onClose();
        } catch (err) {
            console.error("Error paying deposit:", err);
            alert(err.response?.data?.message || "Failed to pay deposit");
        }
    };


    const renderActions = () => {
        switch (appointment.status) {
            case "awaiting_deposit":
                return (
                    <div className="flex flex-col gap-2 mt-6">
                        {qrUrl && (
                            <div className="flex flex-col items-center mb-2">
                                <p className="mb-2 text-center font-medium">
                                    Scan the QRCode and provide the reference number
                                </p>
                                <img src={qrUrl} alt="Doctor GCash QR" className="w-48 h-48" />
                            </div>
                        )}
                        <input
                            type="text"
                            placeholder="Enter GCash reference number"
                            value={gcashRef}
                            onChange={(e) => setGcashRef(e.target.value)}
                            className="input input-bordered w-full max-w-xs"
                        />
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handlePayDeposit}
                        >
                            Pay Deposit
                        </button>
                    </div>
                );
            case "ongoing":
                return (
                    <div className="flex gap-2 mt-6">
                        <button
                            className="btn btn-success btn-sm"
                            onClick={async () => {
                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || "";
                                    const res = await axios.post(
                                        `${API_URL}/api/booking/attend/${appointment._id}`, // <-- send as URL param
                                        {}, // body can be empty
                                        { withCredentials: true }
                                    );


                                    alert(res.data.message);
                                    // Optionally update local state to reflect attendance
                                    if (res.data.appointment) {
                                        appointment.patientPresent = res.data.appointment.patientPresent;
                                        appointment.doctorPresent = res.data.appointment.doctorPresent;
                                        appointment.status = res.data.appointment.status;
                                    }
                                } catch (err) {
                                    console.error("Error marking attendance:", err);
                                    alert(err.response?.data?.message || "Failed to mark attendance");
                                }
                            }}
                        >
                            Mark Attendance
                        </button>
                    </div>
                );
            case "marked_complete":
                return (
                    <div className="flex gap-2 mt-6">
                        <button
                            className="btn btn-success btn-sm"
                            onClick={async () => {
                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || "";
                                    const res = await axios.post(
                                        `${API_URL}/api/booking/complete-appointment`,
                                        { appointmentId: appointment._id },
                                        { withCredentials: true }
                                    );

                                    if (res.data.success) {
                                        alert(res.data.message);
                                    }
                                    onClose();
                                } catch (err) {
                                    console.error("Error completing appointment:", err);
                                    alert(err.response?.data?.message || "Failed to mark appointment as completed");
                                }
                            }}
                        >
                            Confirm Completion
                        </button>
                    </div>
                );

            case "completed":
                return (
                    <div className="flex flex-col gap-2 mt-6">
                        {/* QR Code Section */}
                        {qrUrl && (
                            <div className="flex flex-col items-center mb-2">
                                <p className="mb-2 text-center font-medium">
                                    Scan the QRCode and provide the reference number for balance payment
                                </p>
                                <img src={qrUrl} alt="Balance Payment QR" className="w-48 h-48" />
                            </div>
                        )}

                        {/* Balance Payment Input */}
                        <label className="font-semibold">Balance Payment Reference</label>
                        <input
                            type="text"
                            placeholder="Enter balance payment reference"
                            className="input input-bordered w-full"
                            value={balanceRef}
                            onChange={handleBalanceRefChange}
                            disabled={loading}
                        />
                        <button
                            className="btn btn-success w-full"
                            onClick={async () => {
                                if (!balanceRef.trim()) {
                                    alert("Payment reference is required");
                                    return;
                                }
                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || "";
                                    const res = await axios.post(
                                        `${API_URL}/api/booking/pay-remaining`,
                                        {
                                            appointmentId: appointment._id,
                                            referenceNumber: balanceRef.trim()
                                        },
                                        { withCredentials: true }
                                    );

                                    if (res.data.success) {
                                        alert(res.data.message);
                                        setBalanceRef(""); // Clear input after successful payment
                                    }
                                    onClose();
                                } catch (err) {
                                    console.error("Error paying balance:", err);
                                    alert(err.response?.data?.message || "Failed to pay remaining balance");
                                }
                            }}
                            disabled={loading || !balanceRef.trim()}
                        >
                            {loading ? "Processing..." : "Pay Balance"}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                            Please enter the reference number from your balance payment
                        </p>
                    </div>
                );

            case "confirm_fully_paid":
                return (
                    <div className="flex flex-col gap-2 mt-6">
                        <p className="font-semibold">Submit your review for this appointment:</p>

                        <label className="font-medium">Rating (1-5)</label>
                        <input
                            type="number"
                            min={1}
                            max={5}
                            className="input input-bordered w-full max-w-xs"
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            disabled={loading}
                        />

                        <label className="font-medium">Review</label>
                        <textarea
                            className="textarea textarea-bordered w-full max-w-md"
                            placeholder="Write your review here..."
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            disabled={loading}
                        />

                        <button
                            className="btn btn-primary btn-sm mt-2 w-36"
                            onClick={async () => {
                                if (!rating || rating < 1 || rating > 5) {
                                    alert("Please provide a rating between 1 and 5");
                                    return;
                                }

                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || "";
                                    setLoading(true);

                                    const res = await axios.post(
                                        `${API_URL}/api/booking/submit-review`,
                                        {
                                            appointmentId: appointment._id,
                                            rating,
                                            review
                                        },
                                        { withCredentials: true }
                                    );

                                    alert(res.data.message);

                                    // Update local state if callback exists
                                    if (onAppointmentUpdated) {
                                        onAppointmentUpdated(appointment._id, "review_submitted");
                                    }

                                    // Clear input after submission
                                    setRating(0);
                                    setReview("");
                                } catch (err) {
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? "Submitting..." : "Submit Review"}
                        </button>
                    </div>
                );


            default:
                return null; // read-only
        }
    };

    const { date, time, day } = formatDateTime(appointment.start);

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Appointment Details</h2>
                    <button className="btn btn-circle btn-ghost" onClick={onClose}>✕</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2">Appointment Info</h3>
                        <p>Day: {day}</p>
                        <p>Date: {date}</p>
                        <p>Time: {time}</p>
                        <p>Duration: {getDuration()} minutes</p>
                        <p>Deposit Price: ₱{appointment.paymentDeposit}</p>
                        <p>Remaining Price: ₱{appointment.balanceAmount}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Doctor Info</h3>
                        {doctor ? (
                            <>
                                <p>Dr. {doctor.firstName} {doctor.lastName}</p>
                                {doctor.specialization && <p>Specialization: {doctor.specialization}</p>}
                            </>
                        ) : (
                            <p>Loading doctor information...</p>
                        )}
                    </div>
                </div>

                {renderActions()}
            </div>

            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

export default ViewPendingAppointmentPatientPopup;
