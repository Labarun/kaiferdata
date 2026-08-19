-- ============================================================
-- Fix: Instant Data status sync
-- Run Step 0 first to confirm your supplier's provider_code,
-- then run Step 1 to patch it.
-- ============================================================

-- STEP 0 — Identify Instant Data's current config (read-only)
-- Run this first, confirm provider_code and secret_name, then run Step 1.
SELECT
  id,
  name,
  provider_code,
  is_active,
  auth_config,
  endpoint_config -> 'check_status'   AS current_check_status,
  endpoint_config -> 'status_mapping' AS current_status_mapping
FROM suppliers
WHERE
  name    ILIKE '%instant%'
  OR provider_code ILIKE '%instant%';

-- ============================================================
-- STEP 1 — Patch the supplier row
-- Replace 'instantdata' below with whatever provider_code
-- Step 0 returned. The update is a safe MERGE (||) so it won't
-- wipe out any existing endpoint_config keys.
-- ============================================================

UPDATE suppliers
SET
  -- Fix auth: Instant Data uses x-api-key header, not Bearer
  -- We only update header_name and auth_type; secret_name is preserved.
  auth_config = jsonb_set(
    jsonb_set(
      auth_config,
      '{auth_type}',   '"api_key"'
    ),
    '{header_name}', '"x-api-key"'
  ),

  endpoint_config = endpoint_config

    -- Add (or replace) check_status endpoint
    -- Path uses {reference} which the sync function replaces with order.supplier_reference
    -- Instant Data's endpoint: GET /api.php/order-status?order_id=<id>
    || jsonb_build_object(
      'check_status', jsonb_build_object(
        'path',   '/api.php/order-status?order_id={reference}',
        'method', 'GET'
      )
    )

    -- Update order_response_mapping so the sync function reads the right fields
    -- Instant Data response fields: order_id, status, phone_number, data_amount, amount
    || jsonb_build_object(
      'order_response_mapping', jsonb_build_object(
        'status',    'status',       -- top-level "status" field
        'reference', 'order_id',     -- their order ID
        'message',   'status'        -- no dedicated message field; reuse status
      )
    )

    -- Map Instant Data's status values → your internal order statuses
    -- Instant Data statuses: processing, awaiting_delivery, completed, failed, refunded
    || jsonb_build_object(
      'status_mapping', jsonb_build_object(
        'completed',         'delivered',
        'processing',        'processing',
        'awaiting_delivery', 'processing',
        'failed',            'failed',
        'refunded',          'refunded'
      )
    )

WHERE
  provider_code ILIKE '%instant%'   -- adjust if your provider_code is different
  OR name ILIKE '%instant%';

-- ============================================================
-- VERIFICATION — run after the UPDATE to confirm the patch
-- ============================================================
SELECT
  id,
  name,
  provider_code,
  auth_config ->> 'auth_type'    AS auth_type,
  auth_config ->> 'header_name'  AS header_name,
  auth_config ->> 'secret_name'  AS secret_name,
  endpoint_config -> 'check_status'      AS check_status,
  endpoint_config -> 'status_mapping'    AS status_mapping,
  endpoint_config -> 'order_response_mapping' AS response_mapping
FROM suppliers
WHERE
  provider_code ILIKE '%instant%'
  OR name ILIKE '%instant%';
