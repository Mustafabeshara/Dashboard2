import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { INVENTORY_MOVEMENT_TYPE } from "./shared";

const movementTypeEnum = z.enum([
  INVENTORY_MOVEMENT_TYPE.IN,
  INVENTORY_MOVEMENT_TYPE.OUT,
  INVENTORY_MOVEMENT_TYPE.ADJUSTMENT,
]);

export const inventoryRouter = router({
  list: protectedProcedure.query(async () => {
    return db.getInventory();
  }),

  lowStock: protectedProcedure.query(async () => {
    return db.getLowStockItems();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getInventoryById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      productId: z.number(),
      warehouseLocation: z.string().min(1),
      quantity: z.number().min(0),
      unitCost: z.number().min(0).optional(),
      currency: z.string().optional(),
      batchNumber: z.string().min(1),
      expiryDate: z.date().optional(),
      minimumStock: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createInventory(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      productId: z.number().optional(),
      warehouseLocation: z.string().optional(),
      quantity: z.number().min(0).optional(),
      unitCost: z.number().min(0).optional(),
      currency: z.string().optional(),
      batchNumber: z.string().optional(),
      expiryDate: z.date().optional(),
      minimumStock: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateInventory(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteInventory(input.id);
    }),

  movements: protectedProcedure
    .input(z.object({ inventoryId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return db.getInventoryMovements(input?.inventoryId);
    }),

  addMovement: protectedProcedure
    .input(z.object({
      inventoryId: z.number(),
      productId: z.number(),
      movementType: movementTypeEnum,
      quantity: z.number(),
      referenceType: z.string().optional(),
      referenceId: z.number().optional(),
      documentId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.createInventoryMovement({
        ...input,
        createdById: ctx.user.id,
      });
    }),
});
