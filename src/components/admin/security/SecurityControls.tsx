/**
 * Security Center — Controls tab
 * Emergency lockdown + platform kill switches (system_settings).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSettings,
  setSetting,
  emergencyLockdown,
  liftLockdown,
  LOCKDOWN_SWITCHES,
  MAINTENANCE_KEY,
  type KillSwitch,
} from "@/services/securityCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ShieldAlert, ShieldCheck, Lock, Unlock, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GROUP_LABEL: Record<string, string> = {
  system: "System",
  features: "Buy & Flow switches",
  status: "Public status messages",
  general: "General",
};

export function SecurityControls() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["security", "settings"],
    queryFn: async () => (await getSettings()).data,
  });

  const valueOf = (key: string) => settings.find((s) => s.key === key)?.value;
  const inLockdown =
    valueOf(MAINTENANCE_KEY) === "true" ||
    LOCKDOWN_SWITCHES.some((k) => valueOf(k) === "false");

  const refresh = () => qc.invalidateQueries({ queryKey: ["security"] });

  async function onToggle(key: string, value: string) {
    setBusy(key);
    const { error } = await setSetting(key, value);
    if (error) toast({ title: "Failed", description: String((error as Error).message), variant: "destructive" });
    else {
      toast({ title: "Updated", description: `${key.replace(/_/g, " ")} → ${value}` });
      await refresh();
    }
    setBusy(null);
  }

  async function onLockdown() {
    setBusy("lockdown");
    const { failed } = await emergencyLockdown();
    toast({
      title: failed ? "Partial lockdown" : "Lockdown engaged",
      description: failed ? `${failed} switch(es) failed — re-check below.` : "Maintenance on; buying & deposits disabled.",
      variant: failed ? "destructive" : "default",
    });
    await refresh();
    setBusy(null);
  }

  async function onLift() {
    setBusy("lockdown");
    const { failed } = await liftLockdown();
    toast({
      title: failed ? "Partial restore" : "Lockdown lifted",
      description: failed ? `${failed} switch(es) failed.` : "Maintenance off; buying & deposits restored.",
      variant: failed ? "destructive" : "default",
    });
    await refresh();
    setBusy(null);
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // Group settings
  const groups = settings.reduce<Record<string, KillSwitch[]>>((acc, s) => {
    (acc[s.group] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Emergency lockdown */}
      <Card className={inLockdown ? "border-destructive/50 bg-destructive/5" : "border-amber-500/40"}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {inLockdown ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <ShieldCheck className="h-5 w-5 text-amber-500" />}
            Emergency lockdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground max-w-prose">
            {inLockdown
              ? "The platform is currently locked down. New purchases, deposits and order submissions are blocked. Lift this once the threat is handled."
              : "One click to instantly stop all money movement: turns on maintenance mode and disables guest buying, user buying, deposits, order submission, and agent stores."}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant={inLockdown ? "outline" : "destructive"}
                disabled={busy === "lockdown"}
                className="shrink-0"
              >
                {busy === "lockdown" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : inLockdown ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                {inLockdown ? "Lift lockdown" : "Engage lockdown"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{inLockdown ? "Lift the lockdown?" : "Engage emergency lockdown?"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {inLockdown
                    ? "This re-enables guest buying, user buying, deposits, order submission and agent stores, and turns maintenance mode off."
                    : "This immediately blocks ALL new purchases and deposits across the whole platform. Customers will see maintenance mode. Use only for an active security incident."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={inLockdown ? onLift : onLockdown}
                  className={inLockdown ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                >
                  {inLockdown ? "Lift lockdown" : "Yes, lock it down"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Individual switches */}
      {Object.entries(groups).map(([group, items]) => (
        <Card key={group}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              {GROUP_LABEL[group] ?? group}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium capitalize">{s.key.replace(/_/g, " ")}</Label>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                </div>
                {s.isBool ? (
                  <Switch
                    checked={s.value === "true"}
                    onCheckedChange={(c) => onToggle(s.key, c ? "true" : "false")}
                    disabled={busy === s.key}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-44 text-xs"
                      defaultValue={s.value}
                      onBlur={(e) => e.target.value !== s.value && onToggle(s.key, e.target.value)}
                    />
                    {busy === s.key && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
