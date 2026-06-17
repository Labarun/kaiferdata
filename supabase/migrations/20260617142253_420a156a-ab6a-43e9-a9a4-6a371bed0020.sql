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

  IF v_key IN ('agent_commission_rate_percent','paystack_fee_percent') THEN
    BEGIN v_num := v_val::numeric; EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '% must be numeric', v_key;
    END;
    IF v_num < 0 OR v_num > 100 THEN
      RAISE EXCEPTION '% must be between 0 and 100', v_key;
    END IF;
  END IF;

  IF v_key IN ('agent_withdrawal_min_amount','wallet_min_deposit','wallet_max_deposit') THEN
    BEGIN v_num := v_val::numeric; EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION '% must be numeric', v_key;
    END;
    IF v_num < 0 THEN
      RAISE EXCEPTION '% cannot be negative', v_key;
    END IF;
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_commission_on_delivered ON public.orders;

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
  IF NEW.status NOT IN ('paid','processing','delivered','queued') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_should_credit := true;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status NOT IN ('paid','processing','delivered','queued') THEN
      v_should_credit := true;
    END IF;
  END IF;

  IF NOT v_should_credit THEN RETURN NEW; END IF;
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

CREATE TRIGGER trg_orders_commission_on_delivered
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_delivered_commission();

DO $$
DECLARE
  o RECORD;
  v_referral jsonb;
  v_agent_profile_id uuid;
  v_agent_user_id uuid;
  v_agent_selling numeric;
  v_agent_base numeric;
  v_profit numeric;
  v_ewallet_id uuid;
  v_rate numeric;
  v_setting text;
BEGIN
  FOR o IN
    SELECT ord.id, ord.amount_charged, ord.public_order_id, ord.intent_id, ord.bundle_snapshot
      FROM public.orders ord
      LEFT JOIN public.agent_earnings ae ON ae.order_id = ord.id
     WHERE ord.status IN ('paid','processing','delivered','queued')
       AND ord.intent_id IS NOT NULL
       AND ae.id IS NULL
  LOOP
    SELECT order_context->'referral' INTO v_referral
      FROM public.purchase_intents WHERE id = o.intent_id;
    IF v_referral IS NULL OR v_referral = 'null'::jsonb THEN CONTINUE; END IF;

    v_agent_profile_id := (v_referral->>'agent_profile_id')::uuid;
    v_agent_user_id    := (v_referral->>'agent_user_id')::uuid;
    IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN CONTINUE; END IF;

    v_agent_selling := NULLIF(v_referral->>'agent_selling_price','')::numeric;

    SELECT agent_base_price INTO v_agent_base
      FROM public.data_packages WHERE id = (o.bundle_snapshot->>'id')::uuid;

    IF v_agent_base IS NULL THEN
      v_agent_base := NULLIF(v_referral->>'agent_base_price','')::numeric;
    END IF;

    IF v_agent_selling IS NOT NULL AND v_agent_base IS NOT NULL THEN
      v_profit := round(GREATEST(v_agent_selling - v_agent_base, 0)::numeric, 2);
    ELSE
      SELECT setting_value INTO v_setting FROM public.system_settings
       WHERE setting_key = 'agent_commission_rate_percent' LIMIT 1;
      v_rate := COALESCE(NULLIF(v_setting,'')::numeric, 8);
      v_profit := round((o.amount_charged * v_rate / 100.0)::numeric, 2);
    END IF;

    IF v_profit <= 0 THEN CONTINUE; END IF;

    SELECT id INTO v_ewallet_id
      FROM public.agent_earnings_wallets
     WHERE agent_profile_id = v_agent_profile_id FOR UPDATE;
    IF v_ewallet_id IS NULL THEN
      INSERT INTO public.agent_earnings_wallets (user_id, agent_profile_id)
      VALUES (v_agent_user_id, v_agent_profile_id)
      RETURNING id INTO v_ewallet_id;
    END IF;

    PERFORM public.credit_agent_earnings_wallet_atomic(
      v_ewallet_id, v_profit,
      'Backfill commission for order ' || o.public_order_id,
      'COMM-' || o.id::text,
      o.id, 'order', 'commission', NULL
    );

    INSERT INTO public.agent_earnings (
      agent_profile_id, user_id, order_id, commission_amount, commission_rate,
      order_amount, status
    ) VALUES (
      v_agent_profile_id, v_agent_user_id, o.id, v_profit,
      CASE WHEN v_agent_selling IS NOT NULL AND v_agent_selling > 0
           THEN round((v_profit / v_agent_selling * 100)::numeric, 2)
           ELSE COALESCE(v_rate, 8) END,
      o.amount_charged, 'paid'
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.agent_profiles
       SET total_orders = total_orders + 1,
           total_sales  = total_sales + o.amount_charged,
           total_profit = total_profit + v_profit,
           updated_at = now()
     WHERE id = v_agent_profile_id;
  END LOOP;
END $$;