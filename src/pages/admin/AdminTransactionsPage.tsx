/**
 * Admin Transactions — payment records, paginated + filterable + mobile-first.
 * Moderation (recovery / orphan handling) lives on the detail page & reconciliation.
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
import { RefreshCw, CreditCard, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

const STATUSES = ["all", "pending", "verified", "failed", "reversed"];
type Rec = Record<string, any>;

export default function AdminTransactionsPage() {
  const navigate = useNavigate();
  const pg = useAdminPagination(30);
  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState({ total: 0, verified: 0, failed: 0, reversed: 0 });

  useEffect(() => {
    (async () => {
      const C = { count: "exact" as const, head: true };
      const [t, v, f, r] = await Promise.all([
        supabase.from("payment_records").select("id", C),
        supabase.from("payment_records").select("id", C).eq("status", "verified"),
        supabase.from("payment_records").select("id", C).eq("status", "failed"),
        supabase.from("payment_records").select("id", C).eq("status", "reversed"),
      ]);
      setStats({ total: t.count || 0, verified: v.count || 0, failed: f.count || 0, reversed: r.count || 0 });
    })();
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("payment_records").select("*", { count: "exact" })
        .order("created_at", { ascending: false }).range(pg.from, pg.to);
      if (status !== "all") q = q.eq("status", status as any);
      const term = search.trim().replace(/[%,]/g, "");
      if (term) q = q.or(`provider_reference.ilike.%${term}%,internal_reference.ilike.%${term}%`);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
      const { data, count } = await q;
      if (cancelled) return;
      setRecords(data || []);
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
    { label: "Total", value: stats.total.toLocaleString(), icon: CreditCard, tone: "primary" },
    { label: "Verified", value: stats.verified.toLocaleString(), icon: CheckCircle2, tone: "success" },
    { label: "Failed", value: stats.failed.toLocaleString(), icon: XCircle, tone: stats.failed > 0 ? "destructive" : "default" },
    { label: "Reversed", value: stats.reversed.toLocaleString(), icon: RotateCcw, tone: stats.reversed > 0 ? "warning" : "default" },
  ];

  const columns: ResponsiveColumn<Rec>[] = [
    { key: "ref", header: "Internal Ref", mobile: "title", cell: (r) => <span className="font-mono text-[12px] font-medium text-primary">{r.internal_reference}</span> },
    { key: "pref", header: "Provider Ref", mobile: "subtitle", cell: (r) => <span className="font-mono text-muted-foreground">{r.provider_reference || "—"}</span> },
    { key: "amount", header: "Amount", align: "right", mobile: "trailing", cell: (r) => <span className="font-semibold">GH₵{Number(r.amount).toLocaleString()}</span> },
    { key: "status", header: "Status", mobile: "row", cell: (r) => <OperationsBadge status={r.status} /> },
    { key: "provider", header: "Provider", mobile: "row", cell: (r) => <span className="text-[11px] text-muted-foreground capitalize">{r.provider || "—"}</span> },
    { key: "email", header: "Email", mobile: "row", cell: (r) => <span className="text-[11px] text-muted-foreground truncate block max-w-[160px]">{r.customer_email || "—"}</span> },
    { key: "created", header: "Created", mobile: "row", cell: (r) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Transactions" description="Payment records & verification history" actions={
        <Button size="sm" variant="outline" onClick={refresh} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      } />

      <AdminStatStrip stats={statStrip} />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        onSubmit={applyFilters}
        placeholder="Search Paystack ref or internal ref… (Enter)"
        chips={[{ label: "Status", value: status, options: STATUSES.map((s) => ({ label: s, value: s })), onChange: setStatusChip }]}
        advanced={
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-[11px]">From date</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-[11px]">To date</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div>
            <div className="col-span-2"><Button size="sm" onClick={applyFilters}>Apply</Button></div>
          </div>
        }
      />

      <ResponsiveTable
        rows={records}
        columns={columns}
        keyFn={(r) => r.id}
        loading={loading}
        emptyText="No transactions match these filters."
        onRowClick={(r) => navigate(`/admin/transactions/${r.id}`)}
      />

      <DataPagination pagination={pg} rowsOnPage={records.length} />
    </div>
  );
}
