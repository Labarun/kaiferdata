/**
 * Edge Function: supplier-diagnostics
 *
 * Admin-only endpoint that runs health check, balance check, and connectivity
 * diagnostics against the configured supplier API.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildAuthHeaders(authConfig: Record<string, unknown>): Record<string, string> {
  const secretName = (authConfig.secret_name as string) || "SUPPLIER_API_KEY";
  const apiKey = Deno.env.get(secretName);
  if (!apiKey) throw new Error(`Missing secret: ${secretName}`);

  const authType = (authConfig.auth_type as string) || "bearer";
  const headerName = (authConfig.header_name as string) || "Authorization";

  switch (authType) {
    case "bearer":
      return { [headerName]: `Bearer ${apiKey}` };
    case "api_key":
      return { [headerName]: apiKey };
    default:
      return { [headerName]: apiKey };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (token !== supabaseServiceKey) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);
      const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!hasAdmin) return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const { supplier_id, checks = ["health", "balance"] } = body;

    if (!supplier_id) return json({ error: "Missing supplier_id" }, 400);

    // Fetch supplier
    const { data: supplier, error: suppErr } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplier_id)
      .single();

    if (suppErr || !supplier) return json({ error: "Supplier not found" }, 404);

    const endpointConfig = (supplier.endpoint_config || {}) as Record<string, unknown>;
    const authConfig = (supplier.auth_config || {}) as Record<string, unknown>;

    let authHeaders: Record<string, string>;
    try {
      authHeaders = buildAuthHeaders(authConfig);
    } catch (err) {
      return json({ error: String(err), health: null, balance: null }, 500);
    }

    const results: Record<string, unknown> = {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      base_url: supplier.api_base_url,
      timestamp: new Date().toISOString(),
    };

    // Health check
    if (checks.includes("health")) {
      const healthEndpoint = (endpointConfig.health || {}) as Record<string, unknown>;
      const healthPath = (healthEndpoint.path as string) || "/v1/health";
      try {
        const start = Date.now();
        const res = await fetch(`${supplier.api_base_url}${healthPath}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", ...authHeaders },
          signal: AbortSignal.timeout(10000),
        });
        const elapsed = Date.now() - start;
        const data = await res.json().catch(() => null);
        results.health = {
          ok: res.ok,
          status_code: res.status,
          response_time_ms: elapsed,
          data,
        };
      } catch (err) {
        results.health = { ok: false, error: String(err) };
      }
    }

    // Balance check
    if (checks.includes("balance")) {
      const balanceEndpoint = (endpointConfig.balance || {}) as Record<string, unknown>;
      const balancePath = (balanceEndpoint.path as string) || "/v1/account/balance";
      try {
        const res = await fetch(`${supplier.api_base_url}${balancePath}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", ...authHeaders },
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json().catch(() => null);
        results.balance = {
          ok: res.ok,
          status_code: res.status,
          data,
        };
      } catch (err) {
        results.balance = { ok: false, error: String(err) };
      }
    }

    // Fetch last sync stats
    const { data: lastProductSync } = await supabase
      .from("supplier_sync_logs")
      .select("*")
      .eq("supplier_id", supplier_id)
      .eq("sync_type", "product_sync")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastStatusSync } = await supabase
      .from("supplier_sync_logs")
      .select("*")
      .eq("supplier_id", supplier_id)
      .eq("sync_type", "status_sync")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastSuccessfulOrder } = await supabase
      .from("supplier_request_logs")
      .select("*")
      .eq("supplier_id", supplier_id)
      .eq("is_success", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastFailedRequest } = await supabase
      .from("supplier_request_logs")
      .select("*")
      .eq("supplier_id", supplier_id)
      .eq("is_success", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    results.last_product_sync = lastProductSync || null;
    results.last_status_sync = lastStatusSync || null;
    results.last_successful_order = lastSuccessfulOrder || null;
    results.last_failed_request = lastFailedRequest || null;

    // Webhook URL info
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    results.webhook_url = `${supabaseUrl}/functions/v1/supplier-webhook`;

    return json(results);
  } catch (err) {
    console.error("supplier-diagnostics error:", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
