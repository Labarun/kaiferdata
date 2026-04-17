/**
 * Edge Function: verify-payment (HARDENED + ATOMIC)
 *
 * Frontend callback path for Paystack payment verification.
 * All finalization logic now lives in _shared/finalize-payment.ts and is
 * shared with paystack-webhook + recover-payments — guaranteeing identical,
 * idempotent behavior across all entry points.
 *
 * SECURITY:
 *   - Strict amount + price re-verification (in shared module)
 *   - Atomic intent claim + atomic wallet credit (in shared module)
 *   - In-memory rate limit per reference (this layer)
 *   - Idempotent: re-calling with same reference returns existing result
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { finalizePaystackPayment } from "../_shared/finalize-payment.ts";

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

// ── In-memory rate limiter ──
const recentRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const timestamps = (recentRequests.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  recentRequests.set(key, timestamps);
  if (recentRequests.size > 1000) {
    for (const [k, v] of recentRequests) {
      if (v.every((t) => now - t > RATE_LIMIT_WINDOW_MS)) recentRequests.delete(k);
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const reference = body?.reference;
    if (!reference || typeof reference !== "string") {
      return json({ error: "Missing payment reference" }, 400);
    }

    // ── RATE LIMIT ──
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

    // ── DELEGATE TO SHARED FINALIZER ──
    const result = await finalizePaystackPayment(
      supabase,
      reference,
      "verify_callback",
      PAYSTACK_SECRET,
    );

    const status = result.status || (result.success ? 200 : 400);

    return json(
      {
        success: result.success,
        already_processed: result.already_processed,
        intent_type: result.intent_type,
        intent_reference: result.intent_reference,
        order: result.order,
        deposit: result.deposit,
        payment_verified: result.payment_verified,
        error: result.error,
        blocked: result.blocked,
      },
      status,
    );
  } catch (err) {
    console.error("verify-payment error:", err);
    return json({ error: "An unexpected error occurred" }, 500);
  }
});
