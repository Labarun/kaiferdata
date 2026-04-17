/**
 * Agent Subscription State helper
 * Single hook-style fn that returns a flat snapshot used by
 * <SubscriptionGate> to decide whether to lock/blur child UI.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionSnapshot {
  loading: boolean;
  hasProfile: boolean;
  profileStatus: "pending_subscription" | "active" | "subscription_expired" | "suspended" | null;
  isSubscriptionActive: boolean;
  expiresAt: string | null;
  agentProfileId: string | null;
}

export function useSubscriptionSnapshot(): SubscriptionSnapshot {
  const { user } = useAuth();
  const [snap, setSnap] = useState<SubscriptionSnapshot>({
    loading: true,
    hasProfile: false,
    profileStatus: null,
    isSubscriptionActive: false,
    expiresAt: null,
    agentProfileId: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setSnap({ loading: false, hasProfile: false, profileStatus: null, isSubscriptionActive: false, expiresAt: null, agentProfileId: null });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("agent_profiles")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        if (!cancelled) setSnap({ loading: false, hasProfile: false, profileStatus: null, isSubscriptionActive: false, expiresAt: null, agentProfileId: null });
        return;
      }

      const { data: sub } = await supabase
        .from("agent_subscriptions")
        .select("status, expires_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isActive = profile.status === "active" && sub?.status === "active" && (!sub.expires_at || new Date(sub.expires_at) > new Date());

      if (!cancelled) setSnap({
        loading: false,
        hasProfile: true,
        profileStatus: profile.status as any,
        isSubscriptionActive: isActive,
        expiresAt: sub?.expires_at ?? null,
        agentProfileId: profile.id,
      });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return snap;
}
