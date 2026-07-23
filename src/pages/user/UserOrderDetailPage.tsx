/**
 * User Order Detail — Premium glass detail surface
 *
 * Customer-facing only. Internal supplier references / statuses /
 * notes are sanitized via @/lib/customerStatus before display.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Copy, Package, Clock, CheckCircle2, XCircle, Truck, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  customerStatusLabel,
  customerStatusHelper,
  customerBundleLabel,
  toCustomerStatusKey,
  sanitizeCustomerMessage,
} from "@/lib/customerStatus";

const STATUS_ICONS: Record<string, { icon: typeof Clock; color: string; tone: string }> = {
  placed: { icon: Clock, color: "text-primary", tone: "bg-primary/10 text-primary border-primary/20" },
  processing: { icon: Truck, color: "text-amber-500", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  delivered: { icon: CheckCircle2, color: "text-success", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { icon: XCircle, color: "text-destructive", tone: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", tone: "bg-gray-50 text-gray-600 border-gray-200" },
  refunded: { icon: RotateCcw, color: "text-muted-foreground", tone: "bg-purple-50 text-purple-700 border-purple-200" },
  on_hold: { icon: AlertCircle, color: "text-orange-500", tone: "bg-orange-50 text-orange-700 border-orange-200" },
};

function CustomerStatusBadge({ status, className }: { status: string; className?: string }) {
  const key = toCustomerStatusKey(status);
  const conf = STATUS_ICONS[key] || STATUS_ICONS.processing;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-normal max-w-full",
        conf.tone,
        className,
      )}
    >
      {customerStatusLabel(status)}
    </span>
  );
}

export default function UserOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    async function load() {
      const [orderRes, timelineRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("order_status_history").select("*").eq("order_id", orderId).order("changed_at", { ascending: true }),
      ]);
      setOrder(orderRes.data);
      setTimeline(timelineRes.data || []);
      setLoading(false);
    }
    load();
  }, [orderId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="text-center py-20 text-sm text-muted-foreground">Order not found.</div>;

  const snap = (order.bundle_snapshot || {}) as Record<string, unknown>;
  const rawStatus = String(order.status || "");
  const safeDeliveryMsg = sanitizeCustomerMessage(order.delivery_message as string | null, rawStatus) ||
    customerStatusHelper(rawStatus);

  // Collapse internal/supplier statuses and dedupe consecutive duplicates
  // so customers see only "Order Placed → Processing → Delivered" stages.
  const cleanedTimeline: Array<{ id: string; key: string; label: string; note: string | null; at: string }> = [];
  let lastKey = "";
  for (const entry of timeline) {
    const raw = String(entry.new_status || "");
    const k = toCustomerStatusKey(raw);
    if (k === lastKey) continue;
    lastKey = k;
    let finalNote = sanitizeCustomerMessage(entry.note as string | null, raw);
    if (k === "on_hold") {
      finalNote = "This number is currently pending verification in the MTNUP2U portal. Delivery will be delayed.";
    }

    cleanedTimeline.push({
      id: entry.id as string,
      key: k,
      label: customerStatusLabel(raw),
      note: finalNote,
      at: entry.changed_at as string,
    });
  }

  const copyId = () => {
    navigator.clipboard.writeText(order.public_order_id as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Link to="/dashboard/orders">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order Details</h1>
          <button onClick={copyId} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-mono transition-colors">
            {order.public_order_id as string}
            <Copy className="h-3 w-3" />
            {copied && <span className="text-primary text-[10px]">Copied!</span>}
          </button>
        </div>
      </div>

      {/* Status hero */}
      <div className="glass-wallet-hero rounded-2xl p-5 flex items-center justify-between animate-fade-in animate-stagger-1">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
          <CustomerStatusBadge status={rawStatus} className="text-xs px-3 py-1" />
          <p className="text-[10.5px] text-muted-foreground/70 mt-2 max-w-full sm:max-w-[280px] leading-relaxed break-words whitespace-normal">
            {safeDeliveryMsg}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Amount</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">GH₵{Number(order.amount_charged).toLocaleString()}</p>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-2">
        <div className="px-4 py-3 border-b border-border/20">
          <h3 className="section-label flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Order Info</h3>
        </div>
        <div className="divide-y divide-border/20">
          <DetailRow label="Network" value={order.network as string} />
          <DetailRow label="Bundle" value={customerBundleLabel(snap, order.network as string)} />
          <DetailRow label="Recipient" value={order.beneficiary_number as string} mono />
          <DetailRow label="Date" value={new Date(order.created_at as string).toLocaleString()} />
        </div>
      </div>

      {/* Timeline */}
      {cleanedTimeline.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-3">
          <div className="px-4 py-3 border-b border-border/20">
            <h3 className="section-label flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Status History</h3>
          </div>
          <div className="p-4 space-y-4">
            {cleanedTimeline.map((entry, i) => {
              const conf = STATUS_ICONS[entry.key] || STATUS_ICONS.processing;
              const Icon = conf.icon;
              return (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center">
                      <Icon className={cn("h-3.5 w-3.5", conf.color)} />
                    </div>
                    {i < cleanedTimeline.length - 1 && <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-5 bg-border/30" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <CustomerStatusBadge status={entry.key} />
                    {entry.note && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-words whitespace-normal">
                        {entry.note}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">{new Date(entry.at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground font-medium break-words whitespace-normal sm:text-right ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
    </div>
  );
}
