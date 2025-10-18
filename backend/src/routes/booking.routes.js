import express from "express";
import { 
    bookAppointment, cancelAppointment, getUserAppointments, submitReview
} from "../controllers/bookAppointmentService.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Set or update doctor availability
router.post("/book", protectRoute, bookAppointment);
router.post("/cancel", protectRoute, cancelAppointment);
router.get("/user-appointments", protectRoute, getUserAppointments);
router.post("/submit-review", protectRoute, submitReview);

export default router;  