/**
 * PackageFormDialog — Create/Edit data package with profit preview
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, AlertCircle } from "lucide-react";
import type { DataPackage } from "@/services/packageCatalog";
import { createPackage, updatePackage, calcProfit, calcMargin } from "@/services/packageCatalog";
import { useToast } from "@/hooks/use-toast";

const NETWORKS = ["MTN", "Telecel", "AirtelTigo"];
const PACKAGE_TYPES = ["data_bundle", "special_offer", "promo"];

interface PackageFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pkg: DataPackage | null;
  onSuccess: () => void;
  suppliers?: any[];
}

const emptyForm = {
  network: "MTN",
  package_code: "",
  package_name: "",
  package_size_label: "",
  package_volume_value: "",
  package_type: "data_bundle",
  validity_label: "",
  supplier_price: "",
  selling_price: "",
  currency: "GHS",
  is_active: true,
  visible_on_public: true,
  visible_for_logged_in: true,
  display_order: "0",
  source_type: "manual",
  agent_base_price: "",
  is_agent_resaleable: true,
};

export function PackageFormDialog({ open, onOpenChange, pkg, onSuccess, suppliers }: PackageFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...emptyForm, supplier_id: "none", supplier_source_id: "" });
  const [saving, setSaving] = useState(false);
  const isEdit = !!pkg;

  useEffect(() => {
    if (pkg) {
      setForm({
        network: pkg.network,
        package_code: pkg.package_code,
        package_name: pkg.package_name,
        package_size_label: pkg.package_size_label,
        package_volume_value: pkg.package_volume_value || "",
        package_type: pkg.package_type,
        validity_label: pkg.validity_label || "",
        supplier_price: String(pkg.supplier_price),
        selling_price: String(pkg.selling_price),
        currency: pkg.currency,
        is_active: pkg.is_active,
        visible_on_public: pkg.visible_on_public,
        visible_for_logged_in: pkg.visible_for_logged_in,
        display_order: String(pkg.display_order),
        source_type: pkg.source_type,
        supplier_id: pkg.source_type === "supplier_api" && pkg.source_metadata?.supplier_id ? String(pkg.source_metadata.supplier_id) : (pkg.source_type === "supplier_api" && suppliers?.find(s => s.id === pkg.supplier_source_id || s.name.toLowerCase() === pkg.source_type)?.id) || "none",
        supplier_source_id: pkg.supplier_source_id || "",
        agent_base_price: String(pkg.agent_base_price ?? 0),
        is_agent_resaleable: pkg.is_agent_resaleable ?? true,
      });
      // Try to intelligently match supplier from source_metadata if missing
      if (pkg.source_type === "supplier_api" && suppliers) {
        const matchingSupplier = suppliers.find(s => 
          (pkg.source_metadata && pkg.source_metadata.supplier_id === s.id) || 
          (pkg.source_metadata && pkg.source_metadata.supplier === s.provider_code)
        );
        if (matchingSupplier) {
          setForm(f => ({ ...f, supplier_id: matchingSupplier.id }));
        }
      }
    } else {
      setForm({ ...emptyForm, supplier_id: "none", supplier_source_id: "" });
    }
  }, [pkg, open]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const supplierNum = parseFloat(form.supplier_price) || 0;
  const sellingNum = parseFloat(form.selling_price) || 0;
  const profit = calcProfit({ supplier_price: supplierNum, selling_price: sellingNum });
  const margin = calcMargin({ supplier_price: supplierNum, selling_price: sellingNum });

  const handleSave = async () => {
    if (!form.package_code.trim() || !form.package_name.trim() || !form.package_size_label.trim()) {
      toast({ title: "Missing fields", description: "Package code, name, and size label are required.", variant: "destructive" });
      return;
    }
    if (sellingNum <= 0) {
      toast({ title: "Invalid price", description: "Selling price must be greater than 0.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        network: form.network,
        package_code: form.package_code.trim(),
        package_name: form.package_name.trim(),
        package_size_label: form.package_size_label.trim(),
        package_volume_value: form.package_volume_value.trim() || null,
        package_type: form.package_type,
        validity_label: form.validity_label.trim() || null,
        supplier_price: supplierNum,
        selling_price: sellingNum,
        currency: form.currency,
        is_active: form.is_active,
        visible_on_public: form.visible_on_public,
        visible_for_logged_in: form.visible_for_logged_in,
        display_order: parseInt(form.display_order) || 0,
        source_type: form.supplier_id !== "none" ? "supplier_api" : "manual",
        supplier_source_id: form.supplier_id !== "none" ? form.supplier_source_id.trim() || null : null,
        source_metadata: form.supplier_id !== "none" ? { supplier_id: form.supplier_id } : null,
        agent_base_price: parseFloat(form.agent_base_price) || 0,
        is_agent_resaleable: form.is_agent_resaleable,
      };

      if (isEdit) {
        await updatePackage(pkg!.id, payload);
        toast({ title: "Package updated" });
      } else {
        await createPackage(payload);
        toast({ title: "Package created" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save package", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Package" : "Create Package"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Network + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Network</Label>
              <Select value={form.network} onValueChange={(v) => set("network", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Package Type</Label>
              <Select value={form.package_type} onValueChange={(v) => set("package_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PACKAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Code + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Package Code</Label>
              <Input value={form.package_code} onChange={(e) => set("package_code", e.target.value)} placeholder="MTN-1GB-30D" maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Package Name</Label>
              <Input value={form.package_name} onChange={(e) => set("package_name", e.target.value)} placeholder="1GB Monthly" maxLength={100} />
            </div>
          </div>

          {/* Size Label + Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Size Label (displayed)</Label>
              <Input value={form.package_size_label} onChange={(e) => set("package_size_label", e.target.value)} placeholder="1GB" maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Volume Value (optional)</Label>
              <Input value={form.package_volume_value} onChange={(e) => set("package_volume_value", e.target.value)} placeholder="1024" maxLength={20} />
            </div>
          </div>

          {/* Validity + Display Order */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Validity Label</Label>
              <Input value={form.validity_label} onChange={(e) => set("validity_label", e.target.value)} placeholder="30 days" maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display Order</Label>
              <Input type="number" value={form.display_order} onChange={(e) => set("display_order", e.target.value)} />
            </div>
          </div>

          {/* ── Supplier Integration ── */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Supplier Integration</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Link to Supplier</Label>
                <Select value={form.supplier_id} onValueChange={(v) => set("supplier_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Manual (No Supplier)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manual (No Supplier)</SelectItem>
                    {suppliers?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.supplier_id !== "none" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  <Label className="text-xs">Supplier Source ID / Plan Key</Label>
                  <Input 
                    value={form.supplier_source_id} 
                    onChange={(e) => set("supplier_source_id", e.target.value)} 
                    placeholder="e.g. 1 (for Instant Data 1GB)" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Pricing Section ── */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Pricing</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Supplier Price (GH₵)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.supplier_price}
                  onChange={(e) => set("supplier_price", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Selling Price (GH₵)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.selling_price}
                  onChange={(e) => set("selling_price", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Profit Preview */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <TrendingUp className="h-4 w-4 text-success" />
              <div className="flex-1">
                <span className="text-xs text-muted-foreground">Gross Profit:</span>
                <span className={`ml-2 text-sm font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                  GH₵{profit.toFixed(2)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({margin.toFixed(1)}% margin)
                </span>
              </div>
              {profit < 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
          </div>

          {/* ── Agent Reseller Pricing ── */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Agent Reseller</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Agent Base Price (GH₵)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.agent_base_price}
                onChange={(e) => set("agent_base_price", e.target.value)}
                placeholder="0.00"
              />
              <p className="text-[10px] text-muted-foreground/60">
                Cost charged to agents who resell this bundle. Agents set their own selling price above this.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Available for agent resale</Label>
              <Switch checked={form.is_agent_resaleable} onCheckedChange={(v) => set("is_agent_resaleable", v)} />
            </div>
          </div>

          {/* ── Visibility Toggles ── */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Visibility & Status</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Visible on Public Page</Label>
                <Switch checked={form.visible_on_public} onCheckedChange={(v) => set("visible_on_public", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Visible for Logged-in Users</Label>
                <Switch checked={form.visible_for_logged_in} onCheckedChange={(v) => set("visible_for_logged_in", v)} />
              </div>
            </div>
          </div>

          {/* Source info (read-only for manual) */}
          <div className="text-xs text-muted-foreground px-1">
            Source: <span className="font-mono font-medium">{form.source_type}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
