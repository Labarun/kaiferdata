UPDATE public.suppliers 
SET endpoint_config = jsonb_set(
  endpoint_config, 
  '{product_field_mapping}', 
  '{"id": "id", "code": "id", "name": "name", "network": "network.slug", "price": "price", "volume": "size", "validity": "validity", "size_label": "size"}'::jsonb
)
WHERE provider_code = 'afrohub';