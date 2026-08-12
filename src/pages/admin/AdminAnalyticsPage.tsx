import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Activity, ShoppingCart, Users, CreditCard, TrendingUp } from "lucide-react";
import { DashboardSkeleton } from "@/components/shared/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface AnalyticsStats {
  totalProfit: number;
  directProfit: number;
  agentProfit: number;
  totalCommission: number;
}

interface TopAgent {
  agent_id: string;
  store_name: string;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
}

interface SalesSource {
  actor_type: string;
  total_orders: number;
  total_revenue: number;
}

interface SalesTrend {
  sale_date: string;
  total_orders: number;
  total_revenue: number;
}

interface TopPackage {
  network: string;
  bundle_name: string;
  total_orders: number;
  total_revenue: number;
}

interface StatusBreakdown {
  status: string;
  total_orders: number;
}

interface PaymentMethod {
  payment_method: string;
  total_orders: number;
  total_revenue: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats>({
    totalProfit: 0, directProfit: 0, agentProfit: 0, totalCommission: 0,
  });
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [salesSources, setSalesSources] = useState<SalesSource[]>([]);
  const [salesTrends, setSalesTrends] = useState<SalesTrend[]>([]);
  const [topPackages, setTopPackages] = useState<TopPackage[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "all">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [statsRes, topAgentsRes, sourcesRes, trendsRes, packagesRes, statusRes, paymentsRes] = await Promise.all([
          supabase.rpc("get_admin_profit_stats", { timeframe }),
          supabase.rpc("get_top_agents", { timeframe }),
          supabase.rpc("get_sales_source_breakdown", { timeframe }),
          supabase.rpc("get_sales_trends", { days_limit: timeframe === 'today' ? 1 : timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90 }),
          supabase.rpc("get_top_selling_packages", { timeframe }),
          supabase.rpc("get_order_status_breakdown", { timeframe }),
          supabase.rpc("get_payment_method_breakdown", { timeframe })
        ]);

        setStats({
          totalProfit: statsRes.data?.[0]?.total_profit || 0,
          directProfit: statsRes.data?.[0]?.direct_profit || 0,
          agentProfit: statsRes.data?.[0]?.agent_profit || 0,
          totalCommission: statsRes.data?.[0]?.total_commission || 0,
        });

        if (topAgentsRes.data) setTopAgents(topAgentsRes.data);
        if (sourcesRes.data) setSalesSources(sourcesRes.data);
        if (trendsRes.data) setSalesTrends(trendsRes.data);
        if (packagesRes.data) setTopPackages(packagesRes.data);
        if (statusRes.data) setStatusBreakdown(statusRes.data);
        if (paymentsRes.data) setPaymentMethods(paymentsRes.data);

      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeframe]);

  if (loading && !stats.totalProfit) {
    return <DashboardSkeleton />;
  }

  // Format data for Pie Charts
  const pieData = salesSources.map((source, index) => ({
    name: source.actor_type === 'guest' ? 'Guest / Direct' : 'Agent',
    value: Number(source.total_revenue),
    orders: Number(source.total_orders)
  }));

  const statusPieData = statusBreakdown.map((s, index) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: Number(s.total_orders)
  }));
  
  const paymentPieData = paymentMethods.map((p, index) => ({
    name: p.payment_method,
    value: Number(p.total_orders)
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Analytics & Insights" description="Platform profit, commission, and agent performance" />

      {/* Timeframe selector */}
      <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard title="Total Profit" value={`GH₵${stats.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={Activity} variant="success" size="sm" />
          <StatCard title="Direct Profit" value={`GH₵${stats.directProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={ShoppingCart} size="sm" />
          <StatCard title="Agent Profit" value={`GH₵${stats.agentProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={Users} size="sm" />
          <StatCard title="Agent Commissions" value={`GH₵${stats.totalCommission.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={CreditCard} size="sm" />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Revenue Trends */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                  <XAxis dataKey="sale_date" tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `GH₵${value}`} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" name="Revenue (GH₵)" dataKey="total_revenue" stroke="hsl(var(--primary))" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line yAxisId="right" type="monotone" name="Orders" dataKey="total_orders" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sales Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Revenue Source</CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `GH₵${value.toFixed(2)}`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          {/* Fulfillment Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Fulfillment Health</CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Delivered' ? '#10b981' : entry.name === 'Failed' ? '#ef4444' : COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `${value} orders`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              {paymentPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {paymentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Wallet' ? '#8b5cf6' : '#f59e0b'} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `${value} orders`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Packages Leaderboard */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Selling Packages</CardTitle>
          </CardHeader>
          <CardContent>
            {topPackages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg font-medium">Rank</th>
                      <th className="px-4 py-3 font-medium">Network</th>
                      <th className="px-4 py-3 font-medium">Package</th>
                      <th className="px-4 py-3 font-medium text-right">Total Orders</th>
                      <th className="px-4 py-3 rounded-tr-lg font-medium text-right">Revenue Gen.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {topPackages.map((pkg, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <Badge variant={index === 0 ? "default" : index < 3 ? "secondary" : "outline"}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{pkg.network}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{pkg.bundle_name}</td>
                        <td className="px-4 py-3 text-right">{pkg.total_orders}</td>
                        <td className="px-4 py-3 text-right text-success font-medium">
                          GH₵{Number(pkg.total_revenue).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No packages found for this timeframe.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Agents Leaderboard */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Performing Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {topAgents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg font-medium">Rank</th>
                      <th className="px-4 py-3 font-medium">Store Name</th>
                      <th className="px-4 py-3 font-medium text-right">Total Orders</th>
                      <th className="px-4 py-3 font-medium text-right">Revenue Gen.</th>
                      <th className="px-4 py-3 rounded-tr-lg font-medium text-right">Commission Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {topAgents.map((agent, index) => (
                      <tr key={agent.agent_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <Badge variant={index === 0 ? "default" : index < 3 ? "secondary" : "outline"}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{agent.store_name}</td>
                        <td className="px-4 py-3 text-right">{agent.total_orders}</td>
                        <td className="px-4 py-3 text-right text-success font-medium">
                          GH₵{Number(agent.total_revenue).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          GH₵{Number(agent.total_commission).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active agents found for this timeframe.
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
