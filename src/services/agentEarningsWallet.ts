/**
 * Agent Earnings Wallet Service
 *
 * Reads the agent's *earnings* balance and ledger — completely separate
 * from the personal wallet (`wallets` table).
 *
 * Funds here are credited automatically by the on-delivery commission
 * trigger and debited only via:
 *   - request_agent_withdrawal_v2_atomic (agent withdraws to MoMo)
 *   - admin adjustments (refunds, manual corrections)
 *
 * Read-only from the client. All writes go through SECURITY DEFINER RPCs.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AgentEarningsWallet {
  id: string;
  user_id: string;
  agent_profile_id: string;
  current_balance: number;
  total_earned: number;
  total_withdrawn: number;
  status: "active" | "frozen";
  created_at: string;
  updated_at: string;
}

export interface AgentWalletTxn {
  id: string;
  agent_wallet_id: string;
  user_id: string;
  direction: "inflow" | "outflow";
  txn_type: "commission" | "withdrawal" | "adjustment" | "refund";
  amount: number;
  opening_balance: number;
  closing_balance: number;
  status: string;
  narration: string | null;
  reference: string | null;
  linked_record_id: string | null;
  linked_record_type: string | null;
  created_at: string;
}

/** Fetch the agent's earnings wallet (creates lazily if missing — should already exist from backfill). */
export async function fetchEarningsWallet(userId: string): Promise<AgentEarningsWallet | null> {
  const { data, error } = await supabase
    .from("agent_earnings_wallets" as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("fetchEarningsWallet error:", error);
    return null;
  }
  return (data as any) ?? null;
}

/** Fetch the ledger of agent wallet transactions (most recent first). */
export async function fetchEarningsLedger(userId: string, limit = 50): Promise<AgentWalletTxn[]> {
  const { data, error } = await supabase
    .from("agent_wallet_transactions" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchEarningsLedger error:", error);
    return [];
  }
  return ((data as any[]) ?? []) as AgentWalletTxn[];
}
