/**
 * Staff Orders Page — Read-only search and filter, no admin actions
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Search, Loader2, ChevronRight, Filter, X } from "lucide-react";

const STATUS_OPTIONS = ["all", "paid", "queued", "processing", "delivered", "failed", "cancelled"];
const NETWORK_OPTIONS = ["all", "MTN", "Telecel", "AirtelTigo"];

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") query = query.eq("status", statusFilter as "paid" | "queued" | "processing" | "delivered" | "failed" | "cancelled" | "refunded");
    if (networkFilter !== "all") query = query.eq("network", networkFilter);
    if (search.trim()) {
      query = query.or(`public_order_id.ilike.%${search.trim()}%,beneficiary_number.ilike.%${search.trim()}%`);
    }

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  }, [search, statusFilter, networkFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Orders" description="Search and inspect orders (read-only)" />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input placeholder="Search by Order ID or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-sm" onKeyDown={(e) => e.key === "Enter" && fetchOrders()} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-10 gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Filters
          {(statusFilter !== "all" || networkFilter !== "all") && (
            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
              {(statusFilter !== "all" ? 1 : 0) + (networkFilter !== "all" ? 1 : 0)}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Status</p>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted/50"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Network</p>
              <div className="flex flex-wrap gap-1">
                {NETWORK_OPTIONS.map((n) => (
                  <button key={n} onClick={() => setNetworkFilter(n)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${networkFilter === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted/50"}`}>{n}</button>
                ))}
              </div>
            </div>
            {(statusFilter !== "all" || networkFilter !== "all") && (
              <button onClick={() => { setStatusFilter("all"); setNetworkFilter("all"); }} className="flex items-center gap-1 text-[11px] text-destructive hover:underline ml-auto self-end">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Order ID", "Network", "Bundle", "Amount", "Phone", "Status", "Source", "Created", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-xs text-muted-foreground">No orders found.</td></tr>
              ) : (
                orders.map((o) => {
                  const snap = (o.bundle_snapshot || {}) as Record<string, unknown>;
                  return (
                    <tr key={o.id as string} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5">
                        <Link to={`/staff/orders/${o.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">{o.public_order_id as string}</Link>
                      </td>
                      <td className="px-3 py-2.5 text-[12px]">{o.network as string}</td>
                      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{snap.volume as string}</td>
                      <td className="px-3 py-2.5 text-[12px] font-medium">GH₵{Number(o.amount_charged).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">{o.beneficiary_number as string}</td>
                      <td className="px-3 py-2.5"><OperationsBadge status={o.status as string} /></td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{o.actor_type as string}</td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">{new Date(o.created_at as string).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">
                        <Link to={`/staff/orders/${o.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></Link>
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
