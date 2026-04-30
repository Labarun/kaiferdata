/**
 * TrackOrderPage — Premium liquid-glass order tracking
 * Now supports real order lookup by Order ID or Intent Reference
 */
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { lookupOrder, lookupIntent } from "@/services/purchaseIntent";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Copy,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  customerStatusLabel,
  customerStatusHelper,
  customerBundleLabel,
  toCustomerStatusKey,
  sanitizeCustomerMessage,
} from "@/lib/customerStatus";

// Customer-facing icons keyed by sanitized status. Internal supplier
// statuses are mapped (via toCustomerStatusKey) before lookup so customers
// only ever see "Order Placed / Processing / Delivered / Failed / Cancelled".
const STATUS_ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  placed: { icon: Clock, color: "text-primary" },
  processing: { icon: Truck, color: "text-amber-500" },
  delivered: { icon: CheckCircle2, color: "text-success" },
  failed: { icon: XCircle, color: "text-destructive" },
  cancelled: { icon: XCircle, color: "text-muted-foreground" },
  refunded: { icon: RotateCcw, color: "text-muted-foreground" },
};

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReference(ref);
      handleSearch(ref);
    }
  }, []);

  async function handleSearch(ref?: string) {
    const searchRef = (ref || reference).trim();
    if (!searchRef) return;
    setLoading(true);
    setSearched(true);
    setOrder(null);
    setTimeline([]);

    try {
      const result = await lookupOrder(searchRef);
      setOrder(result);

      // Fetch status timeline if order found
      if (result?.id) {
        const { data: history } = await supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", result.id as string)
          .order("changed_at", { ascending: true });
        setTimeline(history || []);
      }
    } catch {
      setOrder(null);
    }

    setLoading(false);
  }

  // Auto-refresh: subscribe to realtime order updates
  useEffect(() => {
    if (!order?.id) return;
    const orderId = order.id as string;
    const channel = supabase
      .channel(`track-order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
        setOrder((prev) => prev ? { ...prev, ...payload.new } : prev);
        // Re-fetch timeline on status change
        supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", orderId)
          .order("changed_at", { ascending: true })
          .then(({ data }) => { if (data) setTimeline(data); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.id]);

  const snapshot = (order?.bundle_snapshot || {}) as Record<string, unknown>;
  const rawStatus = String(order?.status || "");
  const statusKey = toCustomerStatusKey(rawStatus);
  const statusConf = STATUS_ICONS[statusKey] || STATUS_ICONS.processing;
  const StatusIcon = statusConf.icon;
  const statusLabel = customerStatusLabel(rawStatus);
  const safeDeliveryMsg = sanitizeCustomerMessage(order?.delivery_message as string | null, rawStatus) ||
    customerStatusHelper(rawStatus);

  const copyId = () => {
    const id = order?.public_order_id as string;
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[70vh]">
      {/* Header */}
      <div className="bg-hero-gradient border-b border-border/20">
        <div className="container py-8 sm:py-10 text-center">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground/90 tracking-tight">
            Track Your Order
          </h1>
          <p className="text-[12.5px] text-muted-foreground/55 mt-1.5">
            Enter your Order ID or Reference to check status
          </p>
        </div>
      </div>

      <div className="container py-6 sm:py-8">
        <div className="max-w-md mx-auto">
          {/* Search */}
          <div className="glass-premium rounded-2xl p-5 mb-6 shimmer-edge overflow-hidden">
            <div className="space-y-3">
              <Input
                placeholder="KD-ORD-XXXXXXXX or KD-XXXXXXXX"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                className="h-12 font-mono text-base md:text-sm rounded-xl text-center bg-white/60 dark:bg-white/5 border-black/10 dark:border-white/10 focus:border-primary/50 placeholder:text-muted-foreground/50"
                maxLength={30}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={() => handleSearch()}
                className="w-full h-11"
                disabled={loading || !reference.trim()}
              >
                {loading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-4 w-4" />
                )}
                Track Order
              </Button>
            </div>
          </div>

          {/* Not found */}
          {searched && !loading && !order && (
            <div className="text-center py-8 animate-fade-in">
              <div className="h-14 w-14 rounded-2xl glass-premium flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-7 w-7 text-destructive/60" />
              </div>
              <p className="text-[14px] font-bold text-foreground/85">Order not found</p>
              <p className="text-[12px] text-muted-foreground/55 mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                Double-check your reference and try again. References start with KD-ORD- or KD-.
              </p>
            </div>
          )}

          {/* Result */}
          {order && (
            <div className="space-y-5 animate-fade-in">
              {/* Status badge */}
              <div className="text-center">
                <div className={cn(
                  "h-14 w-14 rounded-2xl glass-premium flex items-center justify-center mx-auto mb-3",
                  statusKey === "delivered" && "shadow-[0_0_20px_hsl(152_52%_36%/0.12)]"
                )}>
                  <StatusIcon className={cn("h-7 w-7", statusConf.color)} />
                </div>
                <p className={cn("text-[15px] font-bold tracking-tight", statusConf.color)}>
                  {statusLabel}
                </p>
                <p className="text-[12px] text-muted-foreground/60 mt-1 max-w-[280px] mx-auto leading-relaxed">
                  {safeDeliveryMsg}
                </p>
              </div>

              {/* Order ID card */}
              <div className="glass-premium rounded-2xl p-4 flex items-center justify-between gap-3 shimmer-edge overflow-hidden">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground/55 uppercase tracking-wider font-semibold">
                    Order ID
                  </p>
                  <p className="font-mono text-[14px] font-bold text-foreground mt-0.5 truncate">
                    {order.public_order_id as string}
                  </p>
                </div>
                <button
                  onClick={copyId}
                  className="shrink-0 h-10 w-10 rounded-xl glass-card hover:glass-elevated flex items-center justify-center transition-all active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {copied && (
                <p className="text-[11px] text-success text-center -mt-3 font-medium animate-fade-in">Copied!</p>
              )}

              {/* Details */}
              <div className="rounded-2xl glass-card divide-y divide-border/20 overflow-hidden">
                <TrackRow label="Network" value={order.network as string} />
                <TrackRow
                  label="Bundle"
                  value={customerBundleLabel(snapshot, order.network as string)}
                />
                <TrackRow
                  label="Recipient"
                  value={order.beneficiary_number as string}
                  mono
                  icon={<span className="text-[10px] mr-1">🇬🇭</span>}
                />
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-xs text-muted-foreground font-medium">Amount</span>
                  <span className="text-lg font-bold text-gradient-gold">
                    GH₵{Number(order.amount_charged).toLocaleString()}
                  </span>
                </div>
                <TrackRow label="Created" value={new Date(order.created_at as string).toLocaleString()} />
              </div>

              {/* Timeline — collapsed to customer-safe stages, supplier text stripped */}
              {(() => {
                const cleaned: Array<{ id: string; key: string; label: string; note: string | null; at: string }> = [];
                let lastKey = "";
                for (const entry of timeline) {
                  const rawEntryStatus = entry.new_status as string;
                  const key = toCustomerStatusKey(rawEntryStatus);
                  // Collapse consecutive duplicates (e.g. supplier_submitted -> supplier_processing -> processing).
                  if (key === lastKey) continue;
                  lastKey = key;
                  cleaned.push({
                    id: entry.id as string,
                    key,
                    label: customerStatusLabel(rawEntryStatus),
                    note: sanitizeCustomerMessage(entry.note as string | null, rawEntryStatus),
                    at: entry.changed_at as string,
                  });
                }
                if (cleaned.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground/45 uppercase tracking-widest font-semibold px-1">
                      Order Timeline
                    </p>
                    <div className="glass-card rounded-2xl p-4 space-y-3">
                      {cleaned.map((entry, i) => {
                        const conf = STATUS_ICONS[entry.key] || STATUS_ICONS.processing;
                        const Icon = conf.icon;
                        return (
                          <div key={entry.id} className="flex items-start gap-3">
                            <div className="relative">
                              <div className={cn(
                                "h-6 w-6 rounded-lg flex items-center justify-center",
                                i === cleaned.length - 1 ? "bg-primary/10" : "bg-muted/30"
                              )}>
                                <Icon className={cn("h-3 w-3", conf.color)} />
                              </div>
                              {i < cleaned.length - 1 && (
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border/30" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p className="text-[12px] font-semibold text-foreground/75">
                                {entry.label}
                              </p>
                              {entry.note && (
                                <p className="text-[10px] text-muted-foreground/45 mt-0.5 truncate">
                                  {entry.note}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] text-muted-foreground/35 font-mono shrink-0 pt-1">
                              {new Date(entry.at).toLocaleTimeString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" asChild className="flex-1 h-11">
                  <Link to="/">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    New Order
                  </Link>
                </Button>
                <Button
                  variant="glass"
                  onClick={() => handleSearch()}
                  className="flex-1 h-11"
                >
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Help text */}
          {!searched && (
            <p className="text-center text-[11px] text-muted-foreground/45 leading-relaxed">
              Your Order ID (KD-ORD-…) was shown on the payment success screen.
              You can also use your intent reference (KD-…).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className={cn(
        "text-sm text-foreground/75 font-medium flex items-center",
        mono && "font-mono"
      )}>
        {icon}
        {value}
      </span>
    </div>
  );
}
