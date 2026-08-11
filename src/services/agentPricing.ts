/**
 * Agent Pricing Service
 *
 * Manages per-agent selling prices for data bundles. Each agent sets the
 * full selling price they want to charge customers. Profit is automatically
 * computed as `selling_price - data_packages.agent_base_price` by the DB.
 *
 * Writes go through `upsert_agent_bundle_price` RPC which validates
 * floor/ceiling and ownership.
 */
import { supabase } from "@/integrations/supabase/client";
import { sortPackagesAutomatically, type DataPackage } from "@/services/packageCatalog";

export interface AgentBundlePrice {
  id: string;
  agent_profile_id: string;
  package_id: string;
  selling_price: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** A package joined with the agent's pricing decision (or unset). */
export interface PricingRow {
  pkg: DataPackage;
  base: number;          // admin-defined cost to agent (data_packages.agent_base_price)
  selling: number | null; // agent's chosen selling price (null = not set yet)
  profit: number;        // selling - base, 0 if unset
  isPublished: boolean;
  priceId: string | null;
}

/** Fetch all resaleable packages + this agent's existing prices, joined.
 *  Packages come from `list_agent_resaleable_packages` (agent-scoped RPC) which
 *  exposes `agent_base_price` but never `supplier_price`. */
export async function fetchAgentPricingMatrix(agentProfileId: string): Promise<PricingRow[]> {
  const [{ data: pkgs }, { data: prices }] = await Promise.all([
    (supabase as any).rpc("list_agent_resaleable_packages"),
    supabase
      .from("agent_bundle_prices" as any)
      .select("*")
      .eq("agent_profile_id", agentProfileId),
  ]);

  const priceMap = new Map<string, AgentBundlePrice>();
  ((prices as any[]) ?? []).forEach((p) => priceMap.set(p.package_id, p as AgentBundlePrice));

  const sortedPkgs = sortPackagesAutomatically((pkgs as any[]) ?? [], true);
  return sortedPkgs.map((pkg: any) => {
    const ap = priceMap.get(pkg.id);
    const base = Number(pkg.agent_base_price ?? 0);
    const selling = ap ? Number(ap.selling_price) : null;
    return {
      pkg: pkg as DataPackage,
      base,
      selling,
      profit: selling != null ? Math.max(selling - base, 0) : 0,
      isPublished: ap?.is_published ?? false,
      priceId: ap?.id ?? null,
    };
  });
}

/** Save (upsert) a single bundle price. Returns server-validated row. */
export async function saveAgentBundlePrice(packageId: string, sellingPrice: number) {
  const { data, error } = await supabase.rpc("upsert_agent_bundle_price" as any, {
    _package_id: packageId,
    _selling_price: sellingPrice,
  });
  if (error) throw new Error(error.message);
  return (data as any[])?.[0] ?? null;
}

/** Bulk-save many prices. Best-effort, returns successes + failures per package. */
export async function bulkSaveAgentBundlePrices(
  rows: { packageId: string; sellingPrice: number }[],
): Promise<{ ok: string[]; failed: { packageId: string; error: string }[] }> {
  const ok: string[] = [];
  const failed: { packageId: string; error: string }[] = [];
  for (const r of rows) {
    try {
      await saveAgentBundlePrice(r.packageId, r.sellingPrice);
      ok.push(r.packageId);
    } catch (e: any) {
      failed.push({ packageId: r.packageId, error: e?.message || "Unknown error" });
    }
  }
  return { ok, failed };
}

/** Public storefront read: agent's published bundles with their prices.
 *  Uses the anon-safe `get_public_agent_bundles` RPC, which joins the agent's
 *  published prices to the catalog server-side and never returns cost columns
 *  (supplier_price / agent_base_price). Commission base pricing is resolved
 *  server-side by `handle_order_delivered_commission`. */
export async function fetchPublishedAgentBundles(agentProfileId: string) {
  const { data, error } = await (supabase as any).rpc("get_public_agent_bundles", {
    _agent_profile_id: agentProfileId,
  });
  if (error) throw error;
  if (!data || (data as any[]).length === 0) return [];

  return sortPackagesAutomatically(data as any[], true) as (DataPackage & {
    _agent_base_price?: number;
  })[];
}

