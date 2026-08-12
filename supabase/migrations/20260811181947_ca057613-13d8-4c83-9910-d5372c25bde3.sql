-- ═══════════════════════════════════════════════════════════
-- 1. data_packages: hide cost columns from regular users
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can read active packages" ON public.data_packages;

CREATE POLICY "Admin/staff read active packages"
ON public.data_packages
FOR SELECT
TO authenticated
USING (
  (SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role))
  OR (SELECT public.has_role((SELECT auth.uid()), 'staff'::app_role))
);

-- Agent pricing screen: agent_base_price only, never supplier_price
CREATE OR REPLACE FUNCTION public.list_agent_resaleable_packages()
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
  agent_base_price numeric,
  currency text,
  category character varying,
  display_order integer,
  is_active boolean,
  is_agent_resaleable boolean,
  buying_enabled boolean,
  source_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dp.id, dp.network, dp.package_code, dp.package_name, dp.package_size_label,
    dp.package_volume_value, dp.package_type, dp.validity_label,
    dp.selling_price, dp.agent_base_price, dp.currency, dp.category,
    dp.display_order, dp.is_active, dp.is_agent_resaleable, dp.buying_enabled,
    dp.source_type
  FROM public.data_packages dp
  WHERE dp.is_active = true
    AND dp.is_agent_resaleable = true
    AND (
      public.has_role(auth.uid(), 'agent'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'staff'::app_role)
    )
  ORDER BY dp.network ASC, dp.display_order ASC;
$$;

REVOKE ALL ON FUNCTION public.list_agent_resaleable_packages() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_agent_resaleable_packages() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_agent_resaleable_packages() TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════
-- 2. suppliers: auth_config credentials are admin-only
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Staff read suppliers" ON public.suppliers;

CREATE POLICY "Admins read suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

-- ═══════════════════════════════════════════════════════════
-- 3. agent_applications: no self status escalation
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users manage own application" ON public.agent_applications;

CREATE POLICY "Users read own application"
ON public.agent_applications
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users create own application"
ON public.agent_applications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND status IN ('draft'::agent_application_status, 'submitted'::agent_application_status)
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_note IS NULL
);

CREATE POLICY "Users update own draft application"
ON public.agent_applications
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND status IN (
    'draft'::agent_application_status,
    'submitted'::agent_application_status,
    'needs_changes'::agent_application_status
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND status IN ('draft'::agent_application_status, 'submitted'::agent_application_status)
);

CREATE POLICY "Users delete own draft application"
ON public.agent_applications
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND status = 'draft'::agent_application_status
);

-- ═══════════════════════════════════════════════════════════
-- 4. purchase_intents: guest insert cannot spoof a user identity
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can create guest purchase intents" ON public.purchase_intents;

CREATE POLICY "Anyone can create guest purchase intents"
ON public.purchase_intents
FOR INSERT
TO anon, authenticated
WITH CHECK (
  intent_type = 'guest_buy'::text
  AND phone_number IS NOT NULL
  AND length(phone_number) >= 10
  AND amount_expected > 0::numeric
  AND (
    (actor_type = 'guest'::text AND actor_id IS NULL)
    OR (actor_type = 'user'::text AND actor_id = (SELECT auth.uid()))
  )
);

-- Drop the duplicated older SELECT policy (superseded, same intent)
DROP POLICY IF EXISTS "Owner/staff/admin can read intents" ON public.purchase_intents;

-- ═══════════════════════════════════════════════════════════
-- 5. Fix mutable search_path
-- ═══════════════════════════════════════════════════════════
ALTER FUNCTION public.update_last_active_at() SET search_path = public;

-- ═══════════════════════════════════════════════════════════
-- 6. Lock down SECURITY DEFINER function EXECUTE grants
-- ═══════════════════════════════════════════════════════════

-- 6a. Trigger functions: never callable directly by API roles
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.guard_agent_application_status()',
    'public.guard_agent_profile_status()',
    'public.guard_withdrawal_request_status()',
    'public.handle_new_user()',
    'public.handle_order_delivered_commission()',
    'public.handle_order_refunded_commission()',
    'public.update_last_active_at()',
    'public.update_updated_at_column()',
    'public.validate_store_slug()',
    'public.validate_system_setting()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 6b. Internal ledger / claim functions: service_role only
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.activate_agent_subscription_atomic(uuid, uuid, agent_subscription_plan, numeric, uuid)',
    'public.claim_intent_for_verification(uuid)',
    'public.claim_order_for_fulfillment(uuid)',
    'public.refund_wallet_purchase_atomic(uuid, text)'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Catch any overload signature drift for the above by name
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'activate_agent_subscription_atomic',
        'claim_intent_for_verification',
        'claim_order_for_fulfillment',
        'refund_wallet_purchase_atomic',
        'credit_agent_commission_atomic',
        'credit_agent_earnings_wallet_atomic',
        'debit_agent_earnings_wallet_atomic',
        'credit_wallet_atomic',
        'debit_wallet_atomic'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 6c. Signed-in-only helpers: revoke anon, keep authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'ensure_user_scaffold',
        'get_account_status',
        'get_user_role',
        'has_role',
        'upsert_agent_bundle_price',
        'get_agent_storefront_orders',
        'request_special_bundle_refund',
        'purchase_special_bundle_atomic'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- 6d. Intentionally public (guest tracking / storefront / login) — keep anon,
--     but strip the implicit PUBLIC grant so it is explicit.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_public_storefront',
        'get_public_agent_store',
        'list_public_packages',
        'lookup_intent_public',
        'track_order_public',
        'track_orders_by_phone_public',
        'resolve_login_identifier',
        'get_special_bundle_settings'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', r.sig);
  END LOOP;
END $$;
