/**
 * UserLayout - Customer dashboard with mobile-first bottom nav
 *
 * Mobile bottom dock (Phase 1):
 *   Home · Buy Data · Agent (elevated) · Wallet · Orders
 *
 * The Agent tab routes to /agent for active agents/admins (handled by
 * ProtectedRoute) or to /dashboard/become-agent for normal users.
 */
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Home, Wifi, Wallet, ShoppingCart, Store, UserCircle, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { NavItem } from "@/layouts/DashboardLayout";

/** Extra nav items shown in desktop sidebar only (don't fit on mobile dock) */
const desktopExtra: NavItem[] = [
  { label: "Transactions", path: "/dashboard/transactions", icon: ArrowRightLeft },
  { label: "Profile", path: "/dashboard/profile", icon: UserCircle },
];

export function UserLayout() {
  const { user } = useAuth();

  // Active agents and admins go straight to /agent; everyone else sees the
  // onboarding teaser at /dashboard/become-agent.
  const agentPath =
    user?.role === "agent" || user?.role === "admin"
      ? "/agent"
      : "/dashboard/become-agent";

  const navItems: NavItem[] = [
    { label: "Home", path: "/dashboard", icon: Home },
    { label: "Buy Data", path: "/dashboard/buy", icon: Wifi },
    { label: "Agent", path: agentPath, icon: Store, featured: true },
    { label: "Wallet", path: "/dashboard/wallet", icon: Wallet },
    { label: "Orders", path: "/dashboard/orders", icon: ShoppingCart },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      desktopExtraNav={desktopExtra}
      title="Dashboard"
      audienceFilter="users"
    />
  );
}
