/**
 * Shared Payment Finalization Module
 *
 * SINGLE SOURCE OF TRUTH for finalizing successful Paystack payments.
 * Used by:
 *   - verify-payment (frontend callback path)
 *   - paystack-webhook (server-to-server backend path)
 *   - recover-payments (background recovery sweep)
 *
 * Guarantees:
 *   - Strict zero-trust amount verification (0.02 GHS tolerance)
 *   - Server-side package price re-resolution
 *   - Idempotent: safe to call multiple times for same reference
 *   - No duplicate orders, no double wallet credits
 *   - Atomic intent claiming + atomic wallet crediting
 *   - Consistent audit logs and status history
 */

export type FinalizationSource = "verify_callback" | "paystack_webhook" | "recovery_sweep" | "admin_recovery";

export interface FinalizationResult {
  success: boolean;
  status?: number;
  already_processed?: boolean;
  intent_type?: string;
  intent_reference?: string;
  order?: Record<string, unknown>;
  deposit?: Record<string, unknown>;
  payment_verified?: boolean;
  error?: string;
  blocked?: boolean;
}

/**
 * Generate a short customer-facing order ID.
 *  - `KS-XXXXX` for orders originating from an agent storefront (referral)
 *  - `KD-XXXXX` for main-platform / direct orders
 * Uses 5 alphanumeric chars from a 32-symbol Crockford-style alphabet
 * (no I/L/O/U) — ~33M combinations per prefix. The DB has a UNIQUE
 * constraint on `public_order_id`.
 */
