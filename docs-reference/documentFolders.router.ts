import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db/documentFolders";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

export const documentFoldersRouter = router({
  // ===== Folders =====
  
  createFolder: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        entityType: z.string(),
        entityId: z.number(),
        parentFolderId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const folderId = await db.createFolder({
        ...input,
        createdById: ctx.user.id,
      });
      return { id: folderId };
    }),

  getFoldersByEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return db.getFoldersByEntity(input.entityType, input.entityId);
    }),

  getRootFolders: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return db.getRootFolders(input.entityType, input.entityId);
    }),

  getSubfolders: protectedProcedure
    .input(z.object({ parentFolderId: z.number() }))
    .query(async ({ input }) => {
      return db.getSubfolders(input.parentFolderId);
    }),

  updateFolder: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateFolder(id, data);
      return { success: true };
    }),

  deleteFolder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteFolder(input.id);
      return { success: true };
    }),

  // ===== Documents =====

  uploadDocument: protectedProcedure
    .input(
      z.object({
        folderId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Decode base64
      const buffer = Buffer.from(input.fileData, "base64");
      const fileSize = buffer.length;

      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `folders/${input.folderId}/${timestamp}-${randomSuffix}-${input.fileName}`;

      // Upload to S3
      const { url: fileUrl } = await storagePut(
        fileKey,
        buffer,
        input.mimeType
      );

      // Save to database
      const docId = await db.uploadDocumentToFolder({
        folderId: input.folderId,
        fileName: input.fileName,
        fileKey,
        fileUrl,
        mimeType: input.mimeType,
        fileSize,
        uploadedById: ctx.user.id,
        notes: input.notes,
      });

      return { id: docId, fileUrl };
    }),

  getDocumentsByFolder: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .query(async ({ input }) => {
      return db.getDocumentsByFolder(input.folderId);
    }),

  updateDocument: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fileName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDocument(id, data);
      return { success: true };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true };
    }),

  // ===== Required Documents =====

  createRequiredDocument: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        documentName: z.string().min(1).max(255),
        description: z.string().optional(),
        isMandatory: z.boolean().default(true),
        folderId: z.number().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const docId = await db.createRequiredDocument({
        ...input,
        createdById: ctx.user.id,
      });
      return { id: docId };
    }),

  getRequiredDocuments: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return db.getRequiredDocumentsByEntity(input.entityType, input.entityId);
    }),

  updateRequiredDocument: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        documentName: z.string().optional(),
        description: z.string().optional(),
        isMandatory: z.boolean().optional(),
        folderId: z.number().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateRequiredDocument(id, data);
      return { success: true };
    }),

  deleteRequiredDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteRequiredDocument(input.id);
      return { success: true };
    }),

  markDocumentCompleted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.markDocumentCompleted(input.id, ctx.user.id);
      return { success: true };
    }),

  getCompletionStatus: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const allDocs = await db.getRequiredDocumentsByEntity(
        input.entityType,
        input.entityId
      );
      const completed = allDocs.filter((d) => d.isCompleted).length;
      const total = allDocs.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        completed,
        total,
        percentage,
        incomplete: allDocs.filter((d) => !d.isCompleted),
      };
    }),

  // ===== Reminders =====

  setupReminder: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        reminderFrequencyDays: z.number().default(7),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const nextReminderDue = new Date();
      nextReminderDue.setDate(
        nextReminderDue.getDate() + input.reminderFrequencyDays
      );

      const reminderId = await db.createOrUpdateReminder({
        entityType: input.entityType,
        entityId: input.entityId,
        reminderFrequencyDays: input.reminderFrequencyDays,
        nextReminderDue,
        isActive: input.isActive,
      });

      return { id: reminderId };
    }),

  getReminderStatus: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return db.getReminderByEntity(input.entityType, input.entityId);
    }),

  // ===== Global Search =====

  searchDocuments: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        entityType: z.string().optional(), // "tender" or "manufacturer"
        folderName: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return db.searchDocuments(input);
    }),
});
