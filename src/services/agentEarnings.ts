/**
 * Agent Earnings Service
 *
 * Reads commissions credited to the logged-in agent + roll-up stats.
 * Strict additive: read-only. Earnings are written server-side by the
 * `handle_order_delivered_commission` trigger.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AgentEarning {
  id: string;
  order_id: string;
  commission_amount: number;
  commission_rate: number;
  order_amount: number;
  status: string;
  created_at: string;
  // Joined order fields (optional)
  order_public_id?: string | null;
  order_status?: string | null;
  order_network?: string | null;
  order_bundle_name?: string | null;
}

export interface AgentEarningsSummary {
  total_orders: number;
  total_sales: number;
  total_profit: number;
  this_month_orders: number;
  this_month_profit: number;
}

export async function fetchAgentEarnings(userId: string, limit = 50): Promise<AgentEarning[]> {
  // 1. Fetch earnings rows
  const { data: earnings, error } = await supabase
    .from("agent_earnings" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchAgentEarnings error:", error);
    return [];
  }

  const rows = (earnings as any[]) || [];
  if (rows.length === 0) return [];

  // 2. Hydrate with order metadata in one round-trip
  const orderIds = rows.map((r) => r.order_id);
  const { data: orders } = await supabase
    .from("orders")
    .select("id, public_order_id, status, network, bundle_name")
    .in("id", orderIds);

  const orderMap = new Map((orders || []).map((o: any) => [o.id, o]));

  return rows.map((r) => {
    const o: any = orderMap.get(r.order_id);
    return {
      id: r.id,
      order_id: r.order_id,
      commission_amount: Number(r.commission_amount),
      commission_rate: Number(r.commission_rate),
      order_amount: Number(r.order_amount),
      status: r.status,
      created_at: r.created_at,
      order_public_id: o?.public_order_id ?? null,
      order_status: o?.status ?? null,
      order_network: o?.network ?? null,
      order_bundle_name: o?.bundle_name ?? null,
    };
  });
}

export async function fetchAgentSummary(userId: string): Promise<AgentEarningsSummary> {
  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("total_orders, total_sales, total_profit")
    .eq("user_id", userId)
    .maybeSingle();

  // Month-to-date aggregate
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthRows } = await supabase
    .from("agent_earnings" as any)
    .select("commission_amount, order_amount")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  const month = (monthRows as any[]) || [];

  return {
    total_orders: Number(profile?.total_orders || 0),
    total_sales: Number(profile?.total_sales || 0),
    total_profit: Number(profile?.total_profit || 0),
    this_month_orders: month.length,
    this_month_profit: month.reduce((s, r) => s + Number(r.commission_amount || 0), 0),
  };
}

/** Pull the configured commission rate (for display only). */
export async function fetchCommissionRate(): Promise<number> {
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "agent_commission_rate_percent")
    .maybeSingle();
  const v = data?.setting_value;
  return v ? Number(v) : 8;
}

/** Fetch the agent's referred orders (independent of whether commission has posted yet) PLUS bulk orders they placed. */
export async function fetchAgentReferredOrders(userId: string, agentProfileId: string, limit = 50) {
  // 1. Fetch referred orders using the RPC to bypass purchase_intents RLS
  const { data: referredOrders, error: referredError } = await supabase.rpc("get_agent_storefront_orders", {
    p_profile_id: agentProfileId,
    p_limit: limit,
  });

  if (referredError) {
    console.error("fetchAgentReferredOrders RPC error:", referredError);
  }

  // 2. Fetch bulk orders placed by the agent directly
  const { data: bulkOrders, error: bulkError } = await supabase
    .from("orders")
    .select("*")
    .eq("actor_id", userId)
    .eq("origin_type", "agent_bulk_buy")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (bulkError) {
    console.error("fetchAgentReferredOrders bulk query error:", bulkError);
  }

  // Combine and sort them
  const allOrders = [...(referredOrders || []), ...(bulkOrders || [])];
  
  // Sort by created_at descending and deduplicate by id
  const uniqueOrdersMap = new Map();
  allOrders.forEach(o => uniqueOrdersMap.set(o.id, o));
  const uniqueOrders = Array.from(uniqueOrdersMap.values());
  
  uniqueOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  return uniqueOrders.slice(0, limit);
}
