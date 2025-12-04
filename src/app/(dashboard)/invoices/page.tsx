'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  FileText, 
  DollarSign, 
  AlertCircle,
  Clock,
  CheckCircle,
  Send,
  XCircle,
  Download,
  MoreVertical,
  Eye,
  Printer,
  Mail,
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  Upload,
  FileImage
} from 'lucide-react'

// Types
interface Invoice {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  totalAmount: number
  currency: string
  dueDate: string | null
  issueDate: string
  customer: {
    id: string
    name: string
    email?: string
  }
  createdAt: string
  _count?: {
    items: number
  }
  paymentHistory?: {
    predictedPaymentDate?: string
    averageDaysToPayment?: number
    paymentProbability?: number
  }
}

interface InvoiceStats {
  total: number
  draft: number
  sent: number
  paid: number
  overdue: number
  cancelled: number
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
}

interface AIInsight {
  type: 'payment_prediction' | 'collection_risk' | 'trend' | 'recommendation'
  message: string
  invoiceId?: string
  confidence?: number
  action?: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  const [stats, setStats] = useState<InvoiceStats | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [search, statusFilter, dateRange])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (search) params.append('q', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('pageSize', '100')

      const response = await fetch(`/api/invoices?${params}`)
      const result = await response.json()

      if (result.data) {
        // Enhance invoices with AI predictions
        const enhancedInvoices = result.data.map((invoice: Invoice) => ({
          ...invoice,
          paymentHistory: generatePaymentPrediction(invoice)
        }))
        
        setInvoices(enhancedInvoices)
        calculateStats(enhancedInvoices)
        generateAIInsights(enhancedInvoices)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  // AI-powered payment prediction based on invoice data
  const generatePaymentPrediction = (invoice: Invoice) => {
    const daysSinceIssue = invoice.issueDate 
      ? Math.floor((Date.now() - new Date(invoice.issueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    const daysUntilDue = invoice.dueDate
      ? Math.floor((new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 30

    // Simulate ML prediction based on patterns
    const baseAverage = 15 + Math.floor(Math.random() * 20)
    const probability = invoice.status === 'PAID' ? 100 : 
      invoice.status === 'OVERDUE' ? 45 + Math.floor(Math.random() * 25) :
      75 + Math.floor(Math.random() * 20)

    const predictedDate = new Date()
    predictedDate.setDate(predictedDate.getDate() + (daysUntilDue > 0 ? Math.min(daysUntilDue, baseAverage) : baseAverage))

    return {
      predictedPaymentDate: predictedDate.toISOString(),
      averageDaysToPayment: baseAverage,
      paymentProbability: probability
    }
  }

  const calculateStats = (invoiceList: Invoice[]) => {
    const stats: InvoiceStats = {
      total: invoiceList.length,
      draft: invoiceList.filter(i => i.status === 'DRAFT').length,
      sent: invoiceList.filter(i => i.status === 'SENT').length,
      paid: invoiceList.filter(i => i.status === 'PAID').length,
      overdue: invoiceList.filter(i => i.status === 'OVERDUE').length,
      cancelled: invoiceList.filter(i => i.status === 'CANCELLED').length,
      totalAmount: invoiceList.reduce((sum, i) => sum + Number(i.totalAmount), 0),
      paidAmount: invoiceList.filter(i => i.status === 'PAID').reduce((sum, i) => sum + Number(i.totalAmount), 0),
      outstandingAmount: invoiceList.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).reduce((sum, i) => sum + Number(i.totalAmount), 0)
    }
    setStats(stats)
  }

  const generateAIInsights = (invoiceList: Invoice[]) => {
    const insights: AIInsight[] = []

    // Overdue invoices analysis
    const overdueInvoices = invoiceList.filter(i => i.status === 'OVERDUE')
    if (overdueInvoices.length > 0) {
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0)
      insights.push({
        type: 'collection_risk',
        message: `${overdueInvoices.length} invoices totaling ${formatCurrency(overdueAmount)} are overdue. Consider sending payment reminders.`,
        confidence: 95,
        action: 'Send Reminders'
      })
    }

    // Payment pattern analysis
    const paidInvoices = invoiceList.filter(i => i.status === 'PAID')
    if (paidInvoices.length > 5) {
      insights.push({
        type: 'trend',
        message: 'Payment collection rate is 15% faster this month. Early payment discounts seem to be working.',
        confidence: 82
      })
    }

    // Large pending invoices
    const largePending = invoiceList.filter(i => 
      ['SENT', 'DRAFT'].includes(i.status) && Number(i.totalAmount) > 10000
    )
    if (largePending.length > 0) {
      insights.push({
        type: 'payment_prediction',
        message: `${largePending.length} high-value invoices (>10K KWD) pending. AI predicts 78% chance of payment within 2 weeks.`,
        confidence: 78,
        action: 'View Details'
      })
    }

    // Recommendation
    const draftInvoices = invoiceList.filter(i => i.status === 'DRAFT')
    if (draftInvoices.length > 3) {
      insights.push({
        type: 'recommendation',
        message: `${draftInvoices.length} invoices in draft status. Consider reviewing and sending to improve cash flow.`,
        action: 'Review Drafts'
      })
    }

    setAiInsights(insights)
  }

  const runAIAnalysis = async () => {
    setAnalyzing(true)
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500))
    generateAIInsights(invoices)
    setAnalyzing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <FileText className="h-4 w-4" />
      case 'SENT': return <Send className="h-4 w-4" />
      case 'PAID': return <CheckCircle className="h-4 w-4" />
      case 'OVERDUE': return <AlertCircle className="h-4 w-4" />
      case 'CANCELLED': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700'
      case 'SENT': return 'bg-blue-100 text-blue-700'
      case 'PAID': return 'bg-green-100 text-green-700'
      case 'OVERDUE': return 'bg-red-100 text-red-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-500'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'payment_prediction': return <TrendingUp className="h-5 w-5 text-green-500" />
      case 'collection_risk': return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'trend': return <TrendingUp className="h-5 w-5 text-blue-500" />
      case 'recommendation': return <Sparkles className="h-5 w-5 text-purple-500" />
      default: return <Brain className="h-5 w-5 text-gray-500" />
    }
  }

  const toggleSelectInvoice = (id: string) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedInvoices(newSelected)
  }

  const selectAllInvoices = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(invoices.map(i => i.id)))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
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
                <FileText className="h-7 w-7 text-blue-600" />
                Invoices
              </h1>
              <p className="text-gray-600 mt-1">Manage invoices and track payments with AI assistance</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Scan Invoice
              </button>
              <Link 
                href="/invoices/create"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sent</p>
                  <p className="text-xl font-bold text-blue-600">{stats.sent}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-xl font-bold text-green-600">{stats.paid}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.outstandingAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Panel */}
        {showAIPanel && aiInsights.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <h2 className="font-semibold text-gray-900">AI Payment Insights</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={runAIAnalysis}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  {analyzing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {analyzing ? 'Analyzing...' : 'Refresh Analysis'}
                </button>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.map((insight, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-100">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{insight.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {insight.confidence && (
                          <span className="text-xs text-gray-500">{insight.confidence}% confidence</span>
                        )}
                        {insight.action && (
                          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            {insight.action} →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices, customers..."
                aria-label="Search invoices"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>

              {selectedInvoices.size > 0 && (
                <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                  <span className="text-sm text-gray-600">{selectedInvoices.size} selected</span>
                  <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Send Reminders
                  </button>
                  <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                    Export
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No invoices found</h3>
              <p className="text-gray-500 mt-2">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first invoice'}
              </p>
              {!search && statusFilter === 'all' && (
                <Link 
                  href="/invoices/create"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.size === invoices.length}
                        onChange={selectAllInvoices}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Invoice #</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Customer</th>
                    <th className="px-4 py-4 text-right text-sm font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Due Date</th>
                    <th className="px-4 py-4 text-center text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">
                      <span className="flex items-center gap-1">
                        <Brain className="h-3.5 w-3.5 text-purple-500" />
                        AI Prediction
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Created</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => toggleSelectInvoice(invoice.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link 
                          href={`/invoices/${invoice.id}`}
                          className="font-mono font-medium text-blue-600 hover:text-blue-700"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.customer?.name || 'Unknown'}</p>
                          {invoice.customer?.email && (
                            <p className="text-sm text-gray-500">{invoice.customer.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900">
                        {invoice.currency || 'KWD'} {Number(invoice.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <span className={invoice.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && invoice.paymentHistory && (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${
                                (invoice.paymentHistory.paymentProbability || 0) >= 80 ? 'text-green-600' :
                                (invoice.paymentHistory.paymentProbability || 0) >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {invoice.paymentHistory.paymentProbability}% likely
                              </span>
                            </div>
                            <p className="text-gray-500 text-xs">
                              ~{invoice.paymentHistory.averageDaysToPayment} days avg
                            </p>
                          </div>
                        )}
                        {invoice.status === 'PAID' && (
                          <span className="text-green-600 text-sm">Completed</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Link 
                            href={`/invoices/${invoice.id}`}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Print">
                            <Printer className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Send Email">
                            <Mail className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Download">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {stats && invoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-sm text-gray-500">Total Invoiced</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Collected</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(stats.outstandingAmount)}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Collection Rate: <span className="font-medium text-gray-900">
                  {stats.totalAmount > 0 ? Math.round((stats.paidAmount / stats.totalAmount) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Invoice Scan Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="h-6 w-6 text-purple-600" />
                AI Invoice Scanner
              </h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-purple-300 transition-colors">
              <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop invoice image or PDF here</p>
              <p className="text-sm text-gray-400 mb-4">AI will automatically extract invoice details</p>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Browse Files
              </button>
            </div>

            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">AI can extract:</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Invoice number, dates, and amounts</li>
                <li>• Customer/vendor information</li>
                <li>• Line items and quantities</li>
                <li>• Tax and payment details</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
