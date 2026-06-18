
-- PART 1: Fix handle_order_delivered_commission()
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

  v_agent_profile_id := NULLIF(v_referral->>'agent_profile_id','')::uuid;

  -- (a) Resolve agent_user_id from profile when missing on the referral
  v_agent_user_id := COALESCE(
    NULLIF(v_referral->>'agent_user_id','')::uuid,
    (SELECT user_id FROM public.agent_profiles WHERE id = v_agent_profile_id)
  );

  IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_existing FROM public.agent_earnings WHERE order_id = NEW.id LIMIT 1;
  IF FOUND THEN RETURN NEW; END IF;

  v_agent_selling := NULLIF(v_referral->>'agent_selling_price','')::numeric;
  v_agent_base    := NULLIF(v_referral->>'agent_base_price','')::numeric;

  -- (b) Use margin ONLY when BOTH selling > 0 AND base > 0; else fall back to %
  IF v_agent_selling IS NOT NULL AND v_agent_selling > 0
     AND v_agent_base IS NOT NULL AND v_agent_base > 0 THEN
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

-- PART 3: Drop duplicate trigger; keep trg_orders_credit_commission
DROP TRIGGER IF EXISTS trg_orders_commission_on_delivered ON public.orders;

-- PART 2 (DB side): expose user_id on the public storefront RPC so the
-- storefront page can stamp agent_user_id into the referral payload.
DROP FUNCTION IF EXISTS public.get_public_storefront(text);
CREATE OR REPLACE FUNCTION public.get_public_storefront(_slug text)
RETURNS TABLE(
  id uuid, user_id uuid, store_slug text, store_name text,
  store_logo_url text, store_tagline text, business_name text,
  city text, contact_phone text, status agent_profile_status, created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id, user_id, store_slug, store_name, store_logo_url, store_tagline,
         business_name, city, contact_phone, status, created_at
  FROM public.agent_profiles
  WHERE lower(store_slug) = lower(_slug)
    AND status = 'active'
  LIMIT 1
$function$;
