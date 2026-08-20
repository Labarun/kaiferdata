-- ============================================================
-- Fix: Instant Data nested response mapping
-- Instant Data returns actual status inside `data.status`
-- ============================================================

UPDATE public.suppliers
SET endpoint_config = jsonb_set(
    endpoint_config,
    '{order_response_mapping}',
    '{"status": "data.status", "reference": "data.order_id", "message": "message"}'::jsonb
)
WHERE provider_code ILIKE '%instant%' OR name ILIKE '%instant%';
