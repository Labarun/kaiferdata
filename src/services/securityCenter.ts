/**
 * Security Center service
 * -----------------------
 * Read-only monitoring queries + admin control actions for the Security Center
 * page (/admin/security). Every read here is already restricted to admins by
 * RLS; every control action goes through the existing SECURITY DEFINER RPCs
 * (which write their own server-side audit logs) or admin-gated table writes.
 *
 * This module deliberately fails soft: a single broken query never blanks the
 * whole dashboard — each section returns a safe default and surfaces its own
 * error.
 */
import { supabase } from "@/integrations/supabase/client";
import { writeAuditLog } from "@/services/auth";
import type { AppRole, AccountStatus } from "@/services/auth";

const DAY_MS = 24 * 60 * 60 * 1000;
export const sinceISO = (ms: number) => new Date(Date.now() - ms).toISOString();

/* ------------------------------------------------------------------ */
/*  Kill switches (system_settings)                                    */
/* ------------------------------------------------------------------ */

export interface KillSwitch {
  key: string;
  value: string;
  group: string;
  description: string | null;
  isBool: boolean;
}

/** Keys that act as protective "buy/flow" switches, in lockdown order. */
export const LOCKDOWN_SWITCHES = [
  "guest_buy_enabled",
  "user_buy_enabled",
  "deposits_enabled",
  "order_submission_enabled",
  "agent_store_enabled",
] as const;

export const MAINTENANCE_KEY = "system_maintenance_mode";

export async function getSettings(): Promise<{ data: KillSwitch[]; error: unknown }> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("setting_key, setting_value, setting_group, description")
    .order("setting_group", { ascending: true });
  const rows: KillSwitch[] = (data ?? []).map((s) => ({
    key: s.setting_key,
    value: s.setting_value,
    group: s.setting_group ?? "general",
    description: s.description,
    isBool: s.setting_value === "true" || s.setting_value === "false",
  }));
  return { data: rows, error };
}

export async function setSetting(key: string, value: string) {
  const { error } = await supabase
    .from("system_settings")
    .update({ setting_value: value })
    .eq("setting_key", key);
  if (!error) {
    await writeAuditLog({
      action: "security_setting_changed",
      targetType: "system_settings",
      targetId: key,
      metadata: { new_value: value, via: "security_center" },
    });
  }
  return { error };
}

/**
 * Emergency lockdown: turn maintenance ON and every buy/flow switch OFF in one
 * action. Reversible with liftLockdown(). Writes one audit entry.
 */
export async function emergencyLockdown() {
  const updates = [
    setSettingRaw(MAINTENANCE_KEY, "true"),
    ...LOCKDOWN_SWITCHES.map((k) => setSettingRaw(k, "false")),
  ];
  const results = await Promise.all(updates);
  const failed = results.filter((r) => r.error).length;
  await writeAuditLog({
    action: "security_emergency_lockdown",
    targetType: "system_settings",
    metadata: { switches: [MAINTENANCE_KEY, ...LOCKDOWN_SWITCHES], failed },
  });
  return { failed };
}

export async function liftLockdown() {
  const updates = [
    setSettingRaw(MAINTENANCE_KEY, "false"),
    ...LOCKDOWN_SWITCHES.map((k) => setSettingRaw(k, "true")),
  ];
  const results = await Promise.all(updates);
  const failed = results.filter((r) => r.error).length;
  await writeAuditLog({
    action: "security_lockdown_lifted",
    targetType: "system_settings",
    metadata: { switches: [MAINTENANCE_KEY, ...LOCKDOWN_SWITCHES], failed },
  });
  return { failed };
}

async function setSettingRaw(key: string, value: string) {
  // upsert (not update) so a kill-switch whose row was never seeded — e.g.
  // order_submission_enabled — self-heals instead of silently no-op'ing.
  return supabase
    .from("system_settings")
    .upsert({ setting_key: key, setting_value: value }, { onConflict: "setting_key" });
}

/* ------------------------------------------------------------------ */
/*  Audit log feed                                                     */
/* ------------------------------------------------------------------ */

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Actions that move money, change privileges, or alter platform controls. */
const SENSITIVE_HINTS = [
  "role", "status", "suspend", "disable", "ban",
  "withdraw", "wallet", "credit", "debit", "refund", "payout",
  "setting", "lockdown", "maintenance", "delete", "approve", "reject",
  "price", "subscription", "grant", "revoke",
];

export function isSensitiveAction(action: string): boolean {
  const a = action.toLowerCase();
  return SENSITIVE_HINTS.some((h) => a.includes(h));
}

