/**
 * User Order Detail — Premium glass detail surface
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Copy, Package, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order) return <div className="text-center py-20 text-sm text-muted-foreground">Order not found.</div>;

  const snap = (order.bundle_snapshot || {}) as Record<string, unknown>;

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
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
          <OperationsBadge status={order.status as string} className="text-xs px-3 py-1" />
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
          <DetailRow label="Bundle" value={`${snap.volume || ""} — ${snap.plan_name || ""}`} />
          <DetailRow label="Recipient" value={order.beneficiary_number as string} mono />
          <DetailRow label="Date" value={new Date(order.created_at as string).toLocaleString()} />
          {order.delivery_message && <DetailRow label="Delivery" value={order.delivery_message as string} />}
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-3">
          <div className="px-4 py-3 border-b border-border/20">
            <h3 className="section-label flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Status History</h3>
          </div>
          <div className="p-4 space-y-4">
            {timeline.map((entry, i) => {
              const Icon = STATUS_ICON[entry.new_status as string] || Clock;
              return (
                <div key={entry.id as string} className="flex items-start gap-3">
                  <div className="relative">
                    <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {i < timeline.length - 1 && <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-5 bg-border/30" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <OperationsBadge status={entry.new_status as string} />
                    {entry.note && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.note as string}</p>}
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">{new Date(entry.changed_at as string).toLocaleString()}</p>
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
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground font-medium ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
    </div>
  );
}
