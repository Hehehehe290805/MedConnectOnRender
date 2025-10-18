import express from "express";
import { 
  signup, login, logout, getMe, deleteMe
  } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.get("/get-me", protectRoute, getMe)
router.delete("/delete-me", protectRoute, deleteMe)

export default router;