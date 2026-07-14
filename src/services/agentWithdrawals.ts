/**
 * Agent withdrawals service — wraps atomic RPCs.
 * v2 path uses the SEPARATE agent earnings wallet.
 * Legacy v1 functions kept exported for backwards-compat with admin pages.
 */
import { supabase } from "@/integrations/supabase/client";

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  agent_profile_id: string;
  amount: number;
  momo_number: string;
  momo_network: string;
  momo_name: string;
  status: WithdrawalStatus;
  admin_note: string | null;
  wallet_kind: "personal" | "agent_earnings";
  wallet_transaction_id: string | null;
  refund_transaction_id: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  agent_profiles?: { store_name: string | null } | null;
}

/** v2 — debits the agent earnings wallet (preferred). */
export async function requestWithdrawal(params: {
  userId: string;
  amount: number;
  momoNumber: string;
  momoNetwork: string;
  momoName: string;
}) {
  const { data, error } = await supabase.rpc("request_agent_withdrawal_v2_atomic", {
    _user_id: params.userId,
    _amount: params.amount,
    _momo_number: params.momoNumber,
    _momo_network: params.momoNetwork,
    _momo_name: params.momoName,
  });
  return { data: data?.[0] ?? null, error };
}

export async function listMyWithdrawals(userId: string) {
  const { data, error } = await supabase
    .from("withdrawal_requests" as never)
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(50);
  return { data: (data ?? []) as unknown as WithdrawalRequest[], error };
}

export async function listAllWithdrawals(filter?: WithdrawalStatus) {
  let q = supabase
    .from("withdrawal_requests" as never)
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(200);
  if (filter) q = q.eq("status", filter);
  const { data, error } = await q;
  return { data: (data ?? []) as unknown as WithdrawalRequest[], error };
}

/** v2 admin approve — handles both wallet kinds via routing in the SQL. */
export async function approveWithdrawal(requestId: string, adminId: string, note?: string) {
  const { data, error } = await supabase.rpc("approve_agent_withdrawal_v2_atomic", {
    _request_id: requestId,
    _admin_id: adminId,
    _note: note ?? null,
  });
  return { data: data?.[0] ?? null, error };
}

/** v2 admin reject — refunds the correct wallet. */
export async function rejectWithdrawal(requestId: string, adminId: string, note?: string) {
  const { data, error } = await supabase.rpc("reject_agent_withdrawal_v2_atomic", {
    _request_id: requestId,
    _admin_id: adminId,
    _note: note ?? null,
  });
  return { data: data?.[0] ?? null, error };
}

export async function getMinWithdrawal(): Promise<number> {
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "agent_withdrawal_min_amount")
    .maybeSingle();
  const v = Number(data?.setting_value ?? 10);
  return Number.isFinite(v) && v > 0 ? v : 10;
}
