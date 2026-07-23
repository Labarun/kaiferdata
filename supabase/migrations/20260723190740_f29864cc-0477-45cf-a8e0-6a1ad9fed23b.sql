CREATE OR REPLACE FUNCTION public.handle_order_refunded_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_earning RECORD;
  v_wallet_id uuid;
  v_profit numeric;
BEGIN
  IF NEW.status IS DISTINCT FROM 'refunded' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT ae.id, ae.agent_profile_id, ae.user_id, ae.commission_amount, ae.status
  INTO v_earning
  FROM public.agent_earnings ae
  WHERE ae.order_id = NEW.id
    AND ae.status = 'paid'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_profit := round(v_earning.commission_amount::numeric, 2);
  IF v_profit <= 0 THEN
    UPDATE public.agent_earnings
    SET status = 'reversed'
    WHERE id = v_earning.id;
    RETURN NEW;
  END IF;

  SELECT id INTO v_wallet_id
  FROM public.agent_earnings_wallets
  WHERE agent_profile_id = v_earning.agent_profile_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.agent_earnings_wallets (user_id, agent_profile_id)
    VALUES (v_earning.user_id, v_earning.agent_profile_id)
    RETURNING id INTO v_wallet_id;
  END IF;

  PERFORM public.debit_agent_earnings_wallet_atomic(
    v_wallet_id,
    v_profit,
    'Refund reversal for order ' || NEW.public_order_id,
    'REFUND-' || NEW.id::text,
    NEW.id,
    'order',
    'refund',
    v_earning.user_id
  );

  UPDATE public.agent_earnings
  SET status = 'reversed'
  WHERE id = v_earning.id;

  UPDATE public.agent_profiles
  SET total_profit = total_profit - v_profit,
      updated_at = now()
  WHERE id = v_earning.agent_profile_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.audit_logs(action, actor_role, target_type, target_id, metadata)
  VALUES (
    'agent_profit_refund_reverse_failed',
    'system',
    'order',
    NEW.id::text,
    jsonb_build_object('error', SQLERRM, 'order_public_id', NEW.public_order_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_refund_commission ON public.orders;
CREATE TRIGGER trg_orders_refund_commission
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_order_refunded_commission();