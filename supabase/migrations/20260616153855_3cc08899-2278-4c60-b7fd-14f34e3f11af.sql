CREATE OR REPLACE FUNCTION public.get_public_storefront(_slug text)
RETURNS TABLE(
  id uuid,
  store_slug text,
  store_name text,
  store_logo_url text,
  store_tagline text,
  business_name text,
  city text,
  contact_phone text,
  status agent_profile_status,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, store_slug, store_name, store_logo_url, store_tagline,
         business_name, city, contact_phone, status, created_at
  FROM public.agent_profiles
  WHERE lower(store_slug) = lower(_slug)
    AND status = 'active'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_storefront(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_storefront(text) TO anon, authenticated, service_role;