/**
 * User Dashboard Home — Premium liquid-glass welcome screen
 *
 * Layout (mobile-first):
 *   1. Welcome header
 *   2. Wallet hero (signature card)
 *   3. KPI tiles row (Orders · Delivered · Spent)
 *   4. Quick actions (Buy / Top Up)
 *   5. Recent orders preview (with quick-reorder shortcut)
 *   6. Recent wallet activity preview
 *   7. Helpful shortcuts (track / support)
 *
 * Strict additive: read-only queries on existing tables. RLS already
 * scopes wallet/orders/transactions to the current user.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WalletCard } from "@/components/shared/WalletCard";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Link } from "react-router-dom";
import {
  Wifi, ArrowDownToLine, ShoppingCart, ArrowRight, Clock, Sparkles,
  ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Repeat,
  CheckCircle2, Package, LifeBuoy, MapPin,
} from "lucide-react";
import { ListSkeleton, DashboardSkeleton } from "@/components/shared/LoadingState";
import { StatCard } from "@/components/shared/StatCard";
import { SpecialOfferPromo } from "@/components/special/SpecialOfferPromo";

type OrderRow = Record<string, unknown>;
type TxnRow = Record<string, unknown>;

interface Stats {
  totalOrders: number;
  delivered: number;
  inFlight: number;
  totalSpent: number;
}

export default function UserDashboardHome() {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [recentTxns, setRecentTxns] = useState<TxnRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0, delivered: 0, inFlight: 0, totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      const [ordersRes, walletRes, statsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("actor_id", user!.id)
          .order("created_at", { ascending: false }).limit(4),
        supabase.from("wallets").select("id").eq("user_id", user!.id).maybeSingle(),
        supabase.from("orders").select("status, amount_charged").eq("actor_id", user!.id),
      ]);

      if (!active) return;

      setRecentOrders(ordersRes.data || []);

      // Aggregate stats
      const all = statsRes.data || [];
      const delivered = all.filter((o) => o.status === "delivered").length;
      const inFlight = all.filter((o) =>
        ["paid", "queued", "processing"].includes(o.status as string)
      ).length;
      const totalSpent = all.reduce((sum, o) => sum + Number(o.amount_charged || 0), 0);
      setStats({ totalOrders: all.length, delivered, inFlight, totalSpent });

      // Recent wallet transactions (top 4)
      if (walletRes.data) {
        const { data: txns } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", walletRes.data.id)
          .order("created_at", { ascending: false })
          .limit(4);
        if (active) setRecentTxns(txns || []);
      }

      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user]);

  const firstName = user?.fullName?.split(" ")[0] || user?.username || "there";

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary/60" />
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Dashboard</p>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's your account overview</p>
      </div>

      {/* Wallet hero */}
      <div className="animate-fade-in animate-stagger-1">
        <WalletCard />
      </div>

      <div className="grid grid-cols-3 gap-2.5 animate-fade-in animate-stagger-2">
        {loading ? (
          <>
            <div className="h-24 glass-card rounded-2xl animate-pulse" />
            <div className="h-24 glass-card rounded-2xl animate-pulse" />
            <div className="h-24 glass-card rounded-2xl animate-pulse" />
          </>
        ) : (
          <>
            <StatCard
              icon={Package}
              title="Orders"
              value={stats.totalOrders}
              size="sm"
            />
            <StatCard
              icon={CheckCircle2}
              title="Delivered"
              value={stats.delivered}
              variant="success"
              size="sm"
            />
            <StatCard
              icon={Clock}
              title="In flight"
              value={stats.inFlight}
              variant={stats.inFlight > 0 ? "warning" : "default"}
              size="sm"
            />
          </>
        )}
      </div>

      {/* Total spent strip */}
      <div className="glass-subtle rounded-xl py-3 px-4 flex items-center justify-between animate-fade-in animate-stagger-2">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            Total spent
          </span>
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums">
          GH₵{stats.totalSpent.toFixed(2)}
        </span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in animate-stagger-2">
        <Link to="/dashboard/buy">
          <div className="glass-card rounded-xl p-4 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer group h-full">
            <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-3 group-hover:bg-primary/15 transition-colors">
              <Wifi className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Buy Data</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Purchase bundles</p>
          </div>
        </Link>

        <Link to="/dashboard/wallet">
          <div className="glass-card rounded-xl p-4 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer group h-full">
            <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-3 group-hover:bg-primary/15 transition-colors">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Top Up</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Fund your wallet</p>
          </div>
        </Link>
      </div>

      {/* Special offer promo */}
      <SpecialOfferPromo to="/dashboard/special" />

      {/* Recent Orders */}
      <div className="animate-fade-in animate-stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label flex items-center gap-2">
            <ShoppingCart className="h-3.5 w-3.5" /> Recent Orders
          </h2>
          <Link to="/dashboard/orders" className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <ListSkeleton rows={3} connected />
          ) : recentOrders.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
              <Link to="/dashboard/buy" className="text-xs text-primary hover:underline mt-1 inline-block">
                Buy your first data bundle →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {recentOrders.map((o) => {
                const snap = (o.bundle_snapshot || {}) as Record<string, unknown>;
                return (
                  <Link
                    key={o.id as string}
                    to={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-primary/[0.02] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {o.network as string} · {(snap.volume as string) || (o.bundle_name as string)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {o.beneficiary_number as string} · {new Date(o.created_at as string).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        GH₵{Number(o.amount_charged).toFixed(2)}
                      </span>
                      <OperationsBadge status={o.status as string} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick re-order shortcut from latest delivered/paid order */}
        {recentOrders[0] && (
          <Link
            to="/dashboard/buy"
            className="mt-3 flex items-center gap-3 glass-subtle rounded-xl px-4 py-3 hover:bg-primary/[0.04] transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Repeat className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground">Buy again</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Same recipient or pick a new bundle
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          </Link>
        )}
      </div>

      {/* Recent wallet activity */}
      <div className="animate-fade-in animate-stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Wallet Activity
          </h2>
          <Link to="/dashboard/transactions" className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <ListSkeleton rows={3} connected />
          ) : recentTxns.length === 0 ? (
            <div className="py-10 text-center">
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No wallet activity yet</p>
              <Link to="/dashboard/wallet" className="text-xs text-primary hover:underline mt-1 inline-block">
                Top up your wallet →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {recentTxns.map((t) => {
                const isInflow = t.direction === "inflow";
                return (
                  <Link
                    key={t.id as string}
                    to={`/dashboard/transactions/${t.id}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-primary/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isInflow ? "bg-primary/10" : "bg-muted"}`}>
                        {isInflow
                          ? <ArrowDownLeft className="h-3.5 w-3.5 text-primary" />
                          : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {(t.narration as string) || (t.transaction_type as string)}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground/60">
                          {new Date(t.created_at as string).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      isInflow ? "text-primary" : "text-foreground"
                    }`}>
                      {isInflow ? "+" : "−"}GH₵{Number(t.amount).toFixed(2)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Helpful shortcuts */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in animate-stagger-4">
        <Link
          to="/track"
          className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-primary/[0.03] transition-colors"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground">Track an order</p>
            <p className="text-[10.5px] text-muted-foreground">By order ID</p>
          </div>
        </Link>
        <a
          href="https://wa.me/233204471969"
          target="_blank"
          rel="noreferrer"
          className="glass-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-primary/[0.03] transition-colors"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <LifeBuoy className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground">Need help?</p>
            <p className="text-[10.5px] text-muted-foreground">Chat support</p>
          </div>
        </a>
      </div>
    </div>
  );
}


