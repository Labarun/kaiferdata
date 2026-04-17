/**
 * Agent Orders — /agent/orders
 *
 * Lists every order placed through this agent's storefront,
 * with delivery status and the commission earned (if any).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Phone } from "lucide-react";
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

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Get profile id
      const { data: profile } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }

      const [ords, earns] = await Promise.all([
        fetchAgentReferredOrders(profile.id, 100),
        supabase.from("agent_earnings" as any).select("order_id, commission_amount").eq("user_id", user.id),
      ]);

      if (cancelled) return;
      setOrders(ords);
      const m = new Map<string, number>();
      ((earns.data as any[]) || []).forEach((e) => m.set(e.order_id, Number(e.commission_amount)));
      setEarnings(m);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div className="animate-fade-in pb-8">
      <PageHeader title="Storefront Orders" description="Every order placed through your store." />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Share your storefront link to start earning.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {orders.map((o) => {
                const commission = earnings.get(o.id);
                return (
                  <li key={o.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
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
                        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          {o.beneficiary_number} · {o.public_order_id}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-foreground tabular-nums">
                          {fmt(o.amount_charged)}
                        </p>
                        {commission ? (
                          <p className="text-[10px] text-success font-semibold tabular-nums">
                            +{fmt(commission)}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/50">
                            {o.status === "delivered" ? "—" : "pending"}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                          {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
