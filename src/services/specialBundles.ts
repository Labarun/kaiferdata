/**
 * Special Bundle Service (user / agent facing)
 *
 * A MANUALLY-FULFILLED, MTN-only special offer sold WALLET-ONLY. It is fully
 * isolated from the normal bundle/order system: its own tables
 * (`special_bundle_packages`, `special_bundle_orders`,
 * `special_bundle_status_history`) and its own secure RPCs.
 *
 * The frontend NEVER controls the amount charged or the buyer identity — the
 * `purchase_special_bundle_atomic` RPC resolves both server-side from
 * auth.uid() and the package's stored prices.
 *
 * NOTE: the tables/RPCs are created by the Lovable backend migration. Until the
 * Supabase types are regenerated, `.from()` / `.rpc()` are cast to `any`
 * (same pattern used across this codebase for newer tables).
 */
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SpecialBundleType = "data" | "data_airtime";
export type SpecialOrderStatus = "pending" | "processing" | "delivered" | "cancelled" | "refunded";
export type SpecialPriceTier = "user" | "agent";
export type SpecialDeliveryEta = "instant" | "few_minutes" | "max_2h" | "max_4h" | "over_4h";

export interface SpecialBundlePackage {
  id: string;
  name: string;
  size_label: string;
  bundle_type: SpecialBundleType;
  network: string;
  supplier_price: number;
  user_price: number;
  agent_price: number;
  currency: string;
  delivery_note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialBundleOrder {
  id: string;
  public_order_id: string;
  user_id: string;
  buyer_role: "user" | "agent";
  package_id: string | null;
  package_snapshot: Record<string, unknown> | null;
  recipient_number: string;
  network: string;
  price_tier: SpecialPriceTier;
  amount_charged: number;
  currency: string;
  status: SpecialOrderStatus;
  supplier_reference: string | null;
  admin_note: string | null;
  wallet_debit_txn_id: string | null;
  wallet_refund_txn_id: string | null;
  refund_requested: boolean;
  refund_request_reason: string | null;
  refund_requested_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecialStatusHistoryEntry {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface SpecialSettings {
  offerEnabled: boolean;
  eta: SpecialDeliveryEta;
}

export interface SpecialPurchaseResult {
  order_id: string;
  public_order_id: string;
  amount_charged: number;
  new_balance: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const SPECIAL_OFFER_NETWORK = "MTN";

/** Support contact (reuses the platform's WhatsApp support line). */
export const SUPPORT_WHATSAPP_URL = "https://wa.me/233204471969";

export const SPECIAL_SETTING_KEYS = {
  enabled: "special_bundle_offer_enabled",
  eta: "special_bundle_delivery_eta",
} as const;

/** Delivery tracker options — SEPARATE from the normal bundle tracker. */
export const DELIVERY_ETA_OPTIONS: Record<
  SpecialDeliveryEta,
  { label: string; short: string; helper: string; tone: string }
> = {
  instant: {
    label: "Instant",
    short: "Instant",
    helper: "Bundles are currently being delivered almost immediately.",
    tone: "text-success",
  },
  few_minutes: {
    label: "A few minutes",
    short: "A few minutes",
    helper: "Currently delivering within roughly 10–59 minutes.",
    tone: "text-success",
  },
  max_2h: {
    label: "Up to 2 hours",
    short: "Max 2 hours",
    helper: "It can arrive much earlier, but right now it may take up to 2 hours.",
    tone: "text-amber-500",
  },
  max_4h: {
    label: "Up to 4 hours",
    short: "Max 4 hours",
    helper: "It can arrive earlier, but right now it may take up to 4 hours.",
    tone: "text-amber-500",
  },
  over_4h: {
    label: "4 hours or more",
    short: "4 hours+",
    helper: "Delivery may take longer than 4 hours at the moment. It can take several hours.",
    tone: "text-destructive",
  },
};

export const DELIVERY_ETA_ORDER: SpecialDeliveryEta[] = [
  "instant",
  "few_minutes",
  "max_2h",
  "max_4h",
  "over_4h",
];

export const SPECIAL_STATUS_META: Record<
  SpecialOrderStatus,
  { label: string; tone: string; helper: string }
> = {
  pending: {
    label: "Pending",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    helper: "We've received your order and will send it for processing shortly.",
  },
  processing: {
    label: "Processing",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    helper: "Your order has been sent to the supplier and is being delivered.",
  },
  delivered: {
    label: "Delivered",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    helper: "Your bundle has been delivered. Remember: there is no SMS confirmation.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-gray-50 text-gray-600 border-gray-200",
    helper: "This order was cancelled.",
  },
  refunded: {
    label: "Refunded",
    tone: "bg-purple-50 text-purple-700 border-purple-200",
    helper: "This order was refunded back to your wallet.",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function formatGhs(amount: number): string {
  return `GH₵${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function bundleTypeLabel(t: SpecialBundleType): string {
  return t === "data_airtime" ? "Data + Airtime" : "Data";
}

/** Which price tier applies to the current viewer. Active agents pay the agent price. */
export function resolveTier(isActiveAgent: boolean): SpecialPriceTier {
  return isActiveAgent ? "agent" : "user";
}

export function priceForTier(pkg: SpecialBundlePackage, tier: SpecialPriceTier): number {
  return tier === "agent" ? pkg.agent_price : pkg.user_price;
}

/** Normalise a Ghana MTN number to local 0XXXXXXXXX form; returns null if invalid. */
export function normalizeMtnNumber(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("233")) local = "0" + local.slice(3);
  if (local.length === 9 && !local.startsWith("0")) local = "0" + local;
  if (local.length !== 10 || !local.startsWith("0")) return null;
  return local;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

const db = supabase as any;

export async function fetchSpecialSettings(): Promise<SpecialSettings> {
  // Read via a SECURITY DEFINER RPC so it keeps working for normal users even
  // after `system_settings` is locked to admin-only reads by the security pass.
  const { data, error } = await (supabase.rpc as any)("get_special_bundle_settings");
  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data;
    const etaRaw = row?.delivery_eta as SpecialDeliveryEta | undefined;
    return {
      offerEnabled: row?.offer_enabled !== false,
      eta: etaRaw && DELIVERY_ETA_OPTIONS[etaRaw] ? etaRaw : "few_minutes",
    };
  }
  // Safe default while the backend RPC isn't deployed yet.
  return { offerEnabled: true, eta: "few_minutes" };
}

export async function fetchActiveSpecialPackages(): Promise<SpecialBundlePackage[]> {
  const { data, error } = await db
    .from("special_bundle_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as SpecialBundlePackage[];
}

export async function fetchSpecialPackage(id: string): Promise<SpecialBundlePackage | null> {
  const { data, error } = await db
    .from("special_bundle_packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as SpecialBundlePackage) ?? null;
}

export async function fetchWalletBalance(userId: string): Promise<{ balance: number; active: boolean }> {
  const { data } = await db
    .from("wallets")
    .select("current_balance, status")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    balance: Number(data?.current_balance ?? 0),
    active: (data?.status ?? "active") === "active",
  };
}

export async function fetchMySpecialOrders(): Promise<SpecialBundleOrder[]> {
  const { data, error } = await db
    .from("special_bundle_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SpecialBundleOrder[];
}

export async function fetchSpecialOrderWithHistory(
  orderId: string,
): Promise<{ order: SpecialBundleOrder | null; history: SpecialStatusHistoryEntry[] }> {
  const [orderRes, historyRes] = await Promise.all([
    db.from("special_bundle_orders").select("*").eq("id", orderId).maybeSingle(),
    db
      .from("special_bundle_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);
  return {
    order: (orderRes.data as SpecialBundleOrder) ?? null,
    history: (historyRes.data || []) as SpecialStatusHistoryEntry[],
  };
}

/* ------------------------------------------------------------------ */
/* Writes (via secure RPCs)                                            */
/* ------------------------------------------------------------------ */

/** Friendly error extraction shared by the RPC wrappers. */
function rpcError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function placeSpecialOrder(input: {
  packageId: string;
  recipientNumber: string;
}): Promise<SpecialPurchaseResult> {
  const { data, error } = await (supabase.rpc as any)("purchase_special_bundle_atomic", {
    _package_id: input.packageId,
    _recipient_number: input.recipientNumber,
  });
  if (error) throw rpcError(error, "Could not place your order. Please try again.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Order could not be created.");
  return {
    order_id: row.order_id,
    public_order_id: row.public_order_id,
    amount_charged: Number(row.amount_charged),
    new_balance: Number(row.new_balance),
  };
}

export async function requestSpecialRefund(orderId: string, reason: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("request_special_bundle_refund", {
    _order_id: orderId,
    _reason: reason,
  });
  if (error) throw rpcError(error, "Could not submit your cancellation request.");
}
