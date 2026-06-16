
DROP VIEW IF EXISTS public.public_packages;

CREATE OR REPLACE FUNCTION public.list_public_packages(_logged_in boolean DEFAULT false)
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
  is_active boolean,
  visible_on_public boolean,
  visible_for_logged_in boolean,
  display_order integer,
  is_agent_resaleable boolean
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
    dp.selling_price,
    dp.currency,
    dp.is_active,
    dp.visible_on_public,
    dp.visible_for_logged_in,
    dp.display_order,
    dp.is_agent_resaleable
  FROM public.data_packages dp
  WHERE dp.is_active = true
    AND (
      (_logged_in IS TRUE AND dp.visible_for_logged_in = true)
      OR (_logged_in IS FALSE AND dp.visible_on_public = true)
    );
$$;

REVOKE ALL ON FUNCTION public.list_public_packages(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_packages(boolean) TO anon, authenticated, service_role;
