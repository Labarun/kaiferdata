-- ============================================================
-- Add Product Sync configuration for DataBundlesHub
-- Resolves the UI validation error for "Product sync is enabled"
-- ============================================================

UPDATE suppliers
SET 
supports_product_sync = true,
endpoint_config = endpoint_config
|| jsonb_build_object(
'products', jsonb_build_object(
'path', '/api/developer/data-packages',
'method', 'GET',
'response_data_field', 'data'
),
'product_field_mapping', jsonb_build_object(
'id', 'capacity',
'code', 'capacity',
'price', 'price',
'network', 'network',
'volume', 'capacity'
)
)
WHERE provider_code = 'databundleshub';