/**
 * Tender Validation Schemas
 */

import { z } from 'zod'
import { uuidSchema, dateSchema, decimalMoneySchema, tenderStatusSchema } from './common'

// Tender item schema
export const tenderItemSchema = z.object({
  productId: uuidSchema.optional(),
  productName: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().positive(),
  unit: z.string().min(1).max(50).default('unit'),
  unitPrice: decimalMoneySchema,
  totalPrice: decimalMoneySchema.optional(),
})

// Create tender schema
export const createTenderSchema = z.object({
  tenderId: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  customerId: uuidSchema.optional(),
  customerName: z.string().min(1).max(255).optional(),
  submissionDeadline: dateSchema,
  openingDate: dateSchema.optional(),
  closingDate: dateSchema.optional(),
  status: tenderStatusSchema.default('DRAFT'),
  items: z.array(tenderItemSchema).min(1, 'At least one item is required'),
  totalValue: decimalMoneySchema.optional(),
  currency: z.string().length(3).default('YER'),
  notes: z.string().max(5000).optional(),
  sourceDocument: z.string().max(255).optional(),
})

// Update tender schema (all fields optional)
export const updateTenderSchema = createTenderSchema.partial()

// Tender search params
export const tenderSearchSchema = z.object({
  search: z.string().optional(),
  status: tenderStatusSchema.optional(),
  customerId: uuidSchema.optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'submissionDeadline', 'totalValue', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Tender participant schema
export const tenderParticipantSchema = z.object({
  tenderId: uuidSchema,
  name: z.string().min(1).max(255),
  companyName: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  bidAmount: decimalMoneySchema.optional(),
  status: z.enum(['INVITED', 'SUBMITTED', 'QUALIFIED', 'DISQUALIFIED', 'WINNER']).default('INVITED'),
  notes: z.string().max(1000).optional(),
})

export type CreateTenderInput = z.infer<typeof createTenderSchema>
export type UpdateTenderInput = z.infer<typeof updateTenderSchema>
export type TenderSearchParams = z.infer<typeof tenderSearchSchema>
export type TenderItem = z.infer<typeof tenderItemSchema>
export type TenderParticipant = z.infer<typeof tenderParticipantSchema>
