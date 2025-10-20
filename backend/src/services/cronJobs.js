import cron from "node-cron";
import { checkNoShows } from "../controllers/booking.controller.js";
import { logError } from "../utils/logger.js";

export function startCronJobs() {
    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        try {
            console.log("[CRON] Running auto no-show checker");
            await checkNoShows();
        } catch (err) {
            console.error("[CRON] Error running no-show checker:", err);
            await logError("CRON", err);
        }
    });
}
