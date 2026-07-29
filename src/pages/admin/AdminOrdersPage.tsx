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
import { BulkRefundDialog } from "@/components/admin/BulkRefundDialog";
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
  RefreshCw, ListChecks, MoreVertical, Eye, Edit3, Copy, RotateCcw, ShoppingCart, CheckCircle2, Clock, XCircle, Loader2, Undo2,
} from "lucide-react";
import { triggerStatusSync } from "@/services/supplierAdmin";
import { useToast } from "@/hooks/use-toast";
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";

const STATUSES = ["all", "paid", "queued", "processing", "on_hold", "delivered", "failed", "cancelled", "refunded"];
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
  const [bulkRefundOpen, setBulkRefundOpen] = useState(false);
  const [refundIds, setRefundIds] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, delivered: 0, pending: 0, failed: 0, onHold: 0 });
  const [retryAllOpen, setRetryAllOpen] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryProgress, setRetryProgress] = useState({ done: 0, total: 0 });
  const [syncAllOpen, setSyncAllOpen] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  
  // Track active suppliers for targeted syncing
  const [activeSuppliers, setActiveSuppliers] = useState<{id: string, name: string}[]>([]);
  const [targetSyncSupplier, setTargetSyncSupplier] = useState<{id: string, name: string} | null>(null);

  // global stat strip (once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["processing", "queued"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);
      const { count: c5 } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "on_hold");
      if (!cancelled) setStats({ total: c1 || 0, delivered: c2 || 0, pending: c3 || 0, failed: c4 || 0, onHold: c5 || 0 });
      
      const { data: supData } = await supabase.from("suppliers").select("id, name").eq("is_active", true);
      if (supData && !cancelled) setActiveSuppliers(supData);
    })();
    return () => { cancelled = true; };
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
  const openBulkRefund = (ids: string[]) => { setRefundIds(ids); setBulkRefundOpen(true); };
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied", description: text }); };
  const formatOrderForCopy = (o: Order) => {
    const volume = (o.bundle_snapshot as any)?.volume || o.bundle_name || "";
    return `${o.beneficiary_number} ${volume}`.trim();
  };

  const syncOne = async (id: string) => {
    try { await triggerStatusSync(id); toast({ title: "Sync triggered" }); refresh(); }
    catch (e) { toast({ title: "Sync failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const fulfillOnce = async (id: string, token?: string): Promise<boolean> => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/fulfill-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: id }),
      });
      const d = await res.json();
      return !!d?.success;
    } catch {
      return false;
    }
  };

  const retry = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const ok = await fulfillOnce(id, session?.access_token);
    if (ok) { toast({ title: "Fulfilment triggered" }); refresh(); }
    else toast({ title: "Fulfilment failed", description: "Could not re-send to supplier", variant: "destructive" });
  };

  // Shared bulk re-send: loop fulfilment over a set of order ids with progress.
  const retryOrders = async (ids: string[]) => {
    if (ids.length === 0) { toast({ title: "Nothing to retry" }); return; }
    const { data: { session } } = await supabase.auth.getSession();
    setRetryingAll(true);
    setRetryProgress({ done: 0, total: ids.length });
    let ok = 0;
    for (let i = 0; i < ids.length; i++) {
      if (await fulfillOnce(ids[i], session?.access_token)) ok++;
      setRetryProgress({ done: i + 1, total: ids.length });
    }
    setRetryingAll(false);
    toast({
      title: `Retried ${ids.length} order(s)`,
      description: `${ok} re-sent · ${ids.length - ok} still failed`,
      variant: ok > 0 ? "default" : "destructive",
    });
    setSelected(new Set());
    refresh();
  };

  // All failed orders across the whole platform (not just this page).
  const retryAllFailed = async () => {
    const { data } = await supabase.from("orders").select("id").eq("status", "failed").limit(500);
    await retryOrders((data || []).map((o: any) => o.id as string));
  };

  // Sync ALL processing orders across the platform (chunked concurrency)
  const syncAllProcessingOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    
    // Fetch all processing orders from the last month or so
    const { data: processingOrders } = await supabase
       .from("orders")
       .select("id")
       .in("status", ["processing", "queued"])
       .limit(2000);
       
    if (!processingOrders || processingOrders.length === 0) {
      toast({ title: "Nothing to sync" });
      setSyncAllOpen(false);
      return;
    }
    
    setSyncingAll(true);
    setSyncProgress({ done: 0, total: processingOrders.length });
    
    let ok = 0;
    const CHUNK_SIZE = 2; // 2 concurrent requests (approx 120 req/min max)
    const DELAY_MS = 1000; // 1 second delay between chunks
    
    for (let i = 0; i < processingOrders.length; i += CHUNK_SIZE) {
       const batch = processingOrders.slice(i, i + CHUNK_SIZE);
       await Promise.all(batch.map(async (order) => {
         try {
           const bodyPayload: any = { order_id: order.id };
           if (targetSyncSupplier) {
             bodyPayload.supplier_id = targetSyncSupplier.id;
           }
           
           const res = await fetch(`https://${projectId}.supabase.co/functions/v1/sync-order-status`, {
             method: "POST",
             headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
             body: JSON.stringify(bodyPayload),
           });
           if (res.ok) ok++;
         } catch (e) {
           console.error("Sync error for order", order.id, e);
         }
       }));
       await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
       setSyncProgress({ done: Math.min(i + CHUNK_SIZE, processingOrders.length), total: processingOrders.length });
    }
    
    setSyncingAll(false);
    setSyncAllOpen(false);
    toast({ title: `Synced ${ok}/${processingOrders.length} orders` });
    refresh();
  };

  // Only the retriable orders among the current selection.
  const RETRIABLE = ["failed", "paid", "queued"];
  const retriableSelected = orders.filter((o) => selected.has(o.id) && RETRIABLE.includes(o.status));
  const retrySelected = () => retryOrders(retriableSelected.map((o) => o.id));

  const statStrip: AdminStat[] = [
    { label: "Total", value: stats.total.toLocaleString(), icon: ShoppingCart, tone: "primary" },
    { label: "Delivered", value: stats.delivered.toLocaleString(), icon: CheckCircle2, tone: "success" },
    { label: "In Progress", value: stats.pending.toLocaleString(), icon: Clock, tone: stats.pending > 0 ? "warning" : "default" },
    { label: "On Hold", value: stats.onHold.toLocaleString(), icon: Clock, tone: stats.onHold > 0 ? "warning" : "default" },
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
        <DropdownMenuItem onClick={() => copy(formatOrderForCopy(o))}><Copy className="h-4 w-4 mr-2" /> Copy Details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openBulkRefund([o.id])} className="text-destructive focus:text-destructive"><Undo2 className="h-4 w-4 mr-2" /> Refund Order</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Orders" description="Review, moderate and fulfil orders" actions={
        <div className="flex items-center gap-2">
          {stats.failed > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={retryingAll}
              onClick={() => setRetryAllOpen(true)}
              className="gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/5"
            >
              {retryingAll
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Retrying {retryProgress.done}/{retryProgress.total}</>
                : <><RotateCcw className="h-3.5 w-3.5" /> Retry all failed ({stats.failed})</>}
            </Button>
          )}
          {stats.pending > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncingAll}
                  className="gap-1.5 border-blue-500/40 text-blue-600 hover:bg-blue-500/5"
                >
                  {syncingAll
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing {syncProgress.done}/{syncProgress.total}</>
                    : <><RefreshCw className="h-3.5 w-3.5" /> Sync all pending ({stats.pending})</>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setTargetSyncSupplier(null); setSyncAllOpen(true); }}>
                  Sync All Suppliers
                </DropdownMenuItem>
                {activeSuppliers.map(sup => (
                  <DropdownMenuItem key={sup.id} onClick={() => { setTargetSyncSupplier(sup); setSyncAllOpen(true); }}>
                    Sync {sup.name} only
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" variant="outline" onClick={refresh} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
        </div>
      } />

      <AdminStatStrip stats={statStrip} cols={5} />

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <span className="text-[12px] font-medium px-1">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openBulk(Array.from(selected))}>
            <ListChecks className="h-3.5 w-3.5" /> Bulk status
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => openBulkRefund(Array.from(selected))}>
            <Undo2 className="h-3.5 w-3.5" /> Refund
          </Button>
          {retriableSelected.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={retryingAll}
              className="gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/5"
              onClick={retrySelected}
            >
              {retryingAll
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Retrying {retryProgress.done}/{retryProgress.total}</>
                : <><RotateCcw className="h-3.5 w-3.5" /> Retry fulfilment ({retriableSelected.length})</>}
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(orders.filter((o) => selected.has(o.id)).map((o) => o.public_order_id).join("\n"))}>
            <Copy className="h-3.5 w-3.5" /> Copy IDs
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copy(orders.filter((o) => selected.has(o.id)).map(formatOrderForCopy).join("\n"))}>
            <Copy className="h-3.5 w-3.5" /> Copy Details
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
      <BulkRefundDialog open={bulkRefundOpen} onOpenChange={setBulkRefundOpen} orderIds={refundIds} onSuccess={refresh} />

      <ConfirmActionDialog
        open={retryAllOpen}
        onOpenChange={setRetryAllOpen}
        title={`Retry all ${stats.failed} failed order(s)?`}
        description={
          <>
            This re-sends every <strong>failed</strong> order to the supplier. Orders that succeed move out of
            Failed; ones that still can't be delivered stay Failed. This may take a moment.
          </>
        }
        confirmLabel="Retry all failed"
        onConfirm={retryAllFailed}
      />
      
      <ConfirmActionDialog
        open={syncAllOpen}
        onOpenChange={setSyncAllOpen}
        title={`Sync ${stats.pending} pending order(s)?`}
        description={
          <>
            This will query {targetSyncSupplier ? targetSyncSupplier.name : "all active suppliers"} to check the status of <strong>{stats.pending}</strong> processing orders. It processes them in parallel chunks so it will take less than a minute.
          </>
        }
        confirmLabel={`Sync ${targetSyncSupplier ? targetSyncSupplier.name : "All"}`}
        onConfirm={syncAllProcessingOrders}
      />
    </div>
  );
}
