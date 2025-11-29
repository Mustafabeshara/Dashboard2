/**
 * Budget List Page
 */
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDate, getBudgetStatusColor, calculatePercentage } from '@/lib/utils'
import type { Budget, BudgetStatus, BudgetType } from '@/types'

// Sample budget data
const sampleBudgets: (Budget & { spentAmount: number })[] = [
  {
    id: '1',
    name: 'FY 2024 Master Budget',
    fiscalYear: 2024,
    type: 'MASTER',
    status: 'ACTIVE',
    currency: 'KWD',
    totalAmount: 2500000,
    spentAmount: 1875000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Sales Department Budget',
    fiscalYear: 2024,
    type: 'DEPARTMENT',
    department: 'Sales',
    status: 'ACTIVE',
    currency: 'KWD',
    totalAmount: 800000,
    spentAmount: 640000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    name: 'Q1 Marketing Campaign',
    fiscalYear: 2024,
    type: 'PROJECT',
    department: 'Marketing',
    status: 'ACTIVE',
    currency: 'KWD',
    totalAmount: 150000,
    spentAmount: 135000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    createdAt: new Date('2023-12-20'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '4',
    name: 'MOH Cardiac Tender Budget',
    fiscalYear: 2024,
    type: 'TENDER',
    status: 'PENDING',
    currency: 'KWD',
    totalAmount: 450000,
    spentAmount: 0,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-06-30'),
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: '5',
    name: 'Operations Department Budget',
    fiscalYear: 2024,
    type: 'DEPARTMENT',
    department: 'Operations',
    status: 'ACTIVE',
    currency: 'KWD',
    totalAmount: 600000,
    spentAmount: 420000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '6',
    name: 'FY 2023 Master Budget',
    fiscalYear: 2023,
    type: 'MASTER',
    status: 'CLOSED',
    currency: 'KWD',
    totalAmount: 2200000,
    spentAmount: 2100000,
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
    createdAt: new Date('2022-12-01'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: '7',
    name: 'Warehouse Expansion Project',
    fiscalYear: 2024,
    type: 'PROJECT',
    department: 'Warehouse',
    status: 'DRAFT',
    currency: 'KWD',
    totalAmount: 350000,
    spentAmount: 0,
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-09-30'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
]

const statusOptions: { value: BudgetStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
]

const typeOptions: { value: BudgetType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'MASTER', label: 'Master Budget' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'TENDER', label: 'Tender' },
]

const yearOptions = [
  { value: 'ALL', label: 'All Years' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
]

function getStatusBadge(status: BudgetStatus) {
  const variants: Record<BudgetStatus, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; icon: React.ReactNode }> = {
    DRAFT: { variant: 'secondary', icon: <Edit className="h-3 w-3 mr-1" /> },
    PENDING: { variant: 'warning', icon: <Clock className="h-3 w-3 mr-1" /> },
    APPROVED: { variant: 'success', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    ACTIVE: { variant: 'success', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    CLOSED: { variant: 'secondary', icon: <XCircle className="h-3 w-3 mr-1" /> },
    REJECTED: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
  }

  const config = variants[status]
  return (
    <Badge variant={config.variant}>
      {config.icon}
      {status}
    </Badge>
  )
}

function getTypeBadge(type: BudgetType) {
  const colors: Record<BudgetType, string> = {
    MASTER: 'bg-purple-100 text-purple-700',
    DEPARTMENT: 'bg-blue-100 text-blue-700',
    PROJECT: 'bg-green-100 text-green-700',
    TENDER: 'bg-orange-100 text-orange-700',
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
      {type}
    </span>
  )
}

export default function BudgetsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<BudgetType | 'ALL'>('ALL')
  const [yearFilter, setYearFilter] = useState<string>('ALL')

  const filteredBudgets = useMemo(() => {
    return sampleBudgets.filter((budget) => {
      const matchesSearch =
        search === '' ||
        budget.name.toLowerCase().includes(search.toLowerCase()) ||
        budget.department?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'ALL' || budget.status === statusFilter
      const matchesType = typeFilter === 'ALL' || budget.type === typeFilter
      const matchesYear =
        yearFilter === 'ALL' || budget.fiscalYear.toString() === yearFilter

      return matchesSearch && matchesStatus && matchesType && matchesYear
    })
  }, [search, statusFilter, typeFilter, yearFilter])

  const totalBudget = filteredBudgets.reduce((sum, b) => sum + b.totalAmount, 0)
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + b.spentAmount, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-gray-500">Manage and track your budgets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/budgets/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Budgets</div>
            <div className="text-2xl font-bold">{filteredBudgets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Allocated</div>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Spent</div>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {calculatePercentage(totalSpent, totalBudget).toFixed(1)}% consumed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search budgets..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BudgetStatus | 'ALL')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BudgetType | 'ALL')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Filter className="h-8 w-8 mb-2" />
                      <p>No budgets found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBudgets.map((budget) => {
                  const percentage = calculatePercentage(budget.spentAmount, budget.totalAmount)
                  const statusColor = getBudgetStatusColor(percentage)

                  return (
                    <TableRow key={budget.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Link
                          href={`/budgets/${budget.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {budget.name}
                        </Link>
                        {budget.department && (
                          <p className="text-xs text-gray-500">{budget.department}</p>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(budget.type)}</TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(budget.startDate)}</p>
                          <p className="text-gray-500">to {formatDate(budget.endDate)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(budget.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(budget.spentAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={statusColor.color}>{percentage.toFixed(0)}%</span>
                          </div>
                          <Progress
                            value={Math.min(percentage, 100)}
                            className="h-2"
                            indicatorClassName={
                              percentage > 100
                                ? 'bg-red-500'
                                : percentage > 90
                                ? 'bg-orange-500'
                                : percentage > 80
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Budget
                            </DropdownMenuItem>
                            {budget.status === 'DRAFT' && (
                              <DropdownMenuItem>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Submit for Approval
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
