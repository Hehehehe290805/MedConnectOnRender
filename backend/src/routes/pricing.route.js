import express from "express";
import {
    setOrUpdatePricing, getPricing, getInstitutePrices
    } from "../controllers/pricing.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/set-pricing", protectRoute, setOrUpdatePricing);
router.get("/pricing", protectRoute, getPricing);
router.get("/institute-prices", protectRoute, getInstitutePrices);

export default router;