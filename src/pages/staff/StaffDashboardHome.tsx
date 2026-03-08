/**
 * Staff Dashboard Home — Operational overview for support staff
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  ShoppingCart, AlertTriangle, XCircle, Clock, CreditCard,
  ArrowRight, Loader2, CheckCircle2, FileText,
} from "lucide-react";
import { OperationsBadge } from "@/components/admin/OperationsBadge";

export default function StaffDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    failedOrders: 0,
    stuckOrders: 0,
    orphanPayments: 0,
    stuckIntents: 0,
  });
  const [recentFailed, setRecentFailed] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    async function load() {
      const [totalRes, failedRes, stuckRes, stuckIntRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "queued", "processing"]),
        supabase.from("purchase_intents").select("id", { count: "exact", head: true }).eq("status", "payment_confirmed"),
      ]);

      // Orphan payments detection
      let orphanCount = 0;
      const { data: verifiedPayments } = await supabase
        .from("payment_records").select("id").eq("status", "verified").limit(200);
      if (verifiedPayments && verifiedPayments.length > 0) {
        const ids = verifiedPayments.map(p => p.id);
        const { data: linked } = await supabase.from("orders").select("payment_record_id").in("payment_record_id", ids);
        const linkedSet = new Set((linked || []).map(o => o.payment_record_id));
        orphanCount = verifiedPayments.filter(p => !linkedSet.has(p.id)).length;
      }

      // Recent failed orders
      const { data: failed } = await supabase
        .from("orders").select("*").eq("status", "failed")
        .order("created_at", { ascending: false }).limit(5);

      setStats({
        totalOrders: totalRes.count || 0,
        failedOrders: failedRes.count || 0,
        stuckOrders: stuckRes.count || 0,
        orphanPayments: orphanCount,
        stuckIntents: stuckIntRes.count || 0,
      });
      setRecentFailed(failed || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalIssues = stats.failedOrders + stats.orphanPayments + stats.stuckIntents;

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Staff Dashboard" description="Support operations overview" />

      {/* Summary banner */}
      {totalIssues > 0 ? (
        <Card className="border-amber-300/60 bg-amber-50/30 dark:bg-amber-900/10">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{totalIssues} issue{totalIssues !== 1 ? "s" : ""} need attention</p>
              <p className="text-[11px] text-muted-foreground">Review the issue queue for details</p>
            </div>
            <Link to="/staff/issues" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
              View Issues <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <p className="text-sm font-medium text-foreground">All systems healthy — no issues detected</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Orders" value={stats.totalOrders.toLocaleString()} icon={ShoppingCart} />
        <StatCard title="Failed Orders" value={stats.failedOrders.toString()} icon={XCircle} description={stats.failedOrders > 0 ? "Needs review" : "Clear"} />
        <StatCard title="Pending Fulfillment" value={stats.stuckOrders.toString()} icon={Clock} />
        <StatCard title="Orphan Payments" value={stats.orphanPayments.toString()} icon={CreditCard} description={stats.orphanPayments > 0 ? "Admin escalation" : "Clear"} />
        <StatCard title="Stuck Intents" value={stats.stuckIntents.toString()} icon={FileText} description={stats.stuckIntents > 0 ? "Conversion issue" : "Clear"} />
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Search Orders", path: "/staff/orders", icon: ShoppingCart },
          { label: "Search Transactions", path: "/staff/transactions", icon: CreditCard },
          { label: "Issue Queue", path: "/staff/issues", icon: AlertTriangle },
        ].map((link) => (
          <Link key={link.path} to={link.path}>
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="py-4 flex items-center gap-3">
                <link.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{link.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent failed orders */}
      {recentFailed.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" /> Recent Failed Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {recentFailed.map((o) => (
                <Link
                  key={o.id as string}
                  to={`/staff/orders/${o.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <p className="font-mono text-[12px] font-medium text-foreground">{o.public_order_id as string}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {o.network as string} · GH₵{Number(o.amount_charged).toLocaleString()} · {o.beneficiary_number as string}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <OperationsBadge status={o.status as string} />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
