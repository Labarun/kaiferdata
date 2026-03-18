UPDATE public.suppliers 
SET endpoint_config = jsonb_set(
  endpoint_config, 
  '{order_response_mapping}', 
  '{"status": "data.status", "reference": "data.reference", "message": "data.order_id"}'::jsonb
)
WHERE provider_code = 'afrohub';