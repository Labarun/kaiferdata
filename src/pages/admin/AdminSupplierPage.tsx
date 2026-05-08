/**
 * AdminSupplierPage — Supplier API configuration, product sync, status sync, diagnostics, and sync logs
 */
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchSuppliers, updateSupplier, createSupplier, fetchSyncLogs,
  triggerProductSync, triggerStatusSync, triggerHealthCheck, deleteSupplier,
  type Supplier, type SupplierSyncLog,
} from "@/services/supplierAdmin";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, RefreshCw, Server, Pencil, Clock, CheckCircle2, XCircle,
  Package, ArrowDownToLine, Zap, Settings2, Activity, Wallet, Link, Trash2,
} from "lucide-react";

export default function AdminSupplierPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [syncLogs, setSyncLogs] = useState<SupplierSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([fetchSuppliers(), fetchSyncLogs(15)]);
      setSuppliers(s);
      setSyncLogs(l);
    } catch {
      toast({ title: "Error", description: "Failed to load supplier data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (type: "product" | "status", supplierId?: string) => {
    setSyncing(type);
    try {
      const result = type === "product"
        ? await triggerProductSync(supplierId)
        : await triggerStatusSync();
      toast({ title: "Sync Complete", description: JSON.stringify(result.results || result, null, 2).slice(0, 200) });
      load();
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const handleEdit = (s: Supplier) => { setEditSupplier(s); setFormOpen(true); };
  const handleCreate = () => { setEditSupplier(null); setFormOpen(true); };

  const handleDelete = async (s: Supplier) => {
    if (confirm(`Are you sure you want to delete supplier "${s.name}"? This action cannot be undone.`)) {
      try {
        await deleteSupplier(s.id);
        toast({ title: "Supplier deleted" });
        load();
      } catch (err: any) {
        toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleDiagnostics = async (supplierId: string) => {
    setDiagLoading(true);
    setDiagnostics(null);
    try {
      const result = await triggerHealthCheck(supplierId);
      setDiagnostics(result);
    } catch (err: any) {
      toast({ title: "Diagnostics Failed", description: err.message, variant: "destructive" });
    } finally {
      setDiagLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Supplier Integration" description="Manage supplier API connections, product sync, and order submission" />
        <Button onClick={handleCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Supplier</Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-start gap-1"
          disabled={syncing === "product"}
          onClick={() => handleSync("product")}
        >
          <div className="flex items-center gap-2">
            {syncing === "product" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 text-primary" />}
            <span className="font-semibold text-sm">Sync Products</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Fetch latest packages from supplier API</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-start gap-1"
          disabled={syncing === "status"}
          onClick={() => handleSync("status")}
        >
          <div className="flex items-center gap-2">
            {syncing === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-primary" />}
            <span className="font-semibold text-sm">Sync Order Statuses</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Check supplier for status updates</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-start gap-1"
          onClick={load}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Refresh Data</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Reload supplier config and logs</span>
        </Button>
      </div>

      {/* Supplier Cards */}
      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No suppliers configured yet.</p>
            <Button size="sm" className="mt-3" onClick={handleCreate}>Add First Supplier</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suppliers.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <p className="text-[11px] text-muted-foreground font-mono">{s.provider_code} · {s.api_base_url || "No URL"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px]">
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-0.5">Networks</p>
                    <p className="font-medium">{(s.supported_networks || []).join(", ") || "All"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-0.5">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {s.supports_product_sync && <Badge variant="outline" className="text-[9px]">Products</Badge>}
                      {s.supports_order_submission && <Badge variant="outline" className="text-[9px]">Orders</Badge>}
                      {s.supports_status_sync && <Badge variant="outline" className="text-[9px]">Status</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-0.5">Timeout</p>
                    <p className="font-medium">{s.request_timeout_ms}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-0.5">Last Product Sync</p>
                    <p className="font-medium">{s.last_product_sync_at ? new Date(s.last_product_sync_at).toLocaleString() : "Never"}</p>
                  </div>
                </div>
                {s.supports_product_sync && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 mr-2"
                    disabled={syncing === "product"}
                    onClick={() => handleSync("product", s.id)}
                  >
                    {syncing === "product" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />}
                    Sync This Supplier
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={diagLoading}
                  onClick={() => handleDiagnostics(s.id)}
                >
                  {diagLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 mr-1.5" />}
                  Diagnostics
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diagnostics Results */}
      {diagnostics && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Supplier Diagnostics — {String(diagnostics.supplier_name || "")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Health */}
              <div className="border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Health Check</p>
                {(diagnostics.health as any)?.ok ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Healthy</span>
                    <span className="text-muted-foreground ml-auto">{(diagnostics.health as any)?.response_time_ms}ms</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Unreachable</span>
                  </div>
                )}
              </div>

              {/* Balance */}
              <div className="border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">API Balance</p>
                {(diagnostics.balance as any)?.ok ? (
                  <div>
                    <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap break-all max-h-16 overflow-auto">
                      {JSON.stringify((diagnostics.balance as any)?.data, null, 1)}
                    </pre>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unavailable</span>
                )}
              </div>

              {/* Last Product Sync */}
              <div className="border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Last Product Sync</p>
                {diagnostics.last_product_sync ? (
                  <div>
                    <Badge variant={(diagnostics.last_product_sync as any).status === "completed" ? "default" : "destructive"} className="text-[9px]">
                      {(diagnostics.last_product_sync as any).status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date((diagnostics.last_product_sync as any).started_at).toLocaleString()}
                    </p>
                  </div>
                ) : <span className="text-muted-foreground">Never</span>}
              </div>

              {/* Last Failed Request */}
              <div className="border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Last Failed Request</p>
                {diagnostics.last_failed_request ? (
                  <div>
                    <p className="text-[10px] text-destructive truncate">{(diagnostics.last_failed_request as any).error_message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date((diagnostics.last_failed_request as any).created_at).toLocaleString()}
                    </p>
                  </div>
                ) : <span className="text-green-600 text-[10px]">No recent failures</span>}
              </div>
            </div>

            {/* Webhook URL */}
            {diagnostics.webhook_url && (
              <div className="mt-3 border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                  <Link className="h-3 w-3" /> Webhook URL
                </p>
                <code className="text-[10px] text-foreground/80 break-all">{String(diagnostics.webhook_url)}</code>
                <p className="text-[10px] text-muted-foreground mt-1">Configure this URL in your supplier's webhook settings for real-time order status updates.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Logs */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Recent Sync Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    {log.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : log.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-xs font-medium capitalize">{log.sync_type.replace(/_/g, " ")}</p>
                      {log.sync_type === "product_sync" && log.status === "completed" && (
                        <p className="text-[10px] text-muted-foreground">
                          +{log.packages_created} created · {log.packages_updated} updated · {log.packages_deactivated} deactivated
                        </p>
                      )}
                      {log.sync_type === "status_sync" && log.status === "completed" && (
                        <p className="text-[10px] text-muted-foreground">
                          {log.orders_updated} orders updated
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-[10px] text-destructive truncate max-w-[300px]">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(log.started_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editSupplier}
        onSuccess={load}
      />
    </div>
  );
}

/** ── Supplier Form Dialog ── */
function SupplierFormDialog({
  open, onOpenChange, supplier, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier: Supplier | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!supplier;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    provider_code: "",
    api_base_url: "",
    is_active: true,
    supported_networks: "MTN,Telecel,AirtelTigo",
    request_timeout_ms: "30000",
    priority: "0",
    polling_interval_seconds: "60",
    supports_product_sync: false,
    supports_order_submission: false,
    supports_status_sync: false,
    auth_config_json: "{}",
    endpoint_config_json: "{}",
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        provider_code: supplier.provider_code,
        api_base_url: supplier.api_base_url || "",
        is_active: supplier.is_active,
        supported_networks: (supplier.supported_networks || []).join(","),
        request_timeout_ms: String(supplier.request_timeout_ms),
        priority: String(supplier.priority),
        polling_interval_seconds: String(supplier.polling_interval_seconds),
        supports_product_sync: supplier.supports_product_sync,
        supports_order_submission: supplier.supports_order_submission,
        supports_status_sync: supplier.supports_status_sync,
        auth_config_json: JSON.stringify(supplier.auth_config || {}, null, 2),
        endpoint_config_json: JSON.stringify(supplier.endpoint_config || {}, null, 2),
      });
    } else {
      setForm({
        name: "", provider_code: "", api_base_url: "", is_active: true,
        supported_networks: "MTN,Telecel,AirtelTigo", request_timeout_ms: "30000",
        priority: "0", polling_interval_seconds: "60",
        supports_product_sync: false, supports_order_submission: false, supports_status_sync: false,
        auth_config_json: JSON.stringify({
          auth_type: "bearer",
          secret_name: "SUPPLIER_API_KEY",
        }, null, 2),
        endpoint_config_json: JSON.stringify({
          products: { path: "/v1/plans", method: "GET", response_data_field: "data" },
          networks: { path: "/v1/networks", method: "GET", response_data_field: "data" },
          submit_order: { path: "/v1/orders", method: "POST" },
          check_status: { path: "/v1/orders/{reference}", method: "GET" },
          health: { path: "/v1/health", method: "GET" },
          balance: { path: "/v1/account/balance", method: "GET" },
          list_orders: { path: "/v1/orders", method: "GET" },
          network_mapping: { mtn: "MTN", telecel: "Telecel", airteltigo: "AirtelTigo", MTN: "MTN", Telecel: "Telecel", AirtelTigo: "AirtelTigo" },
          reverse_network_mapping: { MTN: "mtn", Telecel: "telecel", AirtelTigo: "airteltigo" },
          status_mapping: { pending: "processing", success: "delivered", failed: "failed", processing: "processing", delivered: "delivered", completed: "delivered", cancelled: "cancelled" },
          product_field_mapping: { id: "id", name: "name", code: "code", price: "price", network: "network", volume: "volume", validity: "validity" },
          order_request_mapping: { phone: "phone", product_code: "product_code", network: "network", amount: "amount", reference: "reference" },
          order_response_mapping: { reference: "reference", status: "status", message: "message" },
        }, null, 2),
      });
    }
  }, [supplier, open]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.provider_code) {
      toast({ title: "Required", description: "Name and provider code are required", variant: "destructive" });
      return;
    }

    let authConfig: Record<string, unknown>;
    let endpointConfig: Record<string, unknown>;
    try {
      authConfig = JSON.parse(form.auth_config_json);
      endpointConfig = JSON.parse(form.endpoint_config_json);
    } catch {
      toast({ title: "Invalid JSON", description: "Auth config or endpoint config has invalid JSON", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        provider_code: form.provider_code,
        api_base_url: form.api_base_url || null,
        is_active: form.is_active,
        supported_networks: form.supported_networks.split(",").map((n) => n.trim()).filter(Boolean),
        request_timeout_ms: parseInt(form.request_timeout_ms) || 30000,
        priority: parseInt(form.priority) || 0,
        polling_interval_seconds: parseInt(form.polling_interval_seconds) || 60,
        supports_product_sync: form.supports_product_sync,
        supports_order_submission: form.supports_order_submission,
        supports_status_sync: form.supports_status_sync,
        auth_config: authConfig,
        endpoint_config: endpointConfig,
      };

      if (isEdit) {
        await updateSupplier(supplier!.id, payload as any);
        toast({ title: "Supplier updated" });
      } else {
        await createSupplier(payload as any);
        toast({ title: "Supplier created" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Supplier" : "Add Supplier"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. DataHub API" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Provider Code</Label>
              <Input value={form.provider_code} onChange={(e) => set("provider_code", e.target.value)} placeholder="e.g. datahub" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">API Base URL</Label>
            <Input value={form.api_base_url} onChange={(e) => set("api_base_url", e.target.value)} placeholder="https://api.supplier.com" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Networks (comma-separated)</Label>
              <Input value={form.supported_networks} onChange={(e) => set("supported_networks", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Timeout (ms)</Label>
              <Input type="number" value={form.request_timeout_ms} onChange={(e) => set("request_timeout_ms", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Input type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} />
            </div>
          </div>

          {/* Toggles */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Capabilities</p>
            {[
              { key: "is_active", label: "Active" },
              { key: "supports_product_sync", label: "Product Sync" },
              { key: "supports_order_submission", label: "Order Submission" },
              { key: "supports_status_sync", label: "Status Sync" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs">{label}</Label>
                <Switch
                  checked={(form as any)[key]}
                  onCheckedChange={(v) => set(key, v)}
                />
              </div>
            ))}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Polling Interval (seconds)</Label>
              <Input type="number" value={form.polling_interval_seconds} onChange={(e) => set("polling_interval_seconds", e.target.value)} />
            </div>
          </div>

          {/* Auth Config */}
          <div className="space-y-1.5">
            <Label className="text-xs">Auth Config (JSON)</Label>
            <Textarea
              value={form.auth_config_json}
              onChange={(e) => set("auth_config_json", e.target.value)}
              className="font-mono text-[11px] min-h-[80px]"
            />
            <p className="text-[10px] text-muted-foreground">
              Fields: auth_type (bearer/api_key), secret_name (env var name), header_name (optional)
            </p>
          </div>

          {/* Endpoint Config */}
          <div className="space-y-1.5">
            <Label className="text-xs">Endpoint Config (JSON)</Label>
            <Textarea
              value={form.endpoint_config_json}
              onChange={(e) => set("endpoint_config_json", e.target.value)}
              className="font-mono text-[11px] min-h-[200px]"
            />
            <p className="text-[10px] text-muted-foreground">
              Configure API paths, field mappings, network mappings, and status mappings.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
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
