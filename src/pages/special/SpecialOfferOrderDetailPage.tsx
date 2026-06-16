/**
 * SpecialOfferOrderDetailPage — full detail of a single special bundle order.
 *
 * The cancel / refund-request action lives HERE (inside the detail view) and is
 * only available while the order is still Pending. Once Processing, the user is
 * pointed to support and told reversal is usually not possible.
 */
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  Package,
  Clock,
  Wallet,
  Headset,
  RotateCcw,
} from "lucide-react";
import {
  fetchSpecialOrderWithHistory,
  requestSpecialRefund,
  formatGhs,
  bundleTypeLabel,
  SPECIAL_STATUS_META,
  SUPPORT_WHATSAPP_URL,
  type SpecialBundleType,
  type SpecialOrderStatus,
} from "@/services/specialBundles";
import { SpecialStatusBadge } from "@/components/special/SpecialStatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSpecialBase } from "@/hooks/useSpecial";

export default function SpecialOfferOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { base } = useSpecialBase();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["special-order", orderId],
    queryFn: () => fetchSpecialOrderWithHistory(orderId!),
    enabled: !!orderId,
  });

  const order = data?.order;
  const history = data?.history ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!order) {
    return <div className="text-center py-20 text-sm text-muted-foreground">Order not found.</div>;
  }

  const snap = (order.package_snapshot || {}) as Record<string, unknown>;
  const bundleLabel =
    ((snap.size_label as string) || "Special bundle") +
    (snap.bundle_type ? ` (${bundleTypeLabel(snap.bundle_type as SpecialBundleType)})` : "");
  const status = order.status as SpecialOrderStatus;
  const meta = SPECIAL_STATUS_META[status] || SPECIAL_STATUS_META.pending;
  const isPending = status === "pending";

  const copyId = () => {
    navigator.clipboard.writeText(order.public_order_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitRefund = async () => {
    setSubmitting(true);
    try {
      await requestSpecialRefund(order.id, reason.trim() || "Customer requested cancellation");
      setRefundOpen(false);
      setReason("");
      toast({
        title: "Request submitted",
        description: "Our team will review your cancellation and refund request.",
      });
      refetch();
    } catch (e) {
      toast({ title: "Couldn't submit", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Link to={`${base}/orders`}>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order details</h1>
          <button
            onClick={copyId}
            className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-mono transition-colors"
          >
            {order.public_order_id}
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Status hero */}
      <div className="glass-wallet-hero rounded-2xl p-5 flex items-center justify-between animate-fade-in animate-stagger-1">
        <div className="max-w-[60%]">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
          <SpecialStatusBadge status={status} className="text-xs px-3 py-1" />
          <p className="text-[10.5px] text-muted-foreground/70 mt-2 leading-relaxed">{meta.helper}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Amount</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">{formatGhs(order.amount_charged)}</p>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-2">
        <div className="px-4 py-3 border-b border-border/20">
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-2">
            <Package className="h-3.5 w-3.5" /> Order info
          </h3>
        </div>
        <div className="divide-y divide-border/20">
          <DetailRow label="Bundle" value={bundleLabel} />
          <DetailRow label="Network" value={order.network} />
          <DetailRow label="Recipient" value={order.recipient_number} mono />
          <DetailRow label="Paid from" value="Wallet balance" />
          <DetailRow label="Date" value={new Date(order.created_at).toLocaleString()} />
        </div>
      </div>

      {/* Timeline */}
      {history.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-2">
          <div className="px-4 py-3 border-b border-border/20">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Status history
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {history.map((entry, i) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="relative">
                  <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  {i < history.length - 1 && (
                    <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-5 bg-border/30" />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <SpecialStatusBadge status={entry.new_status} />
                  {entry.note && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.note}</p>}
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancellation / refund area */}
      <div className="animate-fade-in animate-stagger-3">
        {isPending ? (
          order.refund_requested ? (
            <div className="glass-card rounded-2xl p-4 text-center">
              <RotateCcw className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
              <p className="text-[13px] font-semibold text-foreground">Refund request submitted</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Our team is reviewing it. If the order hasn't been sent to the supplier, you'll be refunded to your wallet.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-4">
              <p className="text-[12.5px] text-muted-foreground mb-3">
                This order is still <span className="font-semibold text-foreground">Pending</span>. If you need to
                cancel it, you can request a refund to your wallet while it hasn't been sent to the supplier yet.
              </p>
              <Button
                variant="outline"
                className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => setRefundOpen(true)}
              >
                <Wallet className="h-4 w-4 mr-1.5" /> Request cancellation & refund
              </Button>
            </div>
          )
        ) : (
          <div className="glass-card rounded-2xl p-4">
            <p className="text-[12.5px] text-muted-foreground mb-3">
              This order has already been sent for processing. Cancellation or refund is usually{" "}
              <span className="font-semibold text-foreground">not possible</span> once an order is being processed, but
              you can contact support to ask.
            </p>
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full rounded-xl">
                <Headset className="h-4 w-4 mr-1.5" /> Contact support
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Refund request dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request cancellation & refund</DialogTitle>
            <DialogDescription>
              We'll review your request. If this order hasn't been sent to the supplier yet, we'll cancel it and refund{" "}
              {formatGhs(order.amount_charged)} back to your wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Reason (optional)</label>
            <Textarea
              placeholder="E.g. wrong number, changed my mind…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundOpen(false)} disabled={submitting}>
              Keep order
            </Button>
            <Button onClick={submitRefund} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground font-medium ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
    </div>
  );
}
