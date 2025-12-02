import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TENDER_STATUS } from "./shared";

const tenderStatusEnum = z.enum([
  TENDER_STATUS.OPEN,
  TENDER_STATUS.CLOSED,
  TENDER_STATUS.AWARDED,
  TENDER_STATUS.LOST,
]);

export const tendersRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      organizationSearch: z.string().optional(),
      showArchived: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getTenders(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // Uses optimized query that fetches all data in parallel
      return db.getTenderWithDetails(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      reference: z.string().min(1, "Reference is required"),
      title: z.string().optional(),
      organization: z.string().optional(),
      closingDate: z.date().optional(),
      status: tenderStatusEnum.optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.number().optional(),
        itemDescription: z.string(),
        quantity: z.number().min(1),
        unit: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { items, ...tenderData } = input;
      const result = await db.createTender({
        ...tenderData,
        createdById: ctx.user.id,
      });

      // Create tender items if provided
      if (items && items.length > 0) {
        const tenderId = Number((result[0] as unknown as { insertId: number }).insertId);
        for (const item of items) {
          await db.createTenderItem({
            tenderId,
            ...item,
          });
        }
      }

      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      reference: z.string().min(1).optional(),
      title: z.string().optional(),
      organization: z.string().optional(),
      closingDate: z.date().optional(),
      status: tenderStatusEnum.optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateTender(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteTender(input.id);
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return db.updateTender(input.id, {
        isArchived: true,
        archivedAt: new Date(),
        archivedById: ctx.user.id,
      });
    }),

  unarchive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.updateTender(input.id, {
        isArchived: false,
        archivedAt: null,
        archivedById: null,
      });
    }),

  addItem: protectedProcedure
    .input(z.object({
      tenderId: z.number(),
      productId: z.number().optional(),
      itemDescription: z.string(),
      quantity: z.number().min(1),
      unit: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createTenderItem(input);
    }),

  addResult: protectedProcedure
    .input(z.object({
      tenderId: z.number(),
      tenderItemId: z.number().optional(),
      manufacturerId: z.number().optional(),
      productId: z.number().optional(),
      bidPrice: z.number().min(0).optional(),
      currency: z.string().optional(),
      isOurBid: z.boolean().optional(),
      competitorName: z.string().optional(),
      isWinner: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createTenderResult(input);
    }),
});