export async function getAuditLog(params: {
  search?: string;
  role?: string | "all";
  sensitiveOnly?: boolean;
  sinceMs?: number;
  limit?: number;
}): Promise<{ data: AuditEntry[]; error: unknown }> {
  let q = supabase
    .from("audit_logs")
    .select("id, actor_id, actor_role, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 200);

  if (params.role && params.role !== "all") q = q.eq("actor_role", params.role);
  if (params.sinceMs) q = q.gte("created_at", sinceISO(params.sinceMs));
  if (params.search?.trim()) {
    const s = params.search.trim();
    q = q.or(`action.ilike.%${s}%,target_type.ilike.%${s}%,target_id.ilike.%${s}%`);
  }

  const { data, error } = await q;
  let rows = (data ?? []) as AuditEntry[];
  if (params.sensitiveOnly) rows = rows.filter((r) => isSensitiveAction(r.action));
  return { data: rows, error };
}

/* ------------------------------------------------------------------ */
/*  Threat overview (counts)                                           */
/* ------------------------------------------------------------------ */

export interface SecurityOverview {
  maintenanceOn: boolean;
  buyDisabledCount: number;       // how many buy/flow switches are OFF
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
  lockedAccounts: number;         // suspended + disabled
  failedPayments24h: number;
  supplierFailures24h: number;
  sensitiveActions24h: number;
  newSignups24h: number;
}

async function count(
  table: string,
  build: (q: any) => any,
): Promise<number> {
  try {
    const { count, error } = await build(
      supabase.from(table as never).select("*", { count: "exact", head: true }),
    );
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}

export async function getOverview(): Promise<SecurityOverview> {
  const since24 = sinceISO(DAY_MS);

  const [
    settingsRes,
    pendingW,
    lockedSuspended,
    lockedDisabled,
    failedPay,
    supplierFail,
    sensitive,
    signups,
  ] = await Promise.allSettled([
    getSettings(),
    supabase
      .from("withdrawal_requests")
      .select("amount", { count: "exact" })
      .eq("status", "pending")
      .limit(500),
    count("profiles", (q) => q.eq("account_status", "suspended")),
    count("profiles", (q) => q.eq("account_status", "disabled")),
    count("payment_records", (q) => q.eq("status", "failed").gte("created_at", since24)),
    count("supplier_request_logs", (q) => q.eq("is_success", false).gte("created_at", since24)),
    getAuditLog({ sensitiveOnly: true, sinceMs: DAY_MS, limit: 500 }),
    count("profiles", (q) => q.gte("created_at", since24)),
  ]);

  const settings = settingsRes.status === "fulfilled" ? settingsRes.value.data : [];
  const maintenanceOn = settings.find((s) => s.key === MAINTENANCE_KEY)?.value === "true";
  const buyDisabledCount = (LOCKDOWN_SWITCHES as readonly string[]).filter(
    (k) => settings.find((s) => s.key === k)?.value === "false",
  ).length;

  const pendingRows =
    pendingW.status === "fulfilled" ? (pendingW.value.data ?? []) : [];
  const pendingWithdrawals =
    pendingW.status === "fulfilled" ? pendingW.value.count ?? pendingRows.length : 0;
  const pendingWithdrawalAmount = pendingRows.reduce(
    (sum: number, r: { amount: number }) => sum + Number(r.amount ?? 0),
    0,
  );

  return {
    maintenanceOn,
    buyDisabledCount,
    pendingWithdrawals,
    pendingWithdrawalAmount,
    lockedAccounts:
      (lockedSuspended.status === "fulfilled" ? lockedSuspended.value : 0) +
      (lockedDisabled.status === "fulfilled" ? lockedDisabled.value : 0),
    failedPayments24h: failedPay.status === "fulfilled" ? failedPay.value : 0,
    supplierFailures24h: supplierFail.status === "fulfilled" ? supplierFail.value : 0,
    sensitiveActions24h:
      sensitive.status === "fulfilled" ? sensitive.value.data.length : 0,
    newSignups24h: signups.status === "fulfilled" ? signups.value : 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Accounts & access                                                  */
/* ------------------------------------------------------------------ */

export interface PrivilegedAccount {
  user_id: string;
  full_name: string;
  email: string;
  account_status: AccountStatus;
  last_login_at: string | null;
  created_at: string;
  roles: AppRole[];
}

/** Admins + staff — the high-blast-radius accounts to keep an eye on. */
export async function getPrivilegedAccounts(): Promise<{ data: PrivilegedAccount[]; error: unknown }> {
  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "staff"]);
  if (error || !roleRows?.length) return { data: [], error };

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of roleRows) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role as AppRole);
    rolesByUser.set(r.user_id, arr);
  }
  const ids = [...rolesByUser.keys()];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, account_status, last_login_at, created_at")
    .in("user_id", ids);

  const rows: PrivilegedAccount[] = (profiles ?? []).map((p) => ({
    user_id: p.user_id,
    full_name: p.full_name,
    email: p.email,
    account_status: p.account_status as AccountStatus,
    last_login_at: p.last_login_at,
    created_at: p.created_at,
    roles: rolesByUser.get(p.user_id) ?? [],
  }));
  rows.sort((a, b) => (a.roles.includes("admin") ? -1 : 1) - (b.roles.includes("admin") ? -1 : 1));
  return { data: rows, error: null };
}

