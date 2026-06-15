/**
 * Security Center — Activity tab
 * Filterable audit-log feed with a detail dialog.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { getAuditLog, isSensitiveAction, type AuditEntry } from "@/services/securityCenter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, ShieldAlert } from "lucide-react";

const RANGES = [
  { label: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 30 days", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "All time", ms: 0 },
];

export function SecurityActivityLog() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [rangeIdx, setRangeIdx] = useState(1);
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  const { data = [], isLoading, isFetching } = useQuery({
    queryKey: ["security", "audit", search, role, rangeIdx, sensitiveOnly],
    queryFn: async () =>
      (await getAuditLog({
        search,
        role,
        sensitiveOnly,
        sinceMs: RANGES[rangeIdx].ms || undefined,
        limit: 300,
      })).data,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action, target type or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(rangeIdx)} onValueChange={(v) => setRangeIdx(Number(v))}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r, i) => <SelectItem key={r.label} value={String(i)}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant={sensitiveOnly ? "default" : "outline"}
          onClick={() => setSensitiveOnly((v) => !v)}
          className="gap-2 shrink-0"
        >
          <ShieldAlert className="h-4 w-4" /> Sensitive only
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No matching activity.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden md:table-cell">Target</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((e) => {
                    const sensitive = isSensitiveAction(e.action);
                    return (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => setDetail(e)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sensitive ? "bg-destructive" : "bg-muted-foreground/40"}`} />
                            <span className="font-medium text-sm">{e.action.replace(/_/g, " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {e.target_type ? `${e.target_type}${e.target_id ? ` · ${e.target_id.slice(0, 12)}` : ""}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">{e.actor_role ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        {isFetching ? "Refreshing…" : `${data.length} entr${data.length === 1 ? "y" : "ies"} shown (max 300).`}
      </p>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">{detail?.action.replace(/_/g, " ")}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Row label="When" value={format(new Date(detail.created_at), "PPpp")} />
              <Row label="Actor role" value={detail.actor_role ?? "—"} />
              <Row label="Actor id" value={detail.actor_id ?? "—"} mono />
              <Row label="Target type" value={detail.target_type ?? "—"} />
              <Row label="Target id" value={detail.target_id ?? "—"} mono />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Metadata</p>
                <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-60">
                  {JSON.stringify(detail.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