function generateOrderId(prefix: "KD" | "KS" = "KD"): string {
  const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < 5; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}-${id}`;
}

/** Safely parse order_context, ensuring it isn't treated as a string */
function parseOrderContext(intent: Record<string, unknown>): Record<string, unknown> {
  const rawCtx = intent.order_context;
  return (typeof rawCtx === "string" ? JSON.parse(rawCtx) : (rawCtx || {})) as Record<string, unknown>;
}

/**
 * Main entry point: finalize a Paystack payment by reference.
 *
 * Steps:
 *   1. Idempotency: short-circuit if already verified
 *   2. Re-verify with Paystack
 *   3. Find + atomically claim the intent
 *   4. Strict amount + price checks
 *   5. Create payment record
 *   6. Branch to deposit or purchase finalization
 */
export async function finalizePaystackPayment(
  supabase: any,
  reference: string,
  source: FinalizationSource,
  paystackSecret: string,
): Promise<FinalizationResult> {
  // ── 1. IDEMPOTENCY: already verified payment? ──
  const { data: existingPayment } = await supabase
    .from("payment_records")
    .select("id, status, intent_id")
    .eq("provider_reference", reference)
    .eq("provider", "paystack")
    .maybeSingle();

  if (existingPayment?.status === "verified") {
    const { data: existingIntent } = await supabase
      .from("purchase_intents")
      .select("id, intent_type, intent_reference, status")
      .eq("id", existingPayment.intent_id)
      .maybeSingle();

    if (existingIntent?.intent_type === "wallet_deposit" && existingIntent.status === "completed") {
      return {
        success: true,
        already_processed: true,
        intent_type: "wallet_deposit",
        intent_reference: existingIntent.intent_reference,
      };
    }

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_record_id", existingPayment.id)
      .maybeSingle();

    if (existingOrder) {
      return {
        success: true,
        already_processed: true,
        order: existingOrder,
        intent_reference: existingIntent?.intent_reference,
      };
    }
    // verified payment but no order → fall through to recovery (handlePurchase will detect missing order and create one)
  }

  // ── 2. VERIFY WITH PAYSTACK ──
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${paystackSecret}` } },
  );
  const verifyData = await verifyRes.json();

  if (!verifyRes.ok || !verifyData.status) {
    console.error(`[finalize:${source}] Paystack verify error:`, verifyData);
    return { success: false, status: 502, error: "Unable to verify payment with provider" };
  }

  const txn = verifyData.data;
  const paystackStatus = txn.status;
  const amountPaidGhs = txn.amount / 100;
  const customerEmail = txn.customer?.email || null;

  // ── 3. FIND + ATOMICALLY CLAIM INTENT ──
  const { data: intentLookup } = await supabase
    .from("purchase_intents")
    .select("id, status, intent_type, intent_reference")
    .eq("intent_reference", reference)
    .maybeSingle();

  if (!intentLookup) {
    return { success: false, status: 404, error: "Intent not found for this reference" };
  }

  // Already completed → idempotent return
  if (intentLookup.status === "completed") {
    if (intentLookup.intent_type === "wallet_deposit") {
      return { success: true, already_processed: true, intent_type: "wallet_deposit", intent_reference: reference };
    }
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("intent_id", intentLookup.id)
      .maybeSingle();
    if (existingOrder) {
      return { success: true, already_processed: true, order: existingOrder, intent_reference: reference };
    }
  }

  // Terminal failure states
  if (["failed", "cancelled", "expired"].includes(intentLookup.status)) {
    return {
      success: false,
      status: 410,
      error: "This payment request is no longer valid.",
      intent_reference: reference,
    };
  }

  // payment_confirmed / fulfilling without order yet → recovery scenario; allow re-entry
  if (["payment_confirmed", "fulfilling"].includes(intentLookup.status)) {
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("intent_id", intentLookup.id)
      .maybeSingle();
    if (existingOrder) {
      return { success: true, already_processed: true, order: existingOrder, intent_reference: reference };
    }
    // Continue without re-claiming; we already own payment_confirmed state
  }

  let intent: Record<string, unknown>;

  if (["payment_confirmed", "fulfilling"].includes(intentLookup.status)) {
    // Re-fetch full intent (no claim needed; already advanced state)
    const { data: fullIntent } = await supabase
      .from("purchase_intents")
      .select("*")
      .eq("id", intentLookup.id)
      .single();
    if (!fullIntent) {
      return { success: false, status: 404, error: "Intent disappeared during finalization" };
    }
    intent = fullIntent;
  } else {
    // Atomic claim from created/pending_payment/payment_processing
    const { data: claimedRows } = await supabase.rpc("claim_intent_for_verification", {
      _intent_id: intentLookup.id,
    });
    const claimed = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;

    if (!claimed) {
      // Another caller claimed it — re-check for an order created since
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("intent_id", intentLookup.id)
        .maybeSingle();
      if (existingOrder) {
        return { success: true, already_processed: true, order: existingOrder, intent_reference: reference };
      }
      await supabase.from("audit_logs").insert({
        action: "finalize_concurrent_blocked",
        actor_role: "system",
        target_type: "purchase_intent",
        target_id: intentLookup.id,
        metadata: { source, reference },
      });
      return { success: false, status: 409, error: "Payment is already being processed.", intent_reference: reference };
    }
    intent = claimed;
  }

  const isDeposit = intent.intent_type === "wallet_deposit";
  const isAgentSubscription = intent.intent_type === "agent_subscription";

  const intentBaseAmount = Number(intent.base_amount) || Number(intent.amount_expected);
  const intentFeeAmount = Number(intent.fee_amount) || 0;
  const intentFeeRate = Number(intent.fee_rate) || 0;
  const intentTotalAmount = Number(intent.total_amount) || Number(intent.amount_expected);

  // ── 4. NON-SUCCESS HANDLING ──
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
      { onConflict: "provider,provider_reference" },
    );

    return {
      success: false,
      intent_type: intent.intent_type as string,
      intent_reference: intent.intent_reference as string,
      error: paystackStatus === "abandoned" ? "Payment was cancelled" : "Payment failed.",
    };
  }

  // ── 5. STRICT AMOUNT VERIFICATION ──
  const amountDiff = Math.abs(amountPaidGhs - intentTotalAmount);
  if (amountDiff > 0.02) {
    console.error(`[finalize:${source}] SECURITY amount mismatch: expected ${intentTotalAmount}, got ${amountPaidGhs}`);

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
      { onConflict: "provider,provider_reference" },
    );

    await supabase
      .from("purchase_intents")
      .update({
        status: "failed",
        order_context: {
          ...parseOrderContext(intent),
          security_blocked: true,
          reason: "amount_mismatch",
          paid_amount: amountPaidGhs,
          expected_amount: intentTotalAmount,
          difference: amountDiff,
          blocked_at: new Date().toISOString(),
          blocked_via: source,
        },
      })
      .eq("id", intent.id as string);

    await supabase.from("audit_logs").insert({
      action: "payment_blocked_amount_mismatch",
      actor_role: "system",
      target_type: "purchase_intent",
      target_id: intent.id,
      metadata: {
        source,
        intent_reference: intent.intent_reference,
        expected_total: intentTotalAmount,
        paid_amount: amountPaidGhs,
        difference: amountDiff,
        paystack_reference: reference,
      },
    });

    return {
      success: false,
      status: 422,
      blocked: true,
      error: "Payment amount does not match expected total.",
      intent_reference: intent.intent_reference as string,
    };
  }

  // ── 5b. PURCHASE: re-verify package price server-side ──
  // For agent storefront purchases, re-resolve from agent_bundle_prices
  // (the agent's published selling price). For main-platform purchases,
  // re-resolve from data_packages.selling_price as before.
  if (!isDeposit && !isAgentSubscription) {
    const snapshot = (intent.plan_snapshot || {}) as Record<string, unknown>;
    const packageId = snapshot.id as string;
    const orderCtx2 = parseOrderContext(intent);
    const referral2 = (orderCtx2.referral || null) as Record<string, unknown> | null;
    const agentProfileIdForCheck =
      referral2 && typeof referral2.agent_profile_id === "string"
        ? (referral2.agent_profile_id as string)
        : null;

    if (packageId) {
      let serverPrice: number | null = null;
      let serverPriceSource: "agent_storefront" | "data_packages" | "data_plans" = "data_packages";

      if (agentProfileIdForCheck) {
        const { data: agentPriceRow } = await supabase
          .from("agent_bundle_prices")
          .select("selling_price, is_published")
          .eq("agent_profile_id", agentProfileIdForCheck)
          .eq("package_id", packageId)
          .maybeSingle();
        if (agentPriceRow && agentPriceRow.is_published) {
          serverPrice = Number(agentPriceRow.selling_price);
          serverPriceSource = "agent_storefront";
        }
      }

      if (serverPrice === null) {
        const { data: pkg } = await supabase
          .from("data_packages")
          .select("selling_price, is_active")
          .eq("id", packageId)
          .maybeSingle();

        if (pkg?.is_active) {
          serverPrice = Number(pkg.selling_price);
          serverPriceSource = "data_packages";
        } else {
          const { data: plan } = await supabase
            .from("data_plans")
            .select("amount, is_active")
            .eq("id", packageId)
            .maybeSingle();
          if (plan?.is_active) {
            serverPrice = Number(plan.amount);
            serverPriceSource = "data_plans";
          }
        }
      }

      if (serverPrice !== null && Math.abs(serverPrice - intentBaseAmount) > 0.01) {
        await supabase.from("audit_logs").insert({
          action: "payment_finalize_price_drift",
          actor_role: "system",
          target_type: "purchase_intent",
          target_id: intent.id,
          metadata: {
            source,
            intent_reference: intent.intent_reference,
            server_price_at_finalize: serverPrice,
            intent_base_amount: intentBaseAmount,
            paid_amount: amountPaidGhs,
            price_source: serverPriceSource,
            agent_profile_id: agentProfileIdForCheck,
          },
        });
      }
    }
  }

  // ── 6. CREATE PAYMENT RECORD ──
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
      { onConflict: "provider,provider_reference" },
    )
    .select()
    .single();

  if (prErr || !paymentRecord) {
    console.error(`[finalize:${source}] payment record write failed:`, prErr);
    // Release intent for retry only if we claimed it from a non-confirmed state
    if (!["payment_confirmed", "fulfilling"].includes(intentLookup.status)) {
      await supabase
        .from("purchase_intents")
        .update({ status: "pending_payment" })
        .eq("id", intent.id as string);
    }
    return { success: false, status: 500, error: "Failed to record payment" };
  }

  // ── 7. INTENT → payment_confirmed (idempotent) ──
  await supabase
    .from("purchase_intents")
    .update({ status: "payment_confirmed" })
    .eq("id", intent.id as string)
    .in("status", ["payment_processing", "payment_confirmed"]);

  // ── 8. BRANCH ──
  if (isDeposit) {
    return await handleDeposit(supabase, intent, paymentRecord, intentBaseAmount, reference, intentFeeAmount, source);
  } else if (isAgentSubscription) {
    return await handleAgentSubscription(supabase, intent, paymentRecord, intentBaseAmount, reference, source);
  } else {
    return await handlePurchase(supabase, intent, paymentRecord, intentBaseAmount, reference, intentFeeAmount, source);
  }
}

