-- ============================================================
-- REVERT: migration 002 changes to Instant Data
--
-- Problem: migration 002 added order_response_mapping.status = "status"
-- which now correctly reads Instant Data's response field. But their
-- POST /orders response returns status: "completed" immediately
-- (synchronous fulfillment), so our completed → delivered mapping
-- marks every new order as delivered on placement.
--
-- Revert: remove the response mapping + status_mapping overrides so
-- Instant Data goes back to its state before migration 002.
-- check_status endpoint is kept because it's needed for sync.
-- Auth (x-api-key) is kept because that's what their API requires.
-- ============================================================

UPDATE suppliers
SET endpoint_config = (
  (
    endpoint_config
    -- Remove the order_response_mapping we added (was causing
    -- status: "completed" to be read from initial purchase response)
    - 'order_response_mapping'
    -- Remove the status_mapping we added (completed → delivered was
    -- triggering immediately on order placement)
    - 'status_mapping'
  )
)
WHERE
  provider_code ILIKE '%instant%'
  OR name ILIKE '%instant%';

-- Verify Instant Data is back to pre-migration-002 state
SELECT
  name,
  provider_code,
  auth_config ->> 'auth_type'   AS auth_type,
  auth_config ->> 'header_name' AS header_name,
  endpoint_config -> 'check_status'           AS check_status,
  endpoint_config -> 'order_response_mapping' AS response_mapping,
  endpoint_config -> 'status_mapping'         AS status_mapping
FROM suppliers
WHERE
  provider_code ILIKE '%instant%'
  OR name ILIKE '%instant%';