/**
 * Budget Approvals Queue Page
 */
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  Filter,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate, getApprovalLevel } from '@/lib/utils'
import type { TransactionStatus } from '@/types'

// Sample pending approvals
const pendingApprovals = [
  {
    id: '1',
    description: 'Q1 Marketing Campaign - Digital Ads',
    category: 'Marketing & Advertising',
    categoryCode: 'MA-0001',
    amount: 35000,
    requester: { name: 'Ahmed Al-Salem', department: 'Marketing', email: 'ahmed@beshara.com' },
    budget: 'FY 2024 Master Budget',
    budgetAvailable: 65000,
    submittedDate: new Date('2024-01-15'),
    urgency: 'HIGH',
    attachments: 2,
    notes: 'Required for Q1 product launch campaign',
    approvalLevel: 2,
    status: 'PENDING' as TransactionStatus,
  },
  {
    id: '2',
    description: 'Neurosurgery Equipment - Navigation System',
    category: 'Inventory Purchases',
    categoryCode: 'IP-0001',
    amount: 85000,
    requester: { name: 'Sara Mohammed', department: 'Sales', email: 'sara@beshara.com' },
    budget: 'Sales Department Budget',
    budgetAvailable: 160000,
    submittedDate: new Date('2024-01-14'),
    urgency: 'MEDIUM',
    attachments: 5,
    notes: 'Required for MOH tender submission',
    approvalLevel: 3,
    status: 'PENDING' as TransactionStatus,
  },
  {
    id: '3',
    description: 'Vehicle Maintenance - Q1',
    category: 'Operating Expenses',
    categoryCode: 'OE-0001',
    amount: 4500,
    requester: { name: 'Khalid Hassan', department: 'Operations', email: 'khalid@beshara.com' },
    budget: 'Operations Department Budget',
    budgetAvailable: 45000,
    submittedDate: new Date('2024-01-13'),
    urgency: 'LOW',
    attachments: 1,
    notes: 'Scheduled maintenance for delivery fleet',
    approvalLevel: 1,
    status: 'PENDING' as TransactionStatus,
  },
  {
    id: '4',
    description: 'Trade Show Booth - Arab Health 2024',
    category: 'Marketing & Advertising',
    categoryCode: 'MA-0001',
    amount: 28000,
    requester: { name: 'Fatima Al-Rashid', department: 'Marketing', email: 'fatima@beshara.com' },
    budget: 'FY 2024 Master Budget',
    budgetAvailable: 65000,
    submittedDate: new Date('2024-01-12'),
    urgency: 'HIGH',
    attachments: 3,
    notes: 'Annual trade show participation - booth and materials',
    approvalLevel: 2,
    status: 'PENDING' as TransactionStatus,
  },
  {
    id: '5',
    description: 'Office Furniture - New Hires',
    category: 'Operating Expenses',
    categoryCode: 'OE-0001',
    amount: 7500,
    requester: { name: 'Mohammed Al-Fahad', department: 'Administration', email: 'mohammed@beshara.com' },
    budget: 'Administration Budget',
    budgetAvailable: 25000,
    submittedDate: new Date('2024-01-11'),
    urgency: 'LOW',
    attachments: 1,
    notes: 'Desks and chairs for 5 new employees',
    approvalLevel: 1,
    status: 'PENDING' as TransactionStatus,
  },
]

const urgencyColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
}

export default function ApprovalsPage() {
  const [selectedItem, setSelectedItem] = useState<(typeof pendingApprovals)[0] | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [comments, setComments] = useState('')
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL')
  const [isProcessing, setIsProcessing] = useState(false)

  const filteredApprovals = pendingApprovals.filter(
    (item) => filterUrgency === 'ALL' || item.urgency === filterUrgency
  )

  const totalPendingAmount = pendingApprovals.reduce((sum, item) => sum + item.amount, 0)

  const handleApprove = async () => {
    if (!selectedItem) return
    setIsProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success(`Approved: ${selectedItem.description}`)
      setIsApproveDialogOpen(false)
      setSelectedItem(null)
      setComments('')
    } catch (error) {
      toast.error('Failed to approve. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedItem || !comments.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    setIsProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success(`Rejected: ${selectedItem.description}`)
      setIsRejectDialogOpen(false)
      setSelectedItem(null)
      setComments('')
    } catch (error) {
      toast.error('Failed to reject. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Approval Queue</h1>
          <p className="text-gray-500">Review and process pending budget requests</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Pending</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(totalPendingAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">{pendingApprovals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">High Urgency</p>
              <p className="text-2xl font-bold">
                {pendingApprovals.filter((i) => i.urgency === 'HIGH').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved Today</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rejected Today</p>
              <p className="text-2xl font-bold">2</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Filter by:</span>
          </div>
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Urgency</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Approvals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Budget Available</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApprovals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                      <p>No pending approvals</p>
                      <p className="text-sm">All caught up!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApprovals.map((item) => {
                  const approvalInfo = getApprovalLevel(item.amount)
                  const percentOfBudget = (item.amount / item.budgetAvailable) * 100

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                            <span className="text-xs text-gray-500">{item.budget}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.requester.name}</p>
                          <p className="text-xs text-gray-500">{item.requester.department}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold">{formatCurrency(item.amount)}</p>
                          <p className="text-xs text-gray-500">
                            Level {approvalInfo.level}: {approvalInfo.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{formatCurrency(item.budgetAvailable)}</p>
                          <p
                            className={`text-xs ${
                              percentOfBudget > 50 ? 'text-amber-600' : 'text-gray-500'
                            }`}
                          >
                            {percentOfBudget.toFixed(0)}% of available
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={urgencyColors[item.urgency]}>{item.urgency}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(item.submittedDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item)
                              setIsApproveDialogOpen(true)
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item)
                              setIsRejectDialogOpen(true)
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              You are about to approve this budget request
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="font-medium">{selectedItem.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(selectedItem.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Requester:</span>
                  <span>{selectedItem.requester.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Budget:</span>
                  <span>{selectedItem.budget}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Comments (optional)</label>
                <Textarea
                  placeholder="Add any comments..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleApprove} loading={isProcessing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p className="font-medium">{selectedItem.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-bold">{formatCurrency(selectedItem.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Requester:</span>
                  <span>{selectedItem.requester.name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Rejection *</label>
                <Textarea
                  placeholder="Please explain why this request is being rejected..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  error={!comments.trim()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} loading={isProcessing}>
              <XCircle className="h-4 w-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
