import express from "express";
import { 
  signup, login, logout, 
  onboard, onboardAsDoctor, onboardAsInstitute, onboardAsPharmacist, onboardAsAdmin,
  getPendingUsers, approveDoctorOrInstituteOrPharmacist, getAdmins, approveAdmin,
  getDoctors, getInstitutes, getPharmacies
  } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.post("/onboarding", protectRoute, onboard);
router.post("/onboarding/doctor", protectRoute, onboardAsDoctor);
router.post("/onboarding/institute", protectRoute, onboardAsInstitute);
router.post("/onboarding/pharmacist", protectRoute, onboardAsPharmacist);
router.post("/onboarding/admin", protectRoute, onboardAsAdmin);

// Migrate these from auth to admin routes and controllers later
router.get("/pending-users", getPendingUsers);
router.patch("/approve", approveDoctorOrInstituteOrPharmacist);
router.get("/admins", protectRoute, getAdmins);
router.patch("/approve-admin", protectRoute, approveAdmin);
// end - ask cymon advice

// Get doctors, institutes, or pharmacies
router.get("/doctors", protectRoute, getDoctors);
router.get("/pharmacies", protectRoute, getPharmacies);
router.get("/institutes", protectRoute, getInstitutes);

// check if user is logged in
router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;