/**
 * Edge Function: fulfill-order
 *
 * Reusable order fulfillment service.
 * Receives an order_id, selects a supplier, submits the request,
 * logs everything, and updates order status through the pipeline.
 *
 * Supports: guest, user, agent, admin-recovery orders.
 * Current: stub supplier (simulates instant delivery).
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

/** ── Stub Supplier Implementation ── */
async function submitToStubSupplier(
  order: Record<string, unknown>,
  _supplier: Record<string, unknown>
): Promise<SupplierResult> {
  // Simulate a brief processing delay
  await new Promise((r) => setTimeout(r, 500));

  const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
  const ref = `STUB-${Date.now().toString(36).toUpperCase()}`;

  // Stub always succeeds for now — swap this with real API calls later
  return {
    outcome: "delivered",
    supplier_reference: ref,
    delivery_message: `${snapshot.volume || ""} ${order.network || ""} data delivered to ${order.beneficiary_number || "recipient"}.`,
    error_message: null,
    raw_response: {
      stub: true,
      reference: ref,
      status: "success",
      timestamp: new Date().toISOString(),
    },
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

    // ═══════════════════════════════════════════════════
    // 1. FETCH ORDER
    // ═══════════════════════════════════════════════════
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);

    // Only fulfill paid/queued orders
    if (!["paid", "queued"].includes(order.status)) {
      return json({
        error: `Order is in '${order.status}' state and cannot be submitted`,
        order_id: order.id,
      }, 409);
    }

    // ═══════════════════════════════════════════════════
    // 2. SELECT SUPPLIER
    // ═══════════════════════════════════════════════════
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    // Find supplier that supports this network
    let selectedSupplier = null;
    if (suppliers && suppliers.length > 0) {
      for (const s of suppliers) {
        const networks = (s.supported_networks as string[]) || [];
        if (networks.length === 0 || networks.includes(order.network)) {
          selectedSupplier = s;
          break;
        }
      }
      // Fallback to first active supplier
      if (!selectedSupplier) selectedSupplier = suppliers[0];
    }

    // If no supplier configured, create a virtual stub entry
    if (!selectedSupplier) {
      selectedSupplier = {
        id: null,
        provider_code: "stub",
        name: "Stub Supplier",
      };
    }

    // ═══════════════════════════════════════════════════
    // 3. UPDATE ORDER → submitting
    // ═══════════════════════════════════════════════════
    const oldStatus = order.status;
    await supabase
      .from("orders")
      .update({ status: "processing", supplier_status: "submitting" })
      .eq("id", order_id);

    await logStatusChange(supabase, order_id, oldStatus, "processing", "fulfillment_service", "Submitting to supplier");

    // ═══════════════════════════════════════════════════
    // 4. SUBMIT TO SUPPLIER
    // ═══════════════════════════════════════════════════
    const requestStarted = new Date().toISOString();
    let result: SupplierResult;

    try {
      const providerCode = (selectedSupplier as Record<string, unknown>).provider_code as string;

      if (providerCode === "stub" || !providerCode) {
        result = await submitToStubSupplier(order, selectedSupplier as Record<string, unknown>);
      } else {
        // Future: route to real supplier implementations
        // e.g. if (providerCode === "vtpass") result = await submitToVTPass(order, selectedSupplier);
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

    // ═══════════════════════════════════════════════════
    // 5. LOG SUPPLIER REQUEST
    // ═══════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════
    // 6. UPDATE ORDER WITH RESULT
    // ═══════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════
    // 7. AUDIT LOG
    // ═══════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════
    // 8. RETURN RESULT
    // ═══════════════════════════════════════════════════
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
