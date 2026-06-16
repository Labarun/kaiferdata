/**
 * SpecialPackageFormDialog — create / edit a special bundle package.
 *
 * Profit (normal user + super agent) is previewed live. Network is locked to
 * MTN for this offer.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createSpecialPackage,
  updateSpecialPackage,
  userProfit,
  agentProfit,
} from "@/services/specialBundlesAdmin";
import { formatGhs, SPECIAL_OFFER_NETWORK, type SpecialBundlePackage } from "@/services/specialBundles";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pkg: SpecialBundlePackage | null;
  onSuccess: () => void;
}

const EMPTY = {
  name: "",
  size_label: "",
  bundle_type: "data" as "data" | "data_airtime",
  network: SPECIAL_OFFER_NETWORK,
  supplier_price: 0,
  user_price: 0,
  agent_price: 0,
  currency: "GHS",
  delivery_note: "",
  is_active: true,
  sort_order: 0,
};

export function SpecialPackageFormDialog({ open, onOpenChange, pkg, onSuccess }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        pkg
          ? {
              name: pkg.name,
              size_label: pkg.size_label,
              bundle_type: pkg.bundle_type,
              network: pkg.network || SPECIAL_OFFER_NETWORK,
              supplier_price: pkg.supplier_price,
              user_price: pkg.user_price,
              agent_price: pkg.agent_price,
              currency: pkg.currency || "GHS",
              delivery_note: pkg.delivery_note || "",
              is_active: pkg.is_active,
              sort_order: pkg.sort_order || 0,
            }
          : { ...EMPTY },
      );
    }
  }, [open, pkg]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const num = (v: string) => (v === "" ? 0 : Number(v));
  const uProfit = userProfit(form);
  const aProfit = agentProfit(form);

  const valid = form.size_label.trim() && form.user_price > 0 && form.agent_price > 0 && form.supplier_price >= 0;

  const handleSave = async () => {
    if (!valid) {
      toast({ title: "Missing details", description: "Add a size label and all prices.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim() || form.size_label.trim(),
        size_label: form.size_label.trim(),
        delivery_note: form.delivery_note.trim() || null,
      };
      if (pkg) {
        await updateSpecialPackage(pkg.id, payload as any);
        toast({ title: "Package updated" });
      } else {
        await createSpecialPackage(payload as any);
        toast({ title: "Package created" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pkg ? "Edit special package" : "New special package"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size label *">
              <Input placeholder="5.1GB" value={form.size_label} onChange={(e) => set("size_label", e.target.value)} />
            </Field>
            <Field label="Type">
              <Select value={form.bundle_type} onValueChange={(v) => set("bundle_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">Data only</SelectItem>
                  <SelectItem value="data_airtime">Data + Airtime</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Display name">
            <Input
              placeholder="e.g. MTN Special 5.1GB"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Network">
              <Input value={form.network} disabled className="opacity-70" />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={String(form.sort_order)}
                onChange={(e) => set("sort_order", num(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Supplier ₵">
              <Input type="number" step="0.01" value={String(form.supplier_price)} onChange={(e) => set("supplier_price", num(e.target.value))} />
            </Field>
            <Field label="User ₵">
              <Input type="number" step="0.01" value={String(form.user_price)} onChange={(e) => set("user_price", num(e.target.value))} />
            </Field>
            <Field label="Agent ₵">
              <Input type="number" step="0.01" value={String(form.agent_price)} onChange={(e) => set("agent_price", num(e.target.value))} />
            </Field>
          </div>

          {/* Profit preview */}
          <div className="grid grid-cols-2 gap-2">
            <ProfitPill label="User profit" value={uProfit} />
            <ProfitPill label="Agent profit" value={aProfit} />
          </div>

          <Field label="Delivery note (optional)">
            <Input
              placeholder="e.g. Delivered manually, no SMS"
              value={form.delivery_note}
              onChange={(e) => set("delivery_note", e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-[11px] text-muted-foreground">Visible to users & agents</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !valid}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {pkg ? "Save changes" : "Create package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ProfitPill({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className={`rounded-xl px-3 py-2 ${positive ? "bg-success/10" : "bg-destructive/10"}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`text-sm font-bold ${positive ? "text-success" : "text-destructive"}`}>{formatGhs(value)}</p>
    </div>
  );
}
