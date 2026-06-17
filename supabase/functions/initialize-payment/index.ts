/**
 * Edge Function: initialize-payment (HARDENED)
 * 
 * Supports purchase intents (bundle buy) and deposit intents (wallet top-up).
 * Server-side price resolution — NEVER trusts frontend amounts for packages.
 * Applies 3% Paystack fee. Initializes Paystack. Returns authorization_url.
 * Rate-limited per intent_id.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { calculatePaystackFee } from "../_shared/paystack-fee.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Simple in-memory rate limiter ──
const recentRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) return json({ error: "Payment provider not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { intent_id } = body;

    if (!intent_id) return json({ error: "Missing intent_id" }, 400);

    // ═══ RATE LIMIT CHECK ═══
    if (!checkRateLimit(`init:${intent_id}`)) {
      return json({ error: "Too many payment initialization attempts. Please wait." }, 429);
    }

    // ── 0. CHECK SYSTEM SAFETY TOGGLES ──
    const { data: safetySettings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["paystack_checkout_enabled", "guest_checkout_enabled", "order_submission_enabled"]);

    const settingsMap: Record<string, string> = {};
    (safetySettings || []).forEach((s: { setting_key: string; setting_value: string }) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    if (settingsMap["paystack_checkout_enabled"] === "false") {
      return json({ error: "Payments are temporarily disabled. Please try again later." }, 503);
    }

    // ── 1. Fetch and validate the intent ──
    const { data: intent, error: intentError } = await supabase
      .from("purchase_intents")
      .select("*")
      .eq("id", intent_id)
      .single();

    if (intentError || !intent) return json({ error: "Intent not found" }, 404);

    // Allow safe retries from `created` and `pending_payment` (user clicked Edit
    // and came back). Block only states that mean payment is locked / done.
    const RETRYABLE_STATES = new Set(["created", "pending_payment"]);
    if (!RETRYABLE_STATES.has(intent.status)) {
      // If already verified / processing / completed, surface a clean message
      // instead of a generic non-2xx so the client UI doesn't look broken.
      if (intent.status === "completed") {
        return json({
          error: "This payment has already been completed.",
          intent_reference: intent.intent_reference,
          already_completed: true,
        }, 409);
      }
      return json({
        error: "This request can no longer be paid for. Please start a new order.",
        intent_reference: intent.intent_reference,
        status: intent.status,
      }, 409);
    }

    const isDeposit = intent.intent_type === "wallet_deposit";
    const isAgentSubscription = intent.intent_type === "agent_subscription";
    const snapshot = (intent.plan_snapshot || {}) as Record<string, unknown>;

    // If we already have a valid Paystack init for this intent, reuse it
    // instead of hitting Paystack again. Authorization URLs from Paystack
    // remain valid until the transaction is completed/abandoned, so this is
    // safe and avoids both rate-limit hits and duplicate references.
    // Safely parse order_context to ensure arrays/objects aren't treated as strings.
    const rawCtx = intent.order_context;
    const existingCtx = (typeof rawCtx === "string" ? JSON.parse(rawCtx) : (rawCtx || {})) as Record<string, unknown>;
    const existingAccessCode = typeof existingCtx.paystack_access_code === "string"
      ? existingCtx.paystack_access_code
      : null;
    if (intent.status === "pending_payment" && existingAccessCode && !isAgentSubscription) {
      const breakdownCtx = (existingCtx.fee_breakdown || {}) as Record<string, unknown>;
      return json({
        success: true,
        authorization_url: `https://checkout.paystack.com/${existingAccessCode}`,
        access_code: existingAccessCode,
        reference: intent.intent_reference,
        intent_reference: intent.intent_reference,
        reused: true,
        fee_breakdown: {
          base_amount: Number(breakdownCtx.base_amount ?? intent.base_amount ?? intent.amount_expected),
          fee_amount: Number(breakdownCtx.fee_amount ?? intent.fee_amount ?? 0),
          fee_rate: Number(breakdownCtx.fee_rate ?? intent.fee_rate ?? 0),
          total_amount: Number(breakdownCtx.total_amount ?? intent.total_amount ?? intent.amount_expected),
        },
      });
    }

    // Check guest checkout toggle
    if (intent.actor_type === "guest" && settingsMap["guest_checkout_enabled"] === "false") {
      return json({ error: "Guest checkout is temporarily disabled. Please try again later." }, 503);
    }

    // Check expiry
    if (intent.expires_at && new Date(intent.expires_at) < new Date()) {
      await supabase
        .from("purchase_intents")
        .update({ status: "expired" })
        .eq("id", intent_id);
      return json({ error: "This request has expired. Please start again." }, 410);
    }

    // ── 2. SERVER-SIDE PRICE RESOLUTION (CRITICAL SECURITY) ──
    let authoritative_base_amount: number;

    if (isDeposit) {
      const depositAmount = Number(intent.amount_expected);
      if (!depositAmount || depositAmount < 1 || depositAmount > 50000) {
        return json({ error: "Invalid deposit amount" }, 422);
      }
      authoritative_base_amount = Math.round(depositAmount * 100) / 100;
    } else if (isAgentSubscription) {
      // Agent subscription: server-authoritative pricing (30/mo, 300/yr).
      const plan = String(snapshot.plan || "");
      const expected = plan === "monthly" ? 30 : plan === "yearly" ? 300 : null;
      if (expected === null) {
        return json({ error: "Invalid agent plan." }, 422);
      }
      const frontendAmount = Number(intent.amount_expected);
      if (Math.abs(frontendAmount - expected) > 0.01) {
        console.error("[initialize-payment] agent subscription price mismatch", {
          intent_id,
          intent_reference: intent.intent_reference,
          actor_id: intent.actor_id,
          plan,
          frontend_amount: frontendAmount,
          expected,
        });
        await supabase
          .from("purchase_intents")
          .update({
            status: "failed",
            order_context: {
              ...existingCtx,
              security_blocked: true,
              reason: "agent_subscription_price_manipulation",
              frontend_amount: frontendAmount,
              server_price: expected,
              blocked_at: new Date().toISOString(),
            },
          })
          .eq("id", intent_id);

        await supabase.from("audit_logs").insert({
          action: "payment_blocked_price_manipulation",
          actor_role: "system",
          target_type: "purchase_intent",
          target_id: intent.id,
          metadata: {
            intent_type: "agent_subscription",
            plan,
            frontend_amount: frontendAmount,
            server_price: expected,
            actor_id: intent.actor_id,
          },
        });
        return json({ error: "Subscription price has changed. Please retry." }, 422);
      }
      authoritative_base_amount = expected;
    } else {
      const packageId = snapshot.id as string;
      
      if (!packageId) {
        return json({ error: "Invalid package reference. Please start a new order." }, 422);
      }

      // ── AGENT STOREFRONT PRICING SUPPORT ──
      // If this intent originated from an agent storefront (referral context
      // present), the authoritative selling price comes from
      // agent_bundle_prices for that agent+package — NOT from
      // data_packages.selling_price (which is the main public price).
      const orderCtx = existingCtx;
      const referral = (orderCtx.referral || null) as Record<string, unknown> | null;
      const agentProfileIdForPrice =
        referral && typeof referral.agent_profile_id === "string"
          ? (referral.agent_profile_id as string)
          : null;

      let resolvedPrice: number | null = null;
      let packageValid = false;
      let priceSource: "agent_storefront" | "data_packages" | "data_plans" = "data_packages";

      const { data: pkg } = await supabase
        .from("data_packages")
        .select("id, selling_price, is_active, visible_on_public, visible_for_logged_in, package_name, is_agent_resaleable, agent_base_price")
        .eq("id", packageId)
        .single();

      if (pkg) {
        if (!pkg.is_active) {
          return json({ error: "This package is no longer available." }, 422);
        }
        if (intent.actor_type === "guest" && !pkg.visible_on_public && !agentProfileIdForPrice) {
          // Agent storefront purchases are allowed for guests even when the
          // package isn't on the main public catalog — the agent has chosen
          // to resell it.
          return json({ error: "This package is not available for guest purchase." }, 422);
        }

        // Try the agent's published price first when this is a storefront sale.
        if (agentProfileIdForPrice) {
          if (!pkg.is_agent_resaleable) {
            return json({ error: "This package is no longer resaleable from this store." }, 422);
          }
          const { data: agentPriceRow } = await supabase
            .from("agent_bundle_prices")
            .select("selling_price, is_published")
            .eq("agent_profile_id", agentProfileIdForPrice)
            .eq("package_id", packageId)
            .maybeSingle();

          if (agentPriceRow && agentPriceRow.is_published) {
            resolvedPrice = Number(agentPriceRow.selling_price);
            priceSource = "agent_storefront";
          } else {
            // Fallback: agent has not (re)published a price for this bundle —
            // use the public selling price so the storefront still works.
            resolvedPrice = Number(pkg.selling_price);
            priceSource = "data_packages";
          }
        } else if (intent.intent_type === "agent_bulk_buy" || intent.actor_type === "agent") {
          resolvedPrice = Number(pkg.agent_base_price > 0 ? pkg.agent_base_price : pkg.selling_price);
          priceSource = "data_packages";
        } else {
          resolvedPrice = Number(pkg.selling_price);
          priceSource = "data_packages";
        }
        packageValid = true;
      }

      if (!packageValid) {
        const { data: plan } = await supabase
          .from("data_plans")
          .select("id, amount, is_active, plan_name")
          .eq("id", packageId)
          .single();

        if (plan) {
          if (!plan.is_active) {
            return json({ error: "This plan is no longer available." }, 422);
          }
          resolvedPrice = Number(plan.amount);
          priceSource = "data_plans";
          packageValid = true;
        }
      }

      if (!packageValid || resolvedPrice === null || resolvedPrice <= 0) {
        console.error(`SECURITY: Package not found or invalid price. ID: ${packageId}, intent: ${intent.intent_reference}`);
        await supabase.from("audit_logs").insert({
          action: "payment_blocked_invalid_package",
          actor_role: "system",
          target_type: "purchase_intent",
          target_id: intent.id,
          metadata: {
            package_id: packageId,
            frontend_amount: intent.amount_expected,
            intent_reference: intent.intent_reference,
            agent_profile_id: agentProfileIdForPrice,
            price_source: priceSource,
          },
        });
        return json({ error: "Package not found. Please start a new order." }, 422);
      }

      // Multiply resolved price by quantity for bulk buys
      const orderCtxForBulk = existingCtx;
      const rawBulkNumbers = (orderCtxForBulk.bulk_numbers as string[]) || [];
      const quantity = intent.intent_type === "agent_bulk_buy" && rawBulkNumbers.length > 0 ? rawBulkNumbers.length : 1;
      
      resolvedPrice = resolvedPrice * quantity;

      const frontendAmount = Number(intent.amount_expected);
      const priceDelta = Math.abs(frontendAmount - resolvedPrice);

      if (priceDelta > 0.01) {
        // ── AGENT STOREFRONT SELF-HEAL ──
        // For agent storefront purchases, the agent may have updated their
        // selling price between intent creation and payment init. Server is
        // still the source of truth, so silently re-resolve to the agent's
        // current published price instead of dead-ending the customer.
        // Audit the auto-correction for visibility.
        if (priceSource === "agent_storefront") {
          await supabase.from("audit_logs").insert({
            action: "agent_storefront_price_resynced",
            actor_role: "system",
            target_type: "purchase_intent",
            target_id: intent.id,
            metadata: {
              package_id: packageId,
              frontend_amount: frontendAmount,
              server_price: resolvedPrice,
              delta: priceDelta,
              intent_reference: intent.intent_reference,
              agent_profile_id: agentProfileIdForPrice,
              actor_type: intent.actor_type,
              actor_id: intent.actor_id,
            },
          });
          // fall through — resolvedPrice is authoritative
        } else {
          console.error(`SECURITY: Price manipulation detected! Frontend sent ${frontendAmount}, server price is ${resolvedPrice}. Intent: ${intent.intent_reference}`);

          await supabase
            .from("purchase_intents")
            .update({
              status: "failed",
              order_context: {
                ...existingCtx,
                security_blocked: true,
                reason: "price_manipulation_detected",
                frontend_amount: frontendAmount,
                server_price: resolvedPrice,
                price_source: priceSource,
                blocked_at: new Date().toISOString(),
              },
            })
            .eq("id", intent_id);

          await supabase.from("audit_logs").insert({
            action: "payment_blocked_price_manipulation",
            actor_role: "system",
            target_type: "purchase_intent",
            target_id: intent.id,
            metadata: {
              package_id: packageId,
              frontend_amount: frontendAmount,
              server_price: resolvedPrice,
              price_source: priceSource,
              intent_reference: intent.intent_reference,
              actor_type: intent.actor_type,
              actor_id: intent.actor_id,
            },
          });

          return json({ error: "Price has changed. Please start a new order." }, 422);
        }
      }

      authoritative_base_amount = resolvedPrice;

      // Persist the authoritative resolved price + refreshed agent snapshot
      // back into the intent so all downstream stages (Paystack init,
      // finalization, commission calc) see the same number.
      const intentPatch: Record<string, unknown> = {};
      if (priceDelta > 0) intentPatch.amount_expected = resolvedPrice;
      if (agentProfileIdForPrice) {
        const existingReferral = (existingCtx.referral || {}) as Record<string, unknown>;
        const basePrice = pkg ? Number(pkg.agent_base_price ?? 0) : 0;
        
        existingCtx.referral = {
          ...existingReferral,
          agent_selling_price: resolvedPrice,
          agent_base_price: basePrice * quantity,
        };
        existingCtx.server_resolved_price_source = priceSource;
        
        intentPatch.order_context = existingCtx;
      }
      if (Object.keys(intentPatch).length > 0) {
        await supabase
          .from("purchase_intents")
          .update(intentPatch)
          .eq("id", intent_id);
      }
    }

    // ── 3. Calculate Paystack fee — 3% on bundles & deposits, 0% on agent subscriptions
    //    (subscription is flat-priced: GHS 30/mo, GHS 300/yr).
    const breakdown = isAgentSubscription
      ? {
          baseAmount: authoritative_base_amount,
          feeAmount: 0,
          feeRate: 0,
          totalAmount: authoritative_base_amount,
        }
      : calculatePaystackFee(authoritative_base_amount);

    // ── 4. Build Paystack reference ──
    const paystackReference = intent.intent_reference;

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const callbackUrl = `${origin}/payment/callback?ref=${encodeURIComponent(intent.intent_reference)}`;

    const customerEmail =
      intent.customer_email || `guest+${intent.intent_reference.toLowerCase()}@kaiferdata.com`;

    // ── 5. Build Paystack metadata ──
    const customFields = [
      { display_name: "Reference", variable_name: "intent_reference", value: intent.intent_reference },
      { display_name: "Type", variable_name: "intent_type", value: intent.intent_type },
      { display_name: "Base Amount", variable_name: "base_amount", value: `GHS ${breakdown.baseAmount.toFixed(2)}` },
      { display_name: "Processing Fee", variable_name: "fee_amount", value: `GHS ${breakdown.feeAmount.toFixed(2)}` },
    ];

    if (!isDeposit) {
      customFields.push(
        { display_name: "Network", variable_name: "network", value: intent.network },
        { display_name: "Bundle", variable_name: "bundle", value: String(snapshot.volume || snapshot.plan_name || snapshot.package_name || "") },
        { display_name: "Recipient Phone", variable_name: "recipient_phone", value: intent.phone_number },
      );
    }

    const paystackPayload = {
      email: customerEmail,
      amount: Math.round(breakdown.totalAmount * 100),
      currency: "GHS",
      reference: paystackReference,
      callback_url: callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: {
        custom_fields: customFields,
        intent_id: intent.id,
        intent_reference: intent.intent_reference,
        intent_type: intent.intent_type,
        network: intent.network,
        phone_number: intent.phone_number,
        base_amount: breakdown.baseAmount,
        fee_amount: breakdown.feeAmount,
        fee_rate: breakdown.feeRate,
        total_amount: breakdown.totalAmount,
      },
    };

    if (isAgentSubscription) {
      console.log("[initialize-payment] agent subscription init", {
        intent_id,
        intent_reference: intent.intent_reference,
        actor_id: intent.actor_id,
        plan: String(snapshot.plan || ""),
        resolved_amount: breakdown.totalAmount,
        callback_url: callbackUrl,
        intent_status: intent.status,
      });
    }

    // ── 6. Initialize Paystack transaction ──
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error("Paystack init failed:", {
        intent_id,
        intent_reference: intent.intent_reference,
        intent_type: intent.intent_type,
        actor_id: intent.actor_id,
        response: paystackData,
      });
      return json({ error: "Payment initialization failed. Please try again." }, 502);
    }

    // ── 7. Update intent with server-authoritative fee breakdown ──
    await supabase
      .from("purchase_intents")
      .update({
        status: "pending_payment",
        payment_method: "paystack",
        base_amount: breakdown.baseAmount,
        fee_amount: breakdown.feeAmount,
        fee_rate: breakdown.feeRate,
        total_amount: breakdown.totalAmount,
        amount_expected: breakdown.totalAmount,
        order_context: {
          ...existingCtx,
          paystack_reference: paystackReference,
          paystack_access_code: paystackData.data.access_code,
          payment_initialized_at: new Date().toISOString(),
          server_resolved_base: breakdown.baseAmount,
          fee_breakdown: {
            base_amount: breakdown.baseAmount,
            fee_amount: breakdown.feeAmount,
            fee_rate: breakdown.feeRate,
            total_amount: breakdown.totalAmount,
          },
        },
      })
      .eq("id", intent_id);

    // ── 8. Return authorization URL ──
    return json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackReference,
      intent_reference: intent.intent_reference,
      fee_breakdown: {
        base_amount: breakdown.baseAmount,
        fee_amount: breakdown.feeAmount,
        fee_rate: breakdown.feeRate,
        total_amount: breakdown.totalAmount,
      },
    });
  } catch (err) {
    console.error("initialize-payment error:", err);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});