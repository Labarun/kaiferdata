import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminStatStrip, type AdminStat } from "@/components/admin/AdminStatStrip";
import { PageLoader } from "@/components/shared/LoadingState";
import { Trophy, TrendingUp, Users, DollarSign } from "lucide-react";

interface TopAgent {
  agent_id: string;
  user_id: string;
  store_name: string;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
}

export function AdminAgentAnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [activeSubs, setActiveSubs] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentsRes, subsRes, earningsRes] = await Promise.all([
          supabase.rpc("get_top_agents", { timeframe: "all" }),
          supabase.from("agent_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("agent_earnings").select("commission_amount").eq("status", "paid"),
        ]);

        if (cancelled) return;

        setTopAgents(agentsRes.data || []);
        setActiveSubs(subsRes.count || 0);

        let sum = 0;
        if (earningsRes.data) {
          sum = earningsRes.data.reduce((acc, curr) => acc + Number(curr.commission_amount), 0);
        }
        setTotalCommission(sum);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoader />;

  const stats: AdminStat[] = [
    { label: "Active Subscriptions", value: activeSubs, icon: Users, tone: "primary" },
    { label: "Total Commissions Paid", value: `GH₵${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, tone: "success" },
    { label: "Top Agents Count", value: topAgents.length, icon: Trophy, tone: "default" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminStatStrip stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Top Performing Agents (All Time)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topAgents.length === 0 ? (
            <p className="text-xs text-muted-foreground px-6 pb-4">No agent activity data yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {topAgents.map((agent, index) => (
                <div key={agent.agent_id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{agent.store_name || "Unnamed Store"}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.total_orders} Orders Generated
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-foreground">
                      GH₵{Number(agent.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="secondary" className="text-[10px] mt-1 font-semibold text-success">
                      Earned: GH₵{Number(agent.total_commission).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
