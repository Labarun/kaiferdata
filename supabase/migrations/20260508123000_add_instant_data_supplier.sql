-- Migration to add the Instant Data API supplier

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE provider_code = 'instant_data') THEN
    INSERT INTO suppliers (
      provider_code,
      name,
      is_active,
      priority,
      supports_order_submission,
      supports_product_sync,
      supports_status_sync,
      api_base_url,
      auth_config,
      endpoint_config,
      supported_networks
    ) VALUES (
      'instant_data',
      'Instant Data',
      true,
      2,
      true,
      false, -- Product sync disabled by default; requires manual entry of packages due to API structure
      true,
      'https://instantdatagh.com/api.php',
      '{
        "auth_type": "api_key",
        "header_name": "x-api-key",
        "secret_name": "INSTANT_DATA_API_KEY"
      }'::jsonb,
      '{
        "submit_order": {
          "path": "/orders",
          "method": "POST",
          "order_request_mapping": {
            "phone": "phone_number",
            "product_code": "data_amount",
            "network": "network"
          },
          "order_response_mapping": {
            "status": "status",
            "reference": "data.order_id",
            "message": "message"
          },
          "status_mapping": {
            "success": "processing",
            "error": "failed"
          },
          "reverse_network_mapping": {
            "MTN": "MTN",
            "AirtelTigo": "AirtelTigo",
            "Telecel": "Telecel"
          }
        },
        "check_status": {
          "path": "/order-status?order_id={reference}",
          "method": "GET",
          "status_mapping": {
            "processing": "processing",
            "awaiting_delivery": "processing",
            "completed": "delivered",
            "failed": "failed",
            "refunded": "refunded"
          },
          "response_mapping": {
            "status": "status"
          }
        },
        "balance": {
          "path": "/balance",
          "method": "GET"
        }
      }'::jsonb,
      ARRAY['MTN', 'Telecel', 'AirtelTigo']
    );
  END IF;
END $$;
