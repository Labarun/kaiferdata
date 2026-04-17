/**
 * Edge Function: paystack-webhook
 *
 * Receives charge.success events from Paystack and finalizes payments
 * via the shared finalizePaystackPayment helper.
 *
 * SECURITY:
 *   - HMAC-SHA512 signature verification on raw body using PAYSTACK_SECRET_KEY
 *   - Re-verifies the transaction with Paystack API (zero-trust — never trust
 *     webhook payload amounts directly)
 *   - All finalization goes through the same shared logic as verify-payment,
 *     so all anti-manipulation checks apply equally.
 *
 * This webhook MUST be configured in the Paystack Dashboard under
 *   Settings → API Keys & Webhooks → Webhook URL
 *
 * Webhook URL format:
 *   https://<project-ref>.supabase.co/functions/v1/paystack-webhook
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";
import { finalizePaystackPayment } from "../_shared/finalize-payment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Constant-time comparison */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) {
      console.error("[paystack-webhook] PAYSTACK_SECRET_KEY not configured");
      return json({ error: "Webhook not configured" }, 503);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 1. READ RAW BODY (must be raw for HMAC) ──
    const rawBody = await req.text();

    // ── 2. SIGNATURE VERIFICATION (HMAC-SHA512 of raw body using secret key) ──
    const signature = req.headers.get("x-paystack-signature") || "";

    if (!signature) {
      await supabase.from("audit_logs").insert({
        action: "paystack_webhook_missing_signature",
        actor_role: "system",
        target_type: "webhook",
        metadata: { source: "paystack" },
      });
      return json({ error: "Missing signature" }, 401);
    }

    const expected = createHmac("sha512", PAYSTACK_SECRET).update(rawBody).digest("hex");

    if (!safeCompare(signature, expected)) {
      await supabase.from("audit_logs").insert({
        action: "paystack_webhook_invalid_signature",
        actor_role: "system",
        target_type: "webhook",
        metadata: {
          source: "paystack",
          received_signature_prefix: signature.slice(0, 16),
        },
      });
      console.error("[paystack-webhook] Invalid signature");
      return json({ error: "Invalid signature" }, 401);
    }

    // ── 3. PARSE PAYLOAD ──
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const eventType = String(event.event || "");
    const data = (event.data || {}) as Record<string, unknown>;
    const reference = String(data.reference || "");

    // Always 200 OK for non-actionable events so Paystack doesn't retry endlessly
    if (eventType !== "charge.success") {
      return json({ received: true, ignored: eventType });
    }

    if (!reference) {
      console.error("[paystack-webhook] charge.success without reference");
      return json({ error: "Missing reference" }, 400);
    }

    // ── 4. FINALIZE via SHARED LOGIC ──
    console.log(`[paystack-webhook] Finalizing reference: ${reference}`);
    const result = await finalizePaystackPayment(
      supabase,
      reference,
      "paystack_webhook",
      PAYSTACK_SECRET,
    );

    // Audit
    await supabase.from("audit_logs").insert({
      action: result.success
        ? (result.already_processed ? "paystack_webhook_already_processed" : "paystack_webhook_finalized")
        : "paystack_webhook_finalization_failed",
      actor_role: "system",
      target_type: "purchase_intent",
      target_id: reference,
      metadata: {
        reference,
        intent_type: result.intent_type,
        intent_reference: result.intent_reference,
        already_processed: result.already_processed,
        error: result.error,
        blocked: result.blocked,
      },
    });

    // Always return 200 OK to acknowledge receipt to Paystack (so it doesn't
    // pile up retries). The result is recorded in audit logs.
    return json({
      received: true,
      success: result.success,
      already_processed: result.already_processed || false,
      intent_reference: result.intent_reference,
    });
  } catch (err) {
    console.error("[paystack-webhook] error:", err);
    // Return 500 so Paystack retries (genuine server error)
    return json({ error: "Internal error" }, 500);
  }
});
