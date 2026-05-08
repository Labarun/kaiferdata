/**
 * Edge Function: sync-supplier-products
 *
 * Fetches products from a supplier API, maps them into the data_packages table,
 * preserves admin selling prices, and deactivates stale packages.
 *
 * Supports: manual admin trigger + scheduled cron.
 * Auth: service-role key or admin JWT.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Helpers ────────────────────────────────────────────

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
    case "basic":
      return { [headerName]: `Basic ${btoa(apiKey)}` };
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Auth: service-role or admin JWT ──
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== supabaseServiceKey) {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return json({ error: "Unauthorized" }, 401);
        const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (!hasAdmin) return json({ error: "Admin access required" }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));
    const targetSupplierId = (body as Record<string, unknown>).supplier_id as string | undefined;

    // ── Fetch suppliers ──
    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .eq("supports_product_sync", true);

    if (targetSupplierId) {
      query = query.eq("id", targetSupplierId);
    }

    const { data: suppliers, error: suppErr } = await query;
    if (suppErr) return json({ error: "Failed to fetch suppliers" }, 500);
    if (!suppliers || suppliers.length === 0) {
      return json({ message: "No suppliers configured for product sync", synced: 0 });
    }

    const results: Record<string, unknown>[] = [];

    for (const supplier of suppliers) {
      const endpointConfig = (supplier.endpoint_config || {}) as Record<string, unknown>;
      const authConfig = (supplier.auth_config || {}) as Record<string, unknown>;
      const productsEndpoint = (endpointConfig.products || {}) as Record<string, unknown>;
      const productFieldMapping = (endpointConfig.product_field_mapping || {}) as Record<string, string>;
      const networkMapping = (endpointConfig.network_mapping || {}) as Record<string, string>;

      const productsPath = (productsEndpoint.path as string) || "/v1/plans";
      const productsMethod = (productsEndpoint.method as string) || "GET";
      const responseDataField = (productsEndpoint.response_data_field as string) || "data";

      // ── Optional: Fetch networks first for mapping ──
      const networksEndpoint = (endpointConfig.networks || {}) as Record<string, unknown>;
      const networksPath = (networksEndpoint.path as string) || "";
      if (networksPath) {
        try {
          const netUrl = `${supplier.api_base_url}${networksPath}`;
          const netHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            ...buildAuthHeaders(authConfig),
          };
          const netRes = await fetch(netUrl, { method: "GET", headers: netHeaders });
          if (netRes.ok) {
            const netData = await netRes.json();
            const netResponseField = (networksEndpoint.response_data_field as string) || "data";
            const networksArray = (netResponseField ? getNestedValue(netData, netResponseField) : netData) as Record<string, unknown>[];
            if (Array.isArray(networksArray)) {
              // Auto-enhance network mapping from supplier's network list
              for (const net of networksArray) {
                const code = String(net.code || net.id || "").toLowerCase();
                const name = String(net.name || "");
                if (code && name) {
                  // Map supplier codes to our internal names
                  if (!networkMapping[code] && !networkMapping[name]) {
                    const normalizedName = name.toLowerCase();
                    if (normalizedName.includes("mtn")) networkMapping[code] = "MTN";
                    else if (normalizedName.includes("telecel") || normalizedName.includes("vodafone")) networkMapping[code] = "Telecel";
                    else if (normalizedName.includes("airteltigo") || normalizedName.includes("airtel") || normalizedName.includes("tigo")) networkMapping[code] = "AirtelTigo";
                  }
                }
              }
            }
          }
        } catch (netErr) {
          console.warn("Network fetch failed (non-blocking):", netErr);
        }
      }

      // Create sync log entry
      const { data: syncLog } = await supabase
        .from("supplier_sync_logs")
        .insert({
          supplier_id: supplier.id,
          sync_type: "product_sync",
          status: "started",
        })
        .select()
        .single();

      try {
        // ── Call supplier API ──
        const apiUrl = `${supplier.api_base_url}${productsPath}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...buildAuthHeaders(authConfig),
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), supplier.request_timeout_ms || 30000);

        const apiRes = await fetch(apiUrl, {
          method: productsMethod,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!apiRes.ok) {
          const errorBody = await apiRes.text();
          throw new Error(`Supplier API returned ${apiRes.status}: ${errorBody.slice(0, 500)}`);
        }

        const apiData = await apiRes.json();
        const productsArray = (responseDataField
          ? getNestedValue(apiData, responseDataField)
          : apiData) as Record<string, unknown>[];

        if (!Array.isArray(productsArray)) {
          throw new Error(`Expected array at '${responseDataField}', got ${typeof productsArray}`);
        }

        // ── Map and upsert packages ──
        const idField = productFieldMapping.id || "id";
        const nameField = productFieldMapping.name || "name";
        const codeField = productFieldMapping.code || "code";
        const priceField = productFieldMapping.price || "price";
        const networkField = productFieldMapping.network || "network";
        const volumeField = productFieldMapping.volume || "volume";
        const validityField = productFieldMapping.validity || "validity";
        const sizeField = productFieldMapping.size_label || volumeField;

        let created = 0;
        let updated = 0;
        const supplierSourceIds: string[] = [];

        for (const product of productsArray) {
          const supplierId = String(getNestedValue(product, idField) || "");
          if (!supplierId) continue;

          const rawNetwork = String(getNestedValue(product, networkField) || "");
          const mappedNetwork = networkMapping[rawNetwork] || networkMapping[rawNetwork.toLowerCase()] || rawNetwork;

          // Only sync Ghana networks
          if (!["MTN", "Telecel", "AirtelTigo"].includes(mappedNetwork)) continue;

          const supplierPrice = Number(getNestedValue(product, priceField) || 0);
          const packageCode = String(getNestedValue(product, codeField) || supplierId);
          let packageName = String(getNestedValue(product, nameField) || packageCode);
          if (!packageName.includes(supplier.name)) {
            packageName = `${packageName} (${supplier.name})`;
          }
          const volume = String(getNestedValue(product, volumeField) || "");
          const validity = String(getNestedValue(product, validityField) || "");
          const sizeLabel = String(getNestedValue(product, sizeField) || volume || packageName);

          supplierSourceIds.push(supplierId);

          // Check if package already exists
          const { data: existing } = await supabase
            .from("data_packages")
            .select("id, selling_price, visible_on_public, visible_for_logged_in, display_order, is_active")
            .eq("supplier_source_id", supplierId)
            .eq("source_type", "supplier_api")
            .maybeSingle();

          if (existing) {
            // Update: preserve admin selling_price and visibility settings
            await supabase
              .from("data_packages")
              .update({
                network: mappedNetwork,
                package_code: packageCode,
                package_name: packageName,
                package_size_label: sizeLabel,
                package_volume_value: volume || null,
                validity_label: validity || null,
                supplier_price: supplierPrice,
                // Preserve selling_price — only set if currently 0 (never configured)
                ...(Number(existing.selling_price) === 0 ? { selling_price: supplierPrice } : {}),
                source_metadata: product,
                is_active: true,
              })
              .eq("id", existing.id);
            updated++;
          } else {
            // Create new package — default selling_price = supplier_price
            await supabase
              .from("data_packages")
              .insert({
                network: mappedNetwork,
                package_code: packageCode,
                package_name: packageName,
                package_size_label: sizeLabel,
                package_volume_value: volume || null,
                package_type: "data_bundle",
                validity_label: validity || null,
                supplier_price: supplierPrice,
                selling_price: supplierPrice, // Admin should set markup later
                source_type: "supplier_api",
                supplier_source_id: supplierId,
                source_metadata: product,
                is_active: true,
                visible_on_public: true,
                visible_for_logged_in: true,
                display_order: 0,
              });
            created++;
          }
        }

        // ── Deactivate packages no longer in API (only supplier_api sourced) ──
        let deactivated = 0;
        if (supplierSourceIds.length > 0) {
          const { data: stalePackages } = await supabase
            .from("data_packages")
            .select("id")
            .eq("source_type", "supplier_api")
            .eq("is_active", true)
            .not("supplier_source_id", "in", `(${supplierSourceIds.map(s => `"${s}"`).join(",")})`);

          if (stalePackages && stalePackages.length > 0) {
            for (const stale of stalePackages) {
              await supabase
                .from("data_packages")
                .update({ is_active: false })
                .eq("id", stale.id);
              deactivated++;
            }
          }
        }

        // ── Update supplier last_product_sync_at ──
        await supabase
          .from("suppliers")
          .update({ last_product_sync_at: new Date().toISOString() })
          .eq("id", supplier.id);

        // ── Update sync log ──
        if (syncLog) {
          await supabase
            .from("supplier_sync_logs")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              packages_created: created,
              packages_updated: updated,
              packages_deactivated: deactivated,
              raw_response: { total_products: productsArray.length, sample_products: productsArray.slice(0, 3) },
            })
            .eq("id", syncLog.id);
        }

        results.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          success: true,
          created,
          updated,
          deactivated,
          total_from_api: productsArray.length,
        });
      } catch (err) {
        const errMsg = String(err);
        console.error(`Sync failed for supplier ${supplier.name}:`, errMsg);

        if (syncLog) {
          await supabase
            .from("supplier_sync_logs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_message: errMsg,
            })
            .eq("id", syncLog.id);
        }

        results.push({
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          success: false,
          error: errMsg,
        });
      }
    }

    return json({ success: true, results });
  } catch (err) {
    console.error("sync-supplier-products error:", err);
    return json({ error: "Unexpected error during product sync" }, 500);
  }
});
