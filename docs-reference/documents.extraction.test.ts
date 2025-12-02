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
    role: "user",
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

describe("documents.extraction", () => {
  describe("extractTender", () => {
    it("should handle PDF files with file_url", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First upload a test document
      const uploadResult = await caller.documents.upload({
        fileName: "test-tender.pdf",
        fileData: Buffer.from("test").toString("base64"),
        mimeType: "application/pdf",
        documentType: "tender",
      });

      expect(uploadResult.documentId).toBeGreaterThan(0);

      // Now extract from it
      const extractResult = await caller.documents.extractTender({
        documentId: uploadResult.documentId,
      });

      expect(extractResult).toBeDefined();
      expect(extractResult.reference).toBeDefined();
      expect(extractResult.title).toBeDefined();
      expect(extractResult.organization).toBeDefined();
      expect(extractResult.items).toBeInstanceOf(Array);
    });

    it("should handle image files with image_url", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Upload a test image
      const uploadResult = await caller.documents.upload({
        fileName: "test-tender.png",
        fileData: Buffer.from("test").toString("base64"),
        mimeType: "image/png",
        documentType: "tender",
      });

      expect(uploadResult.documentId).toBeGreaterThan(0);

      // Extract from it
      const extractResult = await caller.documents.extractTender({
        documentId: uploadResult.documentId,
      });

      expect(extractResult).toBeDefined();
      expect(extractResult.reference).toBeDefined();
    });
  });

  describe("extractData", () => {
    it("should extract tender data with proper content type", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Upload a test PDF
      const uploadResult = await caller.documents.upload({
        fileName: "test-tender.pdf",
        fileData: Buffer.from("test").toString("base64"),
        mimeType: "application/pdf",
        documentType: "tender",
      });

      // Extract using extractData endpoint
      const extractResult = await caller.documents.extractData({
        documentId: uploadResult.documentId,
        documentType: "tender",
      });

      expect(extractResult.extractedData).toBeDefined();
      const parsed = JSON.parse(extractResult.extractedData);
      expect(parsed.reference).toBeDefined();
    });

    it("should handle invoice extraction", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Upload a test invoice
      const uploadResult = await caller.documents.upload({
        fileName: "test-invoice.pdf",
        fileData: Buffer.from("test").toString("base64"),
        mimeType: "application/pdf",
        documentType: "invoice",
      });

      // Extract invoice data
      const extractResult = await caller.documents.extractData({
        documentId: uploadResult.documentId,
        documentType: "invoice",
      });

      expect(extractResult.extractedData).toBeDefined();
    });

    it("should handle delivery note extraction", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Upload a test delivery note
      const uploadResult = await caller.documents.upload({
        fileName: "test-delivery.pdf",
        fileData: Buffer.from("test").toString("base64"),
        mimeType: "application/pdf",
        documentType: "delivery_note",
      });

      // Extract delivery note data
      const extractResult = await caller.documents.extractData({
        documentId: uploadResult.documentId,
        documentType: "delivery_note",
      });

      expect(extractResult.extractedData).toBeDefined();
    });

    it("should handle PO extraction", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Upload a test PO
      const uploadResult = await caller.documents.upload({
        fileName: "test-po.pdf",
        fileData: Buffer.from("test").toString("base64"),
        mimeType: "application/pdf",
        documentType: "po",
      });

      // Extract PO data
      const extractResult = await caller.documents.extractData({
        documentId: uploadResult.documentId,
        documentType: "po",
      });

      expect(extractResult.extractedData).toBeDefined();
    });
  });

  describe("multiFileUpload", () => {
    it("should handle multiple PDF files", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.documents.multiFileUpload({
        files: [
          {
            fileName: "tender1.pdf",
            fileData: Buffer.from("test1").toString("base64"),
            mimeType: "application/pdf",
          },
          {
            fileName: "tender2.pdf",
            fileData: Buffer.from("test2").toString("base64"),
            mimeType: "application/pdf",
          },
        ],
      });

      expect(result.totalFiles).toBe(2);
      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.results).toHaveLength(2);
    });

    it("should handle mixed file types", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.documents.multiFileUpload({
        files: [
          {
            fileName: "tender1.pdf",
            fileData: Buffer.from("test1").toString("base64"),
            mimeType: "application/pdf",
          },
          {
            fileName: "tender2.png",
            fileData: Buffer.from("test2").toString("base64"),
            mimeType: "image/png",
          },
        ],
      });

      expect(result.totalFiles).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });
});
