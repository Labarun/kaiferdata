/**
 * FullAdminLayout - Admin panel wrapper with full navigation
 */
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  LayoutDashboard, ShoppingCart, ArrowRightLeft, Scale, ArrowDownToLine,
  Users, UserCheck, Ticket, BarChart3, Bell, Settings, Shield,
} from "lucide-react";
import type { AdminNavItem } from "@/layouts/AdminLayout";

const navItems: AdminNavItem[] = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { label: "Transactions", path: "/admin/transactions", icon: ArrowRightLeft },
  { label: "Reconciliation", path: "/admin/reconciliation", icon: Scale },
  { label: "Deposits", path: "/admin/deposits", icon: ArrowDownToLine },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Agents", path: "/admin/agents", icon: UserCheck },
  { label: "Tickets", path: "/admin/tickets", icon: Ticket },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Notices", path: "/admin/notices", icon: Bell },
  { label: "System Controls", path: "/admin/system-controls", icon: Settings },
  { label: "Staff", path: "/admin/staff", icon: Shield },
];

export function FullAdminLayout() {
  return <AdminLayout navItems={navItems} title="Admin Panel" audienceFilter="admins" />;
}
