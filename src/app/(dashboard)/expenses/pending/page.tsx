'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar
} from 'lucide-react'

interface PendingExpense {
  id: string
  expenseNumber: string
  description: string
  amount: number
  currency: string
  category: string
  expenseDate: string
  createdBy: {
    id: string
    fullName: string
    email: string
  }
  budgetCategory?: {
    name: string
  }
  notes?: string
  createdAt: string
  status: string
}

interface Stats {
  total: number
  totalAmount: number
  urgent: number
  thisWeek: number
}

export default function PendingExpensesPage() {
  const [expenses, setExpenses] = useState<PendingExpense[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedExpense, setSelectedExpense] = useState<PendingExpense | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPendingExpenses()
  }, [search])

  const fetchPendingExpenses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ status: 'PENDING' })
      if (search) params.append('search', search)

      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        const expenseList = data.data || data.expenses || []
        setExpenses(expenseList)
        
        // Calculate stats
        const totalAmount = expenseList.reduce((sum: number, e: PendingExpense) => sum + Number(e.amount), 0)
        const urgent = expenseList.filter((e: PendingExpense) => Number(e.amount) > 5000).length
        const thisWeek = expenseList.filter((e: PendingExpense) => {
          const created = new Date(e.createdAt)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return created > weekAgo
        }).length
        
        setStats({
          total: expenseList.length,
          totalAmount,
          urgent,
          thisWeek
        })
      }
    } catch (error) {
      console.error('Failed to fetch pending expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (approved: boolean) => {
    if (!selectedExpense) return
    
    setProcessing(true)
    try {
      const response = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approved ? 'APPROVED' : 'REJECTED',
          notes: approvalNotes
        })
      })
      
      if (response.ok) {
        setShowApprovalDialog(false)
        setSelectedExpense(null)
        setApprovalNotes('')
        fetchPendingExpenses()
      }
    } catch (error) {
      console.error('Failed to process approval:', error)
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number, currency = 'KWD') => {
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-7 w-7 text-yellow-600" />
                Pending Approvals
              </h1>
              <p className="text-gray-600 mt-1">Review and approve expense submissions</p>
            </div>
            <Link 
              href="/expenses"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Expenses →
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">High Value</p>
                  <p className="text-xl font-bold text-red-600">{stats.urgent}</p>
                  <p className="text-xs text-gray-500">&gt;5,000 KWD</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-xl font-bold text-green-600">{stats.thisWeek}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description or submitter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>

        {/* Pending List */}
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">All caught up!</h3>
              <p className="text-gray-500 mt-2">No pending expenses require your approval</p>
            </div>
          ) : (
            expenses.map((expense) => (
              <div 
                key={expense.id}
                className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Receipt className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">{expense.expenseNumber}</code>
                      <span className="text-sm text-gray-500">{expense.category}</span>
                      {Number(expense.amount) > 5000 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          High Value
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{expense.description}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>Submitted by: {expense.createdBy?.fullName || 'Unknown'}</span>
                      <span>•</span>
                      <span>{formatDate(expense.expenseDate)}</span>
                      {expense.budgetCategory && (
                        <>
                          <span>•</span>
                          <span>Budget: {expense.budgetCategory.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => {
                          setSelectedExpense(expense)
                          setShowApprovalDialog(true)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedExpense(expense)
                          handleApproval(true)
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Approve"
                      >
                        <ThumbsUp className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedExpense(expense)
                          setShowApprovalDialog(true)
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Reject"
                      >
                        <ThumbsDown className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Review Expense</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Expense Number</p>
                <p className="font-medium">{selectedExpense.expenseNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium">{selectedExpense.description}</p>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-bold text-xl">{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{selectedExpense.category}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted By</p>
                <p className="font-medium">{selectedExpense.createdBy?.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Add any notes for this decision..."
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApprovalDialog(false)
                  setSelectedExpense(null)
                  setApprovalNotes('')
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproval(false)}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleApproval(true)}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
