import { describe, expect, it, beforeAll } from "vitest";
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("documents.multiFileUpload", () => {
  it("should reject empty file array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.documents.multiFileUpload({
        files: [],
      })
    ).rejects.toThrow();
  });

  it("should reject files exceeding maximum count", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tooManyFiles = Array(11).fill({
      fileName: "test.pdf",
      fileData: Buffer.from("test").toString("base64"),
      mimeType: "application/pdf",
    });

    await expect(
      caller.documents.multiFileUpload({
        files: tooManyFiles,
      })
    ).rejects.toThrow();
  });

  it("should accept valid file upload request", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a small test image (1x1 PNG)
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const result = await caller.documents.multiFileUpload({
      files: [
        {
          fileName: "test-tender.png",
          fileData: testImageBase64,
          mimeType: "image/png",
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.totalFiles).toBe(1);
    expect(result.results).toHaveLength(1);
    
    // The extraction might fail (which is expected for a 1x1 pixel image),
    // but the upload itself should succeed
    console.log("Upload result:", JSON.stringify(result, null, 2));
  }, 120000); // 120 second timeout for LLM extraction
});
