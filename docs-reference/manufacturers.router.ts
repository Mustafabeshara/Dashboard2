import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const manufacturersRouter = router({
  list: protectedProcedure.query(async () => {
    return db.getManufacturers();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getManufacturerById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      country: z.string().optional(),
      contactPerson: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      website: z.string().url().optional().or(z.literal("")),
      notes: z.string().optional(),
      isRepresented: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return db.createManufacturer(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      country: z.string().optional(),
      contactPerson: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      website: z.string().url().optional().or(z.literal("")),
      notes: z.string().optional(),
      isRepresented: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.updateManufacturer(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.deleteManufacturer(input.id);
    }),
});
