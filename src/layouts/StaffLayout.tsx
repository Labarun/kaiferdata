/**
 * StaffLayout - Restricted staff panel with support-only navigation
 */
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  LayoutDashboard, ShoppingCart, CreditCard, FileText,
  AlertTriangle,
} from "lucide-react";
import type { AdminNavGroup, AdminNavItem } from "@/layouts/AdminLayout";

const navGroups: AdminNavGroup[] = [
  {
    label: "Support",
    items: [
      { label: "Dashboard", path: "/staff", icon: LayoutDashboard },
      { label: "Orders", path: "/staff/orders", icon: ShoppingCart },
      { label: "Transactions", path: "/staff/transactions", icon: CreditCard },
      { label: "Intents", path: "/staff/intents", icon: FileText },
      { label: "Issue Queue", path: "/staff/issues", icon: AlertTriangle },
    ],
  },
];

const quickDock: AdminNavItem[] = [
  { label: "Home", path: "/staff", icon: LayoutDashboard },
  { label: "Orders", path: "/staff/orders", icon: ShoppingCart },
  { label: "Txns", path: "/staff/transactions", icon: CreditCard },
  { label: "Issues", path: "/staff/issues", icon: AlertTriangle },
];

export function StaffLayout() {
  return <AdminLayout navGroups={navGroups} quickDock={quickDock} title="Staff Panel" audienceFilter="staff" />;
}
