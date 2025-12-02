import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation component
 * Automatically generates breadcrumbs from current path or accepts custom items
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const [location] = useLocation();

  // Generate breadcrumbs from path if not provided
  const breadcrumbs = items || generateBreadcrumbsFromPath(location);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>
      
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={item.path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link 
                href={item.path}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Generate breadcrumbs from URL path
 */
function generateBreadcrumbsFromPath(path: string): BreadcrumbItem[] {
  if (path === "/") return [];

  const segments = path.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Map of path segments to readable labels
  const labelMap: Record<string, string> = {
    "tenders": "Tenders",
    "templates": "Templates",
    "documents": "Documents",
    "inventory": "Inventory",
    "products": "Products",
    "manufacturers": "Manufacturers",
    "customers": "Customers",
    "tasks": "Tasks",
    "forecasts": "Forecasts",
    "deliveries": "Deliveries",
    "invoices": "Invoices",
    "expenses": "Expenses",
    "chat": "AI Assistant",
    "analytics": "Analytics",
    "bulk": "Bulk Upload",
    "new": "New",
    "edit": "Edit",
    "view": "View",
    "settings": "Settings",
    "notifications": "Notifications",
  };

  let currentPath = "";
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = labelMap[segment] || capitalize(segment);
    breadcrumbs.push({ label, path: currentPath });
  });

  return breadcrumbs;
}

/**
 * Capitalize first letter of string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
