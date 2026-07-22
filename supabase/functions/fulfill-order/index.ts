/**
 * Edge Function: fulfill-order (HARDENED + ATOMIC)
 *
 * Reusable order fulfillment service.
 * Receives an order_id, validates payment, selects a supplier, submits the request,
 * logs everything, and updates order status through the pipeline.
 *
 * SECURITY:
 * - Atomic order claiming via DB function (prevents duplicate supplier submission)
 * - Verifies payment record exists and is verified before submission
 * - Checks system toggle for order_submission_enabled
 * - In-memory rate limiting per order_id
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** ── Normalized supplier outcomes ── */
type SupplierOutcome = "delivered" | "processing" | "accepted" | "failed" | "unknown";

interface SupplierResult {
  outcome: SupplierOutcome;
  supplier_reference: string | null;
  delivery_message: string | null;
  error_message: string | null;
  raw_response: Record<string, unknown>;
}

/** Map normalized outcome → order status */
function outcomeToOrderStatus(outcome: SupplierOutcome): string {
  switch (outcome) {
    case "delivered": return "delivered";
    case "processing": return "processing";
    case "accepted": return "queued";
    case "failed": return "failed";
    default: return "processing";
  }
}

/** Map outcome → customer-facing message */
function outcomeToMessage(outcome: SupplierOutcome, network: string, volume: string): string {
  switch (outcome) {
    case "delivered":
      return `${volume} ${network} data bundle delivered successfully.`;
    case "processing":
      return `Your ${volume} ${network} bundle is being processed. It will arrive shortly.`;
    case "accepted":
      return `Your order has been accepted and is queued for delivery.`;
    case "failed":
      return `We couldn't deliver your bundle at this time. Our team has been notified and will resolve this.`;
    default:
      return `Your order is being reviewed. Please check back shortly.`;
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
    obj as unknown,
  );
}

function normalizeToken(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_]/g, "");
}

function normalizeSize(value: unknown): string {
  return normalizeToken(value).replace(/(\d)(gb|mb|tb)/g, "$1$2");
}

function extractNumericValue(value: unknown): string | null {
  const normalized = String(value || "").trim();
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

function resolveDataAmountValue(order: Record<string, unknown>, supplierPlanId: string): string {
  const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
  return (
    extractNumericValue(snapshot.volume) ||
    extractNumericValue(snapshot.package_size_label) ||
    extractNumericValue(snapshot.package_volume_value) ||
    extractNumericValue(order.bundle_code) ||
    supplierPlanId
  );
}

function isUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function looksLikeMachineId(value: string): boolean {
  const v = String(value || "").trim();
  return isUuid(v) || /^ORD-[A-Z0-9-]+$/i.test(v);
}

// ── Simple in-memory rate limiter ──
const recentRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3; // max 3 fulfill calls per order per minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (recentRequests.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  recentRequests.set(key, timestamps);
  if (recentRequests.size > 1000) {
    for (const [k, v] of recentRequests) {
      if (v.every(t => now - t > RATE_LIMIT_WINDOW_MS)) recentRequests.delete(k);
    }
  }
  return true;
}

/** ── Stub Supplier Implementation ── */
async function submitToStubSupplier(
  order: Record<string, unknown>,
  _supplier: Record<string, unknown>
): Promise<SupplierResult> {
  await new Promise((r) => setTimeout(r, 500));
  const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
  const ref = `STUB-${Date.now().toString(36).toUpperCase()}`;
  return {
    outcome: "accepted",
    supplier_reference: ref,
    delivery_message: `${snapshot.volume || ""} ${order.network || ""} data queued for manual processing.`,
    error_message: null,
    raw_response: { stub: true, reference: ref, status: "queued", timestamp: new Date().toISOString() },
  };
}

