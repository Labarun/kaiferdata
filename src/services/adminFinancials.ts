import { supabase } from "@/integrations/supabase/client";

export interface ProfitMetricsSummary {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  total_orders: number;
}

export interface ProfitDailyTrend {
  day: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ProfitBreakdown {
  name: string;
  profit: number;
  orders: number;
}

export interface ProfitBundleBreakdown {
  bundle_code: string;
  bundle_name: string;
  network: string;
  profit: number;
  orders: number;
}

export interface ProfitMetricsResult {
  summary: ProfitMetricsSummary;
  daily_trends: ProfitDailyTrend[];
  network_breakdown: ProfitBreakdown[];
  bundle_breakdown: ProfitBundleBreakdown[];
  actor_breakdown: ProfitBreakdown[];
}

export async function getProfitMetrics(startDate: Date, endDate: Date): Promise<ProfitMetricsResult> {
  const { data, error } = await supabase.rpc("get_profit_metrics", {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  });

  if (error) {
    console.error("Error fetching profit metrics:", error);
    throw error;
  }

  // The RPC returns a single jsonb object
  const result = data as any;

  return {
    summary: result.summary || { total_revenue: 0, total_cost: 0, total_profit: 0, total_orders: 0 },
    daily_trends: result.daily_trends || [],
    network_breakdown: (result.network_breakdown || []).map((n: any) => ({
      name: n.network,
      profit: n.profit,
      orders: n.orders,
    })),
    bundle_breakdown: result.bundle_breakdown || [],
    actor_breakdown: (result.actor_breakdown || []).map((a: any) => ({
      name: a.actor_type,
      profit: a.profit,
      orders: a.orders,
    })),
  };
}
