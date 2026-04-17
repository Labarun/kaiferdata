/**
 * User Orders Page — Premium liquid-glass order history
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Clock, ChevronRight } from "lucide-react";
import { ListSkeleton } from "@/components/shared/LoadingState";

export default function UserOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .eq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (search.trim()) {
      query = query.or(`public_order_id.ilike.%${search.trim()}%,beneficiary_number.ilike.%${search.trim()}%`);
    }

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }, [user, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your purchase history</p>
      </div>

      {/* Search */}
      <div className="relative animate-fade-in animate-stagger-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="Search by order ID or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 text-sm rounded-xl glass-subtle border-0"
          onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
        />
      </div>

      {/* Orders list */}
      {loading ? (
        <ListSkeleton rows={4} />
      ) : orders.length === 0 ? (
        <div className="glass-card rounded-xl py-14 text-center animate-fade-in">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No orders found</p>
          <Link to="/dashboard/buy" className="text-xs text-primary hover:underline mt-1 inline-block">Buy your first data bundle →</Link>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in animate-stagger-2">
          {orders.map((o) => {
            const snap = (o.bundle_snapshot || {}) as Record<string, unknown>;
            return (
              <Link key={o.id as string} to={`/dashboard/orders/${o.id}`} className="cv-auto-card block">
                <div className="glass-card rounded-xl hover:scale-[1.01] transition-all duration-200">
                  <div className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{o.network as string}</p>
                        <span className="text-xs text-muted-foreground">{(snap.volume as string) || (o.bundle_name as string)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{o.beneficiary_number as string}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(o.created_at as string).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right space-y-1">
                        <p className="text-sm font-bold text-foreground">GH₵{Number(o.amount_charged).toLocaleString()}</p>
                        <OperationsBadge status={o.status as string} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
