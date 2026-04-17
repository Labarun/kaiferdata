-- =====================================================
-- AGENT SYSTEM FOUNDATION — Phase A
-- Strictly additive. Does not modify any existing flow.
-- =====================================================

-- 1. NEW COLUMNS ON data_packages
ALTER TABLE public.data_packages
  ADD COLUMN IF NOT EXISTS agent_base_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_agent_resaleable boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.data_packages.agent_base_price IS 'The cost agents pay per bundle. Profit = agent_selling_price - agent_base_price.';
COMMENT ON COLUMN public.data_packages.is_agent_resaleable IS 'Whether agents can resell this bundle.';

-- 2. NEW COLUMN ON withdrawal_requests
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS wallet_kind text NOT NULL DEFAULT 'personal';

COMMENT ON COLUMN public.withdrawal_requests.wallet_kind IS 'personal | agent_earnings — which balance the withdrawal debits.';

-- 3. agent_earnings_wallets
CREATE TABLE IF NOT EXISTS public.agent_earnings_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  agent_profile_id uuid NOT NULL UNIQUE,
  current_balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active | frozen
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_earnings_wallets_user ON public.agent_earnings_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_earnings_wallets_profile ON public.agent_earnings_wallets(agent_profile_id);

ALTER TABLE public.agent_earnings_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own earnings wallet"
  ON public.agent_earnings_wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage earnings wallets"
  ON public.agent_earnings_wallets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read earnings wallets"
  ON public.agent_earnings_wallets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_agent_earnings_wallets_updated_at
  BEFORE UPDATE ON public.agent_earnings_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. agent_wallet_transactions
CREATE TABLE IF NOT EXISTS public.agent_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_wallet_id uuid NOT NULL REFERENCES public.agent_earnings_wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inflow','outflow')),
  txn_type text NOT NULL CHECK (txn_type IN ('commission','withdrawal','adjustment','refund')),
  amount numeric NOT NULL,
  opening_balance numeric NOT NULL,
  closing_balance numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  narration text,
  reference text,
  linked_record_id uuid,
  linked_record_type text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_wallet_txns_wallet ON public.agent_wallet_transactions(agent_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_wallet_txns_user ON public.agent_wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_wallet_txns_reference ON public.agent_wallet_transactions(reference) WHERE reference IS NOT NULL;

ALTER TABLE public.agent_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own ledger"
  ON public.agent_wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage ledger"
  ON public.agent_wallet_transactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read ledger"
  ON public.agent_wallet_transactions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role));

