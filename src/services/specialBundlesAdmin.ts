/**
 * Special Bundle Admin Service
 *
 * Admin-side management for the manually-fulfilled special offer: order
 * status transitions, cancel + refund-to-wallet, package CRUD, the global
 * delivery ETA / kill-switch, and supplier copy helpers.
 *
 * All money + status mutations go through SECURITY DEFINER RPCs that verify
 * the caller is an admin via has_role(auth.uid(),'admin'); the frontend only
 * formats and orchestrates.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  SPECIAL_SETTING_KEYS,
  bundleTypeLabel,
  formatGhs,
  type SpecialBundleOrder,
  type SpecialBundlePackage,
  type SpecialBundleType,
  type SpecialDeliveryEta,
  type SpecialOrderStatus,
} from "@/services/specialBundles";

const db = supabase as any;

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export interface SpecialOrderFilters {
  status?: SpecialOrderStatus | "all";
  search?: string;
  refundRequestedOnly?: boolean;
}

export async function fetchAllSpecialOrders(filters: SpecialOrderFilters = {}): Promise<SpecialBundleOrder[]> {
  let query = db.from("special_bundle_orders").select("*").order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.refundRequestedOnly) {
    query = query.eq("refund_requested", true);
  }
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, "");
    query = query.or(`public_order_id.ilike.%${term}%,recipient_number.ilike.%${term}%`);
  }

  const { data, error } = await query.limit(500);
  if (error) throw error;
  return (data || []) as SpecialBundleOrder[];
}

export async function countPendingSpecialOrders(): Promise<number> {
  const { count, error } = await db
    .from("special_bundle_orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count || 0;
}

export async function setSpecialOrderStatus(
  orderId: string,
  status: Exclude<SpecialOrderStatus, "refunded">,
  note?: string,
): Promise<void> {
  const { error } = await (supabase.rpc as any)("admin_set_special_bundle_status", {
    _order_id: orderId,
    _new_status: status,
    _note: note ?? null,
  });
  if (error) throw new Error(error.message || "Could not update order status.");
}

export async function bulkSetSpecialOrderStatus(
  orderIds: string[],
  status: Exclude<SpecialOrderStatus, "refunded">,
  note?: string,
): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  for (const id of orderIds) {
    try {
      await setSpecialOrderStatus(id, status, note);
      updated += 1;
    } catch (e) {
      errors.push(`${id}: ${(e as Error).message}`);
    }
  }
  return { updated, errors };
}

export async function cancelAndRefundSpecialOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("admin_cancel_refund_special_bundle", {
    _order_id: orderId,
    _reason: reason,
  });
  if (error) throw new Error(error.message || "Could not cancel and refund the order.");
}

/* ------------------------------------------------------------------ */
/* Supplier copy helpers                                               */
/* ------------------------------------------------------------------ */

/** Build a clean, paste-ready block to forward a single order to the supplier. */
export function formatOrderForSupplier(order: SpecialBundleOrder): string {
  const snap = (order.package_snapshot || {}) as Record<string, unknown>;
  const offer =
    (snap.name as string) ||
    [snap.size_label, snap.bundle_type ? bundleTypeLabel(snap.bundle_type as SpecialBundleType) : null]
      .filter(Boolean)
      .join(" ") ||
    "Special bundle";
  const size = (snap.size_label as string) || "";
  const type = snap.bundle_type ? bundleTypeLabel(snap.bundle_type as SpecialBundleType) : "";
  return [
    `Order: ${order.public_order_id}`,
    `Network: ${order.network}`,
    `Number: ${order.recipient_number}`,
    `Offer: ${offer}`,
    size || type ? `Bundle: ${[size, type].filter(Boolean).join(" · ")}` : null,
    `Qty: 1`,
    `Amount: ${formatGhs(order.amount_charged)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Build a paste-ready block for many orders at once. */
export function formatOrdersForSupplierBulk(orders: SpecialBundleOrder[]): string {
  return orders.map((o) => formatOrderForSupplier(o)).join("\n\n———\n\n");
}

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

export function userProfit(pkg: { supplier_price: number; user_price: number }): number {
  return Number(pkg.user_price || 0) - Number(pkg.supplier_price || 0);
}

export function agentProfit(pkg: { supplier_price: number; agent_price: number }): number {
  return Number(pkg.agent_price || 0) - Number(pkg.supplier_price || 0);
}

export type SpecialPackageInput = Omit<
  SpecialBundlePackage,
  "id" | "created_at" | "updated_at"
>;

export async function fetchAllSpecialPackages(): Promise<SpecialBundlePackage[]> {
  const { data, error } = await db
    .from("special_bundle_packages")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as SpecialBundlePackage[];
}

export async function createSpecialPackage(pkg: Partial<SpecialPackageInput>): Promise<SpecialBundlePackage> {
  const { data, error } = await db.from("special_bundle_packages").insert(pkg).select().single();
  if (error) throw error;
  return data as SpecialBundlePackage;
}

export async function updateSpecialPackage(
  id: string,
  updates: Partial<SpecialPackageInput>,
): Promise<SpecialBundlePackage> {
  const { data, error } = await db
    .from("special_bundle_packages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SpecialBundlePackage;
}

export async function deleteSpecialPackage(id: string): Promise<void> {
  const { error } = await db.from("special_bundle_packages").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Settings (delivery ETA + kill switch)                               */
/* ------------------------------------------------------------------ */

/**
 * Writes go through an admin-guarded SECURITY DEFINER RPC that whitelists the
 * two special-bundle setting keys — so it's independent of system_settings RLS.
 */
async function setSpecialSetting(key: string, value: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("admin_set_special_bundle_setting", {
    _key: key,
    _value: value,
  });
  if (error) throw new Error(error.message || "Could not update setting.");
}

export async function setSpecialEta(eta: SpecialDeliveryEta): Promise<void> {
  await setSpecialSetting(SPECIAL_SETTING_KEYS.eta, eta);
}

export async function setSpecialOfferEnabled(enabled: boolean): Promise<void> {
  await setSpecialSetting(SPECIAL_SETTING_KEYS.enabled, enabled ? "true" : "false");
}
