/**
 * Edge Function: supplier-webhook
 *
 * Receives order status update webhooks from AfroHubGH (or any supplier).
 * Validates payload, maps supplier order ref → internal order, updates status.
 *
 * Auth: webhook secret validation (if configured), or open with logging.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINAL_STATUSES = ["delivered", "failed", "cancelled", "refunded"];

function normalizeStatus(rawStatus: string, statusMapping: Record<string, string>): string {
  const mapped = statusMapping[rawStatus] || statusMapping[rawStatus.toLowerCase()];
  if (mapped) return mapped;

  const lower = rawStatus.toLowerCase();
  if (lower.includes("deliver") || lower.includes("success") || lower.includes("complet")) return "delivered";
  if (lower.includes("fail") || lower.includes("error") || lower.includes("reject")) return "failed";
  if (lower.includes("cancel")) return "cancelled";
  if (lower.includes("process") || lower.includes("pend") || lower.includes("initiat")) return "processing";
  if (lower.includes("queue") || lower.includes("accept")) return "queued";
  return "processing";
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

    const payload = await req.json();
    const webhookSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization");

    // Log the incoming webhook for audit/debugging
    console.log("Webhook received:", JSON.stringify(payload).slice(0, 500));

    // ── Extract key fields from webhook payload ──
    // Support multiple payload shapes: { reference, status, message } or { data: { ... } }
    const data = payload.data || payload;
    const supplierRef = String(data.reference || data.ref || data.order_ref || data.order_id || "");
    const rawStatus = String(data.status || data.order_status || "");
    const rawMessage = String(data.message || data.delivery_message || "");

    if (!supplierRef) {
      // Log unknown webhook
      await supabase.from("audit_logs").insert({
        action: "webhook_invalid_payload",
        actor_role: "system",
        target_type: "webhook",
        metadata: { payload, headers: { webhook_secret: !!webhookSecret } },
      });
      return json({ error: "Missing order reference in webhook payload" }, 400);
    }

    // ── Validate webhook secret if configured ──
    const { data: webhookSecretSetting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "supplier_webhook_secret")
      .maybeSingle();

    if (webhookSecretSetting?.setting_value) {
      const expectedSecret = webhookSecretSetting.setting_value;
      const receivedSecret = (webhookSecret || "").replace("Bearer ", "");
      if (receivedSecret !== expectedSecret) {
        console.warn("Webhook secret mismatch");
        await supabase.from("audit_logs").insert({
          action: "webhook_auth_failed",
          actor_role: "system",
          target_type: "webhook",
          metadata: { supplier_ref: supplierRef },
        });
        return json({ error: "Unauthorized" }, 401);
      }
    }

    // ── Find internal order by supplier_reference ──
    const { data: order } = await supabase
      .from("orders")
      .select("id, public_order_id, status, supplier_reference, supplier_status, network, bundle_snapshot")
      .eq("supplier_reference", supplierRef)
      .maybeSingle();

    if (!order) {
      // Try by public_order_id as fallback
      const { data: orderByPublic } = await supabase
        .from("orders")
        .select("id, public_order_id, status, supplier_reference, supplier_status, network, bundle_snapshot")
        .eq("public_order_id", supplierRef)
        .maybeSingle();

      if (!orderByPublic) {
        await supabase.from("audit_logs").insert({
          action: "webhook_order_not_found",
          actor_role: "system",
          target_type: "webhook",
          metadata: { supplier_ref: supplierRef, payload },
        });
        return json({ error: "Order not found for reference", reference: supplierRef }, 404);
      }
      // Use the found order
      return await processWebhookUpdate(supabase, orderByPublic, rawStatus, rawMessage, payload);
    }

    return await processWebhookUpdate(supabase, order, rawStatus, rawMessage, payload);
  } catch (err) {
    console.error("supplier-webhook error:", err);
    return json({ error: "Internal error processing webhook" }, 500);
  }
});

async function processWebhookUpdate(
  supabase: ReturnType<typeof createClient>,
  order: Record<string, unknown>,
  rawStatus: string,
  rawMessage: string,
  payload: unknown,
) {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  if (!rawStatus) {
    return json({ success: true, message: "No status in webhook, logged only" });
  }

  // Fetch status mapping from supplier config
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, endpoint_config")
    .eq("is_active", true)
    .limit(1);

  let statusMapping: Record<string, string> = {};
  let supplierId: string | null = null;
  if (suppliers && suppliers.length > 0) {
    supplierId = suppliers[0].id;
    const endpointConfig = (suppliers[0].endpoint_config || {}) as Record<string, unknown>;
    statusMapping = (endpointConfig.status_mapping || {}) as Record<string, string>;
  }

  const normalizedStatus = normalizeStatus(rawStatus, statusMapping);
  const currentStatus = order.status as string;

  // Don't downgrade final statuses
  if (FINAL_STATUSES.includes(currentStatus) && !FINAL_STATUSES.includes(normalizedStatus)) {
    return json({ success: true, message: "Order already in final state", current_status: currentStatus });
  }

  // Only update if status changed
  if (normalizedStatus === currentStatus && rawStatus === order.supplier_status) {
    return json({ success: true, message: "Status unchanged" });
  }

  const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
  let deliveryMessage: string | null = null;
  if (normalizedStatus === "delivered") {
    deliveryMessage = rawMessage || `${snapshot.volume || ""} ${order.network} data bundle delivered successfully.`;
  } else if (normalizedStatus === "failed") {
    deliveryMessage = rawMessage || "Delivery failed. Our team has been notified.";
  }

  // Update order
  await supabase
    .from("orders")
    .update({
      status: normalizedStatus,
      supplier_status: rawStatus,
      ...(deliveryMessage ? { delivery_message: deliveryMessage } : {}),
    })
    .eq("id", order.id);

  // Log status change
  await supabase.from("order_status_history").insert({
    order_id: order.id as string,
    old_status: currentStatus,
    new_status: normalizedStatus,
    source: "supplier_webhook",
    note: `Webhook status: ${rawStatus}${rawMessage ? ` — ${rawMessage}` : ""}`,
    metadata: { raw_payload: payload, supplier_id: supplierId },
  });

  // Log in supplier request logs
  await supabase.from("supplier_request_logs").insert({
    supplier_id: supplierId,
    order_id: order.id as string,
    request_payload: { source: "webhook" },
    response_payload: payload as Record<string, unknown>,
    normalized_result: normalizedStatus,
    is_success: true,
    supplier_reference: order.supplier_reference as string,
    request_started_at: new Date().toISOString(),
    response_received_at: new Date().toISOString(),
  });

  // Audit log
  await supabase.from("audit_logs").insert({
    action: "webhook_order_status_updated",
    actor_role: "system",
    target_type: "order",
    target_id: order.id as string,
    metadata: {
      public_order_id: order.public_order_id,
      old_status: currentStatus,
      new_status: normalizedStatus,
      raw_supplier_status: rawStatus,
    },
  });

  return json({
    success: true,
    order_id: order.id,
    public_order_id: order.public_order_id,
    old_status: currentStatus,
    new_status: normalizedStatus,
  });
}
