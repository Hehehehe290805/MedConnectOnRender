import { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";

const CreateBookingPopup = ({ provider, onClose, onBookingCreated }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [pricing, setPricing] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || "";

    // 🏷 Fetch doctor's pricing
    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await axios.get(
                    `${API_URL}/api/pricing/pricing?providerId=${provider._id}`,
                    { withCredentials: true }
                );
                console.log("🧾 Pricing API response:", res.data);

                // ✅ Fix: Check directly for pricing array, not success flag
                if (Array.isArray(res.data.pricing) && res.data.pricing.length > 0) {
                    setPricing(res.data.pricing[0]);
                    console.log("✅ Pricing set:", res.data.pricing[0]);
                } else {
                    console.log("⚠️ No pricing found for provider", provider._id);
                }
            } catch (err) {
                console.error("❌ Error fetching pricing:", err);
            }
        };

        if (provider?._id) fetchPricing();
    }, [provider]);

    // 📅 Fetch available slots from backend (public calendar)
    useEffect(() => {
        const fetchAvailableSlots = async () => {
            try {
                const res = await axios.get(
                    `${API_URL}/api/doctor-schedule/public-doctor-calendar?doctorId=${provider._id}&daysAhead=2`,
                    { withCredentials: true }
                );

                if (res.data.success) {
                    const available = res.data.events
                        .filter(e => e.type === "availability")
                        .map(e => ({
                            start: e.start,
                            end: e.end,
                            display: dayjs(e.start).format("ddd, MMM D, h:mm A"),
                        }));

                    setAvailableSlots(available);
                }
            } catch (err) {
                console.error("Error fetching available slots:", err);
                setError("Failed to load available slots");
            }
        };

        fetchAvailableSlots();
    }, [provider._id]);

    // 🧾 Handle booking
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSlot) {
            setError("Please select an available slot.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const bookingData = {
                doctorId: provider._id,
                serviceId: "appointment", // fixed since dropdown is locked
                start: selectedSlot.start,
            };

            const res = await axios.post(
                `${API_URL}/api/booking/book`,
                bookingData,
                { withCredentials: true }
            );

            if (res.data.message === "Appointment booked successfully.") {
                onBookingCreated(res.data.appointment);
                onClose();
            }
        } catch (err) {
            console.error("Booking error:", err);
            setError(err.response?.data?.message || "Failed to book appointment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getProviderName = () =>
        provider.role === "doctor"
            ? `Dr. ${provider.firstName} ${provider.lastName}`
            : provider.facilityName;

    const getPrice = () =>
        pricing ? `₱${pricing.price}` : "Price not set";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-base-100 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Book Appointment</h2>

                {/* Provider Info */}
                <div className="bg-base-200 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold">{getProviderName()}</h3>
                    <p className="text-sm text-gray-600">{provider.profession || "Doctor"}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Locked Service */}
                    <div className="form-control w-full mb-4">
                        <label className="label">
                            <span className="label-text">Service Type</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full bg-gray-100 cursor-not-allowed"
                            value="Appointment"
                            disabled
                        />
                    </div>

                    {/* Available Slots */}
                    <div className="form-control w-full mb-4">
                        <label className="label">
                            <span className="label-text">Available Slots</span>
                        </label>
                        {availableSlots.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                                {availableSlots.map((slot, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={`btn btn-outline btn-sm ${selectedSlot?.start === slot.start ? "btn-primary" : ""}`}
                                        onClick={() => setSelectedSlot(slot)}
                                        disabled={loading}
                                    >
                                        {slot.display}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Loading available slots.</p>
                        )}
                    </div>

                    {/* Summary */}
                    {selectedSlot && (
                        <div className="bg-base-200 p-4 rounded-lg mb-4">
                            <h3 className="font-semibold mb-2">Booking Summary</h3>
                            <div className="space-y-1 text-sm">
                                <p><strong>Provider:</strong> {getProviderName()}</p>
                                <p><strong>Date:</strong> {dayjs(selectedSlot.start).format("ddd, MMM D, YYYY")}</p>
                                <p><strong>Time:</strong> {dayjs(selectedSlot.start).format("h:mm A")}</p>
                                <p><strong>Duration:</strong> 30 minutes</p>
                                <p><strong>Price:</strong> {getPrice()}</p>
                                {pricing && (
                                    <>
                                        <p><strong>Deposit (10%):</strong> ₱{(pricing.price * 0.1).toFixed(2)}</p>
                                        <p><strong>Balance:</strong> ₱{(pricing.price * 0.9).toFixed(2)}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-error mb-4">
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !selectedSlot}
                        >
                            {loading ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Booking...
                                </>
                            ) : (
                                "Book Appointment"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateBookingPopup;
