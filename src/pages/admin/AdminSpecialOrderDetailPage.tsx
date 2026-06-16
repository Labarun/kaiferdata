/**
 * AdminSpecialOrderDetailPage — full order view + admin actions.
 *
 * Actions: copy-to-supplier, Mark Processing (after sending to supplier),
 * Mark Delivered, and Cancel & Refund (Pending only → funds returned to wallet).
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
  Truck,
  CheckCircle2,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import {
  setSpecialOrderStatus,
  cancelAndRefundSpecialOrder,
  formatOrderForSupplier,
} from "@/services/specialBundlesAdmin";
import {
  fetchSpecialOrderWithHistory,
  formatGhs,
  bundleTypeLabel,
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

export default function AdminSpecialOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-special-order", orderId],
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
  const isPending = status === "pending";
  const isProcessing = status === "processing";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: label });
  };

  const changeStatus = async (next: "processing" | "delivered") => {
    setWorking(true);
    try {
      await setSpecialOrderStatus(order.id, next);
      toast({ title: `Marked as ${next}` });
      refetch();
    } catch (e) {
      toast({ title: "Couldn't update", description: (e as Error).message, variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  const doRefund = async () => {
    setWorking(true);
    try {
      await cancelAndRefundSpecialOrder(order.id, reason.trim() || "Cancelled by admin before supplier submission");
      setRefundOpen(false);
      setReason("");
      toast({ title: "Cancelled & refunded", description: `${formatGhs(order.amount_charged)} returned to wallet` });
      refetch();
    } catch (e) {
      toast({ title: "Refund failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/special-orders">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Special order</h1>
          <button
            onClick={() => {
              navigator.clipboard.writeText(order.public_order_id);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-mono"
          >
            {order.public_order_id}
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <SpecialStatusBadge status={status} />
      </div>

      {/* Refund-requested banner */}
      {order.refund_requested && isPending && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">Customer requested cancellation & refund</p>
            {order.refund_request_reason && (
              <p className="text-[12px] text-muted-foreground">"{order.refund_request_reason}"</p>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
            <Package className="h-3.5 w-3.5" /> Order info
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-[11px]"
            onClick={() => copy(formatOrderForSupplier(order), "Copied for supplier")}
          >
            <Copy className="h-3 w-3" /> Copy for supplier
          </Button>
        </div>
        <div className="divide-y divide-border/30">
          <Row label="Bundle" value={bundleLabel} />
          <Row label="Network" value={order.network} />
          <Row label="Recipient" value={order.recipient_number} mono />
          <Row label="Amount" value={formatGhs(order.amount_charged)} />
          <Row label="Price tier" value={order.price_tier} cap />
          <Row label="Buyer role" value={order.buyer_role} cap />
          <Row label="Created" value={new Date(order.created_at).toLocaleString()} />
        </div>
      </div>

      {/* Actions */}
      <div className="glass-card rounded-2xl p-4 space-y-2.5">
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Actions</h3>
        {isPending && (
          <p className="text-[12px] text-muted-foreground">
            Send the details to the supplier, then mark as Processing. While still Pending you can cancel &amp; refund.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {isPending && (
            <Button size="sm" disabled={working} onClick={() => changeStatus("processing")} className="gap-1.5">
              <Truck className="h-4 w-4" /> Mark Processing
            </Button>
          )}
          {(isProcessing || isPending) && (
            <Button size="sm" variant="outline" disabled={working} onClick={() => changeStatus("delivered")} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Mark Delivered
            </Button>
          )}
          {isPending && (
            <Button
              size="sm"
              variant="outline"
              disabled={working}
              onClick={() => setRefundOpen(true)}
              className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <Wallet className="h-4 w-4" /> Cancel &amp; Refund
            </Button>
          )}
          {!isPending && !isProcessing && (
            <p className="text-[12px] text-muted-foreground">This order is {status} — no further actions.</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      {history.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
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
                  {i < history.length - 1 && <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-5 bg-border/30" />}
                </div>
                <div className="flex-1 pt-0.5">
                  <SpecialStatusBadge status={entry.new_status} />
                  {entry.note && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.note}</p>}
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel & refund dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel &amp; refund order</DialogTitle>
            <DialogDescription>
              This cancels the order and refunds {formatGhs(order.amount_charged)} back to the customer's wallet. Only
              do this if it hasn't been sent to the supplier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Reason</label>
            <Textarea
              placeholder="E.g. supplier out of stock, customer requested…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundOpen(false)} disabled={working}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={doRefund} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel &amp; refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, mono, cap }: { label: string; value: string; mono?: boolean; cap?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground font-medium ${mono ? "font-mono text-[12px]" : ""} ${cap ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}
