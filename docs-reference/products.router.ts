import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const productsRouter = router({
  list: protectedProcedure.query(async () => {
    return db.getProducts();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getProductById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      sku: z.string().optional(),
      manufacturerId: z.number().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      specifications: z.string().optional(),
      unitPrice: z.number().min(0).optional(),
      currency: z.string().optional(),
      isRepresented: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createProduct(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      sku: z.string().optional(),
      manufacturerId: z.number().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      specifications: z.string().optional(),
      unitPrice: z.number().min(0).optional(),
      currency: z.string().optional(),
      isRepresented: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateProduct(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteProduct(input.id);
    }),
});
