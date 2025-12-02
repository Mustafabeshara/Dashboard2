// These will be replaced with full implementations over time

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

export function InventoryPage() {
  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="w-5 h-5" />
            Inventory Management
          </CardTitle>
          <CardDescription>
            Track stock levels, manage products, and monitor inventory value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Full inventory management system coming soon. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-sm">
            <li>Stock level tracking with low stock alerts</li>
            <li>Product management with SKU and batch numbers</li>
            <li>Warehouse location tracking</li>
            <li>Document upload for POs and delivery notes</li>
            <li>Inventory movement history</li>
            <li>Excel/CSV export</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProductsPage() {
  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="w-5 h-5" />
            Products & Manufacturers
          </CardTitle>
          <CardDescription>
            Manage product catalog, manufacturers, and competitor tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Full product management system coming soon. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-sm">
            <li>Product catalog with SKU and specifications</li>
            <li>Manufacturer/supplier management</li>
            <li>Competitor product tracking</li>
            <li>Product pricing and cost tracking</li>
            <li>Document upload for product specs and certificates</li>
            <li>Excel/CSV export</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export function TasksPage() {
  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="w-5 h-5" />
            Task Management
          </CardTitle>
          <CardDescription>
            Track tasks, assignments, and deadlines