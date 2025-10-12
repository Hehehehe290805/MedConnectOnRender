import express from "express";
import { 
  getPendingUsers, approveRole, getAdmins,
  } from "../controllers/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/pending-users", protectRoute, getPendingUsers);
router.patch("/approve", protectRoute, approveRole);
router.get("/admins", protectRoute, getAdmins);
