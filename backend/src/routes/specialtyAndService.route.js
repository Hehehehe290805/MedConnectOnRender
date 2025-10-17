import express from "express";
import {
    getSpecialties, getSubspecialtiesBySpecialty, getServices, getInstituteServices,
    suggestSpecialty, suggestSubspecialty, suggestService,
    claimSpecialty, claimSubspecialty, claimService
} from "../controllers/specialtyAndService.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/specialties", protectRoute, getSpecialties);
router.get("/subspecialties/:specialtyId", protectRoute, getSubspecialtiesBySpecialty);
router.get("/services", protectRoute, getServices);
router.post("/institute-services", protectRoute, getInstituteServices);

router.post("/suggest-specialty", protectRoute, suggestSpecialty);
router.post("/suggest-subspecialty", protectRoute, suggestSubspecialty);
router.post("/suggest-service", protectRoute, suggestService);

router.post("/claim-specialty", protectRoute, claimSpecialty);
router.post("/claim-subspecialty", protectRoute, claimSubspecialty);
router.post("/claim-service", protectRoute, claimService);

export default router;