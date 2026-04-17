/**
 * User Dashboard Home — Premium liquid-glass welcome screen
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WalletCard } from "@/components/shared/WalletCard";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Link } from "react-router-dom";
import { Wifi, ArrowDownToLine, ShoppingCart, ArrowRight, Clock, Sparkles } from "lucide-react";
import { ListSkeleton } from "@/components/shared/LoadingState";

export default function UserDashboardHome() {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("actor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOrders(data || []);
      setLoading(false);
    }
    load();
  }, [user]);

  const firstName = user?.fullName?.split(" ")[0] || user?.username || "there";

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

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in animate-stagger-2">
        <Link to="/dashboard/buy">
          <div className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-all duration-200 cursor-pointer group h-full">
            <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-3 group-hover:bg-primary/15 transition-colors">
              <Wifi className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Buy Data</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Purchase bundles</p>
          </div>
        </Link>

        <Link to="/dashboard/wallet">
          <div className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-all duration-200 cursor-pointer group h-full">
            <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-3 group-hover:bg-primary/15 transition-colors">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Top Up</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Fund your wallet</p>
          </div>
        </Link>
      </div>

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
                      <p className="text-sm font-medium text-foreground">
                        {o.network as string} · {(snap.volume as string) || (o.bundle_name as string)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {o.beneficiary_number as string} · {new Date(o.created_at as string).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        GH₵{Number(o.amount_charged).toLocaleString()}
                      </span>
                      <OperationsBadge status={o.status as string} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
