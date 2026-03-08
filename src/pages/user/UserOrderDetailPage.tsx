/**
 * User Order Detail — Customer-friendly order view
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Copy, Package, CreditCard, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";

const STATUS_ICON: Record<string, typeof Clock> = {
  paid: Clock, queued: Clock, processing: Truck, delivered: CheckCircle2,
  failed: XCircle, cancelled: XCircle,
};

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

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="text-center py-16 text-sm text-muted-foreground">Order not found.</div>;

  const snap = (order.bundle_snapshot || {}) as Record<string, unknown>;

  const copyId = () => {
    navigator.clipboard.writeText(order.public_order_id as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/dashboard/orders">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order Details</h1>
          <button onClick={copyId} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-mono">
            {order.public_order_id as string}
            <Copy className="h-3 w-3" />
            {copied && <span className="text-primary text-[10px]">Copied!</span>}
          </button>
        </div>
      </div>

      {/* Status */}
      <Card className="glass-card">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <OperationsBadge status={order.status as string} className="text-xs px-3 py-1" />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Amount</p>
            <p className="text-xl font-bold text-foreground">GH₵{Number(order.amount_charged).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Order Info</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/40">
          <Row label="Network" value={order.network as string} />
          <Row label="Bundle" value={`${snap.volume || ""} — ${snap.plan_name || ""}`} />
          <Row label="Recipient" value={order.beneficiary_number as string} mono />
          <Row label="Date" value={new Date(order.created_at as string).toLocaleString()} />
          {order.delivery_message && <Row label="Delivery" value={order.delivery_message as string} />}
        </CardContent>
      </Card>

      {/* Timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Status History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeline.map((entry, i) => {
                const Icon = STATUS_ICON[entry.new_status as string] || Clock;
                return (
                  <div key={entry.id as string} className="flex items-start gap-3">
                    <div className="relative">
                      <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {i < timeline.length - 1 && <div className="absolute top-6 left-1/2 -translate-x-1/2 w-px h-5 bg-border/40" />}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <OperationsBadge status={entry.new_status as string} />
                      {entry.note && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.note as string}</p>}
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{new Date(entry.changed_at as string).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
    </div>
  );
}
