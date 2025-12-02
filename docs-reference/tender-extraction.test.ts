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

describe("documents.upload", () => {
  it("uploads a document and returns documentId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a simple base64 encoded test file
    const testContent = "Test document content";
    const base64Content = Buffer.from(testContent).toString('base64');

    const result = await caller.documents.upload({
      fileName: "test-tender.pdf",
      fileData: base64Content,
      mimeType: "application/pdf",
      documentType: "tender",
    });

    expect(result).toBeDefined();
    expect(result.documentId).toBeDefined();
    expect(typeof result.documentId).toBe("number");
    expect(result.documentId).toBeGreaterThan(0);
  });
});

describe("documents.extractTender", () => {
  it("returns structured tender data", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First upload a test document
    const testContent = "Test tender document";
    const base64Content = Buffer.from(testContent).toString('base64');

    const uploadResult = await caller.documents.upload({
      fileName: "test-tender.pdf",
      fileData: base64Content,
      mimeType: "application/pdf",
      documentType: "tender",
    });

    // Then extract tender data
    const extractResult = await caller.documents.extractTender({
      documentId: uploadResult.documentId,
    });

    expect(extractResult).toBeDefined();
    expect(extractResult).toHaveProperty("reference");
    expect(extractResult).toHaveProperty("title");
    expect(extractResult).toHaveProperty("organization");
    expect(extractResult).toHaveProperty("closingDate");
    expect(extractResult).toHaveProperty("items");
    expect(extractResult).toHaveProperty("notes");
    expect(Array.isArray(extractResult.items)).toBe(true);
  });
});

describe("tenders.create with extracted data", () => {
  it("creates tender from extracted document data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenders.create({
      reference: "5SSN11",
      title: "Medical Disposables Tender",
      organization: "Ministry of Health - Medical Store Administration",
      closingDate: new Date("2025-11-26"),
      status: "open",
      items: [
        {
          itemDescription: "4MM SCREW FOR PLATES SELF-DRILLING SELF-TAPPING",
          quantity: 600,
          unit: "PCS",
        },
      ],
      notes: "Samples required for new materials",
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
