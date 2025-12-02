/**
 * Type definitions for Medical Distribution Management System
 */

// User types
export type UserRole =
  | 'ADMIN'
  | 'CEO'
  | 'CFO'
  | 'FINANCE_MANAGER'
  | 'MANAGER'
  | 'SALES'
  | 'WAREHOUSE'
  | 'FINANCE'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  department?: string
  phone?: string
  isActive: boolean
  twoFactorEnabled: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  department?: string
}

// Budget types
export type BudgetType = 'MASTER' | 'DEPARTMENT' | 'PROJECT' | 'TENDER'
export type BudgetStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'CLOSED' | 'REJECTED'
export type CategoryType = 'REVENUE' | 'EXPENSE' | 'CAPITAL'
export type TransactionType = 'EXPENSE' | 'REVENUE' | 'TRANSFER' | 'ADJUSTMENT'
export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AlertType = 'THRESHOLD_80' | 'THRESHOLD_90' | 'EXCEEDED' | 'VARIANCE' | 'APPROVAL_PENDING'
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Budget {
  id: string
  name: string
  fiscalYear: number
  type: BudgetType
  department?: string
  status: BudgetStatus
  currency: string
  totalAmount: number
  startDate: Date
  endDate: Date
  createdById?: string
  approvedById?: string
  approvedDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
  categories?: BudgetCategory[]
  createdBy?: User
  approvedBy?: User
}

export interface BudgetCategory {
  id: string
  budgetId: string
  parentCategoryId?: string
  name: string
  code?: string
  type: CategoryType
  allocatedAmount: number
  spentAmount: number
  committedAmount: number
  availableAmount?: number
  varianceThreshold: number
  requiresApprovalOver?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
  childCategories?: BudgetCategory[]
  parentCategory?: BudgetCategory
  transactions?: BudgetTransaction[]
}

export interface BudgetTransaction {
  id: string
  budgetCategoryId: string
  transactionDate: Date
  description: string
  amount: number
  transactionType: TransactionType
  referenceType?: 'INVOICE' | 'EXPENSE' | 'TENDER' | 'PURCHASE_ORDER'
  referenceId?: string
  status: TransactionStatus
  createdById?: string
  approvedById?: string
  approvedDate?: Date
  attachmentUrl?: string
  notes?: string
  createdAt: Date
  budgetCategory?: BudgetCategory
  createdBy?: User
  approvedBy?: User
  approvals?: BudgetApproval[]
}

export interface BudgetApproval {
  id: string
  budgetTransactionId: string
  approverId: string
  approvalLevel: number
  status: ApprovalStatus
  comments?: string
  approvedAt?: Date
  createdAt: Date
  approver?: User
}

export interface BudgetAlert {
  id: string
  budgetId: string
  categoryId?: string
  alertType: AlertType
  severity: AlertSeverity
  message: string
  threshold?: number
  currentValue?: number
  isAcknowledged: boolean
  acknowledgedById?: string
  acknowledgedAt?: Date
  createdAt: Date
}

// Form types
export interface BudgetFormData {
  name: string
  fiscalYear: number
  type: BudgetType
  department?: string
  totalAmount: number
  startDate: string
  endDate: string
  currency: string
  notes?: string
  categories: BudgetCategoryFormData[]
}

export interface BudgetCategoryFormData {
  id?: string
  name: string
  code: string
  type: CategoryType
  allocatedAmount: number
  parentId?: string
  varianceThreshold: number
  requiresApprovalOver?: number
  notes?: string
}

export interface TransactionFormData {
  budgetCategoryId: string
  transactionDate: string
  description: string
  amount: number
  transactionType: TransactionType
  referenceType?: 'INVOICE' | 'EXPENSE' | 'TENDER' | 'PURCHASE_ORDER'
  referenceId?: string
  attachmentUrl?: string
  notes?: string
}

// Dashboard types
export interface DashboardStats {
  totalBudget: number
  totalSpent: number
  totalCommitted: number
  availableBudget: number
  consumptionPercentage: number
  activeBudgets: number
  pendingApprovals: number
  alertsCount: number
}

export interface DepartmentBudget {
  department: string
  allocated: number
  spent: number
  available: number
  percentage: number
}

export interface MonthlyTrend {
  month: string
  budget: number
  actual: number
  variance: number
}

export interface ChartData {
  departmentBudgets: DepartmentBudget[]
  monthlyTrends: MonthlyTrend[]
  categoryBreakdown: {
    name: string
    value: number
    color: string
  }[]
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Filter types
export interface BudgetFilters {
  status?: BudgetStatus
  type?: BudgetType
  fiscalYear?: number
  department?: string
  search?: string
}

export interface TransactionFilters {
  status?: TransactionStatus
  type?: TransactionType
  startDate?: string
  endDate?: string
  categoryId?: string
  search?: string
}

// Tender types
export type TenderStatus = 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'WON' | 'LOST' | 'CANCELLED'

export interface Tender {
  id: string
  tenderNumber: string
  title: string
  description?: string
  customerId?: string
  department?: string
  category?: string
  submissionDeadline?: Date
  openingDate?: Date
  estimatedValue?: number
  currency: string
  status: TenderStatus
  bondRequired: boolean
  bondAmount?: number
  createdById?: string
  createdAt: Date
  updatedAt: Date
}

// Customer types
export type CustomerType = 'GOVERNMENT' | 'PRIVATE' | 'CLINIC'

export interface Customer {
  id: string
  name: string
  type: CustomerType
  registrationNumber?: string
  taxId?: string
  address?: string
  city?: string
  country: string
  primaryContact?: string
  email?: string
  phone?: string
  paymentTerms?: string
  creditLimit?: number
  currentBalance: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Expense types
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'

export interface Expense {
  id: string
  expenseNumber: string
  category: string
  subCategory?: string
  description: string
  amount: number
  currency: string
  expenseDate: Date
  paymentMethod?: string
  vendorId?: string
  budgetCategoryId?: string
  receiptUrl?: string
  status: ExpenseStatus
  createdById?: string
  approvedById?: string
  approvedDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}
