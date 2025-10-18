import express from "express";
import {
    setAvailability,
    getDoctorCalendar, getDoctorPublicCalendar,
    confirmAppointment, completeAppointment
} from "../controllers/doctorSchedule.controller.js";       
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Set or update doctor availability
router.post("/availability", protectRoute, setAvailability);

// Get full calendar (available + booked)
router.get("/doctor-calendar", protectRoute, getDoctorCalendar);
router.get("/public-doctor-calendar", getDoctorPublicCalendar);

// Appointment actions
router.post("/confirm", protectRoute, confirmAppointment);
router.post("/complete", protectRoute, completeAppointment);

export default router;