'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Receipt,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  Download,
  FileText,
  Eye,
  Check,
  X,
} from 'lucide-react'
import { format } from 'date-fns'

interface Expense {
  id: string
  expenseNumber: string
  description: string
  amount: number
  currency: string
  category: string
  subCategory: string | null
  expenseDate: string
  paymentMethod: string | null
  vendorId: string | null
  vendor: { name: string } | null
  budgetCategoryId: string | null
  budgetCategory: { id: string; name: string } | null
  receiptUrl: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  createdBy: { id: string; fullName: string } | null
  approvedBy: { id: string; fullName: string } | null
  approvedDate: string | null
  notes: string | null
  createdAt: string
}

interface BudgetCategory {
  id: string
  name: string
  allocatedAmount: number
  spentAmount: number
}

interface Stats {
  total: number
  pending: number
  approved: number
  totalAmount: number
  thisMonth: number
}

const EXPENSE_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'TRAVEL', label: 'Travel & Transportation' },
  { value: 'OFFICE', label: 'Office Supplies' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'MARKETING', label: 'Marketing & Advertising' },
  { value: 'EQUIPMENT', label: 'Equipment & Maintenance' },
  { value: 'PROFESSIONAL', label: 'Professional Services' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'TAXES', label: 'Taxes & Fees' },
  { value: 'OTHER', label: 'Other' },
]

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'PETTY_CASH', label: 'Petty Cash' },
]

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-700 border-green-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    PAID: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  
  const icons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-3 h-3" />,
    APPROVED: <CheckCircle className="w-3 h-3" />,
    REJECTED: <XCircle className="w-3 h-3" />,
    PAID: <DollarSign className="w-3 h-3" />,
  }

  return (
    <Badge variant="outline" className={`${colors[status]} flex items-center gap-1`}>
      {icons[status]}
      {status}
    </Badge>
  )
}

