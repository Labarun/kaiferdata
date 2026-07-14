/**
 * Agent Earnings — /agent/earnings
 *
 * Shows the agent's wallet-credited commissions, month-to-date stats
 * and a complete history table.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ShoppingCart, Percent, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchEarningsWallet, type AgentEarningsWallet } from "@/services/agentEarningsWallet";
import {
  fetchAgentEarnings,
  fetchAgentSummary,
  fetchCommissionRate,
  type AgentEarning,
  type AgentEarningsSummary,
} from "@/services/agentEarnings";

const fmt = (n: number) => `GH₵${n.toFixed(2)}`;

export default function AgentEarningsPage() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<AgentEarning[]>([]);
  const [summary, setSummary] = useState<AgentEarningsSummary | null>(null);
  const [wallet, setWallet] = useState<AgentEarningsWallet | null>(null);
  const [rate, setRate] = useState<number>(8);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [e, s, r, w] = await Promise.all([
        fetchAgentEarnings(user.id),
        fetchAgentSummary(user.id),
        fetchCommissionRate(),
        fetchEarningsWallet(user.id),
      ]);
      if (cancelled) return;
      setEarnings(e);
      setSummary(s);
      setRate(r);
      setWallet(w);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  
  const withdrawalEfficiency = wallet && wallet.total_earned > 0 
    ? ((wallet.total_withdrawn / wallet.total_earned) * 100).toFixed(0) 
    : "0";

  return (
    <div className="animate-fade-in pb-8">
      <PageHeader
        title="Earnings"
        description={`You earn ${rate}% commission on every delivered order from your store.`}
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          icon={TrendingUp}
          label="This Week"
          value={fmt(summary?.this_week_profit || 0)}
          tint="text-success"
        />
        <StatTile
          icon={TrendingUp}
          label="This Month"
          value={fmt(summary?.this_month_profit || 0)}
          tint="text-primary"
        />
        <StatTile
          icon={DollarSign}
          label="Lifetime Profit"
          value={fmt(summary?.total_profit || 0)}
          tint="text-foreground"
        />
        <StatTile
          icon={Percent}
          label="Withdrawn"
          value={`${withdrawalEfficiency}%`}
          tint="text-warning"
        />
      </div>

      {/* History */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Recent commissions</p>
            <Link to="/dashboard/wallet" className="text-[11px] text-primary inline-flex items-center gap-0.5 font-medium">
              Wallet <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-xs text-muted-foreground">Loading…</div>
          ) : earnings.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No commissions yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Commissions appear here as soon as orders from your store are delivered.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {earnings.map((e) => (
                <li key={e.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {e.order_network} · {e.order_bundle_name || "Bundle"}
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {e.commission_rate}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      Order {e.order_public_id || e.order_id.slice(0, 8)} · {fmt(e.order_amount)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[14px] font-bold text-success tabular-nums">
                      +{fmt(e.commission_amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(e.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon className={`h-3.5 w-3.5 ${tint}`} />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            {label}
          </p>
        </div>
        <p className="text-[18px] font-bold text-foreground tabular-nums tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
