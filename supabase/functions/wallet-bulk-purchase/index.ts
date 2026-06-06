/**
 * Edge Function: wallet-bulk-purchase
 *
 * Logged-in agents pay for bulk data bundles directly from their personal wallet.
 *
 * Pipeline:
 *   1. Validate JWT and identify the caller
 *   2. Call `purchase_bulk_with_wallet_atomic` (atomic loop over recipients)
 *   3. Fetch the newly created orders via txn_id
 *   4. Trigger `fulfill-order` for each created order (non-blocking)
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
    const phoneNumbers = Array.isArray(body?.phone_numbers) ? body.phone_numbers : [];
    const network = String(body?.network || "");

    if (!packageId) return json({ error: "Missing package_id" }, 400);
    if (phoneNumbers.length === 0) {
      return json({ error: "At least one valid phone number is required" }, 400);
    }
    if (!network) return json({ error: "Network is required" }, 400);

    // ── 3. Atomic bulk purchase ──
    const supabase = createClient(supabaseUrl, supabaseService);
    const { data: result, error: rpcErr } = await supabase.rpc("purchase_bulk_with_wallet_atomic", {
      _user_id: userId,
      _package_id: packageId,
      _phone_numbers: phoneNumbers,
      _network: network,
      _source_channel: "agent_bulk_dashboard",
    });

    if (rpcErr) {
      console.error("[wallet-bulk-purchase] RPC failed:", rpcErr);
      const msg = rpcErr.message || "Bulk wallet purchase failed";
      const lower = msg.toLowerCase();
      if (lower.includes("insufficient")) return json({ error: msg }, 402);
      if (lower.includes("not active") || lower.includes("disabled")) return json({ error: msg }, 503);
      if (lower.includes("not available") || lower.includes("not found") || lower.includes("mismatch")) {
        return json({ error: msg }, 422);
      }
      return json({ error: msg }, 400);
    }

    // RPC returns TABLE(created_count int, new_balance numeric, txn_id uuid)
    // Supabase JS returns an array for TABLE functions
    const row = Array.isArray(result) ? result[0] : result;
    if (!row?.txn_id) {
      return json({ error: "Purchase did not return a transaction ID." }, 500);
    }

    // ── 4. Retrieve created orders & Trigger fulfillment ──
    let createdCount = row.created_count;
    
    // Non-blocking fulfillment processing
    // We execute this concurrently but wait for it so the edge function doesn't die instantly
    // (though Deno.serve sometimes allows async background tasks, waiting is safer for V8 isolates)
    const { data: createdOrders } = await supabase
      .from("orders")
      .select("id, public_order_id")
      .eq("metadata->>wallet_txn_id", row.txn_id);

    const fulfillments = [];
    if (createdOrders && createdOrders.length > 0) {
      const promises = createdOrders.map(async (o) => {
        try {
          const fr = await fetch(`${supabaseUrl}/functions/v1/fulfill-order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseService}`,
            },
            body: JSON.stringify({ order_id: o.id }),
          });
          return await fr.json().catch(() => null);
        } catch (err) {
          console.error(`[wallet-bulk-purchase] fulfillment trigger failed for order ${o.id}:`, err);
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      fulfillments.push(...results);
    }

    return json({
      success: true,
      created_count: createdCount,
      new_balance: Number(row.new_balance),
      txn_id: row.txn_id,
      orders: createdOrders || [],
      fulfillments,
    });
  } catch (err) {
    console.error("[wallet-bulk-purchase] unexpected:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
