/**
 * Edge Function: sync-order-status
 *
 * Polls the supplier API for status updates on non-final orders.
 * Can be triggered manually by admin or via scheduled cron.
 *
 * Supports: single order or batch (all pending orders).
 * Auth: service-role key or admin JWT.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINAL_STATUSES = ["delivered", "failed", "cancelled", "refunded"];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
    obj as unknown,
  );
}

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

/** Map supplier status → internal order status using config mapping */
function normalizeStatus(
  rawStatus: string,
  statusMapping: Record<string, string>
): string {
  const mapped = statusMapping[rawStatus] || statusMapping[rawStatus.toLowerCase()];
  if (mapped) return mapped;

  // Reasonable defaults
  const lower = rawStatus.toLowerCase();
  if (lower.includes("deliver") || lower.includes("success") || lower.includes("complet")) return "delivered";
  if (lower.includes("fail") || lower.includes("error") || lower.includes("reject")) return "failed";
  if (lower.includes("cancel")) return "cancelled";
  if (lower.includes("hold")) return "on_hold";
  if (lower.includes("process") || lower.includes("pend") || lower.includes("initiat")) return "processing";
  if (lower.includes("queue") || lower.includes("accept")) return "queued";

  return "processing"; // Safe default
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Auth: REQUIRED. service-role key or admin JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (token !== supabaseServiceKey) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);
      const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!hasAdmin) return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetOrderId = (body as Record<string, unknown>).order_id as string | undefined;
    const forceSupplierId = (body as Record<string, unknown>).supplier_id as string | undefined;

    // ── Fetch suppliers (we fetch all active so we can force sync via UI) ──
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true);

    if (!suppliers || suppliers.length === 0) {
      return json({ message: "No suppliers configured for status sync", updated: 0 });
    }

    // ── Fetch non-final orders with supplier references ──
    let ordersQuery = supabase
      .from("orders")
      .select("id, public_order_id, status, supplier_reference, supplier_status, delivery_message, network, bundle_code, bundle_snapshot, amount_charged, beneficiary_number")
      .not("supplier_reference", "is", null)
      .not("status", "in", `(${FINAL_STATUSES.join(",")})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (targetOrderId) {
      ordersQuery = supabase
        .from("orders")
        .select("id, public_order_id, status, supplier_reference, supplier_status, delivery_message, network, bundle_code, bundle_snapshot, amount_charged, beneficiary_number")
        .eq("id", targetOrderId)
        .not("supplier_reference", "is", null)
        .limit(1);
    }

    const { data: orders } = await ordersQuery;
    if (!orders || orders.length === 0) {
      return json({ message: "No orders pending status sync", updated: 0 });
    }

    // Create sync log
    const { data: syncLog } = await supabase
      .from("supplier_sync_logs")
      .insert({
        supplier_id: suppliers[0].id,
        sync_type: "status_sync",
        status: "started",
        metadata: { target_order_id: targetOrderId || null, order_count: orders.length },
      })
      .select()
      .single();

    let updatedCount = 0;
    const errors: string[] = [];

    for (const order of orders) {
      // Try to find the actual supplier used for this order from request logs
      // We take the most recent log regardless of is_success, because some successful fallbacks 
      // are forced into 'on_hold' status for UX, which incorrectly marked their logs as is_success=false.
      let matchedSupplierId = forceSupplierId || null;
      
      if (!matchedSupplierId) {
        const { data: requestLogs } = await supabase
          .from("supplier_request_logs")
          .select("supplier_id")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (requestLogs?.supplier_id) {
          matchedSupplierId = requestLogs.supplier_id;
        }
      }

      let supplier = suppliers.find((s) => s.id === matchedSupplierId);

      // Fallback to matching by network if no logs exist
      if (!supplier) {
        supplier = suppliers.find((s) => {
          const networks = (s.supported_networks as string[]) || [];
          return networks.length === 0 || networks.includes(order.network);
        });
      }
      
      if (!supplier) supplier = suppliers[0];

      const endpointConfig = (supplier.endpoint_config || {}) as Record<string, unknown>;
      const authConfig = (supplier.auth_config || {}) as Record<string, unknown>;
      const statusEndpoint = (endpointConfig.check_status || {}) as Record<string, unknown>;
      const statusMapping = (endpointConfig.status_mapping || {}) as Record<string, string>;
      const orderResponseMapping = (endpointConfig.order_response_mapping || {}) as Record<string, string>;

      const statusPath = (statusEndpoint.path as string) || "/v1/orders/{reference}";
      const statusMethod = (statusEndpoint.method as string) || "GET";

      // Replace {reference} placeholder in path
      const resolvedPath = statusPath
        .replace("{reference}", encodeURIComponent(order.supplier_reference || ""))
        .replace("{order_id}", encodeURIComponent(order.id));

      try {
        // Small throttle between requests — prevents 429s on bulk runs
        // (Instant Data / other suppliers have per-minute rate limits)
        await new Promise((r) => setTimeout(r, 120));

        const apiUrl = `${supplier.api_base_url}${resolvedPath}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...buildAuthHeaders(authConfig),
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), supplier.request_timeout_ms || 15000);

        const apiRes = await fetch(apiUrl, {
          method: statusMethod,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // ── Read body ONCE (can't read a response stream twice) ──
        const rawText = await apiRes.text();
        let apiData: Record<string, unknown> = {};
        try { apiData = JSON.parse(rawText); } catch { apiData = { raw: rawText }; }

        // ── 429 Rate-limit: log and skip this order, keep processing others ──
        if (apiRes.status === 429) {
          const retryAfter = Number(apiRes.headers.get("Retry-After") || "5");
          console.warn(`Rate limited by supplier for order ${order.public_order_id}. Waiting ${retryAfter}s.`);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          errors.push(`Order ${order.public_order_id}: Rate limited (429) — skipped this run`);
          continue;
        }

        // ── Self-healing: try alternative reference BEFORE throwing on 404 ──
        // Bug fix: the old code threw on !apiRes.ok before the self-healing
        // block could run, making that block dead code for 404 responses.
        if (apiRes.status === 404 || rawText.toLowerCase().includes("not found")) {
          const possibleId = order.delivery_message;
          if (
            possibleId &&
            possibleId !== order.supplier_reference &&
            possibleId.length > 3 &&
            !possibleId.includes(" ")
          ) {
            console.log(
              `Order ${order.public_order_id}: 404 received. Self-healing — retrying with delivery_message as reference: ${possibleId}`
            );
            const retryPath = statusPath
              .replace("{reference}", encodeURIComponent(possibleId))
              .replace("{order_id}", encodeURIComponent(order.id));
            const retryUrl = `${supplier.api_base_url}${retryPath}`;
            const retryRes = await fetch(retryUrl, { method: statusMethod, headers });
            if (retryRes.ok) {
              const healed = await retryRes.json() as Record<string, unknown>;
              // Swap the reference permanently in the DB
              await supabase
                .from("orders")
                .update({ supplier_reference: possibleId, delivery_message: order.supplier_reference })
                .eq("id", order.id);
              console.log(`Order ${order.public_order_id}: Self-healing successful — reference updated to ${possibleId}`);
              // Replace apiData with the healed response and continue processing
              Object.assign(apiData, healed);
            } else {
              // Self-healing also failed — log and skip
              throw new Error(`API 404 (self-healing also failed with reference ${possibleId}): ${rawText.slice(0, 200)}`);
            }
          } else if (!apiRes.ok) {
            // 404 but no alternative reference to try
            throw new Error(`API ${apiRes.status}: ${rawText.slice(0, 200)}`);
          }
        } else if (!apiRes.ok) {
          // All other non-OK responses
          throw new Error(`API ${apiRes.status}: ${rawText.slice(0, 200)}`);
        }

        // Extract status from response
        const statusField = orderResponseMapping.status || "status";
        const messageField = orderResponseMapping.message || "message";
        const referenceField = orderResponseMapping.reference || "reference";

        let rawStatusVal = getNestedValue(apiData, statusField);
        if (rawStatusVal === undefined || rawStatusVal === null || rawStatusVal === "") {
          rawStatusVal = apiData.status || apiData.state || apiData.status_text || apiData.message || "";
        }
        let rawStatus = (rawStatusVal !== undefined && rawStatusVal !== null) ? String(rawStatusVal) : "";

        let rawMsgVal = getNestedValue(apiData, messageField);
        if (rawMsgVal === undefined || rawMsgVal === null || rawMsgVal === "") {
          rawMsgVal = apiData.message || apiData.details || apiData.status_text || "";
        }
        const rawMessage = (rawMsgVal !== undefined && rawMsgVal !== null) ? String(rawMsgVal) : "";

        let rawRefVal = getNestedValue(apiData, referenceField);
        if (rawRefVal === undefined || rawRefVal === null || rawRefVal === "") {
          rawRefVal = apiData.reference || apiData.order_id || apiData.id || order.supplier_reference || "";
        }
        const rawReference = (rawRefVal !== undefined && rawRefVal !== null) ? String(rawRefVal) : "";

        if (!rawStatus) continue; // No status info, skip

        let normalizedStatus = normalizeStatus(rawStatus, statusMapping);

        // Check for specific beneficiary verification failure to mark as on_hold
        const detailMessage = String(apiData.message || (apiData.details as any)?.message || "").trim();
        const skipped = Array.isArray((apiData.details as any)?.skipped) ? (apiData.details as any).skipped : [];
        const hasBeneficiaryVerificationFailure =
          /all numbers were skipped|beneficiary verification failed|not approved/i.test(detailMessage) ||
          skipped.some((entry: any) => /beneficiary number not approved|not approved/i.test(String(entry.reason || "")));

        if (hasBeneficiaryVerificationFailure || /no verified numbers to process/i.test(detailMessage)) {
          normalizedStatus = "on_hold";
        }

        // Only update if status actually changed
        if (normalizedStatus !== order.status || rawStatus !== order.supplier_status) {
          const oldStatus = order.status;

          // Don't downgrade final statuses
          if (FINAL_STATUSES.includes(oldStatus) && !FINAL_STATUSES.includes(normalizedStatus)) {
            console.log(`Skipping poll downgrade for ${order.public_order_id}: ${oldStatus} → ${normalizedStatus}`);
            continue;
          }

          const snapshot = (order.bundle_snapshot || {}) as Record<string, unknown>;
          let deliveryMessage: string | null = null;
          if (normalizedStatus === "delivered") {
            deliveryMessage = rawMessage || `${snapshot.volume || ""} ${order.network} data bundle delivered successfully.`;
          } else if (normalizedStatus === "failed") {
            deliveryMessage = rawMessage || "Delivery failed. Our team has been notified.";
          }

          await supabase
            .from("orders")
            .update({
              status: normalizedStatus,
              supplier_status: rawStatus,
              ...(rawReference !== order.supplier_reference ? { supplier_reference: rawReference } : {}),
              ...(deliveryMessage ? { delivery_message: deliveryMessage } : {}),
            })
            .eq("id", order.id);

          // Log status change
          await supabase.from("order_status_history").insert({
            order_id: order.id,
            old_status: oldStatus,
            new_status: normalizedStatus,
            source: "supplier_status_sync",
            note: `Supplier status: ${rawStatus}${rawMessage ? ` — ${rawMessage}` : ""}`,
            metadata: { raw_response: apiData, supplier_id: supplier.id },
          });

          updatedCount++;
        }

        // Always log the supplier request so we can audit the raw responses
        await supabase.from("supplier_request_logs").insert({
          supplier_id: supplier.id,
          order_id: order.id,
          request_payload: { path: resolvedPath, method: statusMethod },
          response_payload: apiData,
          normalized_result: normalizedStatus ?? "unknown",
          is_success: true,
          supplier_reference: rawReference,
          request_started_at: new Date().toISOString(),
          response_received_at: new Date().toISOString(),
        });
      } catch (err) {
        const errMsg = `Order ${order.public_order_id}: ${String(err)}`;
        console.error("Status sync error:", errMsg);
        errors.push(errMsg);

        // Log failed attempt
        await supabase.from("supplier_request_logs").insert({
          supplier_id: supplier.id,
          order_id: order.id,
          request_payload: { path: resolvedPath },
          response_payload: {},
          normalized_result: "error",
          is_success: false,
          error_message: String(err),
          request_started_at: new Date().toISOString(),
          response_received_at: new Date().toISOString(),
        });
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from("supplier_sync_logs")
        .update({
          status: errors.length > 0 && updatedCount === 0 ? "failed" : "completed",
          completed_at: new Date().toISOString(),
          orders_updated: updatedCount,
          error_message: errors.length > 0 ? errors.join("; ") : null,
          metadata: {
            total_orders_checked: orders.length,
            errors_count: errors.length,
          },
        })
        .eq("id", syncLog.id);
    }

    return json({
      success: true,
      orders_checked: orders.length,
      orders_updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("sync-order-status error:", err);
    return json({ error: "Unexpected error during status sync" }, 500);
  }
});
