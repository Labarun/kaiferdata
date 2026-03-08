/**
 * Edge Function: recover-order
 *
 * Admin recovery tool for missing-order cases.
 * Reuses the SAME order creation + fulfillment path as verify-payment.
 *
 * Accepts either:
 *   { payment_record_id: "..." }   — recover from a verified payment with no order
 *   { intent_id: "..." }           — recover from a stuck intent
 *
 * Safety:
 *   - Only works for verified payments
 *   - Blocks if order already exists (idempotent)
 *   - Requires admin auth (service role or JWT with admin role)
 *   - Full audit logging
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `KD-ORD-${ts}${rand}`;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Authenticate admin ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    // Allow service role key directly (internal calls)
    let adminUserId: string | null = null;
    if (token !== supabaseServiceKey) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);

      const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!hasAdmin) return json({ error: "Admin access required" }, 403);
      adminUserId = user.id;
    }

    const body = await req.json();
    const { payment_record_id, intent_id, reason } = body;

    if (!payment_record_id && !intent_id) {
      return json({ error: "Provide payment_record_id or intent_id" }, 400);
    }

    // ═══════════════════════════════════════════════════
    // 1. RESOLVE PAYMENT + INTENT
    // ═══════════════════════════════════════════════════
    let payment: Record<string, unknown> | null = null;
    let intent: Record<string, unknown> | null = null;

    if (payment_record_id) {
      const { data } = await supabase.from("payment_records").select("*").eq("id", payment_record_id).single();
      payment = data;
    }

    if (intent_id) {
      const { data } = await supabase.from("purchase_intents").select("*").eq("id", intent_id).single();
      intent = data;
    }

    // If we have payment but not intent, find the intent
    if (payment && !intent && payment.intent_id) {
      const { data } = await supabase.from("purchase_intents").select("*").eq("id", payment.intent_id as string).single();
      intent = data;
    }

    // If we have intent but not payment, find the payment
    if (intent && !payment) {
      const { data } = await supabase.from("payment_records").select("*").eq("intent_id", intent.id as string).eq("status", "verified").maybeSingle();
      payment = data;
    }

    // ═══════════════════════════════════════════════════
    // 2. ELIGIBILITY CHECKS
    // ═══════════════════════════════════════════════════
    const blocks: string[] = [];

    if (!payment) blocks.push("No verified payment record found.");
    else if (payment.status !== "verified") blocks.push(`Payment status is '${payment.status}', not 'verified'.`);

    if (!intent) blocks.push("No purchase intent found.");

    // Check if order already exists
    if (payment) {
      const { data: existingByPayment } = await supabase
        .from("orders")
        .select("id, public_order_id")
        .eq("payment_record_id", payment.id as string)
        .maybeSingle();
      if (existingByPayment) {
        blocks.push(`Order already exists: ${existingByPayment.public_order_id}`);
      }
    }

    if (intent) {
      const { data: existingByIntent } = await supabase
        .from("orders")
        .select("id, public_order_id")
        .eq("intent_id", intent.id as string)
        .maybeSingle();
      if (existingByIntent) {
        blocks.push(`Order already exists for this intent: ${existingByIntent.public_order_id}`);
      }
    }

    // Validate intent has required data
    if (intent && (!intent.phone_number || !intent.network || !intent.plan_snapshot)) {
      blocks.push("Intent is missing required data (phone, network, or plan).");
    }

    if (blocks.length > 0) {
      // Log blocked attempt
      await supabase.from("audit_logs").insert({
        action: "recovery_attempt_blocked",
        actor_id: adminUserId,
        actor_role: "admin",
        target_type: "payment_record",
        target_id: payment?.id as string || intent?.id as string || null,
        metadata: { blocks, reason: reason || null, payment_record_id, intent_id },
      });

      return json({ error: "Recovery blocked", blocks }, 409);
    }

    // ═══════════════════════════════════════════════════
    // 3. CREATE ORDER (same path as verify-payment)
    // ═══════════════════════════════════════════════════
    const snapshot = (intent!.plan_snapshot as Record<string, unknown>) || {};
    const publicOrderId = generateOrderId();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        public_order_id: publicOrderId,
        actor_type: intent!.actor_type || "guest",
        actor_id: intent!.actor_id || null,
        origin_type: intent!.intent_type || "guest_buy",
        source_channel: intent!.source_channel || "public_guest_checkout",
        beneficiary_number: intent!.phone_number as string,
        network: intent!.network as string,
        bundle_name: String(snapshot.plan_name || ""),
        bundle_code: String(snapshot.plan_code || ""),
        bundle_snapshot: intent!.plan_snapshot,
        amount_charged: Number(payment!.amount),
        currency: "GHS",
        intent_id: intent!.id as string,
        payment_record_id: payment!.id as string,
        status: "paid",
        metadata: {
          customer_name: intent!.customer_name,
          customer_email: intent!.customer_email,
          recovered_by_admin: true,
          recovery_reason: reason || "Missing order recovery",
          recovered_at: new Date().toISOString(),
          admin_user_id: adminUserId,
        },
      })
      .select()
      .single();

    if (orderErr) {
      console.error("Recovery order creation failed:", orderErr);
      await supabase.from("audit_logs").insert({
        action: "recovery_order_creation_failed",
        actor_id: adminUserId,
        actor_role: "admin",
        target_type: "payment_record",
        target_id: payment!.id as string,
        metadata: { error: orderErr.message, reason },
      });
      return json({ error: "Failed to create recovered order", detail: orderErr.message }, 500);
    }

    // ═══════════════════════════════════════════════════
    // 4. UPDATE INTENT → completed
    // ═══════════════════════════════════════════════════
    await supabase
      .from("purchase_intents")
      .update({
        status: "completed",
        order_context: {
          ...((intent!.order_context as Record<string, unknown>) || {}),
          order_id: order.id,
          public_order_id: publicOrderId,
          recovered: true,
          completed_at: new Date().toISOString(),
        },
      })
      .eq("id", intent!.id as string);

    // ═══════════════════════════════════════════════════
    // 5. STATUS HISTORY
    // ═══════════════════════════════════════════════════
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "paid",
      source: "admin_recovery",
      note: `Order recovered by admin. Reason: ${reason || "Missing order"}`,
      metadata: { admin_user_id: adminUserId, payment_record_id: payment!.id },
    });

    // ═══════════════════════════════════════════════════
    // 6. AUDIT LOG
    // ═══════════════════════════════════════════════════
    await supabase.from("audit_logs").insert({
      action: "missing_order_recovered",
      actor_id: adminUserId,
      actor_role: "admin",
      target_type: "order",
      target_id: order.id,
      metadata: {
        public_order_id: publicOrderId,
        intent_reference: intent!.intent_reference,
        payment_id: payment!.id,
        amount: payment!.amount,
        network: intent!.network,
        phone: intent!.phone_number,
        reason: reason || null,
      },
    });

    // ═══════════════════════════════════════════════════
    // 7. TRIGGER FULFILLMENT
    // ═══════════════════════════════════════════════════
    let fulfillmentResult = null;
    try {
      const fulfillRes = await fetch(
        `${supabaseUrl}/functions/v1/fulfill-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ order_id: order.id }),
        }
      );
      fulfillmentResult = await fulfillRes.json();
    } catch (err) {
      console.error("Recovery fulfillment trigger failed:", err);
    }

    // Refetch order
    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order.id)
      .single();

    return json({
      success: true,
      order: updatedOrder || order,
      fulfillment: fulfillmentResult,
      message: `Order ${publicOrderId} recovered successfully.`,
    });
  } catch (err) {
    console.error("recover-order error:", err);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