export interface FlaggedAccount {
  user_id: string;
  full_name: string;
  email: string;
  account_status: AccountStatus;
  created_at: string;
}

/** Suspended or disabled accounts. */
export async function getLockedAccounts(): Promise<{ data: FlaggedAccount[]; error: unknown }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, account_status, created_at")
    .in("account_status", ["suspended", "disabled"])
    .order("updated_at", { ascending: false })
    .limit(100);
  return { data: (data ?? []) as FlaggedAccount[], error };
}

/** Recently created accounts (signup-velocity / abuse surface). */
export async function getRecentSignups(sinceMs = 2 * DAY_MS): Promise<{ data: FlaggedAccount[]; error: unknown }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, account_status, created_at")
    .gte("created_at", sinceISO(sinceMs))
    .order("created_at", { ascending: false })
    .limit(100);
  return { data: (data ?? []) as FlaggedAccount[], error };
}

/** Suspend / reactivate an account. Goes through the admin RPC (audit-logged server-side). */
export async function setAccountStatus(
  targetUserId: string,
  status: AccountStatus,
  reason: string,
  adminId: string,
) {
  const { error } = await supabase.rpc("admin_set_account_status", {
    _target_user_id: targetUserId,
    _status: status,
    _reason: reason,
    _admin_id: adminId,
  });
  return { error };
}

/** Revoke a privileged role (e.g. demote a compromised admin/staff). */
export async function revokeRole(targetUserId: string, role: AppRole, adminId: string) {
  const { error } = await supabase.rpc("admin_set_user_role", {
    _target_user_id: targetUserId,
    _role: role,
    _admin_id: adminId,
    _grant: false,
  });
  return { error };
}

/* ------------------------------------------------------------------ */
/*  Money & fraud                                                      */
/* ------------------------------------------------------------------ */

export interface PendingWithdrawal {
  id: string;
  amount: number;
  momo_name: string;
  momo_network: string;
  momo_number: string;
  wallet_kind: string;
  status: string;
  requested_at: string;
}

export async function getPendingWithdrawals(): Promise<{ data: PendingWithdrawal[]; error: unknown }> {
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("id, amount, momo_name, momo_network, momo_number, wallet_kind, status, requested_at")
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
    .limit(100);
  return { data: (data ?? []) as PendingWithdrawal[], error };
}

export interface SuspiciousPayment {
  id: string;
  amount: number;
  total_amount: number | null;
  status: string;
  provider: string;
  provider_reference: string;
  customer_identifier: string | null;
  created_at: string;
  verified_at: string | null;
}

/** Failed / reversed payments in the window — a tampering & abuse signal. */
export async function getSuspiciousPayments(sinceMs = 2 * DAY_MS): Promise<{ data: SuspiciousPayment[]; error: unknown }> {
  const { data, error } = await supabase
    .from("payment_records")
    .select("id, amount, total_amount, status, provider, provider_reference, customer_identifier, created_at, verified_at")
    .in("status", ["failed", "reversed"])
    .gte("created_at", sinceISO(sinceMs))
    .order("created_at", { ascending: false })
    .limit(100);
  return { data: (data ?? []) as SuspiciousPayment[], error };
}

export interface SupplierFailure {
  id: string;
  order_id: string;
  supplier_id: string | null;
  error_message: string | null;
  normalized_result: string | null;
  created_at: string;
}

export async function getSupplierFailures(sinceMs = DAY_MS): Promise<{ data: SupplierFailure[]; error: unknown }> {
  const { data, error } = await supabase
    .from("supplier_request_logs")
    .select("id, order_id, supplier_id, error_message, normalized_result, created_at")
    .eq("is_success", false)
    .gte("created_at", sinceISO(sinceMs))
    .order("created_at", { ascending: false })
    .limit(100);
  return { data: (data ?? []) as SupplierFailure[], error };
}
