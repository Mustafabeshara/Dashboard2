import { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { hasPermission, Permission, isAdmin } from "@/lib/rbac";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProtectedActionProps {
  /** Permission required to show the action */
  permission?: Permission;
  /** Require admin role */
  requireAdmin?: boolean;
  /** Children to render if user has permission */
  children: ReactNode;
  /** Fallback to render if user doesn't have permission */
  fallback?: ReactNode;
  /** Show disabled state instead of hiding */
  showDisabled?: boolean;
  /** Tooltip message when disabled */
  disabledMessage?: string;
}

/**
 * Protected Action Component
 * Conditionally renders children based on user permissions
 */
export function ProtectedAction({
  permission,
  requireAdmin = false,
  children,
  fallback = null,
  showDisabled = false,
  disabledMessage = "You don't have permission to perform this action",
}: ProtectedActionProps) {
  const { user } = useAuth();
  const userRole = user?.role;

  // Check permissions
  const hasAccess = requireAdmin
    ? isAdmin(userRole)
    : permission
    ? hasPermission(userRole, permission)
    : true;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-not-allowed opacity-50">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{disabledMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <>{fallback}</>;
}

/**
 * Admin Only Component
 * Shorthand for requiring admin role
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ProtectedAction requireAdmin fallback={fallback}>
      {children}
    </ProtectedAction>
  );
}

/**
 * Hook to check if user has permission
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return isAdmin(user?.role);
}
