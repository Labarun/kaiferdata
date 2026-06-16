/**
 * Admin Purchase Intents — paginated + filterable + mobile-first.
 * Retry/finalize moderation lives on the detail page & reconciliation.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminStatStrip, type AdminStat } from "@/components/admin/AdminStatStrip";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/admin/ResponsiveTable";
import { DataPagination } from "@/components/admin/DataPagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, FileText, AlertTriangle, Clock } from "lucide-react";

const STATUSES = ["all", "created", "pending_payment", "payment_processing", "payment_confirmed", "completed", "cancelled", "expired"];
type Intent = Record<string, any>;

export default function AdminIntentsPage() {
  const navigate = useNavigate();
  const pg = useAdminPagination(30);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState({ total: 0, confirmed: 0, inflight: 0 });

  useEffect(() => {
    (async () => {
      const C = { count: "exact" as const, head: true };
      const [t, c, i] = await Promise.all([
        supabase.from("purchase_intents").select("id", C),
        supabase.from("purchase_intents").select("id", C).eq("status", "payment_confirmed"),
        supabase.from("purchase_intents").select("id", C).in("status", ["created", "pending_payment", "payment_processing"]),
      ]);
      setStats({ total: t.count || 0, confirmed: c.count || 0, inflight: i.count || 0 });
    })();
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("purchase_intents").select("*", { count: "exact" })
        .order("created_at", { ascending: false }).range(pg.from, pg.to);
      if (status !== "all") q = q.eq("status", status as any);
      const term = search.trim().replace(/[%,]/g, "");
      if (term) q = q.or(`intent_reference.ilike.%${term}%,phone_number.ilike.%${term}%`);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
      const { data, count } = await q;
      if (cancelled) return;
      setIntents(data || []);
      pg.setTotal(count || 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg.page, pg.pageSize, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);
  const applyFilters = useCallback(() => { pg.setPage(0); setReloadKey((k) => k + 1); }, [pg]);
  const setStatusChip = (v: string) => { setStatus(v); pg.setPage(0); setReloadKey((k) => k + 1); };

  const statStrip: AdminStat[] = [
    { label: "Total Intents", value: stats.total.toLocaleString(), icon: FileText, tone: "primary" },
    { label: "Confirmed (stuck)", value: stats.confirmed.toLocaleString(), icon: AlertTriangle, tone: stats.confirmed > 0 ? "warning" : "default" },
    { label: "In Flight", value: stats.inflight.toLocaleString(), icon: Clock },
  ];

  const columns: ResponsiveColumn<Intent>[] = [
    { key: "ref", header: "Reference", mobile: "title", cell: (i) => <span className="font-mono text-[12px] font-medium text-primary">{i.intent_reference}</span> },
    { key: "meta", header: "Network", mobile: "subtitle", cell: (i) => <span className="text-muted-foreground">{i.network} · {i.intent_type}</span> },
    { key: "amount", header: "Amount", align: "right", mobile: "trailing", cell: (i) => <span className="font-semibold">GH₵{Number(i.amount_expected).toLocaleString()}</span> },
    { key: "phone", header: "Phone", mobile: "row", cell: (i) => <span className="font-mono text-[12px] text-muted-foreground">{i.phone_number || "—"}</span> },
    { key: "status", header: "Status", mobile: "row", cell: (i) => <OperationsBadge status={i.status} /> },
    { key: "created", header: "Created", mobile: "row", cell: (i) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(i.created_at).toLocaleString()}</span> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Purchase Intents" description="All checkout intents and their lifecycle" actions={
        <Button size="sm" variant="outline" onClick={refresh} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      } />

      <AdminStatStrip stats={statStrip} cols={3} />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        onSubmit={applyFilters}
        placeholder="Search reference or phone… (Enter)"
        chips={[{ label: "Status", value: status, options: STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: s })), onChange: setStatusChip }]}
        advanced={
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-[11px]">From date</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-[11px]">To date</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div>
            <div className="col-span-2"><Button size="sm" onClick={applyFilters}>Apply</Button></div>
          </div>
        }
      />

      <ResponsiveTable
        rows={intents}
        columns={columns}
        keyFn={(i) => i.id}
        loading={loading}
        emptyText="No intents match these filters."
        onRowClick={(i) => navigate(`/admin/intents/${i.id}`)}
      />

      <DataPagination pagination={pg} rowsOnPage={intents.length} />
    </div>
  );
}
