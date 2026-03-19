/**
 * Edge Function: verify-payment
 * 
 * Verifies a Paystack transaction. Handles two flows:
 * - Bundle purchase → creates payment record + order
 * - Wallet deposit → creates payment record + credits wallet (base amount only)
 * 
 * Idempotent: re-calling with an already-verified reference returns existing result.
 * Fee-aware: stores base_amount, fee_amount, fee_rate, total_amount on payment records.
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // ═══ 1. IDEMPOTENCY CHECK ═══
    const { data: existingPayment } = await supabase
      .from("payment_records")
      .select("id, status, intent_id")
      .eq("provider_reference", reference)
      .eq("provider", "paystack")
      .maybeSingle();

    if (existingPayment?.status === "verified") {
      const { data: existingIntent } = await supabase
        .from("purchase_intents")
        .select("intent_type")
        .eq("id", existingPayment.intent_id)
        .maybeSingle();

      if (existingIntent?.intent_type === "wallet_deposit") {
        return json({ success: true, already_processed: true, intent_type: "wallet_deposit" });
      }

      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_record_id", existingPayment.id)
        .maybeSingle();

      if (existingOrder) {
        return json({ success: true, already_processed: true, order: existingOrder });
      }
    }

    // ═══ 2. VERIFY WITH PAYSTACK ═══
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.status) {
      console.error("Paystack verify API error:", verifyData);
      return json({ error: "Unable to verify payment with provider" }, 502);
    }

    const txn = verifyData.data;
    const paystackStatus = txn.status;
    const amountPaidGhs = txn.amount / 100;
    const customerEmail = txn.customer?.email || null;

    // ═══ 3. FIND THE INTENT ═══
    const { data: intent, error: intentErr } = await supabase
      .from("purchase_intents")
      .select("*")
      .eq("intent_reference", reference)
      .maybeSingle();

    if (intentErr || !intent) {
      return json({ error: "Intent not found for this reference" }, 404);
    }

    if (intent.status === "completed") {
      if (intent.intent_type === "wallet_deposit") {
        return json({ success: true, already_processed: true, intent_type: "wallet_deposit" });
      }
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("intent_id", intent.id)
        .maybeSingle();
      if (existingOrder) {
        return json({ success: true, already_processed: true, order: existingOrder });
      }
    }

    const isDeposit = intent.intent_type === "wallet_deposit";

    // Extract fee breakdown from intent (set during initialize-payment)
    const intentBaseAmount = Number(intent.base_amount) || Number(intent.amount_expected);
    const intentFeeAmount = Number(intent.fee_amount) || 0;
    const intentFeeRate = Number(intent.fee_rate) || 0;
    const intentTotalAmount = Number(intent.total_amount) || Number(intent.amount_expected);

    // ═══ 4. HANDLE NON-SUCCESS ═══
    if (paystackStatus !== "success") {
      const failStatus = paystackStatus === "abandoned" ? "expired" : "failed";

      await supabase
        .from("purchase_intents")
        .update({ status: failStatus })
        .eq("id", intent.id);

      await supabase.from("payment_records").upsert(
        {
          provider: "paystack",
          provider_reference: reference,
          internal_reference: intent.intent_reference,
          intent_id: intent.id,
          amount: amountPaidGhs,
          base_amount: intentBaseAmount,
          fee_amount: intentFeeAmount,
          fee_rate: intentFeeRate,
          total_amount: amountPaidGhs,
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
        intent_type: intent.intent_type,
        error: paystackStatus === "abandoned"
          ? "Payment was cancelled"
          : "Payment failed. Please try again.",
        intent_reference: intent.intent_reference,
      });
    }

    // ═══ 5. VERIFY AMOUNT (against total_amount which includes fee) ═══
    const expectedTotal = intentTotalAmount;
    if (Math.abs(amountPaidGhs - expectedTotal) > 0.50) {
      console.error(`Amount mismatch: expected ${expectedTotal}, got ${amountPaidGhs} for ${reference}`);

      await supabase
        .from("purchase_intents")
        .update({
          status: "failed",
          order_context: {
            ...((intent.order_context as Record<string, unknown>) || {}),
            amount_mismatch: true,
            paid_amount: amountPaidGhs,
            expected_amount: expectedTotal,
          },
        })
        .eq("id", intent.id);

      return json({ error: "Payment amount does not match. Contact support." }, 422);
    }

    // ═══ 6. CREATE PAYMENT RECORD (with fee breakdown) ═══
    const { data: paymentRecord, error: prErr } = await supabase
      .from("payment_records")
      .upsert(
        {
          provider: "paystack",
          provider_reference: reference,
          internal_reference: intent.intent_reference,
          intent_id: intent.id,
          amount: amountPaidGhs,
          base_amount: intentBaseAmount,
          fee_amount: intentFeeAmount,
          fee_rate: intentFeeRate,
          total_amount: amountPaidGhs,
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

    // ═══ 7. UPDATE INTENT → payment_confirmed ═══
    await supabase
      .from("purchase_intents")
      .update({ status: "payment_confirmed" })
      .eq("id", intent.id);

    // ═══ BRANCH: DEPOSIT vs PURCHASE ═══
    if (isDeposit) {
      // For deposits, credit wallet with BASE amount only (not fee)
      return await handleDeposit(supabase, intent, paymentRecord, intentBaseAmount, reference, intentFeeAmount);
    } else {
      // For orders, amount_charged is the base amount (product price)
      return await handlePurchase(supabase, intent, paymentRecord, intentBaseAmount, reference, intentFeeAmount);
    }
  } catch (err) {
    console.error("verify-payment error:", err);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});

/** Handle wallet deposit: credit wallet with BASE amount (not fee) */
async function handleDeposit(
  supabase: ReturnType<typeof createClient>,
  intent: Record<string, unknown>,
  paymentRecord: Record<string, unknown>,
  baseAmount: number,
  reference: string,
  feeAmount: number,
) {
  const userId = intent.actor_id as string;

  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("id, current_balance")
    .eq("user_id", userId)
    .single();

  if (walletErr || !wallet) {
    console.error("Wallet not found for deposit:", walletErr);
    return json({ error: "Wallet not found. Contact support.", payment_verified: true }, 500);
  }

  const openingBalance = Number(wallet.current_balance);
  // Credit only the base amount, NOT the fee
  const closingBalance = openingBalance + baseAmount;

  const { error: updateErr } = await supabase
    .from("wallets")
    .update({ current_balance: closingBalance })
    .eq("id", wallet.id);

  if (updateErr) {
    console.error("Failed to credit wallet:", updateErr);
    return json({ error: "Payment verified but wallet credit failed. Contact support.", payment_verified: true }, 500);
  }

  await supabase.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    transaction_type: "credit",
    direction: "inflow",
    amount: baseAmount,
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    status: "completed",
    narration: `Wallet deposit via Paystack — ${reference} (Fee: GHS ${feeAmount.toFixed(2)})`,
    reference: reference,
    linked_record_id: paymentRecord.id as string,
    linked_record_type: "payment_record",
    created_by: userId,
  });

  await supabase
    .from("purchase_intents")
    .update({
      status: "completed",
      order_context: {
        ...((intent.order_context as Record<string, unknown>) || {}),
        wallet_credited: true,
        credited_amount: baseAmount,
        fee_amount: feeAmount,
        total_charged: baseAmount + feeAmount,
        new_balance: closingBalance,
        completed_at: new Date().toISOString(),
      },
    })
    .eq("id", intent.id);

  await supabase.from("audit_logs").insert({
    action: "wallet_deposit_completed",
    actor_id: userId,
    actor_role: "user",
    target_type: "wallet",
    target_id: wallet.id,
    metadata: {
      base_amount: baseAmount,
      fee_amount: feeAmount,
      total_charged: baseAmount + feeAmount,
      reference,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      payment_record_id: paymentRecord.id,
    },
  });

  return json({
    success: true,
    intent_type: "wallet_deposit",
    deposit: {
      amount: baseAmount,
      fee: feeAmount,
      total_charged: baseAmount + feeAmount,
      new_balance: closingBalance,
      reference,
    },
  });
}

