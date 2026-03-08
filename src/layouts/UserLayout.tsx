/**
 * UserLayout - Customer dashboard with mobile-first bottom nav
 */
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Home, Wifi, Wallet, ShoppingCart, ArrowRightLeft, UserCircle } from "lucide-react";
import type { NavItem } from "@/layouts/DashboardLayout";

const navItems: NavItem[] = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Buy Data", path: "/dashboard/buy", icon: Wifi },
  { label: "Wallet", path: "/dashboard/wallet", icon: Wallet },
  { label: "Orders", path: "/dashboard/orders", icon: ShoppingCart },
  { label: "History", path: "/dashboard/transactions", icon: ArrowRightLeft },
];

/** Extra nav items shown in desktop sidebar only */
const desktopExtra: NavItem[] = [
  { label: "Profile", path: "/dashboard/profile", icon: UserCircle },
];

export function UserLayout() {
  return <DashboardLayout navItems={navItems} desktopExtraNav={desktopExtra} title="Dashboard" audienceFilter="users" />;
}
