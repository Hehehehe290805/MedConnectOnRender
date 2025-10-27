import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast"; // ✅ ADD THIS IMPORT

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

        const res = await axios.get(`${API_URL}/api/users/${doctorIdStr}`, {
          withCredentials: true
        });

        setDoctor(res.data.data);

        // Fetch GCash QR if available
        if (res.data.data.gcash?.qrData) {
          setQrUrl(`${API_URL}/api/gcash-setup/gcash/qr/${doctorIdStr}`);
        }
      } catch (err) {
        console.error("Failed to fetch doctor info:", err);
        toast.error("Failed to load doctor information"); // ✅ TOAST
      }
    };

    fetchDoctor();
  }, [appointment.doctorId]);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
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
      toast.error("Please enter your GCash reference number"); // ✅ TOAST
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/api/booking/pay-deposit`,
        {
          appointmentId: appointment._id,
          referenceNumber: gcashRef,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success(res.data.message || "Deposit payment submitted successfully"); // ✅ TOAST
        appointment.status = "booked";
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      console.error("Error paying deposit:", err);
      toast.error(err.response?.data?.message || "Failed to pay deposit"); // ✅ TOAST
    } finally {
      setLoading(false);
    }
  };

  const handlePayBalance = async () => {
    if (!balanceRef.trim()) {
      toast.error("Please enter your GCash reference number for balance payment"); // ✅ TOAST
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/api/booking/pay-balance`,
        {
          appointmentId: appointment._id,
          referenceNumber: balanceRef,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success(res.data.message || "Balance payment submitted successfully"); // ✅ TOAST
        appointment.status = "fully_paid";
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      console.error("Error paying balance:", err);
      toast.error(err.response?.data?.message || "Failed to pay balance"); // ✅ TOAST
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      toast.error("Please select a rating"); // ✅ TOAST
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/api/booking/review`,
        {
          appointmentId: appointment._id,
          rating,
          review: review.trim() || "",
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        toast.success("Review submitted successfully"); // ✅ TOAST
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error(err.response?.data?.message || "Failed to submit review"); // ✅ TOAST
    } finally {
      setLoading(false);
    }
  };

  const renderActions = () => {
    const { day, date, time } = formatDateTime(appointment.start);

    switch (appointment.status) {
      case "awaiting_deposit":
        return (
          <>
            <div className="alert alert-info mb-4">
              <span>Scan the QRCode and provide the reference number</span>
            </div>

            {qrUrl && (
              <div className="flex justify-center mb-4">
                <img src={qrUrl} alt="GCash QR" className="w-48 h-48" />
              </div>
            )}

            <input
              type="text"
              placeholder="Enter GCash Reference Number"
              className="input input-bordered w-full mb-4"
              value={gcashRef}
              onChange={(e) => setGcashRef(e.target.value)}
              disabled={loading}
            />

            <button
              className="btn btn-primary btn-block"
              onClick={handlePayDeposit}
              disabled={loading || !gcashRef.trim()}
            >
              {loading ? "Processing..." : "Submit Deposit Payment"}
            </button>
          </>
        );

      case "confirmed":
        return (
          <>
            <div className="alert alert-info mb-4">
              <span>Scan the QRCode and provide the reference number for balance payment</span>
            </div>

            {qrUrl && (
              <div className="flex justify-center mb-4">
                <img src={qrUrl} alt="GCash QR" className="w-48 h-48" />
              </div>
            )}

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Please enter the reference number from your balance payment</span>
              </label>
              <input
                type="text"
                placeholder="Enter GCash Reference Number"
                className="input input-bordered w-full"
                value={balanceRef}
                onChange={handleBalanceRefChange}
                disabled={loading}
              />
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={handlePayBalance}
              disabled={loading || !balanceRef.trim()}
            >
              {loading ? "Processing..." : "Submit Balance Payment"}
            </button>
          </>
        );

      case "completed":
        return (
          <>
            <div className="alert alert-success mb-4">
              <span>Submit your review for this appointment:</span>
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Rating (1-5)</span>
              </label>
              <input
                type="number"
                min="1"
                max="5"
                className="input input-bordered"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                disabled={loading}
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Review (optional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                placeholder="Write your review..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                disabled={loading}
                rows={4}
              />
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={handleSubmitReview}
              disabled={loading || !rating}
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </>
        );

      default:
        return (
          <div className="alert alert-info">
            <span>Status: {appointment.status}</span>
          </div>
        );
    }
  };

  const { day, date, time } = formatDateTime(appointment.start);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h2 className="text-lg font-bold mb-4">Appointment Details</h2>

        {/* Doctor Info */}
        <div className="mb-4">
          {doctor ? (
            <>
              <h3 className="font-semibold">Dr. {doctor.firstName} {doctor.lastName}</h3>
              {doctor.specialization && <p>Specialization: {doctor.specialization}</p>}
            </>
          ) : (
            <p>Loading doctor information...</p>
          )}
        </div>

        {/* Appointment Info */}
        <div className="space-y-2 mb-4 text-sm">
          <p><strong>Day:</strong> {day}</p>
          <p><strong>Date:</strong> {date}</p>
          <p><strong>Time:</strong> {time}</p>
          <p><strong>Duration:</strong> {getDuration()} minutes</p>
          <p><strong>Deposit Price:</strong> ₱{appointment.paymentDeposit}</p>
          <p><strong>Remaining Price:</strong> ₱{appointment.balanceAmount}</p>
        </div>

        {/* Actions */}
        {renderActions()}

        {/* Close Button */}
        <div className="modal-action">
          <button className="btn" onClick={onClose} disabled={loading}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPendingAppointmentPatientPopup;
