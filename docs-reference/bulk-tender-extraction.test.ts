import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createReadStream, readFileSync } from "fs";
import { join } from "path";
import AdmZip from "adm-zip";

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

describe("Bulk Tender Extraction", () => {
  it("processes a ZIP file with multiple PDFs", { timeout: 120000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a test ZIP file with mock PDF content
    const zip = new AdmZip();
    
    // Add mock PDF files
    const mockPdf1 = Buffer.from("Mock PDF content 1");
    const mockPdf2 = Buffer.from("Mock PDF content 2");
    
    zip.addFile("tender1.pdf", mockPdf1);
    zip.addFile("tender2.pdf", mockPdf2);
    
    const zipBuffer = zip.toBuffer();
    const base64Zip = zipBuffer.toString('base64');

    const result = await caller.documents.bulkExtractTenders({
      zipFileName: "test-tenders.zip",
      zipFileData: base64Zip,
    });

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.totalFiles).toBe(2);
    expect(result.results).toHaveLength(2);
    
    // Check that each result has expected structure
    result.results.forEach((r: any) => {
      expect(r).toHaveProperty('fileName');
      expect(r).toHaveProperty('documentId');
      expect(r).toHaveProperty('success');
      
      if (r.success) {
        expect(r).toHaveProperty('data');
        expect(r.data).toHaveProperty('reference');
        expect(r.data).toHaveProperty('items');
      } else {
        expect(r).toHaveProperty('error');
      }
    });
  });

  it("rejects ZIP files with too many files", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const zip = new AdmZip();
    
    // Add 51 files (over the limit of 50)
    for (let i = 0; i < 51; i++) {
      zip.addFile(`tender${i}.pdf`, Buffer.from(`Mock PDF ${i}`));
    }
    
    const zipBuffer = zip.toBuffer();
    const base64Zip = zipBuffer.toString('base64');

    await expect(
      caller.documents.bulkExtractTenders({
        zipFileName: "too-many-files.zip",
        zipFileData: base64Zip,
      })
    ).rejects.toThrow("Too many files");
  });

  it("rejects ZIP files with no PDF files", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const zip = new AdmZip();
    
    // Add non-PDF files
    zip.addFile("document.txt", Buffer.from("Text file"));
    zip.addFile("data.json", Buffer.from('{"key": "value"}'));
    
    const zipBuffer = zip.toBuffer();
    const base64Zip = zipBuffer.toString('base64');

    await expect(
      caller.documents.bulkExtractTenders({
        zipFileName: "no-pdfs.zip",
        zipFileData: base64Zip,
      })
    ).rejects.toThrow("No PDF or image files found");
  });

  it("handles mixed success and failure results", { timeout: 120000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const zip = new AdmZip();
    
    // Add valid and invalid files
    zip.addFile("valid-tender.pdf", Buffer.from("Valid PDF content"));
    zip.addFile("corrupted.pdf", Buffer.from("x")); // Very small, likely to fail
    
    const zipBuffer = zip.toBuffer();
    const base64Zip = zipBuffer.toString('base64');

    const result = await caller.documents.bulkExtractTenders({
      zipFileName: "mixed-results.zip",
      zipFileData: base64Zip,
    });

    expect(result.totalFiles).toBe(2);
    expect(result.successful + result.failed).toBe(2);
    expect(result.results).toHaveLength(2);
  });
});
