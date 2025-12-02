/**
 * Document Hub Page
 * Central document management with AI-powered processing
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FolderOpen,
  Image as ImageIcon,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DocumentUpload } from '@/components/documents/document-upload'
import { formatDate, cn } from '@/lib/utils'

interface Document {
  id: string
  name: string
  originalName: string
  mimeType: string
  size: number
  type: string
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
  moduleType: string
  moduleId?: string
  tags: string[]
  description?: string
  createdAt: string
  uploadedBy?: {
    id: string
    fullName: string
    email: string
  }
  extractions: Array<{
    id: string
    extractionType: string
    confidence?: number
    isApproved: boolean
    createdAt: string
  }>
  _count: {
    versions: number
  }
}

const FILE_ICONS: Record<string, typeof FileText> = {
  'application/pdf': FileText,
  'image/jpeg': ImageIcon,
  'image/png': ImageIcon,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
}

const STATUS_COLORS: Record<string, { color: string; icon: typeof Clock }> = {
  PENDING: { color: 'bg-gray-100 text-gray-700', icon: Clock },
  PROCESSING: { color: 'bg-blue-100 text-blue-700', icon: Sparkles },
  PROCESSED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  FAILED: { color: 'bg-red-100 text-red-700', icon: XCircle },
}

const MODULE_COLORS: Record<string, string> = {
  TENDER: 'bg-purple-100 text-purple-700',
  BUDGET: 'bg-blue-100 text-blue-700',
  EXPENSE: 'bg-orange-100 text-orange-700',
  INVOICE: 'bg-green-100 text-green-700',
  INVENTORY: 'bg-cyan-100 text-cyan-700',
  GENERAL: 'bg-gray-100 text-gray-700',
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // Sample data for demo
  useEffect(() => {
    // In production, this would fetch from API
    const sampleDocuments: Document[] = [
      {
        id: '1',
        name: 'MOH Cardiac Equipment Tender 2024',
        originalName: 'MOH_Tender_2024_001.pdf',
        mimeType: 'application/pdf',
        size: 2456789,
        type: 'TENDER_DOCUMENT',
        status: 'PROCESSED',
        moduleType: 'TENDER',
        moduleId: 'tender-1',
        tags: ['MOH', 'Cardiac', '2024'],
        description: 'Main tender document for cardiac surgery equipment',
        createdAt: new Date().toISOString(),
        uploadedBy: {
          id: '1',
          fullName: 'Ahmad Beshara',
          email: 'ahmad@beshara.com',
        },
        extractions: [
          {
            id: 'ext-1',
            extractionType: 'TENDER_EXTRACTION',
            confidence: 95,
            isApproved: true,
            createdAt: new Date().toISOString(),
          },
        ],
        _count: { versions: 2 },
      },
      {
        id: '2',
        name: 'Technical Specifications - Radiology',
        originalName: 'Tech_Specs_Radiology.pdf',
        mimeType: 'application/pdf',
        size: 1234567,
        type: 'TENDER_SPECS',
        status: 'PROCESSED',
        moduleType: 'TENDER',
        moduleId: 'tender-2',
        tags: ['Radiology', 'Specs'],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        uploadedBy: {
          id: '2',
          fullName: 'Sara Al-Mahmoud',
          email: 'sara@beshara.com',
        },
        extractions: [
          {
            id: 'ext-2',
            extractionType: 'TENDER_EXTRACTION',
            confidence: 88,
            isApproved: false,
            createdAt: new Date().toISOString(),
          },
        ],
        _count: { versions: 1 },
      },
      {
        id: '3',
        name: 'Invoice - Medical Supplies March',
        originalName: 'Invoice_2024_0234.pdf',
        mimeType: 'application/pdf',
        size: 567890,
        type: 'INVOICE',
        status: 'PENDING',
        moduleType: 'INVOICE',
        tags: ['Invoice', '2024'],
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        extractions: [],
        _count: { versions: 1 },
      },
      {
        id: '4',
        name: 'Expense Receipt - Office Supplies',
        originalName: 'receipt_scan.jpg',
        mimeType: 'image/jpeg',
        size: 345678,
        type: 'EXPENSE_RECEIPT',
        status: 'PROCESSING',
        moduleType: 'EXPENSE',
        tags: ['Receipt', 'Office'],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        extractions: [],
        _count: { versions: 1 },
      },
    ]

    setDocuments(sampleDocuments)
    setLoading(false)
  }, [])

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      search === '' ||
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(search.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))

    const matchesModule = moduleFilter === 'ALL' || doc.moduleType === moduleFilter
    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter

    return matchesSearch && matchesModule && matchesStatus && matchesType
  })

  const getFileIcon = (mimeType: string) => {
    const Icon = FILE_ICONS[mimeType] || FileText
    return <Icon className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const processDocument = async (documentId: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === documentId ? { ...doc, status: 'PROCESSING' as const } : doc
      )
    )

    // In production, call the actual API
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                status: 'PROCESSED' as const,
                extractions: [
                  {
                    id: `ext-${Date.now()}`,
                    extractionType: 'TENDER_EXTRACTION',
                    confidence: 92,
                    isApproved: false,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : doc
        )
      )
    }, 3000)
  }

  const handleUploadComplete = () => {
    setIsUploadOpen(false)
    // Refresh documents list
  }

  // Stats
  const stats = {
    total: documents.length,
    processed: documents.filter((d) => d.status === 'PROCESSED').length,
    pending: documents.filter((d) => d.status === 'PENDING').length,
    failed: documents.filter((d) => d.status === 'FAILED').length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-7 w-7" />
            Document Hub
          </h1>
          <p className="text-gray-500">
            Central document management with AI-powered extraction
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
            </DialogHeader>
            <DocumentUpload
              moduleType="GENERAL"
              onUploadComplete={handleUploadComplete}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">AI Processed</p>
                <p className="text-2xl font-bold text-green-600">{stats.processed}</p>
              </div>
              <Sparkles className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
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
                placeholder="Search documents by name or tags..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Modules</SelectItem>
                  <SelectItem value="TENDER">Tender</SelectItem>
                  <SelectItem value="BUDGET">Budget</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="INVENTORY">Inventory</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="PROCESSED">Processed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="TENDER_DOCUMENT">Tender Document</SelectItem>
                  <SelectItem value="TENDER_SPECS">Technical Specs</SelectItem>
                  <SelectItem value="TENDER_BOQ">Bill of Quantities</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="EXPENSE_RECEIPT">Expense Receipt</SelectItem>
                  <SelectItem value="DELIVERY_NOTE">Delivery Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Extraction</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                      Loading documents...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FolderOpen className="h-8 w-8 mb-2" />
                      <p>No documents found</p>
                      <p className="text-sm">Upload documents to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => {
                  const statusConfig = STATUS_COLORS[doc.status]
                  const StatusIcon = statusConfig.icon

                  return (
                    <TableRow key={doc.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.mimeType)}
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {doc.originalName} • {formatFileSize(doc.size)}
                            </p>
                            {doc.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {doc.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">
                          {doc.type.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            MODULE_COLORS[doc.moduleType]
                          )}
                        >
                          {doc.moduleType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                            statusConfig.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {doc.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {doc.extractions.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-green-500" />
                            <span className="text-sm">
                              {doc.extractions[0].confidence}% confidence
                            </span>
                            {doc.extractions[0].isApproved && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        ) : doc.status === 'PENDING' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => processDocument(doc.id)}
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            Process
                          </Button>
                        ) : doc.status === 'PROCESSING' ? (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 animate-pulse" />
                            Processing...
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(new Date(doc.createdAt))}</p>
                          {doc.uploadedBy && (
                            <p className="text-xs text-gray-500">
                              by {doc.uploadedBy.fullName}
                            </p>
                          )}
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
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {doc.status === 'PENDING' && (
                              <DropdownMenuItem
                                onClick={() => processDocument(doc.id)}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Process with AI
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
