/**
 * Admin Dashboard Home
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, ShoppingCart, ArrowRightLeft, Ticket, UserCheck, Activity,
} from "lucide-react";

export default function AdminDashboardHome() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeNotices: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const [usersRes, noticesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("notices").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      setStats({
        totalUsers: usersRes.count || 0,
        activeNotices: noticesRes.count || 0,
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Admin Dashboard" description="Platform operations overview" />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} variant="primary" />
        <StatCard title="Total Orders" value="—" icon={ShoppingCart} description="Coming in Phase 2" />
        <StatCard title="Transactions" value="—" icon={ArrowRightLeft} description="Coming in Phase 2" />
        <StatCard title="Pending Tickets" value="—" icon={Ticket} description="Coming in Phase 2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Agent Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pending agent applications will appear here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" /> System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active notices: {stats.activeNotices}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
