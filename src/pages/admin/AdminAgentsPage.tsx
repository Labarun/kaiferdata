/**
 * Admin Agents Page — review applications, manage agent profiles.
 *
 * Tabs: Pending review · Active · Suspended · Declined · All
 * Click a row to open a side dialog with full details + actions.
 */
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/shared/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  listApplications,
  type AgentApplicationWithUser,
} from "@/services/agentAdmin";
import { Search, Store, User, Mail, Phone, MapPin, UserCheck, Clock, Ban } from "lucide-react";
import { AdminAgentDetailDialog } from "@/components/admin/AdminAgentDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { AdminStatStrip, type AdminStat } from "@/components/admin/AdminStatStrip";
import { AdminAgentAnalyticsView } from "@/components/admin/AdminAgentAnalyticsView";

type TabKey = "pending" | "active" | "suspended" | "declined" | "subscribed" | "expired" | "analytics" | "all";

const TAB_FILTERS: Record<TabKey, AgentApplicationWithUser["status"][] | undefined> = {
  pending: ["submitted", "under_review", "needs_changes"],
  active: undefined,
  suspended: undefined,
  declined: ["declined"],
  subscribed: undefined,
  expired: undefined,
  analytics: undefined,
  all: undefined,
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "default" },
  under_review: { label: "Under review", variant: "default" },
  needs_changes: { label: "Needs changes", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
};

export default function AdminAgentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AgentApplicationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, active: 0, suspended: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const C = { count: "exact" as const, head: true };
      const [pend, act, susp, tot] = await Promise.all([
        supabase.from("agent_applications").select("id", C).in("status", ["submitted", "under_review", "needs_changes"]),
        supabase.from("agent_profiles").select("id", C).eq("status", "active"),
        supabase.from("agent_profiles").select("id", C).eq("status", "suspended"),
        supabase.from("agent_profiles").select("id", C),
      ]);
      setCounts({ pending: pend.count || 0, active: act.count || 0, suspended: susp.count || 0, total: tot.count || 0 });
    })();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listApplications({
        status: TAB_FILTERS[tab],
        search: search.trim() || undefined,
      });
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const visibleRows = useMemo(() => {
    if (tab === "active") return rows.filter((r) => r.profile?.status === "active" || r.profile?.status === "pending_subscription" || r.profile?.status === "subscription_expired");
    if (tab === "suspended") return rows.filter((r) => r.profile?.status === "suspended");
    if (tab === "subscribed") return rows.filter((r) => r.latest_subscription?.status === "active");
    if (tab === "expired") return rows.filter((r) => r.profile?.status === "subscription_expired" || r.latest_subscription?.status === "expired" || r.latest_subscription?.status === "cancelled");
    return rows;
  }, [rows, tab]);

  if (!user || user.role !== "admin") {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Agents"
        description="Review applications, approve agents, manage subscriptions."
      />

      <AdminStatStrip
        stats={[
          { label: "Pending Review", value: counts.pending, icon: Clock, tone: counts.pending > 0 ? "warning" : "default" },
          { label: "Active", value: counts.active, icon: UserCheck, tone: "success" },
          { label: "Suspended", value: counts.suspended, icon: Ban, tone: counts.suspended > 0 ? "destructive" : "default" },
          { label: "Total Agents", value: counts.total, icon: Store, tone: "primary" },
        ] as AdminStat[]}
      />

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex-1 overflow-x-auto">
          <TabsList className="w-auto sm:w-auto min-w-max">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="subscribed">Subscribed</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab !== "analytics" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              refresh();
            }}
            className="relative flex-1 sm:max-w-xs"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, store…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </form>
        )}
      </div>

      {/* Results */}
      {tab === "analytics" ? (
        <AdminAgentAnalyticsView />
      ) : loading ? (
        <PageLoader />
      ) : visibleRows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No agents in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleRows.map((row) => (
            <button
              key={row.id}
              onClick={() => setSelectedId(row.id)}
              className="w-full text-left"
            >
              <Card className="hover:border-primary/40 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-center">
                    {/* Col 1: Brand Profile */}
                    <div className="flex items-center gap-3">
                      {row.store_logo_url ? (
                        <img
                          src={row.store_logo_url}
                          alt={row.store_name || ""}
                          className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Store className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {row.business_name || row.store_name || "Unnamed Business"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.full_name || "Unknown"} &bull; {row.city || "No City"}
                        </p>
                      </div>
                    </div>

                    {/* Col 2: Subscription Status & Validity */}
                    <div className="flex flex-col items-start justify-center">
                      {row.latest_subscription ? (
                        <>
                          <Badge variant={row.latest_subscription.status === 'active' ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-wider mb-1">
                            {row.latest_subscription.plan} Sub
                          </Badge>
                          {row.latest_subscription.expires_at ? (() => {
                            const daysLeft = Math.ceil((new Date(row.latest_subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            return (
                              <>
                                <p className={`text-xs font-medium ${daysLeft > 0 && daysLeft <= 5 ? 'text-amber-500' : daysLeft <= 0 ? 'text-destructive' : 'text-foreground'}`}>
                                  {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Exp: {new Date(row.latest_subscription.expires_at).toLocaleDateString()}
                                </p>
                              </>
                            );
                          })() : (
                            <p className="text-xs text-muted-foreground">No expiry</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No Subscription</p>
                      )}
                    </div>

                    {/* Col 3: Analytics & Activity */}
                    <div className="flex flex-col items-start justify-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`relative flex h-2 w-2`}>
                          {row.stats?.lastActive ? (
                            <>
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                            </>
                          ) : (
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/40"></span>
                          )}
                        </span>
                        <p className="text-xs text-muted-foreground font-medium">
                          {row.stats?.lastActive 
                            ? `Active ${new Date(row.stats.lastActive).toLocaleDateString()}` 
                            : 'No sales yet'}
                        </p>
                      </div>
                      <p className="text-[11px] text-foreground font-medium bg-muted px-2 py-0.5 rounded-md">
                        {row.stats?.totalOrders || 0} Orders &bull; {Math.round(row.stats?.successRate || 0)}% Success
                      </p>
                    </div>

                    {/* Col 4: Financials */}
                    <div className="flex flex-col items-end justify-center text-right">
                      <p className="font-bold text-[15px] text-success">
                        GH₵{Number(row.wallet?.current_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        GH₵{Number(row.wallet?.total_earned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lifetime
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <AdminAgentDetailDialog
          applicationId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            setSelectedId(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
