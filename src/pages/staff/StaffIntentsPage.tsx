/**
 * Staff Purchase Intents Page — Read-only visibility
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Search, Loader2, ChevronRight } from "lucide-react";

export default function StaffIntentsPage() {
  const [intents, setIntents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchIntents = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("purchase_intents").select("*").order("created_at", { ascending: false }).limit(100);
    if (search.trim()) {
      query = query.or(`intent_reference.ilike.%${search.trim()}%,phone_number.ilike.%${search.trim()}%`);
    }
    const { data } = await query;
    setIntents(data || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchIntents(); }, [fetchIntents]);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Purchase Intents" description="Inspect checkout intents (read-only)" />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input placeholder="Search by reference or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 text-sm" onKeyDown={(e) => e.key === "Enter" && fetchIntents()} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Reference", "Network", "Amount", "Phone", "Status", "Type", "Created", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : intents.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">No intents found.</td></tr>
              ) : (
                intents.map((i) => (
                  <tr key={i.id as string} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link to={`/staff/intents/${i.id}`} className="font-mono text-[12px] font-medium text-primary hover:underline">{i.intent_reference as string}</Link>
                    </td>
                    <td className="px-3 py-2.5 text-[12px]">{i.network as string}</td>
                    <td className="px-3 py-2.5 text-[12px] font-medium">GH₵{Number(i.amount_expected).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">{i.phone_number as string}</td>
                    <td className="px-3 py-2.5"><OperationsBadge status={i.status as string} /></td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{i.intent_type as string}</td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">{new Date(i.created_at as string).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5"><Link to={`/staff/intents/${i.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></Link></td>
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
