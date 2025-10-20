// src/server.js
import { app, connectDB } from "./app.js";
import { startCronJobs } from "./services/cronJobs.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 1️⃣ Connect to MongoDB first
    await connectDB();
    console.log("✅ MongoDB connected");

    // 2️⃣ Start cron jobs after DB is ready
    startCronJobs();

    // 3️⃣ Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
};

startServer();