/**
 * Agent subscription finalization.
 * Calls the atomic activation function which:
 *   - inserts active subscription row
 *   - flips agent_profile to 'active'
 *   - grants 'agent' role
 * All idempotent on intent_id.
 */
async function handleAgentSubscription(
  supabase: any,
  intent: Record<string, unknown>,
  paymentRecord: Record<string, unknown>,
  baseAmount: number,
  reference: string,
  source: FinalizationSource,
): Promise<FinalizationResult> {
  const userId = intent.actor_id as string;
  if (!userId) {
    return { success: false, status: 422, payment_verified: true, error: "Invalid agent subscription: no user associated" };
  }

  const snapshot = (intent.plan_snapshot || {}) as Record<string, unknown>;
  const plan = String(snapshot.plan || "");
  if (plan !== "monthly" && plan !== "yearly") {
    return { success: false, status: 422, payment_verified: true, error: `Invalid agent plan: ${plan}` };
  }

  // Server-side authoritative pricing is 30/month and 300/year.
  // Legacy successful payments that were initialized before the pricing fix
  // may still arrive as 50/month or 400/year; allow those exact historic
  // amounts so already-paid activations do not get stranded.
  const canonicalPrice = plan === "monthly" ? 30 : 300;
  const legacyPrice = plan === "monthly" ? 50 : 400;
  const matchedCanonical = Math.abs(baseAmount - canonicalPrice) <= 0.01;
  const matchedLegacy = Math.abs(baseAmount - legacyPrice) <= 0.01;
  if (!matchedCanonical && !matchedLegacy) {
    await supabase.from("audit_logs").insert({
      action: "agent_subscription_price_mismatch",
      actor_id: userId,
      actor_role: "system",
      target_type: "purchase_intent",
      target_id: intent.id,
      metadata: { source, plan, paid: baseAmount, expected: canonicalPrice, legacy_expected: legacyPrice, reference },
    });
    return { success: false, status: 422, blocked: true, payment_verified: true, error: "Agent subscription price mismatch." };
  }

  if (matchedLegacy) {
    await supabase.from("audit_logs").insert({
      action: "agent_subscription_legacy_price_honored",
      actor_id: userId,
      actor_role: "system",
      target_type: "purchase_intent",
      target_id: intent.id,
      metadata: { source, plan, paid: baseAmount, canonical_price: canonicalPrice, legacy_price: legacyPrice, reference },
    });
  }

  const { data: activation, error: actErr } = await supabase.rpc("activate_agent_subscription_atomic", {
    _intent_id: intent.id,
    _user_id: userId,
    _plan: plan,
    _amount_paid: baseAmount,
    _payment_record_id: paymentRecord.id,
  });

  if (actErr) {
    console.error(`[finalize:${source}] agent activation failed:`, actErr);
    await supabase.from("audit_logs").insert({
      action: "agent_subscription_activation_failed",
      actor_id: userId,
      actor_role: "system",
      target_type: "purchase_intent",
      target_id: intent.id,
      metadata: { source, error: actErr.message, reference },
    });
    return { success: false, status: 500, payment_verified: true, error: "Subscription payment received but activation failed. Support has been notified." };
  }

  const row = Array.isArray(activation) ? activation[0] : activation;

  console.log(`[finalize:${source}] agent subscription activated`, {
    intent_id: intent.id,
    intent_reference: intent.intent_reference,
    user_id: userId,
    plan,
    amount_paid: baseAmount,
    payment_record_id: paymentRecord.id,
    subscription_id: row?.subscription_id,
    agent_profile_id: row?.agent_profile_id,
    starts_at: row?.starts_at,
    expires_at: row?.expires_at,
    already_processed: row?.already_processed || false,
  });

  await supabase
    .from("purchase_intents")
    .update({
      status: "completed",
      order_context: {
        ...parseOrderContext(intent),
        agent_subscription: {
          plan,
          subscription_id: row?.subscription_id,
          agent_profile_id: row?.agent_profile_id,
          starts_at: row?.starts_at,
          expires_at: row?.expires_at,
          already_processed: row?.already_processed || false,
        },
        completed_at: new Date().toISOString(),
        finalized_via: source,
      },
    })
    .eq("id", intent.id as string);

  await supabase.from("audit_logs").insert({
    action: row?.already_processed ? "agent_subscription_already_active" : "agent_subscription_activated",
    actor_id: userId,
    actor_role: "system",
    target_type: "agent_subscription",
    target_id: row?.subscription_id || null,
    metadata: {
      source,
      plan,
      amount_paid: baseAmount,
      reference,
        activation_status_before: intent.status,
        activation_status_after: "completed",
        payment_record_id: paymentRecord.id,
        intent_id: intent.id,
      starts_at: row?.starts_at,
      expires_at: row?.expires_at,
        agent_profile_id: row?.agent_profile_id,
    },
  });

  return {
    success: true,
    intent_type: "agent_subscription",
    intent_reference: intent.intent_reference as string,
    already_processed: !!row?.already_processed,
  };
}

