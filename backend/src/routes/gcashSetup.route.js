import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../controllers/gcash.controller.js";
import {
    uploadGCashQR,
    getGCashInfo,
} from "../controllers/gcash.controller.js";

const router = express.Router();

// 📥 Upload & extract GCash QR — only authenticated users
router.post("/gcash/upload", protectRoute, upload.single("qrImage"), uploadGCashQR);

// 📤 Get user GCash info
router.get("/gcash", protectRoute, getGCashInfo);

export default router;
