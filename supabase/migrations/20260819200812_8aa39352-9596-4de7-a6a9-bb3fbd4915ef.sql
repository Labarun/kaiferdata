UPDATE suppliers
SET
  auth_config = jsonb_set(
    jsonb_set(
      auth_config,
      '{auth_type}', '"api_key"'
    ),
    '{header_name}', '"x-api-key"'
  ),
  endpoint_config = endpoint_config
    || jsonb_build_object(
      'check_status', jsonb_build_object(
        'path', '/api.php/order-status?order_id={reference}',
        'method', 'GET'
      )
    )
    || jsonb_build_object(
      'order_response_mapping', jsonb_build_object(
        'status', 'status',
        'reference', 'order_id',
        'message', 'status'
      )
    )
    || jsonb_build_object(
      'status_mapping', jsonb_build_object(
        'completed', 'delivered',
        'processing', 'processing',
        'awaiting_delivery', 'processing',
        'failed', 'failed',
        'refunded', 'refunded'
      )
    )
WHERE
  provider_code ILIKE '%instant%'
  OR name ILIKE '%instant%';