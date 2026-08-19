UPDATE suppliers
SET endpoint_config = endpoint_config
  || jsonb_build_object(
    'order_response_mapping', jsonb_build_object(
      'status', 'data.orderStatus',
      'reference', 'data.requestId',
      'message', 'data.message'
    )
  )
  || jsonb_build_object(
    'status_mapping', jsonb_build_object(
      'pending', 'processing',
      'verified', 'processing',
      'delivered', 'delivered',
      'completed', 'delivered',
      'failed', 'failed',
      'rejected', 'failed'
    )
  )
  || jsonb_build_object(
    'order_request_mapping', jsonb_build_object(
      'phone', 'phoneNumber',
      'product_code', 'capacity',
      'network', '_x_net',
      'amount', '_x_amount',
      'reference', '_x_ref'
    )
  )
WHERE provider_code = 'databundleshub';