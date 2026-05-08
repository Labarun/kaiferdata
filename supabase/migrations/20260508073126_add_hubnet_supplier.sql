-- Migration to add the Hubnet API supplier

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE provider_code = 'hubnet') THEN
    INSERT INTO suppliers (
      provider_code,
      name,
      is_active,
      priority,
      supports_order_submission,
      api_base_url,
      auth_config,
      endpoint_config,
      supported_networks
    ) VALUES (
      'hubnet',
      'Hubnet',
      true,
      1,
      true,
      'https://console.hubnet.app/live',
      '{
        "auth_type": "bearer",
        "header_name": "token",
        "secret_name": "HUBNET_API_KEY"
      }'::jsonb,
      '{
        "submit_order": {
          "path": "/api/context/business/transaction/{network}-new-transaction",
          "method": "POST",
          "extra_fields": { "webhook": "{WEBHOOK_URL}" },
          "order_request_mapping": { "phone": "phone", "product_code": "volume", "network": "network", "reference": "reference", "amount": "amount" },
          "order_response_mapping": { "status": "code", "reference": "reference", "message": "message" },
          "status_mapping": { "0000": "processing", "1001": "failed", "1002": "failed" },
          "reverse_network_mapping": { "MTN": "mtn", "AirtelTigo": "at" }
        }
      }'::jsonb,
      ARRAY['MTN', 'AirtelTigo']
    );
  END IF;
END $$;
