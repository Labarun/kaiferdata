
-- 1. Drop the over-broad public read policy
DROP POLICY IF EXISTS "Anyone can read active packages" ON public.data_packages;

-- 2. Add a tighter SELECT policy for authenticated users only (agents need agent_base_price)
CREATE POLICY "Authenticated can read active packages"
ON public.data_packages
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. Revoke direct table access from anon
REVOKE SELECT ON public.data_packages FROM anon;

-- 4. Create a safe public view with only customer-facing columns
DROP VIEW IF EXISTS public.public_packages;
CREATE VIEW public.public_packages
WITH (security_invoker = false) AS
SELECT
  id,
  network,
  package_code,
  package_name,
  package_size_label,
  package_volume_value,
  package_type,
  validity_label,
  selling_price,
  currency,
  is_active,
  visible_on_public,
  visible_for_logged_in,
  display_order,
  is_agent_resaleable
FROM public.data_packages
WHERE is_active = true;

-- 5. Lock down view grants
REVOKE ALL ON public.public_packages FROM PUBLIC;
GRANT SELECT ON public.public_packages TO anon, authenticated, service_role;
