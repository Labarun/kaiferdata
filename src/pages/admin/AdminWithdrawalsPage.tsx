/**
 * Admin Withdrawals — review & process agent MoMo payouts.
 * Pagination + filters, full payout detail with per-agent history & fraud
 * signals, SLA highlighting, single + bulk approve/reject with notes.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageLoader } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminStatStrip, type AdminStat } from "@/components/admin/AdminStatStrip";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/admin/ResponsiveTable";
import { DataPagination } from "@/components/admin/DataPagination";
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import {
  approveWithdrawal, rejectWithdrawal,
  type WithdrawalRequest, type WithdrawalStatus,
} from "@/services/agentWithdrawals";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Banknote, Clock, CheckCircle2, XCircle, AlertTriangle, Wallet, Phone, User as UserIcon, ListChecks,
} from "lucide-react";

const STATUSES: (WithdrawalStatus | "all")[] = ["pending", "paid", "rejected", "approved", "all"];
const fmtMoney = (n: number) => `GH₵${Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoursSince = (s: string) => (Date.now() - new Date(s).getTime()) / 36e5;
const timeAgo = (s: string) => {
  const h = hoursSince(s);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
const walletLabel = (k: string) => (k === "agent_earnings" ? "Earnings" : "Personal");
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary", approved: "default", paid: "default", rejected: "destructive",
};

const db = supabase as any;

export default function AdminWithdrawalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const pg = useAdminPagination(30);
  const [rows, setRows] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WithdrawalStatus | "all">("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ pendingCount: 0, pendingValue: 0, paid: 0, rejected: 0, oldestH: 0 });

  const [action, setAction] = useState<{ ids: string[]; type: "approve" | "reject" } | null>(null);
  const [detail, setDetail] = useState<WithdrawalRequest | null>(null);

  // stats (once per reload)
  useEffect(() => {
    (async () => {
      const C = { count: "exact" as const, head: true };
      const [paid, rejected, pend] = await Promise.all([
        db.from("withdrawal_requests").select("id", C).eq("status", "paid"),
        db.from("withdrawal_requests").select("id", C).eq("status", "rejected"),
        db.from("withdrawal_requests").select("amount, requested_at").eq("status", "pending").limit(1000),
      ]);
      const pendingRows: { amount: number; requested_at: string }[] = pend.data || [];
      const oldest = pendingRows.reduce((m, r) => Math.max(m, hoursSince(r.requested_at)), 0);
      setStats({
        pendingCount: pendingRows.length,
        pendingValue: pendingRows.reduce((s, r) => s + Number(r.amount || 0), 0),
        paid: paid.count || 0,
        rejected: rejected.count || 0,
        oldestH: oldest,
      });
    })();
  }, [reloadKey]);

  // list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = db.from("withdrawal_requests").select("*", { count: "exact" })
        .order("requested_at", { ascending: false }).range(pg.from, pg.to);
      if (status !== "all") q = q.eq("status", status);
      const term = search.trim().replace(/[%,]/g, "");
      if (term) q = q.or(`momo_number.ilike.%${term}%,momo_name.ilike.%${term}%`);
      const { data, count } = await q;
      if (cancelled) return;
      setRows((data || []) as WithdrawalRequest[]);
      pg.setTotal(count || 0);
      setSelected(new Set());
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg.page, pg.pageSize, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);
  const applyFilters = useCallback(() => { pg.setPage(0); setReloadKey((k) => k + 1); }, [pg]);
  const setStatusChip = (v: string) => { setStatus(v as any); pg.setPage(0); setReloadKey((k) => k + 1); };

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((p) => (p.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const runAction = async (note: string) => {
    if (!action || !user) return;
    const ids = action.ids.filter((id) => rows.find((r) => r.id === id)?.status === "pending");
    let ok = 0, fail = 0;
    for (const id of ids) {
      const fn = action.type === "approve" ? approveWithdrawal : rejectWithdrawal;
      const { error } = await fn(id, user.id, note || undefined);
      error ? fail++ : ok++;
    }
    toast({
      title: `${ok} ${action.type === "approve" ? "marked paid" : "rejected"}`,
      description: fail ? `${fail} failed` : action.type === "reject" ? "Funds refunded to wallet" : undefined,
      variant: fail ? "destructive" : "default",
    });
    setDetail(null);
    refresh();
  };

  if (!user || user.role !== "admin") return <PageLoader />;

  const pendingSelected = Array.from(selected).filter((id) => rows.find((r) => r.id === id)?.status === "pending");

  const statStrip: AdminStat[] = [
    { label: "Pending", value: stats.pendingCount, icon: Clock, tone: stats.pendingCount > 0 ? "warning" : "default" },
    { label: "Pending Value", value: fmtMoney(stats.pendingValue), icon: Banknote, tone: "primary" },
    { label: "Oldest Pending", value: stats.oldestH >= 1 ? `${Math.round(stats.oldestH)}h` : "—", icon: AlertTriangle, tone: stats.oldestH >= 24 ? "destructive" : stats.oldestH >= 12 ? "warning" : "default" },
    { label: "Paid", value: stats.paid, icon: CheckCircle2, tone: "success" },
  ];

  const columns: ResponsiveColumn<WithdrawalRequest>[] = [
    { key: "amount", header: "Amount", mobile: "title", cell: (r) => <span className="font-semibold tabular-nums">{fmtMoney(r.amount)}</span> },
    { key: "payee", header: "Payee", mobile: "subtitle", cell: (r) => <span className="text-muted-foreground">{r.momo_name} · {r.momo_network}</span> },
    {
      key: "status", header: "Status", mobile: "trailing",
      cell: (r) => {
        const stale = r.status === "pending" && hoursSince(r.requested_at) >= 12;
        return (
          <div className="flex flex-col items-end gap-0.5">
            <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge>
            {stale && <span className={`text-[9.5px] font-semibold ${hoursSince(r.requested_at) >= 24 ? "text-destructive" : "text-amber-600"}`}>⏱ {timeAgo(r.requested_at)}</span>}
          </div>
        );
      },
    },
    { key: "number", header: "MoMo Number", mobile: "row", cell: (r) => <span className="font-mono text-[12px] text-muted-foreground">{r.momo_number}</span> },
    { key: "wallet", header: "Wallet", mobile: "row", cell: (r) => <span className="text-[11px] text-muted-foreground">{walletLabel(r.wallet_kind)}</span> },
    { key: "requested", header: "Requested", mobile: "row", cell: (r) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(r.requested_at)}</span> },
  ];

  const rowActions = (r: WithdrawalRequest) =>
    r.status === "pending" ? (
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={(e) => { e.stopPropagation(); setAction({ ids: [r.id], type: "reject" }); }}>Reject</Button>
        <Button size="sm" className="h-7 text-[11px]" onClick={(e) => { e.stopPropagation(); setAction({ ids: [r.id], type: "approve" }); }}>Mark paid</Button>
      </div>
    ) : (
      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={(e) => { e.stopPropagation(); setDetail(r); }}>Details</Button>
    );

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Withdrawals" description="Review & process agent MoMo payouts" actions={
        <Button size="sm" variant="outline" onClick={refresh} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
      } />

      <AdminStatStrip stats={statStrip} />

      {pendingSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <span className="text-[12px] font-medium px-1">{pendingSelected.length} pending selected</span>
          <Button size="sm" className="gap-1.5" onClick={() => setAction({ ids: pendingSelected, type: "approve" })}>
            <ListChecks className="h-3.5 w-3.5" /> Mark all paid
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAction({ ids: pendingSelected, type: "reject" })}>
            Reject all
          </Button>
        </div>
      )}

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        onSubmit={applyFilters}
        placeholder="Search MoMo number or name… (Enter)"
        chips={[{ label: "Status", value: status, options: STATUSES.map((s) => ({ label: s, value: s })), onChange: setStatusChip }]}
      />

      <ResponsiveTable
        rows={rows}
        columns={columns}
        keyFn={(r) => r.id}
        loading={loading}
        emptyText="No withdrawals in this view."
        onRowClick={(r) => setDetail(r)}
        selectedIds={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        actions={rowActions}
      />

      <DataPagination pagination={pg} rowsOnPage={rows.length} />

      {/* Detail + per-agent history + fraud signals */}
      <WithdrawalDetailDialog
        row={detail}
        onClose={() => setDetail(null)}
        onApprove={() => detail && setAction({ ids: [detail.id], type: "approve" })}
        onReject={() => detail && setAction({ ids: [detail.id], type: "reject" })}
      />

      {/* Approve / reject confirm (single + bulk) */}
      <ConfirmActionDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={action?.type === "approve" ? `Mark ${action?.ids.length} withdrawal(s) as paid?` : `Reject ${action?.ids.length} withdrawal(s)?`}
        description={
          action?.type === "approve"
            ? "Confirm you have sent the payout(s) to the agent's MoMo. Funds were already debited at request time."
            : "The amount(s) will be automatically refunded to the agent's wallet."
        }
        variant={action?.type === "reject" ? "destructive" : "default"}
        confirmLabel={action?.type === "approve" ? "Mark paid" : "Reject & refund"}
        withNote
        noteLabel="Note (visible to agent)"
        notePlaceholder="Optional note…"
        onConfirm={runAction}
      />
    </div>
  );
}

