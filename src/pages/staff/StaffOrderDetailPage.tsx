/**
 * Staff Order Detail — Read-only view with escalation, no admin actions (no retry, no recovery)
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, Copy, Clock, CheckCircle2, XCircle, Truck, Package,
  CreditCard, FileText, ArrowRight, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_ICON: Record<string, typeof Clock> = {
  paid: Clock, queued: Clock, processing: Truck, delivered: CheckCircle2,
  failed: XCircle, cancelled: XCircle,
};

export default function StaffOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [timeline, setTimeline] = useState<Record<string, unknown>[]>([]);
  const [intent, setIntent] = useState<Record<string, unknown> | null>(null);
  const [payment, setPayment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!orderId) return;
    const [orderRes, timelineRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("order_status_history").select("*").eq("order_id", orderId).order("changed_at", { ascending: true }),
    ]);

    const o = orderRes.data;
    setOrder(o);
    setTimeline(timelineRes.data || []);

    if (o?.intent_id) {
      const { data: i } = await supabase.from("purchase_intents").select("*").eq("id", o.intent_id as string).single();
      setIntent(i);
    }
    if (o?.payment_record_id) {
      const { data: p } = await supabase.from("payment_records").select("*").eq("id", o.payment_record_id as string).single();
      setPayment(p);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const escalateToAdmin = async () => {
    if (!order || !user) return;
    setEscalating(true);
    await supabase.from("audit_logs").insert({
      action: "staff_escalation",
      actor_id: user.id,
      actor_role: "staff",
      target_id: orderId,
      target_type: "order",
      metadata: {
        public_order_id: order.public_order_id,
        order_status: order.status,
        reason: "Staff flagged for admin review",
      },
    });
    toast.success("Escalated to admin for review");
    setEscalating(false);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="text-center py-16 text-sm text-muted-foreground">Order not found.</div>;

  const snap = (order.bundle_snapshot || {}) as Record<string, unknown>;
  const Icon = STATUS_ICON[order.status as string] || Clock;
  const needsAttention = ["failed", "cancelled"].includes(order.status as string);

  const copyId = () => {
    navigator.clipboard.writeText(order.public_order_id as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title={order.public_order_id as string}
        description={`${order.network} · ${snap.volume || ""} · GH₵${Number(order.amount_charged).toLocaleString()}`}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <OperationsBadge status={order.status as string} className="text-xs px-3 py-1" />
        {order.supplier_status && (
          <span className="text-[11px] text-muted-foreground">Supplier: {order.supplier_status as string}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {needsAttention && (
            <Button variant="outline" size="sm" onClick={escalateToAdmin} disabled={escalating} className="h-7 text-[11px] gap-1.5">
              <ArrowUpRight className="h-3 w-3" /> {escalating ? "Escalating…" : "Escalate to Admin"}
            </Button>
          )}
          <button onClick={copyId} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
            <Copy className="h-3 w-3" /> {copied ? "Copied!" : "Copy ID"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border/40">
            <Row label="Order ID" value={order.public_order_id as string} mono />
            <Row label="Network" value={order.network as string} />
            <Row label="Bundle" value={`${snap.volume || ""} — ${snap.plan_name || ""}`} />
            <Row label="Recipient" value={order.beneficiary_number as string} mono />
            <Row label="Amount" value={`GH₵${Number(order.amount_charged).toLocaleString()}`} bold />
            <Row label="Actor Type" value={order.actor_type as string} />
            <Row label="Source" value={order.source_channel as string} />
            <Row label="Created" value={new Date(order.created_at as string).toLocaleString()} />
            {order.delivery_message && <Row label="Delivery Message" value={order.delivery_message as string} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">No history recorded.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((entry, i) => {
                  const EntryIcon = STATUS_ICON[entry.new_status as string] || Clock;
                  return (
                    <div key={entry.id as string} className="flex items-start gap-3">
                      <div className="relative">
                        <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center">
                          <EntryIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        {i < timeline.length - 1 && <div className="absolute top-6 left-1/2 -translate-x-1/2 w-px h-5 bg-border/40" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <OperationsBadge status={entry.new_status as string} />
                          <span className="text-[10px] text-muted-foreground">{entry.source as string}</span>
                        </div>
                        {entry.note && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.note as string}</p>}
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{new Date(entry.changed_at as string).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payment Record</CardTitle>
          </CardHeader>
          <CardContent>
            {payment ? (
              <div className="divide-y divide-border/40">
                <Row label="Provider" value={payment.provider as string} />
                <Row label="Provider Ref" value={payment.provider_reference as string} mono />
                <Row label="Amount" value={`GH₵${Number(payment.amount).toLocaleString()}`} />
                <Row label="Status" value={payment.status as string} badge />
                <Row label="Verified At" value={payment.verified_at ? new Date(payment.verified_at as string).toLocaleString() : "—"} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No linked payment record.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Purchase Intent</CardTitle>
          </CardHeader>
          <CardContent>
            {intent ? (
              <div className="divide-y divide-border/40">
                <Row label="Reference" value={intent.intent_reference as string} mono />
                <Row label="Status" value={intent.status as string} badge />
                <Row label="Type" value={intent.intent_type as string} />
                <Row label="Created" value={new Date(intent.created_at as string).toLocaleString()} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No linked intent.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, mono, bold, badge }: { label: string; value: string; mono?: boolean; bold?: boolean; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      {badge ? <OperationsBadge status={value} /> : (
        <span className={`text-[12px] text-foreground/80 text-right ${mono ? "font-mono" : ""} ${bold ? "font-semibold text-primary" : ""}`}>{value}</span>
      )}
    </div>
  );
}
