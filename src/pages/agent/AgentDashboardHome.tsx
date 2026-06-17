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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Store, ShoppingCart, DollarSign, TrendingUp, Share2, Copy, Check, ExternalLink,
  Users, Package, Crown, ArrowDownToLine, AlertCircle, Tag, ListChecks
} from "lucide-react";
import { EarningsBalanceCard } from "@/components/agent/EarningsBalanceCard";
import { AnalyticsRangeFilter } from "@/components/agent/AnalyticsRangeFilter";
import { fetchEarningsWallet, type AgentEarningsWallet } from "@/services/agentEarningsWallet";
import { fetchAgentAnalytics, type AgentAnalytics, type AnalyticsRange } from "@/services/agentAnalytics";
import { useSubscriptionSnapshot } from "@/services/agentSubscriptionState";
import { StatCard } from "@/components/shared/StatCard";
import { DashboardSkeleton } from "@/components/shared/LoadingState";
import { WalletCard } from "@/components/shared/WalletCard";
import { SpecialOfferPromo } from "@/components/special/SpecialOfferPromo";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { createDepositIntent, initializePayment } from "@/services/purchaseIntent";
import { calculatePaystackFee, formatGHS as formatGHSPaystack } from "@/services/paystackFee";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck, ArrowRight, Sparkles, Wallet, Trophy, CreditCard } from "lucide-react";
import { useMemo, useCallback } from "react";

const DEPOSIT_PRESETS = [5, 10, 20, 50, 100, 200];

const fmt = (n: number) => `GH₵${n.toFixed(2)}`;

