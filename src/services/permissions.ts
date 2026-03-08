/**
 * Kaiferdata Permission Utilities
 * Centralized access control for routes and components.
 */
import type { AppRole } from "@/services/auth";

/** Role hierarchy: higher index = lower privilege */
const ROLE_HIERARCHY: AppRole[] = ["admin", "staff", "agent", "user"];

/** Check if a role has at least the given minimum role level */
export function hasMinimumRole(userRole: AppRole, minimumRole: AppRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) <= ROLE_HIERARCHY.indexOf(minimumRole);
}

/** Route access definitions */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  // Public routes - no auth needed (handled separately)
  
  // User dashboard routes
  "/dashboard": ["user", "agent", "admin", "staff"],
  
  // Agent routes
  "/agent": ["agent", "admin"],
  
  // Staff routes
  "/staff": ["staff", "admin"],
  
  // Admin routes
  "/admin": ["admin"],
};

/** Check if a role can access a given route prefix */
export function canAccessRoute(role: AppRole, routePrefix: string): boolean {
  const allowedRoles = ROUTE_ACCESS[routePrefix];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/** Staff-accessible admin pages (restricted set) */
export const STAFF_PAGES = [
  "dashboard",
  "orders",
  "users",
  "deposits",
  "tickets",
  "transactions",
  "agent-applications",
] as const;

/** Full admin pages */
export const ADMIN_PAGES = [
  "dashboard",
  "orders",
  "transactions",
  "reconciliation",
  "deposits",
  "users",
  "agents",
  "tickets",
  "analytics",
  "notices",
  "system-controls",
  "staff",
] as const;
