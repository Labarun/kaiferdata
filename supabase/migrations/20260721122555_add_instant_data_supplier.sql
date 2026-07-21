INSERT INTO suppliers (
  name,
  provider_code,
  api_base_url,
  auth_config,
  endpoint_config,
  is_active,
  supported_networks,
  supports_product_sync,
  supports_order_submission,
  supports_status_sync,
  polling_interval_seconds
) VALUES (
  'Instant Data GH',
  'instant_data',
  'https://instantdatagh.com',
  '{
    "auth_type": "api_key",
    "header_name": "x-api-key",
    "secret_name": "INSTANT_DATA_API_KEY"
  }'::jsonb,
  '{
    "health": {
      "path": "/api.php/balance",
      "method": "GET"
    },
    "balance": {
      "path": "/api.php/balance",
      "method": "GET"
    },
    "products": {
      "path": "/api.php/plans",
      "method": "GET",
      "response_data_field": "data"
    },
    "product_field_mapping": {
      "id": "id",
      "name": "name",
      "code": "id",
      "price": "price",
      "network": "network",
      "volume": "dataAmount"
    },
    "submit_order": {
      "path": "/api.php/orders",
      "method": "POST"
    },
    "order_request_mapping": {
      "phone": "phone_number",
      "network": "network",
      "product_code": "data_amount",
      "reference": "reference"
    },
    "order_response_mapping": {
      "status": "status",
      "reference": "order_id",
      "message": "message"
    },
    "check_status": {
      "path": "/api.php/order-status?order_id={reference}",
      "method": "GET"
    },
    "status_mapping": {
      "pending": "processing",
      "processing": "processing",
      "successful": "delivered",
      "success": "delivered",
      "delivered": "delivered",
      "failed": "failed",
      "cancelled": "cancelled"
    },
    "network_mapping": {
      "MTN": "MTN",
      "Telecel": "Telecel",
      "AirtelTigo": "AirtelTigo"
    }
  }'::jsonb,
  true,
  '["MTN", "Telecel", "AirtelTigo"]'::jsonb,
  true,
  true,
  true,
  30
);
