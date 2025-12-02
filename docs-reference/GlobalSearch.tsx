import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, FileText, Package, Warehouse, FileSpreadsheet, Users, Building2, Truck, CheckSquare, DollarSign, TrendingUp, File } from "lucide-react";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: results, isLoading } = trpc.search.global.useQuery(
    { query, limit: 20 },
    { enabled: query.length >= 2 }
  );

  const handleResultClick = (type: string, id: number) => {
    onOpenChange(false);
    setQuery("");
    
    // Navigate to the appropriate page
    const routes: Record<string, string> = {
      tenders: "/tenders",
      products: "/products",
      inventory: "/inventory",
      invoices: "/invoices",
      customers: "/customers",
      manufacturers: "/manufacturers",
      deliveries: "/deliveries",
      tasks: "/tasks",
      expenses: "/expenses",
      forecasts: "/forecasts",
      documents: "/documents",
    };
    
    setLocation(routes[type] || "/");
  };

  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      tenders: FileText,
      products: Package,
      inventory: Warehouse,
      invoices: FileSpreadsheet,
      customers: Users,
      manufacturers: Building2,
      deliveries: Truck,
      tasks: CheckSquare,
      expenses: DollarSign,
      forecasts: TrendingUp,
      documents: File,
    };
    
    const Icon = icons[type] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getResultTitle = (type: string, item: any) => {
    const titleFields: Record<string, string> = {
      tenders: item.reference || item.title,
      products: item.name,
      inventory: item.productName,
      invoices: item.invoiceNumber,
      customers: item.name,
      manufacturers: item.name,
      deliveries: item.trackingNumber,
      tasks: item.title,
      expenses: item.description,
      forecasts: item.productName,
      documents: item.fileName,
    };
    
    return titleFields[type] || "Unknown";
  };

  const getResultSubtitle = (type: string, item: any) => {
    const subtitleFields: Record<string, string> = {
      tenders: item.organization,
      products: item.category,
      inventory: item.location,
      invoices: item.customerName,
      customers: item.organization,
      manufacturers: item.country,
      deliveries: item.customerName,
      tasks: item.assignedTo,
      expenses: item.category,
      forecasts: item.customerName,
      documents: item.documentType,
    };
    
    return subtitleFields[type] || "";
  };

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search across all modules..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-4 pb-4">
            {query.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Type at least 2 characters to search</p>
                <p className="text-sm mt-1">Search across tenders, products, inventory, and more</p>
              </div>
            )}

            {query.length >= 2 && isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p>Searching...</p>
              </div>
            )}

            {query.length >= 2 && !isLoading && totalResults === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            )}

            {query.length >= 2 && !isLoading && results && (
              <div className="space-y-4">
                {Object.entries(results).map(([type, items]) => {
                  if (items.length === 0) return null;

                  return (
                    <div key={type}>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                        {type} ({items.length})
                      </h3>
                      <div className="space-y-1">
                        {items.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => handleResultClick(type, item.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              {getIcon(type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {getResultTitle(type, item)}
                              </p>
                              {getResultSubtitle(type, item) && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {getResultSubtitle(type, item)}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Press <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd> to close</span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-muted rounded ml-1">↓</kbd> to navigate
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use global search with keyboard shortcut
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
