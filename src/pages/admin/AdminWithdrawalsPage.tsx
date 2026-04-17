/**
 * Admin Withdrawals Review Queue
 *
 * Lists all agent withdrawal requests; admins can approve (mark paid)
 * or reject (auto-refunds wallet via SECURITY DEFINER RPC).
 * Funds are debited at request time, so approval = "marked paid out".
 */
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/shared/LoadingState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  approveWithdrawal,
  listAllWithdrawals,
  rejectWithdrawal,
  type WithdrawalRequest,
  type WithdrawalStatus,
} from "@/services/agentWithdrawals";
import { Search, Phone, User as UserIcon, Calendar, RefreshCw } from "lucide-react";

type TabKey = WithdrawalStatus | "all";

const STATUS_BADGE: Record<WithdrawalStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  paid: { label: "Paid", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const fmtMoney = (n: number) =>
  `GH₵${Number(n).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (s: string) => new Date(s).toLocaleString();

export default function AdminWithdrawalsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionRow, setActionRow] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await listAllWithdrawals(tab === "all" ? undefined : tab);
    if (error) {
      toast.error(error.message || "Failed to load withdrawals");
    } else {
      setRows(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.momo_number.toLowerCase().includes(q) ||
        r.momo_name.toLowerCase().includes(q) ||
        r.momo_network.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openAction = (row: WithdrawalRequest, type: "approve" | "reject") => {
    setActionRow(row);
    setActionType(type);
    setNote("");
  };
  const closeAction = () => {
    setActionRow(null);
    setActionType(null);
    setNote("");
  };

  const submitAction = async () => {
    if (!actionRow || !actionType || !user) return;
    setBusy(true);
    try {
      const fn = actionType === "approve" ? approveWithdrawal : rejectWithdrawal;
      const { error } = await fn(actionRow.id, user.id, note.trim() || undefined);
      if (error) throw error;
      toast.success(
        actionType === "approve"
          ? "Withdrawal marked as paid"
          : "Withdrawal rejected — funds refunded",
      );
      closeAction();
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (!user || user.role !== "admin") return <PageLoader />;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Withdrawals"
        description="Review and process agent MoMo withdrawal requests."
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex-1">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 sm:max-w-xs flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search number, name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={refresh} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : visibleRows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No withdrawals in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleRows.map((row) => {
            const meta = STATUS_BADGE[row.status];
            return (
              <Card key={row.id} className="hover:border-primary/40 transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold tabular-nums">
                          {fmtMoney(row.amount)}
                        </span>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {row.momo_network}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="h-3 w-3" /> {row.momo_name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {row.momo_number}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {fmtDate(row.requested_at)}
                        </span>
                      </div>
                      {row.admin_note && (
                        <p className="text-xs text-muted-foreground italic">
                          Note: {row.admin_note}
                        </p>
                      )}
                    </div>

                    {row.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAction(row, "reject")}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openAction(row, "approve")}
                        >
                          Mark paid
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!actionRow} onOpenChange={(o) => !o && closeAction()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Mark withdrawal as paid?" : "Reject withdrawal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve" ? (
                <>
                  Confirm you have sent <strong>{actionRow ? fmtMoney(actionRow.amount) : ""}</strong>{" "}
                  to {actionRow?.momo_network} {actionRow?.momo_number} ({actionRow?.momo_name}). Funds
                  were already debited from the agent's wallet at request time.
                </>
              ) : (
                <>
                  Reject this <strong>{actionRow ? fmtMoney(actionRow.amount) : ""}</strong> request.
                  The amount will be automatically refunded to the agent's wallet.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional note (visible to agent)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitAction} disabled={busy}>
              {busy ? "Processing…" : actionType === "approve" ? "Mark paid" : "Reject & refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
