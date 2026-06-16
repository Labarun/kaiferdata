/**
 * AdminSpecialOrdersPage — manage special bundle orders.
 *
 * Filter, bulk-select, bulk status change, copy-to-supplier (single + bulk),
 * and quick links to each order's detail view (where cancel + refund lives).
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  ChevronRight,
  RefreshCw,
  Copy,
  Truck,
  CheckCircle2,
  Filter,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SpecialStatusBadge } from "@/components/special/SpecialStatusBadge";
import {
  fetchAllSpecialOrders,
  bulkSetSpecialOrderStatus,
  formatOrderForSupplier,
  formatOrdersForSupplierBulk,
  type SpecialOrderFilters,
} from "@/services/specialBundlesAdmin";
import {
  formatGhs,
  bundleTypeLabel,
  type SpecialBundleOrder,
  type SpecialBundleType,
  type SpecialOrderStatus,
} from "@/services/specialBundles";

const STATUS_OPTIONS: Array<SpecialOrderStatus | "all"> = [
  "all",
  "pending",
  "processing",
  "delivered",
  "cancelled",
  "refunded",
];

export default function AdminSpecialOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<SpecialBundleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SpecialOrderStatus | "all">("all");
  const [refundOnly, setRefundOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const filters: SpecialOrderFilters = {
        status: statusFilter,
        search: search.trim() || undefined,
        refundRequestedOnly: refundOnly,
      };
      const data = await fetchAllSpecialOrders(filters);
      setOrders(data);
      setSelected(new Set());
    } catch (e) {
      toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, refundOnly, toast]);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, refundOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected((prev) => (prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));

  const selectedOrders = orders.filter((o) => selected.has(o.id));

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: label });
  };

  const bulkStatus = async (status: "processing" | "delivered") => {
    if (selected.size === 0) return;
    if (!confirm(`Mark ${selected.size} order(s) as ${status}?`)) return;
    setWorking(true);
    try {
      const { updated, errors } = await bulkSetSpecialOrderStatus(Array.from(selected), status);
      toast({
        title: `${updated} updated`,
        description: errors.length ? `${errors.length} failed` : `Marked as ${status}`,
        variant: errors.length ? "destructive" : "default",
      });
      fetchOrders();
    } finally {
      setWorking(false);
    }
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          title="Special Orders"
          description={`MTN special bundle orders · ${pendingCount} pending`}
        />
        <Button size="sm" variant="outline" onClick={fetchOrders} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <Card className="border-primary/30">
          <CardContent className="p-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-foreground px-1">{selected.size} selected</span>
            <Button size="sm" variant="outline" disabled={working} onClick={() => bulkStatus("processing")} className="gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Mark Processing
            </Button>
            <Button size="sm" variant="outline" disabled={working} onClick={() => bulkStatus("delivered")} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyText(formatOrdersForSupplierBulk(selectedOrders), `${selectedOrders.length} orders copied for supplier`)}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy for supplier
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="gap-1.5 ml-auto">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Search by Order ID or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-10 gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="glass-card rounded-2xl border-border/40">
          <CardContent className="p-3 flex flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Status</p>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors capitalize ${
                      statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Refund requests</p>
              <button
                onClick={() => setRefundOnly((v) => !v)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                  refundOnly ? "bg-amber-500 text-white border-amber-500" : "bg-background border-border hover:bg-muted/50"
                }`}
              >
                {refundOnly ? "Showing requested" : "Show requested only"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="glass-card rounded-2xl border-border/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-3 py-2.5 w-[40px]">
                  <Checkbox checked={orders.length > 0 && selected.size === orders.length} onCheckedChange={toggleSelectAll} />
                </th>
                {["Order ID", "Bundle", "Number", "Amount", "Tier", "Status", "Created", "", ""].map((h, i) => (
                  <th key={i} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-xs text-muted-foreground">No special orders found.</td>
                </tr>
              ) : (
                orders.map((o) => {
                  const snap = (o.package_snapshot || {}) as Record<string, unknown>;
                  const size = (snap.size_label as string) || "—";
                  const type = snap.bundle_type ? bundleTypeLabel(snap.bundle_type as SpecialBundleType) : "";
                  return (
                    <tr key={o.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5">
                        <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggleSelect(o.id)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link to={`/admin/special-orders/${o.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">
                          {o.public_order_id}
                        </Link>
                        {o.refund_requested && o.status === "pending" && (
                          <span className="block text-[9.5px] text-amber-600 font-semibold mt-0.5">refund requested</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12px]">
                        {size}
                        {type && <span className="text-muted-foreground"> · {type}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">{o.recipient_number}</td>
                      <td className="px-3 py-2.5 text-[12px] font-medium">{formatGhs(o.amount_charged)}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px] capitalize">{o.price_tier}</Badge>
                      </td>
                      <td className="px-3 py-2.5"><SpecialStatusBadge status={o.status} /></td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Copy for supplier"
                          onClick={() => copyText(formatOrderForSupplier(o), `${o.public_order_id} copied`)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link to={`/admin/special-orders/${o.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
