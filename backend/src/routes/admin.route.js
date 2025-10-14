import express from "express";
import { 
  getPendingUsers, approveRole, getAdmins,
  getPendingSuggestions, approveSpecialty, approveSubspecialty, approveService,
  getPendingClaims, approveClaim
  } from "../controllers/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// User Management
router.get("/pending-users", protectRoute, getPendingUsers);
router.patch("/approve-role", protectRoute, approveRole);
router.get("/admins", protectRoute, getAdmins);

// Specialty and Service Management
router.get("/pending-suggestions", protectRoute, getPendingSuggestions);
router.patch("/approve-specialty", protectRoute, approveSpecialty);
router.patch("/approve-subspecialty", protectRoute, approveSubspecialty);
router.patch("/approve-service", protectRoute, approveService);
router.get("/pending-claims", protectRoute, getPendingClaims);
router.patch("/approve-claim", protectRoute, approveClaim);

export default router;