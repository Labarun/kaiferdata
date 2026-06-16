
-- ============================================================
-- PHASE D: trigger & audit lockdown + RLS perf
-- ============================================================

-- 1) write_audit_log SECURITY DEFINER -------------------------
CREATE OR REPLACE FUNCTION public.write_audit_log(
  _action       text,
  _target_type  text DEFAULT NULL,
  _target_id    text DEFAULT NULL,
  _metadata     jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role  text;
  v_id    uuid;
BEGIN
  IF v_actor IS NULL THEN
    -- service-role / system context (edge fn or trigger)
    v_role := 'system';
  ELSE
    SELECT role::text INTO v_role
      FROM public.user_roles
     WHERE user_id = v_actor
     ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'staff' THEN 2 WHEN 'agent' THEN 3 WHEN 'user' THEN 4 END
     LIMIT 1;
    v_role := COALESCE(v_role, 'user');
  END IF;

  IF _action IS NULL OR length(btrim(_action)) = 0 THEN
    RAISE EXCEPTION 'audit action is required';
  END IF;

  INSERT INTO public.audit_logs (action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES (btrim(_action), v_actor, v_role, _target_type, _target_id, _metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text,text,text,jsonb) TO authenticated, service_role;

-- Lock direct INSERT path on audit_logs
DROP POLICY IF EXISTS "Auth users can insert own audit logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM anon, authenticated;
-- service_role retains full access; SECURITY DEFINER funcs bypass RLS as owner.

-- 2) Agent self-approve block --------------------------------
CREATE OR REPLACE FUNCTION public.guard_agent_application_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  -- service role / system context bypass
  IF v_actor IS NULL THEN RETURN NEW; END IF;

  -- Status didn't change: allow
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Admin-only target statuses
  IF NEW.status IN ('approved','declined','under_review','needs_changes') THEN
    IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can move an application to %', NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Applicants cannot self-set reviewed_by / reviewed_at
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.admin_note  := OLD.admin_note;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_agent_application_status ON public.agent_applications;
CREATE TRIGGER trg_guard_agent_application_status
  BEFORE UPDATE ON public.agent_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_agent_application_status();

-- Guard agent_profiles status transitions: only admin can flip to active/suspended,
-- owner may still edit storefront-presentation fields.
CREATE OR REPLACE FUNCTION public.guard_agent_profile_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status IN ('active','suspended','pending_subscription','subscription_expired') THEN
    IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change agent profile status to %', NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_agent_profile_status ON public.agent_profiles;
CREATE TRIGGER trg_guard_agent_profile_status
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_agent_profile_status();

-- Guard withdrawal_requests transitions: only admin can move pending → paid/rejected.
CREATE OR REPLACE FUNCTION public.guard_withdrawal_request_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status IN ('paid','rejected','approved','cancelled') THEN
    IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change withdrawal status to %', NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_withdrawal_request_status ON public.withdrawal_requests;
CREATE TRIGGER trg_guard_withdrawal_request_status
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_withdrawal_request_status();

-- 3) system_settings validation ------------------------------
CREATE OR REPLACE FUNCTION public.validate_system_setting()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_key text := NEW.setting_key;
  v_val text := NEW.setting_value;
  v_num numeric;
