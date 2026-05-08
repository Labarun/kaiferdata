/**
 * AdminPackagesPage — Package catalog management with filters, profit visibility, sync
 */
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { PackageFormDialog } from "@/components/admin/PackageFormDialog";
import { fetchAllPackages, calcProfit, calcMargin, deletePackage, type DataPackage } from "@/services/packageCatalog";
import { triggerProductSync, fetchSuppliers, type Supplier } from "@/services/supplierAdmin";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Pencil,
  Package,
  TrendingUp,
  Eye,
  EyeOff,
  Loader2,
  ArrowDownToLine,
  Trash2,
} from "lucide-react";

const NETWORKS = ["All", "MTN", "Telecel", "AirtelTigo"];
const STATUS_FILTERS = ["All", "Active", "Inactive"];
const VISIBILITY_FILTERS = ["All", "Public", "Logged-in", "Hidden"];

export default function AdminPackagesPage() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [visibilityFilter, setVisibilityFilter] = useState("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<DataPackage | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [data, sups] = await Promise.all([
        fetchAllPackages(),
        fetchSuppliers()
      ]);
      setPackages(data);
      setSuppliers(sups);
    } catch {
      toast({ title: "Error", description: "Failed to load packages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = packages;
    if (networkFilter !== "All") result = result.filter((p) => p.network === networkFilter);
    if (statusFilter === "Active") result = result.filter((p) => p.is_active);
    if (statusFilter === "Inactive") result = result.filter((p) => !p.is_active);
    if (visibilityFilter === "Public") result = result.filter((p) => p.visible_on_public);
    if (visibilityFilter === "Logged-in") result = result.filter((p) => p.visible_for_logged_in);
    if (visibilityFilter === "Hidden") result = result.filter((p) => !p.visible_on_public && !p.visible_for_logged_in);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.package_name.toLowerCase().includes(q) ||
          p.package_code.toLowerCase().includes(q) ||
          p.package_size_label.toLowerCase().includes(q)
      );
    }
    return result;
  }, [packages, networkFilter, statusFilter, visibilityFilter, search]);

  const totalProfit = filtered.reduce((sum, p) => sum + calcProfit(p), 0);

  const handleEdit = (pkg: DataPackage) => {
    setEditPkg(pkg);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditPkg(null);
    setFormOpen(true);
  };

  const handleDelete = async (pkg: DataPackage) => {
    if (confirm(`Are you sure you want to delete ${pkg.package_size_label} ${pkg.package_name}?`)) {
      try {
        await deletePackage(pkg.id);
        toast({ title: "Package deleted" });
        load();
      } catch (err: any) {
        toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Packages</h1>
          <p className="text-sm text-muted-foreground">Manage data package catalog · {packages.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton onSuccess={load} />
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Package
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini label="Total" value={filtered.length} icon={Package} />
        <StatMini label="Active" value={filtered.filter((p) => p.is_active).length} icon={Eye} />
        <StatMini label="Networks" value={new Set(filtered.map((p) => p.network)).size} icon={TrendingUp} />
        <StatMini
          label="Avg Profit"
          value={`GH₵${filtered.length > 0 ? (totalProfit / filtered.length).toFixed(2) : "0.00"}`}
          icon={TrendingUp}
          valueIsString
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={networkFilter} onValueChange={setNetworkFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VISIBILITY_FILTERS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">No packages found.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Network</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Supplier</TableHead>
                <TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Visibility</TableHead>
                <TableHead className="text-center">Source</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pkg) => {
                const profit = calcProfit(pkg);
                const margin = calcMargin(pkg);
                const supplier = pkg.supplier_source_id ? suppliers.find(s => s.id === pkg.supplier_source_id) : null;
                const sourceDisplay = supplier ? supplier.name : pkg.source_type;
                return (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">{pkg.network}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{pkg.package_size_label}</p>
                        <p className="text-xs text-muted-foreground">{pkg.package_name}</p>
                        {pkg.validity_label && (
                          <p className="text-[10px] text-muted-foreground/60">{pkg.validity_label}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      GH₵{Number(pkg.supplier_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      GH₵{Number(pkg.selling_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                        GH₵{profit.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">({margin.toFixed(0)}%)</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={pkg.is_active ? "default" : "secondary"} className="text-[10px]">
                        {pkg.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {pkg.visible_on_public && (
                          <span title="Public" className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Pub</span>
                        )}
                        {pkg.visible_for_logged_in && (
                          <span title="Logged-in" className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">Log</span>
                        )}
                        {!pkg.visible_on_public && !pkg.visible_for_logged_in && (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] font-mono text-muted-foreground">{sourceDisplay}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(pkg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(pkg)}>
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

      <PackageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        pkg={editPkg}
        onSuccess={load}
      />
    </div>
  );
}

function StatMini({ label, value, icon: Icon, valueIsString }: {
  label: string;
  value: number | string;
  icon: any;
  valueIsString?: boolean;
}) {
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{valueIsString ? value : value}</p>
    </div>
  );
}

function SyncButton({ onSuccess }: { onSuccess: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await triggerProductSync();
      const results = (result as any).results || [];
      const summary = results.map((r: any) =>
        r.success ? `${r.supplier_name}: +${r.created} / ~${r.updated} / -${r.deactivated}` : `${r.supplier_name}: failed`
      ).join(", ");
      toast({ title: "Product Sync Complete", description: summary || "Done" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
      {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
      Sync Products
    </Button>
  );
}
