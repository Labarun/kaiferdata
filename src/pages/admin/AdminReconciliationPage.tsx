/**
 * Admin Reconciliation Page — Surfaces problem records needing attention
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Loader2, AlertTriangle, CreditCard, Package, FileText,
  ChevronRight, CheckCircle2, XCircle,
} from "lucide-react";

interface ReconciliationCategory {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  items: Record<string, unknown>[];
  type: string;
}

export default function AdminReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ReconciliationCategory[]>([]);

  useEffect(() => {
    async function fetch() {
      const [
        // Verified payments with no order
        paymentsNoOrder,
        // Intents stuck in payment_confirmed (not completed)
        stuckIntents,
        // Failed orders
        failedOrders,
        // Orders stuck in processing > 10 min
        stuckOrders,
      ] = await Promise.all([
        supabase.rpc("get_payments_without_orders" as never).then((r) => r),
        supabase.from("purchase_intents").select("*").eq("status", "payment_confirmed").order("created_at", { ascending: false }).limit(50),
        supabase.from("orders").select("*").eq("status", "failed").order("created_at", { ascending: false }).limit(50),
        supabase.from("orders").select("*").in("status", ["paid", "queued", "processing"]).order("created_at", { ascending: true }).limit(50),
      ]);

      // For payments without orders, use a manual query since RPC may not exist
      let orphanPayments: Record<string, unknown>[] = [];
      const { data: verifiedPayments } = await supabase
        .from("payment_records")
        .select("*")
        .eq("status", "verified")
        .order("created_at", { ascending: false })
        .limit(200);

      if (verifiedPayments) {
        const paymentIds = verifiedPayments.map((p) => p.id);
        if (paymentIds.length > 0) {
          const { data: ordersWithPayment } = await supabase
            .from("orders")
            .select("payment_record_id")
            .in("payment_record_id", paymentIds);

          const linkedIds = new Set((ordersWithPayment || []).map((o) => o.payment_record_id));
          orphanPayments = verifiedPayments.filter((p) => !linkedIds.has(p.id));
        }
      }

      const cats: ReconciliationCategory[] = [];

      if (orphanPayments.length > 0) {
        cats.push({
          title: "Verified Payments Without Orders",
          description: "Payments verified by Paystack but no order was created. May need manual recovery.",
          icon: CreditCard,
          color: "text-destructive",
          items: orphanPayments,
          type: "payment",
        });
      }

      if ((stuckIntents.data || []).length > 0) {
        cats.push({
          title: "Intents Stuck After Payment",
          description: "Purchase intents confirmed but not converted to orders.",
          icon: FileText,
          color: "text-amber-600",
          items: stuckIntents.data || [],
          type: "intent",
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
    }
    fetch();
  }, []);

  const totalIssues = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Reconciliation" description="Identify and resolve problem records" />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : totalIssues === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">All Clear</p>
            <p className="text-xs text-muted-foreground mt-1">No reconciliation issues detected.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
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
                    <ReconciliationRow key={item.id as string} item={item} type={cat.type} />
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
    </div>
  );
}

function ReconciliationRow({ item, type }: { item: Record<string, unknown>; type: string }) {
  const getLink = () => {
    if (type === "order") return `/admin/orders/${item.id}`;
    if (type === "payment") return `/admin/transactions/${item.id}`;
    if (type === "intent") return `/admin/intents/${item.id}`;
    return "#";
  };

  const getLabel = () => {
    if (type === "order") return item.public_order_id as string;
    if (type === "payment") return item.internal_reference as string;
    if (type === "intent") return item.intent_reference as string;
    return item.id as string;
  };

  const status = (item.status as string) || "";

  return (
    <Link to={getLink()} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
      <div className="min-w-0">
        <p className="font-mono text-[12px] font-medium text-foreground truncate">{getLabel()}</p>
        <p className="text-[10px] text-muted-foreground">
          {type === "order" && `${item.network || ""} · GH₵${Number(item.amount_charged || 0).toLocaleString()}`}
          {type === "payment" && `GH₵${Number(item.amount || 0).toLocaleString()} · ${item.provider || ""}`}
          {type === "intent" && `${item.network || ""} · GH₵${Number(item.amount_expected || 0).toLocaleString()}`}
          {" · "}{new Date(item.created_at as string).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <OperationsBadge status={status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
    </Link>
  );
}
