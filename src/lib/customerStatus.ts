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
  | "refunded";

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
};

const LABELS: Record<CustomerStatusKey, string> = {
  placed: "Order Placed",
  processing: "Processing",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const HELPERS: Record<CustomerStatusKey, string> = {
  placed: "Your order has been placed and will start processing shortly.",
  processing: "Your order is being processed. This usually completes in a few moments.",
  delivered: "Your data bundle was delivered successfully.",
  failed: "We couldn't complete this order. Any charge will be reversed automatically.",
  cancelled: "This order was cancelled.",
  refunded: "This order has been refunded.",
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
 */
export function sanitizeCustomerMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = String(raw);

  // Remove "Webhook: ..." / "Supplier status: ..." prefixes entirely.
  text = text.replace(/^\s*(webhook|supplier status|supplier|provider)\s*[:\-—]\s*/i, "");

  // Remove explicit supplier id / reference fragments like "(supplier ref: XYZ)" or "supplier ref XYZ".
  text = text.replace(/\(?\s*supplier\s*(ref(?:erence)?|id|status)\s*[:\-=]?\s*[a-z0-9_\-]+\s*\)?/gi, "");

  // Replace any remaining "supplier"/"provider" word with "system" so nothing leaks.
  text = text.replace(/\bsuppliers?\b/gi, "system").replace(/\bproviders?\b/gi, "system");

  // Collapse leftover whitespace / orphan punctuation.
  text = text.replace(/\s{2,}/g, " ").replace(/^[\s\-—:]+|[\s\-—:]+$/g, "").trim();

  // If what remains is empty or pure noise, drop it.
  if (!text || /^[\s\-—:]+$/.test(text)) return null;
  // Also drop if it's just a status word we already show separately.
  if (/^(paid|queued|processing|delivered|failed|cancelled|refunded|completed)$/i.test(text)) return null;

  return text;
}
