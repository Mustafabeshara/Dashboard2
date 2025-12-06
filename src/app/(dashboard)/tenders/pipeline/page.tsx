'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Kanban,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Plus,
  MoreHorizontal,
  TrendingUp,
  Target
} from 'lucide-react'

interface Tender {
  id: string
  tenderNumber: string
  title: string
  status: string
  estimatedValue: number
  currency: string
  submissionDeadline: string | null
  customer?: {
    name: string
  }
  department?: string
  probability?: number
  createdAt: string
}

interface PipelineStage {
  id: string
  name: string
  color: string
  tenders: Tender[]
  totalValue: number
}

const STAGES: { id: string; name: string; color: string; statuses: string[] }[] = [
  { id: 'identified', name: 'Identified', color: 'bg-gray-100 border-gray-300', statuses: ['DRAFT', 'IDENTIFIED'] },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-100 border-blue-300', statuses: ['QUALIFIED', 'IN_PROGRESS'] },
  { id: 'submitted', name: 'Submitted', color: 'bg-purple-100 border-purple-300', statuses: ['SUBMITTED', 'PENDING'] },
  { id: 'evaluation', name: 'Under Evaluation', color: 'bg-yellow-100 border-yellow-300', statuses: ['EVALUATION', 'UNDER_REVIEW'] },
  { id: 'won', name: 'Won', color: 'bg-green-100 border-green-300', statuses: ['WON', 'AWARDED'] },
  { id: 'lost', name: 'Lost', color: 'bg-red-100 border-red-300', statuses: ['LOST', 'REJECTED'] },
]

export default function TenderPipelinePage() {
  const [tenders, setTenders] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'funnel'>('kanban')

  useEffect(() => {
    fetchTenders()
  }, [])

  const fetchTenders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tenders?limit=100')
      if (response.ok) {
        const result = await response.json()
        const tenderList = result.data || result.tenders || []
        setTenders(tenderList)
        
        // Organize into stages
        const pipelineStages: PipelineStage[] = STAGES.map(stage => {
          const stageTenders = tenderList.filter((t: Tender) => 
            stage.statuses.includes(t.status?.toUpperCase() || 'DRAFT')
          )
          return {
            id: stage.id,
            name: stage.name,
            color: stage.color,
            tenders: stageTenders,
            totalValue: stageTenders.reduce((sum: number, t: Tender) => sum + (Number(t.estimatedValue) || 0), 0)
          }
        })
        setStages(pipelineStages)
      }
    } catch (error) {
      console.error('Failed to fetch tenders:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency = 'KWD') => {
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  const totalPipelineValue = stages.reduce((sum, stage) => sum + stage.totalValue, 0)
  const activeValue = stages
    .filter(s => !['won', 'lost'].includes(s.id))
    .reduce((sum, stage) => sum + stage.totalValue, 0)
  const wonValue = stages.find(s => s.id === 'won')?.totalValue || 0
  const winRate = tenders.length > 0 
    ? Math.round((stages.find(s => s.id === 'won')?.tenders.length || 0) / tenders.length * 100)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="flex gap-4 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex-shrink-0 w-80 h-96 bg-gray-200 rounded-xl" />
            ))}
          </div>
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
                <Kanban className="h-7 w-7 text-purple-600" />
                Tender Pipeline
              </h1>
              <p className="text-gray-600 mt-1">Track tender progress from identification to award</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode('funnel')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'funnel' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Funnel
                </button>
              </div>
              <Link 
                href="/tenders/create"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                New Tender
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPipelineValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Value</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(activeValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Won Value</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(wonValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-xl font-bold text-orange-600">{winRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {viewMode === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <div 
                key={stage.id} 
                className={`flex-shrink-0 w-80 rounded-xl border-2 ${stage.color}`}
              >
                {/* Stage Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                      <p className="text-sm text-gray-500">{stage.tenders.length} tenders</p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {formatCurrency(stage.totalValue)}
                    </span>
                  </div>
                </div>

                {/* Tender Cards */}
                <div className="p-2 space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {stage.tenders.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      No tenders in this stage
                    </div>
                  ) : (
                    stage.tenders.map((tender) => {
                      const daysLeft = getDaysUntilDeadline(tender.submissionDeadline)
                      return (
                        <Link 
                          key={tender.id}
                          href={`/tenders/${tender.id}`}
                          className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {tender.tenderNumber}
                            </code>
                            {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                {daysLeft}d left
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
                            {tender.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{tender.customer?.name || 'No customer'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(tender.estimatedValue || 0, tender.currency)}
                            </span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(tender.submissionDeadline)}
                            </span>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Funnel View */}
        {viewMode === 'funnel' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="space-y-4">
              {stages.filter(s => !['lost'].includes(s.id)).map((stage, index) => {
                const width = Math.max(
                  30,
                  100 - (index * 12)
                )
                return (
                  <div key={stage.id} className="flex items-center gap-4">
                    <div className="w-32 text-right">
                      <p className="font-medium text-gray-900">{stage.name}</p>
                      <p className="text-sm text-gray-500">{stage.tenders.length} tenders</p>
                    </div>
                    <div className="flex-1">
                      <div 
                        className={`h-12 rounded-lg ${stage.color.replace('border', 'bg').replace('-300', '-200')} flex items-center justify-center transition-all`}
                        style={{ width: `${width}%` }}
                      >
                        <span className="font-medium text-gray-700">
                          {formatCurrency(stage.totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Lost tenders note */}
            <div className="mt-8 pt-4 border-t">
              <div className="flex items-center gap-3 text-gray-500">
                <XCircle className="h-5 w-5 text-red-400" />
                <span>
                  Lost: {stages.find(s => s.id === 'lost')?.tenders.length || 0} tenders 
                  ({formatCurrency(stages.find(s => s.id === 'lost')?.totalValue || 0)})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
