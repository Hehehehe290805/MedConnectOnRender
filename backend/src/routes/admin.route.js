import express from "express";
import { 
  getPendingUsers, approveRole, getAdmins,
  getPendingSuggestions, approveSuggestion,
  getPendingClaims, approveClaim
  } from "../controllers/admin.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/adminsOnly.middleware.js"; 

const router = express.Router();

// User Management
router.get("/pending-users", protectRoute, adminOnly, getPendingUsers);
router.patch("/approve-role", protectRoute, adminOnly, approveRole);
router.get("/admins", protectRoute, adminOnly, getAdmins);

// Specialty and Service Management
router.get("/pending-suggestions", protectRoute, adminOnly, getPendingSuggestions);
router.patch("/approve", protectRoute, adminOnly, approveSuggestion);
router.get("/pending-claims", protectRoute, adminOnly, getPendingClaims);
router.patch("/approve-claim", protectRoute, adminOnly, approveClaim);

export default router;