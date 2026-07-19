/**
 * Customer-facing status sanitizer.
 *
 * Maps internal/operational status values and supplier-leaked text into
 * clean, customer-safe labels and messages. Used across success pages,
 * track order, and order detail surfaces. Admin / staff / internal tools
 * MUST NOT use this — they need the raw operational text.
 */

export type CustomerStatusKey =
  | "placed"
  | "processing"
  | "delivered"
  | "failed"
  | "cancelled"
  | "refunded"
  | "on_hold";

const STATUS_MAP: Record<string, CustomerStatusKey> = {
  // Orders
  paid: "placed",
  queued: "processing",
  submitting: "processing",
  processing: "processing",
  supplier_submitted: "processing",
  supplier_processing: "processing",
  supplier_accepted: "processing",
  supplier_pending: "processing",
  pending: "processing",
  delivered: "delivered",
  supplier_delivered: "delivered",
  completed: "delivered",
  failed: "failed",
  supplier_failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
  on_hold: "on_hold",
};

const LABELS: Record<CustomerStatusKey, string> = {
  placed: "Order Placed",
  processing: "Processing",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  on_hold: "Pending verification",
};

const HELPERS: Record<CustomerStatusKey, string> = {
  placed: "Your order has been placed and will start processing shortly.",
  processing: "Your order is being processed. It will be delivered according to the current delivery speed of the provider.",
  delivered: "Your data bundle was delivered successfully.",
  failed: "Do not worry, the team has been alerted and your order will be reprocessed shortly.",
  cancelled: "This order was cancelled.",
  refunded: "This order has been refunded.",
  on_hold: "Recipient number is being verified on the MTN portal. The order will be delivered once verification is completed.",
};

/** Map any raw status string to a customer-safe key. */
export function toCustomerStatusKey(raw: string | null | undefined): CustomerStatusKey {
  const s = String(raw || "").trim().toLowerCase();
  return STATUS_MAP[s] ?? "processing";
}

/** Customer-facing label for a raw status. */
export function customerStatusLabel(raw: string | null | undefined): string {
  return LABELS[toCustomerStatusKey(raw)];
}

/** Short reassuring helper line for a raw status. */
export function customerStatusHelper(raw: string | null | undefined): string {
  return HELPERS[toCustomerStatusKey(raw)];
}

/**
 * Strip supplier / internal-leak phrases from any free-form message
 * shown to customers (e.g. delivery_message, status history note).
 * Returns null if nothing customer-safe is left.
 *
 * Pass `currentStatus` (raw or customer key) so stale phrases like
 * "being processed" or "will arrive shortly" can be dropped when the
 * order has already moved past processing (e.g. is now Delivered).
 */
export function sanitizeCustomerMessage(
  raw: string | null | undefined,
  currentStatus?: string | null,
): string | null {
  if (!raw) return null;
  let text = String(raw);

  // Remove "Webhook: ..." / "Supplier status: ..." prefixes entirely.
  text = text.replace(/^\s*(webhook|supplier status|supplier|provider)\s*[:\-—]\s*/i, "");

  // Normalize payment confirmation text from webhook plumbing.
  text = text.replace(/payment confirmed\s*(via\s*paystack\s*webhook)?/gi, "Payment Confirmed.");

  // Remove explicit supplier id / reference fragments like "(supplier ref: XYZ)" or "supplier ref XYZ".
  text = text.replace(/\(?\s*supplier\s*(ref(?:erence)?|id|status)\s*[:\-=]?\s*[a-z0-9_\-]+\s*\)?/gi, "");

  // Replace any remaining "supplier"/"provider" word with "system" so nothing leaks.
  text = text.replace(/\bsuppliers?\b/gi, "system").replace(/\bproviders?\b/gi, "system");

  // Collapse leftover whitespace / orphan punctuation.
  text = text.replace(/\s{2,}/g, " ").replace(/^[\s\-—:]+|[\s\-—:]+$/g, "").trim();

  // If what remains is empty or pure noise, drop it.
  if (!text || /^[\s\-—:]+$/.test(text)) return null;
  // Also drop if it's just a status word we already show separately.
  if (/^(paid|queued|processing|delivered|failed|cancelled|refunded|completed|on_hold)$/i.test(text)) return null;

  // Drop stale "still processing" phrasing once the order has actually
  // moved past processing — otherwise a Delivered order shows
  // "Your bundle is being processed. It will arrive shortly." which
  // contradicts the badge above it.
  if (currentStatus) {
    const key = toCustomerStatusKey(currentStatus);
    if (key !== "processing" && key !== "placed") {
      const stale = /(being processed|is processing|will arrive shortly|arriving shortly|in progress|currently processing)/i;
      if (stale.test(text)) return null;
    }
  }

  return text;
}

/**
 * Build a clean customer-facing bundle label from a snapshot, removing
 * duplicated network words. Avoids "MTN 2GB MTN" by stripping any
 * occurrence of the network name from the plan/bundle name before
 * combining it with the volume.
 *
 * Output format: "<volume> <PlanName>" (e.g. "2GB Heavy") or just
 * the plan name if volume is missing.
 */
export function customerBundleLabel(
  snapshot: Record<string, unknown> | null | undefined,
  network?: string | null,
): string {
  const snap = (snapshot || {}) as Record<string, unknown>;
  const volume = String(snap.volume ?? snap.package_size_label ?? snap.package_volume_value ?? "").trim();
  let name = String(snap.plan_name ?? snap.package_name ?? snap.bundle_name ?? "").trim();

  // Strip the network name (e.g. "MTN", "Telecel", "AirtelTigo") so we
  // don't end up with "MTN 2GB MTN bundle".
  if (network) {
    const net = String(network).trim();
    if (net) {
      const escaped = net.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      name = name.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "").trim();
    }
  }
  // Also strip the volume token from the name to avoid "2GB 2GB Heavy".
  if (volume) {
    const escaped = volume.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    name = name.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "").trim();
  }
  // Collapse leftover punctuation / whitespace from removals.
  name = name.replace(/\s*[-—–:]\s*$/g, "").replace(/^\s*[-—–:]\s*/g, "").replace(/\s{2,}/g, " ").trim();

  if (volume && name) return `${volume} ${name}`;
  if (volume) return volume;
  return name || "Data bundle";
}
