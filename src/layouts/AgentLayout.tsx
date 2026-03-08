/**
 * AgentLayout - Agent dashboard wrapper
 */
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Home, Store, ShoppingCart, DollarSign, CreditCard, Bell } from "lucide-react";
import type { NavItem } from "@/layouts/DashboardLayout";

const navItems: NavItem[] = [
  { label: "Home", path: "/agent", icon: Home },
  { label: "Store", path: "/agent/store", icon: Store },
  { label: "Orders", path: "/agent/orders", icon: ShoppingCart },
  { label: "Earnings", path: "/agent/earnings", icon: DollarSign },
  { label: "Subscription", path: "/agent/subscription", icon: CreditCard },
  // Notices accessible but not in bottom nav (only first 5 show on mobile)
];

export function AgentLayout() {
  return <DashboardLayout navItems={navItems} title="Agent Dashboard" audienceFilter="agents" />;
}
