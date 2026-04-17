-- ============================================================
-- Phase 5: Agent earnings & commissions
-- ============================================================
-- Strict additive: never modifies existing tables/triggers.
-- Commission posts when an order with referral is delivered.

-- 1. Default commission rate (8%) — admins can change this anytime.
INSERT INTO public.system_settings (setting_key, setting_value, setting_group, description)
VALUES (
  'agent_commission_rate_percent',
  '8',
  'agents',
  'Default commission percentage agents earn on each delivered referred order.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Agent earnings ledger
CREATE TABLE IF NOT EXISTS public.agent_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL UNIQUE,           -- one earning per order
  commission_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  order_amount numeric NOT NULL,
  wallet_transaction_id uuid,
  status text NOT NULL DEFAULT 'paid',     -- paid | reversed
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_earnings_agent_idx ON public.agent_earnings(agent_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_earnings_user_idx ON public.agent_earnings(user_id, created_at DESC);

ALTER TABLE public.agent_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own earnings" ON public.agent_earnings;
CREATE POLICY "Owner reads own earnings" ON public.agent_earnings
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage earnings" ON public.agent_earnings;
CREATE POLICY "Admins manage earnings" ON public.agent_earnings
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Staff read earnings" ON public.agent_earnings;
CREATE POLICY "Staff read earnings" ON public.agent_earnings
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'staff'::app_role));

-- 3. Atomic commission credit RPC
-- Idempotent on order_id. Credits agent's wallet, updates agent_profiles totals,
-- inserts an agent_earnings row.
CREATE OR REPLACE FUNCTION public.credit_agent_commission_atomic(
  _order_id uuid,
  _agent_profile_id uuid,
  _agent_user_id uuid,
  _order_amount numeric,
  _commission_rate numeric
)
RETURNS TABLE(earning_id uuid, commission_amount numeric, already_processed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_wallet RECORD;
  v_commission numeric;
  v_earning_id uuid;
  v_txn_id uuid;
  v_credit RECORD;
BEGIN
  -- Idempotency
  SELECT id, commission_amount INTO v_existing FROM public.agent_earnings WHERE order_id = _order_id LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing.id, v_existing.commission_amount, true;
    RETURN;
  END IF;

  v_commission := round((_order_amount * _commission_rate / 100.0)::numeric, 2);
  IF v_commission <= 0 THEN
    RETURN; -- nothing to do
  END IF;

  -- Find agent wallet
  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = _agent_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent wallet not found for user %', _agent_user_id;
  END IF;

  -- Credit wallet
  SELECT * INTO v_credit FROM public.credit_wallet_atomic(
    v_wallet.id,
    v_commission,
    'Agent commission for delivered order',
    'COMM-' || _order_id::text,
    _order_id,
    'order',
    _agent_user_id
  );
  v_txn_id := v_credit.txn_id;

  -- Insert earning
  INSERT INTO public.agent_earnings (
    agent_profile_id, user_id, order_id, commission_amount, commission_rate, order_amount, wallet_transaction_id, status
  ) VALUES (
    _agent_profile_id, _agent_user_id, _order_id, v_commission, _commission_rate, _order_amount, v_txn_id, 'paid'
  ) RETURNING id INTO v_earning_id;

  -- Roll up agent totals
  UPDATE public.agent_profiles
     SET total_orders = total_orders + 1,
         total_sales  = total_sales  + _order_amount,
         total_profit = total_profit + v_commission,
         updated_at = now()
   WHERE id = _agent_profile_id;

  RETURN QUERY SELECT v_earning_id, v_commission, false;
END;
$$;

-- 4. Trigger: when an order moves to 'delivered' AND has referral metadata, credit commission.
CREATE OR REPLACE FUNCTION public.handle_order_delivered_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral jsonb;
  v_agent_profile_id uuid;
  v_agent_user_id uuid;
  v_rate numeric;
  v_setting text;
BEGIN
  IF NEW.status <> 'delivered' THEN RETURN NEW; END IF;
  IF OLD.status = 'delivered' THEN RETURN NEW; END IF;

  -- referral lives on the intent's order_context
  IF NEW.intent_id IS NULL THEN RETURN NEW; END IF;
  SELECT order_context->'referral' INTO v_referral
  FROM public.purchase_intents WHERE id = NEW.intent_id;

  IF v_referral IS NULL OR v_referral = 'null'::jsonb THEN RETURN NEW; END IF;

  v_agent_profile_id := (v_referral->>'agent_profile_id')::uuid;
  v_agent_user_id    := (v_referral->>'agent_user_id')::uuid;
  IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN RETURN NEW; END IF;

  -- Pull commission rate
  SELECT setting_value INTO v_setting FROM public.system_settings
   WHERE setting_key = 'agent_commission_rate_percent' LIMIT 1;
  v_rate := COALESCE(NULLIF(v_setting,'')::numeric, 8);

  PERFORM public.credit_agent_commission_atomic(
    NEW.id, v_agent_profile_id, v_agent_user_id, NEW.amount_charged, v_rate
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block order delivery on commission failure; log and continue.
  INSERT INTO public.audit_logs(action, actor_role, target_type, target_id, metadata)
  VALUES (
    'agent_commission_credit_failed',
    'system',
    'order',
    NEW.id::text,
    jsonb_build_object('error', SQLERRM, 'order_amount', NEW.amount_charged)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_commission_on_delivered ON public.orders;
CREATE TRIGGER trg_orders_commission_on_delivered
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_delivered_commission();