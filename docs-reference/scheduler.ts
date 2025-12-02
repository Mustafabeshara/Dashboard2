import cron from "node-cron";
import { checkTenderClosingAlerts, checkLowInventoryAlerts } from "../notifications";

let schedulerInitialized = false;

export function initializeScheduler() {
  if (schedulerInitialized) {
    console.log("[Scheduler] Already initialized");
    return;
  }

  // Check tender deadlines daily at 9 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Running tender deadline check");
    await checkTenderDeadlines();
  });

  // Check inventory levels weekly on Monday at 8 AM
  cron.schedule("0 8 * * 1", async () => {
    console.log("[Scheduler] Running inventory level check");
    await checkInventoryLevels();
  });

  schedulerInitialized = true;
  console.log("[Scheduler] Initialized with daily tender checks (9 AM) and weekly inventory checks (Monday 8 AM)");
}

async function checkTenderDeadlines() {
  try {
    // Check for tenders closing in 7, 3, and 1 days
    const results = await Promise.all([
      checkTenderClosingAlerts(7),
      checkTenderClosingAlerts(3),
      checkTenderClosingAlerts(1),
    ]);

    const totalSent = results.reduce((sum, r) => sum + (r.sent || 0), 0);
    if (totalSent > 0) {
      console.log(`[Scheduler] Sent ${totalSent} tender deadline notification(s)`);
    }
  } catch (error) {
    console.error("[Scheduler] Error checking tender deadlines:", error);
  }
}

async function checkInventoryLevels() {
  try {
    const result = await checkLowInventoryAlerts();
    if (result.sent > 0) {
      console.log(`[Scheduler] Sent inventory alert (${result.outOfStock} out of stock, ${result.lowStock} low stock)`);
    }
  } catch (error) {
    console.error("[Scheduler] Error checking inventory levels:", error);
  }
}

// Manual trigger functions for testing
export async function triggerTenderDeadlineCheck() {
  console.log("[Scheduler] Manual trigger: tender deadline check");
  await checkTenderDeadlines();
}

export async function triggerInventoryLevelCheck() {
  console.log("[Scheduler] Manual trigger: inventory level check");
  await checkInventoryLevels();
}
