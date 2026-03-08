/**
 * Admin Transaction Detail Page
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, FileText, Package, ArrowRight } from "lucide-react";

export default function AdminTransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [intent, setIntent] = useState<Record<string, unknown> | null>(null);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) return;
    async function fetch() {
      const { data: r } = await supabase.from("payment_records").select("*").eq("id", transactionId).single();
      setRecord(r);

      if (r?.intent_id) {
        const { data: i } = await supabase.from("purchase_intents").select("*").eq("id", r.intent_id as string).single();
        setIntent(i);
      }
      // Find linked order
      const { data: o } = await supabase.from("orders").select("*").eq("payment_record_id", transactionId).maybeSingle();
      setOrder(o);

      setLoading(false);
    }
    fetch();
  }, [transactionId]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!record) return <div className="text-center py-16 text-sm text-muted-foreground">Transaction not found.</div>;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title={record.internal_reference as string} description="Payment record detail" />

      <div className="flex items-center gap-3 flex-wrap">
        <OperationsBadge status={record.status as string} className="text-xs px-3 py-1" />
        <span className="text-[11px] text-muted-foreground font-mono">{record.provider as string}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Row label="Internal Reference" value={record.internal_reference as string} mono />
            <Row label="Provider Reference" value={record.provider_reference as string} mono />
            <Row label="Provider" value={record.provider as string} />
            <Row label="Amount" value={`GH₵${Number(record.amount).toLocaleString()}`} bold />
            <Row label="Currency" value={record.currency as string} />
            <Row label="Status" value={record.status as string} badge />
            <Row label="Customer Email" value={(record.customer_email as string) || "—"} />
            <Row label="Customer ID" value={(record.customer_identifier as string) || "—"} />
            <Row label="Verified At" value={record.verified_at ? new Date(record.verified_at as string).toLocaleString() : "—"} />
            <Row label="Created" value={new Date(record.created_at as string).toLocaleString()} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Linked order */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Linked Order</CardTitle>
              {order && (
                <Link to={`/admin/orders/${order.id}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              )}
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

          {/* Linked intent */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Purchase Intent</CardTitle>
              {intent && (
                <Link to={`/admin/intents/${intent.id}`} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {intent ? (
                <div className="divide-y divide-border/40">
                  <Row label="Reference" value={intent.intent_reference as string} mono />
                  <Row label="Status" value={intent.status as string} badge />
                  <Row label="Phone" value={intent.phone_number as string} mono />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No linked intent.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Raw provider response */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Provider Response (Raw)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-[10px] text-muted-foreground bg-muted rounded-lg p-3 overflow-x-auto max-h-48">
            {JSON.stringify(record.provider_response, null, 2)}
          </pre>
        </CardContent>
      </Card>
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
