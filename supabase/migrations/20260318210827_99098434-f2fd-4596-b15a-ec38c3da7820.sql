UPDATE public.suppliers 
SET endpoint_config = jsonb_set(
  endpoint_config, 
  '{order_request_mapping}', 
  '{"phone": "phone", "product_code": "plan_id", "network": "network_id", "amount": "amount", "reference": "reference"}'::jsonb
)
WHERE provider_code = 'afrohub';