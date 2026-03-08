/**
 * Edge Function: verify-payment
 * 
 * Verifies a Paystack transaction, updates purchase intent,
 * creates a payment record, and creates a real order.
 * 
 * Idempotent: re-calling with an already-verified reference returns the existing order.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Generate a public order ID: KD-ORD-XXXXXXXX */
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
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) return json({ error: "Payment provider not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { reference } = body;

    if (!reference || typeof reference !== "string") {
      return json({ error: "Missing payment reference" }, 400);
    }

    // ═══════════════════════════════════════════════════
    // 1. IDEMPOTENCY CHECK — already have an order for this reference?
    // ═══════════════════════════════════════════════════
    const { data: existingPayment } = await supabase
      .from("payment_records")
      .select("id, status, intent_id")
      .eq("provider_reference", reference)
      .eq("provider", "paystack")
      .maybeSingle();

    if (existingPayment?.status === "verified") {
      // Already verified — find the order and return it
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_record_id", existingPayment.id)
        .maybeSingle();

      if (existingOrder) {
        return json({
          success: true,
          already_processed: true,
          order: existingOrder,
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // 2. VERIFY WITH PAYSTACK
    // ═══════════════════════════════════════════════════
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.status) {
      console.error("Paystack verify API error:", verifyData);
      return json({ error: "Unable to verify payment with provider" }, 502);
    }

    const txn = verifyData.data;
    const paystackStatus = txn.status; // "success", "failed", "abandoned"
    const amountPaidPesewas = txn.amount; // in pesewas
    const amountPaidGhs = amountPaidPesewas / 100;
    const customerEmail = txn.customer?.email || null;

    // ═══════════════════════════════════════════════════
    // 3. FIND THE PURCHASE INTENT
    // ═══════════════════════════════════════════════════
    const { data: intent, error: intentErr } = await supabase
      .from("purchase_intents")
      .select("*")
      .eq("intent_reference", reference)
      .maybeSingle();

    if (intentErr || !intent) {
      return json({ error: "Purchase intent not found for this reference" }, 404);
    }

    // Already converted?
    if (intent.status === "completed") {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("intent_id", intent.id)
        .maybeSingle();

      if (existingOrder) {
        return json({ success: true, already_processed: true, order: existingOrder });
      }
    }

    // ═══════════════════════════════════════════════════
    // 4. HANDLE NON-SUCCESS
    // ═══════════════════════════════════════════════════
    if (paystackStatus !== "success") {
      const failStatus =
        paystackStatus === "abandoned" ? "expired" : "failed";

      await supabase
        .from("purchase_intents")
        .update({ status: failStatus })
        .eq("id", intent.id);

      // Create/update payment record as failed
      await supabase.from("payment_records").upsert(
        {
          provider: "paystack",
          provider_reference: reference,
          internal_reference: intent.intent_reference,
          intent_id: intent.id,
          amount: amountPaidGhs,
          currency: "GHS",
          customer_email: customerEmail,
          status: "failed",
          provider_response: txn,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "provider,provider_reference" }
      );

      return json({
        success: false,
        status: paystackStatus,
        error:
          paystackStatus === "abandoned"
            ? "Payment was cancelled"
            : "Payment failed. Please try again.",
        intent_reference: intent.intent_reference,
      });
    }

    // ═══════════════════════════════════════════════════
    // 5. VERIFY AMOUNT MATCHES
    // ═══════════════════════════════════════════════════
    const expectedAmount = Number(intent.amount_expected);
    if (Math.abs(amountPaidGhs - expectedAmount) > 0.01) {
      console.error(
        `Amount mismatch: expected ${expectedAmount}, got ${amountPaidGhs} for ${reference}`
      );

      await supabase
        .from("purchase_intents")
        .update({
          status: "failed",
          order_context: {
            ...((intent.order_context as Record<string, unknown>) || {}),
            amount_mismatch: true,
            paid_amount: amountPaidGhs,
            expected_amount: expectedAmount,
          },
        })
        .eq("id", intent.id);

      return json(
        { error: "Payment amount does not match expected amount. Contact support." },
        422
      );
    }

    // ═══════════════════════════════════════════════════
    // 6. CREATE PAYMENT RECORD
    // ═══════════════════════════════════════════════════
    const { data: paymentRecord, error: prErr } = await supabase
      .from("payment_records")
      .upsert(
        {
          provider: "paystack",
          provider_reference: reference,
          internal_reference: intent.intent_reference,
          intent_id: intent.id,
          amount: amountPaidGhs,
          currency: "GHS",
          customer_email: customerEmail,
          customer_identifier: txn.customer?.customer_code || null,
          status: "verified",
          provider_response: txn,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "provider,provider_reference" }
      )
      .select()
      .single();

    if (prErr) {
      console.error("Failed to create payment record:", prErr);
      return json({ error: "Failed to record payment" }, 500);
    }

    // ═══════════════════════════════════════════════════
    // 7. UPDATE PURCHASE INTENT → payment_confirmed
    // ═══════════════════════════════════════════════════
    await supabase
      .from("purchase_intents")
      .update({ status: "payment_confirmed" })
      .eq("id", intent.id);

    // ═══════════════════════════════════════════════════
    // 8. CREATE ORDER (the reusable order-creation block)
    // ═══════════════════════════════════════════════════
    const snapshot = (intent.plan_snapshot as Record<string, unknown>) || {};
    const publicOrderId = generateOrderId();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        public_order_id: publicOrderId,
        actor_type: intent.actor_type || "guest",
        actor_id: intent.actor_id || null,
        origin_type: intent.intent_type || "guest_buy",
        source_channel: intent.source_channel || "public_guest_checkout",
        beneficiary_number: intent.phone_number,
        network: intent.network,
        bundle_name: String(snapshot.plan_name || ""),
        bundle_code: String(snapshot.plan_code || ""),
        bundle_snapshot: intent.plan_snapshot,
        amount_charged: amountPaidGhs,
        currency: "GHS",
        intent_id: intent.id,
        payment_record_id: paymentRecord.id,
        status: "paid",
        metadata: {
          customer_name: intent.customer_name,
          customer_email: intent.customer_email,
          paystack_reference: reference,
        },
      })
      .select()
      .single();

    if (orderErr) {
      console.error("Failed to create order:", orderErr);
      return json({ error: "Payment verified but order creation failed. Contact support.", payment_verified: true }, 500);
    }

    // ═══════════════════════════════════════════════════
    // 9. UPDATE INTENT → completed
    // ═══════════════════════════════════════════════════
    await supabase
      .from("purchase_intents")
      .update({
        status: "completed",
        order_context: {
          ...((intent.order_context as Record<string, unknown>) || {}),
          order_id: order.id,
          public_order_id: publicOrderId,
          completed_at: new Date().toISOString(),
        },
      })
      .eq("id", intent.id);

    // ═══════════════════════════════════════════════════
    // 10. LOG AUDIT EVENT
    // ═══════════════════════════════════════════════════
    await supabase.from("audit_logs").insert({
      action: "order_created_from_payment",
      actor_role: "system",
      target_type: "order",
      target_id: order.id,
      metadata: {
        public_order_id: publicOrderId,
        intent_reference: intent.intent_reference,
        paystack_reference: reference,
        amount: amountPaidGhs,
        network: intent.network,
        phone: intent.phone_number,
      },
    });

    return json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("verify-payment error:", err);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
