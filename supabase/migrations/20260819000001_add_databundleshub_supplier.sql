-- ============================================================
-- Migration: Add DataBundlesHub supplier + data packages
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Insert the supplier row
-- NOTE: is_active = false so you can test before going live.
-- Set is_active = true when ready to route orders to them.
-- Adjust `priority` so it sits correctly relative to your
-- other suppliers (lower number = tried first).
-- ⚠ VERIFY auth header from Postman:
--   - If Authorization: Bearer <key>  → auth_type = "bearer",  header_name = "Authorization"
--   - If x-api-key: <key>             → auth_type = "api_key", header_name = "x-api-key"
-- ============================================================

INSERT INTO suppliers (
  name,
  provider_code,
  api_base_url,
  is_active,
  supports_order_submission,
  supported_networks,
  priority,
  request_timeout_ms,
  auth_config,
  endpoint_config
) VALUES (
  'DataBundlesHub',
  'databundleshub',
  'https://www.databundleshub.com',
  false,                                   -- ← flip to true after testing
  true,
  ARRAY['MTN', 'Telecel', 'AirtelTigo'],
  10,                                      -- ← adjust relative to existing suppliers
  30000,

  -- AUTH: Bearer Token — sends "Authorization: Bearer <DATA_HUB_API_KEY>"
  -- Confirmed from DataBundlesHub docs: "Authorization: Bearer your_api_key_here"
  jsonb_build_object(
    'auth_type',   'bearer',
    'header_name', 'Authorization',
    'secret_name', 'DATA_HUB_API_KEY'
  ),

  jsonb_build_object(
    'submit_order', jsonb_build_object(
      'path',         '/api/developer/purchase',
      'method',       'POST',
      'extra_fields', '{}'::jsonb
    ),

    -- DataBundlesHub only needs phoneNumber + capacity.
    -- Network is auto-detected from the phone prefix by their server.
    -- The _ignored_* fields are sent as harmless extra fields (their API ignores unknown keys).
    'order_request_mapping', jsonb_build_object(
      'phone',        'phoneNumber',
      'product_code', 'capacity',       -- ← sends the numeric GB value (e.g. "5")
      'network',      '_ignored_net',
      'amount',       '_ignored_amount',
      'reference',    '_ignored_ref'
    ),

    -- Map their response fields to your normalized fields
    -- data.processingStatus: "completed" | "pending" | "failed"
    -- data.requestId: their reference ID (store for status polling)
    'order_response_mapping', jsonb_build_object(
      'status',    'data.processingStatus',
      'reference', 'data.requestId',
      'message',   'data.message'
    ),

    -- Translate their status words to your order pipeline statuses
    'status_mapping', jsonb_build_object(
      'completed', 'delivered',
      'pending',   'processing',
      'failed',    'failed',
      'rejected',  'failed'
    )
  )
);

-- ============================================================
-- STEP 2: Insert data packages for DataBundlesHub
-- supplier_source_id = the exact capacity string their API expects.
-- These are used by fulfill-order to build:
--   { "phoneNumber": "...", "capacity": "<supplier_source_id>" }
-- ============================================================

DO $$
DECLARE
  v_supplier_id uuid;
BEGIN
  SELECT id INTO v_supplier_id
  FROM suppliers
  WHERE provider_code = 'databundleshub'
  LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'DataBundlesHub supplier not found — did Step 1 run?';
  END IF;

  -- ── MTN packages ──────────────────────────────────────────
  -- Allowed: 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50 GB
  INSERT INTO data_packages (
    network, package_code, package_name,
    package_size_label, package_volume_value,
    source_type, supplier_source_id, source_metadata,
    is_available
  )
  SELECT
    'MTN',
    'DBH_MTN_' || gb || 'GB',
    'MTN ' || gb || 'GB (DataBundlesHub)',
    gb || 'GB',
    gb::text,
    'supplier_api',
    gb::text,
    jsonb_build_object('supplier_id', v_supplier_id, 'network', 'YELLO'),
    true
  FROM unnest(ARRAY[1,2,3,4,5,6,8,10,15,20,25,30,40,50]) AS gb
  ON CONFLICT (package_code) DO UPDATE SET
    supplier_source_id = EXCLUDED.supplier_source_id,
    source_type        = EXCLUDED.source_type,
    source_metadata    = EXCLUDED.source_metadata,
    is_available       = true;

  -- ── Telecel packages ──────────────────────────────────────
  -- Allowed: 10, 15, 20, 30, 50, 100 GB
  INSERT INTO data_packages (
    network, package_code, package_name,
    package_size_label, package_volume_value,
    source_type, supplier_source_id, source_metadata,
    is_available
  )
  SELECT
    'Telecel',
    'DBH_TELECEL_' || gb || 'GB',
    'Telecel ' || gb || 'GB (DataBundlesHub)',
    gb || 'GB',
    gb::text,
    'supplier_api',
    gb::text,
    jsonb_build_object('supplier_id', v_supplier_id, 'network', 'TELECEL'),
    true
  FROM unnest(ARRAY[10,15,20,30,50,100]) AS gb
  ON CONFLICT (package_code) DO UPDATE SET
    supplier_source_id = EXCLUDED.supplier_source_id,
    source_type        = EXCLUDED.source_type,
    source_metadata    = EXCLUDED.source_metadata,
    is_available       = true;

  -- ── AirtelTigo packages ───────────────────────────────────
  -- Allowed: 1, 2, 3, 5, 10, 15, 20, 30, 50, 100 GB
  INSERT INTO data_packages (
    network, package_code, package_name,
    package_size_label, package_volume_value,
    source_type, supplier_source_id, source_metadata,
    is_available
  )
  SELECT
    'AirtelTigo',
    'DBH_AIRTELTIGO_' || gb || 'GB',
    'AirtelTigo ' || gb || 'GB (DataBundlesHub)',
    gb || 'GB',
    gb::text,
    'supplier_api',
    gb::text,
    jsonb_build_object('supplier_id', v_supplier_id, 'network', 'AIRTELTIGO'),
    true
  FROM unnest(ARRAY[1,2,3,5,10,15,20,30,50,100]) AS gb
  ON CONFLICT (package_code) DO UPDATE SET
    supplier_source_id = EXCLUDED.supplier_source_id,
    source_type        = EXCLUDED.source_type,
    source_metadata    = EXCLUDED.source_metadata,
    is_available       = true;

  RAISE NOTICE 'DataBundlesHub packages inserted for supplier_id = %', v_supplier_id;
END $$;

-- ============================================================
-- VERIFICATION QUERIES (run these after to confirm)
-- ============================================================

-- Confirm supplier row:
-- SELECT id, name, provider_code, is_active, priority, auth_config, endpoint_config
-- FROM suppliers WHERE provider_code = 'databundleshub';

-- Confirm packages:
-- SELECT network, package_code, supplier_source_id, source_metadata
-- FROM data_packages WHERE package_code LIKE 'DBH_%'
-- ORDER BY network, supplier_source_id::int;
