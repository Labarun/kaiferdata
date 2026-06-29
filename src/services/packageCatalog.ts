/**
 * Package Catalog Service
 * Manages data packages — the source of truth for what users can buy.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DataPackage {
  id: string;
  network: string;
  package_code: string;
  package_name: string;
  package_size_label: string;
  package_volume_value: string | null;
  package_type: string;
  validity_label: string | null;
  supplier_price: number;
  selling_price: number;
  currency: string;
  is_active: boolean;
  visible_on_public: boolean;
  visible_for_logged_in: boolean;
  display_order: number;
  source_type: string;
  supplier_source_id: string | null;
  source_metadata: Record<string, unknown> | null;
  agent_base_price: number;
  is_agent_resaleable: boolean;
  buying_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type DataPackageInsert = Omit<DataPackage, "id" | "created_at" | "updated_at">;

/** Fetch packages visible on the public buy page (anon-safe RPC — no cost columns) */
export async function fetchPublicPackages(): Promise<DataPackage[]> {
  const { data, error } = await (supabase as any).rpc("list_public_packages", { _logged_in: false });
  if (error) throw error;
  return sortPackagesAutomatically((data as any[]) || []);
}

/** Fetch packages visible for logged-in users (safe RPC — no cost columns) */
export async function fetchLoggedInPackages(): Promise<DataPackage[]> {
  const { data, error } = await (supabase as any).rpc("list_public_packages", { _logged_in: true });
  if (error) throw error;
  return sortPackagesAutomatically((data as any[]) || []);
}

/** Fetch all packages (admin view — includes inactive) */
export async function fetchAllPackages(): Promise<DataPackage[]> {
  const { data, error } = await supabase
    .from("data_packages" as any)
    .select("*");

  if (error) throw error;
  return sortPackagesAutomatically((data as any[]) || [], true);
}

/** Create a new package */
export async function createPackage(pkg: Partial<DataPackageInsert>): Promise<DataPackage> {
  const { data, error } = await supabase
    .from("data_packages" as any)
    .insert(pkg as any)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

/** Update a package */
export async function updatePackage(id: string, updates: Partial<DataPackageInsert>): Promise<DataPackage> {
  const { data, error } = await supabase
    .from("data_packages" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

/** Get unique networks from packages */
export function getPackageNetworks(packages: DataPackage[]): string[] {
  return [...new Set(packages.map((p) => p.network))];
}

/** Filter packages by network */
export function filterPackagesByNetwork(packages: DataPackage[], network: string): DataPackage[] {
  return packages.filter((p) => p.network === network);
}

/** Calculate gross profit for a package */
export function calcProfit(pkg: { supplier_price: number; selling_price: number }): number {
  return pkg.selling_price - pkg.supplier_price;
}

/** Calculate profit margin percentage */
export function calcMargin(pkg: { supplier_price: number; selling_price: number }): number {
  if (pkg.selling_price <= 0) return 0;
  return ((pkg.selling_price - pkg.supplier_price) / pkg.selling_price) * 100;
}

/** Build a snapshot for order/intent records */
export function buildPackageSnapshot(pkg: DataPackage) {
  return {
    id: pkg.id,
    package_code: pkg.package_code,
    package_name: pkg.package_name,
    package_size_label: pkg.package_size_label,
    selling_price: pkg.selling_price,
    supplier_price: pkg.supplier_price,
    network: pkg.network,
    validity_label: pkg.validity_label,
    source_type: pkg.source_type,
  };
}

/** Delete a package */
export async function deletePackage(id: string): Promise<void> {
  const { error } = await supabase
    .from("data_packages" as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Parse volume label into MB for sorting */
function parseVolumeToMB(label: string | null): number {
  if (!label) return 0;
  const match = label.match(/([\d.]+)\s*(MB|GB|TB|G|M)/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  if (unit === 'MB' || unit === 'M') return value;
  if (unit === 'GB' || unit === 'G') return value * 1024;
  if (unit === 'TB') return value * 1024 * 1024;
  return value;
}

/** Sort packages by volume (lowest to highest), falling back to price */
export function sortPackagesAutomatically(packages: DataPackage[], groupByNetwork: boolean = false): DataPackage[] {
  return [...packages].sort((a, b) => {
    if (groupByNetwork && a.network !== b.network) {
      return a.network.localeCompare(b.network);
    }
    
    const volA = parseVolumeToMB(a.package_size_label || a.package_name);
    const volB = parseVolumeToMB(b.package_size_label || b.package_name);
    
    if (volA !== volB) {
      return volA - volB;
    }
    return a.selling_price - b.selling_price;
  });
}