-- 5. agent_bundle_prices
CREATE TABLE IF NOT EXISTS public.agent_bundle_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.data_packages(id) ON DELETE CASCADE,
  selling_price numeric NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_profile_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_bundle_prices_profile ON public.agent_bundle_prices(agent_profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_bundle_prices_package ON public.agent_bundle_prices(package_id);

ALTER TABLE public.agent_bundle_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published agent prices"
  ON public.agent_bundle_prices FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Owner manages own prices"
  ON public.agent_bundle_prices FOR ALL TO authenticated
  USING (agent_profile_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()))
  WITH CHECK (agent_profile_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage agent prices"
  ON public.agent_bundle_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_agent_bundle_prices_updated_at
  BEFORE UPDATE ON public.agent_bundle_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. SEED system_settings for new minimum withdrawal amount
INSERT INTO public.system_settings (setting_key, setting_value, setting_group, description)
VALUES ('agent_withdrawal_min_amount', '10', 'agent', 'Minimum agent withdrawal amount in GHS')
ON CONFLICT (setting_key) DO NOTHING;

-- 7. BACKFILL agent_earnings_wallets for every existing agent_profile
INSERT INTO public.agent_earnings_wallets (user_id, agent_profile_id, current_balance, total_earned, total_withdrawn, status)
SELECT user_id, id, 0, 0, 0, 'active'
FROM public.agent_profiles
ON CONFLICT (agent_profile_id) DO NOTHING;

-- =====================================================
-- ATOMIC RPCs
-- =====================================================

-- 8. credit_agent_earnings_wallet_atomic
CREATE OR REPLACE FUNCTION public.credit_agent_earnings_wallet_atomic(
  _agent_wallet_id uuid,
  _amount numeric,
  _narration text,
  _reference text,
  _linked_record_id uuid DEFAULT NULL,
  _linked_record_type text DEFAULT NULL,
  _txn_type text DEFAULT 'commission',
  _created_by uuid DEFAULT NULL
)
RETURNS TABLE(txn_id uuid, new_balance numeric, opening_bal numeric, closing_bal numeric, already_processed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet RECORD;
  v_existing RECORD;
  v_closing numeric;
  v_txn_id uuid;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  -- Idempotency on reference
  IF _reference IS NOT NULL THEN
    SELECT id, closing_balance INTO v_existing
    FROM public.agent_wallet_transactions
    WHERE reference = _reference AND agent_wallet_id = _agent_wallet_id
    LIMIT 1;
    IF FOUND THEN
      RETURN QUERY SELECT v_existing.id, v_existing.closing_balance, v_existing.closing_balance, v_existing.closing_balance, true;
      RETURN;
    END IF;
  END IF;

  SELECT id, current_balance, total_earned INTO v_wallet
  FROM public.agent_earnings_wallets WHERE id = _agent_wallet_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent earnings wallet not found: %', _agent_wallet_id;
  END IF;

  v_closing := v_wallet.current_balance + _amount;

  UPDATE public.agent_earnings_wallets
  SET current_balance = v_closing,
      total_earned = total_earned + CASE WHEN _txn_type = 'commission' THEN _amount ELSE 0 END,
      updated_at = now()
  WHERE id = _agent_wallet_id;

  INSERT INTO public.agent_wallet_transactions (
    agent_wallet_id, user_id, direction, txn_type, amount,
    opening_balance, closing_balance, status,
    narration, reference, linked_record_id, linked_record_type, created_by
  )
  SELECT _agent_wallet_id, w.user_id, 'inflow', _txn_type, _amount,
         v_wallet.current_balance, v_closing, 'completed',
         _narration, _reference, _linked_record_id, _linked_record_type, _created_by
  FROM public.agent_earnings_wallets w WHERE w.id = _agent_wallet_id
  RETURNING id INTO v_txn_id;

  RETURN QUERY SELECT v_txn_id, v_closing, v_wallet.current_balance, v_closing, false;
END;
$$;

-- 9. debit_agent_earnings_wallet_atomic
CREATE OR REPLACE FUNCTION public.debit_agent_earnings_wallet_atomic(
  _agent_wallet_id uuid,
  _amount numeric,
  _narration text,
  _reference text,
  _linked_record_id uuid DEFAULT NULL,
  _linked_record_type text DEFAULT NULL,
  _txn_type text DEFAULT 'withdrawal',
  _created_by uuid DEFAULT NULL
)
RETURNS TABLE(txn_id uuid, new_balance numeric, opening_bal numeric, closing_bal numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet RECORD;
  v_closing numeric;
  v_txn_id uuid;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Debit amount must be positive'; END IF;

  SELECT id, current_balance, total_withdrawn INTO v_wallet
  FROM public.agent_earnings_wallets WHERE id = _agent_wallet_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Agent earnings wallet not found'; END IF;

  IF v_wallet.current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient earnings balance: have %, need %', v_wallet.current_balance, _amount;
  END IF;

  v_closing := v_wallet.current_balance - _amount;

  UPDATE public.agent_earnings_wallets
  SET current_balance = v_closing,
      total_withdrawn = total_withdrawn + CASE WHEN _txn_type = 'withdrawal' THEN _amount ELSE 0 END,
      updated_at = now()
  WHERE id = _agent_wallet_id;

  INSERT INTO public.agent_wallet_transactions (
    agent_wallet_id, user_id, direction, txn_type, amount,
    opening_balance, closing_balance, status,
    narration, reference, linked_record_id, linked_record_type, created_by
  )
  SELECT _agent_wallet_id, w.user_id, 'outflow', _txn_type, _amount,
         v_wallet.current_balance, v_closing, 'completed',
         _narration, _reference, _linked_record_id, _linked_record_type, _created_by
  FROM public.agent_earnings_wallets w WHERE w.id = _agent_wallet_id
  RETURNING id INTO v_txn_id;

  RETURN QUERY SELECT v_txn_id, v_closing, v_wallet.current_balance, v_closing;
END;
$$;

-- 10. request_agent_withdrawal_v2_atomic — uses agent earnings wallet
CREATE OR REPLACE FUNCTION public.request_agent_withdrawal_v2_atomic(
  _user_id uuid,
  _amount numeric,
  _momo_number text,
  _momo_network text,
  _momo_name text
)
RETURNS TABLE(request_id uuid, txn_id uuid, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min numeric;
  v_setting text;
  v_profile RECORD;
  v_ewallet RECORD;
  v_debit RECORD;
  v_request_id uuid;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  SELECT setting_value INTO v_setting FROM public.system_settings
   WHERE setting_key = 'agent_withdrawal_min_amount' LIMIT 1;
  v_min := COALESCE(NULLIF(v_setting,'')::numeric, 10);

  IF _amount < v_min THEN
    RAISE EXCEPTION 'Minimum withdrawal is GH₵ %', v_min;
  END IF;

  SELECT id, status INTO v_profile FROM public.agent_profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No agent profile found'; END IF;
  IF v_profile.status = 'suspended' THEN RAISE EXCEPTION 'Agent profile is suspended'; END IF;

  SELECT id, current_balance INTO v_ewallet
  FROM public.agent_earnings_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agent earnings wallet not found'; END IF;
  IF v_ewallet.current_balance < _amount THEN RAISE EXCEPTION 'Insufficient earnings balance'; END IF;

  INSERT INTO public.withdrawal_requests (
    user_id, agent_profile_id, amount,
    momo_number, momo_network, momo_name, status, wallet_kind
  ) VALUES (
    _user_id, v_profile.id, _amount,
    _momo_number, _momo_network, _momo_name, 'pending', 'agent_earnings'
  ) RETURNING id INTO v_request_id;

  SELECT * INTO v_debit FROM public.debit_agent_earnings_wallet_atomic(
    v_ewallet.id, _amount,
    'Agent withdrawal request',
    'AWD-' || v_request_id::text,
    v_request_id, 'withdrawal_request', 'withdrawal', _user_id
  );

  UPDATE public.withdrawal_requests
  SET wallet_transaction_id = v_debit.txn_id, updated_at = now()
  WHERE id = v_request_id;

  RETURN QUERY SELECT v_request_id, v_debit.txn_id, v_debit.new_balance;
END;
$$;

-- 11. approve_agent_withdrawal_v2_atomic
CREATE OR REPLACE FUNCTION public.approve_agent_withdrawal_v2_atomic(
  _request_id uuid, _admin_id uuid, _note text DEFAULT NULL
)
RETURNS TABLE(request_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req RECORD;
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status; END IF;

  UPDATE public.withdrawal_requests
  SET status = 'paid', admin_note = COALESCE(_note, admin_note),
      reviewed_by = _admin_id, reviewed_at = now(), updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_approved_v2','admin',_admin_id,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note, 'wallet_kind', v_req.wallet_kind));

  RETURN QUERY SELECT _request_id, 'paid'::text;
END;
$$;

-- 12. reject_agent_withdrawal_v2_atomic — refunds to agent earnings wallet
CREATE OR REPLACE FUNCTION public.reject_agent_withdrawal_v2_atomic(
  _request_id uuid, _admin_id uuid, _note text DEFAULT NULL
)
RETURNS TABLE(request_id uuid, status text, refunded_amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req RECORD;
  v_ewallet RECORD;
  v_credit RECORD;
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status; END IF;

  IF v_req.wallet_kind = 'agent_earnings' THEN
    SELECT id INTO v_ewallet FROM public.agent_earnings_wallets WHERE user_id = v_req.user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Agent earnings wallet not found'; END IF;

    SELECT * INTO v_credit FROM public.credit_agent_earnings_wallet_atomic(
      v_ewallet.id, v_req.amount,
      'Withdrawal rejected — refund',
      'AWD-REFUND-' || _request_id::text,
      _request_id, 'withdrawal_request', 'refund', _admin_id
    );
  ELSE
    -- Legacy personal-wallet path (preserves existing behavior)
    DECLARE v_pwallet RECORD;
    BEGIN
      SELECT id INTO v_pwallet FROM public.wallets WHERE user_id = v_req.user_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
      SELECT * INTO v_credit FROM public.credit_wallet_atomic(
        v_pwallet.id, v_req.amount,
        'Withdrawal rejected — refund',
        'WD-REFUND-' || _request_id::text,
        _request_id, 'withdrawal_request', _admin_id
      );
    END;
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'rejected', admin_note = COALESCE(_note, admin_note),
      reviewed_by = _admin_id, reviewed_at = now(),
      refund_transaction_id = v_credit.txn_id, updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_rejected_v2','admin',_admin_id,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note, 'wallet_kind', v_req.wallet_kind, 'refund_txn', v_credit.txn_id));

  RETURN QUERY SELECT _request_id, 'rejected'::text, v_req.amount;
END;
$$;

-- 13. upsert_agent_bundle_price — owner-only, validates floor
CREATE OR REPLACE FUNCTION public.upsert_agent_bundle_price(
  _package_id uuid,
  _selling_price numeric
)
RETURNS TABLE(id uuid, selling_price numeric, agent_base_price numeric, profit numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id uuid;
  v_pkg RECORD;
  v_row_id uuid;
BEGIN
  SELECT ap.id INTO v_profile_id FROM public.agent_profiles ap
   WHERE ap.user_id = auth.uid() LIMIT 1;
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'No agent profile'; END IF;

  SELECT id, agent_base_price, is_agent_resaleable, is_active
    INTO v_pkg FROM public.data_packages WHERE id = _package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT v_pkg.is_agent_resaleable OR NOT v_pkg.is_active THEN
    RAISE EXCEPTION 'Package is not available for agent resale';
  END IF;
  IF _selling_price < v_pkg.agent_base_price THEN
    RAISE EXCEPTION 'Selling price (%) cannot be below your cost (%)', _selling_price, v_pkg.agent_base_price;
  END IF;
  IF _selling_price > v_pkg.agent_base_price * 10 THEN
    RAISE EXCEPTION 'Selling price too high (max 10x base)';
  END IF;

  INSERT INTO public.agent_bundle_prices (agent_profile_id, package_id, selling_price, is_published)
  VALUES (v_profile_id, _package_id, _selling_price, true)
  ON CONFLICT (agent_profile_id, package_id) DO UPDATE
    SET selling_price = EXCLUDED.selling_price, is_published = true, updated_at = now()
  RETURNING agent_bundle_prices.id INTO v_row_id;

  RETURN QUERY SELECT v_row_id, _selling_price, v_pkg.agent_base_price, (_selling_price - v_pkg.agent_base_price);
END;
$$;

-- 14. REPLACE handle_order_delivered_commission to credit AGENT EARNINGS WALLET (not personal)
-- with backward-compatible fallback to legacy 8% rate when no bundle price snapshot exists.
CREATE OR REPLACE FUNCTION public.handle_order_delivered_commission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referral jsonb;
  v_agent_profile_id uuid;
  v_agent_user_id uuid;
  v_agent_selling numeric;
  v_agent_base numeric;
  v_profit numeric;
  v_ewallet RECORD;
  v_rate numeric;
  v_setting text;
  v_existing RECORD;
BEGIN
  IF NEW.status <> 'delivered' THEN RETURN NEW; END IF;
  IF OLD.status = 'delivered' THEN RETURN NEW; END IF;
  IF NEW.intent_id IS NULL THEN RETURN NEW; END IF;

  SELECT order_context->'referral' INTO v_referral
    FROM public.purchase_intents WHERE id = NEW.intent_id;
  IF v_referral IS NULL OR v_referral = 'null'::jsonb THEN RETURN NEW; END IF;

  v_agent_profile_id := (v_referral->>'agent_profile_id')::uuid;
  v_agent_user_id    := (v_referral->>'agent_user_id')::uuid;
  IF v_agent_profile_id IS NULL OR v_agent_user_id IS NULL THEN RETURN NEW; END IF;

  -- Idempotency: avoid double-credit
  SELECT id INTO v_existing FROM public.agent_earnings WHERE order_id = NEW.id LIMIT 1;
  IF FOUND THEN RETURN NEW; END IF;

  -- Prefer snapshot from referral payload (selling - base), fall back to legacy %
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

  -- Find or create agent earnings wallet
  SELECT id INTO v_ewallet FROM public.agent_earnings_wallets
   WHERE agent_profile_id = v_agent_profile_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.agent_earnings_wallets (user_id, agent_profile_id)
    VALUES (v_agent_user_id, v_agent_profile_id)
    RETURNING id INTO v_ewallet.id;
  END IF;

  -- Credit agent earnings wallet (NOT personal wallet)
  PERFORM public.credit_agent_earnings_wallet_atomic(
    v_ewallet.id, v_profit,
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
$$;

-- 15. ENSURE the trigger exists (it currently doesn't per db state)
DROP TRIGGER IF EXISTS trg_order_delivered_commission ON public.orders;
CREATE TRIGGER trg_order_delivered_commission
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered'))
  EXECUTE FUNCTION public.handle_order_delivered_commission();