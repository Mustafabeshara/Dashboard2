'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  CheckCircle,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Play,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: string[];
}

interface ReportData {
  title: string;
  generatedAt: string;
  parameters: Record<string, any>;
  summary?: Record<string, any>;
  data: any[];
  columns: { key: string; label: string }[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  Tenders: <FileText className="w-5 h-5" />,
  Budgets: <DollarSign className="w-5 h-5" />,
  Expenses: <TrendingUp className="w-5 h-5" />,
  Customers: <Users className="w-5 h-5" />,
  Invoices: <FileSpreadsheet className="w-5 h-5" />,
  Suppliers: <Package className="w-5 h-5" />,
  Inventory: <Package className="w-5 h-5" />,
};

const categoryColors: Record<string, string> = {
  Tenders: 'bg-blue-100 text-blue-700',
  Budgets: 'bg-green-100 text-green-700',
  Expenses: 'bg-orange-100 text-orange-700',
  Customers: 'bg-purple-100 text-purple-700',
  Invoices: 'bg-teal-100 text-teal-700',
  Suppliers: 'bg-yellow-100 text-yellow-700',
  Inventory: 'bg-pink-100 text-pink-700',
};

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Report generation state
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showParamsDialog, setShowParamsDialog] = useState(false);
  const [reportParams, setReportParams] = useState<Record<string, any>>({});
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch report templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedTemplate.id,
          parameters: reportParams,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      const data = await response.json();
      setReportData(data.report);
      setShowParamsDialog(false);
      setShowReportDialog(true);
      setSuccess('Report generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const openParamsDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setReportParams({});

    // Set default date range if needed
    if (template.parameters.includes('dateRange')) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setReportParams({
        startDate: firstDay.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      });
    }

    setShowParamsDialog(true);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const headers = reportData.columns.map(c => c.label).join(',');
    const rows = reportData.data.map(row =>
      reportData.columns
        .map(c => {
          const value = row[c.key];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTemplates =
    categoryFilter && categoryFilter !== 'all'
      ? templates.filter(t => t.category === categoryFilter)
      : templates;

  const categories = [...new Set(templates.map(t => t.category))];

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate business insights and analytics</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredTemplates.length} report{filteredTemplates.length !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Report Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div
                    className={`p-2 rounded-lg ${categoryColors[template.category] || 'bg-gray-100'}`}
                  >
                    {categoryIcons[template.category] || <FileText className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${categoryColors[template.category] || 'bg-gray-100'}`}
                  >
                    {template.category}
                  </span>
                </div>
                <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {template.parameters.length} parameter
                    {template.parameters.length !== 1 ? 's' : ''}
                  </span>
                  <Button size="sm" onClick={() => openParamsDialog(template)}>
                    <Play className="mr-2 h-4 w-4" />
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Parameters Dialog */}
      <Dialog open={showParamsDialog} onOpenChange={setShowParamsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - Configure report parameters
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.parameters.includes('dateRange') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={reportParams.startDate || ''}
                      onChange={e =>
                        setReportParams({ ...reportParams, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={reportParams.endDate || ''}
                      onChange={e => setReportParams({ ...reportParams, endDate: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {selectedTemplate.parameters.includes('status') && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={reportParams.status || 'all'}
                    onValueChange={value =>
                      setReportParams({
                        ...reportParams,
                        status: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="WON">Won</SelectItem>
                      <SelectItem value="LOST">Lost</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTemplate.parameters.includes('category') && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={reportParams.category || 'all'}
                    onValueChange={value =>
                      setReportParams({
                        ...reportParams,
                        category: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="MEDICAL_EQUIPMENT">Medical Equipment</SelectItem>
                      <SelectItem value="PHARMACEUTICALS">Pharmaceuticals</SelectItem>
                      <SelectItem value="LABORATORY">Laboratory</SelectItem>
                      <SelectItem value="IMAGING">Imaging</SelectItem>
                      <SelectItem value="SURGICAL">Surgical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTemplate.parameters.includes('customerType') && (
                <div className="space-y-2">
                  <Label>Customer Type</Label>
                  <Select
                    value={reportParams.customerType || 'all'}
                    onValueChange={value =>
                      setReportParams({
                        ...reportParams,
                        customerType: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="GOVERNMENT">Government</SelectItem>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTemplate.parameters.includes('lowStockOnly') && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="lowStockOnly"
                    checked={reportParams.lowStockOnly || false}
                    onChange={e =>
                      setReportParams({ ...reportParams, lowStockOnly: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="lowStockOnly">Low Stock Items Only</Label>
                </div>
              )}

              {selectedTemplate.parameters.includes('asOfDate') && (
                <div className="space-y-2">
                  <Label>As of Date</Label>
                  <Input
                    type="date"
                    value={reportParams.asOfDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setReportParams({ ...reportParams, asOfDate: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParamsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Results Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{reportData?.title}</DialogTitle>
            <DialogDescription>
              Generated on {reportData && new Date(reportData.generatedAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <CardDescription className="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </CardDescription>
                        <CardTitle className="text-2xl">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              {/* Data Table */}
              {reportData.data.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {reportData.columns.map(col => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.slice(0, 50).map((row, idx) => (
                        <TableRow key={idx}>
                          {reportData.columns.map(col => (
                            <TableCell key={col.key}>
                              {typeof row[col.key] === 'number' &&
                              col.key.toLowerCase().includes('amount')
                                ? `KWD ${row[col.key].toLocaleString()}`
                                : (row[col.key] ?? '-')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {reportData.data.length > 50 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Showing first 50 of {reportData.data.length} rows. Export to see all data.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data found for the selected parameters.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Close
            </Button>
            {reportData && reportData.data.length > 0 && (
              <Button onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
