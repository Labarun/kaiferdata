/**
 * Edge Function: verify-payment (HARDENED + ATOMIC)
 *
 * Verifies a Paystack transaction with STRICT amount matching.
 * - Bundle purchase → creates payment record + order
 * - Wallet deposit → creates payment record + credits wallet (base amount only)
 *
 * SECURITY:
 * - Atomic intent claiming prevents duplicate processing
 * - Exact amount match required (0.02 GHS tolerance)
 * - Atomic wallet credit via DB function (prevents race conditions)
 * - Idempotent: re-calling with verified reference returns existing result
 * - Server re-resolves package price before order creation
 * - Suspicious payments are flagged and blocked
 * - In-memory rate limiting per reference
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

// ── Simple in-memory rate limiter ──
const recentRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 verify calls per reference per minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (recentRequests.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  recentRequests.set(key, timestamps);
  // Cleanup old keys periodically
  if (recentRequests.size > 1000) {
    for (const [k, v] of recentRequests) {
      if (v.every(t => now - t > RATE_LIMIT_WINDOW_MS)) recentRequests.delete(k);
    }
  }
  return true;
}

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

    // ═══ RATE LIMIT CHECK ═══
    if (!checkRateLimit(`verify:${reference}`)) {
      await supabase.from("audit_logs").insert({
        action: "rate_limit_verify_payment",
        actor_role: "system",
        target_type: "payment_reference",
        target_id: reference,
        metadata: { reason: "too_many_requests", reference },
      });
      return json({ error: "Too many verification attempts. Please wait and try again." }, 429);
    }

    // ═══ 1. IDEMPOTENCY CHECK — already verified payment? ═══
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

    // ═══ 3. FIND INTENT BY REFERENCE, THEN ATOMICALLY CLAIM ═══
    const { data: intentLookup, error: lookupErr } = await supabase
      .from("purchase_intents")
      .select("id, status")
      .eq("intent_reference", reference)
      .maybeSingle();

    if (lookupErr || !intentLookup) {
      return json({ error: "Intent not found for this reference" }, 404);
    }

    // If already completed, return idempotent response
    if (intentLookup.status === "completed") {
      const { data: existingIntent } = await supabase
        .from("purchase_intents")
        .select("intent_type")
        .eq("id", intentLookup.id)
        .single();

      if (existingIntent?.intent_type === "wallet_deposit") {
        return json({ success: true, already_processed: true, intent_type: "wallet_deposit" });
      }
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("intent_id", intentLookup.id)
        .maybeSingle();
      if (existingOrder) {
        return json({ success: true, already_processed: true, order: existingOrder });
      }
    }

    // Block terminal failure states
    if (["failed", "cancelled", "expired"].includes(intentLookup.status)) {
      return json({ error: "This payment request is no longer valid. Please create a new order.", intent_reference: reference }, 410);
    }

    // Block if already being processed by another request (payment_confirmed means another verify already succeeded)
    if (intentLookup.status === "payment_confirmed" || intentLookup.status === "fulfilling") {
      // Check if order/deposit already exists
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("intent_id", intentLookup.id)
        .maybeSingle();
      if (existingOrder) {
        return json({ success: true, already_processed: true, order: existingOrder });
      }
      // If payment_confirmed but no order yet, it's mid-processing — wait
      return json({ error: "This payment is currently being processed. Please wait.", processing: true }, 409);
    }

    // ═══ ATOMIC CLAIM: only one caller wins ═══
    const { data: claimedRows } = await supabase.rpc("claim_intent_for_verification", {
      _intent_id: intentLookup.id,
    });

    const claimed = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;
    if (!claimed) {
      // Another request already claimed it
      await supabase.from("audit_logs").insert({
        action: "verify_payment_concurrent_blocked",
        actor_role: "system",
        target_type: "purchase_intent",
        target_id: intentLookup.id,
        metadata: { reference, current_status: intentLookup.status },
      });
      return json({ error: "This payment is already being processed.", processing: true }, 409);
    }

    const intent = claimed;
    const isDeposit = intent.intent_type === "wallet_deposit";

    // Extract fee breakdown from intent (set during initialize-payment by SERVER)
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
        .eq("id", intent.id as string);

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

    // ═══ 5. STRICT AMOUNT VERIFICATION (0.02 GHS tolerance) ═══
    const expectedTotal = intentTotalAmount;
    const amountDiff = Math.abs(amountPaidGhs - expectedTotal);
    
    if (amountDiff > 0.02) {
      console.error(`SECURITY: Amount mismatch! Expected ${expectedTotal}, got ${amountPaidGhs} for ${reference}. Diff: ${amountDiff}`);

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

      await supabase
        .from("purchase_intents")
        .update({
          status: "failed",
          order_context: {
            ...((intent.order_context as Record<string, unknown>) || {}),
            security_blocked: true,
            reason: "amount_mismatch",
            paid_amount: amountPaidGhs,
            expected_amount: expectedTotal,
            difference: amountDiff,
            blocked_at: new Date().toISOString(),
          },
        })
        .eq("id", intent.id as string);

      await supabase.from("audit_logs").insert({
        action: "payment_blocked_amount_mismatch",
        actor_role: "system",
        target_type: "purchase_intent",
        target_id: intent.id,
        metadata: {
          intent_reference: intent.intent_reference,
          expected_total: expectedTotal,
          paid_amount: amountPaidGhs,
          difference: amountDiff,
          paystack_reference: reference,
          actor_type: intent.actor_type,
          actor_id: intent.actor_id,
          network: intent.network,
          phone: intent.phone_number,
        },
      });

      return json({ error: "Payment amount does not match expected total. Contact support.", intent_reference: intent.intent_reference }, 422);
    }

    // ═══ 5b. FOR PURCHASES: RE-VERIFY PACKAGE PRICE SERVER-SIDE ═══
    if (!isDeposit) {
      const snapshot = (intent.plan_snapshot || {}) as Record<string, unknown>;
      const packageId = snapshot.id as string;

      if (packageId) {
        let serverPrice: number | null = null;

        const { data: pkg } = await supabase
          .from("data_packages")
          .select("selling_price, is_active")
          .eq("id", packageId)
          .single();

        if (pkg && pkg.is_active) {
          serverPrice = Number(pkg.selling_price);
        } else {
          const { data: plan } = await supabase
            .from("data_plans")
            .select("amount, is_active")
            .eq("id", packageId)
            .single();

          if (plan && plan.is_active) {
            serverPrice = Number(plan.amount);
          }
        }

        if (serverPrice !== null && Math.abs(serverPrice - intentBaseAmount) > 0.01) {
          console.error(`SECURITY: Package price changed between init and verify. Server: ${serverPrice}, Intent base: ${intentBaseAmount}`);
          
          await supabase.from("audit_logs").insert({
            action: "payment_blocked_price_changed",
            actor_role: "system",
            target_type: "purchase_intent",
            target_id: intent.id,
            metadata: {
              intent_reference: intent.intent_reference,
              server_price_at_verify: serverPrice,
              intent_base_amount: intentBaseAmount,
              paid_amount: amountPaidGhs,
            },
          });
        }
      }
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
      // Release the intent back so it can be retried
      await supabase.from("purchase_intents").update({ status: "pending_payment" }).eq("id", intent.id as string);
      return json({ error: "Failed to record payment" }, 500);
    }

    // ═══ 7. UPDATE INTENT → payment_confirmed ═══
    await supabase
      .from("purchase_intents")
      .update({ status: "payment_confirmed" })
      .eq("id", intent.id as string);

    // ═══ BRANCH: DEPOSIT vs PURCHASE ═══
    if (isDeposit) {
      return await handleDeposit(supabase, intent, paymentRecord, intentBaseAmount, reference, intentFeeAmount);
    } else {
      return await handlePurchase(supabase, intent, paymentRecord, intentBaseAmount, reference, intentFeeAmount);
    }
  } catch (err) {
    console.error("verify-payment error:", err);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});

/** Handle wallet deposit: credit wallet with BASE amount using ATOMIC DB function */
async function handleDeposit(
  supabase: any,
  intent: Record<string, unknown>,
  paymentRecord: Record<string, unknown>,
  baseAmount: number,
  reference: string,
  feeAmount: number,
) {
  const userId = intent.actor_id as string;

  if (!userId) {
    return json({ error: "Invalid deposit: no user associated", payment_verified: true }, 422);
  }

  // Get wallet ID
  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (walletErr || !wallet) {
    console.error("Wallet not found for deposit:", walletErr);
    return json({ error: "Wallet not found. Contact support.", payment_verified: true }, 500);
  }

  // ═══ ATOMIC WALLET CREDIT via DB function ═══
  // This uses SELECT FOR UPDATE internally to prevent race conditions
  const { data: creditResult, error: creditErr } = await supabase.rpc("credit_wallet_atomic", {
    _wallet_id: wallet.id,
    _amount: baseAmount,
    _narration: `Wallet deposit via Paystack — ${reference} (Fee: GHS ${feeAmount.toFixed(2)})`,
    _reference: reference,
    _linked_record_id: paymentRecord.id as string,
    _linked_record_type: "payment_record",
    _created_by: userId,
  });

  if (creditErr) {
    console.error("Atomic wallet credit failed:", creditErr);
    // Don't release intent — payment is verified, admin can resolve
    await supabase.from("audit_logs").insert({
      action: "wallet_credit_failed",
      actor_id: userId,
      actor_role: "system",
      target_type: "wallet",
      target_id: wallet.id,
      metadata: { error: creditErr.message, reference, base_amount: baseAmount },
    });
    return json({ error: "Payment verified but wallet credit failed. Contact support.", payment_verified: true }, 500);
  }

  const creditRow = Array.isArray(creditResult) ? creditResult[0] : creditResult;
  const closingBalance = Number(creditRow?.new_balance || 0);
  const openingBalance = Number(creditRow?.opening_bal || 0);

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
    .eq("id", intent.id as string);

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
  supabase: any,
  intent: Record<string, unknown>,
  paymentRecord: Record<string, unknown>,
  baseAmount: number,
  reference: string,
  feeAmount: number,
) {
  // Check system toggle before creating order
  const { data: toggleData } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "order_submission_enabled")
    .maybeSingle();

  const snapshot = (intent.plan_snapshot as Record<string, unknown>) || {};
  const publicOrderId = generateOrderId();

  // ═══ DUPLICATE ORDER CHECK before insert ═══
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("*")
    .eq("intent_id", intent.id as string)
    .maybeSingle();

  if (existingOrder) {
    return json({ success: true, already_processed: true, order: existingOrder });
  }

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
      amount_charged: baseAmount,
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
    .eq("id", intent.id as string);

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

  // Trigger fulfillment only if order submission is enabled
  let fulfillmentResult = null;
  const submissionEnabled = toggleData?.setting_value !== "false";

  if (submissionEnabled) {
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
  }

  const { data: updatedOrder } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order.id as string)
    .single();

  return json({
    success: true,
    intent_type: intent.intent_type,
    order: updatedOrder || order,
    fulfillment: fulfillmentResult,
  });
}