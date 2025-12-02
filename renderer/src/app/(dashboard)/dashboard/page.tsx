/**
 * Main Dashboard Page
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  FileText,
  Package,
  DollarSign,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'
import { formatCurrency, formatDate, getBudgetStatusColor } from '@/lib/utils'

// Sample dashboard data
const statsData = {
  totalBudget: 2500000,
  totalSpent: 1875000,
  totalCommitted: 312500,
  availableBudget: 312500,
  consumptionPercentage: 75,
  activeBudgets: 12,
  pendingApprovals: 8,
  alertsCount: 3,
}

const departmentBudgets = [
  { department: 'Sales', allocated: 800000, spent: 640000, percentage: 80 },
  { department: 'Operations', allocated: 600000, spent: 420000, percentage: 70 },
  { department: 'Marketing', allocated: 400000, spent: 360000, percentage: 90 },
  { department: 'Warehouse', allocated: 450000, spent: 315000, percentage: 70 },
  { department: 'Admin', allocated: 250000, spent: 140000, percentage: 56 },
]

const monthlyTrends = [
  { month: 'Jan', budget: 200000, actual: 185000 },
  { month: 'Feb', budget: 200000, actual: 195000 },
  { month: 'Mar', budget: 220000, actual: 210000 },
  { month: 'Apr', budget: 220000, actual: 235000 },
  { month: 'May', budget: 200000, actual: 190000 },
  { month: 'Jun', budget: 210000, actual: 220000 },
]

const categoryBreakdown = [
  { name: 'Operating Expenses', value: 45, color: '#3b82f6' },
  { name: 'Inventory Purchases', value: 25, color: '#10b981' },
  { name: 'Marketing', value: 15, color: '#f59e0b' },
  { name: 'Salaries', value: 10, color: '#6366f1' },
  { name: 'Others', value: 5, color: '#94a3b8' },
]

const recentTransactions = [
  {
    id: '1',
    description: 'Cardiac Equipment Purchase',
    category: 'Inventory',
    amount: 45000,
    status: 'APPROVED',
    date: new Date('2024-01-15'),
  },
  {
    id: '2',
    description: 'Trade Show Participation - Dubai',
    category: 'Marketing',
    amount: 12500,
    status: 'PENDING',
    date: new Date('2024-01-14'),
  },
  {
    id: '3',
    description: 'Office Supplies Q1',
    category: 'Admin',
    amount: 2800,
    status: 'APPROVED',
    date: new Date('2024-01-13'),
  },
  {
    id: '4',
    description: 'Warehouse Maintenance',
    category: 'Operations',
    amount: 8500,
    status: 'APPROVED',
    date: new Date('2024-01-12'),
  },
  {
    id: '5',
    description: 'Sales Team Training',
    category: 'Sales',
    amount: 15000,
    status: 'PENDING',
    date: new Date('2024-01-11'),
  },
]

const pendingApprovals = [
  {
    id: '1',
    description: 'Q1 Marketing Campaign',
    amount: 35000,
    requester: 'Ahmed Al-Salem',
    date: new Date('2024-01-15'),
  },
  {
    id: '2',
    description: 'Neurosurgery Equipment',
    amount: 85000,
    requester: 'Sara Mohammed',
    date: new Date('2024-01-14'),
  },
  {
    id: '3',
    description: 'Vehicle Maintenance',
    amount: 4500,
    requester: 'Khalid Hassan',
    date: new Date('2024-01-13'),
  },
]

const alerts = [
  {
    id: '1',
    type: 'THRESHOLD_90',
    message: 'Marketing Department budget is at 90% consumption',
    severity: 'HIGH',
  },
  {
    id: '2',
    type: 'THRESHOLD_80',
    message: 'Sales Department budget is at 80% consumption',
    severity: 'MEDIUM',
  },
  {
    id: '3',
    type: 'APPROVAL_PENDING',
    message: '8 transactions pending approval for more than 2 days',
    severity: 'LOW',
  },
]

const upcomingTenders = [
  {
    id: '1',
    title: 'MOH Cardiac Equipment Tender',
    deadline: new Date('2024-02-01'),
    value: 450000,
  },
  {
    id: '2',
    title: 'Neurosurgery Supplies - Mubarak Hospital',
    deadline: new Date('2024-02-15'),
    value: 280000,
  },
]

export default function DashboardPage() {
  const statusColor = getBudgetStatusColor(statsData.consumptionPercentage)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(statsData.totalBudget)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Badge variant="secondary">{statsData.activeBudgets} Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(statsData.totalSpent)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={statsData.consumptionPercentage}
                className="h-2"
                indicatorClassName={
                  statsData.consumptionPercentage > 90
                    ? 'bg-red-500'
                    : statsData.consumptionPercentage > 80
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                }
              />
              <p className="text-sm text-gray-500 mt-1">{statsData.consumptionPercentage}% of budget used</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-bold">{statsData.pendingApprovals}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <Link href="/budgets/approvals">
                <Button variant="link" className="p-0 h-auto text-sm">
                  View all <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Alerts</p>
                <p className="text-2xl font-bold">{statsData.alertsCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <Badge variant="destructive">2 High</Badge>
              <Badge variant="warning">1 Medium</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Health Gauge - Department Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Budget by Category</CardTitle>
            <CardDescription>Current fiscal year allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Budget vs. Actual</CardTitle>
            <CardDescription>Monthly comparison for current fiscal year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 1000}K`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Budget"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Actual"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Budgets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Department Budget Status</CardTitle>
          <CardDescription>Budget consumption by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentBudgets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={(value) => `${value / 1000}K`} />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="allocated" fill="#e2e8f0" name="Allocated" />
                <Bar dataKey="spent" fill="#3b82f6" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row - Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pending Approvals</CardTitle>
              <CardDescription>Items awaiting your approval</CardDescription>
            </div>
            <Link href="/budgets/approvals">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className="text-xs text-gray-500">
                      {item.requester} - {formatDate(item.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(item.amount)}</p>
                    <div className="flex space-x-2 mt-1">
                      <Button variant="success" size="sm" className="h-7 px-2">
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 px-2">
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card id="alerts">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active Alerts</CardTitle>
              <CardDescription>Budget and system notifications</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Manage Alerts
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'HIGH'
                      ? 'bg-red-50 border-red-500'
                      : alert.severity === 'MEDIUM'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle
                        className={`h-4 w-4 mt-0.5 ${
                          alert.severity === 'HIGH'
                            ? 'text-red-600'
                            : alert.severity === 'MEDIUM'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        <Badge
                          variant={
                            alert.severity === 'HIGH'
                              ? 'destructive'
                              : alert.severity === 'MEDIUM'
                              ? 'warning'
                              : 'info'
                          }
                          className="mt-1"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7">
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <CardDescription>Latest budget transactions</CardDescription>
          </div>
          <Link href="/budgets">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={transaction.status === 'APPROVED' ? 'success' : 'warning'}
                    >
                      {transaction.status === 'APPROVED' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{formatDate(transaction.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/budgets/create">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Wallet className="h-6 w-6 mb-2" />
                  <span>Create Budget</span>
                </Button>
              </Link>
              <Link href="/expenses/create">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <DollarSign className="h-6 w-6 mb-2" />
                  <span>Submit Expense</span>
                </Button>
              </Link>
              <Link href="/tenders/create">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>New Tender</span>
                </Button>
              </Link>
              <Link href="/budgets/reports">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Target className="h-6 w-6 mb-2" />
                  <span>View Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tenders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming Tender Deadlines</CardTitle>
              <CardDescription>Tenders requiring attention</CardDescription>
            </div>
            <Link href="/tenders">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTenders.map((tender) => (
                <div
                  key={tender.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tender.title}</p>
                      <p className="text-xs text-gray-500">
                        Deadline: {formatDate(tender.deadline)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(tender.value)}</p>
                    <Badge variant="outline" className="mt-1">
                      {Math.ceil(
                        (tender.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      )}{' '}
                      days left
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
