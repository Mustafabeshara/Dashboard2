import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { checkTenderClosingAlerts, checkLowInventoryAlerts, sendTestNotification } from "../notifications";
import { eq, and, desc } from "drizzle-orm";
import { notifications } from "../../drizzle/schema";
import { getDb } from "../db";

export const notificationsRouter = router({
  checkTenderClosing: protectedProcedure
    .input(z.object({ daysAhead: z.number().min(1).max(30).default(7) }))
    .mutation(async ({ input }) => {
      return await checkTenderClosingAlerts(input.daysAhead);
    }),

  checkLowInventory: protectedProcedure
    .mutation(async () => {
      return await checkLowInventoryAlerts();
    }),

  sendTest: protectedProcedure
    .mutation(async () => {
      return await sendTestNotification();
    }),

  // Get user's notifications
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        unreadOnly: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(notifications.userId, ctx.user.id)];
      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      const result = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);

      return result;
    }),

  // Get unread count
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return result.length;
  }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return { success: true };
  }),

  // Delete notification
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});
