import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getCommentsByEntity,
  createComment,
  deleteComment,
  getAttachmentsByEntity,
  createAttachment,
  deleteAttachment,
} from "../db";
import { storagePut } from "../storage";

export const taskCommentsRouter = router({
  // ============ Comments ============
  
  getComments: protectedProcedure
    .input(z.object({
      taskId: z.number(),
    }))
    .query(async ({ input }) => {
      return getCommentsByEntity("task", input.taskId);
    }),

  addComment: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await createComment({
        userId: ctx.user.id,
        entityType: "task",
        entityId: input.taskId,
        content: input.content,
        parentCommentId: null,
      });
      return { success: true };
    }),

  deleteComment: protectedProcedure
    .input(z.object({
      commentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await deleteComment(input.commentId);
      return { success: true };
    }),

  // ============ File Attachments ============
  
  getAttachments: protectedProcedure
    .input(z.object({
      taskId: z.number(),
    }))
    .query(async ({ input }) => {
      return getAttachmentsByEntity("task", input.taskId);
    }),

  uploadAttachment: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded file data
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `task-attachments/${input.taskId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Save attachment metadata to database
      await createAttachment({
        userId: ctx.user.id,
        entityType: "task",
        entityId: input.taskId,
        fileName: input.fileName,
        fileUrl: url,
        fileSize: buffer.length,
        mimeType: input.mimeType,
      });

      return { success: true, url };
    }),

  deleteAttachment: protectedProcedure
    .input(z.object({
      attachmentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await deleteAttachment(input.attachmentId);
      return { success: true };
    }),
});
