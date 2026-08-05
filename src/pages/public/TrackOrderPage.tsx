/**
 * TrackOrderPage — Premium liquid-glass order tracking
 * Now supports real order lookup by Order ID or Intent Reference
 */
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { lookupOrder, lookupIntent, lookupOrdersByPhone } from "@/services/purchaseIntent";

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
  Hash,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SEOHead } from "@/components/seo/SEOHead";
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
  on_hold: { icon: Clock, color: "text-purple-500" },
};

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get("ref") || "");
  const [searchMode, setSearchMode] = useState<"order_id" | "phone">("order_id");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [phoneOrders, setPhoneOrders] = useState<Record<string, unknown>[]>([]);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReference(ref);
      handleSearch(ref);
    }
  }, []);

  async function handleSearch(ref?: string, modeOverride?: "order_id" | "phone") {
    const searchRef = (ref || reference).trim();
    const activeMode = modeOverride || searchMode;
    if (!searchRef) return;
    setLoading(true);
    setSearched(true);
    setOrder(null);
    setTimeline([]);
    setPhoneOrders([]);

    try {
      if (activeMode === "phone") {
        const results = await lookupOrdersByPhone(searchRef);
        setPhoneOrders(results || []);
      } else {
        const result = await lookupOrder(searchRef);
        setOrder(result);
        const tl = (result?.timeline as Record<string, unknown>[] | null) || [];
        setTimeline(tl);
      }
    } catch {
      setOrder(null);
      setPhoneOrders([]);
    }

    setLoading(false);
  }

  // Auto-refresh: poll for updates while order is not in a terminal state.
  // (Anon visitors can no longer subscribe to postgres_changes after the
  // RLS lockdown, so we fall back to lightweight polling via the public RPC.)
  useEffect(() => {
    if (!order?.id) return;
    const status = String(order.status || "");
    if (["delivered", "failed", "cancelled", "refunded"].includes(status)) return;
    const ref = (order.public_order_id as string) || reference;
    if (!ref) return;
    const interval = setInterval(async () => {
      const fresh = await lookupOrder(ref);
      if (fresh) {
        setOrder(fresh);
        setTimeline((fresh.timeline as Record<string, unknown>[] | null) || []);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [order?.id, order?.status, order?.public_order_id, reference]);


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
      <SEOHead
        title="Track Your Order"
        description="Track your Kaiferdata data bundle order in real-time. Enter your Order ID or reference to check delivery status for MTN, Telecel, and AirtelTigo orders."
      />
      {/* Header */}
      <div className="bg-hero-gradient border-b border-border/20">
        <div className="container py-8 sm:py-10 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground/90 tracking-tight">
            Track Your Order
          </h1>
          <p className="text-[14px] text-muted-foreground/70 mt-2">
            Search by Order ID or the beneficiary number.
          </p>
        </div>
      </div>

      <div className="container py-6 sm:py-8">
        <div className="max-w-md mx-auto">
          {/* Search */}
          <div className="glass-premium rounded-2xl p-5 mb-6 shimmer-edge overflow-hidden border border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#0B0C10]/80">
            <div className="flex bg-black/5 dark:bg-black/50 p-1.5 rounded-xl mb-5 border border-black/5 dark:border-white/5">
              <button
                onClick={() => setSearchMode("order_id")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
                  searchMode === "order_id" ? "bg-white shadow-sm text-foreground dark:bg-white/10 dark:text-white" : "text-muted-foreground hover:text-foreground dark:text-white/40 dark:hover:text-white/80"
                )}
              >
                <Hash className="h-4 w-4" /> Order ID
              </button>
              <button
                onClick={() => setSearchMode("phone")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
                  searchMode === "phone" ? "bg-white shadow-sm text-foreground dark:bg-white/10 dark:text-white" : "text-muted-foreground hover:text-foreground dark:text-white/40 dark:hover:text-white/80"
                )}
              >
                <Phone className="h-4 w-4" /> Phone Number
              </button>
            </div>

            <div className="space-y-4">
              <Input
                placeholder={searchMode === "order_id" ? "KD-ORD- or KD-" : "0541234567"}
                value={reference}
                onChange={(e) => setReference(searchMode === "order_id" ? e.target.value.toUpperCase() : e.target.value)}
                className="h-12 font-mono text-base md:text-sm rounded-xl text-left bg-black/5 dark:bg-black/60 border-black/10 dark:border-white/10 focus:border-[#F6CA4B]/70 placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/40 px-4 text-foreground dark:text-white"
                maxLength={30}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {searchMode === "phone" && (
                <p className="text-[12px] text-muted-foreground/60 text-left px-1">
                  We'll show all recent orders sent to this number.
                </p>
              )}
              <Button
                onClick={() => handleSearch()}
                className="w-full h-12 bg-[#F6CA4B] hover:bg-[#E5B83A] text-black font-bold rounded-xl text-[15px]"
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
          {searched && !loading && !order && phoneOrders.length === 0 && (
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

          {/* Phone Number Results List */}
          {phoneOrders.length > 0 && !order && (
            <div className="space-y-4 animate-fade-in mt-8">
              <p className="text-[13px] text-muted-foreground/70 font-medium pl-1 mb-3">
                {phoneOrders.length} order{phoneOrders.length !== 1 ? 's' : ''} found &middot; tap one to see details
              </p>

              <div className="space-y-3">
                {phoneOrders.map((o) => {
                  const oStatus = String(o.status || "");
                  const key = toCustomerStatusKey(oStatus);
                  const conf = STATUS_ICONS[key] || STATUS_ICONS.processing;
                  const Icon = conf.icon;
                  const oId = o.public_order_id as string;
                  const bundleSnap = (o.bundle_snapshot || {}) as Record<string, unknown>;
                  const bundleStr = customerBundleLabel(bundleSnap, o.network as string);
                  const dateStr = new Date(o.created_at as string).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true
                  }).replace(',', '');

                  return (
                    <button
                      key={oId}
                      onClick={() => {
                        setReference(oId);
                        setSearchMode("order_id");
                        handleSearch(oId, "order_id");
                      }}
                      className="w-full text-left bg-black/[0.03] dark:bg-[#101217] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-all group"
                    >
                      <div className={cn("h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors")}>
                        <Icon className={cn("h-5 w-5", conf.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[14px] font-bold text-foreground dark:text-white truncate">{oId}</p>
                          <span className={cn("text-[10px] font-bold tracking-wide px-2 py-0.5 rounded bg-black/5 dark:bg-white/5", conf.color)}>
                            {customerStatusLabel(oStatus)}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground/60">
                          {bundleStr} &middot; {dateStr}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-black/5 dark:bg-black/20 rounded-xl p-4 mt-4 border border-black/5 dark:border-white/5">
                <p className="text-[11.5px] text-muted-foreground/70 leading-relaxed text-center">
                  These are the recent orders made to this number. If you cannot find your most recent order here, then you provided a wrong number in your previous order. Thank you.
                </p>
              </div>
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
                {statusKey === "on_hold" && (
                  <p className="text-[11.5px] text-muted-foreground/60 mt-1.5 max-w-[280px] mx-auto leading-relaxed animate-fade-in">
                    <Link to="/blog/understanding-on-hold-verification-orders" className="text-primary hover:underline font-medium">Learn more about verification delays &rarr;</Link>
                  </p>
                )}
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

                  let finalNote = sanitizeCustomerMessage(entry.note as string | null, rawEntryStatus);
                  if (key === "on_hold") {
                    finalNote = "This number is currently pending verification in the MTNUP2U portal. Delivery will be delayed.";
                  }

                  cleaned.push({
                    id: entry.id as string,
                    key,
                    label: customerStatusLabel(rawEntryStatus),
                    note: finalNote,
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
                                <p className="text-[10px] text-muted-foreground/45 mt-0.5 break-words">
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
          {!searched && searchMode === "order_id" && (
            <p className="text-center text-[11px] text-muted-foreground/45 leading-relaxed">
              Your Order ID (KD-ORD-…) was shown on the payment success screen.
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
