/**
 * Admin Orders — paginated (30/page), filterable, mobile-first, with per-row +
 * bulk moderation actions.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { BulkStatusDialog } from "@/components/admin/BulkStatusDialog";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminStatStrip, type AdminStat } from "@/components/admin/AdminStatStrip";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/admin/ResponsiveTable";
import { DataPagination } from "@/components/admin/DataPagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw, ListChecks, MoreVertical, Eye, Edit3, Copy, RotateCcw, ShoppingCart, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { triggerStatusSync } from "@/services/supplierAdmin";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["all", "paid", "queued", "processing", "delivered", "failed", "cancelled", "refunded"];
const NETWORKS = ["all", "MTN", "Telecel", "AirtelTigo"];

type Order = Record<string, any>;

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const pg = useAdminPagination(30);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [network, setNetwork] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, delivered: 0, pending: 0, failed: 0 });

  // global stat strip (once)
  useEffect(() => {
    (async () => {
      const C = { count: "exact" as const, head: true };
      const [t, d, p, f] = await Promise.all([
        supabase.from("orders").select("id", C),
        supabase.from("orders").select("id", C).eq("status", "delivered"),
        supabase.from("orders").select("id", C).in("status", ["paid", "queued", "processing"]),
        supabase.from("orders").select("id", C).eq("status", "failed"),
      ]);
      setStats({ total: t.count || 0, delivered: d.count || 0, pending: p.count || 0, failed: f.count || 0 });
    })();
  }, [reloadKey]);

  // paginated list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(pg.from, pg.to);
      if (status !== "all") q = q.eq("status", status as any);
      if (network !== "all") q = q.eq("network", network);
      const term = search.trim().replace(/[%,]/g, "");
      if (term) q = q.or(`public_order_id.ilike.%${term}%,beneficiary_number.ilike.%${term}%`);
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
      if (amountMin) q = q.gte("amount_charged", Number(amountMin));
      if (amountMax) q = q.lte("amount_charged", Number(amountMax));

      const { data, count } = await q;
      if (cancelled) return;
      setOrders(data || []);
      pg.setTotal(count || 0);
      setSelected(new Set());
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg.page, pg.pageSize, reloadKey]);

  const applyFilters = useCallback(() => { pg.setPage(0); setReloadKey((k) => k + 1); }, [pg]);
  const refresh = () => setReloadKey((k) => k + 1);

  const setStatusChip = (v: string) => { setStatus(v); pg.setPage(0); setReloadKey((k) => k + 1); };
  const setNetworkChip = (v: string) => { setNetwork(v); pg.setPage(0); setReloadKey((k) => k + 1); };

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((p) => (p.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));

  const openBulk = (ids: string[]) => { setBulkIds(ids); setBulkOpen(true); };
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied", description: text }); };

  const syncOne = async (id: string) => {
    try { await triggerStatusSync(id); toast({ title: "Sync triggered" }); refresh(); }
    catch (e) { toast({ title: "Sync failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const retry = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/fulfill-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ order_id: id }),
      });
      const d = await res.json();
      if (d.success) { toast({ title: "Fulfilment triggered", description: `Status: ${d.status}` }); refresh(); }
      else toast({ title: "Fulfilment failed", description: d.error || "Unknown error", variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
  };

  const statStrip: AdminStat[] = [
    { label: "Total", value: stats.total.toLocaleString(), icon: ShoppingCart, tone: "primary" },
    { label: "Delivered", value: stats.delivered.toLocaleString(), icon: CheckCircle2, tone: "success" },
    { label: "In Progress", value: stats.pending.toLocaleString(), icon: Clock, tone: stats.pending > 0 ? "warning" : "default" },
    { label: "Failed", value: stats.failed.toLocaleString(), icon: XCircle, tone: stats.failed > 0 ? "destructive" : "default" },
  ];

  const columns: ResponsiveColumn<Order>[] = [
    {
      key: "id", header: "Order ID", mobile: "title",
      cell: (o) => <Link to={`/admin/orders/${o.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">{o.public_order_id}</Link>,
    },
    {
      key: "bundle", header: "Bundle", mobile: "subtitle",
      cell: (o) => <span className="text-muted-foreground">{o.network} · {(o.bundle_snapshot as any)?.volume || o.bundle_name || "—"}</span>,
    },
    { key: "amount", header: "Amount", align: "right", mobile: "trailing", cell: (o) => <span className="font-semibold">GH₵{Number(o.amount_charged).toLocaleString()}</span> },
    { key: "recipient", header: "Recipient", mobile: "row", cell: (o) => <span className="font-mono text-[12px] text-muted-foreground">{o.beneficiary_number}</span> },
    { key: "status", header: "Status", mobile: "row", cell: (o) => <OperationsBadge status={o.status} /> },
    { key: "source", header: "Source", mobile: "row", cell: (o) => <span className="text-[11px] capitalize text-muted-foreground">{String(o.source_channel || "").replace(/_/g, " ") || "—"}</span> },
    { key: "supplier", header: "Supplier", mobile: "row", cell: (o) => <span className="text-[11px] font-mono text-muted-foreground">{o.supplier_status || "—"}</span> },
    { key: "created", header: "Created", mobile: "row", cell: (o) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleString()}</span> },
  ];

  const rowActions = (o: Order) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild><Link to={`/admin/orders/${o.id}`}><Eye className="h-4 w-4 mr-2" /> View details</Link></DropdownMenuItem>
        <DropdownMenuItem onClick={() => openBulk([o.id])}><Edit3 className="h-4 w-4 mr-2" /> Change status</DropdownMenuItem>
        {["paid", "queued", "failed"].includes(o.status) && (
          <DropdownMenuItem onClick={() => retry(o.id)}><RotateCcw className="h-4 w-4 mr-2" /> Retry fulfilment</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => syncOne(o.id)}><RefreshCw className="h-4 w-4 mr-2" /> Sync status</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => copy(o.public_order_id)}><Copy className="h-4 w-4 mr-2" /> Copy ID</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Orders" description="Review, moderate and fulfil orders" actions={
        <Button size="sm" variant="outline" onClick={refresh} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      } />

      <AdminStatStrip stats={statStrip} />

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <span className="text-[12px] font-medium px-1">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openBulk(Array.from(selected))}>
            <ListChecks className="h-3.5 w-3.5" /> Bulk status
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(orders.filter((o) => selected.has(o.id)).map((o) => o.public_order_id).join("\n"))}>
            <Copy className="h-3.5 w-3.5" /> Copy IDs
          </Button>
        </div>
      )}

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        onSubmit={applyFilters}
        placeholder="Search Order ID or phone… (Enter)"
        chips={[
          { label: "Status", value: status, options: STATUSES.map((s) => ({ label: s, value: s })), onChange: setStatusChip },
          { label: "Network", value: network, options: NETWORKS.map((n) => ({ label: n, value: n })), onChange: setNetworkChip },
        ]}
        advanced={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1"><Label className="text-[11px]">From date</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-[11px]">To date</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-[11px]">Min ₵</Label><Input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-[11px]">Max ₵</Label><Input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="h-9" /></div>
            <div className="col-span-2 sm:col-span-4"><Button size="sm" onClick={applyFilters} className="w-full sm:w-auto">Apply filters</Button></div>
          </div>
        }
      />

      <ResponsiveTable
        rows={orders}
        columns={columns}
        keyFn={(o) => o.id}
        loading={loading}
        emptyText="No orders match these filters."
        selectedIds={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        actions={rowActions}
      />

      <DataPagination pagination={pg} rowsOnPage={orders.length} />

      <BulkStatusDialog open={bulkOpen} onOpenChange={setBulkOpen} orderIds={bulkIds} onSuccess={refresh} />
    </div>
  );
}
