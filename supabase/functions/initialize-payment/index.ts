/**
 * Edge Function: initialize-payment
 * Supports both purchase intents (bundle buy) and deposit intents (wallet top-up).
 * Validates intent, initializes Paystack, returns authorization_url.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Check expiry
    if (intent.expires_at && new Date(intent.expires_at) < new Date()) {
      await supabase
        .from("purchase_intents")
        .update({ status: "expired" })
        .eq("id", intent_id);
      return json({ error: "This request has expired. Please start again." }, 410);
    }

    // ── 2. Validate package if this is a bundle purchase ──
    const isDeposit = intent.intent_type === "wallet_deposit";
    const snapshot = (intent.plan_snapshot || {}) as Record<string, unknown>;

    if (!isDeposit && snapshot.id) {
      // Validate against data_packages (not data_plans)
      const { data: pkg } = await supabase
        .from("data_packages")
        .select("id, selling_price, is_active")
        .eq("id", snapshot.id as string)
        .single();

      if (!pkg || !pkg.is_active) {
        return json({ error: "The selected package is no longer available" }, 422);
      }

      if (Math.abs(Number(pkg.selling_price) - Number(intent.amount_expected)) > 0.01) {
        return json({ error: "Package price has changed. Please start a new order." }, 422);
      }
    }

    // ── 3. Build Paystack reference ──
    const paystackReference = intent.intent_reference;

    // Determine callback URL
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const callbackUrl = `${origin}/payment/callback?ref=${encodeURIComponent(intent.intent_reference)}`;

    const customerEmail =
      intent.customer_email || `guest+${intent.intent_reference.toLowerCase()}@kaiferdata.com`;

    // ── 4. Build Paystack metadata ──
    const customFields = [
      { display_name: "Reference", variable_name: "intent_reference", value: intent.intent_reference },
      { display_name: "Type", variable_name: "intent_type", value: intent.intent_type },
    ];

    if (!isDeposit) {
      customFields.push(
        { display_name: "Network", variable_name: "network", value: intent.network },
        { display_name: "Bundle", variable_name: "bundle", value: String(snapshot.volume || snapshot.plan_name || "") },
        { display_name: "Recipient Phone", variable_name: "recipient_phone", value: intent.phone_number },
      );
    }

    const paystackPayload = {
      email: customerEmail,
      amount: Math.round(Number(intent.amount_expected) * 100), // pesewas
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
      },
    };

    // ── 5. Initialize Paystack transaction ──
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

    // ── 6. Update intent status ──
    await supabase
      .from("purchase_intents")
      .update({
        status: "pending_payment",
        payment_method: "paystack",
        order_context: {
          ...(intent.order_context as Record<string, unknown> || {}),
          paystack_reference: paystackReference,
          paystack_access_code: paystackData.data.access_code,
          payment_initialized_at: new Date().toISOString(),
        },
      })
      .eq("id", intent_id);

    // ── 7. Return authorization URL ──
    return json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackReference,
      intent_reference: intent.intent_reference,
    });
  } catch (err) {
    console.error("initialize-payment error:", err);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