/** ── Real Supplier API Implementation ── */
async function submitToSupplierApi(
  order: Record<string, unknown>,
  supplier: Record<string, unknown>,
  supabaseClient: any
): Promise<SupplierResult> {
  const endpointConfig = (supplier.endpoint_config || {}) as Record<string, unknown>;
  const authConfig = (supplier.auth_config || {}) as Record<string, unknown>;
  const submitEndpoint = (endpointConfig.submit_order || {}) as Record<string, unknown>;
  const statusMapping = (endpointConfig.status_mapping || {}) as Record<string, string>;
  const orderRequestMapping = (endpointConfig.order_request_mapping || {}) as Record<string, string>;
  const orderResponseMapping = (endpointConfig.order_response_mapping || {}) as Record<string, string>;
  const reverseNetworkMapping = (endpointConfig.reverse_network_mapping || {}) as Record<string, string>;
  const networkMapping = (endpointConfig.network_mapping || {}) as Record<string, string>;

  const submitPath = (submitEndpoint.path as string) || "/v1/orders";
  const submitMethod = (submitEndpoint.method as string) || "POST";

  const secretName = (authConfig.secret_name as string) || "SUPPLIER_API_KEY";
  const apiKey = Deno.env.get(secretName);
  if (!apiKey) throw new Error(`Missing supplier secret: ${secretName}`);

  const authType = (authConfig.auth_type as string) || "bearer";
  const headerName = (authConfig.header_name as string) || "Authorization";
  let authHeaderValue: string;
  switch (authType) {
    case "bearer": authHeaderValue = `Bearer ${apiKey}`; break;
    case "api_key": authHeaderValue = apiKey; break;
    default: authHeaderValue = apiKey;
  }

  const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
  const mappedNetwork = reverseNetworkMapping[order.network as string] || (order.network as string);

  let supplierPlanId = order.bundle_code as string;
  let supplierNetworkId = mappedNetwork;

  try {
    const { data: supplierPackages } = await supabaseClient
      .from("data_packages")
      .select("supplier_source_id, package_code, package_name, package_size_label, package_volume_value, source_metadata, updated_at")
      .eq("network", order.network as string)
      .eq("source_type", "supplier_api")
      .not("supplier_source_id", "is", null)
      .order("updated_at", { ascending: false });

    if (supplierPackages && supplierPackages.length > 0) {
      const codeNeedle = normalizeToken(order.bundle_code);
      const sizeHints = new Set<string>();
      const addHint = (v: unknown) => {
        const n = normalizeSize(v);
        if (n) sizeHints.add(n);
      };

      addHint(snapshot.volume);
      addHint(snapshot.package_size_label);
      addHint(snapshot.package_volume_value);
      addHint(order.bundle_name);

      const codeVolumeMatch = String(order.bundle_code || "").match(/(\d+(?:\.\d+)?\s*(?:gb|mb|tb))/i);
      if (codeVolumeMatch) addHint(codeVolumeMatch[1]);

      let pkg = supplierPackages.find((p: Record<string, unknown>) => normalizeToken(p.package_code) === codeNeedle);

      if (!pkg && sizeHints.size > 0) {
        pkg = supplierPackages.find((p: Record<string, unknown>) => {
          const packageValues = [p.package_size_label, p.package_volume_value, p.package_name, p.package_code]
            .map((v) => normalizeSize(v))
            .filter(Boolean);
          return Array.from(sizeHints).some((hint) => packageValues.includes(hint));
        });
      }

      if (!pkg && supplierPackages.length === 1) {
        pkg = supplierPackages[0];
      }

      if (pkg?.supplier_source_id) {
        supplierPlanId = String(pkg.supplier_source_id);

        const meta = (pkg.source_metadata || {}) as Record<string, unknown>;
        const networkObj = meta.network as Record<string, unknown> | undefined;

        if (networkObj?.id) supplierNetworkId = String(networkObj.id);
        else if (meta.network_id) supplierNetworkId = String(meta.network_id);
        else if (meta.networkId) supplierNetworkId = String(meta.networkId);
        else if (isUuid(meta.network)) supplierNetworkId = String(meta.network);
      }

      if (!isUuid(supplierNetworkId)) {
        if (networkMapping[mappedNetwork]) {
          supplierNetworkId = String(networkMapping[mappedNetwork]);
        } else if (networkMapping[mappedNetwork.toLowerCase()]) {
          supplierNetworkId = String(networkMapping[mappedNetwork.toLowerCase()]);
        } else {
          const networkCarrier = supplierPackages.find((p: Record<string, unknown>) => {
            const meta = (p.source_metadata || {}) as Record<string, unknown>;
            const networkObj = meta.network as Record<string, unknown> | undefined;
            return Boolean(networkObj?.id || meta.network_id || meta.networkId || isUuid(meta.network));
          });

          if (networkCarrier) {
            const meta = (networkCarrier.source_metadata || {}) as Record<string, unknown>;
            const networkObj = meta.network as Record<string, unknown> | undefined;
            if (networkObj?.id) supplierNetworkId = String(networkObj.id);
            else if (meta.network_id) supplierNetworkId = String(meta.network_id);
            else if (meta.networkId) supplierNetworkId = String(meta.networkId);
            else if (isUuid(meta.network)) supplierNetworkId = String(meta.network);
          }
        }
      }
    }
  } catch (lookupErr) {
    console.warn("Package lookup failed, using fallbacks:", lookupErr);
  }

  const requestBody: Record<string, unknown> = {};
  const phoneField = orderRequestMapping.phone || "phone";
  const productCodeField = orderRequestMapping.product_code || "product_code";
  const networkField = orderRequestMapping.network || "network";
  const amountField = orderRequestMapping.amount || "amount";
  const referenceField = orderRequestMapping.reference || "reference";

  const expectsPlanId = /_id$/i.test(productCodeField);
  const expectsNetworkId = /_id$/i.test(networkField);

  if (expectsPlanId && (!supplierPlanId || (supplierPlanId === order.bundle_code && !isUuid(supplierPlanId)))) {
    // If it expects a plan ID and we only have the raw code, it might fail if it's not a UUID (depending on supplier).
    // Actually, let's just enforce it for network ID to be safe.
  }
  if (expectsNetworkId && (!supplierNetworkId || !isUuid(supplierNetworkId))) {
    throw new Error(`Unable to resolve supplier network UUID for ${order.network}`);
  }

  requestBody[phoneField] = order.beneficiary_number;
  requestBody[productCodeField] = productCodeField === "data_amount"
    ? resolveDataAmountValue(order, supplierPlanId)
    : supplierPlanId;
  requestBody[networkField] = supplierNetworkId;

  const amountValue = amountField === "data_amount"
    ? resolveDataAmountValue(order, supplierPlanId)
    : order.amount_charged;
  if (amountField !== productCodeField) {
    requestBody[amountField] = amountValue;
  }

  requestBody[referenceField] = order.public_order_id;

  const extraFields = (submitEndpoint.extra_fields || {}) as Record<string, unknown>;
  const webhookUrl = Deno.env.get("SUPPLIER_WEBHOOK_URL") || "";

  for (const [key, value] of Object.entries(extraFields)) {
    if (typeof value === "string" && value.includes("{WEBHOOK_URL}")) {
      requestBody[key] = value.replace("{WEBHOOK_URL}", webhookUrl);
    } else {
      requestBody[key] = value;
    }
  }

  let finalSubmitPath = submitPath;
  if (finalSubmitPath.includes("{network}")) {
    finalSubmitPath = finalSubmitPath.replace("{network}", String(mappedNetwork || ""));
  }

  const apiUrl = `${supplier.api_base_url}${finalSubmitPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), (supplier.request_timeout_ms as number) || 30000);

  const apiRes = await fetch(apiUrl, {
    method: submitMethod,
    headers: {
      "Content-Type": "application/json",
      [headerName]: authHeaderValue,
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  let responseData: Record<string, unknown>;
  const rawText = await apiRes.text();
  try {
    responseData = JSON.parse(rawText);
  } catch {
    responseData = { raw: rawText };
  }

  if (!apiRes.ok) {
    return {
      outcome: "failed",
      supplier_reference: null,
      delivery_message: null,
      error_message: `Supplier API returned ${apiRes.status}: ${JSON.stringify(responseData).slice(0, 300)}`,
      raw_response: responseData,
    };
  }

  const respStatusField = orderResponseMapping.status || "status";
  const respReferenceField = orderResponseMapping.reference || "reference";
  const respMessageField = orderResponseMapping.message || "message";

  let rawStatusVal = getNestedValue(responseData, respStatusField);
  if (rawStatusVal === undefined || rawStatusVal === null || rawStatusVal === "") {
    rawStatusVal = responseData.status || responseData.message || "unknown";
  }
  const rawStatus = String(rawStatusVal);

  let rawRefVal = getNestedValue(responseData, respReferenceField);
  if (rawRefVal === undefined || rawRefVal === null || rawRefVal === "") {
    rawRefVal = responseData.reference || responseData.order_id || "";
  }
  const supplierRef = String(rawRefVal);

  let rawMsgVal = getNestedValue(responseData, respMessageField);
  if (rawMsgVal === undefined || rawMsgVal === null || rawMsgVal === "") {
    rawMsgVal = responseData.message || responseData.details || "";
  }
  const supplierMsg = String(rawMsgVal);

  let outcome: SupplierOutcome;
  const mappedStatus = statusMapping[rawStatus] || statusMapping[rawStatus.toLowerCase()];

  if (mappedStatus) {
    if (mappedStatus === "delivered") outcome = "delivered";
    else if (mappedStatus === "failed") outcome = "failed";
    else if (mappedStatus === "queued") outcome = "accepted";
    else outcome = "processing";
  } else {
    const lower = rawStatus.toLowerCase();
    if (lower.includes("success") || lower.includes("deliver") || lower.includes("complet")) outcome = "delivered";
    else if (lower.includes("fail") || lower.includes("error") || lower.includes("reject")) outcome = "failed";
    else if (lower.includes("accept") || lower.includes("queue")) outcome = "accepted";
    else outcome = "processing";
  }

  const safeMessage = looksLikeMachineId(supplierMsg) ? null : supplierMsg;

  return {
    outcome,
    supplier_reference: supplierRef || null,
    delivery_message: safeMessage || null,
    error_message: outcome === "failed" ? (safeMessage || rawStatus) : null,
    raw_response: responseData,
  };
}

/** ── Status history helper ── */
async function logStatusChange(
  supabase: any,
  orderId: string,
  oldStatus: string | null,
  newStatus: string,
  source: string,
  note?: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    old_status: oldStatus,
    new_status: newStatus,
    source,
    note: note || null,
    metadata: metadata || {},
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ═══ AUTH GATE ═══
    // Only allow:
    //   (a) internal calls bearing the service-role key, OR
    //   (b) admin/staff users (e.g. RetryFulfillmentButton).
    // Blocks arbitrary anon/user callers from triggering fulfillment.
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();

    let authorized = false;
    if (token === supabaseService) {
      authorized = true;
    } else {
      try {
        const userClient = createClient(supabaseUrl, supabaseAnon);
        const { data: userData } = await userClient.auth.getUser(token);
        const uid = userData?.user?.id;
        if (uid) {
          const svc = createClient(supabaseUrl, supabaseService);
          const { data: roles } = await svc
            .from("user_roles")
            .select("role")
            .eq("user_id", uid);
          const roleList = (roles || []).map((r: { role: string }) => r.role);
          if (roleList.includes("admin") || roleList.includes("staff")) {
            authorized = true;
          }
        }
      } catch (_e) {
        // anon / invalid / expired tokens fall through to 403
      }
    }

    if (!authorized) {
      return json({ error: "Forbidden" }, 403);
    }

    const supabase = createClient(supabaseUrl, supabaseService);

    const body = await req.json();
    const { order_id } = body;

    if (!order_id) return json({ error: "Missing order_id" }, 400);

    // ═══ RATE LIMIT CHECK ═══
    if (!checkRateLimit(`fulfill:${order_id}`)) {
      await supabase.from("audit_logs").insert({
        action: "rate_limit_fulfill_order",
        actor_role: "system",
        target_type: "order",
        target_id: order_id,
        metadata: { reason: "too_many_requests" },
      });
      return json({ error: "Too many fulfillment attempts. Please wait." }, 429);
    }

    // ═══ 0. CHECK SYSTEM TOGGLE ═══
    const { data: toggleData } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "order_submission_enabled")
      .maybeSingle();

    if (toggleData?.setting_value === "false") {
      return json({ error: "Order submission is temporarily disabled by admin.", blocked: true }, 503);
    }

    // ═══ 1. ATOMIC ORDER CLAIM ═══
    // This atomically sets status to 'processing' only if currently in 'paid'/'queued'/'failed'
    // Prevents two concurrent fulfill calls from both submitting to supplier
    const { data: claimedRows, error: claimErr } = await supabase.rpc("claim_order_for_fulfillment", {
      _order_id: order_id,
    });

    const order = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;

    if (claimErr || !order) {
      // Could not claim — either order doesn't exist or is already processing/delivered
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, status, supplier_reference, public_order_id")
        .eq("id", order_id)
        .single();

      if (!existingOrder) return json({ error: "Order not found" }, 404);

      if (existingOrder.status === "processing") {
        await supabase.from("audit_logs").insert({
          action: "fulfill_concurrent_blocked",
          actor_role: "system",
          target_type: "order",
          target_id: order_id,
          metadata: { current_status: existingOrder.status, public_order_id: existingOrder.public_order_id },
        });
        return json({ error: "Order is already being processed by another request.", order_id, processing: true }, 409);
      }

      if (["delivered", "cancelled", "refunded"].includes(existingOrder.status)) {
        return json({
          error: `Order is in '${existingOrder.status}' state and cannot be resubmitted`,
          order_id: existingOrder.id,
          supplier_reference: existingOrder.supplier_reference,
        }, 409);
      }

      return json({ error: `Order cannot be claimed for fulfillment (status: ${existingOrder.status})` }, 409);
    }

    // ═══ 1b. VERIFY PAYMENT RECORD EXISTS AND IS VERIFIED ═══
    if (order.payment_record_id) {
      const { data: paymentRec } = await supabase
        .from("payment_records")
        .select("id, status, amount, base_amount, total_amount")
        .eq("id", order.payment_record_id)
        .single();

      if (!paymentRec) {
        console.error(`SECURITY: Order ${order_id} has no valid payment record`);
        // Revert order status since we claimed it
        await supabase.from("orders").update({ status: "paid" }).eq("id", order_id);
        await supabase.from("audit_logs").insert({
          action: "fulfillment_blocked_no_payment",
          actor_role: "system",
          target_type: "order",
          target_id: order_id,
          metadata: { payment_record_id: order.payment_record_id, public_order_id: order.public_order_id },
        });
        return json({ error: "Payment verification required before fulfillment" }, 403);
      }

      if (paymentRec.status !== "verified") {
        console.error(`SECURITY: Order ${order_id} payment not verified. Status: ${paymentRec.status}`);
        await supabase.from("orders").update({ status: "paid" }).eq("id", order_id);
        await supabase.from("audit_logs").insert({
          action: "fulfillment_blocked_payment_unverified",
          actor_role: "system",
          target_type: "order",
          target_id: order_id,
          metadata: { payment_status: paymentRec.status, public_order_id: order.public_order_id },
        });
        return json({ error: "Payment has not been verified" }, 403);
      }

      const paidBase = Number(paymentRec.base_amount) || Number(paymentRec.amount);
      const orderAmount = Number(order.amount_charged);
      if (paidBase < orderAmount - 0.02) {
        console.error(`SECURITY: Underpayment! Paid base: ${paidBase}, order amount: ${orderAmount}. Order: ${order_id}`);
        await supabase.from("orders").update({ status: "paid" }).eq("id", order_id);
        await supabase.from("audit_logs").insert({
          action: "fulfillment_blocked_underpayment",
          actor_role: "system",
          target_type: "order",
          target_id: order_id,
          metadata: {
            paid_base: paidBase,
            order_amount: orderAmount,
            difference: orderAmount - paidBase,
            public_order_id: order.public_order_id,
          },
        });
        return json({ error: "Payment amount insufficient for this order" }, 403);
      }
    }

    // ═══ 1c. CHECK FOR DUPLICATE SUPPLIER SUBMISSION (belt + suspenders) ═══
    if (order.supplier_reference) {
      const { data: existingLogs } = await supabase
        .from("supplier_request_logs")
        .select("id, is_success, normalized_result")
        .eq("order_id", order_id)
        .eq("is_success", true)
        .limit(1);

      if (existingLogs && existingLogs.length > 0) {
        return json({
          error: "Order already submitted to supplier",
          order_id: order.id,
          supplier_reference: order.supplier_reference,
        }, 409);
      }
    }

    // Log the claim
    await logStatusChange(supabase, order_id, order.status, "processing", "fulfillment_service", "Atomically claimed for supplier submission");

    // ═══ 2. SELECT SUPPLIER ═══
    const snapshotForSupplier = (order.bundle_snapshot || {}) as Record<string, unknown>;
    let selectedSupplier = null;
    let actualSourceType = snapshotForSupplier.source_type;
    let linkedSupplierId = null;

    // Always fetch latest package routing data to ensure explicit supplier linking works
    const { data: pkgLookup } = await supabase
      .from("data_packages")
      .select("source_type, source_metadata")
      .eq("network", order.network)
      .eq("package_code", order.bundle_code)
      .maybeSingle();

    if (pkgLookup) {
      if (!actualSourceType && pkgLookup.source_type) {
        actualSourceType = pkgLookup.source_type;
      }
      if (pkgLookup.source_metadata) {
        const meta = pkgLookup.source_metadata as Record<string, unknown>;
        if (meta.supplier_id) linkedSupplierId = String(meta.supplier_id);
      }
    }

    if (actualSourceType === "manual") {
      // Revert status to 'paid' so admin can see it in pending queue and manually process it
      await supabase
        .from("orders")
        .update({
          status: "paid",
          supplier_status: "manual",
          delivery_message: "Order is awaiting manual processing.",
        })
        .eq("id", order_id);

      await logStatusChange(
        supabase,
        order_id,
        "processing",
        "paid",
        "fulfillment_service",
        "Order identified as manual source. Reverted to paid for manual processing.",
        { source_type: "manual" }
      );

      return json({
        success: true,
        order_id,
        public_order_id: order.public_order_id,
        status: "paid",
        supplier_outcome: "manual",
        delivery_message: "Order is awaiting manual processing.",
      });
    }

    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (suppliers && suppliers.length > 0) {
      // 1. Explicitly linked supplier (e.g. from Admin manual selection)
      if (linkedSupplierId) {
        selectedSupplier = suppliers.find(s => String(s.id) === linkedSupplierId);
      }

      // 2. Fallback routing by network priority
      if (!selectedSupplier) {
        for (const s of suppliers) {
          const networks = (s.supported_networks as string[]) || [];
          if (networks.length === 0 || networks.includes(order.network)) {
            selectedSupplier = s;
            break;
          }
        }
      }
      
      if (!selectedSupplier) selectedSupplier = suppliers[0];
    }

    if (!selectedSupplier) {
      selectedSupplier = { id: null, provider_code: "stub", name: "Stub Supplier" };
    }

    // ═══ 4. SUBMIT TO SUPPLIER ═══
    const requestStarted = new Date().toISOString();
    let result: SupplierResult;

    try {
      const providerCode = (selectedSupplier as Record<string, unknown>).provider_code as string;
      const supportsSubmission = (selectedSupplier as Record<string, unknown>).supports_order_submission;
      const hasApiUrl = (selectedSupplier as Record<string, unknown>).api_base_url;

      if (supportsSubmission && hasApiUrl && providerCode !== "stub") {
        result = await submitToSupplierApi(order, selectedSupplier as Record<string, unknown>, supabase);
      } else {
        result = await submitToStubSupplier(order, selectedSupplier as Record<string, unknown>);
      }
    } catch (err) {
      result = {
        outcome: "failed",
        supplier_reference: null,
        delivery_message: null,
        error_message: String(err),
        raw_response: { error: String(err) },
      };
    }

    // ═══ 5. LOG SUPPLIER REQUEST ═══
    const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
    await supabase.from("supplier_request_logs").insert({
      supplier_id: (selectedSupplier as Record<string, unknown>).id as string | null,
      order_id: order_id,
      request_payload: {
        network: order.network,
        phone: order.beneficiary_number,
        plan_code: order.bundle_code,
        amount: order.amount_charged,
        volume: snapshot.volume,
      },
      response_payload: result.raw_response,
      normalized_result: result.outcome,
      is_success: result.outcome === "delivered" || result.outcome === "processing" || result.outcome === "accepted",
      supplier_reference: result.supplier_reference,
      error_message: result.error_message,
      request_started_at: requestStarted,
      response_received_at: new Date().toISOString(),
    });

    // ═══ 6. UPDATE ORDER WITH RESULT ═══
    const newOrderStatus = outcomeToOrderStatus(result.outcome);
    const deliveryMsg = outcomeToMessage(result.outcome, order.network, String(snapshot.volume || ""));

    await supabase
      .from("orders")
      .update({
        status: newOrderStatus,
        supplier_status: result.outcome,
        supplier_reference: result.supplier_reference,
        delivery_message: result.delivery_message || deliveryMsg,
      })
      .eq("id", order_id);

    await logStatusChange(
      supabase,
      order_id,
      "processing",
      newOrderStatus,
      "fulfillment_service",
      result.outcome === "failed"
        ? `Supplier failed: ${result.error_message || "unknown"}`
        : `Supplier ${result.outcome}: ${result.supplier_reference || ""}`,
      { supplier_code: (selectedSupplier as Record<string, unknown>).provider_code, outcome: result.outcome }
    );

    // ═══ 7. AUDIT LOG ═══
    await supabase.from("audit_logs").insert({
      action: `order_${result.outcome}`,
      actor_role: "system",
      target_type: "order",
      target_id: order_id,
      metadata: {
        public_order_id: order.public_order_id,
        outcome: result.outcome,
        supplier_reference: result.supplier_reference,
        supplier_code: (selectedSupplier as Record<string, unknown>).provider_code,
      },
    });

    // ═══ 7b. SAFE WALLET REFUND ═══
    // If this was a wallet-funded order AND the supplier never produced a
    // successful submission (no supplier_reference, no successful log), the
    // user must not lose their balance. The atomic RPC enforces:
    //   - only refunds wallet-paid orders
    //   - never refunds when a successful supplier_request_log exists
    //   - idempotent (safe to call repeatedly)
    let refundResult: Record<string, unknown> | null = null;
    const orderMeta = (order.metadata || {}) as Record<string, unknown>;
    const isWalletPaid =
      orderMeta.payment_method === "wallet" ||
      orderMeta.wallet_paid === true ||
      order.origin_type === "user_buy_wallet";
    const supplierProducedReference = Boolean(result.supplier_reference);

    if (result.outcome === "failed" && isWalletPaid && !supplierProducedReference) {
      try {
        const { data: refundRows, error: refundErr } = await supabase.rpc(
          "refund_wallet_purchase_atomic",
          {
            _order_id: order_id,
            _reason: result.error_message
              ? `Order failed before supplier delivery: ${String(result.error_message).slice(0, 200)}`
              : "Order failed before supplier delivery",
            _actor_id: null,
          }
        );
        if (refundErr) {
          console.error(`[fulfill-order] wallet refund RPC failed for ${order_id}:`, refundErr);
          await supabase.from("audit_logs").insert({
            action: "wallet_refund_rpc_error",
            actor_role: "system",
            target_type: "order",
            target_id: order_id,
            metadata: { error: refundErr.message, public_order_id: order.public_order_id },
          });
        } else {
          const row = Array.isArray(refundRows) ? refundRows[0] : refundRows;
          refundResult = row || null;
        }
      } catch (refundEx) {
        console.error(`[fulfill-order] refund attempt threw for ${order_id}:`, refundEx);
      }
    }

    // ═══ 8. RETURN RESULT ═══
    return json({
      success: result.outcome !== "failed",
      order_id: order_id,
      public_order_id: order.public_order_id,
      status: refundResult?.refunded ? "refunded" : newOrderStatus,
      supplier_outcome: result.outcome,
      delivery_message: result.delivery_message || deliveryMsg,
      supplier_reference: result.supplier_reference,
      wallet_refund: refundResult,
    });
  } catch (err) {
    console.error("fulfill-order error:", err);
    return json({ error: "An unexpected error occurred during fulfillment" }, 500);
  }
});
