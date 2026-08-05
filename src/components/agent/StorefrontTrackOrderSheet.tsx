/**
 * StorefrontTrackOrderSheet
 *
 * In-storefront order tracking — keeps customers inside the agent's
 * store experience instead of routing them to the main /track page.
 * Premium liquid-glass sheet styled like the storefront. Looks up
 * orders by public_order_id (KS-XXXXX or KD-XXXXX) or intent ref.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lookupOrder } from "@/services/purchaseIntent";
import { Link } from "react-router-dom";

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

// Customer-safe icons keyed by sanitized status. Internal supplier
// statuses are mapped before lookup — customers only see clean stages.
const STATUS_ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  placed: { icon: Clock, color: "text-primary" },
  processing: { icon: Truck, color: "text-amber-500" },
  delivered: { icon: CheckCircle2, color: "text-success" },
  failed: { icon: XCircle, color: "text-destructive" },
  cancelled: { icon: XCircle, color: "text-muted-foreground" },
  refunded: { icon: RotateCcw, color: "text-muted-foreground" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  /** Optional: pre-fill the input (e.g. just placed an order) */
  initialReference?: string;
}

export function StorefrontTrackOrderSheet({ open, onOpenChange, storeName, initialReference }: Props) {
  const [reference, setReference] = useState(initialReference || "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [copied, setCopied] = useState(false);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setSearched(false);
      setOrder(null);
      setTimeline([]);
    } else if (initialReference) {
      setReference(initialReference);
    }
  }, [open, initialReference]);

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
      setTimeline(((result?.timeline as Record<string, unknown>[] | null) || []));
    } catch {
      setOrder(null);
    }
    setLoading(false);
  }

  // Poll for updates while open and order is non-terminal.
  // (Anon visitors can no longer subscribe to postgres_changes after RLS lockdown.)
  useEffect(() => {
    if (!order?.id || !open) return;
    const status = String(order.status || "");
    if (["delivered", "failed", "cancelled", "refunded"].includes(status)) return;
    const ref = (order.public_order_id as string) || reference;
    if (!ref) return;
    const interval = setInterval(async () => {
      const fresh = await lookupOrder(ref);
      if (fresh) {
        setOrder(fresh);
        setTimeline(((fresh.timeline as Record<string, unknown>[] | null) || []));
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [order?.id, order?.status, order?.public_order_id, open, reference]);


  const snapshot = (order?.bundle_snapshot || {}) as Record<string, unknown>;
  const rawStatus = String(order?.status || "");
  const statusKey = toCustomerStatusKey(rawStatus);
  const conf = STATUS_ICONS[statusKey] || STATUS_ICONS.processing;
  const StatusIcon = conf.icon;
  const statusLabel = customerStatusLabel(rawStatus);
  const safeDeliveryMsg = sanitizeCustomerMessage(order?.delivery_message as string | null, rawStatus) ||
    customerStatusHelper(rawStatus);

  const copyId = () => {
    const id = order?.public_order_id as string;
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] sm:max-w-md sm:mx-auto sm:rounded-t-3xl p-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/30 shrink-0">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Track Your Order
            </SheetTitle>
            <p className="text-[11.5px] text-muted-foreground/70">
              Inside <span className="font-semibold text-foreground/80">{storeName}</span>
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Search */}
            <div className="glass-card rounded-2xl p-3.5 space-y-2.5">
              <Input
                placeholder="KS-XXXXX or KD-XXXXX"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                className="h-11 font-mono text-base md:text-sm rounded-xl text-center"
                maxLength={30}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={() => handleSearch()}
                className="w-full h-10"
                disabled={loading || !reference.trim()}
              >
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
                Track
              </Button>
            </div>

            {searched && !loading && !order && (
              <div className="text-center py-6 animate-fade-in">
                <div className="h-12 w-12 rounded-2xl glass-elevated flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-6 w-6 text-destructive/70" />
                </div>
                <p className="text-[13px] font-bold">Order not found</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-[260px] mx-auto leading-relaxed">
                  Double-check your reference. Storefront orders start with <span className="font-mono">KS-</span>.
                </p>
              </div>
            )}

            {order && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl glass-elevated flex items-center justify-center mx-auto mb-2",
                    statusKey === "delivered" && "shadow-[0_0_20px_hsl(152_52%_36%/0.15)]"
                  )}>
                    <StatusIcon className={cn("h-7 w-7", conf.color)} />
                  </div>
                  <p className={cn("text-[14px] font-bold tracking-tight", conf.color)}>{statusLabel}</p>
                  <p className="text-[11.5px] text-muted-foreground/70 mt-1 leading-relaxed max-w-[280px] mx-auto">
                    {safeDeliveryMsg}
                  </p>
                  {statusKey === "on_hold" && (
                    <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-[280px] mx-auto leading-relaxed animate-fade-in">
                      <Link to="/blog/understanding-on-hold-verification-orders" className="text-primary hover:underline font-medium" onClick={() => onOpenChange(false)}>Learn more about verification delays &rarr;</Link>
                    </p>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9.5px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Order ID</p>
                    <p className="font-mono text-[13.5px] font-bold mt-0.5 truncate">{order.public_order_id as string}</p>
                  </div>
                  <button
                    onClick={copyId}
                    className="shrink-0 h-9 w-9 rounded-xl glass-elevated flex items-center justify-center transition-all active:scale-95"
                    aria-label="Copy order ID"
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                {copied && <p className="text-[10.5px] text-success text-center -mt-2 font-medium animate-fade-in">Copied!</p>}

                <div className="rounded-2xl glass-card divide-y divide-border/20 overflow-hidden">
                  <Row label="Network" value={String(order.network || "")} />
                  <Row label="Bundle" value={customerBundleLabel(snapshot, String(order.network || ""))} />
                  <Row label="Recipient" value={String(order.beneficiary_number || "")} mono />
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11.5px] text-muted-foreground font-medium">Amount</span>
                    <span className="text-[14px] font-bold text-gradient-gold tabular-nums">
                      GH₵{Number(order.amount_charged).toFixed(2)}
                    </span>
                  </div>
                  <Row label="Created" value={new Date(order.created_at as string).toLocaleString()} />
                </div>

                {(() => {
                  const cleaned: Array<{ id: string; key: string; label: string; note: string | null; at: string }> = [];
                  let lastKey = "";
                  for (const entry of timeline) {
                    const rawEntryStatus = entry.new_status as string;
                    const k = toCustomerStatusKey(rawEntryStatus);
                    if (k === lastKey) continue;
                    lastKey = k;
                    cleaned.push({
                      id: entry.id as string,
                      key: k,
                      label: customerStatusLabel(rawEntryStatus),
                      note: sanitizeCustomerMessage(entry.note as string | null, rawEntryStatus),
                      at: entry.changed_at as string,
                    });
                  }
                  if (cleaned.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-[9.5px] text-muted-foreground/55 uppercase tracking-widest font-semibold px-1">Timeline</p>
                      <div className="glass-card rounded-2xl p-3.5 space-y-3">
                        {cleaned.map((entry, i) => {
                          const ec = STATUS_ICONS[entry.key] || STATUS_ICONS.processing;
                          const Icon = ec.icon;
                          return (
                            <div key={entry.id} className="flex items-start gap-3">
                              <div className="relative">
                                <div className={cn(
                                  "h-6 w-6 rounded-lg flex items-center justify-center",
                                  i === cleaned.length - 1 ? "bg-primary/10" : "bg-muted/30"
                                )}>
                                  <Icon className={cn("h-3 w-3", ec.color)} />
                                </div>
                                {i < cleaned.length - 1 && (
                                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-px h-4 bg-border/30" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <p className="text-[11.5px] font-semibold">{entry.label}</p>
                                {entry.note && (
                                  <p className="text-[10px] text-muted-foreground/55 mt-0.5 truncate">{entry.note}</p>
                                )}
                              </div>
                              <span className="text-[9px] text-muted-foreground/40 font-mono shrink-0 pt-1">
                                {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <Button variant="outline" onClick={() => handleSearch()} className="w-full h-10">
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  Refresh status
                </Button>
              </div>
            )}

            {!searched && (
              <p className="text-center text-[11px] text-muted-foreground/50 leading-relaxed">
                Your Order ID was shown right after payment. Storefront orders start with <span className="font-mono">KS-</span>.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[11.5px] text-muted-foreground font-medium">{label}</span>
      <span className={cn("text-[12.5px] text-foreground/80 font-medium", mono && "font-mono")}>{value}</span>
    </div>
  );
}
