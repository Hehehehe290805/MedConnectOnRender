import express from "express";
import {
    getSpecialties, getSubspecialtiesBySpecialty, getServices, getServicesByProvider,
    suggest, claim, autoClaimAppointmentService
} from "../controllers/specialtyAndService.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/specialties", protectRoute, getSpecialties);
router.get("/subspecialties/:specialtyId", protectRoute, getSubspecialtiesBySpecialty);
router.get("/services", protectRoute, getServices);
router.post("/provider-services", protectRoute, getServicesByProvider);

router.post("/suggest", protectRoute, suggest);
router.post("/claim", protectRoute, claim);
router.post("/auto-claim-appointment", protectRoute, autoClaimAppointmentService);

export default router;