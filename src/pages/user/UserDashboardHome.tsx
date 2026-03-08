/**
 * User Dashboard Home — Welcome, wallet, quick actions, recent orders
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WalletCard } from "@/components/shared/WalletCard";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Wifi, ArrowDownToLine, ShoppingCart, ArrowRight, Clock, Loader2 } from "lucide-react";

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
    <div className="animate-fade-in space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here's your account overview</p>
      </div>

      {/* Wallet + Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WalletCard />

        <Link to="/dashboard/buy">
          <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Wifi className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Buy Data</p>
                <p className="text-xs text-muted-foreground">Purchase data bundles</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard/wallet">
          <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <ArrowDownToLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Top Up Wallet</p>
                <p className="text-xs text-muted-foreground">Fund your account</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" /> Recent Orders
          </CardTitle>
          <Link to="/dashboard/orders" className="text-[11px] text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
              <Link to="/dashboard/buy" className="text-xs text-primary hover:underline mt-1 inline-block">Buy your first data bundle →</Link>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentOrders.map((o) => {
                const snap = (o.bundle_snapshot || {}) as Record<string, unknown>;
                return (
                  <Link
                    key={o.id as string}
                    to={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{o.network as string} · {snap.volume as string || o.bundle_name as string}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{o.beneficiary_number as string} · {new Date(o.created_at as string).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-foreground">GH₵{Number(o.amount_charged).toLocaleString()}</span>
                      <OperationsBadge status={o.status as string} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
