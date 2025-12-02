import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  tenders, 
  products, 
  inventory, 
  invoices, 
  customers, 
  manufacturers,
  deliveries,
  tasks,
  expenses,
  forecasts,
  documents
} from "../../drizzle/schema";
import { or, like, sql } from "drizzle-orm";

export const searchRouter = router({
  // Global search across all modules
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        return {
          tenders: [],
          products: [],
          inventory: [],
          invoices: [],
          customers: [],
          manufacturers: [],
          deliveries: [],
          tasks: [],
          expenses: [],
          forecasts: [],
          documents: [],
        };
      }

      const searchPattern = `%${input.query}%`;
      const resultLimit = Math.min(input.limit, 10); // Limit per module

      try {
        // Search tenders
        const tenderResults = await db
          .select()
          .from(tenders)
          .where(
            or(
              like(tenders.reference, searchPattern),
              like(tenders.title, searchPattern),
              like(tenders.organization, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search products
        const productResults = await db
          .select()
          .from(products)
          .where(
            or(
              like(products.name, searchPattern),
              like(products.sku, searchPattern),
              like(products.category, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search inventory
        const inventoryResults = await db
          .select()
          .from(inventory)
          .where(
            or(
              like(inventory.warehouseLocation, searchPattern),
              like(inventory.batchNumber, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search invoices
        const invoiceResults = await db
          .select()
          .from(invoices)
          .where(
            or(
              like(invoices.invoiceNumber, searchPattern),
              like(invoices.notes, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search customers
        const customerResults = await db
          .select()
          .from(customers)
          .where(
            or(
              like(customers.name, searchPattern),
              like(customers.email, searchPattern),
              like(customers.phone, searchPattern),
              like(customers.contactPerson, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search manufacturers
        const manufacturerResults = await db
          .select()
          .from(manufacturers)
          .where(
            or(
              like(manufacturers.name, searchPattern),
              like(manufacturers.email, searchPattern),
              like(manufacturers.phone, searchPattern),
              like(manufacturers.country, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search deliveries
        const deliveryResults = await db
          .select()
          .from(deliveries)
          .where(
            or(
              like(deliveries.trackingNumber, searchPattern),
              like(deliveries.deliveryAddress, searchPattern),
              like(deliveries.notes, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search tasks
        const taskResults = await db
          .select()
          .from(tasks)
          .where(
            or(
              like(tasks.title, searchPattern),
              like(tasks.description, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search expenses
        const expenseResults = await db
          .select()
          .from(expenses)
          .where(
            or(
              like(expenses.description, searchPattern),
              like(expenses.category, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search forecasts
        const forecastResults = await db
          .select()
          .from(forecasts)
          .where(
            or(
              like(forecasts.forecastType, searchPattern),
              like(forecasts.notes, searchPattern)
            )
          )
          .limit(resultLimit);

        // Search documents
        const documentResults = await db
          .select()
          .from(documents)
          .where(
            or(
              like(documents.fileName, searchPattern),
              like(documents.documentType, searchPattern)
            )
          )
          .limit(resultLimit);

        return {
          tenders: tenderResults,
          products: productResults,
          inventory: inventoryResults,
          invoices: invoiceResults,
          customers: customerResults,
          manufacturers: manufacturerResults,
          deliveries: deliveryResults,
          tasks: taskResults,
          expenses: expenseResults,
          forecasts: forecastResults,
          documents: documentResults,
        };
      } catch (error) {
        console.error("Global search error:", error);
        return {
          tenders: [],
          products: [],
          inventory: [],
          invoices: [],
          customers: [],
          manufacturers: [],
          deliveries: [],
          tasks: [],
          expenses: [],
          forecasts: [],
          documents: [],
        };
      }
    }),
});
