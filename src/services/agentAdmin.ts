/**
 * Agent Admin Service Layer
 *
 * Admin/staff helpers for the agent management console.
 * - Strictly additive: never touches orders, payments, or wallet flows.
 * - All RLS-restricted; only admins can mutate, staff can read.
 */
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/auth";
import type { AgentApplication, AgentProfile, AgentSubscription } from "@/services/agent";

export type AgentApplicationWithUser = AgentApplication & {
  profile?: AgentProfile | null;
  latest_subscription?: AgentSubscription | null;
  wallet?: any | null;
  stats?: {
    totalOrders: number;
    successRate: number;
    lastActive: string | null;
  };
};

export async function listApplications(filter?: {
  status?: AgentApplication["status"][];
  search?: string;
}): Promise<AgentApplicationWithUser[]> {
  
  // 1. Fetch applications based on filter (if any)
  let appQuery = supabase
    .from("agent_applications")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filter?.status && filter.status.length > 0) {
    appQuery = appQuery.in("status", filter.status);
  }

  const { data: appsData, error: appsErr } = await appQuery;
  if (appsErr) throw new Error(appsErr.message);

  const apps = appsData || [];

  // 2. Fetch all profiles (to catch manually created agents with no application)
  const { data: allProfiles, error: profErr } = await supabase.from("agent_profiles").select("*");
  if (profErr) throw new Error(profErr.message);

  // 3. Unify user IDs
  const userIds = new Set<string>();
  apps.forEach((a) => userIds.add(a.user_id));
  
  // Only add profile userIds if we aren't strict filtering for pending/declined applications
  // If we are filtering by 'submitted', we shouldn't show active profiles.
  const isStrictAppFilter = filter?.status && !filter.status.includes("approved");
  if (!isStrictAppFilter) {
    (allProfiles || []).forEach((p) => userIds.add(p.user_id));
  }
  
  const userIdsArray = Array.from(userIds);
  if (userIdsArray.length === 0) return [];

  // Helper to chunk arrays
  const chunkArray = <T>(arr: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  const chunks = chunkArray(userIdsArray, 40);

  let allSubs: AgentSubscription[] = [];
  let allWallets: any[] = [];
  let allOrders: any[] = [];

  for (const chunk of chunks) {
    const [{ data: subs }, { data: wallets }, { data: orders }] = await Promise.all([
      supabase
        .from("agent_subscriptions")
        .select("*")
        .in("user_id", chunk)
        .order("created_at", { ascending: false }),
      supabase.from("agent_earnings_wallets").select("*").in("user_id", chunk),
      supabase.from("orders").select("actor_id, status, created_at").in("actor_id", chunk).eq("actor_type", "agent")
    ]);
    
    if (subs) allSubs.push(...subs);
    if (wallets) allWallets.push(...wallets);
    if (orders) allOrders.push(...orders);
  }

  // Map everything by user_id
  const appByUser = new Map(apps.map((a) => [a.user_id, a]));
  const profileByUser = new Map((allProfiles || []).map((p) => [p.user_id, p]));
  const subByUser = new Map<string, AgentSubscription>();
  allSubs.forEach((s) => {
    if (!subByUser.has(s.user_id)) subByUser.set(s.user_id, s);
  });
  const walletByUser = new Map(allWallets.map((w) => [w.user_id, w]));
  const ordersByUser = new Map<string, any[]>();
  allOrders.forEach((o) => {
    if (!ordersByUser.has(o.actor_id)) ordersByUser.set(o.actor_id, []);
    ordersByUser.get(o.actor_id)!.push(o);
  });

  let hydrated: AgentApplicationWithUser[] = userIdsArray.map((uid) => {
    const app = appByUser.get(uid);
    const prof = profileByUser.get(uid);

    // If no app exists (e.g. manually inserted profile), we mock an application wrapper
    const baseApp: AgentApplication = app || {
      id: prof?.application_id || uid, // fake id if missing
      user_id: uid,
      status: "approved",
      full_name: prof?.business_name || prof?.store_name || "Agent",
      email: "",
      phone: "",
      city: prof?.city || "",
      business_name: prof?.business_name || "",
      has_sold_data_before: true,
      selling_channels: "",
      expected_customer_base: "",
      motivation: "",
      social_link: "",
      store_name: prof?.store_name || "",
      store_slug: prof?.store_slug || "",
      store_logo_url: prof?.store_logo_url || "",
      store_tagline: prof?.store_tagline || "",
      agreed_to_terms: true,
      acknowledged_subscription: true,
      admin_note: "",
      internal_note: "",
      reviewed_at: prof?.created_at || "",
      reviewed_by: "",
      submitted_at: prof?.created_at || "",
      created_at: prof?.created_at || "",
      updated_at: prof?.updated_at || "",
    };

    const userOrders = ordersByUser.get(uid) || [];
    const totalOrders = userOrders.length;
    const delivered = userOrders.filter((o) => o.status === "delivered").length;
    const successRate = totalOrders > 0 ? (delivered / totalOrders) * 100 : 0;

    // Get most recent order date
    let lastActive = null;
    if (userOrders.length > 0) {
      const sorted = [...userOrders].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
      lastActive = sorted[0].created_at;
    }

    return {
      ...baseApp,
      profile: prof || null,
      latest_subscription: subByUser.get(uid) || null,
      wallet: walletByUser.get(uid) || null,
      stats: {
        totalOrders,
        successRate,
        lastActive,
      },
    };
  });

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    hydrated = hydrated.filter(
      (a) =>
        a.full_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q) ||
        a.store_name?.toLowerCase().includes(q) ||
        a.store_slug?.toLowerCase().includes(q)
    );
  }
  
  hydrated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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
  await writeAuditLog({
    action: "agent_application_approved",
    targetType: "agent_application",
    targetId: opts.applicationId,
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

  await writeAuditLog({
    action: "agent_application_changes_requested",
    targetType: "agent_application",
    targetId: opts.applicationId,
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

  await writeAuditLog({
    action: "agent_application_declined",
    targetType: "agent_application",
    targetId: opts.applicationId,
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

  await writeAuditLog({
    action: "agent_profile_suspended",
    targetType: "agent_profile",
    targetId: opts.profileId,
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

  await writeAuditLog({
    action: "agent_profile_reactivated",
    targetType: "agent_profile",
    targetId: opts.profileId,
  });
}

/**
 * Admin manual activation — directly activates an approved agent's store
 * for either 1 month or 1 year, even if the agent has not paid through Paystack.
 * Backed by the SECURITY DEFINER function `admin_activate_agent_subscription`,
 * which validates admin role, creates the subscription, sets the profile to
 * 'active', grants the agent role, and writes an audit log.
 */
export async function adminActivateAgent(opts: {
  targetUserId: string;
  adminId: string;
  plan: "monthly" | "yearly";
  note?: string;
}): Promise<{ subscriptionId: string; startsAt: string; expiresAt: string }> {
  const { data, error } = await supabase.rpc("admin_activate_agent_subscription", {
    _admin_id: opts.adminId,
    _target_user_id: opts.targetUserId,
    _plan: opts.plan,
    _note: opts.note ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Activation did not return a result");
  return {
    subscriptionId: row.subscription_id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
  };
}
