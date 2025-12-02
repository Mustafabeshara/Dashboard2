import { describe, it, expect } from "vitest";
import { triggerTenderDeadlineCheck, triggerInventoryLevelCheck } from "./_core/scheduler";

describe("Automated Scheduler", () => {
  it("can trigger tender deadline check manually", async () => {
    // This test verifies the manual trigger function works
    // In production, this runs automatically via cron
    await expect(triggerTenderDeadlineCheck()).resolves.not.toThrow();
  }, 30000);

  it("can trigger inventory level check manually", async () => {
    // This test verifies the manual trigger function works
    // In production, this runs automatically via cron
    await expect(triggerInventoryLevelCheck()).resolves.not.toThrow();
  }, 30000);
});
