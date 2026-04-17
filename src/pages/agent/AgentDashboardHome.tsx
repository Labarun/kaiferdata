/**
 * Agent Dashboard Home
 *
 * Shows live commissions, lifetime stats and quick actions.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { WalletCard } from "@/components/shared/WalletCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Store,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { fetchAgentSummary, fetchCommissionRate, type AgentEarningsSummary } from "@/services/agentEarnings";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number) => `GH₵${n.toFixed(2)}`;

export default function AgentDashboardHome() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AgentEarningsSummary | null>(null);
  const [rate, setRate] = useState(8);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [s, r, p] = await Promise.all([
        fetchAgentSummary(user.id),
        fetchCommissionRate(),
        supabase.from("agent_profiles").select("store_slug, store_name").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setSummary(s);
      setRate(r);
      setStoreSlug(p.data?.store_slug ?? null);
      setStoreName(p.data?.store_name ?? "");
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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

  return (
    <div className="animate-fade-in pb-6 space-y-5">
      <PageHeader
        title={`Welcome back${user?.fullName ? `, ${user.fullName}` : ""}`}
        description={`You earn ${rate}% on every delivered order.`}
      />

      {/* Earnings tile */}
      <Card className="relative overflow-hidden border-success/20 bg-gradient-to-br from-success/5 via-background to-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                Lifetime Earnings
              </p>
              <p className="text-[28px] font-bold text-success tabular-nums tracking-tight mt-1">
                {fmt(summary?.total_profit || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                {summary?.total_orders || 0} orders · {fmt(summary?.total_sales || 0)} in sales
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-success/50" />
          </div>
          <div className="flex items-center gap-2 pt-3 border-t border-border/40">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
                This Month
              </p>
              <p className="text-[15px] font-bold text-foreground tabular-nums">
                {fmt(summary?.this_month_profit || 0)}
              </p>
            </div>
            <div className="flex-1 border-l border-border/40 pl-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
                Orders
              </p>
              <p className="text-[15px] font-bold text-foreground tabular-nums">
                {summary?.this_month_orders || 0}
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs">
              <Link to="/agent/earnings">
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share storefront */}
      {storeSlug && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
                Your storefront
              </p>
              <Link to="/agent/store" className="text-[11px] text-primary font-medium">
                Manage
              </Link>
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
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Share
              </Button>
              <Button size="sm" variant="outline" asChild className="text-xs">
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Open
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <WalletCard />
        {[
          { icon: Store, title: "My Store", desc: "Edit branding & link", to: "/agent/store" },
          { icon: ShoppingCart, title: "Orders", desc: "Recent customer orders", to: "/agent/orders" },
          { icon: DollarSign, title: "Earnings", desc: "Commission history", to: "/agent/earnings" },
        ].map((item) => (
          <Link key={item.title} to={item.to}>
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
