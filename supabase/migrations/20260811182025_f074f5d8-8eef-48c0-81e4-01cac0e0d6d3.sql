CREATE OR REPLACE FUNCTION public.get_public_agent_bundles(_agent_profile_id uuid)
RETURNS TABLE (
  id uuid,
  network text,
  package_code text,
  package_name text,
  package_size_label text,
  package_volume_value text,
  package_type text,
  validity_label text,
  selling_price numeric,
  currency text,
  category character varying,
  display_order integer,
  is_active boolean,
  buying_enabled boolean,
  source_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dp.id,
    dp.network,
    dp.package_code,
    dp.package_name,
    dp.package_size_label,
    dp.package_volume_value,
    dp.package_type,
    dp.validity_label,
    abp.selling_price,
    dp.currency,
    dp.category,
    dp.display_order,
    dp.is_active,
    dp.buying_enabled,
    dp.source_type
  FROM public.agent_bundle_prices abp
  JOIN public.data_packages dp ON dp.id = abp.package_id
  JOIN public.agent_profiles ap ON ap.id = abp.agent_profile_id
  WHERE abp.agent_profile_id = _agent_profile_id
    AND abp.is_published = true
    AND dp.is_active = true
    AND dp.is_agent_resaleable = true
    AND ap.status = 'active'::agent_profile_status
    AND ap.storefront_enabled = true
  ORDER BY dp.network ASC, dp.display_order ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_agent_bundles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent_bundles(uuid) TO anon, authenticated, service_role;