BEGIN
  IF v_key IS NULL OR length(btrim(v_key)) = 0 THEN
    RAISE EXCEPTION 'setting_key cannot be empty';
  END IF;
  IF v_val IS NULL THEN
    RAISE EXCEPTION 'setting_value cannot be NULL';
  END IF;

  -- Boolean-style keys
  IF v_key IN (
    'maintenance_mode',
    'order_submission_enabled',
    'payment_enabled',
    'wallet_purchase_enabled',
    'paystack_enabled',
    'agent_signup_enabled',
    'agent_withdrawals_enabled',
    'special_offers_enabled'
  ) THEN
    IF lower(v_val) NOT IN ('true','false') THEN
      RAISE EXCEPTION '% must be "true" or "false" (got "%")', v_key, v_val;
    END IF;
    NEW.setting_value := lower(v_val);
  END IF;

  -- Percentage 0-100
  IF v_key IN ('agent_commission_rate_percent','paystack_fee_percent') THEN
    BEGIN v_num := v_val::numeric; EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '% must be numeric', v_key;
    END;
    IF v_num < 0 OR v_num > 100 THEN
      RAISE EXCEPTION '% must be between 0 and 100', v_key;
    END IF;
  END IF;

  -- Non-negative monetary thresholds
  IF v_key IN ('agent_withdrawal_min_amount','wallet_min_deposit','wallet_max_deposit') THEN
    BEGIN v_num := v_val::numeric; EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '% must be numeric', v_key;
    END;
    IF v_num < 0 THEN
      RAISE EXCEPTION '% cannot be negative', v_key;
    END IF;
  END IF;

  -- delivery_speed enum
  IF v_key = 'delivery_speed' AND v_val NOT IN ('fast','normal','slow') THEN
    RAISE EXCEPTION 'delivery_speed must be one of fast/normal/slow';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_system_setting ON public.system_settings;
CREATE TRIGGER trg_validate_system_setting
  BEFORE INSERT OR UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_system_setting();

-- 4) RLS perf rewrite: wrap auth/has_role in scalar subqueries -----
-- orders
DROP POLICY IF EXISTS "Owner/staff/admin can read orders" ON public.orders;
CREATE POLICY "Owner/staff/admin can read orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    actor_id = (select auth.uid())
    OR (select public.has_role((select auth.uid()), 'admin'::app_role))
    OR (select public.has_role((select auth.uid()), 'staff'::app_role))
  );

-- order_status_history
DROP POLICY IF EXISTS "Owner/staff/admin can read order status history" ON public.order_status_history;
CREATE POLICY "Owner/staff/admin can read order status history"
  ON public.order_status_history FOR SELECT TO authenticated
  USING (
    (select public.has_role((select auth.uid()), 'admin'::app_role))
    OR (select public.has_role((select auth.uid()), 'staff'::app_role))
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.actor_id = (select auth.uid())
    )
  );

-- payment_records
DROP POLICY IF EXISTS "Owner/staff/admin can read payment records" ON public.payment_records;
CREATE POLICY "Owner/staff/admin can read payment records"
  ON public.payment_records FOR SELECT TO authenticated
  USING (
    (select public.has_role((select auth.uid()), 'admin'::app_role))
    OR (select public.has_role((select auth.uid()), 'staff'::app_role))
    OR EXISTS (
      SELECT 1 FROM public.purchase_intents pi
      WHERE pi.id = payment_records.intent_id
        AND pi.actor_id = (select auth.uid())
    )
  );

-- purchase_intents: rewrite each existing SELECT policy that uses auth.uid()
DO $$
DECLARE r RECORD; new_qual text;
BEGIN
  FOR r IN
    SELECT policyname, qual FROM pg_policies
     WHERE schemaname='public' AND tablename='purchase_intents' AND cmd='SELECT'
  LOOP
    -- noop here; specific rewrites below
    NULL;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Owner/staff/admin can read purchase intents" ON public.purchase_intents;
CREATE POLICY "Owner/staff/admin can read purchase intents"
  ON public.purchase_intents FOR SELECT TO authenticated
  USING (
    actor_id = (select auth.uid())
    OR (select public.has_role((select auth.uid()), 'admin'::app_role))
    OR (select public.has_role((select auth.uid()), 'staff'::app_role))
  );

-- audit_logs SELECT perf
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING ((select public.has_role((select auth.uid()), 'admin'::app_role)));

-- 5) Confirm order_status_history(order_id) index exists -----
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_actor_id ON public.orders(actor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_actor_id ON public.purchase_intents(actor_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_intent_id ON public.payment_records(intent_id);
