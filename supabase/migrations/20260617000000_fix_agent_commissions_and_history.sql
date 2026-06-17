-- 1. Create an RPC to safely fetch orders referred by an agent
-- This bypasses RLS on purchase_intents for the specific data an agent needs
CREATE OR REPLACE FUNCTION public.get_agent_storefront_orders(p_profile_id uuid, p_limit int DEFAULT 50)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT o.*
  FROM public.orders o
  JOIN public.purchase_intents pi ON o.intent_id = pi.id
  WHERE pi.order_context->'referral'->>'agent_profile_id' = p_profile_id::text
  ORDER BY o.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 2. Clean up legacy trigger that conflicts or runs twice
DROP TRIGGER IF EXISTS trg_order_delivered_commission ON public.orders;

-- 3. Replace the commission trigger to fix the unassigned record error
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
  -- Only act when status reaches a "money is locked in" state
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

  -- Pull referral payload
  SELECT order_context->'referral' INTO v_referral
    FROM public.purchase_intents WHERE id = NEW.intent_id;
  IF v_referral IS NULL OR v_referral = 'null'::jsonb THEN RETURN NEW; END IF;

  v_agent_profile_id := (v_referral->>'agent_profile_id')::uuid;
  v_agent_user_id    := (v_referral->>'agent_user_id')::uuid;
  IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN RETURN NEW; END IF;

  -- Idempotency: avoid double-credit
  SELECT id INTO v_existing FROM public.agent_earnings WHERE order_id = NEW.id LIMIT 1;
  IF FOUND THEN RETURN NEW; END IF;

  v_agent_selling := NULLIF(v_referral->>'agent_selling_price','')::numeric;
  v_agent_base    := NULLIF(v_referral->>'agent_base_price','')::numeric;

  IF v_agent_selling IS NOT NULL AND v_agent_base IS NOT NULL THEN
    v_profit := round(GREATEST(v_agent_selling - v_agent_base, 0)::numeric, 2);
  ELSE
    SELECT setting_value INTO v_setting FROM public.system_settings
     WHERE setting_key = 'agent_commission_rate_percent' LIMIT 1;
    v_rate := COALESCE(NULLIF(v_setting,'')::numeric, 8);
    v_profit := round((NEW.amount_charged * v_rate / 100.0)::numeric, 2);
  END IF;

  IF v_profit <= 0 THEN RETURN NEW; END IF;

  -- Find or create agent earnings wallet safely using scalar ID
  SELECT id INTO v_ewallet_id FROM public.agent_earnings_wallets
   WHERE agent_profile_id = v_agent_profile_id FOR UPDATE;
   
  IF v_ewallet_id IS NULL THEN
    INSERT INTO public.agent_earnings_wallets (user_id, agent_profile_id)
    VALUES (v_agent_user_id, v_agent_profile_id)
    RETURNING id INTO v_ewallet_id;
  END IF;

  -- Credit agent earnings wallet
  PERFORM public.credit_agent_earnings_wallet_atomic(
    v_ewallet_id, v_profit,
    'Commission for order ' || NEW.public_order_id,
    'COMM-' || NEW.id::text,
    NEW.id, 'order', 'commission', NULL
  );

  -- Insert earnings history record
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

  -- Roll up agent totals
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

-- 4. One-time backfill: credit commissions for already-paid referred
--    orders that were never credited (idempotent — safe to re-run).
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
BEGIN
  FOR o IN
    SELECT ord.id, ord.amount_charged, ord.public_order_id, ord.intent_id
      FROM public.orders ord
      LEFT JOIN public.agent_earnings ae ON ae.order_id = ord.id
     WHERE ord.status IN ('paid','processing','delivered')
       AND ord.intent_id IS NOT NULL
       AND ae.id IS NULL
  LOOP
    SELECT order_context->'referral' INTO v_referral
      FROM public.purchase_intents
     WHERE id = o.intent_id;
    IF v_referral IS NULL OR v_referral = 'null'::jsonb THEN
      CONTINUE;
    END IF;

    v_agent_profile_id := (v_referral->>'agent_profile_id')::uuid;
    v_agent_user_id    := (v_referral->>'agent_user_id')::uuid;
    IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN
      CONTINUE;
    END IF;

    v_agent_selling := NULLIF(v_referral->>'agent_selling_price','')::numeric;
    v_agent_base    := NULLIF(v_referral->>'agent_base_price','')::numeric;

    IF v_agent_selling IS NOT NULL AND v_agent_base IS NOT NULL THEN
      v_profit := round(GREATEST(v_agent_selling - v_agent_base, 0)::numeric, 2);
    ELSE
      v_profit := round((o.amount_charged * 8.0 / 100.0)::numeric, 2);
    END IF;

    IF v_profit <= 0 THEN CONTINUE; END IF;

    SELECT id INTO v_ewallet_id
      FROM public.agent_earnings_wallets
     WHERE agent_profile_id = v_agent_profile_id
     FOR UPDATE;
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
           ELSE 8 END,
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
