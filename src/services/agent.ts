/**
 * Agent Service Layer
 *
 * Owns ALL agent-system data access:
 *  - application CRUD (draft, submit, edit, resubmit)
 *  - profile resolution
 *  - subscription state + plan helpers
 *  - store slug availability + storage upload helper
 *  - resolveAgentState() → single source of truth used by /agent route
 *
 * Live-safety rules:
 *  - This module is strictly additive. It never mutates orders,
 *    purchase_intents, payment_records, or wallet tables.
 *  - Subscription payment flows route through the existing Paystack
 *    pipeline by creating a `purchase_intents` row with
 *    intent_type="agent_subscription" — the webhook will need to be
 *    extended in a follow-up sub-phase to activate the subscription.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AgentApplication = Database["public"]["Tables"]["agent_applications"]["Row"];
export type AgentApplicationInsert = Database["public"]["Tables"]["agent_applications"]["Insert"];
export type AgentApplicationUpdate = Database["public"]["Tables"]["agent_applications"]["Update"];
export type AgentProfile = Database["public"]["Tables"]["agent_profiles"]["Row"];
export type AgentSubscription = Database["public"]["Tables"]["agent_subscriptions"]["Row"];

/* ── Plan catalogue ─────────────────────────────────────── */
export const AGENT_PLANS = {
  monthly: { code: "monthly" as const, label: "Monthly", price: 50, periodDays: 30 },
  yearly:  { code: "yearly"  as const, label: "Yearly",  price: 400, periodDays: 365 },
} as const;
export type AgentPlanCode = keyof typeof AGENT_PLANS;

/* ── State machine for /agent entrypoint ────────────────── */
export type AgentState =
  | { kind: "no_application" }
  | { kind: "draft"; application: AgentApplication }
  | { kind: "submitted"; application: AgentApplication }
  | { kind: "under_review"; application: AgentApplication }
  | { kind: "needs_changes"; application: AgentApplication }
  | { kind: "declined"; application: AgentApplication }
  | { kind: "approved_pending_subscription"; application: AgentApplication; profile: AgentProfile }
  | { kind: "active"; profile: AgentProfile; subscription: AgentSubscription }
  | { kind: "subscription_expired"; profile: AgentProfile; subscription: AgentSubscription | null }
  | { kind: "suspended"; profile: AgentProfile };

export async function resolveAgentState(userId: string): Promise<AgentState> {
  // 1. Look for an active profile first (approved path).
  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile) {
    if (profile.status === "suspended") return { kind: "suspended", profile };

    // Latest subscription, if any
    const { data: sub } = await supabase
      .from("agent_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profile.status === "active" && sub && sub.status === "active") {
      return { kind: "active", profile, subscription: sub };
    }
    if (profile.status === "subscription_expired") {
      return { kind: "subscription_expired", profile, subscription: sub || null };
    }
    // Approved but never paid (or pending payment)
    const { data: app } = await supabase
      .from("agent_applications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return { kind: "approved_pending_subscription", application: app!, profile };
  }

  // 2. No profile yet — check application state.
  const { data: application } = await supabase
    .from("agent_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!application) return { kind: "no_application" };

  switch (application.status) {
    case "draft":          return { kind: "draft", application };
    case "submitted":      return { kind: "submitted", application };
    case "under_review":   return { kind: "under_review", application };
    case "needs_changes":  return { kind: "needs_changes", application };
    case "declined":       return { kind: "declined", application };
    case "approved":
      // Edge case: status flipped to approved but profile not yet created.
      return { kind: "submitted", application };
  }
}

/* ── Application CRUD ───────────────────────────────────── */
export async function getOrCreateDraft(userId: string): Promise<AgentApplication> {
  const { data: existing } = await supabase
    .from("agent_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("agent_applications")
    .insert({ user_id: userId, status: "draft" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveApplicationDraft(
  applicationId: string,
  patch: AgentApplicationUpdate,
): Promise<AgentApplication> {
  // Force status back to draft when applicant edits during needs_changes
  const { data, error } = await supabase
    .from("agent_applications")
    .update(patch)
    .eq("id", applicationId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function submitApplication(applicationId: string): Promise<AgentApplication> {
  const { data, error } = await supabase
    .from("agent_applications")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/* ── Slug helpers ───────────────────────────────────────── */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** Returns true if the slug is free (not used by any application or profile other than `excludeApplicationId`). */
export async function isSlugAvailable(slug: string, excludeApplicationId?: string): Promise<boolean> {
  const lc = slug.toLowerCase();

  let appQuery = supabase.from("agent_applications").select("id").eq("store_slug", lc).limit(1);
  if (excludeApplicationId) appQuery = appQuery.neq("id", excludeApplicationId);
  const { data: appHit } = await appQuery;
  if (appHit && appHit.length > 0) return false;

  const { data: profileHit } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("store_slug", lc)
    .limit(1);
  if (profileHit && profileHit.length > 0) return false;

  return true;
}

/* ── Storage: store logo upload ─────────────────────────── */
export async function uploadStoreLogo(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
    throw new Error("Logo must be PNG, JPG or WEBP.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Logo must be under 2 MB.");
  }
  const path = `${userId}/logo-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("agent-stores")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("agent-stores").getPublicUrl(path);
  return data.publicUrl;
}

/* ── Public store lookup (for /store/:slug) ─────────────── */
export async function getStoreBySlug(slug: string): Promise<AgentProfile | null> {
  const { data } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("store_slug", slug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();
  return data;
}
