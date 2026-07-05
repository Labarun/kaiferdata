/**
 * FullAdminLayout - Admin panel wrapper with grouped, mobile-first navigation
 */
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  LayoutDashboard, ShoppingCart, ArrowRightLeft, Scale, ArrowDownToLine,
  Users, UserCheck, BarChart3, Bell, Settings, Shield, FileText, Package, Server,
  Banknote, ShieldAlert, Sparkles, BookOpen,
} from "lucide-react";
import type { AdminNavGroup, AdminNavItem } from "@/layouts/AdminLayout";

const navGroups: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Orders", path: "/admin/orders", icon: ShoppingCart },
      { label: "Transactions", path: "/admin/transactions", icon: ArrowRightLeft },
      { label: "Payment Intents", path: "/admin/intents", icon: FileText },
      { label: "Reconciliation", path: "/admin/reconciliation", icon: Scale },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Packages", path: "/admin/packages", icon: Package },
      { label: "Suppliers", path: "/admin/supplier", icon: Server },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Blog Editor", path: "/admin/blog", icon: BookOpen },
    ],
  },
  {
    label: "Special Bundles",
    items: [
      { label: "Special Orders", path: "/admin/special-orders", icon: Sparkles },
      { label: "Special Packages", path: "/admin/special-packages", icon: Sparkles },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Agents", path: "/admin/agents", icon: UserCheck },
      { label: "Withdrawals", path: "/admin/withdrawals", icon: Banknote },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Security", path: "/admin/security", icon: ShieldAlert },
      { label: "System Controls", path: "/admin/system-controls", icon: Settings },
      { label: "Notices", path: "/admin/notices", icon: Bell },
    ],
  },
];

// Most-used destinations for the mobile bottom dock ("More" is appended automatically).
const quickDock: AdminNavItem[] = [
  { label: "Home", path: "/admin", icon: LayoutDashboard },
  { label: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { label: "Payouts", path: "/admin/withdrawals", icon: Banknote },
  { label: "Special", path: "/admin/special-orders", icon: Sparkles },
];

export function FullAdminLayout() {
  return <AdminLayout navGroups={navGroups} quickDock={quickDock} title="Admin Panel" audienceFilter="admins" />;
}
