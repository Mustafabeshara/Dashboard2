'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  AlertCircle,
  Package,
  Clock,
  CheckCircle,
  Bell,
  BellOff,
  Filter,
  RefreshCw,
  ExternalLink,
  TrendingDown,
  Calendar,
  Settings,
  Mail
} from 'lucide-react'

interface StockAlert {
  id: string
  type: 'low_stock' | 'out_of_stock' | 'expiring' | 'expired' | 'reorder'
  severity: 'critical' | 'warning' | 'info'
  productId: string
  productName: string
  productSku: string
  currentStock: number
  minStock: number
  reorderPoint: number
  expiryDate?: string
  message: string
  createdAt: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

interface AlertStats {
  total: number
  critical: number
  warning: number
  info: number
  unacknowledged: number
}

export default function InventoryAlertsPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  useEffect(() => {
    fetchAlerts()
  }, [typeFilter, severityFilter, showAcknowledged])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      // Fetch inventory data to generate alerts
      const response = await fetch('/api/inventory')
      if (response.ok) {
        const data = await response.json()
        const inventory = data.inventory || []
        
        // Generate alerts from inventory data
        const generatedAlerts: StockAlert[] = []
        
        inventory.forEach((item: any) => {
          const currentStock = item.availableQuantity || 0
          const minStock = item.product?.minStockLevel || 10
          const reorderPoint = item.product?.reorderPoint || 15
          
          // Low stock alert
          if (currentStock > 0 && currentStock <= minStock) {
            generatedAlerts.push({
              id: `low-${item.id}`,
              type: 'low_stock',
              severity: currentStock <= minStock / 2 ? 'critical' : 'warning',
              productId: item.productId,
              productName: item.product?.name || 'Unknown Product',
              productSku: item.product?.sku || item.sku || 'N/A',
              currentStock,
              minStock,
              reorderPoint,
              message: `Stock level (${currentStock}) is below minimum (${minStock})`,
              createdAt: new Date().toISOString(),
              acknowledged: false
            })
          }
          
          // Out of stock alert
          if (currentStock === 0) {
            generatedAlerts.push({
              id: `out-${item.id}`,
              type: 'out_of_stock',
              severity: 'critical',
              productId: item.productId,
              productName: item.product?.name || 'Unknown Product',
              productSku: item.product?.sku || item.sku || 'N/A',
              currentStock: 0,
              minStock,
              reorderPoint,
              message: 'Product is out of stock',
              createdAt: new Date().toISOString(),
              acknowledged: false
            })
          }
          
          // Expiring soon alert
          if (item.expiryDate) {
            const daysUntilExpiry = Math.ceil(
              (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
            
            if (daysUntilExpiry <= 0) {
              generatedAlerts.push({
                id: `expired-${item.id}`,
                type: 'expired',
                severity: 'critical',
                productId: item.productId,
                productName: item.product?.name || 'Unknown Product',
                productSku: item.product?.sku || item.sku || 'N/A',
                currentStock,
                minStock,
                reorderPoint,
                expiryDate: item.expiryDate,
                message: `Product has expired`,
                createdAt: new Date().toISOString(),
                acknowledged: false
              })
            } else if (daysUntilExpiry <= 30) {
              generatedAlerts.push({
                id: `expiring-${item.id}`,
                type: 'expiring',
                severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
                productId: item.productId,
                productName: item.product?.name || 'Unknown Product',
                productSku: item.product?.sku || item.sku || 'N/A',
                currentStock,
                minStock,
                reorderPoint,
                expiryDate: item.expiryDate,
                message: `Product expires in ${daysUntilExpiry} days`,
                createdAt: new Date().toISOString(),
                acknowledged: false
              })
            }
          }
          
          // Reorder point alert
          if (currentStock > minStock && currentStock <= reorderPoint) {
            generatedAlerts.push({
              id: `reorder-${item.id}`,
              type: 'reorder',
              severity: 'info',
              productId: item.productId,
              productName: item.product?.name || 'Unknown Product',
              productSku: item.product?.sku || item.sku || 'N/A',
              currentStock,
              minStock,
              reorderPoint,
              message: `Stock (${currentStock}) approaching reorder point (${reorderPoint})`,
              createdAt: new Date().toISOString(),
              acknowledged: false
            })
          }
        })
        
        // Calculate stats
        const alertStats: AlertStats = {
          total: generatedAlerts.length,
          critical: generatedAlerts.filter(a => a.severity === 'critical').length,
          warning: generatedAlerts.filter(a => a.severity === 'warning').length,
          info: generatedAlerts.filter(a => a.severity === 'info').length,
          unacknowledged: generatedAlerts.filter(a => !a.acknowledged).length
        }
        
        setStats(alertStats)
        setAlerts(generatedAlerts)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'info': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info': return <Bell className="h-5 w-5 text-blue-500" />
      default: return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'low_stock': return 'Low Stock'
      case 'out_of_stock': return 'Out of Stock'
      case 'expiring': return 'Expiring Soon'
      case 'expired': return 'Expired'
      case 'reorder': return 'Reorder Point'
      default: return type
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false
    if (!showAcknowledged && alert.acknowledged) return false
    return true
  })

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
                <AlertTriangle className="h-7 w-7 text-orange-600" />
                Stock Alerts
              </h1>
              <p className="text-gray-600 mt-1">Monitor low stock, expiring items, and reorder points</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchAlerts}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                <Mail className="h-4 w-4" />
                Send Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Alerts</p>
                <p className="text-xl font-bold text-gray-900">{stats?.total || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-xl font-bold text-red-600">{stats?.critical || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Warnings</p>
                <p className="text-xl font-bold text-yellow-600">{stats?.warning || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Info</p>
                <p className="text-xl font-bold text-blue-600">{stats?.info || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BellOff className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-xl font-bold text-orange-600">{stats?.unacknowledged || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="all">All Types</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="reorder">Reorder Point</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Show acknowledged</span>
            </label>
            <div className="flex-1" />
            <span className="text-sm text-gray-500">{filteredAlerts.length} alerts</span>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No alerts</h3>
              <p className="text-gray-500 mt-2">All inventory levels are within normal range</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow ${
                  alert.acknowledged ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-gray-900">{alert.productName}</h3>
                      <code className="px-2 py-0.5 bg-gray-100 rounded text-xs">{alert.productSku}</code>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {getTypeLabel(alert.type)}
                      </span>
                    </div>
                    <p className="text-gray-600">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        Current: {alert.currentStock}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        Min: {alert.minStock}
                      </span>
                      {alert.expiryDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Expires: {new Date(alert.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/inventory`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    {!alert.acknowledged && (
                      <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
