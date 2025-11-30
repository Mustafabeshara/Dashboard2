/**
 * Comprehensive Zod Validation Schemas
 * Centralized validation for all API endpoints
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const searchSchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
})

export const idSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

// ============================================================================
// TENDER SCHEMAS
// ============================================================================

export const createTenderSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(5000).optional(),
  customerId: z.string().uuid().optional(),
  department: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  submissionDeadline: z.string().datetime().optional(),
  openingDate: z.string().datetime().optional(),
  estimatedValue: z.number().positive().optional(),
  currency: z.string().length(3).default('KWD'),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED']).default('DRAFT'),
  documents: z.array(z.any()).optional(),
  products: z.array(z.any()).optional(),
  technicalRequirements: z.string().max(10000).optional(),
  commercialRequirements: z.string().max(10000).optional(),
  bondRequired: z.boolean().default(false),
  bondAmount: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
})

export const updateTenderSchema = createTenderSchema.partial()

export const tenderFilterSchema = paginationSchema.merge(searchSchema).extend({
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ============================================================================
// CUSTOMER SCHEMAS
// ============================================================================

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  type: z.enum(['GOVERNMENT', 'PRIVATE', 'INDIVIDUAL']).default('GOVERNMENT'),
  registrationNumber: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).default('Kuwait'),
  primaryContact: z.string().max(200).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(20).optional(),
  paymentTerms: z.string().max(200).optional(),
  creditLimit: z.number().positive().optional(),
  departments: z.array(z.string()).optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export const customerFilterSchema = paginationSchema.merge(searchSchema).extend({
  type: z.enum(['GOVERNMENT', 'PRIVATE', 'INDIVIDUAL']).optional(),
  isActive: z.coerce.boolean().optional(),
})

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).max(100).default(0),
})

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  currency: z.string().length(3).default('KWD'),
  paymentTerms: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => new Date(data.dueDate) >= new Date(data.invoiceDate),
  {
    message: 'Due date must be after invoice date',
    path: ['dueDate'],
  }
)

export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  paidAmount: z.number().min(0).optional(),
  paymentTerms: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
})

export const invoiceFilterSchema = paginationSchema.merge(searchSchema).extend({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ============================================================================
// EXPENSE SCHEMAS
// ============================================================================

export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required').max(100),
  subCategory: z.string().max(100).optional(),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('KWD'),
  expenseDate: z.string().datetime(),
  paymentMethod: z.string().max(50).optional(),
  vendorId: z.string().uuid().optional(),
  budgetCategoryId: z.string().uuid().optional(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

export const expenseFilterSchema = paginationSchema.merge(searchSchema).extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  category: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budgetCategoryId: z.string().uuid().optional(),
})

// ============================================================================
// SUPPLIER SCHEMAS
// ============================================================================

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  registrationNumber: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).default('Kuwait'),
  primaryContact: z.string().max(200).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url('Invalid URL format').optional(),
  paymentTerms: z.string().max(200).optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const supplierFilterSchema = paginationSchema.merge(searchSchema).extend({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
})

// ============================================================================
// BUDGET SCHEMAS
// ============================================================================

export const createBudgetCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z.string().max(50).optional(),
  allocatedAmount: z.number().positive('Allocated amount must be positive'),
  description: z.string().max(1000).optional(),
})

export const createBudgetSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  fiscalYear: z.number().int().min(2000).max(2100),
  type: z.enum(['OPERATIONAL', 'CAPITAL', 'PROJECT']),
  department: z.string().max(100).optional(),
  currency: z.string().length(3).default('KWD'),
  totalAmount: z.number().positive('Total amount must be positive'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  categories: z.array(createBudgetCategorySchema).optional(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)

export const updateBudgetSchema = createBudgetSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']).optional(),
})

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const uploadDocumentSchema = z.object({
  file: z.any(), // File validation handled by multer/formidable
  type: z.enum(['TENDER', 'INVOICE', 'RECEIPT', 'CONTRACT', 'OTHER']).default('OTHER'),
  description: z.string().max(500).optional(),
})

export const processDocumentSchema = z.object({
  extractionType: z.enum(['TENDER', 'INVOICE', 'RECEIPT']),
  options: z.object({
    useOCR: z.boolean().default(false),
    language: z.string().default('en'),
  }).optional(),
})

// ============================================================================
// REPORT SCHEMAS
// ============================================================================

export const generateReportSchema = z.object({
  template: z.enum([
    'TENDER_SUMMARY',
    'WIN_RATE',
    'BUDGET_ANALYSIS',
    'EXPENSE_SUMMARY',
    'CUSTOMER_PERFORMANCE',
    'INVOICE_AGING',
    'SUPPLIER_PERFORMANCE',
    'INVENTORY_STATUS',
  ]),
  params: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    customerId: z.string().uuid().optional(),
    status: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
  format: z.enum(['JSON', 'PDF', 'EXCEL']).default('JSON'),
})

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(200),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER']),
  department: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
})

export const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

export function validateRequestSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
