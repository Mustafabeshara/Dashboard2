/**
 * Bulk Import Router
 * Handles bulk import operations for all modules
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TASK_STATUS, TASK_PRIORITY, EXPENSE_STATUS } from "./shared";

export const bulkImportRouter = router({
  /**
   * Bulk import products
   */
  importProducts: protectedProcedure
    .input(z.object({
      products: z.array(z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        category: z.string().optional(),
        manufacturerId: z.number().optional(),
        unitPrice: z.number().min(0).optional(),
        specifications: z.string().optional(),
        description: z.string().optional(),
        isRepresented: z.boolean().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const product of input.products) {
        try {
          await db.createProduct(product);
          successCount++;
          results.push({ success: true, data: product });
        } catch (error) {
          errorCount++;
          results.push({
            success: false,
            data: product,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        successCount,
        errorCount,
        total: input.products.length,
        results,
      };
    }),

  /**
   * Bulk import customers
   */
  importCustomers: protectedProcedure
    .input(z.object({
      customers: z.array(z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const customer of input.customers) {
        try {
          await db.createCustomer(customer);
          successCount++;
          results.push({ success: true, data: customer });
        } catch (error) {
          errorCount++;
          results.push({
            success: false,
            data: customer,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        successCount,
        errorCount,
        total: input.customers.length,
        results,
      };
    }),

  /**
   * Bulk import inventory
   */
  importInventory: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        productId: z.number(),
        quantity: z.number().min(0),
        warehouseLocation: z.string().optional(),
        batchNumber: z.string().optional(),
        expiryDate: z.date().optional(),
        costPerUnit: z.number().min(0).optional(),
        minimumStock: z.number().min(0).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const item of input.items) {
        try {
          await db.createInventory({
            ...item,
            warehouseLocation: item.warehouseLocation || 'Unknown',
            batchNumber: item.batchNumber || 'N/A',
          });
          successCount++;
          results.push({ success: true, data: item });
        } catch (error) {
          errorCount++;
          results.push({
            success: false,
            data: item,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        successCount,
        errorCount,
        total: input.items.length,
        results,
      };
    }),

  /**
   * Bulk import expenses
   */
  importExpenses: protectedProcedure
    .input(z.object({
      expenses: z.array(z.object({
        category: z.string().min(1),
        description: z.string().optional(),
        amount: z.number().min(0),
        expenseDate: z.date(),
        status: z.enum([EXPENSE_STATUS.PENDING, EXPENSE_STATUS.APPROVED, EXPENSE_STATUS.REJECTED, EXPENSE_STATUS.PAID]).optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const expense of input.expenses) {
        try {
          await db.createExpense({
            ...expense,
            description: expense.description || expense.category,
          });
          successCount++;
          results.push({ success: true, data: expense });
        } catch (error) {
          errorCount++;
          results.push({
            success: false,
            data: expense,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        successCount,
        errorCount,
        total: input.expenses.length,
        results,
      };
    }),

  /**
   * Bulk import tasks
   */
  importTasks: protectedProcedure
    .input(z.object({
      tasks: z.array(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum([TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED]).optional(),
        priority: z.enum([TASK_PRIORITY.LOW, TASK_PRIORITY.MEDIUM, TASK_PRIORITY.HIGH, TASK_PRIORITY.URGENT]).optional(),
        dueDate: z.date().optional(),
        estimatedHours: z.number().min(0).optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const task of input.tasks) {
        try {
          await db.createTask({
            ...task,
            createdById: ctx.user.id,
          });
          successCount++;
          results.push({ success: true, data: task });
        } catch (error) {
          errorCount++;
          results.push({
            success: false,
            data: task,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        successCount,
        errorCount,
        total: input.tasks.length,
        results,
      };
    }),

  /**
   * Bulk import manufacturers
   */
  importManufacturers: protectedProcedure
    .input(z.object({
      manufacturers: z.array(z.object({
        name: z.string().min(1),
        country: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        website: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const manufacturer of input.manufacturers) {
        try {
          await db.createManufacturer(manufacturer);
          successCount++;
          results.push({ success: true, data: manufacturer });
        } catch (error) {
          errorCount++;
          results.push({
            success: false,
            data: manufacturer,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        successCount,
        errorCount,
        total: input.manufacturers.length,
        results,
      };
    }),
});
