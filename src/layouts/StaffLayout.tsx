/**
 * StaffLayout - Restricted admin panel for staff members
 */
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  LayoutDashboard, ShoppingCart, Users, ArrowDownToLine,
  Ticket, ArrowRightLeft, UserCheck,
} from "lucide-react";
import type { AdminNavItem } from "@/layouts/AdminLayout";

const navItems: AdminNavItem[] = [
  { label: "Dashboard", path: "/staff", icon: LayoutDashboard },
  { label: "Orders", path: "/staff/orders", icon: ShoppingCart },
  { label: "Users", path: "/staff/users", icon: Users },
  { label: "Deposits", path: "/staff/deposits", icon: ArrowDownToLine },
  { label: "Tickets", path: "/staff/tickets", icon: Ticket },
  { label: "Transactions", path: "/staff/transactions", icon: ArrowRightLeft },
  { label: "Agent Applications", path: "/staff/agent-applications", icon: UserCheck },
];

export function StaffLayout() {
  return <AdminLayout navItems={navItems} title="Staff Panel" audienceFilter="staff" />;
}
