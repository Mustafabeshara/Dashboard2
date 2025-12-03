'use client';

import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Download,
  Edit,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  manufacturer?: string;
  description?: string;
  unitPrice: number;
  costPrice?: number;
  currency: string;
  unit: string;
  minStockLevel: number;
  maxStockLevel?: number;
  reorderPoint: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    inventory: number;
  };
}

interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  lowStock: number;
  categories: number;
}

interface InventoryOptimization {
  predictedDemand: number;
  demandTrend: string;
  seasonalityFactor: number;
  recommendations: {
    reorderPoint: number;
    reorderQuantity: number;
    safetyStock: number;
  };
  stockoutRisk: number;
  costAnalysis: {
    carryingCost: number;
    potentialSavings: number;
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [optimizingProduct, setOptimizingProduct] = useState<string | null>(null);
  const [selectedOptimization, setSelectedOptimization] = useState<InventoryOptimization | null>(
    null
  );
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('isActive', statusFilter);

      const response = await fetch(`/api/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async (productId: string) => {
    setOptimizingProduct(productId);
    try {
      const response = await fetch(`/api/inventory/products/${productId}/optimize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to optimize inventory');
      }

      const data = await response.json();
      setSelectedOptimization(data.optimization);
      setShowOptimizationModal(true);
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Failed to optimize inventory. Please try again.');
    } finally {
      setOptimizingProduct(null);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-600';
    if (risk >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatCurrency = (amount: number, currency = 'KWD') => {
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-7 w-7 text-blue-600" />
                Products Catalog
              </h1>
              <p className="text-gray-600 mt-1">Manage your product inventory and pricing</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Product
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-xl font-bold text-gray-900">{stats?.total || products.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-bold text-green-600">
                  {stats?.active || products.filter(p => p.isActive).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-xl font-bold text-gray-600">
                  {stats?.inactive || products.filter(p => !p.isActive).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-xl font-bold text-red-600">{stats?.lowStock || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-xl font-bold text-purple-600">
                  {stats?.categories || categories.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, SKU, or description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filter by Category"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filter by Status"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No products found</h3>
              <p className="text-gray-500 mt-2">Get started by adding your first product</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="inline h-4 w-4 mr-2" />
                Add Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">SKU</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Category
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">
                      Unit Price
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">
                      Cost Price
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                      Min Stock
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          {product.manufacturer && (
                            <p className="text-sm text-gray-500">{product.manufacturer}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm">{product.sku}</code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(product.unitPrice, product.currency)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {product.costPrice
                          ? formatCurrency(product.costPrice, product.currency)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-700">
                        {product.minStockLevel} {product.unit}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            product.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOptimize(product.id)}
                            disabled={optimizingProduct === product.id}
                            className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg disabled:opacity-50"
                            title="Optimize Inventory"
                          >
                            {optimizingProduct === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Brain className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="PRD-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select className="w-full px-3 py-2 border rounded-lg" title="Category">
                    <option>Select category</option>
                    <option>Medical Equipment</option>
                    <option>Pharmaceuticals</option>
                    <option>Supplies</option>
                    <option>Devices</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Manufacturer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select className="w-full px-3 py-2 border rounded-lg" title="Unit">
                    <option>piece</option>
                    <option>box</option>
                    <option>pack</option>
                    <option>kg</option>
                    <option>liter</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Product description..."
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Modal */}
      {showOptimizationModal && selectedOptimization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Inventory Optimization</h2>
                </div>
                <button
                  onClick={() => setShowOptimizationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Demand Forecast */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  {getTrendIcon(selectedOptimization.demandTrend)}
                  Demand Forecast
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-blue-700">Predicted Demand</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {selectedOptimization.predictedDemand}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Trend</p>
                    <p className="text-2xl font-bold text-blue-900 capitalize">
                      {selectedOptimization.demandTrend}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Seasonality Factor</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {selectedOptimization.seasonalityFactor.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reorder Recommendations */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-3">Reorder Recommendations</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-green-700">Reorder Point</p>
                    <p className="text-2xl font-bold text-green-900">
                      {selectedOptimization.recommendations.reorderPoint}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Reorder Quantity</p>
                    <p className="text-2xl font-bold text-green-900">
                      {selectedOptimization.recommendations.reorderQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Safety Stock</p>
                    <p className="text-2xl font-bold text-green-900">
                      {selectedOptimization.recommendations.safetyStock}
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk & Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-3">Stockout Risk</h3>
                  <div className="flex items-end gap-2">
                    <span
                      className={`text-4xl font-bold ${getRiskColor(
                        selectedOptimization.stockoutRisk
                      )}`}
                    >
                      {selectedOptimization.stockoutRisk}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        selectedOptimization.stockoutRisk >= 70
                          ? 'bg-red-500'
                          : selectedOptimization.stockoutRisk >= 40
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${selectedOptimization.stockoutRisk}%` }}
                    />
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-3">Cost Analysis</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-purple-700">Carrying Cost</p>
                      <p className="text-xl font-bold text-purple-900">
                        {formatCurrency(selectedOptimization.costAnalysis.carryingCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-700">Potential Savings</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedOptimization.costAnalysis.potentialSavings)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowOptimizationModal(false)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
