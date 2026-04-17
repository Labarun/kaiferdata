/**
 * Agent Customers Service
 *
 * Aggregates unique beneficiaries across the agent's orders into a
 * customer list with order count, total spend, last order date.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AgentCustomer {
  beneficiary_number: string;
  network: string;
  orders: number;
  total_spend: number;
  last_order_at: string;
}

export async function fetchAgentCustomers(agentProfileId: string): Promise<AgentCustomer[]> {
  const { data: intents } = await supabase
    .from("purchase_intents")
    .select("id")
    .filter("order_context->referral->>agent_profile_id", "eq", agentProfileId)
    .limit(5000);

  const ids = (intents ?? []).map((i: any) => i.id);
  if (ids.length === 0) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select("beneficiary_number, network, amount_charged, created_at")
    .in("intent_id", ids)
    .order("created_at", { ascending: false })
    .limit(2000);

  const map = new Map<string, AgentCustomer>();
  ((orders as any[]) ?? []).forEach((o) => {
    if (!o.beneficiary_number) return;
    const key = o.beneficiary_number;
    const cur = map.get(key);
    if (cur) {
      cur.orders += 1;
      cur.total_spend += Number(o.amount_charged || 0);
      // keep most recent
      if (new Date(o.created_at) > new Date(cur.last_order_at)) {
        cur.last_order_at = o.created_at;
        cur.network = o.network;
      }
    } else {
      map.set(key, {
        beneficiary_number: key,
        network: o.network,
        orders: 1,
        total_spend: Number(o.amount_charged || 0),
        last_order_at: o.created_at,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.orders - a.orders);
}
