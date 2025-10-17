import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";
import doctorScheduleRoutes from "./routes/doctorSchedule.route.js";
import onboardingRoutes from "./routes/onboarding.route.js";
import pricingRoutes from "./routes/pricing.route.js";
import searchRoutes from "./routes/search.route.js";
import specialtyAndServiceRoutes from "./routes/specialtyAndService.route.js";
import userRoutes from "./routes/user.route.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT;

const __dirname = path.resolve();

app.use(
  cors({
  origin: "http://localhost:5173",
  credentials: true, // frontend cookies
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/doctor-schedule", doctorScheduleRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/specialties-and-services", specialtyAndServiceRoutes);
app.use("/api/users", userRoutes);

if(process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  })
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});