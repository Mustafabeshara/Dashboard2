import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("analytics.tenderStats", () => {
  it("returns tender statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.tenderStats();

    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
    expect(typeof result.open).toBe("number");
    expect(typeof result.awarded).toBe("number");
    expect(typeof result.lost).toBe("number");
    expect(typeof result.closed).toBe("number");
    expect(typeof result.winRate).toBe("number");
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
  });
});

describe("analytics.tenderTrends", () => {
  it("returns monthly tender trends", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.tenderTrends();

    expect(Array.isArray(result)).toBe(true);
    result.forEach(item => {
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("total");
      expect(item).toHaveProperty("awarded");
      expect(item).toHaveProperty("lost");
      expect(typeof item.month).toBe("string");
      expect(typeof item.total).toBe("number");
    });
  });
});

describe("analytics.revenueStats", () => {
  it("returns revenue statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.revenueStats();

    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
    expect(typeof result.paid).toBe("number");
    expect(typeof result.pending).toBe("number");
    expect(result.total).toBeGreaterThanOrEqual(result.paid);
  });
});

describe("analytics.revenueTrends", () => {
  it("returns monthly revenue trends", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.revenueTrends();

    expect(Array.isArray(result)).toBe(true);
    result.forEach(item => {
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("revenue");
      expect(item).toHaveProperty("paid");
      expect(typeof item.month).toBe("string");
      expect(typeof item.revenue).toBe("number");
      expect(typeof item.paid).toBe("number");
    });
  });
});

describe("analytics.expenseBreakdown", () => {
  it("returns expense breakdown by category", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.expenseBreakdown();

    expect(Array.isArray(result)).toBe(true);
    result.forEach(item => {
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("value");
      expect(typeof item.name).toBe("string");
      expect(typeof item.value).toBe("number");
    });
  });
});

describe("analytics.expenseTrends", () => {
  it("returns monthly expense trends", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.expenseTrends();

    expect(Array.isArray(result)).toBe(true);
    result.forEach(item => {
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("amount");
      expect(typeof item.month).toBe("string");
      expect(typeof item.amount).toBe("number");
    });
  });
});

describe("analytics.inventoryTrends", () => {
  it("returns inventory statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.inventoryTrends();

    expect(result).toBeDefined();
    expect(typeof result.totalValue).toBe("number");
    expect(typeof result.totalItems).toBe("number");
    expect(typeof result.lowStockCount).toBe("number");
    expect(result.totalValue).toBeGreaterThanOrEqual(0);
    expect(result.totalItems).toBeGreaterThanOrEqual(0);
    expect(result.lowStockCount).toBeGreaterThanOrEqual(0);
  });
});
