UPDATE public.suppliers 
SET endpoint_config = jsonb_build_object(
  'submit_order', jsonb_build_object(
    'method', 'POST',
    'path', '/v1/orders'
  ),
  'check_status', jsonb_build_object(
    'method', 'GET',
    'path', '/v1/orders/{reference}'
  ),
  'products', jsonb_build_object(
    'method', 'GET',
    'path', '/v1/plans',
    'response_data_field', 'data'
  ),
  'networks', jsonb_build_object(
    'method', 'GET',
    'path', '/v1/networks'
  ),
  'health', jsonb_build_object(
    'method', 'GET',
    'path', '/v1/health'
  ),
  'balance', jsonb_build_object(
    'method', 'GET',
    'path', '/v1/account/balance'
  ),
  'network_mapping', jsonb_build_object(
    'mtn', 'MTN',
    'telecel', 'Telecel',
    'airteltigo', 'AirtelTigo'
  ),
  'reverse_network_mapping', jsonb_build_object(
    'MTN', 'mtn',
    'Telecel', 'telecel',
    'AirtelTigo', 'airteltigo'
  ),
  'status_mapping', jsonb_build_object(
    'delivered', 'delivered',
    'success', 'delivered',
    'failed', 'failed',
    'pending', 'processing',
    'processing', 'processing'
  ),
  'order_request_mapping', jsonb_build_object(
    'phone', 'phone',
    'product_code', 'product_code',
    'network', 'network',
    'amount', 'amount',
    'reference', 'reference'
  ),
  'order_response_mapping', jsonb_build_object(
    'status', 'status',
    'reference', 'reference',
    'message', 'message'
  ),
  'product_field_mapping', jsonb_build_object(
    'id', 'id',
    'code', 'code',
    'name', 'name',
    'network', 'network',
    'price', 'price',
    'volume', 'volume',
    'validity', 'validity'
  )
),
updated_at = now()
WHERE provider_code = 'afrohub';