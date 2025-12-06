'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertTriangle
} from 'lucide-react'

interface BudgetReport {
  id: string
  name: string
  type: string
  fiscalYear: number
  totalAmount: number
  spentAmount: number
  committedAmount: number
  availableAmount: number
  consumptionPercentage: number
  status: string
  department?: string
  categories?: {
    name: string
    allocated: number
    spent: number
    percentage: number
  }[]
}

interface ReportStats {
  totalBudget: number
  totalSpent: number
  totalCommitted: number
  totalAvailable: number
  overallConsumption: number
  budgetsAtRisk: number
  onTrack: number
  underBudget: number
}

export default function BudgetReportsPage() {
  const [budgets, setBudgets] = useState<BudgetReport[]>([])
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const [reportType, setReportType] = useState('summary')

  useEffect(() => {
    fetchBudgetData()
  }, [fiscalYear])

  const fetchBudgetData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/budgets?fiscalYear=${fiscalYear}&pageSize=100`)
      if (response.ok) {
        const data = await response.json()
        const budgetList = data.budgets || data.data || []
        
        // Calculate report data
        const reportData: BudgetReport[] = budgetList.map((budget: any) => {
          const spent = Number(budget.spentAmount) || 0
          const committed = Number(budget.committedAmount) || 0
          const total = Number(budget.totalAmount) || 0
          const available = total - spent - committed
          const consumption = total > 0 ? (spent / total) * 100 : 0
          
          return {
            id: budget.id,
            name: budget.name,
            type: budget.type,
            fiscalYear: budget.fiscalYear,
            totalAmount: total,
            spentAmount: spent,
            committedAmount: committed,
            availableAmount: available,
            consumptionPercentage: consumption,
            status: budget.status,
            department: budget.department,
            categories: budget.categories?.map((cat: any) => ({
              name: cat.name,
              allocated: Number(cat.allocatedAmount) || 0,
              spent: Number(cat.spentAmount) || 0,
              percentage: cat.allocatedAmount > 0 ? (cat.spentAmount / cat.allocatedAmount) * 100 : 0
            }))
          }
        })
        
        setBudgets(reportData)
        
        // Calculate overall stats
        const totalBudget = reportData.reduce((sum, b) => sum + b.totalAmount, 0)
        const totalSpent = reportData.reduce((sum, b) => sum + b.spentAmount, 0)
        const totalCommitted = reportData.reduce((sum, b) => sum + b.committedAmount, 0)
        
        setStats({
          totalBudget,
          totalSpent,
          totalCommitted,
          totalAvailable: totalBudget - totalSpent - totalCommitted,
          overallConsumption: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
          budgetsAtRisk: reportData.filter(b => b.consumptionPercentage > 90).length,
          onTrack: reportData.filter(b => b.consumptionPercentage >= 50 && b.consumptionPercentage <= 90).length,
          underBudget: reportData.filter(b => b.consumptionPercentage < 50).length
        })
      }
    } catch (error) {
      console.error('Failed to fetch budget data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (percentage: number) => {
    if (percentage > 90) return 'text-red-600 bg-red-100'
    if (percentage > 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const exportReport = () => {
    // Simple CSV export
    const headers = ['Budget Name', 'Type', 'Department', 'Total', 'Spent', 'Available', 'Consumption %']
    const rows = budgets.map(b => [
      b.name,
      b.type,
      b.department || '',
      b.totalAmount,
      b.spentAmount,
      b.availableAmount,
      b.consumptionPercentage.toFixed(1)
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-report-${fiscalYear}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
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
                <BarChart3 className="h-7 w-7 text-blue-600" />
                Budget Reports
              </h1>
              <p className="text-gray-600 mt-1">Financial analysis and budget performance reports</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>FY {year}</option>
                ))}
              </select>
              <button 
                onClick={fetchBudgetData}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button 
                onClick={exportReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalBudget)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalSpent)}</p>
                  <p className="text-xs text-gray-500">{stats.overallConsumption.toFixed(1)}% consumed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.totalAvailable)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">At Risk</p>
                  <p className="text-xl font-bold text-red-600">{stats.budgetsAtRisk}</p>
                  <p className="text-xs text-gray-500">&gt;90% consumed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Type Tabs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="border-b px-4">
            <div className="flex gap-4">
              {['summary', 'by-department', 'by-category', 'variance'].map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    reportType === type
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Summary View */}
            {reportType === 'summary' && (
              <div className="space-y-4">
                {budgets.map((budget) => (
                  <div key={budget.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{budget.name}</h3>
                        <p className="text-sm text-gray-500">{budget.department || budget.type}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(budget.consumptionPercentage)}`}>
                        {budget.consumptionPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          budget.consumptionPercentage > 90 ? 'bg-red-500' :
                          budget.consumptionPercentage > 75 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budget.consumptionPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-gray-500">
                      <span>Spent: {formatCurrency(budget.spentAmount)}</span>
                      <span>Budget: {formatCurrency(budget.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* By Department View */}
            {reportType === 'by-department' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Department</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Budgets</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Allocated</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Spent</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Available</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(
                      budgets.reduce((acc, b) => {
                        const dept = b.department || 'Unassigned'
                        if (!acc[dept]) acc[dept] = { count: 0, total: 0, spent: 0 }
                        acc[dept].count++
                        acc[dept].total += b.totalAmount
                        acc[dept].spent += b.spentAmount
                        return acc
                      }, {} as Record<string, { count: number; total: number; spent: number }>)
                    ).map(([dept, data]) => (
                      <tr key={dept} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{dept}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{data.count}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(data.total)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(data.spent)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(data.total - data.spent)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor((data.spent / data.total) * 100)}`}>
                            {((data.spent / data.total) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Variance Analysis */}
            {reportType === 'variance' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Budgets with significant variance from planned spending
                </p>
                {budgets
                  .filter(b => Math.abs(b.consumptionPercentage - 50) > 25)
                  .sort((a, b) => b.consumptionPercentage - a.consumptionPercentage)
                  .map((budget) => {
                    const isOver = budget.consumptionPercentage > 75
                    return (
                      <div key={budget.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        {isOver ? (
                          <ArrowUpRight className="h-6 w-6 text-red-500" />
                        ) : (
                          <ArrowDownRight className="h-6 w-6 text-blue-500" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{budget.name}</h4>
                          <p className="text-sm text-gray-500">
                            {isOver ? 'Over budget pace' : 'Under budget pace'} - 
                            {isOver ? ' may exceed allocation' : ' potential savings'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isOver ? 'text-red-600' : 'text-blue-600'}`}>
                            {budget.consumptionPercentage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(budget.availableAmount)} remaining
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* By Category */}
            {reportType === 'by-category' && (
              <div className="text-center py-8 text-gray-500">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Category breakdown available for budgets with defined categories</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
