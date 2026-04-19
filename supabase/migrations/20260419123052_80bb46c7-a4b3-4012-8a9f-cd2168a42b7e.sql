CREATE OR REPLACE FUNCTION public.upsert_agent_bundle_price(_package_id uuid, _selling_price numeric)
 RETURNS TABLE(id uuid, selling_price numeric, agent_base_price numeric, profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_pkg_id uuid;
  v_pkg_base numeric;
  v_pkg_resaleable boolean;
  v_pkg_active boolean;
  v_row_id uuid;
BEGIN
  -- Resolve agent profile for caller
  SELECT ap.id INTO v_profile_id
    FROM public.agent_profiles ap
   WHERE ap.user_id = auth.uid()
   LIMIT 1;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No agent profile';
  END IF;

  -- Look up package details with fully-qualified columns
  SELECT dp.id, dp.agent_base_price, dp.is_agent_resaleable, dp.is_active
    INTO v_pkg_id, v_pkg_base, v_pkg_resaleable, v_pkg_active
    FROM public.data_packages dp
   WHERE dp.id = _package_id;

  IF v_pkg_id IS NULL THEN
    RAISE EXCEPTION 'Package not found';
  END IF;
  IF NOT v_pkg_resaleable OR NOT v_pkg_active THEN
    RAISE EXCEPTION 'Package is not available for agent resale';
  END IF;
  IF _selling_price < v_pkg_base THEN
    RAISE EXCEPTION 'Selling price (%) cannot be below your cost (%)', _selling_price, v_pkg_base;
  END IF;
  IF _selling_price > v_pkg_base * 10 THEN
    RAISE EXCEPTION 'Selling price too high (max 10x base)';
  END IF;

  -- Upsert with fully-qualified column references
  INSERT INTO public.agent_bundle_prices AS abp
    (agent_profile_id, package_id, selling_price, is_published)
  VALUES (v_profile_id, v_pkg_id, _selling_price, true)
  ON CONFLICT (agent_profile_id, package_id) DO UPDATE
    SET selling_price = EXCLUDED.selling_price,
        is_published = true,
        updated_at = now()
  RETURNING abp.id INTO v_row_id;

  -- Return result with explicit column aliases to avoid OUT-param ambiguity
  RETURN QUERY
  SELECT
    v_row_id           AS id,
    _selling_price     AS selling_price,
    v_pkg_base         AS agent_base_price,
    (_selling_price - v_pkg_base) AS profit;
END;
$function$;