import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

/**
 * Whitelist router - Admin-only access control management
 */
export const whitelistRouter = router({
  /**
   * List all whitelisted emails
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can view whitelist
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can view the whitelist",
      });
    }

    return db.getAllWhitelistEmails();
  }),

  /**
   * Add email to whitelist
   */
  add: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can add to whitelist
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can manage the whitelist",
        });
      }

      // Check if email already exists
      const exists = await db.isEmailWhitelisted(input.email);
      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email is already whitelisted",
        });
      }

      await db.addToWhitelist({
        email: input.email.toLowerCase(),
        addedBy: ctx.user.email || ctx.user.name || "Unknown",
        notes: input.notes,
      });

      return { success: true };
    }),

  /**
   * Remove email from whitelist
   */
  remove: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can remove from whitelist
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can manage the whitelist",
        });
      }

      await db.removeFromWhitelist(input.id);
      return { success: true };
    }),

  /**
   * Check if an email is whitelisted (public for access control)
   */
  check: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .query(async ({ input }) => {
      const isWhitelisted = await db.isEmailWhitelisted(input.email.toLowerCase());
      return { isWhitelisted };
    }),
});
