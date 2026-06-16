/**
 * SpecialOfferOrdersPage — the user's/agent's own special bundle orders.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, ChevronRight, Package } from "lucide-react";
import {
  fetchMySpecialOrders,
  formatGhs,
  bundleTypeLabel,
  type SpecialBundleOrder,
  type SpecialBundleType,
} from "@/services/specialBundles";
import { SpecialStatusBadge } from "@/components/special/SpecialStatusBadge";
import { Button } from "@/components/ui/button";
import { useSpecialBase } from "@/hooks/useSpecial";

export default function SpecialOfferOrdersPage() {
  const { base } = useSpecialBase();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-special-orders"],
    queryFn: fetchMySpecialOrders,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 animate-fade-in">
        <Link to={base}>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">My special orders</h1>
          <p className="text-[11px] text-muted-foreground">MTN special bundle history</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center animate-fade-in">
          <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No special orders yet</p>
          <Link to={base} className="text-primary text-[13px] font-medium mt-1 inline-block">
            Browse the offer →
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5 animate-fade-in animate-stagger-1">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} to={`${base}/orders/${order.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, to }: { order: SpecialBundleOrder; to: string }) {
  const snap = (order.package_snapshot || {}) as Record<string, unknown>;
  const size = (snap.size_label as string) || "Special bundle";
  const type = snap.bundle_type ? bundleTypeLabel(snap.bundle_type as SpecialBundleType) : "";
  return (
    <Link
      to={to}
      className="flex items-center justify-between glass-card rounded-2xl p-4 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold text-foreground truncate">{size}</p>
          <SpecialStatusBadge status={order.status} />
          {order.refund_requested && order.status === "pending" && (
            <span className="text-[10px] text-amber-600 font-medium">• refund requested</span>
          )}
        </div>
        <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">
          {type ? `${type} · ` : ""}
          {order.recipient_number} · {new Date(order.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="text-right shrink-0 flex items-center gap-1.5">
        <span className="text-sm font-bold text-foreground">{formatGhs(order.amount_charged)}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
