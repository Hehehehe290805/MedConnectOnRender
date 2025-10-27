import React, { useState } from "react";
import axios from "axios";

const PendingAppointment = ({ appointment, onAppointmentUpdated, onViewDetails }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for report modal (localized to this appointment)
    const [isReporting, setIsReporting] = useState(false);
    const [complaint, setComplaint] = useState("");
    const [reportLoading, setReportLoading] = useState(false);

    const getStatusBadge = (status) => {
        const statusColors = {
            pending_accept: "badge-warning",
            awaiting_deposit: "badge-info",
            booked: "badge-primary",
            confirmed: "badge-success",
            ongoing: "badge-secondary",
            marked_complete: "badge-accent",
            completed: "badge-success",
            fully_paid: "badge-primary",
            confirm_fully_paid: "badge-success",
            cancelled_unpaid: "badge-error",
            cancelled: "badge-error",
            rejected: "badge-error",
            no_show_patient: "badge-error",
            no_show_doctor: "badge-error",
            no_show_both: "badge-error",
            freeze: "badge-neutral"
        };

        const statusLabels = {
            pending_accept: "Pending Accept",
            awaiting_deposit: "Awaiting Deposit",
            booked: "Booked",
            confirmed: "Confirmed",
            ongoing: "Ongoing",
            marked_complete: "Marked Complete",
            completed: "Completed",
            fully_paid: "Fully Paid",
            confirm_fully_paid: "Payment Confirmed",
            cancelled_unpaid: "Cancelled (Unpaid)",
            cancelled: "Cancelled",
            rejected: "Rejected",
            no_show_patient: "No Show (Patient)",
            no_show_doctor: "No Show (Doctor)",
            no_show_both: "No Show (Both)",
            freeze: "Frozen"
        };

        return (
            <span className={`badge ${statusColors[status] || 'badge-neutral'}`}>
                {statusLabels[status] || status}
            </span>
        );
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    };

    const { date, time } = formatDateTime(appointment.start);

    const getPaymentStatus = () => {
        if (appointment.depositPaid && appointment.balancePaid) {
            return "Fully Paid";
        } else if (appointment.depositPaid) {
            return "Deposit Paid";
        } else {
            return "Awaiting Payment";
        }
    };

    // Report function localized to this appointment
    const handleReport = async () => {
        if (!complaint.trim()) {
            console.log(`Appointment ${appointment._id}: Complaint is empty`);
            return;
        }

        console.log(`Appointment ${appointment._id}: Filing complaint`, { complaint });

        try {
            setReportLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.post(
                `${API_URL}/api/booking/report/${appointment._id}`,
                { complaint },
                { withCredentials: true }
            );
            console.log(`Appointment ${appointment._id}: Success -`, res.data.message);
            setIsReporting(false);
            setComplaint("");
        } catch (err) {
            console.error(
                `Appointment ${appointment._id}: Error filing complaint -`,
                err.response?.data?.message || err.message
            );
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div className="card bg-base-200 shadow-sm mb-3">
            <div className="card-body p-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => onViewDetails(appointment)}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg">
                                Appointment #{appointment._id?.slice(-6) || 'N/A'}
                            </h3>
                            {getStatusBadge(appointment.status)}
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm"><strong>Date:</strong> {date}</p>
                            <p className="text-sm"><strong>Time:</strong> {time}</p>
                            <p className="text-sm">
                                <strong>Duration:</strong>{" "}
                                {Math.round((new Date(appointment.end) - new Date(appointment.start)) / (1000 * 60))} minutes
                            </p>

                            {appointment.patientId && (
                                <p className="text-sm">
                                    <strong>Patient:</strong> {appointment.patientId.firstName} {appointment.patientId.lastName}
                                </p>
                            )}

                            {appointment.amount && (
                                <p className="text-sm"><strong>Amount:</strong> ₱{appointment.amount}</p>
                            )}

                            <p className="text-sm"><strong>Payment:</strong> {getPaymentStatus()}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                        <button
                            className="btn btn-info btn-sm"
                            onClick={() => onViewDetails(appointment)}
                        >
                            View
                        </button>

                        <button
                            className="btn btn-error btn-sm"
                            onClick={() => setIsReporting(true)}
                        >
                            Report
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error mt-2">
                        <span>{error}</span>
                    </div>
                )}

                {/* Report Modal */}
                {isReporting && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-base-100 p-4 rounded w-96">
                            <h4 className="font-semibold mb-2">File Complaint</h4>
                            <textarea
                                className="textarea textarea-bordered w-full mb-2"
                                rows={4}
                                placeholder="Enter your complaint"
                                value={complaint}
                                onChange={(e) => setComplaint(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    className="btn btn-sm"
                                    onClick={() => setIsReporting(false)}
                                    disabled={reportLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-error btn-sm"
                                    onClick={handleReport}
                                    disabled={reportLoading}
                                >
                                    {reportLoading ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingAppointment;
