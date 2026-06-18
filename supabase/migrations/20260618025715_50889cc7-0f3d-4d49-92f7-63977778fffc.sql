
DO $$
DECLARE
  r record;
  v_agent_profile_id uuid;
  v_agent_user_id uuid;
  v_referral jsonb;
  v_selling numeric;
  v_base numeric;
  v_rate numeric;
  v_setting text;
  v_profit numeric;
  v_pct numeric;
  v_ewallet_id uuid;
  v_credited int := 0;
  v_total numeric := 0;
  v_skipped_no_agent int := 0;
  v_skipped_zero int := 0;
BEGIN
  SELECT setting_value INTO v_setting FROM public.system_settings
   WHERE setting_key = 'agent_commission_rate_percent' LIMIT 1;
  v_rate := COALESCE(NULLIF(v_setting,'')::numeric, 8);

  FOR r IN
    SELECT o.id, o.amount_charged, o.public_order_id, pi.order_context->'referral' AS referral
    FROM public.orders o
    JOIN public.purchase_intents pi ON pi.id = o.intent_id
    WHERE o.status IN ('paid','processing','delivered')
      AND coalesce(pi.order_context->'referral','null'::jsonb) <> 'null'::jsonb
      AND (pi.order_context->'referral'->>'agent_profile_id') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.agent_earnings ae WHERE ae.order_id = o.id)
    ORDER BY o.created_at ASC
  LOOP
    v_referral := r.referral;
    v_agent_profile_id := NULLIF(v_referral->>'agent_profile_id','')::uuid;
    v_agent_user_id := COALESCE(
      NULLIF(v_referral->>'agent_user_id','')::uuid,
      (SELECT user_id FROM public.agent_profiles WHERE id = v_agent_profile_id)
    );

    IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN
      v_skipped_no_agent := v_skipped_no_agent + 1;
      CONTINUE;
    END IF;

    v_selling := NULLIF(v_referral->>'agent_selling_price','')::numeric;
    v_base    := NULLIF(v_referral->>'agent_base_price','')::numeric;

    IF v_selling IS NOT NULL AND v_selling > 0
       AND v_base IS NOT NULL AND v_base > 0 THEN
      v_profit := round(GREATEST(v_selling - v_base, 0)::numeric, 2);
      v_pct := round((v_profit / v_selling * 100)::numeric, 2);
    ELSE
      v_profit := round((r.amount_charged * v_rate / 100.0)::numeric, 2);
      v_pct := v_rate;
    END IF;

    IF v_profit <= 0 THEN
      v_skipped_zero := v_skipped_zero + 1;
      CONTINUE;
    END IF;

    SELECT id INTO v_ewallet_id FROM public.agent_earnings_wallets
      WHERE agent_profile_id = v_agent_profile_id FOR UPDATE;
    IF v_ewallet_id IS NULL THEN
      INSERT INTO public.agent_earnings_wallets (user_id, agent_profile_id)
      VALUES (v_agent_user_id, v_agent_profile_id)
      RETURNING id INTO v_ewallet_id;
    END IF;

    PERFORM public.credit_agent_earnings_wallet_atomic(
      v_ewallet_id, v_profit,
      'Commission backfill for order ' || r.public_order_id,
      'COMM-' || r.id::text,
      r.id, 'order', 'commission', NULL
    );

    INSERT INTO public.agent_earnings (
      agent_profile_id, user_id, order_id, commission_amount, commission_rate,
      order_amount, status
    ) VALUES (
      v_agent_profile_id, v_agent_user_id, r.id, v_profit, v_pct,
      r.amount_charged, 'paid'
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.agent_profiles
       SET total_orders = total_orders + 1,
           total_sales  = total_sales + r.amount_charged,
           total_profit = total_profit + v_profit,
           updated_at = now()
     WHERE id = v_agent_profile_id;

    v_credited := v_credited + 1;
    v_total := v_total + v_profit;
  END LOOP;

  INSERT INTO public.audit_logs(action, actor_role, target_type, target_id, metadata)
  VALUES ('agent_commission_backfill','system','batch', gen_random_uuid()::text,
          jsonb_build_object(
            'credited_count', v_credited,
            'total_credited', v_total,
            'skipped_no_agent', v_skipped_no_agent,
            'skipped_zero_profit', v_skipped_zero,
            'rate_used', v_rate
          ));

  RAISE NOTICE 'Backfill complete: credited=% total=% skipped_no_agent=% skipped_zero=%',
    v_credited, v_total, v_skipped_no_agent, v_skipped_zero;
END $$;
