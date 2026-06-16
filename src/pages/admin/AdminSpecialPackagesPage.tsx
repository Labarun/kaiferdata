/**
 * AdminSpecialPackagesPage — manage special bundle packages, the delivery ETA,
 * and the offer kill-switch. Profit (user + agent) is shown per package.
 */
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, Package, Zap, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SpecialPackageFormDialog } from "@/components/admin/SpecialPackageFormDialog";
import {
  fetchAllSpecialPackages,
  deleteSpecialPackage,
  setSpecialEta,
  setSpecialOfferEnabled,
  userProfit,
  agentProfit,
} from "@/services/specialBundlesAdmin";
import {
  fetchSpecialSettings,
  formatGhs,
  bundleTypeLabel,
  DELIVERY_ETA_OPTIONS,
  DELIVERY_ETA_ORDER,
  type SpecialBundlePackage,
  type SpecialDeliveryEta,
} from "@/services/specialBundles";

export default function AdminSpecialPackagesPage() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<SpecialBundlePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<SpecialBundlePackage | null>(null);

  const [eta, setEta] = useState<SpecialDeliveryEta>("few_minutes");
  const [offerEnabled, setEnabled] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pkgs, settings] = await Promise.all([fetchAllSpecialPackages(), fetchSpecialSettings()]);
      setPackages(pkgs);
      setEta(settings.eta);
      setEnabled(settings.offerEnabled);
    } catch (e) {
      toast({ title: "Failed to load", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEtaChange = async (value: SpecialDeliveryEta) => {
    setEta(value);
    setSavingSetting(true);
    try {
      await setSpecialEta(value);
      toast({ title: "Delivery time updated", description: DELIVERY_ETA_OPTIONS[value].label });
    } catch (e) {
      toast({ title: "Couldn't update", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingSetting(false);
    }
  };

  const handleToggleOffer = async (value: boolean) => {
    setEnabled(value);
    try {
      await setSpecialOfferEnabled(value);
      toast({ title: value ? "Offer enabled" : "Offer paused" });
    } catch (e) {
      setEnabled(!value);
      toast({ title: "Couldn't update", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (pkg: SpecialBundlePackage) => {
    if (!confirm(`Delete ${pkg.size_label}? This can't be undone.`)) return;
    try {
      await deleteSpecialPackage(pkg.id);
      toast({ title: "Package deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const activeCount = packages.filter((p) => p.is_active).length;
  const avgUserProfit = packages.length ? packages.reduce((s, p) => s + userProfit(p), 0) / packages.length : 0;
  const avgAgentProfit = packages.length ? packages.reduce((s, p) => s + agentProfit(p), 0) / packages.length : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Special Packages" description="MTN special offer catalog & delivery settings" />
        <Button
          size="sm"
          onClick={() => {
            setEditPkg(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Package
        </Button>
      </div>

      {/* Settings: ETA + kill switch */}
      <Card className="glass-card rounded-2xl border-border/40">
        <CardContent className="p-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" /> Current delivery time (tracker)
            </label>
            <Select value={eta} onValueChange={(v) => handleEtaChange(v as SpecialDeliveryEta)} disabled={savingSetting}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_ETA_ORDER.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {DELIVERY_ETA_OPTIONS[opt].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10.5px] text-muted-foreground mt-1.5">{DELIVERY_ETA_OPTIONS[eta].helper}</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2.5 self-start">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Power className="h-3.5 w-3.5" /> Offer enabled
              </p>
              <p className="text-[11px] text-muted-foreground">Turn the whole offer on/off</p>
            </div>
            <Switch checked={offerEnabled} onCheckedChange={handleToggleOffer} />
          </div>
        </CardContent>
      </Card>

      {/* Stat minis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini label="Packages" value={packages.length} icon={Package} />
        <StatMini label="Active" value={activeCount} icon={Power} />
        <StatMini label="Avg user profit" value={formatGhs(avgUserProfit)} icon={Zap} />
        <StatMini label="Avg agent profit" value={formatGhs(avgAgentProfit)} icon={Zap} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No special packages yet. Add the first one with the supplier &amp; selling prices.
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Supplier</TableHead>
                <TableHead className="text-right">User</TableHead>
                <TableHead className="text-right">User profit</TableHead>
                <TableHead className="text-right">Agent</TableHead>
                <TableHead className="text-right">Agent profit</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => {
                const up = userProfit(pkg);
                const ap = agentProfit(pkg);
                return (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{pkg.size_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.name} · {bundleTypeLabel(pkg.bundle_type)} · {pkg.network}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatGhs(pkg.supplier_price)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatGhs(pkg.user_price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs font-semibold ${up >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatGhs(up)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatGhs(pkg.agent_price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs font-semibold ${ap >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatGhs(ap)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={pkg.is_active ? "default" : "secondary"} className="text-[10px]">
                        {pkg.is_active ? "Active" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditPkg(pkg);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(pkg)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SpecialPackageFormDialog open={formOpen} onOpenChange={setFormOpen} pkg={editPkg} onSuccess={load} />
    </div>
  );
}

function StatMini({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Package }) {
  return (
    <div className="glass-card rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
