/**
 * Shared hooks for the Special Bundle flow.
 *
 * The same pages are mounted under BOTH the user dashboard (`/dashboard/special`)
 * and the agent panel (`/agent/special`). These helpers keep navigation and
 * pricing-tier resolution context-aware without duplicating logic.
 */
import { useLocation } from "react-router-dom";
import { useSubscriptionSnapshot } from "@/services/agentSubscriptionState";
import { resolveTier, type SpecialPriceTier } from "@/services/specialBundles";

/** Base path for the offer, scoped to whichever panel the user is in. */
export function useSpecialBase(): { base: string; home: string; isAgentPanel: boolean } {
  const { pathname } = useLocation();
  const isAgentPanel = pathname.startsWith("/agent");
  return {
    base: isAgentPanel ? "/agent/special" : "/dashboard/special",
    home: isAgentPanel ? "/agent" : "/dashboard",
    isAgentPanel,
  };
}

/** Resolve the viewer's pricing tier. Active agents pay the agent price. */
export function useSpecialTier(): { tier: SpecialPriceTier; isActiveAgent: boolean; loading: boolean } {
  const snap = useSubscriptionSnapshot();
  return {
    tier: resolveTier(snap.isSubscriptionActive),
    isActiveAgent: snap.isSubscriptionActive,
    loading: snap.loading,
  };
}
