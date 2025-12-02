import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Tenders from "./pages/Tenders";
import TenderDetail from "./pages/TenderDetail";
import Documents from "./pages/Documents";
import Analytics from "./pages/Analytics";
import TenderDocumentUpload from "./components/TenderDocumentUpload";
import BulkTenderReview from "./pages/BulkTenderReview";
import { ExpensesPageNew } from "./pages/Expenses";
import { InvoicesPageNew } from "./pages/Invoices";
import { ForecastsPageNew } from "./pages/Forecasts";
import TasksEnhanced from "./pages/TasksEnhanced";
import { ProductsPage } from "./pages/Products";
import { InventoryPage } from "./pages/Inventory";
import { DeliveriesPage } from "./pages/Deliveries";
import { ManufacturersPage } from "./pages/Manufacturers";
import ManufacturerDetail from "./pages/ManufacturerDetail";
import { CustomersPage } from "./pages/Customers";
import Templates from "./pages/Templates";
import AIAssistant from "./pages/AIAssistant";
import AIInsights from "./pages/AIInsights";
import NotificationSettings from "./pages/NotificationSettings";
import DocumentSearchPage from "./pages/DocumentSearchPage";


function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      )} />
      
      <Route path="/tenders" component={() => (
        <DashboardLayout>
          <Tenders />
        </DashboardLayout>
      )} />
      
      <Route path="/tenders/upload" component={() => (
        <DashboardLayout>
          <div className="container py-6">
            <TenderDocumentUpload onSuccess={() => window.location.href = '/tenders'} />
          </div>
        </DashboardLayout>
      )} />
      
      <Route path="/tenders/bulk" component={() => (
        <DashboardLayout>
          <BulkTenderReview />
        </DashboardLayout>
      )} />
      
      <Route path="/tenders/:id" component={() => (
        <DashboardLayout>
          <TenderDetail />
        </DashboardLayout>
      )} />
      
      <Route path="/documents" component={() => (
        <DashboardLayout>
          <Documents />
        </DashboardLayout>
      )} />
      
      <Route path="/documents/search" component={() => (
        <DashboardLayout>
          <DocumentSearchPage />
        </DashboardLayout>
      )} />
      
      <Route path="/analytics" component={() => (
        <DashboardLayout>
          <Analytics />
        </DashboardLayout>
      )} />

      <Route path="/inventory" component={() => (
        <DashboardLayout>
          <InventoryPage />
        </DashboardLayout>
      )} />

      <Route path="/products" component={() => (
        <DashboardLayout>
          <ProductsPage />
        </DashboardLayout>
      )} />

      <Route path="/tasks" component={() => (
        <DashboardLayout>
          <TasksEnhanced />
        </DashboardLayout>
      )} />

      <Route path="/invoices" component={() => (
        <DashboardLayout>
          <InvoicesPageNew />
        </DashboardLayout>
      )} />

      <Route path="/expenses" component={() => (
        <DashboardLayout>
          <ExpensesPageNew />
        </DashboardLayout>
      )} />

      <Route path="/deliveries" component={() => (
        <DashboardLayout>
          <DeliveriesPage />
        </DashboardLayout>
      )} />

      <Route path="/forecasts" component={() => (
        <DashboardLayout>
          <ForecastsPageNew />
        </DashboardLayout>
      )} />

      <Route path="/manufacturers" component={() => (
        <DashboardLayout>
          <ManufacturersPage />
        </DashboardLayout>
      )} />
      
      <Route path="/manufacturers/:id" component={() => (
        <DashboardLayout>
          <ManufacturerDetail />
        </DashboardLayout>
      )} />

      <Route path="/customers" component={() => (
        <DashboardLayout>
          <CustomersPage />
        </DashboardLayout>
      )} />

      <Route path="/templates" component={() => (
        <DashboardLayout>
          <Templates />
        </DashboardLayout>
      )} />
      
      <Route path="/ai-assistant" component={() => (
        <DashboardLayout>
          <AIAssistant />
        </DashboardLayout>
      )} />
      
      <Route path="/ai-insights" component={() => (
        <DashboardLayout>
          <AIInsights />
        </DashboardLayout>
      )} />
      
      <Route path="/settings/notifications" component={() => (
        <DashboardLayout>
          <NotificationSettings />
        </DashboardLayout>
      )} />
      

      
      <Route path="/chat" component={() => (
        <DashboardLayout>
          <div className="container py-6">
            <h1 className="text-3xl font-bold">AI Assistant</h1>
            <p className="text-muted-foreground mt-2">Coming soon...</p>
          </div>
        </DashboardLayout>
      )} />
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
