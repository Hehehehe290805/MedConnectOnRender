import { useEffect, useState } from "react";
import axios from "axios";
import PendingAppointment from "../components/PendingAppointment.jsx";
import ViewPendingAppointmentDoctorPopup from "./ViewPendingAppointmentDoctorPopup.jsx";
import SetPricePopup from "./SetPricePopup.jsx";
import SetSchedulePopup from "./SetSchedulePopup.jsx";

const HomePageDoctor = () => {
    const [appointments, setAppointments] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pricing and Schedule
    const [currentPrice, setCurrentPrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [workTime, setWorkTime] = useState(null);
    const [currentSchedule, setCurrentSchedule] = useState(null);
    const [showPricePopup, setShowPricePopup] = useState(false);
    const [showSchedulePopup, setShowSchedulePopup] = useState(false);

    useEffect(() => {
        fetchAppointments();
        fetchCurrentPricing();
        fetchCurrentSchedule();
    }, []);

    // === Fetch functions ===
    const fetchAppointments = async () => {
        try {
            setLoading(true);
            setError(null);
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.get(`${API_URL}/api/booking/user-appointments`, { withCredentials: true });

            if (res.data.success && Array.isArray(res.data.appointments)) {
                const validStatuses = [
                    "pending_accept", "awaiting_deposit",
                    "booked", "confirmed", "ongoing",
                    "marked_complete", "completed",
                    "fully_paid", "confirm_fully_paid",
                    "no_show_patient", "no_show_doctor", "no_show_both",
                    "cancelled_unpaid", "cancelled", "rejected", "freeze"
                ];
                const filtered = res.data.appointments
                    .filter(a => validStatuses.includes(a.status))
                    .sort((a, b) => new Date(a.start) - new Date(b.start));
                setAppointments(filtered);
            } else {
                setAppointments([]);
            }
        } catch (err) {
            setError("Failed to load appointments.");
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentPricing = async () => {
        try {
            setPriceLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.get(`${API_URL}/api/pricing/pricing`, { withCredentials: true });
            if (res.data.pricing && res.data.pricing.length > 0) {
                setCurrentPrice(res.data.pricing[0].price);
            }
        } catch (err) {
            console.error("Error fetching pricing:", err);
        } finally {
            setPriceLoading(false);
        }
    };

    const fetchCurrentSchedule = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.get(`${API_URL}/api/doctor-schedule/get-availability`, { withCredentials: true });
            if (res.data.success && res.data.availability) {
                setCurrentSchedule(res.data.availability);
                setWorkTime(formatScheduleDisplay(res.data.availability));
            } else {
                setWorkTime("Unset");
            }
        } catch (err) {
            console.error("Error fetching schedule:", err);
            setWorkTime("Unset");
        }
    };

    // === Formatting ===
    const formatTimeDisplay = (time) => {
        if (!time) return "";
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatScheduleDisplay = (schedule) => {
        if (!schedule) return "Unset";
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = schedule.daysOfWeek?.map(day => daysOfWeek[day]).join(', ') || 'No days';
        const startTime = formatTimeDisplay(schedule.startHour);
        const endTime = formatTimeDisplay(schedule.endHour);
        return `${startTime} - ${endTime} (${selectedDays})`;
    };

    // === Handlers ===
    const handleSetNewPrice = () => setShowPricePopup(true);
    const handlePriceSet = (newPrice) => setCurrentPrice(newPrice);

    const handleSetWorkTime = () => setShowSchedulePopup(true);
    const handleScheduleSet = async (schedule) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || "";
            const res = await axios.post(`${API_URL}/api/doctor-schedule/availability`, schedule, { withCredentials: true });
            if (res.data.success) {
                setCurrentSchedule(res.data.availability);
                setWorkTime(formatScheduleDisplay(res.data.availability));
            }
        } catch (err) {
            console.error("Error saving schedule:", err);
            setCurrentSchedule(schedule);
            setWorkTime(formatScheduleDisplay(schedule));
        }
    };

    const handleAppointmentUpdated = (appointmentId, newStatus) => {
        setAppointments(prev => prev.map(a => a._id === appointmentId ? { ...a, status: newStatus } : a));
    };

    const openAppointmentModal = (appointment ) => {
        setSelectedAppointment({ ...appointment });
    };
    const closeAppointmentModal = () => setSelectedAppointment(null);

    // === Grouping ===rea
    const groups = {
        "Booking Level": ["pending_accept", "awaiting_deposit"],
        "Deposit Level": ["booked", "confirmed"],
        "Ongoing Appointments": ["ongoing"],
        "Completed Appointments": ["marked_complete", "completed", "fully_paid", "confirm_fully_paid", "no_show_doctor", "no_show_patient", "no_show_both"],
        "Cancelled Appointments": ["cancelled", "cancelled_unpaid", "rejected"],
        "Reported Appointments": ["freeze"],
    };

    const renderAppointmentGroup = (title, statuses, badgeColor) => {
        const groupAppointments = appointments.filter(a => statuses.includes(a.status));
        return (
            <section key={title} className="border rounded shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <span className={`badge ${badgeColor}`}>{groupAppointments.length}</span>
                </div>

                {groupAppointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500"><p>No appointments in this group.</p></div>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {groupAppointments.map(appointment => (
                            <PendingAppointment
                                key={appointment._id}
                                appointment={appointment}
                                onAppointmentUpdated={handleAppointmentUpdated}
                                onViewDetails={() => openAppointmentModal(appointment)}
                            />
                        ))}
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Welcome to MedConnect</h1>
                <p className="mt-2 text-gray-600">Doctor Dashboard</p>
            </div>

            {/* Pricing & Work Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="card bg-base-100 shadow-sm border p-4">
                    <h3 className="font-bold text-lg mb-2">Consultation Pricing</h3>
                    <div className="flex items-center justify-between">
                        <div>{priceLoading ? <span className="loading loading-spinner loading-sm"></span> : currentPrice ? <p className="text-xl font-semibold">₱{currentPrice}</p> : <p className="text-gray-500">No price set</p>}</div>
                        <button className="btn btn-primary btn-sm" onClick={handleSetNewPrice} disabled={priceLoading}>{currentPrice ? "Update Price" : "Set Price"}</button>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-sm border p-4">
                    <h3 className="font-bold text-lg mb-2">Work Schedule</h3>
                    <div className="flex items-center justify-between">
                        <div><p className={`text-sm ${workTime === "Unset" ? "text-gray-500" : "text-green-600 font-semibold"}`}>{workTime}</p></div>
                        <button className="btn btn-secondary btn-sm" onClick={handleSetWorkTime}>Set Work Time</button>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-error"><span>{error}</span></div>}

            {loading ? (
                <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg"></span></div>
            ) : (
                <>
                    {renderAppointmentGroup("Booking Level", groups["Booking Level"], "badge-warning")}
                    {renderAppointmentGroup("Deposit Level", groups["Deposit Level"], "badge-primary")}
                    {renderAppointmentGroup("Ongoing Appointments", groups["Ongoing Appointments"], "badge-secondary")}
                    {renderAppointmentGroup("Completed Appointments", groups["Completed Appointments"], "badge-success")}
                    {renderAppointmentGroup("Cancelled Appointments", groups["Cancelled Appointments"], "badge-error")}
                    {renderAppointmentGroup("Reported Appointments", groups["Reported Appointments"], "badge-neutral")}
                </>
            )}

            {/* Popups */}
            {selectedAppointment && (
                <ViewPendingAppointmentDoctorPopup
                    appointment={selectedAppointment}
                    onClose={closeAppointmentModal}
                    onAppointmentUpdated={handleAppointmentUpdated}
                />
            )}

            {showPricePopup && <SetPricePopup onClose={() => setShowPricePopup(false)} onPriceSet={handlePriceSet} currentPrice={currentPrice} />}
            {showSchedulePopup && <SetSchedulePopup onClose={() => setShowSchedulePopup(false)} onScheduleSet={handleScheduleSet} currentSchedule={currentSchedule} />}
        </div>
    );
};

export default HomePageDoctor;
