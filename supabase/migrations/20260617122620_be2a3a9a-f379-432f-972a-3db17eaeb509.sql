DROP FUNCTION IF EXISTS public.list_public_packages(boolean);

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
  is_agent_resaleable boolean,
  agent_base_price numeric
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
    dp.is_agent_resaleable,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.agent_profiles WHERE user_id = auth.uid() AND status = 'active')
           OR public.has_role(auth.uid(), 'admin') THEN dp.agent_base_price
      ELSE 0
    END as agent_base_price
  FROM public.data_packages dp
  WHERE dp.is_active = true
    AND (
      (_logged_in IS TRUE AND dp.visible_for_logged_in = true)
      OR (_logged_in IS FALSE AND dp.visible_on_public = true)
    );
$$;

REVOKE ALL ON FUNCTION public.list_public_packages(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_packages(boolean) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_order_delivered_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral jsonb;
  v_agent_profile_id uuid;
  v_agent_user_id uuid;
  v_agent_selling numeric;
  v_agent_base numeric;
  v_profit numeric;
  v_ewallet_id uuid;
  v_rate numeric;
  v_setting text;
  v_existing RECORD;
  v_should_credit boolean := false;
BEGIN
  IF NEW.status NOT IN ('paid','processing','delivered') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    v_should_credit := true;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status NOT IN ('paid','processing','delivered') THEN
      v_should_credit := true;
    END IF;
  END IF;
  IF NOT v_should_credit THEN
    RETURN NEW;
  END IF;
  IF NEW.intent_id IS NULL THEN RETURN NEW; END IF;

  SELECT order_context->'referral' INTO v_referral
    FROM public.purchase_intents WHERE id = NEW.intent_id;
  IF v_referral IS NULL OR v_referral = 'null'::jsonb THEN RETURN NEW; END IF;

  v_agent_profile_id := (v_referral->>'agent_profile_id')::uuid;
  v_agent_user_id    := (v_referral->>'agent_user_id')::uuid;
  IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_existing FROM public.agent_earnings WHERE order_id = NEW.id LIMIT 1;
  IF FOUND THEN RETURN NEW; END IF;

  v_agent_selling := NULLIF(v_referral->>'agent_selling_price','')::numeric;

  SELECT agent_base_price INTO v_agent_base
    FROM public.data_packages WHERE id = (NEW.bundle_snapshot->>'id')::uuid;

  IF v_agent_base IS NULL THEN
    v_agent_base := NULLIF(v_referral->>'agent_base_price','')::numeric;
  END IF;

  IF v_agent_selling IS NOT NULL AND v_agent_base IS NOT NULL THEN
    v_profit := round(GREATEST(v_agent_selling - v_agent_base, 0)::numeric, 2);
  ELSE
    SELECT setting_value INTO v_setting FROM public.system_settings
     WHERE setting_key = 'agent_commission_rate_percent' LIMIT 1;
    v_rate := COALESCE(NULLIF(v_setting,'')::numeric, 8);
    v_profit := round((NEW.amount_charged * v_rate / 100.0)::numeric, 2);
  END IF;

  IF v_profit <= 0 THEN RETURN NEW; END IF;

  SELECT id INTO v_ewallet_id FROM public.agent_earnings_wallets
   WHERE agent_profile_id = v_agent_profile_id FOR UPDATE;

  IF v_ewallet_id IS NULL THEN
    INSERT INTO public.agent_earnings_wallets (user_id, agent_profile_id)
    VALUES (v_agent_user_id, v_agent_profile_id)
    RETURNING id INTO v_ewallet_id;
  END IF;

  PERFORM public.credit_agent_earnings_wallet_atomic(
    v_ewallet_id, v_profit,
    'Commission for order ' || NEW.public_order_id,
    'COMM-' || NEW.id::text,
    NEW.id, 'order', 'commission', NULL
  );

  INSERT INTO public.agent_earnings (
    agent_profile_id, user_id, order_id, commission_amount, commission_rate,
    order_amount, status
  ) VALUES (
    v_agent_profile_id, v_agent_user_id, NEW.id, v_profit,
    CASE WHEN v_agent_selling IS NOT NULL AND v_agent_selling > 0
         THEN round((v_profit / v_agent_selling * 100)::numeric, 2)
         ELSE COALESCE(v_rate, 0) END,
    NEW.amount_charged, 'paid'
  );

  UPDATE public.agent_profiles
     SET total_orders = total_orders + 1,
         total_sales  = total_sales + NEW.amount_charged,
         total_profit = total_profit + v_profit,
         updated_at = now()
   WHERE id = v_agent_profile_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.audit_logs(action, actor_role, target_type, target_id, metadata)
  VALUES ('agent_commission_credit_failed','system','order',NEW.id::text,
          jsonb_build_object('error', SQLERRM, 'order_amount', NEW.amount_charged));
  RETURN NEW;
END;
$function$;