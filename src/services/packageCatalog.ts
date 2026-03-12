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
  created_at: string;
  updated_at: string;
}

export type DataPackageInsert = Omit<DataPackage, "id" | "created_at" | "updated_at">;

/** Fetch packages visible on the public buy page */
export async function fetchPublicPackages(): Promise<DataPackage[]> {
  const { data, error } = await supabase
    .from("data_packages" as any)
    .select("*")
    .eq("is_active", true)
    .eq("visible_on_public", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as any[]) || [];
}

/** Fetch packages visible for logged-in users */
export async function fetchLoggedInPackages(): Promise<DataPackage[]> {
  const { data, error } = await supabase
    .from("data_packages" as any)
    .select("*")
    .eq("is_active", true)
    .eq("visible_for_logged_in", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as any[]) || [];
}

/** Fetch all packages (admin view — includes inactive) */
export async function fetchAllPackages(): Promise<DataPackage[]> {
  const { data, error } = await supabase
    .from("data_packages" as any)
    .select("*")
    .order("network", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data as any[]) || [];
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
