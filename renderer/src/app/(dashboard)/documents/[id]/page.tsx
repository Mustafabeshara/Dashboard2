/**
 * Document Detail Page
 * View document details and review AI extractions
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExtractionReview } from '@/components/documents/extraction-review'
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
  url?: string
  createdAt: string
  processedAt?: string
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
    extractedData: any
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

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string
  
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'preview' | 'review'>('details')
  const [processing, setProcessing] = useState(false)

  // Sample data for demo
  useEffect(() => {
    // In production, this would fetch from API
    const sampleDocument: Document = {
      id: documentId,
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
      url: '#',
      createdAt: new Date().toISOString(),
      processedAt: new Date(Date.now() - 3600000).toISOString(),
      uploadedBy: {
        id: '1',
        fullName: 'Ahmad Beshara',
        email: 'ahmad@beshara.com',
      },
      extractions: [
        {
          id: 'ext-1',
          extractionType: 'TENDER_EXTRACTION',
          confidence: 72,
          isApproved: false,
          extractedData: {
            reference: 'MOH-2024-CARD-001',
            title: 'Supply of Cardiac Surgery Equipment',
            organization: 'Ministry of Health',
            closingDate: '2024-12-31',
            items: [
              {
                itemDescription: 'Cardiopulmonary Bypass Machine with Integrated Monitoring System',
                quantity: 2,
                unit: 'units'
              },
              {
                itemDescription: 'Intra-aortic Balloon Pump (IABP) Units',
                quantity: 3,
                unit: 'units'
              }
            ],
            notes: 'Equipment must meet ISO 13485 certification standards',
            confidence: {
              overall: 0.72,
              reference: 0.95,
              title: 0.88,
              organization: 0.92,
              closingDate: 0.85,
              items: 0.65
            }
          },
          createdAt: new Date().toISOString(),
        },
      ],
      _count: { versions: 2 },
    }

    setDocument(sampleDocument)
    setLoading(false)
  }, [documentId])

  const getFileIcon = (mimeType: string) => {
    const Icon = FILE_ICONS[mimeType] || FileText
    return <Icon className="h-6 w-6 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const processDocument = async () => {
    if (!document) return
    
    setProcessing(true)
    setDocument(prev => prev ? { ...prev, status: 'PROCESSING' } : null)
    
    // Simulate API call
    setTimeout(() => {
      setDocument(prev => prev ? { 
        ...prev, 
        status: 'PROCESSED',
        processedAt: new Date().toISOString(),
        extractions: [
          {
            id: `ext-${Date.now()}`,
            extractionType: 'TENDER_EXTRACTION',
            confidence: 85,
            isApproved: false,
            extractedData: {
              reference: 'MOH-2024-CARD-001',
              title: 'Supply of Cardiac Surgery Equipment',
              organization: 'Ministry of Health',
              closingDate: '2024-12-31',
              items: [
                {
                  itemDescription: 'Cardiopulmonary Bypass Machine with Integrated Monitoring System',
                  quantity: 2,
                  unit: 'units'
                },
                {
                  itemDescription: 'Intra-aortic Balloon Pump (IABP) Units',
                  quantity: 3,
                  unit: 'units'
                },
                {
                  itemDescription: 'Automated External Defibrillators (AED)',
                  quantity: 5,
                  unit: 'units'
                }
              ],
              notes: 'All equipment must comply with FDA and CE marking requirements',
              confidence: {
                overall: 0.85,
                reference: 0.95,
                title: 0.90,
                organization: 0.95,
                closingDate: 0.90,
                items: 0.80
              }
            },
            createdAt: new Date().toISOString(),
          }
        ]
      } : null)
      setProcessing(false)
    }, 3000)
  }

  const handleSaveExtraction = (updatedData: any) => {
    if (!document) return
    
    // Update the extraction with approved data
    const updatedExtractions = [...document.extractions]
    if (updatedExtractions.length > 0) {
      updatedExtractions[0] = {
        ...updatedExtractions[0],
        extractedData: updatedData,
        isApproved: true
      }
    }
    
    setDocument({
      ...document,
      extractions: updatedExtractions
    })
    
    // Show success message
    alert('Extraction approved successfully!')
    
    // Navigate to create tender page
    router.push('/tenders/create')
  }

  const handleRejectExtraction = () => {
    if (!document) return
    
    // Reset approval status
    const updatedExtractions = [...document.extractions]
    if (updatedExtractions.length > 0) {
      updatedExtractions[0] = {
        ...updatedExtractions[0],
        isApproved: false
      }
    }
    
    setDocument({
      ...document,
      extractions: updatedExtractions
    })
    
    // Show message
    alert('Extraction rejected. You can re-process the document.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Document not found</h2>
        <p className="text-gray-500">The document you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_COLORS[document.status]
  const StatusIcon = statusConfig.icon
  const latestExtraction = document.extractions[0]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/documents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {getFileIcon(document.mimeType)}
              {document.name}
            </h1>
            <p className="text-gray-500 text-sm">
              Uploaded {formatDate(new Date(document.createdAt))} • {formatFileSize(document.size)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button>
            <Eye className="h-4 w-4 mr-2" />
            View Original
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                  statusConfig.color
                )}
              >
                <StatusIcon className="h-4 w-4" />
                {document.status.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  MODULE_COLORS[document.moduleType]
                )}>
                  {document.moduleType}
                </span>
                <Badge variant="secondary">{document.type.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {document.status === 'PENDING' && (
                <Button onClick={processDocument} disabled={processing}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Process with AI'}
                </Button>
              )}
              {document.status === 'FAILED' && (
                <Button onClick={processDocument} variant="destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Retry Processing
                </Button>
              )}
              {document.status === 'PROCESSED' && latestExtraction && !latestExtraction.isApproved && (
                <Button onClick={() => setActiveTab('review')} variant="default">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Review Extraction
                </Button>
              )}
              {document.status === 'PROCESSED' && latestExtraction && latestExtraction.isApproved && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Extraction Approved</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            className={cn(
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('details')}
          >
            Document Details
          </button>
          <button
            className={cn(
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
          {document.status === 'PROCESSED' && latestExtraction && (
            <button
              className={cn(
                'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
                activeTab === 'review'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-gray-700'
              )}
              onClick={() => setActiveTab('review')}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Extraction
                {latestExtraction.confidence && (
                  <Badge variant="secondary">{latestExtraction.confidence}%</Badge>
                )}
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Original Name</h4>
                    <p className="mt-1">{document.originalName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">File Type</h4>
                    <p className="mt-1">{document.mimeType}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Size</h4>
                    <p className="mt-1">{formatFileSize(document.size)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Module</h4>
                    <p className="mt-1">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        MODULE_COLORS[document.moduleType]
                      )}>
                        {document.moduleType}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
                    <p className="mt-1">{formatDate(new Date(document.createdAt))}</p>
                  </div>
                  {document.processedAt && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Processed</h4>
                      <p className="mt-1">{formatDate(new Date(document.processedAt))}</p>
                    </div>
                  )}
                </div>
                
                {document.description && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <p className="mt-1">{document.description}</p>
                  </div>
                )}
                
                {document.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {document.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Upload Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {document.uploadedBy && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Uploaded By</h4>
                    <p className="mt-1 font-medium">{document.uploadedBy.fullName}</p>
                    <p className="text-sm text-muted-foreground">{document.uploadedBy.email}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Versions</h4>
                  <p className="mt-1">{document._count.versions} version{document._count.versions !== 1 ? 's' : ''}</p>
                </div>
                
                {document.moduleId && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Linked To</h4>
                    <Button variant="link" className="p-0 h-auto mt-1" asChild>
                      <Link href={`/${document.moduleType.toLowerCase()}s/${document.moduleId}`}>
                        View {document.moduleType.toLowerCase()} record
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeTab === 'preview' && (
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>Preview of the uploaded document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-2 text-gray-500">Document preview would appear here</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href={document.url || '#'}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Document
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'review' && document.status === 'PROCESSED' && latestExtraction && (
          <Card>
            <CardHeader>
              <CardTitle>AI Extraction Review</CardTitle>
              <CardDescription>
                Review and validate the AI-extracted data. Confidence: {latestExtraction.confidence}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExtractionReview 
                data={latestExtraction.extractedData} 
                onSave={handleSaveExtraction}
                onReject={handleRejectExtraction}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}