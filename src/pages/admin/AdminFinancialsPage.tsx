import { useState, useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Loader2, TrendingUp, DollarSign, Activity, Users, Calendar, Filter } from "lucide-react";
import { getProfitMetrics, ProfitMetricsResult } from "@/services/adminFinancials";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

export default function AdminFinancialsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProfitMetricsResult | null>(null);
  
  // Date range presets
  const [datePreset, setDatePreset] = useState<"today" | "7days" | "this_month" | "this_week">("7days");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 7),
    end: new Date(),
  });

  useEffect(() => {
    let start = new Date();
    let end = new Date();
    const now = new Date();
    
    if (datePreset === "today") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (datePreset === "7days") {
      start = subDays(now, 7);
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "this_week") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (datePreset === "this_month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }
    setDateRange({ start, end });
  }, [datePreset]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getProfitMetrics(dateRange.start, dateRange.end);
        setMetrics(data);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateRange]);

  const summary = metrics?.summary || { total_revenue: 0, total_cost: 0, total_profit: 0, total_orders: 0 };
  const margin = summary.total_revenue > 0 ? (summary.total_profit / summary.total_revenue) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <SEOHead title="Financials & Profit" description="Admin dashboard for financial metrics and profit calculation" />
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" /> Financials & Profit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track revenue, supplier costs, and net profit.</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <Button 
            variant={datePreset === "today" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setDatePreset("today")}
            className="rounded-full"
          >
            Today
          </Button>
          <Button 
            variant={datePreset === "this_week" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setDatePreset("this_week")}
            className="rounded-full"
          >
            This Week
          </Button>
          <Button 
            variant={datePreset === "7days" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setDatePreset("7days")}
            className="rounded-full"
          >
            Last 7 Days
          </Button>
          <Button 
            variant={datePreset === "this_month" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setDatePreset("this_month")}
            className="rounded-full"
          >
            This Month
          </Button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
              title="Gross Revenue" 
              value={`GH₵ ${summary.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Total money collected"
              icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
              trend="bg-emerald-50 text-emerald-700"
            />
            <KPICard 
              title="Supplier Cost" 
              value={`GH₵ ${summary.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Total paid to suppliers"
              icon={<Activity className="h-4 w-4 text-orange-500" />}
              trend="bg-orange-50 text-orange-700"
            />
            <KPICard 
              title="Net Profit" 
              value={`GH₵ ${summary.total_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle="Revenue minus cost"
              icon={<DollarSign className="h-4 w-4 text-primary" />}
              trend="bg-primary/10 text-primary"
              highlight
            />
            <KPICard 
              title="Profit Margin" 
              value={`${margin.toFixed(1)}%`}
              subtitle="Net profit percentage"
              icon={<Filter className="h-4 w-4 text-purple-500" />}
              trend="bg-purple-50 text-purple-700"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" /> Daily Trends
              </h3>
              <div className="h-[300px] w-full">
                {metrics?.daily_trends.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics?.daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickMargin={10} 
                        tickFormatter={(val) => format(new Date(val), "MMM d")}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickMargin={10} 
                        tickFormatter={(val) => `GH₵${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`, '']}
                        labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                      />
                      <Legend iconType="circle" />
                      <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                      <Area type="monotone" name="Net Profit" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 flex flex-col">
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> Agent vs Direct Profit
              </h3>
              <div className="flex-1 min-h-[250px]">
                {metrics?.actor_breakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics?.actor_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickMargin={10} 
                        tickFormatter={(val) => val === 'user' ? 'Direct (Public)' : val === 'agent' ? 'Agents' : val}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickMargin={10} />
                      <Tooltip 
                        cursor={{fill: 'rgba(0,0,0,0.02)'}}
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`, 'Profit']}
                      />
                      <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Breakdowns Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl overflow-hidden">
               <div className="px-5 py-4 border-b border-border/10 bg-muted/20">
                <h3 className="text-sm font-semibold flex items-center gap-2">Profit by Network</h3>
               </div>
               <div className="p-0">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="border-b border-border/10 text-muted-foreground text-xs text-left">
                       <th className="px-5 py-3 font-medium">Network</th>
                       <th className="px-5 py-3 font-medium text-right">Orders</th>
                       <th className="px-5 py-3 font-medium text-right">Profit</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border/5">
                     {metrics?.network_breakdown.map(n => (
                       <tr key={n.name} className="hover:bg-muted/10 transition-colors">
                         <td className="px-5 py-3 font-medium capitalize">{n.name}</td>
                         <td className="px-5 py-3 text-right text-muted-foreground">{n.orders}</td>
                         <td className="px-5 py-3 text-right font-bold text-primary">GH₵ {n.profit.toFixed(2)}</td>
                       </tr>
                     ))}
                     {(!metrics?.network_breakdown || metrics.network_breakdown.length === 0) && (
                       <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">No data found</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden">
               <div className="px-5 py-4 border-b border-border/10 bg-muted/20">
                <h3 className="text-sm font-semibold flex items-center gap-2">Top Performing Bundles</h3>
               </div>
               <div className="p-0 overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="border-b border-border/10 text-muted-foreground text-xs text-left">
                       <th className="px-5 py-3 font-medium">Bundle</th>
                       <th className="px-5 py-3 font-medium text-right">Orders</th>
                       <th className="px-5 py-3 font-medium text-right">Profit</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border/5">
                     {metrics?.bundle_breakdown.map(b => (
                       <tr key={b.bundle_code} className="hover:bg-muted/10 transition-colors">
                         <td className="px-5 py-3">
                           <div className="font-medium truncate max-w-[200px]">{b.bundle_name}</div>
                           <div className="text-[10px] text-muted-foreground capitalize">{b.network}</div>
                         </td>
                         <td className="px-5 py-3 text-right text-muted-foreground">{b.orders}</td>
                         <td className="px-5 py-3 text-right font-bold text-primary">GH₵ {b.profit.toFixed(2)}</td>
                       </tr>
                     ))}
                     {(!metrics?.bundle_breakdown || metrics.bundle_breakdown.length === 0) && (
                       <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">No data found</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPICard({ title, subtitle, value, icon, trend, highlight }: { title: string, subtitle: string, value: string, icon: React.ReactNode, trend: string, highlight?: boolean }) {
  return (
    <div className={cn("glass-card rounded-2xl p-5 relative overflow-hidden", highlight && "border-primary/20 shadow-[0_4px_24px_rgba(var(--primary-rgb),0.08)]")}>
      {highlight && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", trend)}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
