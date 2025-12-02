/**
 * Budget List Page - Connected to API with AI Insights
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Brain,
  Sparkles,
  DollarSign,
  PieChart,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type BudgetStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'CLOSED' | 'REJECTED'
type BudgetType = 'MASTER' | 'DEPARTMENT' | 'PROJECT' | 'TENDER'

interface Budget {
  id: string
  name: string
  fiscalYear: number
  type: BudgetType
  department?: string
  status: BudgetStatus
  currency: string
  totalAmount: number
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  notes?: string
  categories?: {
    id: string
    name: string
    allocatedAmount: number
    spentAmount: number
  }[]
}

interface Stats {
  total: number
  active: number
  totalAllocated: number
  totalSpent: number
}

interface AIInsight {
  type: 'warning' | 'success' | 'info'
  title: string
  description: string
  action?: string
}

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
]

const typeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'MASTER', label: 'Master Budget' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'TENDER', label: 'Tender' },
]

function getStatusBadge(status: BudgetStatus) {
  const config: Record<BudgetStatus, { class: string; icon: React.ReactNode }> = {
    DRAFT: { class: 'bg-gray-100 text-gray-700', icon: <Edit className="h-3 w-3 mr-1" /> },
    PENDING: { class: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3 mr-1" /> },
    APPROVED: { class: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    ACTIVE: { class: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    CLOSED: { class: 'bg-gray-100 text-gray-600', icon: <XCircle className="h-3 w-3 mr-1" /> },
    REJECTED: { class: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3 mr-1" /> },
  }

  const { class: className, icon } = config[status]
  return (
    <Badge variant="outline" className={className}>
      {icon}
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

function formatCurrency(amount: number, currency = 'KWD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function calculatePercentage(spent: number, total: number) {
  if (total === 0) return 0
  return (spent / total) * 100
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [loadingAI, setLoadingAI] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    fiscalYear: new Date().getFullYear(),
    type: 'DEPARTMENT' as BudgetType,
    department: '',
    totalAmount: '',
    startDate: '',
    endDate: '',
    currency: 'KWD',
    notes: '',
  })

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter !== 'ALL') params.append('type', typeFilter)
      if (yearFilter !== 'ALL') params.append('fiscalYear', yearFilter)

      const response = await fetch(`/api/budgets?${params}`)
      const result = await response.json()

      const allBudgets = result.data || result.budgets || []
      setBudgets(allBudgets)

      const totalAllocated = allBudgets.reduce((sum: number, b: Budget) => sum + Number(b.totalAmount), 0)
      const totalSpent = allBudgets.reduce((sum: number, b: Budget) => {
        const spent = b.categories?.reduce((s, c) => s + Number(c.spentAmount || 0), 0) || 0
        return sum + spent
      }, 0)

      setStats({
        total: allBudgets.length,
        active: allBudgets.filter((b: Budget) => b.status === 'ACTIVE').length,
        totalAllocated,
        totalSpent,
      })
    } catch (error) {
      console.error('Error fetching budgets:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, yearFilter])

  const generateAIInsights = useCallback(async () => {
    setLoadingAI(true)
    const insights: AIInsight[] = []
    
    const activeBudgets = budgets.filter(b => b.status === 'ACTIVE')
    
    for (const budget of activeBudgets) {
      const spent = budget.categories?.reduce((s, c) => s + Number(c.spentAmount || 0), 0) || 0
      const percentage = calculatePercentage(spent, Number(budget.totalAmount))
      
      if (percentage > 90) {
        insights.push({
          type: 'warning',
          title: `${budget.name} Near Limit`,
          description: `This budget is ${percentage.toFixed(0)}% consumed. Consider reallocation.`,
          action: 'Review Budget',
        })
      } else if (percentage < 30 && new Date(budget.endDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) {
        insights.push({
          type: 'info',
          title: `${budget.name} Underutilized`,
          description: `Only ${percentage.toFixed(0)}% spent with end date approaching.`,
          action: 'Reallocate Funds',
        })
      }
    }

    if (insights.length === 0 && activeBudgets.length > 0) {
      insights.push({
        type: 'success',
        title: 'All Budgets Healthy',
        description: 'No concerns detected. All active budgets are within normal consumption rates.',
      })
    }

    setAiInsights(insights)
    setLoadingAI(false)
  }, [budgets])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  useEffect(() => {
    if (budgets.length > 0) {
      generateAIInsights()
    }
  }, [budgets, generateAIInsights])

  const handleCreate = async () => {
    if (!formData.name || !formData.totalAmount) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalAmount: parseFloat(formData.totalAmount),
          fiscalYear: parseInt(String(formData.fiscalYear)),
        }),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({ name: '', fiscalYear: new Date().getFullYear(), type: 'DEPARTMENT', department: '', totalAmount: '', startDate: '', endDate: '', currency: 'KWD', notes: '' })
        fetchBudgets()
      }
    } catch (error) {
      console.error('Error creating budget:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBudget) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/budgets/${selectedBudget.id}`, { method: 'DELETE' })
      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedBudget(null)
        fetchBudgets()
      }
    } catch (error) {
      console.error('Error deleting budget:', error)
    } finally {
      setSaving(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Status', 'Year', 'Allocated', 'Spent', 'Start Date', 'End Date']
    const rows = budgets.map(b => {
      const spent = b.categories?.reduce((s, c) => s + Number(c.spentAmount || 0), 0) || 0
      return [b.name, b.type, b.status, b.fiscalYear, b.totalAmount, spent, formatDate(b.startDate), formatDate(b.endDate)]
    })
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `budgets-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = [{ value: 'ALL', label: 'All Years' }, ...Array.from({ length: 5 }, (_, i) => ({ value: String(currentYear - i), label: String(currentYear - i) }))]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Budgets
          </h1>
          <p className="text-muted-foreground">Manage and track your financial budgets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />Create Budget</Button>
        </div>
      </div>

      {aiInsights.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />AI Budget Insights
              <Button variant="ghost" size="sm" onClick={generateAIInsights} disabled={loadingAI}>
                <RefreshCw className={`h-4 w-4 ${loadingAI ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {aiInsights.map((insight, i) => (
                <div key={i} className={`p-3 rounded-lg border ${insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : insight.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    {insight.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" /> : insight.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> : <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      {insight.action && <Button variant="link" size="sm" className="px-0 h-auto mt-1">{insight.action} →</Button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><PieChart className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Budgets</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{stats.active}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Total Allocated</p><p className="text-2xl font-bold">{formatCurrency(stats.totalAllocated)}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><TrendingDown className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Total Spent</p><p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p><p className="text-xs text-muted-foreground">{calculatePercentage(stats.totalSpent, stats.totalAllocated).toFixed(1)}% consumed</p></div></div></CardContent></Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search budgets..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{statusOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{typeOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select>
              <Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{yearOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No budgets found</h3>
              <p className="text-muted-foreground mt-2">Get started by creating your first budget</p>
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}><Plus className="mr-2 h-4 w-4" />Create Budget</Button>
            </div>
          ) : (
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
                {budgets.map((budget) => {
                  const spent = budget.categories?.reduce((s, c) => s + Number(c.spentAmount || 0), 0) || 0
                  const percentage = calculatePercentage(spent, Number(budget.totalAmount))
                  return (
                    <TableRow key={budget.id}>
                      <TableCell><Link href={`/budgets/${budget.id}`} className="font-medium text-blue-600 hover:underline">{budget.name}</Link>{budget.department && <p className="text-xs text-muted-foreground">{budget.department}</p>}</TableCell>
                      <TableCell>{getTypeBadge(budget.type)}</TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell><div className="text-sm"><p>{formatDate(budget.startDate)}</p><p className="text-muted-foreground">to {formatDate(budget.endDate)}</p></div></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(budget.totalAmount))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(spent)}</TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1"><span className={percentage > 100 ? 'text-red-600' : percentage > 90 ? 'text-orange-600' : percentage > 80 ? 'text-yellow-600' : 'text-green-600'}>{percentage.toFixed(0)}%</span></div>
                          <Progress value={Math.min(percentage, 100)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild><Link href={`/budgets/${budget.id}`}><Eye className="h-4 w-4 mr-2" />View Details</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/budgets/${budget.id}/edit`}><Edit className="h-4 w-4 mr-2" />Edit Budget</Link></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedBudget(budget); setShowDeleteDialog(true) }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create New Budget</DialogTitle><DialogDescription>Define a new budget for tracking financial allocations.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Budget Name *</Label><Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="FY 2025 Operations Budget" /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as BudgetType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MASTER">Master Budget</SelectItem><SelectItem value="DEPARTMENT">Department</SelectItem><SelectItem value="PROJECT">Project</SelectItem><SelectItem value="TENDER">Tender</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Fiscal Year</Label><Select value={String(formData.fiscalYear)} onValueChange={(v) => setFormData(prev => ({ ...prev, fiscalYear: parseInt(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 5 }, (_, i) => currentYear + 1 - i).map(year => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Total Amount *</Label><Input type="number" value={formData.totalAmount} onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))} placeholder="100000" /></div>
              <div className="space-y-2"><Label>Currency</Label><Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="KWD">KWD</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Department</Label><Input value={formData.department} onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))} placeholder="Sales, Operations" /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.name || !formData.totalAmount}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Budget</DialogTitle><DialogDescription>Are you sure? This action cannot be undone.</DialogDescription></DialogHeader>
          {selectedBudget && <div className="py-4"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="font-medium">{selectedBudget.name}</p><p className="text-sm text-muted-foreground">{selectedBudget.type} • {formatCurrency(Number(selectedBudget.totalAmount))}</p></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete Budget</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
