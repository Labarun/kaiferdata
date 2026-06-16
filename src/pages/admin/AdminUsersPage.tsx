/**
 * Admin User Management — search, role mgmt, wallet adjust, status, notes.
 * All mutations go through SECURITY DEFINER RPCs that write audit logs.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Shield, Users as UsersIcon, UserCheck, Headset } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { AdminStatStrip, type AdminStat } from "@/components/admin/AdminStatStrip";
import { DataPagination } from "@/components/admin/DataPagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import {
  listUsers, getUserRoles, setUserRole,
  adminCreditWallet, adminDebitWallet, adminSetAccountStatus,
  listUserNotes, addUserNote, getUserWalletTxns,
  type AdminUserRow, type AdminUserNote,
} from "@/services/adminUsers";
import type { AppRole, AccountStatus } from "@/services/auth";

const ALL_ROLES: AppRole[] = ["user", "agent", "staff", "admin"];
const ALL_STATUSES: AccountStatus[] = ["active", "suspended", "pending", "disabled"];

export default function AdminUsersPage() {
  const { user: admin } = useAuth();
  const pg = useAdminPagination(30);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">("all");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [counts, setCounts] = useState({ total: 0, agents: 0, staff: 0, admins: 0 });

  useEffect(() => {
    (async () => {
      const C = { count: "exact" as const, head: true };
      const [t, a, s, ad] = await Promise.all([
        supabase.from("profiles").select("id", C),
        supabase.from("user_roles").select("user_id", C).eq("role", "agent"),
        supabase.from("user_roles").select("user_id", C).eq("role", "staff"),
        supabase.from("user_roles").select("user_id", C).eq("role", "admin"),
      ]);
      setCounts({ total: t.count || 0, agents: a.count || 0, staff: s.count || 0, admins: ad.count || 0 });
    })();
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, count } = await listUsers({ search, role: roleFilter, status: statusFilter, page: pg.page, pageSize: pg.pageSize });
      if (cancelled) return;
      setRows(data);
      pg.setTotal(count || 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg.page, pg.pageSize, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);
  const applyFilters = () => { pg.setPage(0); setReloadKey((k) => k + 1); };

  const statStrip: AdminStat[] = [
    { label: "Total Users", value: counts.total.toLocaleString(), icon: UsersIcon, tone: "primary" },
    { label: "Agents", value: counts.agents.toLocaleString(), icon: UserCheck, tone: "success" },
    { label: "Staff", value: counts.staff.toLocaleString(), icon: Headset },
    { label: "Admins", value: counts.admins.toLocaleString(), icon: Shield, tone: "warning" },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Users" description="Manage accounts, roles, wallets & notes" />

      <AdminStatStrip stats={statStrip} />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Name, email, username, phone…" className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as AppRole | "all"); applyFilters(); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ALL_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as AccountStatus | "all"); applyFilters(); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={applyFilters} variant="secondary">Search</Button>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No users found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.user_id} className="hover:shadow-md transition cursor-pointer" onClick={() => setSelected(r)}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{r.full_name || r.username || r.email}</p>
                    <RoleBadge role={r.role} />
                    <Badge variant="outline" className="text-[10px] capitalize">{r.account_status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.email} · {r.phone || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Wallet</p>
                  <p className="text-sm font-semibold tabular-nums">GH₵ {r.wallet_balance.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DataPagination pagination={pg} rowsOnPage={rows.length} />

      {selected && admin && (
        <UserDetailDialog
          row={selected} adminId={admin.id}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
function UserDetailDialog({ row, adminId, onClose, onChanged }: {
  row: AdminUserRow; adminId: string; onClose: () => void; onChanged: () => void;
}) {
  const { toast } = useToast();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [notes, setNotes] = useState<AdminUserNote[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [confirmOp, setConfirmOp] = useState<null | {
    title: string; description: string; run: () => Promise<void>;
  }>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [r, n, t] = await Promise.all([
      getUserRoles(row.user_id),
      listUserNotes(row.user_id),
      getUserWalletTxns(row.user_id, 15),
    ]);
    setRoles(r.data ?? []);
    setNotes(n.data ?? []);
    setTxns(t.data ?? []);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [row.user_id]);

  const runConfirmed = async () => {
    if (!confirmOp) return;
    setBusy(true);
    try { await confirmOp.run(); onChanged(); await refresh(); }
    finally { setBusy(false); setConfirmOp(null); }
  };

  const toggleRole = (role: AppRole) => {
    const has = roles.includes(role);
    setConfirmOp({
      title: has ? `Revoke ${role}?` : `Grant ${role}?`,
      description: has
        ? `This removes the ${role} role from ${row.full_name || row.email}.`
        : `This grants the ${role} role to ${row.full_name || row.email}.`,
      run: async () => {
        const { error } = await setUserRole(row.user_id, role, adminId, !has);
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
        else toast({ title: has ? "Role revoked" : "Role granted" });
      },
    });
  };

  const doCredit = () => {
    const amt = Number(adjAmount);
    if (!amt || amt <= 0) return;
    setConfirmOp({
      title: `Credit GH₵ ${amt.toFixed(2)}?`,
      description: `Adds funds to this user's wallet. Reason: ${adjReason || "—"}`,
      run: async () => {
        const { error } = await adminCreditWallet(row.user_id, amt, adjReason, adminId);
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
        else { toast({ title: "Wallet credited" }); setAdjAmount(""); setAdjReason(""); }
      },
    });
  };
  const doDebit = () => {
    const amt = Number(adjAmount);
    if (!amt || amt <= 0) return;
    setConfirmOp({
      title: `Debit GH₵ ${amt.toFixed(2)}?`,
      description: `Removes funds from this user's wallet. Reason: ${adjReason || "—"}`,
      run: async () => {
        const { error } = await adminDebitWallet(row.user_id, amt, adjReason, adminId);
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
        else { toast({ title: "Wallet debited" }); setAdjAmount(""); setAdjReason(""); }
      },
    });
  };
  const setStatus = (s: AccountStatus) => {
    setConfirmOp({
      title: `Set status to ${s}?`,
      description: `Reason: ${statusReason || "—"}`,
      run: async () => {
        const { error } = await adminSetAccountStatus(row.user_id, s, statusReason, adminId);
        if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
        else { toast({ title: `Status updated to ${s}` }); setStatusReason(""); }
      },
    });
  };
  const submitNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await addUserNote(row.user_id, adminId, newNote.trim());
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setNewNote(""); refresh(); toast({ title: "Note added" }); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row.full_name || row.email}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-3">
            <Field label="Email" value={row.email} />
            <Field label="Username" value={row.username || "—"} />
            <Field label="Phone" value={row.phone || "—"} />
            <Field label="Joined" value={new Date(row.created_at).toLocaleString()} />
            <Field label="Last login" value={row.last_login_at ? new Date(row.last_login_at).toLocaleString() : "—"} />
            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs">Account status</Label>
              <Input value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="Reason (optional)" />
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => (
                  <Button key={s} size="sm" variant={row.account_status === s ? "default" : "outline"}
                    onClick={() => setStatus(s)} className="capitalize">{s}</Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-3 mt-3">
            <div className="rounded-xl glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Current balance</p>
              <p className="text-2xl font-bold tabular-nums">GH₵ {row.wallet_balance.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Input type="number" inputMode="decimal" value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)} placeholder="Amount (GH₵)" />
              <Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Reason" />
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={doCredit} disabled={!adjAmount || Number(adjAmount) <= 0}>Credit</Button>
                <Button onClick={doDebit} variant="destructive" disabled={!adjAmount || Number(adjAmount) <= 0}>Debit</Button>
              </div>
            </div>
            <div className="pt-3 border-t">
              <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70 mb-2">Recent transactions</p>
              {txns.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No transactions</p>
              ) : (
                <div className="space-y-1.5">
                  {txns.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md hover:bg-muted/40">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t.narration || t.transaction_type}</p>
                        <p className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`tabular-nums font-semibold ${t.direction === "inflow" ? "text-success" : "text-destructive"}`}>
                        {t.direction === "inflow" ? "+" : "−"}GH₵ {Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Click to grant/revoke. Granting admin gives full system access.
            </p>
            <div className="space-y-2">
              {ALL_ROLES.map((r) => {
                const has = roles.includes(r);
                return (
                  <div key={r} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={r} />
                      {has && <Badge variant="secondary" className="text-[10px]">Granted</Badge>}
                    </div>
                    <Button size="sm" variant={has ? "destructive" : "default"} onClick={() => toggleRole(r)}>
                      {has ? "Revoke" : "Grant"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 mt-3">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Internal admin note…" rows={3} />
            <Button onClick={submitNote} disabled={!newNote.trim()} size="sm">Add note</Button>
            <div className="pt-3 border-t space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No notes yet</p>
              ) : notes.map((n) => (
                <div key={n.id} className="rounded-lg border p-2.5 text-xs">
                  <p>{n.note}</p>
                  <p className="text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {confirmOp && (
        <AlertDialog open onOpenChange={(o) => !o && setConfirmOp(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmOp.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmOp.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={runConfirmed} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium truncate ml-3">{value}</span>
    </div>
  );
}
