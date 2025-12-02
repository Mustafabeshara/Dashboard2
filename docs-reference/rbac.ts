/**
 * Role-Based Access Control (RBAC) Utilities
 */

export type UserRole = "admin" | "user";

export type Permission =
  | "view_analytics"
  | "manage_users"
  | "manage_whitelist"
  | "delete_tenders"
  | "delete_products"
  | "delete_customers"
  | "manage_manufacturers"
  | "approve_expenses"
  | "manage_system_settings"
  | "view_all_data"
  | "export_data";

/**
 * Role-to-permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "view_analytics",
    "manage_users",
    "manage_whitelist",
    "delete_tenders",
    "delete_products",
    "delete_customers",
    "manage_manufacturers",
    "approve_expenses",
    "manage_system_settings",
    "view_all_data",
    "export_data",
  ],
  user: [
    "view_analytics",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === "admin";
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(permission => hasPermission(role, permission));
}
