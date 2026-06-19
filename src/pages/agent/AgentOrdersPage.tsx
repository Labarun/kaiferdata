/**
 * Agent Orders — /agent/orders
 *
 * Lists every order placed through this agent's storefront,
 * with delivery status and the commission earned (if any).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Phone, Search, Filter, RefreshCw, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentReferredOrders } from "@/services/agentEarnings";

const fmt = (n: number) => `GH₵${Number(n).toFixed(2)}`;

const STATUS_TINTS: Record<string, string> = {
  delivered: "bg-success/10 text-success border-success/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  queued: "bg-info/10 text-info border-info/20",
  processing: "bg-info/10 text-info border-info/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export default function AgentOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    // Get profile id
    const { data: profile } = await supabase
      .from("agent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      setIsRefreshing(false);
      setLoading(false);
      return;
    }

    const [ords, earns] = await Promise.all([
      fetchAgentReferredOrders(user.id, profile.id, 100),
      supabase.from("agent_earnings" as any).select("order_id, commission_amount").eq("user_id", user.id),
    ]);

    setOrders(ords);
    const m = new Map<string, number>();
    ((earns.data as any[]) || []).forEach((e) => m.set(e.order_id, Number(e.commission_amount)));
    setEarnings(m);
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const filteredOrders = orders.filter((o) => {
    if (networkFilter !== "All" && o.network !== networkFilter) return false;
    if (statusFilter !== "All" && o.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.public_order_id?.toLowerCase().includes(q) ||
        o.beneficiary_number?.toLowerCase().includes(q) ||
        o.bundle_name?.toLowerCase().includes(q) ||
        o.network?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in pb-8 space-y-5 px-1 sm:px-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-primary" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground/90">Orders</h1>
            <p className="text-[11px] font-medium text-muted-foreground/60">{orders.length} total orders</p>
          </div>
        </div>
        <button 
          onClick={fetchOrders}
          className="h-10 w-10 rounded-full glass-premium flex items-center justify-center shrink-0 border border-primary/20 hover:bg-primary/5 active:scale-95 transition-all"
        >
          <RefreshCw className={`h-4 w-4 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Search by Order ID, phone, name, netw..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-background border-border/40 focus:border-primary/30 rounded-xl text-[13px] placeholder:text-[12px]"
        />
      </div>

      {/* Network Filter */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60 flex items-center gap-1.5 px-0.5">
          <Filter className="h-3 w-3" /> NETWORK
        </p>
        <div className="flex overflow-x-auto hide-scrollbar gap-1 p-1 bg-background rounded-2xl border border-border/40">
          {["All", "MTN", "Telecel", "AirtelTigo"].map((net) => (
            <button
              key={net}
              onClick={() => setNetworkFilter(net)}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all ${
                networkFilter === net
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground/70 hover:bg-muted/50"
              }`}
            >
              {net}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60 flex items-center gap-1.5 px-0.5">
          <Filter className="h-3 w-3" /> STATUS
        </p>
        <div className="flex overflow-x-auto hide-scrollbar gap-1 p-1 bg-background rounded-2xl border border-border/40">
          {["All", "Delivered", "Processing", "Paid", "Failed", "Pending"].map((stat) => (
            <button
              key={stat}
              onClick={() => setStatusFilter(stat)}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all ${
                statusFilter === stat
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground/70 hover:bg-muted/50"
              }`}
            >
              {stat}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="pt-2">
        {loading && orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center">
             <RefreshCw className="h-6 w-6 animate-spin text-primary/50 mb-3" />
             Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center animate-fade-in flex flex-col items-center">
            <div className="relative mb-5">
              <div className="h-16 w-16 rounded-2xl glass-premium flex items-center justify-center border border-primary/20 shadow-[0_0_24px_hsl(152_52%_36%/0.15)]">
                <ShoppingCart className="h-7 w-7 text-primary" />
              </div>
              <Star className="absolute -top-2 -right-2 h-4 w-4 text-primary fill-primary drop-shadow-[0_0_8px_hsl(152_52%_36%/0.5)]" />
            </div>
            <p className="text-[15px] font-bold text-foreground/90 tracking-tight">No orders yet</p>
            <p className="text-[12px] text-muted-foreground/60 mt-1 max-w-[250px] mx-auto">
              Share your store link to start receiving orders.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filteredOrders.map((o) => {
              const commission = earnings.get(o.id);
              return (
                <li key={o.id} className="glass-card rounded-xl px-4 py-3.5 border border-border/40 hover:border-primary/20 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {o.network} · {o.bundle_name}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${STATUS_TINTS[o.status] || ""}`}
                        >
                          {o.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 font-medium">
                        <Phone className="h-2.5 w-2.5" />
                        {o.beneficiary_number} <span className="text-muted-foreground/40 px-0.5">•</span> {o.public_order_id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-foreground tabular-nums">
                        {fmt(o.amount_charged)}
                      </p>
                      {commission ? (
                        <p className="text-[10px] text-success font-semibold tabular-nums mt-0.5">
                          +{fmt(commission)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {o.origin_type === 'agent_bulk_buy' ? 'wholesale' : "—"}
                        </p>
                      )}
                      <p className="text-[9.5px] text-muted-foreground/40 mt-1 font-medium">
                        {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