function WithdrawalDetailDialog({
  row, onClose, onApprove, onReject,
}: {
  row: WithdrawalRequest | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [numberUses, setNumberUses] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [byUser, byNumber] = await Promise.all([
        db.from("withdrawal_requests").select("*").eq("user_id", row.user_id).order("requested_at", { ascending: false }).limit(20),
        db.from("withdrawal_requests").select("user_id, amount, status").eq("momo_number", row.momo_number).limit(100),
      ]);
      if (cancelled) return;
      setHistory((byUser.data || []) as WithdrawalRequest[]);
      setNumberUses((byNumber.data || []) as WithdrawalRequest[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [row]);

  if (!row) return null;

  const distinctAccounts = new Set(numberUses.map((u) => u.user_id)).size;
  const last24h = history.filter((h) => hoursSince(h.requested_at) <= 24).length;
  const paidHist = history.filter((h) => h.status === "paid");
  const avg = paidHist.length ? paidHist.reduce((s, h) => s + Number(h.amount), 0) / paidHist.length : 0;
  const flags: string[] = [];
  if (distinctAccounts > 1) flags.push(`This MoMo number is used by ${distinctAccounts} different accounts`);
  if (last24h >= 3) flags.push(`${last24h} requests from this agent in the last 24h`);
  if (avg > 0 && row.amount > avg * 2.5) flags.push(`Amount is ${(row.amount / avg).toFixed(1)}× this agent's usual payout`);
  if (row.status === "pending" && hoursSince(row.requested_at) >= 24) flags.push(`Pending for ${Math.round(hoursSince(row.requested_at))}h — past SLA`);

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" /> {fmtMoney(row.amount)} payout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Payout details */}
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5 text-[13px]">
            <Row icon={UserIcon} label="Name" value={row.momo_name} />
            <Row icon={Phone} label="Number" value={row.momo_number} mono />
            <Row icon={Banknote} label="Network" value={row.momo_network} />
            <Row icon={Wallet} label="From wallet" value={walletLabel(row.wallet_kind)} />
            <Row icon={Clock} label="Requested" value={`${timeAgo(row.requested_at)} · ${new Date(row.requested_at).toLocaleString()}`} />
            <Row icon={CheckCircle2} label="Status" value={row.status} />
            {row.admin_note && <Row icon={AlertTriangle} label="Note" value={row.admin_note} />}
          </div>

          {/* Risk flags */}
          {flags.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
              <p className="text-[12px] font-bold text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Review signals</p>
              {flags.map((f, i) => <p key={i} className="text-[12px] text-foreground">• {f}</p>)}
            </div>
          )}

          {/* Per-agent history */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1.5">
              This agent's withdrawals {loading ? "" : `(${history.length})`}
            </p>
            <div className="rounded-xl border divide-y divide-border/40 max-h-48 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-[12px] text-muted-foreground p-3">No history.</p>
              ) : history.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 text-[12px]">
                  <span className="font-medium tabular-nums">{fmtMoney(h.amount)}</span>
                  <span className="text-muted-foreground">{timeAgo(h.requested_at)}</span>
                  <Badge variant={STATUS_VARIANT[h.status]} className="capitalize text-[10px]">{h.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {row.status === "pending" && (
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onReject}>Reject & refund</Button>
              <Button className="flex-1" onClick={onApprove}>Mark paid</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: typeof Clock; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className={`font-medium text-foreground text-right capitalize ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
    </div>
  );
}
