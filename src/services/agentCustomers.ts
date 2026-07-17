import { supabase } from "@/integrations/supabase/client";

export interface AgentCustomer {
  beneficiary_number: string;
  network: string;
  orders: number;
  total_spend: number;
  last_order_at: string;
  first_order_at?: string;
  avg_order_value: number;
  name?: string;
  is_saved?: boolean;
}

export async function fetchAgentCustomers(agentProfileId: string): Promise<AgentCustomer[]> {
  // 1. Fetch explicitly saved customers
  const { data: savedCustomers } = await supabase
    .from("agent_customers")
    .select("name, phone_number, network, created_at")
    .eq("agent_profile_id", agentProfileId);

  // 2. Fetch all orders from this agent
  const { data: intents } = await supabase
    .from("purchase_intents")
    .select("id")
    .filter("order_context->referral->>agent_profile_id", "eq", agentProfileId)
    .limit(5000);

  const ids = (intents ?? []).map((i: any) => i.id);
  
  let orders: any[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select("beneficiary_number, network, amount_charged, created_at")
      .in("intent_id", ids)
      .order("created_at", { ascending: false })
      .limit(2000);
    orders = data || [];
  }

  const map = new Map<string, AgentCustomer>();

  // Add saved customers first
  (savedCustomers || []).forEach(c => {
    map.set(c.phone_number, {
      beneficiary_number: c.phone_number,
      network: c.network,
      name: c.name,
      is_saved: true,
      orders: 0,
      total_spend: 0,
      avg_order_value: 0,
      last_order_at: c.created_at,
      first_order_at: c.created_at,
    });
  });

  // Aggregate orders
  orders.forEach((o) => {
    if (!o.beneficiary_number) return;
    const key = o.beneficiary_number;
    const cur = map.get(key);
    if (cur) {
      cur.orders += 1;
      cur.total_spend += Number(o.amount_charged || 0);
      if (cur.orders === 1 || new Date(o.created_at) > new Date(cur.last_order_at)) {
        cur.last_order_at = o.created_at;
      }
      if (!cur.first_order_at || new Date(o.created_at) < new Date(cur.first_order_at)) {
        cur.first_order_at = o.created_at;
      }
    } else {
      map.set(key, {
        beneficiary_number: key,
        network: o.network,
        orders: 1,
        total_spend: Number(o.amount_charged || 0),
        avg_order_value: 0,
        last_order_at: o.created_at,
        first_order_at: o.created_at,
        is_saved: false,
      });
    }
  });

  // Compute averages
  map.forEach((c) => {
    c.avg_order_value = c.orders > 0 ? c.total_spend / c.orders : 0;
  });

  return Array.from(map.values()).sort((a, b) => {
    // Sort saved first, then by orders
    if (a.is_saved && !b.is_saved) return -1;
    if (!a.is_saved && b.is_saved) return 1;
    return b.orders - a.orders;
  });
}

export async function saveAgentCustomer(agentProfileId: string, phoneNumber: string, network: string, name: string) {
  const { error } = await supabase
    .from("agent_customers")
    .upsert({
      agent_profile_id: agentProfileId,
      phone_number: phoneNumber,
      network: network,
      name: name
    }, { onConflict: 'agent_profile_id, phone_number' });

  if (error) throw error;
}

export async function deleteAgentCustomer(agentProfileId: string, phoneNumber: string) {
  const { error } = await supabase
    .from("agent_customers")
    .delete()
    .eq("agent_profile_id", agentProfileId)
    .eq("phone_number", phoneNumber);

  if (error) throw error;
}
