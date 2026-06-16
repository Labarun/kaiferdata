/**
 * Admin Dashboard — Overview: attention band, grouped stats, section jumps, recent orders.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminStatStrip, type AdminStat } from "@/components/admin/AdminStatStrip";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  ShoppingCart, CreditCard, AlertTriangle, CheckCircle2, Clock, XCircle,
  Users, ArrowRight, Package, Banknote, Sparkles, Server, ShieldAlert, BarChart3, ChevronRight,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/shared/LoadingState";

interface DashStats {
  totalOrders: number; deliveredOrders: number; failedOrders: number; pendingOrders: number;
  totalPayments: number; verifiedPayments: number;
  totalUsers: number;
  stuckIntents: number; pendingSpecial: number; pendingWithdrawals: number;
  recentOrders: Record<string, unknown>[];
}

const COUNT = { count: "exact" as const, head: true };

export default function AdminDashboardHome() {
  const [s, setS] = useState<DashStats>({
    totalOrders: 0, deliveredOrders: 0, failedOrders: 0, pendingOrders: 0,
    totalPayments: 0, verifiedPayments: 0, totalUsers: 0,
    stuckIntents: 0, pendingSpecial: 0, pendingWithdrawals: 0, recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const [
        ordersTotal, ordersDelivered, ordersFailed, ordersPending,
        paymentsTotal, paymentsVerified, usersTotal, recentOrders,
        stuckIntents, pendingSpecial, pendingWithdrawals,
      ] = await Promise.all([
        supabase.from("orders").select("id", COUNT),
        supabase.from("orders").select("id", COUNT).eq("status", "delivered"),
        supabase.from("orders").select("id", COUNT).eq("status", "failed"),
        supabase.from("orders").select("id", COUNT).in("status", ["paid", "queued", "processing"]),
        supabase.from("payment_records").select("id", COUNT),
        supabase.from("payment_records").select("id", COUNT).eq("status", "verified"),
        supabase.from("profiles").select("id", COUNT),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("purchase_intents").select("id", COUNT).eq("status", "payment_confirmed"),
        db.from("special_bundle_orders").select("id", COUNT).eq("status", "pending"),
        db.from("withdrawal_requests").select("id", COUNT).eq("status", "pending"),
      ]);
      setS({
        totalOrders: ordersTotal.count || 0,
        deliveredOrders: ordersDelivered.count || 0,
        failedOrders: ordersFailed.count || 0,
        pendingOrders: ordersPending.count || 0,
        totalPayments: paymentsTotal.count || 0,
        verifiedPayments: paymentsVerified.count || 0,
        totalUsers: usersTotal.count || 0,
        stuckIntents: stuckIntents.count || 0,
        pendingSpecial: (pendingSpecial as { count?: number }).count || 0,
        pendingWithdrawals: (pendingWithdrawals as { count?: number }).count || 0,
        recentOrders: recentOrders.data || [],
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const attention = s.failedOrders + s.stuckIntents + s.pendingSpecial + s.pendingWithdrawals;

  const orderStats: AdminStat[] = [
    { label: "Total Orders", value: s.totalOrders.toLocaleString(), icon: ShoppingCart, tone: "primary" },
    { label: "Delivered", value: s.deliveredOrders.toLocaleString(), icon: CheckCircle2, tone: "success" },
    { label: "In Progress", value: s.pendingOrders.toLocaleString(), icon: Clock, tone: s.pendingOrders > 0 ? "warning" : "default" },
    { label: "Failed", value: s.failedOrders.toLocaleString(), icon: XCircle, tone: s.failedOrders > 0 ? "destructive" : "default" },
  ];
  const moneyStats: AdminStat[] = [
    { label: "Payments", value: s.totalPayments.toLocaleString(), icon: CreditCard },
    { label: "Verified", value: s.verifiedPayments.toLocaleString(), icon: CheckCircle2, tone: "success" },
    { label: "Pending Payouts", value: s.pendingWithdrawals.toLocaleString(), icon: Banknote, tone: s.pendingWithdrawals > 0 ? "warning" : "default" },
    { label: "Users", value: s.totalUsers.toLocaleString(), icon: Users },
  ];

  const sections = [
    { label: "Orders", desc: "Manage fulfilment", path: "/admin/orders", icon: ShoppingCart },
    { label: "Special Orders", desc: `${s.pendingSpecial} pending`, path: "/admin/special-orders", icon: Sparkles },
    { label: "Withdrawals", desc: `${s.pendingWithdrawals} pending`, path: "/admin/withdrawals", icon: Banknote },
    { label: "Reconciliation", desc: `${attention} to review`, path: "/admin/reconciliation", icon: AlertTriangle },
    { label: "Packages", desc: "Catalog & pricing", path: "/admin/packages", icon: Package },
    { label: "Suppliers", desc: "Integrations", path: "/admin/supplier", icon: Server },
    { label: "Users", desc: `${s.totalUsers} registered`, path: "/admin/users", icon: Users },
    { label: "Analytics", desc: "Profit & trends", path: "/admin/analytics", icon: BarChart3 },
    { label: "Security", desc: "Threats & controls", path: "/admin/security", icon: ShieldAlert },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Admin Dashboard" description="Platform operations overview" />

      {/* Attention band */}
      {attention > 0 && (
        <Link to="/admin/reconciliation" className="block">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3 hover:bg-amber-500/15 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{attention} item{attention !== 1 ? "s" : ""} need attention</p>
              <p className="text-[11.5px] text-muted-foreground truncate">
                {s.failedOrders} failed · {s.stuckIntents} stuck payments · {s.pendingSpecial} special pending · {s.pendingWithdrawals} payouts
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-600 shrink-0" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-0.5">Orders</p>
        <AdminStatStrip stats={orderStats} />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-0.5">Money & People</p>
        <AdminStatStrip stats={moneyStats} />
      </div>

      {/* Section jumps */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-0.5">Jump to</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {sections.map((sec) => (
            <Link
              key={sec.path}
              to={sec.path}
              className="glass-card rounded-2xl p-3.5 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group"
            >
              <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15 flex items-center justify-center shrink-0">
                <sec.icon className="h-[18px] w-[18px] text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground truncate">{sec.label}</p>
                <p className="text-[10.5px] text-muted-foreground truncate">{sec.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <Card className="glass-card rounded-2xl border-border/40">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Recent Orders
          </CardTitle>
          <Link to="/admin/orders" className="text-[11px] text-primary font-medium flex items-center gap-1 hover:underline">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {s.recentOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground px-6 pb-4">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {s.recentOrders.map((o) => (
                <Link
                  key={o.id as string}
                  to={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-mono font-medium text-foreground truncate">{o.public_order_id as string}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {o.network as string} · GH₵{Number(o.amount_charged).toLocaleString()}
                    </p>
                  </div>
                  <OperationsBadge status={o.status as string} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