/** Handle bundle purchase: create order (amount_charged = base amount) */
async function handlePurchase(
  supabase: ReturnType<typeof createClient>,
  intent: Record<string, unknown>,
  paymentRecord: Record<string, unknown>,
  baseAmount: number,
  reference: string,
  feeAmount: number,
) {
  const snapshot = (intent.plan_snapshot as Record<string, unknown>) || {};
  const publicOrderId = generateOrderId();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      public_order_id: publicOrderId,
      actor_type: (intent.actor_type as string) || "guest",
      actor_id: (intent.actor_id as string) || null,
      origin_type: (intent.intent_type as string) || "guest_buy",
      source_channel: (intent.source_channel as string) || "public_guest_checkout",
      beneficiary_number: intent.phone_number as string,
      network: intent.network as string,
      bundle_name: String(snapshot.plan_name || snapshot.package_name || ""),
      bundle_code: String(snapshot.plan_code || snapshot.package_code || ""),
      bundle_snapshot: intent.plan_snapshot,
      amount_charged: baseAmount, // Order value = base amount (product price)
      currency: "GHS",
      intent_id: intent.id as string,
      payment_record_id: paymentRecord.id as string,
      status: "paid",
      metadata: {
        customer_name: intent.customer_name,
        customer_email: intent.customer_email,
        paystack_reference: reference,
        paystack_fee: feeAmount,
        total_charged: baseAmount + feeAmount,
      },
    })
    .select()
    .single();

  if (orderErr) {
    console.error("Failed to create order:", orderErr);
    return json({ error: "Payment verified but order creation failed. Contact support.", payment_verified: true }, 500);
  }

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

  await supabase.from("audit_logs").insert({
    action: "order_created_from_payment",
    actor_role: "system",
    target_type: "order",
    target_id: order.id,
    metadata: {
      public_order_id: publicOrderId,
      intent_reference: intent.intent_reference,
      paystack_reference: reference,
      base_amount: baseAmount,
      fee_amount: feeAmount,
      total_charged: baseAmount + feeAmount,
      network: intent.network,
      phone: intent.phone_number,
    },
  });

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    old_status: null,
    new_status: "paid",
    source: "verify_payment",
    note: `Order created from verified Paystack payment (Base: GHS ${baseAmount.toFixed(2)}, Fee: GHS ${feeAmount.toFixed(2)})`,
    metadata: { paystack_reference: reference, base_amount: baseAmount, fee_amount: feeAmount },
  });

  // Trigger fulfillment (fire-and-forget)
  let fulfillmentResult = null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
  } catch (fulfillErr) {
    console.error("Fulfillment trigger failed (non-blocking):", fulfillErr);
  }

  const { data: updatedOrder } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order.id)
    .single();

  return json({
    success: true,
    intent_type: intent.intent_type,
    order: updatedOrder || order,
    fulfillment: fulfillmentResult,
  });
}
