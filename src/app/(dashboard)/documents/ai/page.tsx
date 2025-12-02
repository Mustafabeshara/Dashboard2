'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Brain,
  Sparkles,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Eye,
  Download,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react'

interface ProcessingJob {
  id: string
  documentId: string
  documentName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extractionType: string
  confidence?: number
  startedAt?: string
  completedAt?: string
  error?: string
  extractedData?: Record<string, any>
}

interface AIStats {
  totalProcessed: number
  successRate: number
  avgConfidence: number
  pendingJobs: number
  activeJobs: number
}

export default function AIProcessingPage() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [stats, setStats] = useState<AIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchJobs()
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchJobs = async () => {
    try {
      // Fetch documents with extractions
      const response = await fetch('/api/documents?limit=50')
      if (response.ok) {
        const data = await response.json()
        const documents = data.documents || data.data || []
        
        // Transform to processing jobs
        const processingJobs: ProcessingJob[] = documents.map((doc: any) => ({
          id: doc.id,
          documentId: doc.id,
          documentName: doc.originalName || doc.name,
          status: doc.status?.toLowerCase() || 'pending',
          extractionType: doc.moduleType || 'general',
          confidence: doc.extractions?.[0]?.confidence,
          startedAt: doc.createdAt,
          completedAt: doc.status === 'PROCESSED' ? doc.updatedAt : undefined,
          extractedData: doc.extractions?.[0]?.extractedData
        }))
        
        setJobs(processingJobs)
        
        // Calculate stats
        const completed = processingJobs.filter(j => j.status === 'completed').length
        const total = processingJobs.length
        const avgConf = processingJobs
          .filter(j => j.confidence)
          .reduce((sum, j) => sum + (j.confidence || 0), 0) / (completed || 1)
        
        setStats({
          totalProcessed: completed,
          successRate: total > 0 ? (completed / total) * 100 : 0,
          avgConfidence: avgConf,
          pendingJobs: processingJobs.filter(j => j.status === 'pending').length,
          activeJobs: processingJobs.filter(j => j.status === 'processing').length
        })
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const processDocument = async (documentId: string) => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/extract`, {
        method: 'POST'
      })
      if (response.ok) {
        fetchJobs()
      }
    } catch (error) {
      console.error('Failed to process document:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-yellow-100 text-yellow-700'
    }
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
                <Brain className="h-7 w-7 text-purple-600" />
                AI Document Processing
              </h1>
              <p className="text-gray-600 mt-1">Automated extraction and analysis powered by AI</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchJobs}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                AI Settings
              </Link>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Processed</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalProcessed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-xl font-bold text-blue-600">{stats.avgConfidence.toFixed(0)}%</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.pendingJobs}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Processing</p>
                  <p className="text-xl font-bold text-indigo-600">{stats.activeJobs}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Capabilities */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Extraction Capabilities</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Tender Documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Invoices & Receipts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Purchase Orders</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Queue */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Processing Queue</h2>
          </div>
          
          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No documents</h3>
              <p className="text-gray-500 mt-2">Upload documents to start AI processing</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Upload className="inline h-4 w-4 mr-2" />
                Upload Document
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-4 hover:bg-gray-50 flex items-center gap-4"
                >
                  {getStatusIcon(job.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900 truncate">{job.documentName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {job.extractionType}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {job.startedAt && (
                        <span>Started: {new Date(job.startedAt).toLocaleString()}</span>
                      )}
                      {job.confidence && (
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {job.confidence}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'pending' && (
                      <button
                        onClick={() => processDocument(job.documentId)}
                        disabled={processing}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                        title="Process Now"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {job.status === 'completed' && (
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Results"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <Link
                      href={`/documents/${job.documentId}`}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="View Document"
                    >
                      <FileText className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Upload for AI Processing</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-purple-300 transition-colors">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-400">PDF, Images, Word documents supported</p>
              <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Browse Files
              </button>
            </div>

            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">AI will extract:</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Key dates and deadlines</li>
                <li>• Financial amounts and values</li>
                <li>• Party information and contacts</li>
                <li>• Item lists and quantities</li>
                <li>• Terms and conditions</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Extraction Results</h2>
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">Document</p>
                <p className="font-medium">{selectedJob.documentName}</p>
              </div>
              {selectedJob.confidence && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Confidence Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${selectedJob.confidence}%` }}
                      />
                    </div>
                    <span className="font-medium">{selectedJob.confidence}%</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-2">Extracted Data</p>
                <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">
                  {JSON.stringify(selectedJob.extractedData || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
