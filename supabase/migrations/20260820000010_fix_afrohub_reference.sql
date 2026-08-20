-- ============================================================
-- Fix Afrohub supplier configuration and recover stuck orders
-- ============================================================

-- 1. Update Afrohub configuration to properly read nested responses
UPDATE public.suppliers
SET endpoint_config = jsonb_set(
  jsonb_set(
    endpoint_config,
    '{order_response_mapping,reference}',
    '"data.id"'
  ),
  '{order_response_mapping,status}',
  '"data.status"'
)
WHERE provider_code = 'afrohub';

-- 2. Retroactively fix stuck Afrohub orders that saved Kaifer's reference instead of Afrohub's ID
UPDATE public.orders o
SET supplier_reference = (
  SELECT (l.response_payload->'data'->>'id')::text
  FROM public.supplier_request_logs l
  WHERE l.order_id = o.id
    AND l.supplier_id = (SELECT id FROM public.suppliers WHERE provider_code = 'afrohub' LIMIT 1)
    AND l.response_payload->>'success' = 'true'
    AND l.response_payload->'data'->>'id' IS NOT NULL
  ORDER BY l.created_at DESC
  LIMIT 1
)
WHERE o.status IN ('processing', 'queued')
  AND o.supplier_reference LIKE 'KFD-%'
  AND EXISTS (
    SELECT 1 FROM public.supplier_request_logs l
    WHERE l.order_id = o.id
      AND l.supplier_id = (SELECT id FROM public.suppliers WHERE provider_code = 'afrohub' LIMIT 1)
  );

-- 3. Also fix any that might have nested `order_id` instead of `id` just in case
UPDATE public.orders o
SET supplier_reference = (
  SELECT (l.response_payload->'data'->>'order_id')::text
  FROM public.supplier_request_logs l
  WHERE l.order_id = o.id
    AND l.supplier_id = (SELECT id FROM public.suppliers WHERE provider_code = 'afrohub' LIMIT 1)
    AND l.response_payload->>'success' = 'true'
    AND l.response_payload->'data'->>'order_id' IS NOT NULL
  ORDER BY l.created_at DESC
  LIMIT 1
)
WHERE o.status IN ('processing', 'queued')
  AND o.supplier_reference LIKE 'KFD-%'
  AND EXISTS (
    SELECT 1 FROM public.supplier_request_logs l
    WHERE l.order_id = o.id
      AND l.supplier_id = (SELECT id FROM public.suppliers WHERE provider_code = 'afrohub' LIMIT 1)
  );
