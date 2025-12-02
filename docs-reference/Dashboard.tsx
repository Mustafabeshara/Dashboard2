import { useMemo } from "react";
import { FileText, Package, TrendingUp, DollarSign, Calendar, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// Loading skeleton for dashboard cards
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: tenders, isLoading: tendersLoading, error: tendersError } = trpc.tenders.list.useQuery();
  const { data: inventory, isLoading: inventoryLoading, error: inventoryError } = trpc.inventory.list.useQuery();
  const { data: lowStockItems, isLoading: lowStockLoading } = trpc.inventory.lowStock.useQuery();
  const { data: invoices, isLoading: invoicesLoading, error: invoicesError } = trpc.invoices.list.useQuery();
  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery();

  const isLoading = tendersLoading || inventoryLoading || invoicesLoading || tasksLoading;
  const hasError = tendersError || inventoryError || invoicesError;

  // Memoized calculations to prevent unnecessary re-renders
  const openTenders = useMemo(() => tenders?.filter(t => t.status === "open").length || 0, [tenders]);
  const awardedTenders = useMemo(() => tenders?.filter(t => t.status === "awarded").length || 0, [tenders]);
  const pendingInvoices = useMemo(() => invoices?.filter(i => i.status === "sent" || i.status === "draft").length || 0, [invoices]);
  const pendingTasks = useMemo(() => tasks?.filter(t => t.status === "pending" || t.status === "in_progress").length || 0, [tasks]);

  const totalInventoryValue = useMemo(() =>
    inventory?.reduce((sum, item) => sum + ((item.unitCost || 0) * item.quantity), 0) || 0,
    [inventory]
  );

  const totalPendingInvoiceValue = useMemo(() =>
    invoices?.filter(i => i.status === "sent" || i.status === "draft")
      .reduce((sum, inv) => sum + inv.totalAmount, 0) || 0,
    [invoices]
  );

  // Show loading skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (hasError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your medical distribution business
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading dashboard data</AlertTitle>
          <AlertDescription>
            {tendersError?.message || inventoryError?.message || invoicesError?.message || "An unexpected error occurred"}
            <Button variant="outline" size="sm" className="ml-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6">
      {/* Geometric background shapes */}
      <div className="geometric-bg-shapes" />
      
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your medical distribution business
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-xl transition-all cursor-pointer border-l-[3px] border-l-[oklch(0.25_0.10_240)] bg-gradient-to-br from-[oklch(0.94_0.04_240)] to-white shadow-md" onClick={() => setLocation("/tenders")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-[oklch(0.25_0.10_240)]">
                Open Tenders
              </CardTitle>
              <div className="p-2 bg-[oklch(0.88_0.05_240)] rounded-lg">
                <FileText className="w-5 h-5 text-[oklch(0.25_0.10_240)] stroke-[2.5]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[oklch(0.25_0.10_240)]">{openTenders}</div>
            <p className="text-xs text-[oklch(0.35_0.10_240)] mt-1 font-semibold">
              {awardedTenders} awarded this month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all cursor-pointer border-l-[3px] border-l-[oklch(0.68_0.24_40)] bg-gradient-to-br from-[oklch(0.94_0.10_40)] to-white shadow-md" onClick={() => setLocation("/inventory")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-[oklch(0.25_0.10_240)]">
                Inventory Value
              </CardTitle>
              <div className="p-2 bg-[oklch(0.88_0.12_40)] rounded-lg">
                <Package className="w-5 h-5 text-[oklch(0.25_0.10_240)] stroke-[2.5]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[oklch(0.25_0.10_240)]">{formatCurrency(totalInventoryValue)}</div>
            <p className="text-xs text-[oklch(0.35_0.10_240)] mt-1 font-semibold">
              {inventory?.length || 0} items in stock
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all cursor-pointer border-l-[3px] border-l-[oklch(0.62_0.26_35)] bg-gradient-to-br from-[oklch(0.94_0.12_35)] to-white shadow-md" onClick={() => setLocation("/invoices")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-[oklch(0.25_0.10_240)]">
                Pending Invoices
              </CardTitle>
              <div className="p-2 bg-[oklch(0.88_0.14_35)] rounded-lg">
                <DollarSign className="w-5 h-5 text-[oklch(0.25_0.10_240)] stroke-[2.5]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[oklch(0.25_0.10_240)]">{formatCurrency(totalPendingInvoiceValue)}</div>
            <p className="text-xs text-[oklch(0.35_0.10_240)] mt-1 font-semibold">
              {pendingInvoices} invoices pending
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all cursor-pointer border-l-[3px] border-l-[oklch(0.72_0.20_45)] bg-gradient-to-br from-[oklch(0.94_0.10_45)] to-white shadow-md" onClick={() => setLocation("/tasks")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-[oklch(0.25_0.10_240)]">
                Active Tasks
              </CardTitle>
              <div className="p-2 bg-[oklch(0.88_0.12_45)] rounded-lg">
                <CheckCircle className="w-5 h-5 text-[oklch(0.25_0.10_240)] stroke-[2.5]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[oklch(0.25_0.10_240)]">{pendingTasks}</div>
            <p className="text-xs text-[oklch(0.35_0.10_240)] mt-1 font-semibold">
              {tasks?.length || 0} total tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Items below minimum stock level</CardDescription>
              </div>
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems && lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">Product ID: {item.productId}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {item.quantity} | Min: {item.minimumStock}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 ml-2">
                      Low Stock
                    </Badge>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation("/inventory")}>
                    View All ({lowStockItems.length})
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">
                All items are adequately stocked
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Tenders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Tenders</CardTitle>
                <CardDescription>Latest tender activity</CardDescription>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            {tenders && tenders.length > 0 ? (
              <div className="space-y-3">
                {tenders.slice(0, 5).map((tender) => (
                  <div
                    key={tender.id}
                    className="flex items-center justify-between p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                    onClick={() => setLocation(`/tenders/${tender.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tender.reference}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tender.organization || "N/A"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        tender.status === "open"
                          ? "bg-blue-500/10 text-blue-500"
                          : tender.status === "awarded"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-gray-500/10 text-gray-500"
                      }
                    >
                      {tender.status}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation("/tenders")}>
                  View All Tenders
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-muted-foreground text-sm">No tenders yet</p>
                <Button size="sm" onClick={() => setLocation("/tenders")}>
                  Create First Tender
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all" onClick={() => setLocation("/tenders")}>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-blue-700">New Tender</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-teal-200 hover:bg-teal-50 hover:border-teal-400 transition-all" onClick={() => setLocation("/documents")}>
              <div className="p-2 bg-teal-100 rounded-lg">
                <Package className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-sm font-medium text-teal-700">Upload Document</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-400 transition-all" onClick={() => setLocation("/deliveries")}>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-orange-700">Schedule Delivery</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-all" onClick={() => setLocation("/expenses")}>
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-purple-700">Add Expense</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
