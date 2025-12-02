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

describe("AI Assistant", () => {
  it("responds to a simple question about tenders", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assistant.chat({
      message: "How many tenders do we have?",
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
    
    // Should include context
    expect(result.context).toBeDefined();
    expect(result.context.tendersTotal).toBeGreaterThanOrEqual(0);
  });

  it("responds to a question about inventory", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assistant.chat({
      message: "Do we have any low stock items?",
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe("string");
    
    // Should include inventory context
    expect(result.context.inventoryItems).toBeGreaterThanOrEqual(0);
  });

  it("maintains conversation history", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First message
    const result1 = await caller.assistant.chat({
      message: "What's our tender win rate?",
    });

    expect(result1.response).toBeDefined();

    // Follow-up message with history
    const result2 = await caller.assistant.chat({
      message: "Can you explain that in more detail?",
      conversationHistory: [
        { role: "user", content: "What's our tender win rate?" },
        { role: "assistant", content: result1.response },
      ],
    });

    expect(result2.response).toBeDefined();
    expect(typeof result2.response).toBe("string");
  });

  it("handles business analysis questions", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assistant.chat({
      message: "Give me a summary of our business performance",
    });

    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(50); // Should be a detailed response
  });
});
