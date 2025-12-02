/**
 * Expense Detail Page
 * View and manage individual expense with approval workflow
 */

'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface ExpenseDetailProps {
  params: Promise<{ id: string }>
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, color: 'text-yellow-600' },
  APPROVED: { label: 'Approved', variant: 'default' as const, color: 'text-green-600' },
  REJECTED: { label: 'Rejected', variant: 'destructive' as const, color: 'text-red-600' },
}

// Force dynamic rendering for client components
export const dynamic = 'force-dynamic'

export default function ExpenseDetailPage({ params }: ExpenseDetailProps) {
  const { id } = use(params)
  const router = useRouter()
  type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
  const [expense, setExpense] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExpense()
  }, [id])

  const fetchExpense = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/expenses/${id}`)
      const result = await response.json()

      if (result.data) {
        setExpense(result.data)
      }
    } catch (error) {
      console.error('Error fetching expense:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/expenses')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })

      if (response.ok) {
        fetchExpense()
      }
    } catch (error) {
      console.error('Error approving expense:', error)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this expense?')) {
      return
    }

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })

      if (response.ok) {
        fetchExpense()
      }
    } catch (error) {
      console.error('Error rejecting expense:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Not Found</CardTitle>
            <CardDescription>The requested expense could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/expenses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Expenses
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expenses">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {expense.description}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusConfig[expense.status as ExpenseStatus].variant}>
                {statusConfig[expense.status as ExpenseStatus].label}
              
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {expense.status === 'PENDING' && (
            <>
              <Button onClick={handleApprove}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" asChild>
            <Link href={`/expenses/${id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Details */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">
                    {expense.currency} {Number(expense.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{expense.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expense Date</p>
                  <p className="font-medium">
                    {format(new Date(expense.expenseDate), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{expense.paymentMethod || 'N/A'}</p>
                </div>
              </div>

              {expense.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">{expense.notes}</p>
                </div>
              )}

              {expense.receiptUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Receipt</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      View Receipt
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Information */}
          {expense.budget && (
            <Card>
              <CardHeader>
                <CardTitle>Budget Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget</span>
                    <Link 
                      href={`/budgets/${expense.budget.id}`}
                      className="font-medium hover:underline"
                    >
                      {expense.budget.name}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget Category</span>
                    <span className="font-medium">{expense.budget.category}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval History */}
          {(expense.approvedBy || expense.rejectedBy) && (
            <Card>
              <CardHeader>
                <CardTitle>Approval History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expense.approvedBy && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Approved by {expense.approvedBy.name}</span>
                      {expense.approvedAt && (
                        <span className="text-sm text-muted-foreground">
                          on {format(new Date(expense.approvedAt), 'PPP')}
                        </span>
                      )}
                    </div>
                  )}
                  {expense.rejectedBy && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Rejected by {expense.rejectedBy.name}</span>
                      {expense.rejectedAt && (
                        <span className="text-sm text-muted-foreground">
                          on {format(new Date(expense.rejectedAt), 'PPP')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${statusConfig[expense.status as ExpenseStatus].color}`}>
                  {expense.status === 'APPROVED' && <CheckCircle />}
                  {expense.status === 'REJECTED' && <XCircle />}
                  {expense.status === 'PENDING' && <FileText />}
                </div>
                <div>
                  <p className="font-semibold">{statusConfig[expense.status as ExpenseStatus].label}</p>
                  <p className="text-sm text-muted-foreground">
                    {expense.status === 'PENDING' && 'Awaiting approval'}
                    {expense.status === 'APPROVED' && 'Expense approved'}
                    {expense.status === 'REJECTED' && 'Expense rejected'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(expense.createdAt), 'PPP')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(expense.updatedAt), 'PPP')}
                </p>
              </div>
              {expense.submittedBy && (
                <div>
                  <p className="text-muted-foreground">Submitted By</p>
                  <p className="font-medium">{expense.submittedBy.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
