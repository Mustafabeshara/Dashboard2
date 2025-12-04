/**
 * Budget Validation Schemas
 */

import { z } from 'zod'
import { uuidSchema, dateSchema, decimalMoneySchema, percentageSchema } from './common'

// Budget period enum
export const budgetPeriodSchema = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'])

// Budget status
export const budgetStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'])

// Budget category schema
export const budgetCategorySchema = z.object({
  name: z.string().min(1).max(100),
  allocatedAmount: decimalMoneySchema,
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  parentCategoryId: uuidSchema.optional(),
})

// Create budget schema
export const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  totalAmount: decimalMoneySchema,
  period: budgetPeriodSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  status: budgetStatusSchema.default('DRAFT'),
  departmentId: uuidSchema.optional(),
  categories: z.array(budgetCategorySchema).optional(),
  warningThreshold: percentageSchema.default(80),
  criticalThreshold: percentageSchema.default(95),
})

// Update budget schema
export const updateBudgetSchema = createBudgetSchema.partial()

// Add category to budget
export const addBudgetCategorySchema = budgetCategorySchema.extend({
  budgetId: uuidSchema,
})

// Update category
export const updateBudgetCategorySchema = budgetCategorySchema.partial()

// Budget transaction schema
export const budgetTransactionSchema = z.object({
  budgetId: uuidSchema,
  categoryId: uuidSchema.optional(),
  amount: decimalMoneySchema,
  type: z.enum(['EXPENSE', 'ADJUSTMENT']),
  description: z.string().min(1).max(500),
  transactionDate: dateSchema,
  referenceId: z.string().max(100).optional(),
  referenceType: z.enum(['EXPENSE', 'INVOICE', 'MANUAL']).optional(),
})

// Budget search params
export const budgetSearchSchema = z.object({
  search: z.string().optional(),
  status: budgetStatusSchema.optional(),
  period: budgetPeriodSchema.optional(),
  departmentId: uuidSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'startDate', 'totalAmount', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
export type BudgetCategory = z.infer<typeof budgetCategorySchema>
export type BudgetTransaction = z.infer<typeof budgetTransactionSchema>
export type BudgetSearchParams = z.infer<typeof budgetSearchSchema>
