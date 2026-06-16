/**
 * Staff Issue Queue — Read-only reconciliation view with escalation (no recovery actions)
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { writeAuditLog } from "@/services/auth";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Loader2, AlertTriangle, CreditCard, Package, FileText,
  ChevronRight, CheckCircle2, XCircle, RefreshCcw, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

interface IssueCategory {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  items: Record<string, unknown>[];
  type: string;
  humanState: string;
}

export default function StaffIssueQueuePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<IssueCategory[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [stuckIntents, failedOrders, stuckOrders] = await Promise.all([
      supabase.from("purchase_intents").select("*").eq("status", "payment_confirmed").order("created_at", { ascending: false }).limit(50),
      supabase.from("orders").select("*").eq("status", "failed").order("created_at", { ascending: false }).limit(50),
      supabase.from("orders").select("*").in("status", ["paid", "queued", "processing"]).order("created_at", { ascending: true }).limit(50),
    ]);

    let orphanPayments: Record<string, unknown>[] = [];
    const { data: verifiedPayments } = await supabase.from("payment_records").select("*").eq("status", "verified").order("created_at", { ascending: false }).limit(200);
    if (verifiedPayments && verifiedPayments.length > 0) {
      const ids = verifiedPayments.map(p => p.id);
      const { data: linked } = await supabase.from("orders").select("payment_record_id").in("payment_record_id", ids);
      const linkedSet = new Set((linked || []).map(o => o.payment_record_id));
      orphanPayments = verifiedPayments.filter(p => !linkedSet.has(p.id));
    }

    const cats: IssueCategory[] = [];
    if (orphanPayments.length > 0) {
      cats.push({ title: "Verified Payments Without Orders", description: "Needs admin recovery — escalate if urgent.", icon: CreditCard, color: "text-destructive", items: orphanPayments, type: "payment", humanState: "Verified payment, no order created" });
    }
    if ((stuckIntents.data || []).length > 0) {
      cats.push({ title: "Intents Stuck After Payment", description: "Payment confirmed but no order conversion.", icon: FileText, color: "text-amber-600", items: stuckIntents.data || [], type: "intent", humanState: "Purchase intent successful, conversion incomplete" });
    }
    if ((failedOrders.data || []).length > 0) {
      cats.push({ title: "Failed Orders", description: "Supplier submission failed — may need admin retry.", icon: XCircle, color: "text-destructive", items: failedOrders.data || [], type: "order", humanState: "Supplier submission failed, admin attention required" });
    }
    if ((stuckOrders.data || []).length > 0) {
      cats.push({ title: "Orders Pending Fulfillment", description: "Still in paid/queued/processing state.", icon: Package, color: "text-amber-600", items: stuckOrders.data || [], type: "order", humanState: "Order created, supplier submission pending" });
    }

    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const escalateItem = async (item: Record<string, unknown>, type: string) => {
    if (!user) return;
    await writeAuditLog({
      action: "staff_escalation",
      targetId: item.id as string,
      targetType: type,
      metadata: {
        label: (type === "order" ? item.public_order_id : type === "payment" ? item.internal_reference : item.intent_reference) as string,
        status: item.status as string,
        reason: "Staff escalated from issue queue",
      },
    });
    toast.success("Escalated to admin");
  };

  const totalIssues = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Issue Queue" description="Support-relevant problem cases" />
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : totalIssues === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">All Clear</p>
            <p className="text-xs text-muted-foreground mt-1">No issues detected.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{totalIssues} item{totalIssues !== 1 ? "s" : ""} need attention</p>
                <p className="text-[11px] text-muted-foreground">Escalate items requiring admin intervention</p>
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
                <p className="text-[10px] text-amber-600 font-medium">{cat.humanState}</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {cat.items.slice(0, 20).map((item) => {
                    const getLink = () => {
                      if (cat.type === "order") return `/staff/orders/${item.id}`;
                      if (cat.type === "payment") return `/staff/transactions/${item.id}`;
                      return `/staff/intents/${item.id}`;
                    };
                    const getLabel = () => {
                      if (cat.type === "order") return item.public_order_id as string;
                      if (cat.type === "payment") return item.internal_reference as string;
                      return item.intent_reference as string;
                    };
                    return (
                      <div key={item.id as string} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                        <Link to={getLink()} className="min-w-0 flex-1">
                          <p className="font-mono text-[12px] font-medium text-foreground truncate">{getLabel()}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {cat.type === "order" && `${item.network || ""} · GH₵${Number(item.amount_charged || 0).toLocaleString()}`}
                            {cat.type === "payment" && `GH₵${Number(item.amount || 0).toLocaleString()} · ${item.provider || ""}`}
                            {cat.type === "intent" && `${item.network || ""} · GH₵${Number(item.amount_expected || 0).toLocaleString()}`}
                            {" · "}{new Date(item.created_at as string).toLocaleDateString()}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2">
                          <OperationsBadge status={item.status as string} />
                          <Button variant="ghost" size="sm" onClick={() => escalateItem(item, cat.type)} className="h-7 text-[11px] gap-1 px-2 text-amber-700 hover:text-amber-800">
                            <ArrowUpRight className="h-3 w-3" /> Escalate
                          </Button>
                          <Link to={getLink()}><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></Link>
                        </div>
                      </div>
                    );
                  })}
                  {cat.items.length > 20 && (
                    <div className="px-4 py-2 text-[11px] text-muted-foreground">+ {cat.items.length - 20} more items</div>
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
