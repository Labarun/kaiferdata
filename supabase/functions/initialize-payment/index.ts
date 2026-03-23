/**
 * Edge Function: initialize-payment (HARDENED)
 * 
 * Supports purchase intents (bundle buy) and deposit intents (wallet top-up).
 * Server-side price resolution — NEVER trusts frontend amounts for packages.
 * Applies 3% Paystack fee. Initializes Paystack. Returns authorization_url.
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

    if (intent.status !== "created") {
      return json({
        error: `This request is already in '${intent.status}' state`,
        intent_reference: intent.intent_reference,
      }, 409);
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

    const isDeposit = intent.intent_type === "wallet_deposit";
    const snapshot = (intent.plan_snapshot || {}) as Record<string, unknown>;

    // ── 2. SERVER-SIDE PRICE RESOLUTION (CRITICAL SECURITY) ──
    let authoritative_base_amount: number;

    if (isDeposit) {
      // For deposits, the user chooses the amount — use intent.amount_expected
      // But enforce a minimum and maximum
      const depositAmount = Number(intent.amount_expected);
      if (!depositAmount || depositAmount < 1 || depositAmount > 50000) {
        return json({ error: "Invalid deposit amount" }, 422);
      }
      authoritative_base_amount = Math.round(depositAmount * 100) / 100;
    } else {
      // For package purchases: RESOLVE PRICE FROM DATABASE, NEVER TRUST FRONTEND
      const packageId = snapshot.id as string;
      
      if (!packageId) {
        return json({ error: "Invalid package reference. Please start a new order." }, 422);
      }

      // Try data_packages first (primary catalog)
      let resolvedPrice: number | null = null;
      let packageValid = false;

      const { data: pkg } = await supabase
        .from("data_packages")
        .select("id, selling_price, is_active, visible_on_public, visible_for_logged_in, package_name")
        .eq("id", packageId)
        .single();

      if (pkg) {
        if (!pkg.is_active) {
          return json({ error: "This package is no longer available." }, 422);
        }
        // Verify visibility based on actor type
        if (intent.actor_type === "guest" && !pkg.visible_on_public) {
          return json({ error: "This package is not available for guest purchase." }, 422);
        }
        resolvedPrice = Number(pkg.selling_price);
        packageValid = true;
      }

      // Fallback: try data_plans table
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
          },
        });
        return json({ error: "Package not found. Please start a new order." }, 422);
      }

      // CRITICAL: Check if frontend amount matches server price
      const frontendAmount = Number(intent.amount_expected);
      if (Math.abs(frontendAmount - resolvedPrice) > 0.01) {
        console.error(`SECURITY: Price manipulation detected! Frontend sent ${frontendAmount}, server price is ${resolvedPrice}. Intent: ${intent.intent_reference}`);
        
        await supabase
          .from("purchase_intents")
          .update({
            status: "failed",
            order_context: {
              ...((intent.order_context as Record<string, unknown>) || {}),
              security_blocked: true,
              reason: "price_manipulation_detected",
              frontend_amount: frontendAmount,
              server_price: resolvedPrice,
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
            intent_reference: intent.intent_reference,
            actor_type: intent.actor_type,
            actor_id: intent.actor_id,
          },
        });

        return json({ error: "Price has changed. Please start a new order." }, 422);
      }

      // Use the SERVER-RESOLVED price as authoritative
      authoritative_base_amount = resolvedPrice;

      // Update intent with corrected server price (in case of tiny rounding differences)
      if (Math.abs(frontendAmount - resolvedPrice) > 0) {
        await supabase
          .from("purchase_intents")
          .update({ amount_expected: resolvedPrice })
          .eq("id", intent_id);
      }
    }

    // ── 3. Calculate Paystack fee (3%) using SERVER price ──
    const breakdown = calculatePaystackFee(authoritative_base_amount);

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
      amount: Math.round(breakdown.totalAmount * 100), // pesewas
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
      console.error("Paystack init failed:", paystackData);
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
        amount_expected: breakdown.totalAmount, // total is what Paystack will collect
        order_context: {
          ...(intent.order_context as Record<string, unknown> || {}),
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
