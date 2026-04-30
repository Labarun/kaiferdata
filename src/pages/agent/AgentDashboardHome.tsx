/**
 * Agent Dashboard Home — premium analytics dashboard with separate
 * earnings balance, range filters, KPIs, top bundles, recent activity.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store, ShoppingCart, DollarSign, TrendingUp, Share2, Copy, Check, ExternalLink,
  Users, Package, Crown, ArrowDownToLine,
} from "lucide-react";
import { EarningsBalanceCard } from "@/components/agent/EarningsBalanceCard";
import { AnalyticsRangeFilter } from "@/components/agent/AnalyticsRangeFilter";
import { fetchEarningsWallet, type AgentEarningsWallet } from "@/services/agentEarningsWallet";
import { fetchAgentAnalytics, type AgentAnalytics, type AnalyticsRange } from "@/services/agentAnalytics";
import { useSubscriptionSnapshot } from "@/services/agentSubscriptionState";
import { StatCard } from "@/components/shared/StatCard";
import { DashboardSkeleton } from "@/components/shared/LoadingState";

const fmt = (n: number) => `GH₵${n.toFixed(2)}`;

export default function AgentDashboardHome() {
  const { user } = useAuth();
  const sub = useSubscriptionSnapshot();
  const [wallet, setWallet] = useState<AgentEarningsWallet | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeStatus, setStoreStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Analytics
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Initial profile + wallet
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [w, p] = await Promise.all([
        fetchEarningsWallet(user.id),
        supabase.from("agent_profiles").select("store_slug, store_name, status").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setWallet(w);
      setStoreSlug(p.data?.store_slug ?? null);
      setStoreName(p.data?.store_name ?? "");
      setStoreStatus(p.data?.status ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Analytics — refetch on range change
  useEffect(() => {
    if (!sub.agentProfileId) return;
    let cancelled = false;
    setLoadingAnalytics(true);
    fetchAgentAnalytics(sub.agentProfileId, range).then((a) => {
      if (!cancelled) {
        setAnalytics(a);
        setLoadingAnalytics(false);
      }
    });
    return () => { cancelled = true; };
  }, [sub.agentProfileId, range]);

  const storeUrl = storeSlug ? `${window.location.origin}/store/${storeSlug}` : "";

  const handleCopy = async () => {
    if (!storeUrl) return;
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShareWhatsApp = () => {
    if (!storeUrl) return;
    const text = `Buy data fast at ${storeName}! ${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const isInitialLoad = !wallet && !!user;
  if (isInitialLoad) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in pb-8 space-y-5">
      <PageHeader
        title={`Welcome back${user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        description="Real-time view of your store's performance."
      />

      {/* Subscription banner */}
      {!sub.loading && !sub.isSubscriptionActive && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">
                {sub.profileStatus === "subscription_expired" ? "Subscription expired" : "Activate your store"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pricing, marketing tools and withdrawals are locked until you subscribe.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/agent/subscription">Activate</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Earnings balance hero */}
      <EarningsBalanceCard wallet={wallet} loading={!wallet && !!user} />

      {/* Range filter */}
      <div className="space-y-2">
        <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70 px-0.5">
          Performance
        </p>
        <AnalyticsRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {loadingAnalytics ? (
          <>
            <div className="h-24 glass-card rounded-2xl animate-pulse" />
            <div className="h-24 glass-card rounded-2xl animate-pulse" />
            <div className="h-24 glass-card rounded-2xl animate-pulse" />
            <div className="h-24 glass-card rounded-2xl animate-pulse" />
          </>
        ) : (
          <>
            <StatCard icon={ShoppingCart} title="Orders" value={String(analytics?.ordersCount ?? 0)} variant="primary" size="sm" />
            <StatCard icon={TrendingUp} title="Revenue" value={fmt(analytics?.revenue ?? 0)} size="sm" />
            <StatCard icon={DollarSign} title="Profit" value={fmt(analytics?.profit ?? 0)} variant="success" size="sm" />
            <StatCard icon={Users} title="Customers" value={String(analytics?.activeCustomers ?? 0)} variant="primary" size="sm" />
          </>
        )}
      </div>

      {/* Top bundles */}
      {analytics && analytics.topBundles.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" /> Top bundles
              </p>
              <Link to="/agent/orders" className="text-[11px] text-primary font-medium">All orders →</Link>
            </div>
            <ul className="space-y-1.5">
              {analytics.topBundles.map((b, i) => (
                <li key={`${b.network}-${b.name}`} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold truncate">{b.network} · {b.name}</p>
                    <p className="text-[10.5px] text-muted-foreground/70">{b.qty} orders · {fmt(b.revenue)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Storefront share */}
      {storeSlug && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold flex items-center gap-1.5">
                <Store className="h-3 w-3" /> Your storefront
              </p>
              <Badge variant="outline" className="text-[9px] capitalize">{storeStatus ?? "—"}</Badge>
            </div>
            <code className="block text-[12px] bg-muted/50 rounded-lg px-3 py-2 truncate font-mono mb-2">
              {storeUrl}
            </code>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs">
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleShareWhatsApp} className="text-xs">
                <Share2 className="h-3.5 w-3.5 mr-1" /> Share
              </Button>
              <Button size="sm" variant="outline" asChild className="text-xs">
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      {analytics && analytics.recentOrders.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <p className="text-sm font-semibold">Recent orders</p>
              <Link to="/agent/orders" className="text-[11px] text-primary font-medium">All →</Link>
            </div>
            <ul className="divide-y divide-border/40">
              {analytics.recentOrders.slice(0, 5).map((o: any) => (
                <li key={o.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold truncate">{o.network} · {o.bundle_name}</p>
                    <p className="text-[10.5px] text-muted-foreground/70">{o.beneficiary_number} · {o.public_order_id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12.5px] font-bold tabular-nums">{fmt(Number(o.amount_charged))}</p>
                    <p className="text-[10px] text-muted-foreground/60 capitalize">{o.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid gap-2 sm:grid-cols-2">
        <QuickAction icon={ArrowDownToLine} title="Withdraw" desc="Cash out earnings" to="/agent/withdraw" />
        <QuickAction icon={Package} title="Pricing" desc="Set selling prices" to="/agent/pricing" />
      </div>
    </div>
  );
}



function QuickAction({ icon: Icon, title, desc, to }: { icon: any; title: string; desc: string; to: string }) {
  return (
    <Link to={to}>
      <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
