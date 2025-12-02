import { ReactNode } from "react";
import { Breadcrumbs } from "./Breadcrumbs";

interface PageWrapperProps {
  children: ReactNode;
  /** Show breadcrumbs navigation */
  showBreadcrumbs?: boolean;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Page Wrapper Component
 * Provides consistent layout with optional breadcrumbs
 */
export function PageWrapper({
  children,
  showBreadcrumbs = true,
  className = "",
}: PageWrapperProps) {
  return (
    <div className={className}>
      {showBreadcrumbs && <Breadcrumbs />}
      {children}
    </div>
  );
}
