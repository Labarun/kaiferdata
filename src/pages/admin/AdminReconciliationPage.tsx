/**
 * Admin Reconciliation Page — Problem detection + recovery actions
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { RecoveryDialog } from "@/components/admin/RecoveryDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2, AlertTriangle, CreditCard, Package, FileText,
  ChevronRight, CheckCircle2, XCircle, ShieldAlert, RefreshCcw, PlayCircle, Clock, Sparkles,
} from "lucide-react";

interface ReconciliationCategory {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  items: Record<string, unknown>[];
  type: string;
  recoverable?: boolean;
}

export default function AdminReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ReconciliationCategory[]>([]);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryContext, setRecoveryContext] = useState<{ payment?: Record<string, unknown> | null; intent?: Record<string, unknown> | null }>({});
  const [sweepRunning, setSweepRunning] = useState(false);

  const runRecoverySweep = async () => {
    setSweepRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("recover-payments", { body: {} });
      if (error) throw error;
      const stats = (data?.stats || {}) as Record<string, number>;
      toast.success(
        `Sweep complete · ${stats.scanned || 0} scanned · ${stats.finalized || 0} recovered · ${stats.already_processed || 0} already done`,
      );
      await fetchData();
    } catch (err) {
      toast.error(`Sweep failed: ${(err as Error).message}`);
    } finally {
      setSweepRunning(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Stuck payments: intents in pre-completed states older than 2 minutes (recovery candidates)
    const cutoff2min = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const [stuckIntents, failedOrders, stuckOrders, stuckPayments, specialPending] = await Promise.all([
      supabase.from("purchase_intents").select("*").eq("status", "payment_confirmed").order("created_at", { ascending: false }).limit(50),
      supabase.from("orders").select("*").eq("status", "failed").order("created_at", { ascending: false }).limit(50),
      supabase.from("orders").select("*").in("status", ["paid", "queued", "processing"]).order("created_at", { ascending: true }).limit(50),
      supabase.from("purchase_intents").select("*")
        .in("status", ["created", "pending_payment", "payment_processing"])
        .lte("created_at", cutoff2min)
        .gte("created_at", cutoff48h)
        .order("created_at", { ascending: true })
        .limit(50),
      // Special bundle orders awaiting manual handling (refund-requested first)
      supabase.from("special_bundle_orders" as any).select("*").eq("status", "pending")
        .order("refund_requested", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(50),
    ]);

    // Orphan payments: verified but no order linked
    let orphanPayments: Record<string, unknown>[] = [];
    const { data: verifiedPayments } = await supabase
      .from("payment_records")
      .select("*")
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(200);

    if (verifiedPayments && verifiedPayments.length > 0) {
      const paymentIds = verifiedPayments.map((p) => p.id);
      const { data: ordersWithPayment } = await supabase
        .from("orders")
        .select("payment_record_id")
        .in("payment_record_id", paymentIds);
      const linkedIds = new Set((ordersWithPayment || []).map((o) => o.payment_record_id));
      orphanPayments = verifiedPayments.filter((p) => !linkedIds.has(p.id));
    }

    const cats: ReconciliationCategory[] = [];

    if (((specialPending as { data?: unknown[] }).data || []).length > 0) {
      cats.push({
        title: "Special Bundle Orders (Pending)",
        description: "MTN special bundle orders awaiting manual processing or refund review. Refund requests are listed first.",
        icon: Sparkles,
        color: "text-primary",
        items: ((specialPending as { data?: Record<string, unknown>[] }).data || []),
        type: "special",
      });
    }

    if (orphanPayments.length > 0) {
      cats.push({
        title: "Verified Payments Without Orders",
        description: "Payments verified but no order was created. Eligible for recovery.",
        icon: CreditCard,
        color: "text-destructive",
        items: orphanPayments,
        type: "payment",
        recoverable: true,
      });
    }

    if ((stuckIntents.data || []).length > 0) {
      cats.push({
        title: "Intents Stuck After Payment",
        description: "Purchase intents confirmed but not converted to orders. May need recovery.",
        icon: FileText,
        color: "text-amber-600",
        items: stuckIntents.data || [],
        type: "intent",
        recoverable: true,
      });
    }

    if ((stuckPayments.data || []).length > 0) {
      cats.push({
        title: "Stuck Payments (Awaiting Recovery)",
        description: "Intents older than 2 minutes still in pre-payment states. The recovery sweep will re-verify them with Paystack and finalize if successful.",
        icon: Clock,
        color: "text-amber-600",
        items: stuckPayments.data || [],
        type: "intent",
        recoverable: true,
      });
    }

    if ((failedOrders.data || []).length > 0) {
      cats.push({
        title: "Failed Orders",
        description: "Orders that failed during supplier submission. May need retry.",
        icon: XCircle,
        color: "text-destructive",
        items: failedOrders.data || [],
        type: "order",
      });
    }

    if ((stuckOrders.data || []).length > 0) {
      cats.push({
        title: "Orders Pending Fulfillment",
        description: "Orders still in paid/queued/processing state.",
        icon: Package,
        color: "text-amber-600",
        items: stuckOrders.data || [],
        type: "order",
      });
    }

    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openRecovery = (item: Record<string, unknown>, type: string) => {
    if (type === "payment") {
      setRecoveryContext({ payment: item, intent: null });
    } else if (type === "intent") {
      setRecoveryContext({ payment: null, intent: item });
    }
    setRecoveryOpen(true);
  };

  const totalIssues = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Reconciliation" description="Identify and resolve problem records" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={runRecoverySweep} disabled={sweepRunning} className="gap-1.5">
            <PlayCircle className={`h-3.5 w-3.5 ${sweepRunning ? "animate-spin" : ""}`} />
            {sweepRunning ? "Running…" : "Run recovery sweep"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : totalIssues === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">All Clear</p>
            <p className="text-xs text-muted-foreground mt-1">No reconciliation issues detected.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{totalIssues} item{totalIssues !== 1 ? "s" : ""} need attention</p>
                <p className="text-[11px] text-muted-foreground">{categories.length} categor{categories.length !== 1 ? "ies" : "y"} detected</p>
              </div>
            </CardContent>
          </Card>

          {categories.map((cat) => (
            <Card key={cat.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <cat.icon className={`h-4 w-4 ${cat.color}`} />
                  {cat.title}
                  <span className="ml-auto text-[11px] font-normal text-muted-foreground">{cat.items.length} items</span>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">{cat.description}</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {cat.items.slice(0, 20).map((item) => (
                    <ReconciliationRow
                      key={item.id as string}
                      item={item}
                      type={cat.type}
                      recoverable={!!cat.recoverable}
                      onRecover={() => openRecovery(item, cat.type)}
                    />
                  ))}
                  {cat.items.length > 20 && (
                    <div className="px-4 py-2 text-[11px] text-muted-foreground">
                      + {cat.items.length - 20} more items
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <RecoveryDialog
        open={recoveryOpen}
        onOpenChange={setRecoveryOpen}
        context={recoveryContext}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}

function ReconciliationRow({
  item, type, recoverable, onRecover,
}: {
  item: Record<string, unknown>; type: string; recoverable: boolean; onRecover: () => void;
}) {
  const getLink = () => {
    if (type === "order") return `/admin/orders/${item.id}`;
    if (type === "payment") return `/admin/transactions/${item.id}`;
    if (type === "intent") return `/admin/intents/${item.id}`;
    if (type === "special") return `/admin/special-orders/${item.id}`;
    return "#";
  };

  const getLabel = () => {
    if (type === "order") return item.public_order_id as string;
    if (type === "payment") return item.internal_reference as string;
    if (type === "intent") return item.intent_reference as string;
    if (type === "special") return item.public_order_id as string;
    return item.id as string;
  };

  const status = (item.status as string) || "";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
      <Link to={getLink()} className="min-w-0 flex-1">
        <p className="font-mono text-[12px] font-medium text-foreground truncate">{getLabel()}</p>
        <p className="text-[10px] text-muted-foreground">
          {type === "order" && `${item.network || ""} · GH₵${Number(item.amount_charged || 0).toLocaleString()}`}
          {type === "payment" && `GH₵${Number(item.amount || 0).toLocaleString()} · ${item.provider || ""}`}
          {type === "intent" && `${item.network || ""} · GH₵${Number(item.amount_expected || 0).toLocaleString()}`}
          {type === "special" && `${item.recipient_number || ""} · GH₵${Number(item.amount_charged || 0).toLocaleString()}${item.refund_requested ? " · refund requested" : ""}`}
          {" · "}{new Date(item.created_at as string).toLocaleDateString()}
        </p>
      </Link>
      <div className="flex items-center gap-2">
        <OperationsBadge status={status} />
        {recoverable && (
          <Button variant="outline" size="sm" onClick={onRecover} className="h-7 text-[11px] gap-1 px-2">
            <ShieldAlert className="h-3 w-3" /> Recover
          </Button>
        )}
        <Link to={getLink()}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </Link>
      </div>
    </div>
  );
}
