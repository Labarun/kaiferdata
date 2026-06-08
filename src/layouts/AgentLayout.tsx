/**
 * AgentLayout - Agent dashboard wrapper
 * 4-tab bottom dock + "More" sheet for secondary destinations.
 */
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Home, ShoppingCart, DollarSign, ArrowDownToLine, Store, CreditCard, Tag, Megaphone, Users, ListChecks, Layers } from "lucide-react";
import type { NavItem } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AgentMoreSheet } from "@/components/agent/AgentMoreSheet";

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/agent", icon: Home },
  { label: "Orders", path: "/agent/orders", icon: ShoppingCart },
  { label: "Buy Data", path: "/agent/bulk", icon: Layers },
  { label: "Earnings", path: "/agent/earnings", icon: DollarSign },
];

const desktopExtra: NavItem[] = [
  { label: "Pricing", path: "/agent/pricing", icon: Tag },
  { label: "Marketing", path: "/agent/marketing", icon: Megaphone },
  { label: "Customers", path: "/agent/customers", icon: Users },
  { label: "Transactions", path: "/agent/transactions", icon: ListChecks },
  { label: "Withdraw", path: "/agent/withdraw", icon: ArrowDownToLine },
  { label: "Store", path: "/agent/store", icon: Store },
  { label: "Subscription", path: "/agent/subscription", icon: CreditCard },
];

export function AgentLayout() {
  const { user } = useAuth();
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    supabase
      .from("agent_profiles")
      .select("store_slug")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setStoreSlug(data?.store_slug ?? null); });
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <DashboardLayout
      navItems={navItems}
      desktopExtraNav={desktopExtra}
      title="Agent Dashboard"
      audienceFilter="agents"
      mobileExtraDockSlot={<AgentMoreSheet storeSlug={storeSlug} />}
    />
  );
}
