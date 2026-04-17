/**
 * Admin Intent Detail Page
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, FileText, Package, CreditCard, ArrowRight, RotateCcw } from "lucide-react";

export default function AdminIntentDetailPage() {
  const { intentId } = useParams<{ intentId: string }>();
  const [intent, setIntent] = useState<Record<string, unknown> | null>(null);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [payment, setPayment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!intentId) return;
    const { data: i } = await supabase.from("purchase_intents").select("*").eq("id", intentId).single();
    setIntent(i);

    if (i) {
      const [orderRes, paymentRes] = await Promise.all([
        supabase.from("orders").select("*").eq("intent_id", intentId).maybeSingle(),
        supabase.from("payment_records").select("*").eq("intent_id", intentId).maybeSingle(),
      ]);
      setOrder(orderRes.data);
      setPayment(paymentRes.data);
    }
    setLoading(false);
  }, [intentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const retryFinalization = async () => {
    if (!intent?.intent_reference) return;
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("recover-payments", {
        body: { reference: intent.intent_reference },
      });
      if (error) throw error;
      const stats = (data?.stats || {}) as Record<string, number>;
      if (stats.finalized > 0) {
        toast.success("Payment finalized successfully");
      } else if (stats.already_processed > 0) {
        toast.info("Payment was already processed");
      } else if (stats.not_yet_paid > 0) {
        toast.warning("Paystack reports payment not yet successful");
      } else if (stats.blocked > 0) {
        toast.error("Finalization blocked (security check failed)");
      } else {
        toast.error("No action taken");
      }
      await fetchAll();
    } catch (err) {
      toast.error(`Retry failed: ${(err as Error).message}`);
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!intent) return <div className="text-center py-16 text-sm text-muted-foreground">Intent not found.</div>;

  const snap = (intent.plan_snapshot || {}) as Record<string, unknown>;
  const ctx = (intent.order_context || {}) as Record<string, unknown>;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={intent.intent_reference as string} description="Purchase intent detail" />

      <div className="flex items-center gap-3 flex-wrap">
        <OperationsBadge status={intent.status as string} className="text-xs px-3 py-1" />
        <span className="text-[11px] text-muted-foreground">{intent.intent_type as string} · {intent.actor_type as string}</span>
        {!order && intent.status !== "completed" && intent.status !== "failed" && intent.status !== "cancelled" && intent.status !== "expired" && (
          <Button size="sm" variant="outline" onClick={retryFinalization} disabled={retrying} className="ml-auto gap-1.5 h-7 text-[11px]">
            <RotateCcw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying…" : "Retry finalization"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Intent Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Row label="Reference" value={intent.intent_reference as string} mono />
            <Row label="Status" value={intent.status as string} badge />
            <Row label="Network" value={intent.network as string} />
            <Row label="Plan" value={`${snap.volume || ""} — ${snap.plan_name || ""}`} />
            <Row label="Base Amount" value={intent.base_amount ? `GH₵${Number(intent.base_amount).toLocaleString()}` : `GH₵${Number(intent.amount_expected).toLocaleString()}`} bold />
            <Row label="Paystack Fee" value={intent.fee_amount ? `GH₵${Number(intent.fee_amount).toFixed(2)} (${((Number(intent.fee_rate) || 0) * 100).toFixed(0)}%)` : "—"} />
            <Row label="Total Charged" value={intent.total_amount ? `GH₵${Number(intent.total_amount).toLocaleString()}` : `GH₵${Number(intent.amount_expected).toLocaleString()}`} bold />
            <Row label="Phone" value={intent.phone_number as string} mono />
            <Row label="Customer Name" value={(intent.customer_name as string) || "—"} />
            <Row label="Customer Email" value={(intent.customer_email as string) || "—"} />
            <Row label="Source" value={intent.source_channel as string} />
            <Row label="Created" value={new Date(intent.created_at as string).toLocaleString()} />
            {intent.expires_at && <Row label="Expires" value={new Date(intent.expires_at as string).toLocaleString()} />}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Linked Order</CardTitle>
              {order && <Link to={`/admin/orders/${order.id}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">View <ArrowRight className="h-3 w-3" /></Link>}
            </CardHeader>
            <CardContent>
              {order ? (
                <div className="divide-y divide-border/40">
                  <Row label="Order ID" value={order.public_order_id as string} mono />
                  <Row label="Status" value={order.status as string} badge />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No order created from this intent.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payment Record</CardTitle>
              {payment && <Link to={`/admin/transactions/${payment.id}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">View <ArrowRight className="h-3 w-3" /></Link>}
            </CardHeader>
            <CardContent>
              {payment ? (
                <div className="divide-y divide-border/40">
                  <Row label="Provider Ref" value={payment.provider_reference as string} mono />
                  <Row label="Status" value={payment.status as string} badge />
                  <Row label="Amount" value={`GH₵${Number(payment.amount).toLocaleString()}`} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No payment record linked.</p>
              )}
            </CardContent>
          </Card>

          {Object.keys(ctx).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Order Context</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-[10px] text-muted-foreground bg-muted rounded-lg p-3 overflow-x-auto max-h-32">
                  {JSON.stringify(ctx, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
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
