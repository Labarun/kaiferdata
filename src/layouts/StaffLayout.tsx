/**
 * StaffLayout - Restricted staff panel with support-only navigation
 */
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  LayoutDashboard, ShoppingCart, CreditCard, FileText,
  AlertTriangle,
} from "lucide-react";
import type { AdminNavItem } from "@/layouts/AdminLayout";

const navItems: AdminNavItem[] = [
  { label: "Dashboard", path: "/staff", icon: LayoutDashboard },
  { label: "Orders", path: "/staff/orders", icon: ShoppingCart },
  { label: "Transactions", path: "/staff/transactions", icon: CreditCard },
  { label: "Intents", path: "/staff/intents", icon: FileText },
  { label: "Issue Queue", path: "/staff/issues", icon: AlertTriangle },
];

export function StaffLayout() {
  return <AdminLayout navItems={navItems} title="Staff Panel" audienceFilter="staff" />;
}
