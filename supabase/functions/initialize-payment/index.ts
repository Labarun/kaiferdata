/**
 * Edge Function: initialize-payment
 * Creates/validates a purchase intent, then initializes Paystack payment.
 * Returns the Paystack authorization_url for redirect.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) {
      return new Response(
        JSON.stringify({ error: "Payment provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { intent_id } = body;

    if (!intent_id) {
      return new Response(
        JSON.stringify({ error: "Missing intent_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Fetch and validate the purchase intent ──
    const { data: intent, error: intentError } = await supabase
      .from("purchase_intents")
      .select("*")
      .eq("id", intent_id)
      .single();

    if (intentError || !intent) {
      return new Response(
        JSON.stringify({ error: "Purchase intent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate intent is in correct state
    if (intent.status !== "created") {
      return new Response(
        JSON.stringify({
          error: `Intent is already in '${intent.status}' state`,
          intent_reference: intent.intent_reference,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (intent.expires_at && new Date(intent.expires_at) < new Date()) {
      await supabase
        .from("purchase_intents")
        .update({ status: "expired" })
        .eq("id", intent_id);

      return new Response(
        JSON.stringify({ error: "This purchase intent has expired. Please start a new order." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Validate plan still exists and amount matches ──
    if (intent.plan_id) {
      const { data: plan } = await supabase
        .from("data_plans")
        .select("id, amount, is_active")
        .eq("id", intent.plan_id)
        .single();

      if (!plan || !plan.is_active) {
        return new Response(
          JSON.stringify({ error: "The selected plan is no longer available" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Number(plan.amount) !== Number(intent.amount_expected)) {
        return new Response(
          JSON.stringify({ error: "Plan price has changed. Please start a new order." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 3. Build Paystack reference ──
    const paystackReference = `${intent.intent_reference}`;

    // Determine callback URL
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const callbackUrl = `${origin}/payment/callback?ref=${encodeURIComponent(intent.intent_reference)}`;

    // Customer email — use provided or generate a fallback
    const customerEmail =
      intent.customer_email || `guest+${intent.intent_reference.toLowerCase()}@kaiferdata.com`;

    // Plan snapshot for metadata
    const snapshot = intent.plan_snapshot as Record<string, unknown>;

    // ── 4. Initialize Paystack transaction ──
    const paystackPayload = {
      email: customerEmail,
      amount: Math.round(Number(intent.amount_expected) * 100), // Paystack uses pesewas
      currency: "GHS",
      reference: paystackReference,
      callback_url: callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: {
        custom_fields: [
          { display_name: "Intent Reference", variable_name: "intent_reference", value: intent.intent_reference },
          { display_name: "Network", variable_name: "network", value: intent.network },
          { display_name: "Bundle", variable_name: "bundle", value: String(snapshot.volume || "") },
          { display_name: "Recipient Phone", variable_name: "recipient_phone", value: intent.phone_number },
          { display_name: "Source", variable_name: "source_channel", value: intent.source_channel },
        ],
        intent_id: intent.id,
        intent_reference: intent.intent_reference,
        network: intent.network,
        phone_number: intent.phone_number,
      },
    };

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
      return new Response(
        JSON.stringify({ error: "Payment initialization failed. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Update intent with Paystack reference and status ──
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

    // ── 6. Return authorization URL ──
    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackReference,
        intent_reference: intent.intent_reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("initialize-payment error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