/** Wallet deposit finalization (idempotent via reference unique check). */
async function handleDeposit(
  supabase: any,
  intent: Record<string, unknown>,
  paymentRecord: Record<string, unknown>,
  baseAmount: number,
  reference: string,
  feeAmount: number,
  source: FinalizationSource,
): Promise<FinalizationResult> {
  const userId = intent.actor_id as string;
  if (!userId) {
    return { success: false, status: 422, payment_verified: true, error: "Invalid deposit: no user associated" };
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, current_balance")
    .eq("user_id", userId)
    .single();

  if (!wallet) {
    return { success: false, status: 500, payment_verified: true, error: "Wallet not found" };
  }

  // ── IDEMPOTENCY: has this reference already credited the wallet? ──
  const { data: existingTxn } = await supabase
    .from("wallet_transactions")
    .select("id, closing_balance")
    .eq("wallet_id", wallet.id)
    .eq("reference", reference)
    .maybeSingle();

  if (existingTxn) {
    // Ensure intent is marked completed
    await supabase
      .from("purchase_intents")
      .update({
        status: "completed",
        order_context: {
          ...parseOrderContext(intent),
          wallet_credited: true,
          credited_amount: baseAmount,
          fee_amount: feeAmount,
          new_balance: Number(existingTxn.closing_balance),
          completed_at: new Date().toISOString(),
          finalized_via: source,
        },
      })
      .eq("id", intent.id as string)
      .neq("status", "completed");

    return {
      success: true,
      already_processed: true,
      intent_type: "wallet_deposit",
      intent_reference: intent.intent_reference as string,
      deposit: {
        amount: baseAmount,
        fee: feeAmount,
        new_balance: Number(existingTxn.closing_balance),
        reference,
      },
    };
  }

  // ── ATOMIC CREDIT ──
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
    console.error(`[finalize:${source}] wallet credit failed:`, creditErr);
    await supabase.from("audit_logs").insert({
      action: "wallet_credit_failed",
      actor_id: userId,
      actor_role: "system",
      target_type: "wallet",
      target_id: wallet.id,
      metadata: { source, error: creditErr.message, reference, base_amount: baseAmount },
    });
    return { success: false, status: 500, payment_verified: true, error: "Payment verified but wallet credit failed" };
  }

  const creditRow = Array.isArray(creditResult) ? creditResult[0] : creditResult;
  const closingBalance = Number(creditRow?.new_balance || 0);
  const openingBalance = Number(creditRow?.opening_bal || 0);

  await supabase
    .from("purchase_intents")
    .update({
      status: "completed",
      order_context: {
        ...parseOrderContext(intent),
        wallet_credited: true,
        credited_amount: baseAmount,
        fee_amount: feeAmount,
        total_charged: baseAmount + feeAmount,
        new_balance: closingBalance,
        completed_at: new Date().toISOString(),
        finalized_via: source,
      },
    })
    .eq("id", intent.id as string);

  await supabase.from("audit_logs").insert({
    action: "wallet_deposit_completed",
    actor_id: userId,
    actor_role: "system",
    target_type: "wallet",
    target_id: wallet.id,
    metadata: {
      source,
      base_amount: baseAmount,
      fee_amount: feeAmount,
      total_charged: baseAmount + feeAmount,
      reference,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      payment_record_id: paymentRecord.id,
    },
  });

  return {
    success: true,
    intent_type: "wallet_deposit",
    intent_reference: intent.intent_reference as string,
    deposit: {
      amount: baseAmount,
      fee: feeAmount,
      total_charged: baseAmount + feeAmount,
      new_balance: closingBalance,
      reference,
    },
  };
}

