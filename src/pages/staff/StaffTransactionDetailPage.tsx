/**
 * Staff Transaction Detail — Read-only with escalation, no recovery actions
 */
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { writeAuditLog } from "@/services/auth";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, FileText, Package, AlertTriangle, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export default function StaffTransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const { user } = useAuth();
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [intent, setIntent] = useState<Record<string, unknown> | null>(null);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!transactionId) return;
    const { data: r } = await supabase.from("payment_records").select("*").eq("id", transactionId).single();
    setRecord(r);
    if (r?.intent_id) {
      const { data: i } = await supabase.from("purchase_intents").select("*").eq("id", r.intent_id as string).single();
      setIntent(i);
    }
    const { data: o } = await supabase.from("orders").select("*").eq("payment_record_id", transactionId).maybeSingle();
    setOrder(o);
    setLoading(false);
  }, [transactionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const escalate = async () => {
    if (!record || !user) return;
    setEscalating(true);
    await writeAuditLog({
      action: "staff_escalation",
      targetId: transactionId,
      targetType: "payment_record",
      metadata: {
        internal_reference: record.internal_reference as string,
        payment_status: record.status as string,
        has_order: !!order,
        reason: "Staff flagged for admin review — possible missing order",
      },
    });
    toast.success("Escalated to admin for review");
    setEscalating(false);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!record) return <div className="text-center py-16 text-sm text-muted-foreground">Transaction not found.</div>;

  const isOrphan = record.status === "verified" && !order;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={record.internal_reference as string} description="Payment record detail (read-only)" />

      <div className="flex items-center gap-3 flex-wrap">
        <OperationsBadge status={record.status as string} className="text-xs px-3 py-1" />
        <span className="text-[11px] text-muted-foreground font-mono">{record.provider as string}</span>
      </div>

      {isOrphan && (
        <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Verified payment — no order created</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                This needs admin intervention. Use "Escalate" to flag for recovery.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={escalate} disabled={escalating} className="gap-1.5 shrink-0">
              <ArrowUpRight className="h-3.5 w-3.5" /> {escalating ? "Escalating…" : "Escalate to Admin"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Row label="Internal Reference" value={record.internal_reference as string} mono />
            <Row label="Provider Reference" value={record.provider_reference as string} mono />
            <Row label="Amount" value={`GH₵${Number(record.amount).toLocaleString()}`} bold />
            <Row label="Status" value={record.status as string} badge />
            <Row label="Customer Email" value={(record.customer_email as string) || "—"} />
            <Row label="Verified At" value={record.verified_at ? new Date(record.verified_at as string).toLocaleString() : "—"} />
            <Row label="Created" value={new Date(record.created_at as string).toLocaleString()} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Linked Order</CardTitle>
            </CardHeader>
            <CardContent>
              {order ? (
                <div className="divide-y divide-border/40">
                  <Row label="Order ID" value={order.public_order_id as string} mono />
                  <Row label="Status" value={order.status as string} badge />
                  <Row label="Network" value={order.network as string} />
                  <Row label="Recipient" value={order.beneficiary_number as string} mono />
                </div>
              ) : (
                <p className="text-xs text-destructive/80 font-medium">⚠ No linked order found</p>
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
                  <Row label="Phone" value={intent.phone_number as string} mono />
                  <Row label="Network" value={intent.network as string} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No linked intent.</p>
              )}
            </CardContent>
          </Card>
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
