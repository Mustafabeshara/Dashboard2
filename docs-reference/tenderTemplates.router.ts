import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenderTemplates, tenderTemplateItems } from "../../drizzle/schema";

export const tenderTemplatesRouter = router({
  // List all templates for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const templates = await db
      .select()
      .from(tenderTemplates)
      .where(eq(tenderTemplates.createdById, ctx.user.id));

    // Fetch items for each template
    const templatesWithItems = await Promise.all(
      templates.map(async (template) => {
        const items = await db
          .select()
          .from(tenderTemplateItems)
          .where(eq(tenderTemplateItems.templateId, template.id));
        return { ...template, items };
      })
    );

    return templatesWithItems;
  }),

  // Get a single template by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const template = await db
        .select()
        .from(tenderTemplates)
        .where(eq(tenderTemplates.id, input.id))
        .limit(1);

      if (template.length === 0 || template[0]!.createdById !== ctx.user.id) {
        throw new Error("Template not found");
      }

      const items = await db
        .select()
        .from(tenderTemplateItems)
        .where(eq(tenderTemplateItems.templateId, input.id));

      return { ...template[0], items };
    }),

  // Create a new template
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        organization: z.string().optional(),
        referencePattern: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number().optional(),
            itemDescription: z.string(),
            quantity: z.number(),
            unit: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create template
      const result = await db.insert(tenderTemplates).values({
        name: input.name,
        description: input.description,
        organization: input.organization,
        referencePattern: input.referencePattern,
        notes: input.notes,
        createdById: ctx.user.id,
      });

      const templateId = Number(result[0].insertId);

      // Create template items
      if (input.items.length > 0) {
        await db.insert(tenderTemplateItems).values(
          input.items.map((item) => ({
            templateId,
            productId: item.productId,
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unit: item.unit,
          }))
        );
      }

      return { id: templateId };
    }),

  // Update a template
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        organization: z.string().optional(),
        referencePattern: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number().optional(),
            itemDescription: z.string(),
            quantity: z.number(),
            unit: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const existing = await db
        .select()
        .from(tenderTemplates)
        .where(eq(tenderTemplates.id, input.id))
        .limit(1);

      if (existing.length === 0 || existing[0]!.createdById !== ctx.user.id) {
        throw new Error("Template not found");
      }

      // Update template
      await db
        .update(tenderTemplates)
        .set({
          name: input.name,
          description: input.description,
          organization: input.organization,
          referencePattern: input.referencePattern,
          notes: input.notes,
        })
        .where(eq(tenderTemplates.id, input.id));

      // Delete old items and create new ones
      await db
        .delete(tenderTemplateItems)
        .where(eq(tenderTemplateItems.templateId, input.id));

      if (input.items.length > 0) {
        await db.insert(tenderTemplateItems).values(
          input.items.map((item) => ({
            templateId: input.id,
            productId: item.productId,
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unit: item.unit,
          }))
        );
      }

      return { success: true };
    }),

  // Delete a template
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const existing = await db
        .select()
        .from(tenderTemplates)
        .where(eq(tenderTemplates.id, input.id))
        .limit(1);

      if (existing.length === 0 || existing[0]!.createdById !== ctx.user.id) {
        throw new Error("Template not found");
      }

      // Delete template (items will be cascade deleted)
      await db.delete(tenderTemplates).where(eq(tenderTemplates.id, input.id));

      return { success: true };
    }),
});