/** Bundle purchase finalization (idempotent via intent_id check). */
async function handlePurchase(
  supabase: any,
  intent: Record<string, unknown>,
  paymentRecord: Record<string, unknown>,
  baseAmount: number,
  reference: string,
  feeAmount: number,
  source: FinalizationSource,
): Promise<FinalizationResult> {
  // System toggle
  const { data: toggleData } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "order_submission_enabled")
    .maybeSingle();

  // ── DUPLICATE ORDER CHECK (idempotent) ──
  const { data: existingOrders } = await supabase
    .from("orders")
    .select("*")
    .eq("intent_id", intent.id as string)
    .limit(1);
    
  const existingOrder = existingOrders?.[0] || null;

  if (existingOrder) {
    const rawCtx = intent.order_context;
    const existingCtx = (typeof rawCtx === "string" ? JSON.parse(rawCtx) : (rawCtx || {})) as Record<string, unknown>;

    // Make sure intent is completed
    await supabase
      .from("purchase_intents")
      .update({
        status: "completed",
        order_context: {
          ...existingCtx,
          order_id: existingOrder.id,
          public_order_id: existingOrder.public_order_id,
          completed_at: new Date().toISOString(),
          finalized_via: source,
        },
      })
      .eq("id", intent.id as string)
      .neq("status", "completed");

    return {
      success: true,
      already_processed: true,
      intent_type: intent.intent_type as string,
      intent_reference: intent.intent_reference as string,
      order: existingOrder,
    };
  }

  const snapshot = (intent.plan_snapshot as Record<string, unknown>) || {};
  
  const rawCtx2 = intent.order_context;
  const intentCtx = (typeof rawCtx2 === "string" ? JSON.parse(rawCtx2) : (rawCtx2 || {})) as Record<string, unknown>;
  
  // Distinct prefix for agent storefront orders (KS-) vs main platform (KD-)
  const intentReferral = (intentCtx.referral || null) as Record<string, unknown> | null;
  const isStorefrontOrder = !!(intentReferral && intentReferral.agent_profile_id);
  const isBulk = intent.intent_type === "agent_bulk_buy";
  
  const rawBulkNumbers = (intentCtx.bulk_numbers as string[]) || [];
  const phoneNumbers = isBulk && rawBulkNumbers.length > 0 ? rawBulkNumbers : [intent.phone_number as string];
  
  const quantity = phoneNumbers.length;
  // Divide baseAmount and feeAmount evenly among orders
  const unitBaseAmount = Number((baseAmount / quantity).toFixed(2));
  const unitFeeAmount = Number((feeAmount / quantity).toFixed(2));

  const createdOrders: any[] = [];
  let fulfillmentResult: unknown = null;

  for (const phone of phoneNumbers) {
    const publicOrderId = generateOrderId(isStorefrontOrder || isBulk ? "KS" : "KD");

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        public_order_id: publicOrderId,
        actor_type: (intent.actor_type as string) || "guest",
        actor_id: (intent.actor_id as string) || null,
        origin_type: (intent.intent_type as string) || "guest_buy",
        source_channel: (intent.source_channel as string) || "public_guest_checkout",
        beneficiary_number: phone,
        network: intent.network as string,
        bundle_name: String(snapshot.plan_name || snapshot.package_name || ""),
        bundle_code: String(snapshot.plan_code || snapshot.package_code || ""),
        bundle_snapshot: intent.plan_snapshot,
        amount_charged: unitBaseAmount,
        currency: "GHS",
        intent_id: intent.id as string,
        payment_record_id: paymentRecord.id as string,
        status: "paid",
        metadata: {
          customer_name: intent.customer_name,
          customer_email: intent.customer_email,
          paystack_reference: reference,
          paystack_fee: unitFeeAmount,
          total_charged: unitBaseAmount + unitFeeAmount,
          finalized_via: source,
          is_bulk: isBulk,
        },
      })
      .select()
      .single();

    if (orderErr || !order) {
      console.error(`[finalize:${source}] order creation failed for ${phone}:`, orderErr);
      continue;
    }

    createdOrders.push(order);

    await supabase.from("audit_logs").insert({
      action: isBulk ? "bulk_order_created_from_payment" : "order_created_from_payment",
      actor_role: "system",
      target_type: "order",
      target_id: order.id,
      metadata: {
        source,
        public_order_id: publicOrderId,
        intent_reference: intent.intent_reference,
        paystack_reference: reference,
        base_amount: unitBaseAmount,
        fee_amount: unitFeeAmount,
        total_charged: unitBaseAmount + unitFeeAmount,
        network: intent.network,
        phone: phone,
      },
    });

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "paid",
      source,
      note: `Order paid via Paystack via ${source} (Base: GHS ${unitBaseAmount.toFixed(2)}, Fee: GHS ${unitFeeAmount.toFixed(2)})`,
      metadata: { paystack_reference: reference, base_amount: unitBaseAmount, fee_amount: unitFeeAmount, is_bulk: isBulk },
    });

    // Trigger fulfillment (non-blocking) if enabled
    if (toggleData?.setting_value !== "false") {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const fulfillRes = fetch(`${supabaseUrl}/functions/v1/fulfill-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ order_id: order.id }),
        });
        
        if (!isBulk) {
          fulfillmentResult = await (await fulfillRes).json();
        }
      } catch (err) {
        console.error(`[finalize:${source}] fulfillment trigger failed:`, err);
      }
    }
  }

  if (createdOrders.length === 0) {
    // Race: another finalizer beat us — re-check
    const { data: raceOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("intent_id", intent.id as string)
      .limit(1);
    const raceOrder = raceOrders?.[0] || null;
    if (raceOrder) {
      return {
        success: true,
        already_processed: true,
        intent_type: intent.intent_type as string,
        order: raceOrder,
      };
    }
    return { success: false, status: 500, payment_verified: true, error: "Payment verified but all order creations failed" };
  }

  await supabase
    .from("purchase_intents")
    .update({
      status: "completed",
      order_context: {
        ...parseOrderContext(intent),
        order_id: createdOrders[0].id,
        public_order_id: createdOrders[0].public_order_id,
        order_count: createdOrders.length,
        completed_at: new Date().toISOString(),
        finalized_via: source,
      },
    })
    .eq("id", intent.id as string);

  return {
    success: true,
    intent_type: intent.intent_type as string,
    intent_reference: intent.intent_reference as string,
    order: createdOrders[0],
    ...(fulfillmentResult ? { fulfillment: fulfillmentResult } as Record<string, unknown> : {}),
  };
}


