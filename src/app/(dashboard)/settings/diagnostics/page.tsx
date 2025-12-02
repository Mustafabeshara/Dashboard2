'use client'

/**
 * API Diagnostics Page
 * Visual interface for testing API connectivity and service health
 */

import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Cloud,
  Cpu,
  Zap,
  Server,
  Shield
} from 'lucide-react'

interface ServiceStatus {
  name: string
  status: 'ok' | 'error' | 'not_configured'
  latency?: number
  message?: string
  details?: Record<string, unknown>
}

interface DiagnosticsResponse {
  timestamp: string
  environment: string
  summary: {
    total: number
    ok: number
    error: number
    notConfigured: number
  }
  primaryAIProvider: string
  services: ServiceStatus[]
  config: {
    nextAuthUrl: string
    nextAuthSecret: string
    databaseUrl: string
  }
}

const serviceIcons: Record<string, React.ReactNode> = {
  'Database': <Database className="w-5 h-5" />,
  'Groq': <Zap className="w-5 h-5" />,
  'Gemini': <Cpu className="w-5 h-5" />,
  'Anthropic': <Cloud className="w-5 h-5" />,
  'OpenAI': <Cloud className="w-5 h-5" />,
  'AWS (Textract)': <Server className="w-5 h-5" />,
}

function StatusBadge({ status }: { status: ServiceStatus['status'] }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3.5 h-3.5" />
        Connected
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3.5 h-3.5" />
        Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <AlertCircle className="w-3.5 h-3.5" />
      Not Configured
    </span>
  )
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const icon = serviceIcons[service.name] || <Cloud className="w-5 h-5" />
  
  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all
      ${service.status === 'ok' ? 'border-green-200 bg-green-50' : ''}
      ${service.status === 'error' ? 'border-red-200 bg-red-50' : ''}
      ${service.status === 'not_configured' ? 'border-gray-200 bg-gray-50' : ''}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-lg
            ${service.status === 'ok' ? 'bg-green-200 text-green-700' : ''}
            ${service.status === 'error' ? 'bg-red-200 text-red-700' : ''}
            ${service.status === 'not_configured' ? 'bg-gray-200 text-gray-500' : ''}
          `}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{service.name}</h3>
            <p className="text-sm text-gray-600">{service.message}</p>
          </div>
        </div>
        <StatusBadge status={service.status} />
      </div>
      
      {service.latency !== undefined && (
        <div className="mt-3 text-xs text-gray-500">
          Response time: <span className="font-mono">{service.latency}ms</span>
        </div>
      )}
      
      {service.details && Object.keys(service.details).length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {Object.entries(service.details).map(([key, value]) => (
            <span key={key} className="mr-3">
              {key}: <span className="font-mono">{String(value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDiagnostics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/diagnostics')
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view diagnostics')
        }
        if (response.status === 403) {
          throw new Error('You need admin privileges to view diagnostics')
        }
        throw new Error(`HTTP ${response.status}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiagnostics()
  }, [])

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Testing API connections...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-800">Error Loading Diagnostics</h2>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchDiagnostics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const aiServices = data.services.filter(s => 
    ['Groq', 'Gemini', 'Anthropic', 'OpenAI'].includes(s.name)
  )
  const infraServices = data.services.filter(s => 
    ['Database', 'AWS (Textract)'].includes(s.name)
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Diagnostics</h1>
          <p className="text-gray-600 mt-1">
            Test connectivity to external services and AI providers
          </p>
        </div>
        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-gray-900">{data.summary.total}</div>
          <div className="text-sm text-gray-600">Total Services</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-3xl font-bold text-green-700">{data.summary.ok}</div>
          <div className="text-sm text-green-600">Connected</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-3xl font-bold text-red-700">{data.summary.error}</div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
        <div className="bg-gray-50 rounded-lg border p-4">
          <div className="text-3xl font-bold text-gray-600">{data.summary.notConfigured}</div>
          <div className="text-sm text-gray-500">Not Configured</div>
        </div>
      </div>

      {/* Primary AI Provider */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-blue-600" />
          <div>
            <div className="text-sm text-blue-600 font-medium">Primary AI Provider for Extraction</div>
            <div className="text-lg font-bold text-blue-900">{data.primaryAIProvider}</div>
          </div>
        </div>
      </div>

      {/* AI Providers Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          AI Providers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiServices.map(service => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>
      </div>

      {/* Infrastructure Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          Infrastructure
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infraServices.map(service => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>
      </div>

      {/* Configuration Check */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Environment Configuration
        </h2>
        <div className="bg-white rounded-lg border p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">NEXTAUTH_URL</span>
              <span className={data.config.nextAuthUrl.includes('✓') ? 'text-green-600' : 'text-red-600'}>
                {data.config.nextAuthUrl}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">NEXTAUTH_SECRET</span>
              <span className={data.config.nextAuthSecret.includes('✓') ? 'text-green-600' : 'text-red-600'}>
                {data.config.nextAuthSecret}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-gray-600">DATABASE_URL</span>
              <span className={data.config.databaseUrl.includes('✓') ? 'text-green-600' : 'text-red-600'}>
                {data.config.databaseUrl}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-gray-500 text-center">
        Last checked: {new Date(data.timestamp).toLocaleString()} | 
        Environment: {data.environment}
      </div>
    </div>
  )
}
