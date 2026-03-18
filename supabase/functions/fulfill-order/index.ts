/**
 * Edge Function: fulfill-order
 *
 * Reusable order fulfillment service.
 * Receives an order_id, selects a supplier, submits the request,
 * logs everything, and updates order status through the pipeline.
 *
 * Supports: stub supplier + real supplier API via endpoint_config.
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
  return path.split(".").reduce((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
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
    outcome: "delivered",
    supplier_reference: ref,
    delivery_message: `${snapshot.volume || ""} ${order.network || ""} data delivered to ${order.beneficiary_number || "recipient"}.`,
    error_message: null,
    raw_response: { stub: true, reference: ref, status: "success", timestamp: new Date().toISOString() },
  };
}

/** ── Real Supplier API Implementation ── */
async function submitToSupplierApi(
  order: Record<string, unknown>,
  supplier: Record<string, unknown>
): Promise<SupplierResult> {
  const endpointConfig = (supplier.endpoint_config || {}) as Record<string, unknown>;
  const authConfig = (supplier.auth_config || {}) as Record<string, unknown>;
  const submitEndpoint = (endpointConfig.submit_order || {}) as Record<string, unknown>;
  const statusMapping = (endpointConfig.status_mapping || {}) as Record<string, string>;
  const orderRequestMapping = (endpointConfig.order_request_mapping || {}) as Record<string, string>;
  const orderResponseMapping = (endpointConfig.order_response_mapping || {}) as Record<string, string>;
  const reverseNetworkMapping = (endpointConfig.reverse_network_mapping || {}) as Record<string, string>;

  const submitPath = (submitEndpoint.path as string) || "/orders";
  const submitMethod = (submitEndpoint.method as string) || "POST";

  // Build auth headers
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

  // Build request body using field mapping
  const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
  const mappedNetwork = reverseNetworkMapping[order.network as string] || (order.network as string);

  const requestBody: Record<string, unknown> = {};
  // Default mapping if not configured
  const phoneField = orderRequestMapping.phone || "phone";
  const productCodeField = orderRequestMapping.product_code || "product_code";
  const networkField = orderRequestMapping.network || "network";
  const amountField = orderRequestMapping.amount || "amount";
  const referenceField = orderRequestMapping.reference || "reference";

  requestBody[phoneField] = order.beneficiary_number;
  requestBody[productCodeField] = order.bundle_code;
  requestBody[networkField] = mappedNetwork;
  requestBody[amountField] = order.amount_charged;
  requestBody[referenceField] = order.public_order_id;

  // Add any extra static fields from config
  const extraFields = (submitEndpoint.extra_fields || {}) as Record<string, unknown>;
  Object.assign(requestBody, extraFields);

  // Make the API call
  const apiUrl = `${supplier.api_base_url}${submitPath}`;
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

  const responseData = await apiRes.json().catch(() => ({ raw: await apiRes.text() }));

  if (!apiRes.ok) {
    return {
      outcome: "failed",
      supplier_reference: null,
      delivery_message: null,
      error_message: `Supplier API returned ${apiRes.status}: ${JSON.stringify(responseData).slice(0, 300)}`,
      raw_response: responseData as Record<string, unknown>,
    };
  }

  // Parse response using mapping
  const respStatusField = orderResponseMapping.status || "status";
  const respReferenceField = orderResponseMapping.reference || "reference";
  const respMessageField = orderResponseMapping.message || "message";

  const rawStatus = String(getNestedValue(responseData as Record<string, unknown>, respStatusField) || "unknown");
  const supplierRef = String(getNestedValue(responseData as Record<string, unknown>, respReferenceField) || "");
  const supplierMsg = String(getNestedValue(responseData as Record<string, unknown>, respMessageField) || "");

  // Normalize supplier status to outcome
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

  return {
    outcome,
    supplier_reference: supplierRef || null,
    delivery_message: supplierMsg || null,
    error_message: outcome === "failed" ? (supplierMsg || rawStatus) : null,
    raw_response: responseData as Record<string, unknown>,
  };
}

/** ── Status history helper ── */
async function logStatusChange(
  supabase: ReturnType<typeof createClient>,
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { order_id } = body;

    if (!order_id) return json({ error: "Missing order_id" }, 400);

    // ═══ 1. FETCH ORDER ═══
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);

    if (!["paid", "queued", "failed"].includes(order.status)) {
      return json({
        error: `Order is in '${order.status}' state and cannot be submitted`,
        order_id: order.id,
      }, 409);
    }

    // ═══ 2. SELECT SUPPLIER ═══
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    let selectedSupplier = null;
    if (suppliers && suppliers.length > 0) {
      for (const s of suppliers) {
        const networks = (s.supported_networks as string[]) || [];
        if (networks.length === 0 || networks.includes(order.network)) {
          selectedSupplier = s;
          break;
        }
      }
      if (!selectedSupplier) selectedSupplier = suppliers[0];
    }

    if (!selectedSupplier) {
      selectedSupplier = { id: null, provider_code: "stub", name: "Stub Supplier" };
    }

    // ═══ 3. UPDATE ORDER → submitting ═══
    const oldStatus = order.status;
    await supabase
      .from("orders")
      .update({ status: "processing", supplier_status: "submitting" })
      .eq("id", order_id);

    await logStatusChange(supabase, order_id, oldStatus, "processing", "fulfillment_service", "Submitting to supplier");

    // ═══ 4. SUBMIT TO SUPPLIER ═══
    const requestStarted = new Date().toISOString();
    let result: SupplierResult;

    try {
      const providerCode = (selectedSupplier as Record<string, unknown>).provider_code as string;
      const supportsSubmission = (selectedSupplier as Record<string, unknown>).supports_order_submission;
      const hasApiUrl = (selectedSupplier as Record<string, unknown>).api_base_url;

      if (supportsSubmission && hasApiUrl && providerCode !== "stub") {
        // Real supplier API submission
        result = await submitToSupplierApi(order, selectedSupplier as Record<string, unknown>);
      } else {
        // Fallback to stub
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

    // ═══ 8. RETURN RESULT ═══
    return json({
      success: result.outcome !== "failed",
      order_id: order_id,
      public_order_id: order.public_order_id,
      status: newOrderStatus,
      supplier_outcome: result.outcome,
      delivery_message: result.delivery_message || deliveryMsg,
      supplier_reference: result.supplier_reference,
    });
  } catch (err) {
    console.error("fulfill-order error:", err);
    return json({ error: "An unexpected error occurred during fulfillment" }, 500);
  }
});
