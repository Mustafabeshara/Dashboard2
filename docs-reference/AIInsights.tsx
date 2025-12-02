import { useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Brain, TrendingUp, AlertTriangle, DollarSign, Users, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartSkeleton, MetricCardSkeleton } from "@/components/LoadingSkeletons";
import { toast } from "sonner";

export default function AIInsights() {
  const [forecastMonths, setForecastMonths] = useState("3");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Fetch data
  const { data: products = [] } = trpc.crud.products.list.useQuery();
  const { data: forecast, isLoading: forecastLoading, refetch: refetchForecast } = trpc.aiAnalytics.predictDemand.useQuery(
    {
      productId: selectedProductId as number,
      months: parseInt(forecastMonths),
    },
    { enabled: !!selectedProductId }
  );

  const { data: anomalies, isLoading: anomaliesLoading, refetch: refetchAnomalies } = trpc.aiAnalytics.detectExpenseAnomalies.useQuery();
  const { data: pricingSuggestions, isLoading: pricingLoading, refetch: refetchPricing } = trpc.aiAnalytics.suggestPricing.useQuery(
    { productId: selectedProductId as number },
    { enabled: !!selectedProductId }
  );

  const handleRefreshAll = () => {
    refetchForecast();
    refetchAnomalies();
    refetchPricing();
    toast.success("AI insights refreshed");
  };

  const formatCurrency = (cents: number | null | undefined) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            AI Insights Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Powered by AI: Demand forecasting, anomaly detection, and smart recommendations
          </p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Select Product for Analysis
          </CardTitle>
          <CardDescription>
            Choose a product to see demand forecasts and pricing recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select
              value={selectedProductId?.toString() || ""}
              onValueChange={(value) => setSelectedProductId(parseInt(value))}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((product: any) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} {product.sku ? `(${product.sku})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={forecastMonths} onValueChange={setForecastMonths}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Demand Forecast */}
      {selectedProductId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Demand Forecast
            </CardTitle>
            <CardDescription>
              AI-powered prediction for the next {forecastMonths} month(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forecastLoading ? (
              <ChartSkeleton />
            ) : forecast ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Predicted Demand
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{forecast.predictedDemand || 0} units</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Confidence Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{forecast.confidence || 0}%</div>
                      <Badge variant={forecast.confidence > 70 ? "success" : "warning"} className="mt-2">
                        {forecast.confidence > 70 ? "High Confidence" : "Moderate Confidence"}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize">{forecast.trend || "Stable"}</div>
                    </CardContent>
                  </Card>
                </div>

                {forecast.insights && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">AI Insights:</p>
                    <p className="text-sm text-muted-foreground">{forecast.insights}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No forecast data available. Select a product to generate predictions.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Suggestions */}
      {selectedProductId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Smart Pricing Recommendations
            </CardTitle>
            <CardDescription>
              AI-optimized pricing based on market data and competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pricingLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <MetricCardSkeleton key={i} />
                ))}
              </div>
            ) : pricingSuggestions ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Current Price
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(pricingSuggestions.currentPrice)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Suggested Price
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(pricingSuggestions.suggestedPrice)}
                      </div>
                      <Badge variant="success" className="mt-2">
                        Optimal
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Competitor Average
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(pricingSuggestions.competitorAverage)}</div>
                    </CardContent>
                  </Card>
                </div>

                {pricingSuggestions.reasoning && (
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Pricing Strategy:</p>
                    <p className="text-sm text-muted-foreground">{pricingSuggestions.reasoning}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No pricing data available. Select a product to get recommendations.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expense Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Expense Anomaly Detection
          </CardTitle>
          <CardDescription>
            Unusual expenses flagged by AI for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {anomaliesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : anomalies && anomalies.anomalies && anomalies.anomalies.length > 0 ? (
            <div className="space-y-3">
              {anomalies.anomalies.map((anomaly: any) => (
                <Card key={anomaly.expenseId} className="border-orange-200 dark:border-orange-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">Anomaly Detected</Badge>
                          <span className="font-medium">{anomaly.description}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Amount: {formatCurrency(anomaly.amount)} | Date: {new Date(anomaly.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                          {anomaly.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Severity</div>
                        <Badge variant={anomaly.severity === "high" ? "destructive" : "warning"}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No anomalies detected. All expenses look normal!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Available AI Features</CardTitle>
          <CardDescription>
            Explore all AI-powered capabilities in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium">Demand Forecasting</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Predict future product demand based on historical data and trends
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium">Smart Pricing</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Get optimal pricing recommendations based on competitor analysis
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium">Anomaly Detection</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically identify unusual expenses and potential issues
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Users className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium">Smart Task Assignment</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  AI suggests the best team member for each task based on workload
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
