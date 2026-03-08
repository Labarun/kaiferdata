/**
 * UserLayout - User dashboard wrapper
 */
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Home, Wallet, ShoppingCart, ArrowDownToLine, Bell } from "lucide-react";
import type { NavItem } from "@/layouts/DashboardLayout";

const navItems: NavItem[] = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Wallet", path: "/dashboard/wallet", icon: Wallet },
  { label: "Orders", path: "/dashboard/orders", icon: ShoppingCart },
  { label: "Deposits", path: "/dashboard/deposits", icon: ArrowDownToLine },
  { label: "Notices", path: "/dashboard/notices", icon: Bell },
];

export function UserLayout() {
  return <DashboardLayout navItems={navItems} title="Dashboard" audienceFilter="users" />;
}
