/**
 * Admin Transactions Page — Payment records with search and filters
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

const STATUS_OPTIONS = ["all", "pending", "verified", "failed", "reversed"];

export default function AdminTransactionsPage() {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("payment_records")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") query = query.eq("status", statusFilter as "pending" | "verified" | "failed" | "reversed");
    if (search.trim()) {
      query = query.or(
        `provider_reference.ilike.%${search.trim()}%,internal_reference.ilike.%${search.trim()}%`
      );
    }

    const { data } = await query;
    setRecords(data || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Transactions" description="Payment records and verification history" />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Search by Paystack ref or internal ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
            onKeyDown={(e) => e.key === "Enter" && fetchRecords()}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-10 gap-1.5">
          <Filter className="h-3.5 w-3.5" /> Filters
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Status</p>
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
              {statusFilter !== "all" && (
                <button onClick={() => setStatusFilter("all")} className="text-[11px] text-destructive hover:underline ml-2 flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Internal Ref", "Provider Ref", "Amount", "Provider", "Status", "Email", "Verified", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">No records found.</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id as string} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link to={`/admin/transactions/${r.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">
                        {r.internal_reference as string}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{r.provider_reference as string}</td>
                    <td className="px-3 py-2.5 text-[12px] font-medium">GH₵{Number(r.amount).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{r.provider as string}</td>
                    <td className="px-3 py-2.5"><OperationsBadge status={r.status as string} /></td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground truncate max-w-[120px]">{r.customer_email as string || "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      {r.verified_at ? new Date(r.verified_at as string).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={`/admin/transactions/${r.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
