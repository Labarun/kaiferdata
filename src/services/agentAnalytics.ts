/**
 * Agent Analytics Service
 *
 * Computes dashboard KPIs for the agent over a chosen date range.
 * Uses purchase_intents.order_context.referral.agent_profile_id to scope
 * orders to the current agent. Read-only.
 */
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsRange = "today" | "yesterday" | "7d" | "30d" | "60d" | "all";

export function loadAnalyticsRange(): AnalyticsRange {
  const saved = localStorage.getItem("agent_analytics_range");
  return (saved as AnalyticsRange) || "30d";
}

export function saveAnalyticsRange(range: AnalyticsRange) {
  localStorage.setItem("agent_analytics_range", range);
}

export function rangeToBounds(range: AnalyticsRange): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  switch (range) {
    case "today": return { from: startOfDay(now), to: null };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = startOfDay(y);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start, to: end };
    }
    case "7d": {
      const f = new Date(now);
      f.setDate(f.getDate() - 7);
      return { from: f, to: null };
    }
    case "30d": {
      const f = new Date(now);
      f.setDate(f.getDate() - 30);
      return { from: f, to: null };
    }
    case "60d": {
      const f = new Date(now);
      f.setDate(f.getDate() - 60);
      return { from: f, to: null };
    }
    case "all":
    default: return { from: null, to: null };
  }
}

export interface AgentAnalytics {
  ordersCount: number;
  revenue: number;
  profit: number;
  activeCustomers: number; // unique beneficiaries in range
  topBundles: { name: string; network: string; qty: number; revenue: number }[];
  recentOrders: any[];
  recentEarnings: any[];
  storefrontRevenue: number;
  bulkRevenue: number;
  dailyTrend: { day: string; revenue: number }[];
  prevRevenue?: number;
  prevProfit?: number;
}

/** Fetch analytics for a given agent_profile_id within a range. */
export async function fetchAgentAnalytics(agentProfileId: string, range: AnalyticsRange): Promise<AgentAnalytics> {
  // 1. Fetch agent user_id from profile
  const { data: profile } = await supabase
    .from("agent_profiles")
    .select("user_id")
    .eq("id", agentProfileId)
    .single();

  const agentUserId = profile?.user_id;

  // 2. Find intent IDs referenced by this agent (storefront sales)
  const { data: intents } = await supabase
    .from("purchase_intents")
    .select("id")
    .filter("order_context->referral->>agent_profile_id", "eq", agentProfileId)
    .limit(5000);

  const intentIds = (intents ?? []).map((i: any) => i.id);

  // 3. Construct OR filter
  let orFilter = "";
  if (intentIds.length > 0) {
    orFilter += `intent_id.in.(${intentIds.join(",")})`;
  }
  if (agentUserId) {
    if (orFilter) orFilter += ",";
    orFilter += `and(actor_id.eq.${agentUserId},or(actor_type.eq.agent,origin_type.eq.agent_bulk_buy))`;
  }

  if (!orFilter) {
    return { ordersCount: 0, revenue: 0, profit: 0, activeCustomers: 0, topBundles: [], recentOrders: [], recentEarnings: [], storefrontRevenue: 0, bulkRevenue: 0, dailyTrend: [], prevRevenue: 0, prevProfit: 0 };
  }

  // 4. Orders with date filter
  const { from, to } = rangeToBounds(range);
  let oq = supabase
    .from("orders")
    .select("id, created_at, amount_charged, beneficiary_number, bundle_name, network, status, public_order_id, origin_type")
    .or(orFilter)
    .order("created_at", { ascending: false });
  if (from) oq = oq.gte("created_at", from.toISOString());
  if (to) oq = oq.lt("created_at", to.toISOString());
  const { data: orders } = await oq.limit(1000);

  const orderRows = (orders ?? []) as any[];

  // 3. Earnings within same window for profit
  let eq = supabase
    .from("agent_earnings" as any)
    .select("id, order_id, commission_amount, order_amount, created_at")
    .eq("agent_profile_id", agentProfileId)
    .order("created_at", { ascending: false });
  if (from) eq = eq.gte("created_at", from.toISOString());
  if (to) eq = eq.lt("created_at", to.toISOString());
  const { data: earnings } = await eq.limit(1000);
  const earningRows = ((earnings as any[]) ?? []);

  // Aggregations
  const revenue = orderRows.reduce((s, o) => s + Number(o.amount_charged || 0), 0);
  const profit = earningRows.reduce((s, e) => s + Number(e.commission_amount || 0), 0);
  const uniqueBenef = new Set(orderRows.map((o) => o.beneficiary_number).filter(Boolean));

  let storefrontRevenue = 0;
  let bulkRevenue = 0;
  const dailyMap = new Map<string, number>();

  orderRows.forEach(o => {
    const amt = Number(o.amount_charged || 0);
    if (o.origin_type === 'agent_bulk_buy') {
       bulkRevenue += amt;
    } else {
       storefrontRevenue += amt;
    }
    const dayStr = o.created_at.substring(0, 10);
    dailyMap.set(dayStr, (dailyMap.get(dayStr) || 0) + amt);
  });

  const dailyTrend = Array.from(dailyMap.entries())
    .map(([day, rev]) => ({ day, revenue: rev }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Top bundles
  const bundleMap = new Map<string, { name: string; network: string; qty: number; revenue: number }>();
  orderRows.forEach((o) => {
    const key = `${o.network}__${o.bundle_name}`;
    const cur = bundleMap.get(key);
    if (cur) {
      cur.qty += 1;
      cur.revenue += Number(o.amount_charged || 0);
    } else {
      bundleMap.set(key, { name: o.bundle_name, network: o.network, qty: 1, revenue: Number(o.amount_charged || 0) });
    }
  });
  const topBundles = Array.from(bundleMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    ordersCount: orderRows.length,
    revenue,
    profit,
    activeCustomers: uniqueBenef.size,
    topBundles,
    recentOrders: orderRows.slice(0, 10),
    recentEarnings: earningRows.slice(0, 10),
    storefrontRevenue,
    bulkRevenue,
    dailyTrend,
    prevRevenue: 0,
    prevProfit: 0
  };
}
