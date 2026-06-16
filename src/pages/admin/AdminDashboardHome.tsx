/**
 * Admin Dashboard — Real operations overview
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  ShoppingCart, CreditCard, AlertTriangle, CheckCircle2, Clock, XCircle,
  Users, Activity, ArrowRight, Package, Sparkles,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/shared/LoadingState";

interface DashStats {
  totalOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  pendingOrders: number;
  totalPayments: number;
  verifiedPayments: number;
  failedPayments: number;
  totalUsers: number;
  recentOrders: Record<string, unknown>[];
  attentionItems: number;
  pendingSpecial: number;
}

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<DashStats>({
    totalOrders: 0, deliveredOrders: 0, failedOrders: 0, pendingOrders: 0,
    totalPayments: 0, verifiedPayments: 0, failedPayments: 0,
    totalUsers: 0, recentOrders: [], attentionItems: 0, pendingSpecial: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [
        ordersTotal, ordersDelivered, ordersFailed, ordersPending,
        paymentsTotal, paymentsVerified, paymentsFailed,
        usersTotal, recentOrders, stuckIntents, specialPending,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "queued", "processing"]),
        supabase.from("payment_records").select("id", { count: "exact", head: true }),
        supabase.from("payment_records").select("id", { count: "exact", head: true }).eq("status", "verified"),
        supabase.from("payment_records").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("purchase_intents").select("id", { count: "exact", head: true }).eq("status", "payment_confirmed"),
        supabase.from("special_bundle_orders" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        totalOrders: ordersTotal.count || 0,
        deliveredOrders: ordersDelivered.count || 0,
        failedOrders: ordersFailed.count || 0,
        pendingOrders: ordersPending.count || 0,
        totalPayments: paymentsTotal.count || 0,
        verifiedPayments: paymentsVerified.count || 0,
        failedPayments: paymentsFailed.count || 0,
        totalUsers: usersTotal.count || 0,
        recentOrders: recentOrders.data || [],
        attentionItems: (stuckIntents.count || 0) + (ordersFailed.count || 0) + ((specialPending as { count?: number }).count || 0),
        pendingSpecial: (specialPending as { count?: number }).count || 0,
      });
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Admin Dashboard" description="Platform operations overview" />

      {/* Stats grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingCart} variant="primary" size="sm" />
        <StatCard title="Delivered" value={stats.deliveredOrders} icon={CheckCircle2} variant="success" size="sm" />
        <StatCard title="Pending / Processing" value={stats.pendingOrders} icon={Clock} variant="warning" size="sm" />
        <StatCard title="Failed" value={stats.failedOrders} icon={XCircle} variant="destructive" size="sm" />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Payments" value={stats.totalPayments} icon={CreditCard} size="sm" />
        <StatCard title="Verified" value={stats.verifiedPayments} icon={CheckCircle2} variant="success" size="sm" />
        <StatCard title="Failed Payments" value={stats.failedPayments} icon={XCircle} variant="destructive" size="sm" />
        <StatCard title="Needs Attention" value={stats.attentionItems} icon={AlertTriangle} variant={stats.attentionItems > 0 ? "warning" : "default"} size="sm" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent orders */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Recent Orders
            </CardTitle>
            <Link to="/admin/orders" className="text-[11px] text-primary font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground px-6 pb-4">No orders yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {stats.recentOrders.map((o) => (
                  <Link
                    key={o.id as string}
                    to={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-mono font-medium text-foreground truncate">
                        {o.public_order_id as string}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {o.network as string} · {(o.bundle_snapshot as Record<string, unknown>)?.volume as string} · GH₵{Number(o.amount_charged).toLocaleString()}
                      </p>
                    </div>
                    <OperationsBadge status={o.status as string} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Orders", path: "/admin/orders", icon: ShoppingCart, desc: `${stats.totalOrders} total` },
              { label: "Transactions", path: "/admin/transactions", icon: CreditCard, desc: `${stats.totalPayments} records` },
              { label: "Reconciliation", path: "/admin/reconciliation", icon: AlertTriangle, desc: `${stats.attentionItems} items` },
              { label: "Special Orders", path: "/admin/special-orders", icon: Sparkles, desc: `${stats.pendingSpecial} pending` },
              { label: "Users", path: "/admin/users", icon: Users, desc: `${stats.totalUsers} registered` },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
