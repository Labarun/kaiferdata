/**
 * Edge Function: recover-payments
 *
 * Background sweep that finds successful Paystack payments stuck in an
 * unfinalized state and re-runs finalization via the shared helper.
 *
 * Targets:
 *   1. Intents in created/pending_payment/payment_processing/payment_confirmed
 *      that are >2 minutes old and <48 hours old.
 *   2. For each, calls Paystack /transaction/verify; if status === "success",
 *      runs finalizePaystackPayment.
 *
 * SAFETY:
 *   - Idempotent (shared finalizer is idempotent)
 *   - Bounded scope (recent unfinished only)
 *   - No spam: a single sweep per invocation
 *   - Skips deposits/purchases already completed
 *   - Auth: service role key OR admin JWT (for manual trigger)
 *
 * Schedule via pg_cron every 2 minutes:
 *   select cron.schedule('recover-payments', '*\/2 * * * *', $$ ... $$);
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { finalizePaystackPayment } from "../_shared/finalize-payment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // ── AUTH: service role key (cron) or admin JWT (manual trigger) ──
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let triggeredBy: string = "cron";

    if (token !== supabaseServiceKey) {
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);
      const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!hasAdmin) return json({ error: "Admin access required" }, 403);
      triggeredBy = `admin:${user.id}`;
    }

    // Optional: a specific reference to recover (admin retry)
    let targetReference: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.reference && typeof body.reference === "string") {
          targetReference = body.reference;
        }
      } catch { /* no body is fine */ }
    }

    const startedAt = Date.now();
    const stats = {
      scanned: 0,
      verified_success: 0,
      finalized: 0,
      already_processed: 0,
      not_yet_paid: 0,
      blocked: 0,
      errors: 0,
    };
    const details: Array<Record<string, unknown>> = [];

    // ── SCOPE ──
    const minAgeMs = 2 * 60 * 1000; // 2 min — give frontend callback first crack
    const maxAgeMs = 48 * 60 * 60 * 1000; // 48 hr — beyond this, manual recovery
    const cutoffOld = new Date(Date.now() - minAgeMs).toISOString();
    const cutoffMax = new Date(Date.now() - maxAgeMs).toISOString();

    let intents: Array<Record<string, unknown>> = [];
    if (targetReference) {
      const { data } = await supabase
        .from("purchase_intents")
        .select("id, intent_reference, status, intent_type, created_at")
        .eq("intent_reference", targetReference)
        .limit(1);
      intents = data || [];
    } else {
      const { data } = await supabase
        .from("purchase_intents")
        .select("id, intent_reference, status, intent_type, created_at")
        .in("status", ["created", "pending_payment", "payment_processing", "payment_confirmed"])
        .lte("created_at", cutoffOld)
        .gte("created_at", cutoffMax)
        .order("created_at", { ascending: true })
        .limit(50); // bounded
      intents = data || [];
    }

    stats.scanned = intents.length;

    for (const intent of intents) {
      const reference = intent.intent_reference as string;
      try {
        // ── Quick Paystack check ──
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } },
        );
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData.status) {
          stats.errors += 1;
          details.push({ reference, error: "paystack_verify_failed" });
          continue;
        }

        const paystackStatus = verifyData.data?.status;
        if (paystackStatus !== "success") {
          stats.not_yet_paid += 1;
          details.push({ reference, paystack_status: paystackStatus });
          continue;
        }

        stats.verified_success += 1;

        // ── Run shared finalizer ──
        const result = await finalizePaystackPayment(
          supabase,
          reference,
          "recovery_sweep",
          PAYSTACK_SECRET,
        );

        if (result.success) {
          if (result.already_processed) {
            stats.already_processed += 1;
          } else {
            stats.finalized += 1;
          }
          details.push({
            reference,
            recovered: !result.already_processed,
            intent_type: result.intent_type,
          });
        } else {
          if (result.blocked) {
            stats.blocked += 1;
          } else {
            stats.errors += 1;
          }
          details.push({ reference, error: result.error, blocked: result.blocked });
        }
      } catch (err) {
        console.error(`[recover-payments] error for ${reference}:`, err);
        stats.errors += 1;
        details.push({ reference, error: String(err) });
      }
    }

    const durationMs = Date.now() - startedAt;

    // Only audit-log if we actually did work
    if (stats.scanned > 0) {
      await supabase.from("audit_logs").insert({
        action: "recover_payments_sweep",
        actor_role: "system",
        target_type: "system",
        metadata: {
          triggered_by: triggeredBy,
          duration_ms: durationMs,
          target_reference: targetReference,
          ...stats,
        },
      });
    }

    return json({
      success: true,
      stats,
      duration_ms: durationMs,
      details: details.slice(0, 50),
    });
  } catch (err) {
    console.error("[recover-payments] fatal:", err);
    return json({ error: "Internal error", detail: String(err) }, 500);
  }
});
