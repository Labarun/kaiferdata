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
import { Search, Store, User, Mail, Phone, MapPin } from "lucide-react";
import { AdminAgentDetailDialog } from "@/components/admin/AdminAgentDetailDialog";

type TabKey = "pending" | "active" | "suspended" | "declined" | "all";

const TAB_FILTERS: Record<TabKey, AgentApplicationWithUser["status"][] | undefined> = {
  pending: ["submitted", "under_review", "needs_changes"],
  active: ["approved"],
  suspended: ["approved"],
  declined: ["declined"],
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

  // Apply tab-specific post-filter (active vs suspended both share status='approved').
  const visibleRows = useMemo(() => {
    if (tab === "active") return rows.filter((r) => r.profile?.status === "active" || r.profile?.status === "pending_subscription" || r.profile?.status === "subscription_expired");
    if (tab === "suspended") return rows.filter((r) => r.profile?.status === "suspended");
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

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex-1">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

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
      </div>

      {/* Results */}
      {loading ? (
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
                  <div className="flex items-start gap-3">
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

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {row.store_name || row.full_name || "Unnamed agent"}
                        </p>
                        <Badge variant={STATUS_BADGE[row.status]?.variant || "outline"}>
                          {STATUS_BADGE[row.status]?.label || row.status}
                        </Badge>
                        {row.profile && (
                          <Badge variant="outline" className="text-xs">
                            Profile: {row.profile.status}
                          </Badge>
                        )}
                        {row.latest_subscription?.status === "active" && (
                          <Badge variant="default" className="text-xs">
                            {row.latest_subscription.plan} sub
                          </Badge>
                        )}
                        {row.latest_subscription?.status === "active" && row.wallet && (
                          <Badge variant="secondary" className="text-xs font-semibold text-success">
                            Earned: GH₵{Number(row.wallet.total_earned || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {row.full_name && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" /> {row.full_name}
                          </span>
                        )}
                        {row.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {row.email}
                          </span>
                        )}
                        {row.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {row.phone}
                          </span>
                        )}
                        {row.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {row.city}
                          </span>
                        )}
                      </div>

                      {row.admin_note && (
                        <p className="mt-1.5 text-xs text-muted-foreground italic line-clamp-1">
                          Admin note: {row.admin_note}
                        </p>
                      )}
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
