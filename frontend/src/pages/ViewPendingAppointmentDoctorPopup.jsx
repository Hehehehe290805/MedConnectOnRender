import React, { useState, useEffect } from "react";
import axios from "axios";

const ViewPendingAppointmentDoctorPopup = ({ appointment, onClose, onAppointmentUpdated }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [patient, setPatient] = useState(null); // <-- store patient info

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    const getDuration = () => {
        const start = new Date(appointment.start);
        const end = new Date(appointment.end);
        return Math.round((end - start) / (1000 * 60));
    };

    const { date, time } = formatDateTime(appointment.start);
    const API_URL = import.meta.env.VITE_API_URL || "";

    // --- FETCH PATIENT INFO ---
    useEffect(() => {
        const fetchPatient = async () => {
            if (!appointment.patientId) return;

            // If patientId is an object, get the actual ID
            const patientId = typeof appointment.patientId === "string"
                ? appointment.patientId
                : appointment.patientId._id;

            try {
                const res = await axios.get(`${API_URL}/api/users/${patientId}`, { withCredentials: true });
                setPatient(res.data.data);
            } catch (err) {
                console.error("Failed to fetch patient info:", err);
            }
        };

        fetchPatient();
    }, [appointment.patientId]);


    // --- ACCEPT / REJECT HANDLERS ---
    const handleAccept = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.post(
                `${API_URL}/api/doctor-schedule/confirm`,
                { appointmentId: appointment._id },
                { withCredentials: true }
            );

            if (res.data.success) {
                setSuccess("Appointment accepted. Awaiting patient deposit.");
                onAppointmentUpdated(appointment._id, "awaiting_deposit");
                setTimeout(() => onClose(), 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to accept appointment");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        const reason = window.prompt("Reason for rejection (optional):");
        if (reason === null) return;

        try {
            setLoading(true);
            setError(null);
            const res = await axios.post(
                `${API_URL}/api/doctor-schedule/reject`,
                { appointmentId: appointment._id, reason: reason || "No reason provided" },
                { withCredentials: true }
            );

            if (res.data.success) {
                setSuccess("Appointment rejected.");
                onAppointmentUpdated(appointment._id, "rejected");
                setTimeout(() => onClose(), 1500);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reject appointment");
        } finally {
            setLoading(false);
        }
    };

    const renderActions = () => {
        switch (appointment.status) {
            case "pending_accept":
                return (
                    <div className="flex gap-2 mt-6">
                        <button className="btn btn-success btn-sm" onClick={handleAccept} disabled={loading}>
                            {loading ? "Processing..." : "Accept Appointment"}
                        </button>
                        <button className="btn btn-error btn-sm" onClick={handleReject} disabled={loading}>
                            {loading ? "Processing..." : "Reject Appointment"}
                        </button>
                    </div>
                );
            case "booked":
                return (
                    <div className="flex flex-col gap-2 mt-6">
                        <p>Deposit Amount: ₱{appointment.paymentDeposit}</p>
                        <p>Reference Number: {appointment.depositRef}</p>

                            <button
                                className="btn btn-success btn-sm"
                                onClick={async () => {
                                    try {
                                        const API_URL = import.meta.env.VITE_API_URL || "";
                                        const res = await axios.post(
                                            `${API_URL}/api/doctor-schedule/confirm-deposit`,
                                            { appointmentId: appointment._id },
                                            { withCredentials: true }
                                        );
                                        alert(res.data.message);
                                        // Update local state
                                        appointment.status = res.data.appointment.status;
                                    } catch (err) {
                                        console.error("Error confirming deposit:", err);
                                        alert(err.response?.data?.message || "Failed to confirm deposit");
                                    }
                                }}
                            >
                                Confirm Deposit
                            </button>
                    </div>
                );

            case "ongoing":
                return (
                    <div className="flex gap-2 mt-6">
                        {/* Mark Attendance Button */}
                        <button
                            className="btn btn-success btn-sm"
                            onClick={async () => {
                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || "";
                                    const res = await axios.post(
                                        `${API_URL}/api/booking/attend/${appointment._id}`, // URL param
                                        {}, // body can be empty
                                        { withCredentials: true }
                                    );

                                    alert(res.data.message);

                                    // Update local state
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

                        {/* Mark Complete Button - only for doctor */}
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={async () => {
                                    try {
                                        const API_URL = import.meta.env.VITE_API_URL || "";
                                        const res = await axios.post(
                                            `${API_URL}/api/doctor-schedule/mark-complete`,
                                            { appointmentId: appointment._id },
                                            { withCredentials: true }
                                        );

                                        alert(res.data.message);

                                        // Update local state
                                        if (res.data.appointment) {
                                            appointment.status = res.data.appointment.status;
                                        }
                                    } catch (err) {
                                        console.error("Error marking complete:", err);
                                        alert(err.response?.data?.message || "Failed to mark appointment complete");
                                    }
                                }}
                            >
                                Mark Complete
                            </button>
                    </div>
                );

            case "fully_paid":
                return (
                    <div className="flex flex-col gap-2 mt-6">
                        <p>Balance Amount: ₱{appointment.balanceAmount}</p>
                        <p>Reference Number: {appointment.balanceRef}</p>

                        <button
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                                try {
                                    const API_URL = import.meta.env.VITE_API_URL || "";
                                    const res = await axios.post(
                                        `${API_URL}/api/doctor-schedule/confirm-full-payment`,
                                        { appointmentId: appointment._id },
                                        { withCredentials: true }
                                    );

                                    alert(res.data.message);

                                    // Update local state
                                    if (res.data.appointment) {
                                        appointment.status = res.data.appointment.status;
                                        if (onAppointmentUpdated) {
                                            onAppointmentUpdated(appointment._id, res.data.appointment.status);
                                        }
                                    }
                                } catch (err) {
                                    console.error("Error confirming full payment:", err);
                                    alert(err.response?.data?.message || "Failed to confirm full payment");
                                }
                            }}
                        >
                            Confirm Full Payment
                        </button>
                    </div>
                );




            default:
                return null;
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Appointment Details</h2>
                    <button className="btn btn-circle btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                {error && <div className="alert alert-error mb-4">{error}</div>}
                {success && <div className="alert alert-success mb-4">{success}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2">Appointment Info</h3>
                        <p>Date: {date}</p>
                        <p>Time: {time}</p>
                        <p>Duration: {getDuration()} minutes</p>
                        <p>Amount: ₱{appointment.amount}</p>
                        {appointment.status && <p>Status: {appointment.status}</p>}
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Patient Info</h3>
                        {patient ? (
                            <p>{patient.firstName} {patient.lastName}</p>
                        ) : (
                            <p>Loading patient info...</p>
                        )}
                    </div>
                </div>

                {renderActions()}
            </div>
            <div className="modal-backdrop" onClick={onClose}></div>
        </div>
    );
};

export default ViewPendingAppointmentDoctorPopup;
