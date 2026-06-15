/**
 * Security Center — Overview tab
 * Threat posture banner + KPI grid + recent sensitive activity.
 */
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { getOverview, getAuditLog, isSensitiveAction } from "@/services/securityCenter";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, ShieldAlert, ShieldX, Banknote, UserX, CreditCard,
  Server, Activity, UserPlus, ArrowRight,
} from "lucide-react";

const cedi = (n: number) => `₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SecurityOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: o } = useQuery({
    queryKey: ["security", "overview"],
    queryFn: getOverview,
    refetchInterval: 60_000,
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["security", "recent-sensitive"],
    queryFn: async () => (await getAuditLog({ sensitiveOnly: true, limit: 12 })).data,
    refetchInterval: 60_000,
  });

  // Posture: lockdown if maintenance/buy disabled; elevated if threats present.
  const threats =
    (o?.pendingWithdrawals ?? 0) +
    (o?.failedPayments24h ?? 0) +
    (o?.supplierFailures24h ?? 0) +
    (o?.lockedAccounts ?? 0);
  const posture = o?.maintenanceOn || (o?.buyDisabledCount ?? 0) > 0
    ? { label: "Lockdown active", tone: "destructive" as const, icon: ShieldX, blurb: "Buying or deposits are currently disabled platform-wide." }
    : threats > 8
    ? { label: "Elevated", tone: "warning" as const, icon: ShieldAlert, blurb: "Several signals need a look — review the tabs below." }
    : { label: "Normal", tone: "success" as const, icon: ShieldCheck, blurb: "No active lockdown and no unusual spikes in the last 24h." };

  const toneRing: Record<string, string> = {
    destructive: "border-destructive/40 bg-destructive/5",
    warning: "border-amber-500/40 bg-amber-500/5",
    success: "border-success/30 bg-success/5",
  };
  const toneText: Record<string, string> = {
    destructive: "text-destructive",
    warning: "text-amber-500",
    success: "text-success",
  };

  return (
    <div className="space-y-6">
      {/* Posture banner */}
      <Card className={toneRing[posture.tone]}>
        <CardContent className="flex items-center gap-4 py-5">
          <div className={`rounded-xl p-3 ${toneRing[posture.tone]}`}>
            <posture.icon className={`h-7 w-7 ${toneText[posture.tone]}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Security posture</p>
            <p className={`text-xl font-bold ${toneText[posture.tone]}`}>{posture.label}</p>
            <p className="text-sm text-muted-foreground">{posture.blurb}</p>
          </div>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <button onClick={() => onNavigate("money")} className="text-left">
          <StatCard
            title="Pending withdrawals"
            value={o?.pendingWithdrawals ?? 0}
            description={o ? cedi(o.pendingWithdrawalAmount) + " queued" : "—"}
            icon={Banknote}
            variant={(o?.pendingWithdrawals ?? 0) > 0 ? "warning" : "default"}
            size="sm"
          />
        </button>
        <button onClick={() => onNavigate("accounts")} className="text-left">
          <StatCard
            title="Locked accounts"
            value={o?.lockedAccounts ?? 0}
            description="Suspended or disabled"
            icon={UserX}
            variant={(o?.lockedAccounts ?? 0) > 0 ? "destructive" : "default"}
            size="sm"
          />
        </button>
        <button onClick={() => onNavigate("money")} className="text-left">
          <StatCard
            title="Failed payments 24h"
            value={o?.failedPayments24h ?? 0}
            description="failed / reversed"
            icon={CreditCard}
            variant={(o?.failedPayments24h ?? 0) > 5 ? "warning" : "default"}
            size="sm"
          />
        </button>
        <button onClick={() => onNavigate("money")} className="text-left">
          <StatCard
            title="Supplier failures 24h"
            value={o?.supplierFailures24h ?? 0}
            description="delivery errors"
            icon={Server}
            variant={(o?.supplierFailures24h ?? 0) > 5 ? "warning" : "default"}
            size="sm"
          />
        </button>
        <button onClick={() => onNavigate("activity")} className="text-left">
          <StatCard
            title="Sensitive actions 24h"
            value={o?.sensitiveActions24h ?? 0}
            description="money / roles / settings"
            icon={Activity}
            variant="primary"
            size="sm"
          />
        </button>
        <button onClick={() => onNavigate("accounts")} className="text-left">
          <StatCard
            title="New signups 24h"
            value={o?.newSignups24h ?? 0}
            description="abuse / velocity"
            icon={UserPlus}
            variant={(o?.newSignups24h ?? 0) > 50 ? "warning" : "default"}
            size="sm"
          />
        </button>
        <button onClick={() => onNavigate("controls")} className="text-left">
          <StatCard
            title="Buy switches off"
            value={`${o?.buyDisabledCount ?? 0}/5`}
            description={o?.maintenanceOn ? "Maintenance ON" : "Maintenance off"}
            icon={ShieldAlert}
            variant={(o?.buyDisabledCount ?? 0) > 0 || o?.maintenanceOn ? "destructive" : "success"}
            size="sm"
          />
        </button>
      </div>

      {/* Recent sensitive activity */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent sensitive activity
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onNavigate("activity")}>
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sensitive actions recorded.</p>
          ) : (
            recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSensitiveAction(e.action) ? "bg-destructive" : "bg-muted-foreground"}`} />
                  <span className="text-sm font-medium truncate">{e.action.replace(/_/g, " ")}</span>
                  {e.target_type && <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {e.target_type}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground capitalize">{e.actor_role ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
