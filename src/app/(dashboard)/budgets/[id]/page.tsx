'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building,
  FileText,
  PlusCircle,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { format } from 'date-fns'

interface Budget {
  id: string
  name: string
  description?: string
  type: string
  status: string
  fiscalYear: number
  startDate: string
  endDate: string
  totalAmount: number
  spentAmount: number
  availableAmount: number
  department?: { id: string; name: string }
  createdBy?: { id: string; name: string; email: string }
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: string
  status: string
  date: string
  category?: { name: string }
  createdBy?: { name: string }
}

interface BudgetCategory {
  id: string
  name: string
  allocatedAmount: number
  spentAmount: number
}

export default function BudgetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const budgetId = params.id as string

  const [budget, setBudget] = useState<Budget | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBudget = useCallback(async () => {
    try {
      const response = await fetch(`/api/budgets/${budgetId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError('Budget not found')
          return
        }
        throw new Error('Failed to fetch budget')
      }
      const data = await response.json()
      setBudget(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budget')
    }
  }, [budgetId])

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`/api/budgets/${budgetId}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    }
  }, [budgetId])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`/api/budgets/${budgetId}/categories`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [budgetId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchBudget(), fetchTransactions(), fetchCategories()])
      setLoading(false)
    }
    loadData()
  }, [fetchBudget, fetchTransactions, fetchCategories])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      ACTIVE: { variant: 'default', label: 'Active' },
      PENDING: { variant: 'secondary', label: 'Pending' },
      APPROVED: { variant: 'default', label: 'Approved' },
      CLOSED: { variant: 'outline', label: 'Closed' },
      EXCEEDED: { variant: 'destructive', label: 'Exceeded' },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      MASTER: 'bg-purple-100 text-purple-800',
      DEPARTMENT: 'bg-blue-100 text-blue-800',
      PROJECT: 'bg-green-100 text-green-800',
      TENDER: 'bg-orange-100 text-orange-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const consumptionPercentage = budget 
    ? Math.round((budget.spentAmount / budget.totalAmount) * 100) 
    : 0

  const getConsumptionColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 80) return 'text-orange-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !budget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Budget Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'The requested budget could not be found.'}</p>
            <Link href="/budgets">
              <Button>View All Budgets</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{budget.name}</h1>
              {getStatusBadge(budget.status)}
              {getTypeBadge(budget.type)}
            </div>
            {budget.description && (
              <p className="text-muted-foreground mt-1">{budget.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href={`/budgets/${budgetId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Fiscal Year {budget.fiscalYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.spentAmount)}</div>
            <p className={`text-xs ${getConsumptionColor(consumptionPercentage)}`}>
              {consumptionPercentage}% consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget.availableAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {100 - consumptionPercentage}% remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {format(new Date(budget.startDate), 'MMM d, yyyy')}
            </div>
            <p className="text-xs text-muted-foreground">
              to {format(new Date(budget.endDate), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Budget Consumption</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Spent: {formatCurrency(budget.spentAmount)}</span>
              <span className={getConsumptionColor(consumptionPercentage)}>{consumptionPercentage}%</span>
            </div>
            <Progress value={consumptionPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="text-orange-500">80% Warning</span>
              <span className="text-red-500">90% Critical</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            <FileText className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="categories">
            <BarChart3 className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="details">
            <Building className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>All transactions charged to this budget</CardDescription>
              </div>
              <Link href={`/expenses/create?budgetId=${budgetId}`}>
                <Button size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions recorded yet</p>
                  <p className="text-sm">Transactions will appear here when expenses are charged to this budget.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{transaction.category?.name || '-'}</TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === 'APPROVED' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{transaction.createdBy?.name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Budget Categories</CardTitle>
              <CardDescription>Breakdown by spending category</CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No categories defined</p>
                  <p className="text-sm">Add categories to track spending by type.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category) => {
                    const percentage = category.allocatedAmount > 0 
                      ? Math.round((category.spentAmount / category.allocatedAmount) * 100)
                      : 0
                    return (
                      <div key={category.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(category.spentAmount)} / {formatCurrency(category.allocatedAmount)}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Budget Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Budget Type</dt>
                  <dd className="mt-1">{getTypeBadge(budget.type)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                  <dd className="mt-1">{getStatusBadge(budget.status)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Fiscal Year</dt>
                  <dd className="mt-1 font-medium">{budget.fiscalYear}</dd>
                </div>
                {budget.department && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Department</dt>
                    <dd className="mt-1 font-medium">{budget.department.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                  <dd className="mt-1">{format(new Date(budget.startDate), 'MMMM d, yyyy')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">End Date</dt>
                  <dd className="mt-1">{format(new Date(budget.endDate), 'MMMM d, yyyy')}</dd>
                </div>
                {budget.createdBy && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Created By</dt>
                    <dd className="mt-1">{budget.createdBy.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                  <dd className="mt-1">{format(new Date(budget.createdAt), 'MMMM d, yyyy')}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
