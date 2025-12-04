/**
 * Inventory Management Page with AI-Powered Predictions
 */
'use client';

import { ExportButtons } from '@/components/ExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import {
  AlertTriangle,
  BarChart3,
  Box,
  Brain,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

interface InventoryItem {
  id: string;
  productId: string;
  batchNumber: string | null;
  serialNumber: string | null;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  location: string | null;
  expiryDate: string | null;
  receivedDate: string | null;
  unitCost: number | null;
  totalValue: number | null;
  status: 'AVAILABLE' | 'RESERVED' | 'EXPIRED' | 'DAMAGED';
  product: {
    id: string;
    name: string;
    sku: string;
    category: string | null;
    minStockLevel: number;
    maxStockLevel: number | null;
    reorderPoint: number | null;
  };
}

interface Stats {
  totalItems: number;
  totalValue: number;
  lowStock: number;
  expiringSoon: number;
  categories: { category: string; count: number }[];
}

interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'prediction';
  title: string;
  description: string;
  action?: string;
  data?: any;
}

const LOCATIONS = [
  'Warehouse A - Shelf 1',
  'Warehouse A - Shelf 2',
  'Warehouse B - Shelf 1',
  'Warehouse B - Shelf 2',
  'Cold Storage',
  'Quarantine Area',
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; icon: React.ReactNode }> = {
    AVAILABLE: { class: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
    RESERVED: { class: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
    EXPIRED: { class: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
    DAMAGED: { class: 'bg-gray-100 text-gray-700', icon: <AlertTriangle className="h-3 w-3" /> },
  };

  const { class: className, icon } = config[status] || config.AVAILABLE;
  return (
    <Badge variant="outline" className={`${className} flex items-center gap-1`}>
      {icon}
      {status}
    </Badge>
  );
}

function StockLevelIndicator({
  current,
  min,
  max,
}: {
  current: number;
  min: number;
  max: number | null;
}) {
  const percentage = max ? (current / max) * 100 : current > min ? 100 : (current / min) * 100;
  const isLow = current <= min;
  const isCritical = current < min * 0.5;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span
        className={`text-xs ${isCritical ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-gray-600'}`}
      >
        {current} / {max || min}
      </span>
    </div>
  );
}

export default function InventoryPage() {
  const { data: session } = useSession();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    batchNumber: '',
    serialNumber: '',
    location: '',
    expiryDate: '',
    unitCost: '',
  });

  const [adjustData, setAdjustData] = useState({
    adjustment: '',
    reason: 'STOCK_COUNT',
  });

  // User permissions
  const userRole = session?.user?.role;
  const canCreate = ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(userRole || '');
  const canEdit = ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(userRole || '');
  const canDelete = ['ADMIN', 'MANAGER'].includes(userRole || '');

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/inventory?${params}`);
      const result = await response.json();

      if (result.inventory) {
        setInventory(result.inventory);
      }
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  const generateAIInsights = useCallback(async () => {
    setLoadingAI(true);

    try {
      // Call the AI optimization API
      const response = await fetch('/api/inventory/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success && result.data) {
        const optimization = result.data;
        const insights: AIInsight[] = [];

        // Convert AI optimization results to insights
        if (optimization.insights && optimization.insights.length > 0) {
          optimization.insights.forEach((insight: any) => {
            insights.push({
              type:
                insight.type === 'risk'
                  ? 'warning'
                  : insight.type === 'opportunity'
                    ? 'info'
                    : insight.type === 'trend'
                      ? 'prediction'
                      : 'info',
              title: insight.title,
              description: insight.description,
              action: insight.actionable ? 'Take Action' : undefined,
            });
          });
        }

        // Add reorder recommendations as insights
        if (optimization.reorderRecommendations && optimization.reorderRecommendations.length > 0) {
          const criticalCount = optimization.reorderRecommendations.filter(
            (r: any) => r.urgency === 'critical' || r.urgency === 'high'
          ).length;

          if (criticalCount > 0) {
            insights.push({
              type: 'warning',
              title: `${criticalCount} Urgent Reorder Items`,
              description: `${criticalCount} items need immediate reordering. Total ${optimization.reorderRecommendations.length} items below reorder point.`,
              action: 'Generate Purchase Order',
              data: { reorderItems: optimization.reorderRecommendations },
            });
          }
        }

        // Add demand forecast insight
        if (optimization.demandForecast) {
          insights.push({
            type: 'prediction',
            title: 'AI Demand Forecast',
            description: `Predicted demand: ${optimization.demandForecast.nextMonth.toLocaleString()} units (30 days), ${optimization.demandForecast.next3Months.toLocaleString()} units (90 days). Trend: ${optimization.demandForecast.trend}. Confidence: ${optimization.demandForecast.confidence}%`,
            data: optimization.demandForecast,
          });
        }

        // Add expiring items insight
        if (optimization.stockOptimization?.expiringItems?.length > 0) {
          insights.push({
            type: 'warning',
            title: `${optimization.stockOptimization.expiringItems.length} Items Expiring Soon`,
            description: optimization.stockOptimization.expiringItems
              .slice(0, 2)
              .map((item: any) => `${item.productName}: ${item.daysUntilExpiry} days`)
              .join(', '),
            action: 'View Expiring Items',
            data: { expiringItems: optimization.stockOptimization.expiringItems },
          });
        }

        // Add inventory health metric
        if (optimization.metrics) {
          const healthStatus =
            optimization.metrics.inventoryHealth >= 80
              ? 'success'
              : optimization.metrics.inventoryHealth >= 60
                ? 'info'
                : 'warning';
          insights.push({
            type: healthStatus as any,
            title: `Inventory Health: ${optimization.metrics.inventoryHealth}%`,
            description: `Turnover rate: ${optimization.metrics.turnoverRate.toFixed(1)}x, Stockout risk: ${optimization.metrics.stockoutRisk.toFixed(0)}%, Potential savings: KWD ${optimization.metrics.potentialSavings.toLocaleString()}`,
            data: optimization.metrics,
          });
        }

        if (insights.length === 0) {
          insights.push({
            type: 'success',
            title: 'Inventory Health: Excellent',
            description: 'All stock levels are optimal. No immediate actions required.',
          });
        }

        setAiInsights(insights);
      } else {
        // Fallback to basic local analysis if API fails
        generateLocalInsights();
      }
    } catch (error) {
      console.error('AI optimization error:', error);
      // Fallback to basic local analysis
      generateLocalInsights();
    } finally {
      setLoadingAI(false);
    }
  }, [inventory]);

  const generateLocalInsights = useCallback(() => {
    const insights: AIInsight[] = [];

    // Low stock analysis (fallback)
    const lowStockItems = inventory.filter(
      item => item.availableQuantity <= (item.product.minStockLevel || 10)
    );

    if (lowStockItems.length > 0) {
      insights.push({
        type: 'warning',
        title: `${lowStockItems.length} Items Low on Stock`,
        description: `Critical items: ${lowStockItems
          .slice(0, 3)
          .map(i => i.product.name)
          .join(', ')}${lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more` : ''}`,
        action: 'Generate Purchase Order',
      });
    }

    // Expiring items analysis (fallback)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringItems = inventory.filter(
      item => item.expiryDate && new Date(item.expiryDate) <= thirtyDaysFromNow
    );

    if (expiringItems.length > 0) {
      insights.push({
        type: 'warning',
        title: `${expiringItems.length} Items Expiring Soon`,
        description: `Items expiring within 30 days need attention.`,
        action: 'View Expiring Items',
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'success',
        title: 'Inventory Health: Good',
        description: 'Basic analysis complete. Enable AI for detailed insights.',
      });
    }

    setAiInsights(insights);
  }, [inventory]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (inventory.length > 0) {
      generateAIInsights();
    }
  }, [inventory, generateAIInsights]);

  const handleAddStock = async () => {
    if (!formData.productId || !formData.quantity) return;

    setSaving(true);
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
        }),
      });

      if (response.ok) {
        setShowAddDialog(false);
        setFormData({
          productId: '',
          quantity: '',
          batchNumber: '',
          serialNumber: '',
          location: '',
          expiryDate: '',
          unitCost: '',
        });
        fetchInventory();
      }
    } catch (error) {
      console.error('Error adding stock:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustData.adjustment) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/inventory/${selectedItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment: parseInt(adjustData.adjustment),
          reason: adjustData.reason,
        }),
      });

      if (response.ok) {
        setShowAdjustDialog(false);
        setSelectedItem(null);
        setAdjustData({ adjustment: '', reason: 'STOCK_COUNT' });
        fetchInventory();
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
    } finally {
      setSaving(false);
    }
  };

  // Export configuration for inventory
  const exportConfig = {
    filename: 'inventory',
    title: 'Inventory Report',
    columns: [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Product Name', key: 'productName', width: 35 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Batch Number', key: 'batchNumber', width: 18 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Available Qty', key: 'availableQuantity', width: 15 },
      { header: 'Reserved Qty', key: 'reservedQuantity', width: 15 },
      { header: 'Total Qty', key: 'totalQuantity', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      {
        header: 'Unit Cost',
        key: 'unitCost',
        width: 15,
        format: (val: unknown) => (val ? `${(val as number).toFixed(2)} KWD` : 'N/A'),
      },
      {
        header: 'Total Value',
        key: 'totalValue',
        width: 18,
        format: (val: unknown) => (val ? `${(val as number).toLocaleString()} KWD` : 'N/A'),
      },
      { header: 'Expiry Date', key: 'expiryDate', width: 15 },
      { header: 'Received Date', key: 'receivedDate', width: 15 },
    ],
  };

  // Prepare export data
  const exportData = inventory.map(item => ({
    sku: item.product.sku,
    productName: item.product.name,
    category: item.product.category || 'Uncategorized',
    batchNumber: item.batchNumber || 'N/A',
    location: item.location || 'Not assigned',
    availableQuantity: item.availableQuantity,
    reservedQuantity: item.reservedQuantity,
    totalQuantity: item.quantity,
    status: item.status,
    unitCost: item.unitCost || 0,
    totalValue: item.totalValue || 0,
    expiryDate: item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'N/A',
    receivedDate: item.receivedDate ? format(new Date(item.receivedDate), 'MMM dd, yyyy') : 'N/A',
  }));

  const categories = [...new Set(inventory.map(i => i.product.category).filter(Boolean))];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground">Track and manage your medical equipment inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            data={exportData}
            config={exportConfig}
            variant="dropdown"
            disabled={loading || inventory.length === 0}
          />
          {canCreate && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stock
            </Button>
          )}
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Inventory Insights
              <Button
                variant="ghost"
                size="sm"
                onClick={generateAIInsights}
                disabled={loadingAI}
                aria-label="Refresh AI insights"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAI ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {aiInsights.map((insight, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    insight.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : insight.type === 'success'
                        ? 'bg-green-50 border-green-200'
                        : insight.type === 'prediction'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {insight.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    ) : insight.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : insight.type === 'prediction' ? (
                      <BarChart3 className="h-4 w-4 text-purple-600 mt-0.5" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      {insight.action && (
                        <Button variant="link" size="sm" className="px-0 h-auto mt-1 text-xs">
                          {insight.action} →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Box className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">
                    KWD {stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-red-600">{stats.expiringSoon}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name, SKU, or batch..."
                aria-label="Search inventory"
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat || ''}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No inventory items found</h3>
              <p className="text-muted-foreground mt-2">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding stock'}
              </p>
              {canCreate && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stock
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU / Batch</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.product.category}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm">{item.product.sku}</p>
                        {item.batchNumber && (
                          <p className="text-xs text-muted-foreground">Batch: {item.batchNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StockLevelIndicator
                        current={item.availableQuantity}
                        min={item.product.minStockLevel}
                        max={item.product.maxStockLevel}
                      />
                      {item.reservedQuantity > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          {item.reservedQuantity} reserved
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.location || '-'}</p>
                    </TableCell>
                    <TableCell>
                      {item.expiryDate ? (
                        <div>
                          <p
                            className={`text-sm ${new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-red-600 font-medium' : ''}`}
                          >
                            {format(new Date(item.expiryDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.totalValue ? `KWD ${Number(item.totalValue).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Item actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedItem(item);
                              setShowAdjustDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Adjust Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canDelete && (
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Stock Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
            <DialogDescription>Add new inventory to the system</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Input
                value={formData.productId}
                onChange={e => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                placeholder="Search or select product"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unitCost}
                  onChange={e => setFormData(prev => ({ ...prev, unitCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input
                  value={formData.batchNumber}
                  onChange={e => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
                  placeholder="BATCH-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={formData.serialNumber}
                  onChange={e => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="SN-12345"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={formData.location}
                  onValueChange={v => setFormData(prev => ({ ...prev, location: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStock}
              disabled={saving || !formData.productId || !formData.quantity}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedItem &&
                `Adjusting: ${selectedItem.product.name} (Current: ${selectedItem.availableQuantity})`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Adjustment (+/-)</Label>
              <Input
                type="number"
                value={adjustData.adjustment}
                onChange={e => setAdjustData(prev => ({ ...prev, adjustment: e.target.value }))}
                placeholder="e.g., -5 or +10"
              />
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add, negative to remove
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select
                value={adjustData.reason}
                onValueChange={v => setAdjustData(prev => ({ ...prev, reason: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_COUNT">Stock Count Adjustment</SelectItem>
                  <SelectItem value="DAMAGED">Damaged Goods</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="RETURNED">Customer Return</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock} disabled={saving || !adjustData.adjustment}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
