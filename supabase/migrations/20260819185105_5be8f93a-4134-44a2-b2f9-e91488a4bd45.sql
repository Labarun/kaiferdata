-- ============================================================
-- Migration: Add DataBundlesHub supplier + data packages
-- ============================================================

-- STEP 1: Insert the supplier row
INSERT INTO suppliers (
  name,
  provider_code,
  api_base_url,
  is_active,
  supports_order_submission,
  supported_networks,
  priority,
  request_timeout_ms,
  auth_config,
  endpoint_config
) VALUES (
  'DataBundlesHub',
  'databundleshub',
  'https://www.databundleshub.com',
  false,
  true,
  jsonb_build_array('MTN', 'Telecel', 'AirtelTigo'),
  10,
  30000,
  jsonb_build_object(
    'auth_type', 'bearer',
    'header_name', 'Authorization',
    'secret_name', 'DATA_HUB_API_KEY'
  ),
  jsonb_build_object(
    'submit_order', jsonb_build_object(
      'path', '/api/developer/purchase',
      'method', 'POST',
      'extra_fields', '{}'::jsonb
    ),
    'order_request_mapping', jsonb_build_object(
      'phone', 'phoneNumber',
      'product_code', 'capacity',
      'network', '_ignored_net',
      'amount', '_ignored_amount',
      'reference', '_ignored_ref'
    ),
    'order_response_mapping', jsonb_build_object(
      'status', 'data.processingStatus',
      'reference', 'data.requestId',
      'message', 'data.message'
    ),
    'status_mapping', jsonb_build_object(
      'completed', 'delivered',
      'pending', 'processing',
      'failed', 'failed',
      'rejected', 'failed'
    )
  )
);

-- STEP 2: Insert data packages for DataBundlesHub
DO $$
DECLARE
  v_supplier_id uuid;
BEGIN
  SELECT id INTO v_supplier_id
  FROM suppliers
  WHERE provider_code = 'databundleshub'
  LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'DataBundlesHub supplier not found — did Step 1 run?';
  END IF;

  -- MTN packages
  INSERT INTO data_packages (
    network, package_code, package_name,
    package_size_label, package_volume_value,
    source_type, supplier_source_id, source_metadata,
    is_active
  )
  SELECT
    'MTN',
    'DBH_MTN_' || gb || 'GB',
    'MTN ' || gb || 'GB (DataBundlesHub)',
    gb || 'GB',
    gb::text,
    'supplier_api',
    gb::text,
    jsonb_build_object('supplier_id', v_supplier_id, 'network', 'YELLO'),
    true
  FROM unnest(ARRAY[1,2,3,4,5,6,8,10,15,20,25,30,40,50]) AS gb
  ON CONFLICT (package_code) DO UPDATE SET
    supplier_source_id = EXCLUDED.supplier_source_id,
    source_type = EXCLUDED.source_type,
    source_metadata = EXCLUDED.source_metadata,
    is_active = true;

  -- Telecel packages
  INSERT INTO data_packages (
    network, package_code, package_name,
    package_size_label, package_volume_value,
    source_type, supplier_source_id, source_metadata,
    is_active
  )
  SELECT
    'Telecel',
    'DBH_TELECEL_' || gb || 'GB',
    'Telecel ' || gb || 'GB (DataBundlesHub)',
    gb || 'GB',
    gb::text,
    'supplier_api',
    gb::text,
    jsonb_build_object('supplier_id', v_supplier_id, 'network', 'TELECEL'),
    true
  FROM unnest(ARRAY[10,15,20,30,50,100]) AS gb
  ON CONFLICT (package_code) DO UPDATE SET
    supplier_source_id = EXCLUDED.supplier_source_id,
    source_type = EXCLUDED.source_type,
    source_metadata = EXCLUDED.source_metadata,
    is_active = true;

  -- AirtelTigo packages
  INSERT INTO data_packages (
    network, package_code, package_name,
    package_size_label, package_volume_value,
    source_type, supplier_source_id, source_metadata,
    is_active
  )
  SELECT
    'AirtelTigo',
    'DBH_AIRTELTIGO_' || gb || 'GB',
    'AirtelTigo ' || gb || 'GB (DataBundlesHub)',
    gb || 'GB',
    gb::text,
    'supplier_api',
    gb::text,
    jsonb_build_object('supplier_id', v_supplier_id, 'network', 'AIRTELTIGO'),
    true
  FROM unnest(ARRAY[1,2,3,5,10,15,20,30,50,100]) AS gb
  ON CONFLICT (package_code) DO UPDATE SET
    supplier_source_id = EXCLUDED.supplier_source_id,
    source_type = EXCLUDED.source_type,
    source_metadata = EXCLUDED.source_metadata,
    is_active = true;

  RAISE NOTICE 'DataBundlesHub packages inserted for supplier_id = %', v_supplier_id;
END $$;
