/**
 * User Orders Page — Premium liquid-glass order history
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, Clock, ChevronRight } from "lucide-react";
import { ListSkeleton } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { motion } from "framer-motion";

export default function UserOrdersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["user-orders", user?.id, search],
    queryFn: async () => {
      if (!user) return [];
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
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your purchase history</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="Search by order ID or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 text-sm rounded-xl glass-subtle border-0"
        />
      </div>

      {/* Orders list */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={search.trim() ? "No orders found" : "No orders yet"}
          description={
            search.trim() 
              ? "We couldn't find any orders matching your search." 
              : "When you buy data, your orders will appear here."
          }
          action={
            !search.trim() && (
              <Link to="/dashboard/buy" className="text-sm text-primary hover:underline font-medium inline-block mt-2">
                Buy your first data bundle →
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {orders.map((o, i) => {
            const snap = (o.bundle_snapshot || {}) as Record<string, unknown>;
            return (
              <motion.div
                key={o.id as string}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/dashboard/orders/${o.id}`} className="cv-auto-card block">
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
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
