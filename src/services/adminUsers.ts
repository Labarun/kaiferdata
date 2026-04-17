/**
 * Admin user management service — all mutations go through SECURITY DEFINER RPCs.
 * Audit logs are written automatically inside the RPCs.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, AccountStatus } from "@/services/auth";

export interface AdminUserRow {
  user_id: string;
  full_name: string;
  email: string;
  username: string | null;
  phone: string | null;
  account_status: AccountStatus;
  created_at: string;
  last_login_at: string | null;
  role: AppRole;
  wallet_balance: number;
}

/** List users with search + filters. RLS already restricts this to admins. */
export async function listUsers(params: {
  search?: string;
  role?: AppRole | "all";
  status?: AccountStatus | "all";
  limit?: number;
}) {
  let q = supabase
    .from("profiles")
    .select("user_id, full_name, email, username, phone, account_status, created_at, last_login_at")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (params.status && params.status !== "all") q = q.eq("account_status", params.status);
  if (params.search?.trim()) {
    const s = params.search.trim();
    q = q.or(
      `full_name.ilike.%${s}%,email.ilike.%${s}%,username.ilike.%${s}%,phone.ilike.%${s}%`,
    );
  }
  const { data: profiles, error } = await q;
  if (error || !profiles) return { data: [] as AdminUserRow[], error };

  const ids = profiles.map((p) => p.user_id);
  if (ids.length === 0) return { data: [] as AdminUserRow[], error: null };

  const [{ data: roles }, { data: wallets }] = await Promise.all([
    supabase.from("user_roles").select("user_id, role").in("user_id", ids),
    supabase.from("wallets").select("user_id, current_balance").in("user_id", ids),
  ]);

  const roleByUser = new Map<string, AppRole>();
  // pick highest role per user
  const rank: Record<AppRole, number> = { admin: 1, staff: 2, agent: 3, user: 4 };
  for (const r of roles ?? []) {
    const cur = roleByUser.get(r.user_id);
    if (!cur || rank[r.role as AppRole] < rank[cur]) roleByUser.set(r.user_id, r.role as AppRole);
  }
  const balByUser = new Map<string, number>();
  for (const w of wallets ?? []) balByUser.set(w.user_id, Number(w.current_balance ?? 0));

  let rows: AdminUserRow[] = profiles.map((p) => ({
    ...p,
    role: roleByUser.get(p.user_id) ?? "user",
    wallet_balance: balByUser.get(p.user_id) ?? 0,
  }));

  if (params.role && params.role !== "all") {
    rows = rows.filter((r) => r.role === params.role);
  }
  return { data: rows, error: null };
}

export async function getUserRoles(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return { data: (data ?? []).map((r) => r.role as AppRole), error };
}

export async function setUserRole(targetUserId: string, role: AppRole, adminId: string, grant: boolean) {
  const { error } = await supabase.rpc("admin_set_user_role", {
    _target_user_id: targetUserId,
    _role: role,
    _admin_id: adminId,
    _grant: grant,
  });
  return { error };
}

export async function adminCreditWallet(targetUserId: string, amount: number, reason: string, adminId: string) {
  const { data, error } = await supabase.rpc("admin_credit_user_wallet", {
    _target_user_id: targetUserId,
    _amount: amount,
    _reason: reason,
    _admin_id: adminId,
  });
  return { data: data?.[0] ?? null, error };
}

export async function adminDebitWallet(targetUserId: string, amount: number, reason: string, adminId: string) {
  const { data, error } = await supabase.rpc("admin_debit_user_wallet", {
    _target_user_id: targetUserId,
    _amount: amount,
    _reason: reason,
    _admin_id: adminId,
  });
  return { data: data?.[0] ?? null, error };
}

export async function adminSetAccountStatus(
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

export interface AdminUserNote {
  id: string;
  user_id: string;
  admin_id: string;
  note: string;
  created_at: string;
}

export async function listUserNotes(userId: string) {
  const { data, error } = await supabase
    .from("admin_user_notes" as never)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return { data: (data ?? []) as unknown as AdminUserNote[], error };
}

export async function addUserNote(userId: string, adminId: string, note: string) {
  const { error } = await (supabase.from("admin_user_notes" as never) as any)
    .insert({ user_id: userId, admin_id: adminId, note });
  return { error };
}

export async function getUserWalletTxns(userId: string, limit = 20) {
  const { data: w } = await supabase.from("wallets").select("id").eq("user_id", userId).maybeSingle();
  if (!w) return { data: [], error: null };
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", w.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: data ?? [], error };
}
