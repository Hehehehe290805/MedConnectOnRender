import express from "express";
import {
    setAvailability,
    getDoctorCalendar, getDoctorPublicCalendar,
    acceptAppointment, rejectAppointment, markComplete,
    confirmDeposit, confirmFullPayment
} from "../controllers/doctorSchedule.controller.js";       
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Set or update doctor availability
router.post("/availability", protectRoute, setAvailability);

// Get full calendar (available + booked)
router.get("/doctor-calendar", protectRoute, getDoctorCalendar);
router.get("/public-doctor-calendar", getDoctorPublicCalendar);

// Appointment actions
router.post("/confirm", protectRoute, acceptAppointment); //
router.post("/reject", protectRoute, rejectAppointment) // 
router.post("/mark-complete", protectRoute, markComplete); //

// Payment Confirmation
router.post("/confirm-deposit", protectRoute, confirmDeposit); //
router.post("/confirm-full-payment", protectRoute, confirmFullPayment); //

export default router;