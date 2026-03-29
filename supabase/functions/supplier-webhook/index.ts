/**
 * Edge Function: supplier-webhook
 *
 * Receives order status update webhooks from AfroHubGH.
 * HMAC-SHA256 signature verification, safe status transitions, full audit trail.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-webhook-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINAL_STATUSES = ["delivered", "failed", "cancelled", "refunded"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

async function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader) return false;
  try {
    // Support "sha256=XXXX" or plain hex
    const sig = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
    const expected = hmac("sha256", secret, rawBody, "utf8", "hex") as string;
    // Constant-time comparison
    if (sig.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < sig.length; i++) {
      mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rawBody = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    console.log("Webhook received:", rawBody.slice(0, 500));

    // ── Signature / Secret Verification ──
    const webhookSecret = Deno.env.get("SUPPLIER_WEBHOOK_SECRET") || "";
    
    // Also check DB-stored secret as fallback
    let dbSecret = "";
    const { data: webhookSecretSetting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "supplier_webhook_secret")
      .maybeSingle();
    if (webhookSecretSetting?.setting_value) {
      dbSecret = webhookSecretSetting.setting_value;
    }

    const activeSecret = webhookSecret || dbSecret;

    if (activeSecret) {
      const sigHeader = req.headers.get("x-webhook-signature") || req.headers.get("x-hub-signature-256");
      const legacyHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");

      let verified = false;

      // Try HMAC signature first
      if (sigHeader) {
        verified = await verifySignature(rawBody, sigHeader, activeSecret);
      }

      // Fallback: simple secret match (legacy)
      if (!verified && legacyHeader) {
        const received = legacyHeader.replace("Bearer ", "");
        verified = received === activeSecret;
      }

      if (!verified) {
        console.warn("Webhook auth failed — signature/secret mismatch");
        await supabase.from("audit_logs").insert({
          action: "webhook_auth_failed",
          actor_role: "system",
          target_type: "webhook",
          metadata: { has_sig: !!sigHeader, has_legacy: !!legacyHeader },
        });
        return json({ error: "Unauthorized" }, 401);
      }
    } else {
      console.warn("No webhook secret configured — accepting without verification");
    }

    // ── Extract fields ──
    const data = (payload.data || payload) as Record<string, unknown>;
    const supplierRef = String(data.reference || data.ref || data.order_ref || data.order_id || "");
    const rawStatus = String(data.status || data.order_status || "");
    const rawMessage = String(data.message || data.delivery_message || "");

    if (!supplierRef) {
      await supabase.from("audit_logs").insert({
        action: "webhook_invalid_payload",
        actor_role: "system",
        target_type: "webhook",
        metadata: { payload },
      });
      return json({ error: "Missing order reference" }, 400);
    }

    // ── Find order ──
    let order = await findOrder(supabase, "supplier_reference", supplierRef);
    if (!order) {
      order = await findOrder(supabase, "public_order_id", supplierRef);
    }

    if (!order) {
      await supabase.from("audit_logs").insert({
        action: "webhook_order_not_found",
        actor_role: "system",
        target_type: "webhook",
        metadata: { supplier_ref: supplierRef },
      });
      return json({ error: "Order not found", reference: supplierRef }, 404);
    }

    return await processUpdate(supabase, order, rawStatus, rawMessage, payload);
  } catch (err) {
    console.error("supplier-webhook error:", err);
    return json({ error: "Internal error" }, 500);
  }
});

async function findOrder(supabase: ReturnType<typeof createClient>, field: string, value: string) {
  const { data } = await supabase
    .from("orders")
    .select("id, public_order_id, status, supplier_reference, supplier_status, network, bundle_snapshot")
    .eq(field, value)
    .maybeSingle();
  return data;
}

async function processUpdate(
  supabase: ReturnType<typeof createClient>,
  order: Record<string, unknown>,
  rawStatus: string,
  rawMessage: string,
  payload: unknown,
) {
  if (!rawStatus) {
    return json({ success: true, message: "No status in webhook, logged only" });
  }

  // Get supplier config for status mapping
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, endpoint_config")
    .eq("is_active", true)
    .limit(1);

  let statusMapping: Record<string, string> = {};
  let supplierId: string | null = null;
  if (suppliers?.length) {
    supplierId = suppliers[0].id;
    const cfg = (suppliers[0].endpoint_config || {}) as Record<string, unknown>;
    statusMapping = (cfg.status_mapping || {}) as Record<string, string>;
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

  // Safe transitions: don't downgrade final statuses
  if (FINAL_STATUSES.includes(currentStatus) && !FINAL_STATUSES.includes(normalizedStatus)) {
    await supabase.from("audit_logs").insert({
      action: "webhook_transition_blocked",
      actor_role: "system",
      target_type: "order",
      target_id: order.id as string,
      metadata: { current: currentStatus, attempted: normalizedStatus, raw: rawStatus },
    });
    return json({ success: true, message: "Order already in final state", current_status: currentStatus });
  }

  // Build delivery message
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

  // Status history
  await supabase.from("order_status_history").insert({
    order_id: order.id as string,
    old_status: currentStatus,
    new_status: normalizedStatus,
    source: "supplier_webhook",
    note: `Webhook: ${rawStatus}${rawMessage ? ` — ${rawMessage}` : ""}`,
    metadata: { raw_payload: payload, supplier_id: supplierId },
  });

  // Supplier request log
  const now = new Date().toISOString();
  await supabase.from("supplier_request_logs").insert({
    supplier_id: supplierId,
    order_id: order.id as string,
    request_payload: { source: "webhook" },
    response_payload: payload as Record<string, unknown>,
    normalized_result: normalizedStatus,
    is_success: true,
    supplier_reference: order.supplier_reference as string,
    request_started_at: now,
    response_received_at: now,
  });

  // Audit
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
