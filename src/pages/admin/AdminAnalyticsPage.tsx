import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Activity, ShoppingCart, Users, CreditCard } from "lucide-react";
import { DashboardSkeleton } from "@/components/shared/LoadingState";

interface AnalyticsStats {
  totalProfit: number;
  directProfit: number;
  agentProfit: number;
  totalCommission: number;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats>({
    totalProfit: 0, directProfit: 0, agentProfit: 0, totalCommission: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.rpc("get_admin_profit_stats");
      setStats({
        totalProfit: data?.[0]?.total_profit || 0,
        directProfit: data?.[0]?.direct_profit || 0,
        agentProfit: data?.[0]?.agent_profit || 0,
        totalCommission: data?.[0]?.total_commission || 0,
      });
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Analytics" description="Platform profit and commission overview" />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Profit" value={`GH₵${stats.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={Activity} variant="success" size="sm" />
        <StatCard title="Direct Profit" value={`GH₵${stats.directProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={ShoppingCart} size="sm" />
        <StatCard title="Agent Profit" value={`GH₵${stats.agentProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={Users} size="sm" />
        <StatCard title="Agent Commissions" value={`GH₵${stats.totalCommission.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={CreditCard} size="sm" />
      </div>
    </div>
  );
}
