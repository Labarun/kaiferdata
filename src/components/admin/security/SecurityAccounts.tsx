/**
 * Security Center — Accounts & Access tab
 * Privileged accounts, locked accounts, recent signups + suspend/revoke controls.
 */
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  getPrivilegedAccounts, getLockedAccounts, getRecentSignups,
  setAccountStatus, revokeRole,
  type PrivilegedAccount, type FlaggedAccount,
} from "@/services/securityCenter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { AccountStatusBadge } from "@/components/shared/AccountStatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldCheck, UserX, UserPlus, Ban, RotateCcw } from "lucide-react";
import type { AppRole } from "@/services/auth";

type PendingAction =
  | { kind: "suspend"; userId: string; name: string }
  | { kind: "reactivate"; userId: string; name: string }
  | { kind: "revoke"; userId: string; name: string; role: AppRole };

export function SecurityAccounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [action, setAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const privileged = useQuery({ queryKey: ["security", "privileged"], queryFn: async () => (await getPrivilegedAccounts()).data });
  const locked = useQuery({ queryKey: ["security", "locked"], queryFn: async () => (await getLockedAccounts()).data });
  const signups = useQuery({ queryKey: ["security", "signups"], queryFn: async () => (await getRecentSignups()).data });

  const refresh = () => qc.invalidateQueries({ queryKey: ["security"] });

  async function confirm() {
    if (!action || !user) return;
    setBusy(true);
    let error: unknown = null;
    if (action.kind === "suspend") {
      ({ error } = await setAccountStatus(action.userId, "suspended", reason || "Security: suspended from Security Center", user.id));
    } else if (action.kind === "reactivate") {
      ({ error } = await setAccountStatus(action.userId, "active", reason || "Security: reactivated from Security Center", user.id));
    } else if (action.kind === "revoke") {
      ({ error } = await revokeRole(action.userId, action.role, user.id));
    }
    if (error) toast({ title: "Failed", description: String((error as Error).message), variant: "destructive" });
    else { toast({ title: "Done", description: `${action.kind} applied to ${action.name}.` }); await refresh(); }
    setBusy(false);
    setAction(null);
    setReason("");
  }

  return (
    <div className="space-y-6">
      {/* Privileged accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Privileged accounts (admin / staff)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {privileged.isLoading ? <Spinner /> :
            privileged.data?.length ? privileged.data.map((a: PrivilegedAccount) => (
              <div key={a.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.full_name || a.email}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.email} · last login {a.last_login_at ? formatDistanceToNow(new Date(a.last_login_at), { addSuffix: true }) : "never"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {a.roles.map((r) => <RoleBadge key={r} role={r} />)}
                  <AccountStatusBadge status={a.account_status} />
                  {a.user_id !== user?.id && (
                    <>
                      {a.roles.filter((r) => r === "admin" || r === "staff").map((r) => (
                        <Button key={r} size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setAction({ kind: "revoke", userId: a.user_id, name: a.full_name || a.email, role: r })}>
                          Revoke {r}
                        </Button>
                      ))}
                      {a.account_status === "active" ? (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                          onClick={() => setAction({ kind: "suspend", userId: a.user_id, name: a.full_name || a.email })}>
                          <Ban className="h-3 w-3 mr-1" /> Suspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => setAction({ kind: "reactivate", userId: a.user_id, name: a.full_name || a.email })}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Reactivate
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )) : <Empty>No admin or staff accounts found.</Empty>}
        </CardContent>
      </Card>

      {/* Locked accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" /> Locked accounts (suspended / disabled)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {locked.isLoading ? <Spinner /> :
            locked.data?.length ? locked.data.map((a: FlaggedAccount) => (
              <AccountRow key={a.user_id} a={a} self={a.user_id === user?.id}
                right={
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={() => setAction({ kind: "reactivate", userId: a.user_id, name: a.full_name || a.email })}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reactivate
                  </Button>
                } />
            )) : <Empty>Every account is currently active.</Empty>}
        </CardContent>
      </Card>

      {/* Recent signups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Recent signups (last 48h)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {signups.isLoading ? <Spinner /> :
            signups.data?.length ? signups.data.map((a: FlaggedAccount) => (
              <AccountRow key={a.user_id} a={a} self={a.user_id === user?.id}
                right={a.account_status === "active" && a.user_id !== user?.id ? (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                    onClick={() => setAction({ kind: "suspend", userId: a.user_id, name: a.full_name || a.email })}>
                    <Ban className="h-3 w-3 mr-1" /> Suspend
                  </Button>
                ) : null} />
            )) : <Empty>No new accounts in the last 48 hours.</Empty>}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={!!action} onOpenChange={(o) => { if (!o) { setAction(null); setReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action?.kind === "suspend" && `Suspend ${action.name}?`}
              {action?.kind === "reactivate" && `Reactivate ${action.name}?`}
              {action?.kind === "revoke" && `Revoke ${action.role} from ${action.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action?.kind === "suspend" && "They will be blocked from signing in and using the platform until reactivated."}
              {action?.kind === "reactivate" && "This restores normal access to the account."}
              {action?.kind === "revoke" && "This removes their elevated access immediately. They keep their base user account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {action?.kind !== "revoke" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (recorded in the audit log)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. suspected fraud / compromised" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirm(); }}
              disabled={busy}
              className={action?.kind === "reactivate" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AccountRow({ a, right, self }: { a: FlaggedAccount; right: ReactNode; self: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{a.full_name || a.email}{self && <span className="text-xs text-muted-foreground"> (you)</span>}</p>
        <p className="text-xs text-muted-foreground truncate">
          {a.email} · joined {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <AccountStatusBadge status={a.account_status} />
        {right}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{children}</p>;
}
