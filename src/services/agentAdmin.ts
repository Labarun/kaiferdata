/**
 * Agent Admin Service Layer
 *
 * Admin/staff helpers for the agent management console.
 * - Strictly additive: never touches orders, payments, or wallet flows.
 * - All RLS-restricted; only admins can mutate, staff can read.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AgentApplication, AgentProfile, AgentSubscription } from "@/services/agent";

export type AgentApplicationWithUser = AgentApplication & {
  profile?: AgentProfile | null;
  latest_subscription?: AgentSubscription | null;
};

/** List all applications (most recent first) with optional status filter. */
export async function listApplications(filter?: {
  status?: AgentApplication["status"][];
  search?: string;
}): Promise<AgentApplicationWithUser[]> {
  let query = supabase
    .from("agent_applications")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filter?.status && filter.status.length > 0) {
    query = query.in("status", filter.status);
  }

  const { data: apps, error } = await query;
  if (error) throw new Error(error.message);
  if (!apps) return [];

  // Hydrate with linked profile + latest subscription per user.
  const userIds = apps.map((a) => a.user_id);
  if (userIds.length === 0) return apps;

  const [{ data: profiles }, { data: subs }] = await Promise.all([
    supabase.from("agent_profiles").select("*").in("user_id", userIds),
    supabase
      .from("agent_subscriptions")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
  ]);

  const profileByUser = new Map((profiles || []).map((p) => [p.user_id, p]));
  const subByUser = new Map<string, AgentSubscription>();
  (subs || []).forEach((s) => {
    if (!subByUser.has(s.user_id)) subByUser.set(s.user_id, s);
  });

  let hydrated = apps.map((a) => ({
    ...a,
    profile: profileByUser.get(a.user_id) || null,
    latest_subscription: subByUser.get(a.user_id) || null,
  }));

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    hydrated = hydrated.filter(
      (a) =>
        a.full_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q) ||
        a.store_name?.toLowerCase().includes(q) ||
        a.store_slug?.toLowerCase().includes(q),
    );
  }

  return hydrated;
}

/** Get one application + its profile + subscription history. */
export async function getApplicationDetail(applicationId: string) {
  const { data: app, error } = await supabase
    .from("agent_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error) throw new Error(error.message);

  const [{ data: profile }, { data: subs }] = await Promise.all([
    supabase.from("agent_profiles").select("*").eq("user_id", app.user_id).maybeSingle(),
    supabase
      .from("agent_subscriptions")
      .select("*")
      .eq("user_id", app.user_id)
      .order("created_at", { ascending: false }),
  ]);

  return { application: app, profile: profile || null, subscriptions: subs || [] };
}

/** Mark an application as under_review (admin opens it). */
export async function markUnderReview(applicationId: string, adminId: string) {
  const { error } = await supabase
    .from("agent_applications")
    .update({
      status: "under_review",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", applicationId)
    .eq("status", "submitted");
  if (error) throw new Error(error.message);
}

/** Approve an application — creates the agent_profile and flips the row to 'approved'. */
export async function approveApplication(opts: {
  applicationId: string;
  adminId: string;
  adminNote?: string;
}) {
  // Pull the application
  const { data: app, error: appErr } = await supabase
    .from("agent_applications")
    .select("*")
    .eq("id", opts.applicationId)
    .single();
  if (appErr) throw new Error(appErr.message);

  if (!app.store_name || !app.store_slug) {
    throw new Error("Application missing store name or slug — cannot approve.");
  }

  // Profile may already exist if approval happened before — idempotent.
  const { data: existing } = await supabase
    .from("agent_profiles")
    .select("id")
    .eq("user_id", app.user_id)
    .maybeSingle();

  if (!existing) {
    const { error: profErr } = await supabase.from("agent_profiles").insert({
      user_id: app.user_id,
      application_id: app.id,
      store_name: app.store_name,
      store_slug: app.store_slug,
      store_logo_url: app.store_logo_url,
      store_tagline: app.store_tagline,
      business_name: app.business_name,
      city: app.city,
      status: "pending_subscription",
    });
    if (profErr) throw new Error(profErr.message);
  }

  const { error: updErr } = await supabase
    .from("agent_applications")
    .update({
      status: "approved",
      admin_note: opts.adminNote ?? app.admin_note,
      reviewed_at: new Date().toISOString(),
      reviewed_by: opts.adminId,
    })
    .eq("id", opts.applicationId);
  if (updErr) throw new Error(updErr.message);

  // Audit log
  await supabase.from("audit_logs").insert({
    action: "agent_application_approved",
    actor_id: opts.adminId,
    actor_role: "admin",
    target_type: "agent_application",
    target_id: opts.applicationId,
    metadata: { user_id: app.user_id, store_slug: app.store_slug },
  });
}

/** Send back for changes (applicant can edit & resubmit). */
export async function requestChanges(opts: {
  applicationId: string;
  adminId: string;
  adminNote: string;
}) {
  const { error } = await supabase
    .from("agent_applications")
    .update({
      status: "needs_changes",
      admin_note: opts.adminNote,
      reviewed_at: new Date().toISOString(),
      reviewed_by: opts.adminId,
    })
    .eq("id", opts.applicationId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    action: "agent_application_changes_requested",
    actor_id: opts.adminId,
    actor_role: "admin",
    target_type: "agent_application",
    target_id: opts.applicationId,
    metadata: { note: opts.adminNote },
  });
}

/** Decline an application. */
export async function declineApplication(opts: {
  applicationId: string;
  adminId: string;
  adminNote: string;
}) {
  const { error } = await supabase
    .from("agent_applications")
    .update({
      status: "declined",
      admin_note: opts.adminNote,
      reviewed_at: new Date().toISOString(),
      reviewed_by: opts.adminId,
    })
    .eq("id", opts.applicationId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    action: "agent_application_declined",
    actor_id: opts.adminId,
    actor_role: "admin",
    target_type: "agent_application",
    target_id: opts.applicationId,
    metadata: { note: opts.adminNote },
  });
}

/** Suspend an active agent profile. */
export async function suspendAgent(opts: {
  profileId: string;
  adminId: string;
  reason: string;
}) {
  const { error } = await supabase
    .from("agent_profiles")
    .update({
      status: "suspended",
      suspended_at: new Date().toISOString(),
      suspension_reason: opts.reason,
    })
    .eq("id", opts.profileId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    action: "agent_profile_suspended",
    actor_id: opts.adminId,
    actor_role: "admin",
    target_type: "agent_profile",
    target_id: opts.profileId,
    metadata: { reason: opts.reason },
  });
}

/** Lift suspension — flips back to subscription_expired so they must renew. */
export async function reactivateAgent(opts: { profileId: string; adminId: string }) {
  const { error } = await supabase
    .from("agent_profiles")
    .update({
      status: "subscription_expired",
      suspended_at: null,
      suspension_reason: null,
    })
    .eq("id", opts.profileId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    action: "agent_profile_reactivated",
    actor_id: opts.adminId,
    actor_role: "admin",
    target_type: "agent_profile",
    target_id: opts.profileId,
  });
}
