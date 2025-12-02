    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const forecastedQuantity = formData.get("forecastedQuantity") as string;
    const forecastedRevenue = formData.get("forecastedRevenue") as string;
    const actualQuantity = formData.get("actualQuantity") as string;
    const actualRevenue = formData.get("actualRevenue") as string;

    createMutation.mutate({
      forecastType: forecastType,
      productId: createProductId ? parseInt(createProductId) : undefined,
      customerId: createCustomerId ? parseInt(createCustomerId) : undefined,
      department: formData.get("department") as string || undefined,
      milestone: formData.get("milestone") as string || undefined,
      periodStart: new Date(formData.get("periodStart") as string),
      periodEnd: new Date(formData.get("periodEnd") as string),
      forecastedQuantity: forecastedQuantity ? parseInt(forecastedQuantity) : undefined,
      forecastedRevenue: forecastedRevenue ? Math.round(parseFloat(forecastedRevenue) * 100) : undefined,
      actualQuantity: actualQuantity ? parseInt(actualQuantity) : undefined,
      actualRevenue: actualRevenue ? Math.round(parseFloat(actualRevenue) * 100) : undefined,
      currency: "USD",
      notes: formData.get("notes") as string || undefined,
    });
    // Reset state
    setForecastType(FORECAST_TYPE.PRODUCT);
    setCreateProductId("");
    setCreateCustomerId("");
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const forecastedQuantity = formData.get("forecastedQuantity") as string;
    const forecastedRevenue = formData.get("forecastedRevenue") as string;
    const actualQuantity = formData.get("actualQuantity") as string;
    const actualRevenue = formData.get("actualRevenue") as string;

    updateMutation.mutate({
      id: editingItem.id,
      actualQuantity: actualQuantity ? parseInt(actualQuantity) : undefined,
      actualRevenue: actualRevenue ? Math.round(parseFloat(actualRevenue) * 100) : undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const formatCurrency = (cents?: number | null) => {
    if (!cents) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const getForecastTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      product: { variant: "info", className: "" },
      customer: { variant: "success", className: "" },
      department: { variant: "warning", className: "" },
      milestone: { variant: "default", className: "bg-purple-600" },
    };
    const config = variants[type] || variants.product;
    return <Badge variant={config.variant} className={config.className}>{type}</Badge>;
  };

  const handleExportCSV = () => {
    const exportData = filteredForecasts.map((forecast: any) => ({
      'Type': forecast.type || '',
      'Product': forecast.productId ? products.find((p: any) => p.id === forecast.productId)?.name || '' : '',
      'Customer': forecast.customerId ? customers.find((c: any) => c.id === forecast.customerId)?.name || '' : '',
      'Department': forecast.department || '',
      'Milestone': forecast.milestone || '',
      'Period Start': formatDate(forecast.periodStart),
      'Period End': formatDate(forecast.periodEnd),
      'Forecasted Quantity': forecast.forecastedQuantity || '',
      'Forecasted Revenue': formatCurrency(forecast.forecastedRevenue),
      'Actual Quantity': forecast.actualQuantity || '',
      'Actual Revenue': formatCurrency(forecast.actualRevenue),
      'Notes': forecast.notes || ''
    }));
    exportToCSV(exportData, 'forecasts');
    toast.success('Forecasts exported to CSV');
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-teal-600" />
            Forecasts Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track forecasts by product, customer, department, or milestone
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">