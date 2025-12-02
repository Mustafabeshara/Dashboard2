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

describe("tenders.list", () => {
  it("returns an array of tenders", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenders.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("filters tenders by status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenders.list({ status: "open" });

    expect(Array.isArray(result)).toBe(true);
    // All returned tenders should have status "open"
    result.forEach(tender => {
      expect(tender.status).toBe("open");
    });
  });
});

describe("tenders.create", () => {
  it("creates a tender with items", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenders.create({
      reference: `TEST-${Date.now()}`,
      title: "Test Tender",
      organization: "Test Hospital",
      closingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "open",
      items: [
        {
          itemDescription: "Test Item 1",
          quantity: 10,
          unit: "pcs",
        },
        {
          itemDescription: "Test Item 2",
          quantity: 5,
          unit: "box",
        },
      ],
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect((result[0] as any).insertId).toBeDefined();
  });


});

describe("documents.list", () => {
  it("returns an array of documents", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("filters documents by type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.list({ documentType: "po" });

    expect(Array.isArray(result)).toBe(true);
    result.forEach(doc => {
      expect(doc.documentType).toBe("po");
    });
  });
});

describe("inventory.list", () => {
  it("returns an array of inventory items", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inventory.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("inventory.lowStock", () => {
  it("returns items with quantity below minimum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.inventory.lowStock();

    expect(Array.isArray(result)).toBe(true);
    // All items should have quantity <= minimumStock
    result.forEach(item => {
      expect(item.quantity).toBeLessThanOrEqual(item.minimumStock);
    });
  });
});