export default function ExpensesPage() {
  const { data: session } = useSession()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'KWD',
    category: 'GENERAL',
    subCategory: '',
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    budgetCategoryId: '',
    notes: '',
  })

  // User permissions
  const userRole = session?.user?.role
  const canCreate = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER', 'SALES', 'WAREHOUSE', 'FINANCE'].includes(userRole || '')
  const canApprove = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER', 'MANAGER'].includes(userRole || '')
  const canDelete = ['ADMIN', 'CEO', 'CFO'].includes(userRole || '')

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter)
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      const response = await fetch(`/api/expenses?${params}`)
      const result = await response.json()

      if (result.data) {
        setExpenses(result.data)
        
        // Calculate stats
        const all = result.data
        const pending = all.filter((e: Expense) => e.status === 'PENDING').length
        const approved = all.filter((e: Expense) => e.status === 'APPROVED').length
        const totalAmount = all.reduce((sum: number, e: Expense) => sum + Number(e.amount), 0)
        const thisMonth = all.filter((e: Expense) => {
          const expDate = new Date(e.expenseDate)
          const now = new Date()
          return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
        }).reduce((sum: number, e: Expense) => sum + Number(e.amount), 0)
        
        setStats({ total: all.length, pending, approved, totalAmount, thisMonth })
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, categoryFilter, dateRange])

  const fetchBudgetCategories = async () => {
    try {
      const response = await fetch('/api/budgets/categories')
      const result = await response.json()
      if (result.data) {
        setBudgetCategories(result.data)
      }
    } catch (error) {
      console.error('Error fetching budget categories:', error)
    }
  }

  useEffect(() => {
    fetchExpenses()
    fetchBudgetCategories()
  }, [fetchExpenses])

  const handleCreate = async () => {
    if (!formData.description || !formData.amount) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          expenseDate: new Date(formData.expenseDate).toISOString(),
        }),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        resetForm()
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error creating expense:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedExpense || !formData.description || !formData.amount) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          expenseDate: new Date(formData.expenseDate).toISOString(),
        }),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setSelectedExpense(null)
        resetForm()
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error updating expense:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (approved: boolean) => {
    if (!selectedExpense) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approved ? 'APPROVED' : 'REJECTED',
        }),
      })

      if (response.ok) {
        setShowApproveDialog(false)
        setSelectedExpense(null)
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error approving expense:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedExpense) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedExpense(null)
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      currency: 'KWD',
      category: 'GENERAL',
      subCategory: '',
      expenseDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
      budgetCategoryId: '',
      notes: '',
    })
  }

  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormData({
      description: expense.description,
      amount: String(expense.amount),
      currency: expense.currency,
      category: expense.category,
      subCategory: expense.subCategory || '',
      expenseDate: format(new Date(expense.expenseDate), 'yyyy-MM-dd'),
      paymentMethod: expense.paymentMethod || '',
      budgetCategoryId: expense.budgetCategoryId || '',
      notes: expense.notes || '',
    })
    setShowEditDialog(true)
  }

  const exportToCSV = () => {
    const headers = ['Number', 'Description', 'Amount', 'Currency', 'Category', 'Date', 'Status', 'Created By']
    const rows = expenses.map(e => [
      e.expenseNumber,
      e.description,
      e.amount,
      e.currency,
      e.category,
      format(new Date(e.expenseDate), 'yyyy-MM-dd'),
      e.status,
      e.createdBy?.fullName || '-',
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Expenses
          </h1>
          <p className="text-muted-foreground">
            Track and manage company expenses with approval workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreate && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Amount
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KWD {stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                This Month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                KWD {stats.thisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No expenses found</h3>
              <p className="text-muted-foreground mt-2">
                {search || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first expense'}
              </p>
              {canCreate && !search && statusFilter === 'all' && (
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-mono font-medium">
                      {expense.expenseNumber}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">{expense.description}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.currency} {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.expenseDate), 'PP')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={expense.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {expense.createdBy?.fullName || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(expense)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {canApprove && expense.status === 'PENDING' && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedExpense(expense)
                                setShowApproveDialog(true)
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Review & Approve
                            </DropdownMenuItem>
                          )}
                          {expense.receiptUrl && (
                            <DropdownMenuItem asChild>
                              <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="mr-2 h-4 w-4" />
                                View Receipt
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canDelete && (
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setSelectedExpense(expense)
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setShowEditDialog(false)
          setSelectedExpense(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Edit Expense' : 'Add New Expense'}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog 
                ? 'Update the expense details below'
                : 'Fill in the expense details. Fields marked with * are required.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Expense description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KWD">KWD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Date *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, paymentMethod: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(pm => (
                      <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetCategory">Budget Category</Label>
                <Select 
                  value={formData.budgetCategoryId} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, budgetCategoryId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to budget (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {budgetCategories.map(bc => (
                      <SelectItem key={bc.id} value={bc.id}>{bc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or details..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false)
                setShowEditDialog(false)
                setSelectedExpense(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={showEditDialog ? handleUpdate : handleCreate} 
              disabled={saving || !formData.description || !formData.amount}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {showEditDialog ? 'Save Changes' : 'Create Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Expense</DialogTitle>
            <DialogDescription>
              Review the expense details and approve or reject it.
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number:</span>
                  <span className="font-mono">{selectedExpense.expenseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span>{selectedExpense.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold">
                    {selectedExpense.currency} {Number(selectedExpense.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{format(new Date(selectedExpense.expenseDate), 'PP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted by:</span>
                  <span>{selectedExpense.createdBy?.fullName || '-'}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleApprove(false)}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
              Reject
            </Button>
            <Button 
              onClick={() => handleApprove(true)}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-medium">{selectedExpense.expenseNumber}</p>
                <p className="text-sm text-muted-foreground">{selectedExpense.description}</p>
                <p className="text-sm font-medium mt-2">
                  {selectedExpense.currency} {Number(selectedExpense.amount).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