export default function AgentDashboardHome() {
  const { user } = useAuth();
  const sub = useSubscriptionSnapshot();
  const [wallet, setWallet] = useState<AgentEarningsWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeStatus, setStoreStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Analytics
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Deposit sheet state
  const { toast } = useToast();
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depositLabel, setDepositLabel] = useState("");

  const parsedAmount = parseFloat(depositAmount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 10000;
  const depositFee = useMemo(() => validAmount ? calculatePaystackFee(parsedAmount) : null, [parsedAmount, validAmount]);

  const handleDeposit = useCallback(async () => {
    if (!user || !validAmount) return;

    setDepositing(true);
    try {
      setDepositLabel("Creating deposit request…");
      const intent = await createDepositIntent({
        amount: parsedAmount,
        userId: user.id,
        userEmail: user.email || undefined,
        userName: user.fullName || undefined,
        sourceChannel: "agent_dashboard",
      });

      setDepositLabel("Initializing payment…");
      const payment = await initializePayment(intent.id);

      setDepositLabel("Redirecting to Paystack…");
      window.location.href = payment.authorization_url;
    } catch (err: any) {
      setDepositing(false);
      setDepositLabel("");
      toast({
        title: "Deposit Failed",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, parsedAmount, validAmount, toast]);

  const [spendingBalance, setSpendingBalance] = useState<number | null>(null);

  // Initial profile + wallet
  useEffect(() => {
    if (!user?.id) {
      setLoadingWallet(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [w, p, s] = await Promise.all([
        fetchEarningsWallet(user.id),
        supabase.from("agent_profiles").select("store_slug, store_name, status").eq("user_id", user.id).maybeSingle(),
        supabase.from("wallets").select("current_balance").eq("user_id", user.id).single()
      ]);
      if (cancelled) return;
      setWallet(w);
      setStoreSlug(p.data?.store_slug ?? null);
      setStoreName(p.data?.store_name ?? "");
      setStoreStatus(p.data?.status ?? null);
      setSpendingBalance(s.data ? Number(s.data.current_balance) : null);
      setLoadingWallet(false);
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

  const isInitialLoad = loadingWallet && !!user;
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

      {/* Special offer promo (agent panel — near Buy Data, not on storefront) */}
      <SpecialOfferPromo to="/agent/special" />

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-xl h-11">
          <TabsTrigger value="overview" className="rounded-lg text-xs h-full">Overview</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg text-xs h-full">Orders</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg text-xs h-full">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 outline-none">
          {/* Top 3 Cards Grid */}
          <div className="space-y-2 pb-2">
            {/* Earnings - Wide Premium */}
            <div className="relative rounded-2xl border border-success/20 bg-gradient-to-br from-[#0c1613] to-[#0a110f] p-5 w-full flex flex-col justify-between overflow-hidden shadow-lg shadow-success/5">
              {/* Subtle background glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-success/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between relative z-10 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-success mb-1">Earnings</p>
                  <p className="text-[11px] text-muted-foreground/70">Profit from sales · separate from personal wallet</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-success" />
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-start">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-success/80">GH₵</span>
                  <span className="text-3xl font-bold tracking-tight text-success tabular-nums">
                    {(wallet?.current_balance ?? 0).toFixed(2)}
                  </span>
                </div>
                <Link to="/agent/withdraw" className="text-[11px] font-semibold text-success hover:text-success/80 mt-2 flex items-center gap-1 group w-fit bg-success/10 px-2.5 py-1 rounded-full transition-colors">
                  Withdraw <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Bottom 2 Cards */}
            <div className="grid grid-cols-2 gap-2">
              {/* Spending Balance */}
              <div className="glass-card rounded-2xl border border-border/40 p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-muted p-1.5 rounded-lg">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Spending Balance</p>
                </div>
                <p className="text-lg font-bold tracking-tight tabular-nums text-foreground/90">
                  {fmt(spendingBalance ?? 0)}
                </p>
                <button 
                  onClick={() => {
                    setDepositAmount("");
                    setDepositing(false);
                    setDepositLabel("");
                    setDepositOpen(true);
                  }}
                  className="text-[11px] font-semibold text-primary hover:text-primary/80 mt-1.5 flex items-center gap-1 group w-fit text-left"
                >
                  Add Money <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Profit Earned */}
              <div className="glass-card rounded-2xl border border-border/40 p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-muted p-1.5 rounded-lg">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Profit Earned</p>
                </div>
                <p className="text-lg font-bold tracking-tight tabular-nums text-foreground/90">
                  {fmt(wallet?.total_earned ?? 0)}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                  All time
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid (3x3) */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50 px-0.5">Quick Actions</p>
            <div className="grid grid-cols-3 gap-2">
              <Link to="/agent/bulk" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl glass-card border border-border/40 hover:border-primary/30 transition-all text-center">
                <ShoppingCart className="h-5 w-5 text-primary/80" />
                <span className="text-[10px] font-semibold text-foreground/90">Buy data</span>
              </Link>
              <button onClick={() => setDepositOpen(true)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl glass-card border border-border/40 hover:border-primary/30 transition-all text-center">
                <CreditCard className="h-5 w-5 text-primary/80" />
                <span className="text-[10px] font-semibold text-foreground/90">Add money</span>
              </button>
              <Link to="/agent/withdraw" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl glass-card border border-border/40 hover:border-primary/30 transition-all text-center">
                <ArrowDownToLine className="h-5 w-5 text-primary/80" />
                <span className="text-[10px] font-semibold text-foreground/90">Withdraw</span>
              </Link>
              <Link to="/agent/customers" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl glass-card border border-border/40 hover:border-primary/30 transition-all text-center">
                <Users className="h-5 w-5 text-primary/80" />
                <span className="text-[10px] font-semibold text-foreground/90">Customers</span>
              </Link>
              <Link to="/agent/pricing" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl glass-card border border-border/40 hover:border-primary/30 transition-all text-center">
                <Tag className="h-5 w-5 text-primary/80" />
                <span className="text-[10px] font-semibold text-foreground/90">Pricing</span>
              </Link>
              <Link to="/agent/transactions" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl glass-card border border-border/40 hover:border-primary/30 transition-all text-center">
                <ListChecks className="h-5 w-5 text-primary/80" />
                <span className="text-[10px] font-semibold text-foreground/90">Transactions</span>
              </Link>
            </div>
          </div>

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
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs">
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleShareWhatsApp} className="text-xs">
                <Share2 className="h-3.5 w-3.5 mr-1" /> Share
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button size="sm" variant="outline" asChild className="text-xs">
                <Link to="/agent/store">
                  <Store className="h-3.5 w-3.5 mr-1" /> Edit Store
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="text-xs">
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                </a>
              </Button>
            </div>
            
            <Button size="sm" asChild className="w-full text-xs font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all border border-primary/20 mt-1">
              <Link to="/agent/pricing">
                <Tag className="h-3.5 w-3.5 mr-1.5" /> Set store front pricing
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
          {/* Latest orders */}
          <Card className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
              <p className="text-[13px] font-bold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> Latest orders
              </p>
              <Link to="/agent/orders" className="text-[11px] text-primary font-semibold hover:text-primary/80 flex items-center gap-0.5">
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardContent className="p-0">
              {analytics && analytics.recentOrders.length > 0 ? (
                <ul className="divide-y divide-border/40">
                  {analytics.recentOrders.slice(0, 5).map((o: any) => (
                    <li key={o.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold truncate text-foreground/90">{o.network} · {o.bundle_name}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{o.beneficiary_number} · {o.public_order_id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-bold tabular-nums text-foreground/90">{fmt(Number(o.amount_charged))}</p>
                        <p className="text-[9.5px] text-muted-foreground/60 capitalize mt-0.5">{o.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 px-6">
                  <p className="text-[14px] font-bold text-foreground/90 mb-1.5">No sales yet</p>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-[250px] mx-auto mb-5">
                    Share your store link with friends or family to make your first sale.
                  </p>
                  <Button variant="outline" size="sm" asChild className="rounded-xl h-9 px-4 text-xs font-semibold glass-card hover:bg-muted/50 border-border/40">
                    <a href={storeUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      Open my store <ExternalLink className="h-3 w-3 ml-1.5" />
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-5 outline-none">
          {loadingAnalytics ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center">
               <Loader2 className="h-6 w-6 animate-spin text-primary/50 mb-3" />
               Loading orders...
            </div>
          ) : (!analytics?.recentOrders || analytics.recentOrders.length === 0) ? (
            <div className="py-16 text-center glass-card rounded-2xl flex flex-col items-center border border-border/40">
              <div className="h-16 w-16 rounded-2xl glass-premium flex items-center justify-center mb-4">
                <ShoppingCart className="h-7 w-7 text-primary/60" />
              </div>
              <p className="text-[14px] font-bold text-foreground/90 tracking-tight">No orders found</p>
              <p className="text-[11.5px] text-muted-foreground/60 mt-1.5 max-w-[250px] mx-auto leading-relaxed">
                Orders made from your storefront or your bulk purchases will appear here.
              </p>
            </div>
          ) : (
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <ul className="divide-y divide-border/40">
                  {analytics.recentOrders.map((o: any) => (
                    <li key={o.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[13px] font-semibold text-foreground truncate">
                            {o.network} · {o.bundle_name}
                          </p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">
                            {o.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70 truncate font-medium">
                          {o.beneficiary_number} <span className="mx-0.5">•</span> {o.public_order_id}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-foreground tabular-nums">
                          {fmt(Number(o.amount_charged))}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {o.origin_type === 'agent_bulk_buy' ? 'wholesale' : (o.status === "delivered" ? "—" : "pending")}
                        </p>
                        <p className="text-[9px] text-muted-foreground/40 mt-1">
                          {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-center pt-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl glass-card h-9">
              <Link to="/agent/orders">View All Orders & Commissions</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-5 outline-none">
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
        </TabsContent>
      </Tabs>

      {/* ── Deposit Bottom Sheet ── */}
      <Drawer open={depositOpen} onOpenChange={(v) => { if (!depositing) setDepositOpen(v); }}>
          <DrawerContent
            className={cn(
              "border-0 rounded-t-[28px] overflow-hidden max-h-[94vh] supports-[height:100dvh]:max-h-[100dvh]",
              "flex flex-col",
              "bg-[hsl(214_42%_97%/0.92)] dark:bg-[hsl(213_40%_12%/0.92)] backdrop-blur-[44px] saturate-[1.9]",
              "shadow-[0_-4px_40px_-8px_hsl(213_40%_40%/0.12),0_-1px_6px_-1px_hsl(213_35%_50%/0.06),inset_0_1px_0_0_hsl(0_0%_100%/0.7)]",
              "dark:shadow-[0_-4px_40px_-8px_hsl(0_0%_0%/0.5),0_-1px_6px_-1px_hsl(0_0%_0%/0.3),inset_0_1px_0_0_hsl(0_0%_100%/0.05)]",
            )}
          >
            <div className="flex justify-center pt-3.5 pb-2 shrink-0">
              <div className="h-[5px] w-10 rounded-full bg-[hsl(213_25%_78%/0.35)] dark:bg-[hsl(213_25%_40%/0.35)]" />
            </div>

            <div className="px-5 pb-8 pt-2 overflow-y-auto overscroll-contain flex-1 min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
              {depositing ? (
              <div className="py-10 text-center space-y-5 animate-fade-in">
                <div className="h-16 w-16 rounded-2xl glass-premium flex items-center justify-center mx-auto">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-foreground/85 tracking-tight">
                    {depositLabel || "Processing…"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground/50 mt-2 max-w-[220px] mx-auto leading-relaxed">
                    Preparing your deposit. Please don't close this screen.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div className="text-center">
                  <h2 className="text-[17px] font-bold text-foreground/90 tracking-tight">Top Up Wallet</h2>
                  <p className="text-[12px] text-muted-foreground/55 mt-1">Enter deposit amount in GH₵</p>
                </div>

                {/* Amount input */}
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-muted-foreground/40">GH₵</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className={cn(
                        "h-16 text-[28px] font-bold tracking-tight rounded-2xl pl-14 pr-4 text-center",
                        "bg-[hsl(0_0%_100%/0.6)] dark:bg-[hsl(213_30%_16%/0.6)] border-[hsl(228_20%_84%/0.5)] dark:border-[hsl(213_30%_26%/0.5)]",
                        "focus:bg-[hsl(0_0%_100%/0.75)] dark:focus:bg-[hsl(213_30%_16%/0.8)] focus:border-primary/25",
                        "focus:shadow-[0_0_0_4px_hsl(215_72%_42%/0.06)] dark:focus:shadow-[0_0_0_4px_hsl(213_73%_50%/0.15)]",
                        "placeholder:text-muted-foreground/60 placeholder:font-normal",
                      )}
                      min={1}
                      max={10000}
                      step="0.01"
                    />
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {DEPOSIT_PRESETS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(String(amt))}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200",
                          Number(depositAmount) === amt
                            ? "glass-elevated ring-2 ring-primary/20 text-primary"
                            : "glass-card text-muted-foreground hover:glass-elevated"
                        )}
                      >
                        GH₵{amt}
                      </button>
                    ))}
                  </div>

                  {depositAmount && !validAmount && (
                    <p className="text-[10.5px] text-destructive/80 text-center font-medium">
                      Enter an amount between GH₵1.00 and GH₵10,000.00
                    </p>
                  )}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

                {/* Fee breakdown */}
                {depositFee && (
                  <div className="rounded-xl glass-card overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="text-[11px] text-muted-foreground/55 font-medium">Deposit Amount</span>
                      <span className="text-[12px] font-semibold text-foreground/70 tabular-nums">GH₵{formatGHSPaystack(depositFee.baseAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-[hsl(215_40%_96%/0.2)] dark:bg-[hsl(213_30%_20%/0.25)]">
                      <span className="text-[11px] text-muted-foreground/55 font-medium flex items-center gap-1">
                        Processing Fee <span className="text-[9px] text-muted-foreground/35">(3%)</span>
                      </span>
                      <span className="text-[12px] font-medium text-muted-foreground/60 tabular-nums">GH₵{formatGHSPaystack(depositFee.feeAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-3 bg-[hsl(215_40%_96%/0.35)] dark:bg-[hsl(213_30%_20%/0.4)]">
                      <span className="text-[10px] text-muted-foreground/55 font-semibold uppercase tracking-wider">Total Charge</span>
                      <span className="text-[14px] font-bold text-foreground/80 tabular-nums">GH₵{formatGHSPaystack(depositFee.totalAmount)}</span>
                    </div>
                    <div className="px-3.5 py-2 bg-primary/5 dark:bg-primary/10">
                      <p className="text-[10px] text-primary/70 dark:text-primary/80 font-medium text-center">
                        💰 GH₵{formatGHSPaystack(depositFee.baseAmount)} will be credited to your wallet
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleDeposit}
                  disabled={!validAmount}
                  className="w-full h-[52px] rounded-2xl text-[14px] font-semibold relative overflow-hidden"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  {depositFee
                    ? `Pay GH₵${formatGHSPaystack(depositFee.totalAmount)}`
                    : "Enter Amount"
                  }
                  {validAmount && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <p className="text-[9.5px] text-muted-foreground/35 text-center font-medium flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-success/45" />
                  Secured via Paystack · MoMo or Card
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
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
