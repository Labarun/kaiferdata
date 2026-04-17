/**
 * Edge Function: wallet-purchase
 *
 * Logged-in users pay for a data bundle directly from their personal wallet.
 *
 * Pipeline:
 *   1. Validate JWT and identify the caller
 *   2. Call `purchase_with_wallet_atomic` (server-side price re-resolution,
 *      atomic debit + order creation)
 *   3. Trigger `fulfill-order` (non-blocking — order is already paid)
 *
 * Security:
 *   - Zero-trust pricing: front-end can NOT influence the amount charged
 *   - Atomic debit prevents double-deduction under concurrent requests
 *   - Per-user rate limit (3 purchases / 30s) to mitigate abuse
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

// Per-user rate limiter
const recent = new Map<string, number[]>();
const WINDOW = 30_000;
const MAX = 3;
function rateOk(userId: string): boolean {
  const now = Date.now();
  const ts = (recent.get(userId) || []).filter((t) => now - t < WINDOW);
  if (ts.length >= MAX) return false;
  ts.push(now);
  recent.set(userId, ts);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── 1. Identify caller via JWT ──
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json({ error: "Invalid session" }, 401);
    }
    const userId = authData.user.id;

    if (!rateOk(userId)) {
      return json({ error: "Too many purchase attempts. Please wait a moment." }, 429);
    }

    // ── 2. Validate body ──
    const body = await req.json().catch(() => ({}));
    const packageId = String(body?.package_id || "");
    const phoneNumber = String(body?.phone_number || "").replace(/\D/g, "");
    const network = String(body?.network || "");
    const customerName = body?.customer_name ? String(body.customer_name) : null;
    const customerEmail = body?.customer_email ? String(body.customer_email) : null;

    if (!packageId) return json({ error: "Missing package_id" }, 400);
    if (phoneNumber.length < 10 || phoneNumber.length > 11) {
      return json({ error: "A valid 10-11 digit Ghana phone number is required" }, 400);
    }
    if (!network) return json({ error: "Network is required" }, 400);

    // ── 3. Atomic purchase ──
    const supabase = createClient(supabaseUrl, supabaseService);
    const { data: result, error: rpcErr } = await supabase.rpc("purchase_with_wallet_atomic", {
      _user_id: userId,
      _package_id: packageId,
      _phone_number: phoneNumber,
      _network: network,
      _customer_name: customerName,
      _customer_email: customerEmail,
      _source_channel: "user_dashboard_wallet",
    });

    if (rpcErr) {
      console.error("[wallet-purchase] RPC failed:", rpcErr);
      const msg = rpcErr.message || "Wallet purchase failed";
      // Map known errors to user-friendly status codes
      const lower = msg.toLowerCase();
      if (lower.includes("insufficient")) return json({ error: msg }, 402);
      if (lower.includes("not active") || lower.includes("disabled")) return json({ error: msg }, 503);
      if (lower.includes("not available") || lower.includes("not found") || lower.includes("mismatch")) {
        return json({ error: msg }, 422);
      }
      return json({ error: msg }, 400);
    }

    const row = Array.isArray(result) ? result[0] : result;
    if (!row?.order_id) {
      return json({ error: "Purchase did not return an order. Please try again." }, 500);
    }

    // ── 4. Trigger fulfillment (non-blocking) ──
    let fulfillment: unknown = null;
    try {
      const fr = await fetch(`${supabaseUrl}/functions/v1/fulfill-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseService}`,
        },
        body: JSON.stringify({ order_id: row.order_id }),
      });
      fulfillment = await fr.json().catch(() => null);
    } catch (err) {
      console.error("[wallet-purchase] fulfillment trigger failed (non-blocking):", err);
    }

    return json({
      success: true,
      order_id: row.order_id,
      public_order_id: row.public_order_id,
      amount_charged: Number(row.amount_charged),
      new_balance: Number(row.new_balance),
      txn_id: row.txn_id,
      fulfillment,
    });
  } catch (err) {
    console.error("[wallet-purchase] unexpected:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
