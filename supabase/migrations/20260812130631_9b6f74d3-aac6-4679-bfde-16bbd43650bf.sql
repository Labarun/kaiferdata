-- ============================================================
-- 1. special_bundle_packages: hide cost/agent pricing
-- ============================================================
DROP POLICY IF EXISTS "spb_pkg_select" ON public.special_bundle_packages;

CREATE POLICY "spb_pkg_admin_select" ON public.special_bundle_packages
FOR SELECT TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

CREATE OR REPLACE FUNCTION public.list_special_bundle_packages(_package_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  size_label text,
  bundle_type text,
  network text,
  supplier_price numeric,
  user_price numeric,
  agent_price numeric,
  currency text,
  delivery_note text,
  is_active boolean,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_agent boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::app_role);
  v_is_agent := v_is_admin OR public.has_role(v_uid, 'agent'::app_role);

  RETURN QUERY
  SELECT p.id,
         p.name,
         p.size_label,
         p.bundle_type,
         p.network,
         CASE WHEN v_is_admin THEN p.supplier_price ELSE 0::numeric END,
         p.user_price,
         CASE WHEN v_is_agent THEN p.agent_price ELSE p.user_price END,
         p.currency,
         p.delivery_note,
         p.is_active,
         p.sort_order,
         p.created_at,
         p.updated_at
  FROM public.special_bundle_packages p
  WHERE (_package_id IS NOT NULL AND p.id = _package_id)
     OR (_package_id IS NULL AND p.is_active = true)
  ORDER BY p.sort_order ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_special_bundle_packages(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_special_bundle_packages(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_special_bundle_packages(uuid) TO authenticated, service_role;

-- ============================================================
-- 2. express_data_packages: hide agent-only pricing from public
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read active express packages" ON public.express_data_packages;

CREATE OR REPLACE FUNCTION public.list_express_packages()
RETURNS TABLE (
  id uuid,
  size_gb text,
  validity_days text,
  regular_price_ghs numeric,
  agent_price_ghs numeric,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_agent boolean := false;
BEGIN
  IF v_uid IS NOT NULL THEN
    v_is_agent := public.has_role(v_uid, 'agent'::app_role)
               OR public.has_role(v_uid, 'admin'::app_role);
  END IF;

  RETURN QUERY
  SELECT p.id,
         p.size_gb,
         p.validity_days,
         p.regular_price_ghs,
         CASE WHEN v_is_agent THEN p.agent_price_ghs ELSE p.regular_price_ghs END,
         p.is_active,
         p.created_at,
         p.updated_at
  FROM public.express_data_packages p
  WHERE p.is_active = true
  ORDER BY p.regular_price_ghs ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_express_packages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_express_packages() TO anon, authenticated, service_role;

-- ============================================================
-- 3. Lock internal SECURITY DEFINER routines to the server only
-- ============================================================
REVOKE ALL ON FUNCTION public.purchase_with_wallet_atomic(uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_with_wallet_atomic(uuid, uuid, text, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.purchase_bulk_with_wallet_atomic(uuid, uuid, text[], text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_bulk_with_wallet_atomic(uuid, uuid, text[], text, text) TO service_role;

REVOKE ALL ON FUNCTION public.process_express_order(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_express_order(uuid, text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.request_agent_withdrawal_atomic(uuid, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_agent_withdrawal_atomic(uuid, numeric, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.approve_agent_withdrawal_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_agent_withdrawal_atomic(uuid, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.reject_agent_withdrawal_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_agent_withdrawal_atomic(uuid, uuid, text) TO service_role;