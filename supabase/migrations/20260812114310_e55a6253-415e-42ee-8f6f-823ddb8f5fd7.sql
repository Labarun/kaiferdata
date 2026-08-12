-- ============================================================
-- Security Patch: Secure Agent Withdrawal RPCs
-- ============================================================

-- 1. Secure legacy agent withdrawal request
CREATE OR REPLACE FUNCTION public.request_agent_withdrawal_atomic(
  _user_id uuid,
  _amount numeric,
  _momo_number text,
  _momo_network text,
  _momo_name text
)
RETURNS TABLE(request_id uuid, txn_id uuid, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_min_amount numeric;
  v_setting text;
  v_profile RECORD;
  v_wallet RECORD;
  v_debit RECORD;
  v_request_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  -- SECURITY: Ensure caller is the owner or an admin
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT setting_value INTO v_setting FROM public.system_settings
  WHERE setting_key = 'agent_withdrawal_min_amount' LIMIT 1;
  v_min_amount := COALESCE(NULLIF(v_setting,'')::numeric, 10);

  IF _amount < v_min_amount THEN
    RAISE EXCEPTION 'Minimum withdrawal is GH₵ %', v_min_amount;
  END IF;

  SELECT id, status INTO v_profile
  FROM public.agent_profiles WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No agent profile found';
  END IF;
  IF v_profile.status = 'suspended' THEN
    RAISE EXCEPTION 'Agent profile is suspended';
  END IF;

  SELECT id, current_balance INTO v_wallet
  FROM public.wallets WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_wallet.current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  INSERT INTO public.withdrawal_requests (
    user_id, agent_profile_id, amount,
    momo_number, momo_network, momo_name, status
  ) VALUES (
    _user_id, v_profile.id, _amount,
    _momo_number, _momo_network, _momo_name, 'pending'
  ) RETURNING id INTO v_request_id;

  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, _amount,
    'Agent withdrawal request',
    'WD-' || v_request_id::text,
    v_request_id, 'withdrawal_request', _user_id
  );

  UPDATE public.withdrawal_requests
  SET wallet_transaction_id = v_debit.txn_id, updated_at = now()
  WHERE id = v_request_id;

  RETURN QUERY SELECT v_request_id, v_debit.txn_id, v_debit.new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.request_agent_withdrawal_atomic(uuid, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_agent_withdrawal_atomic(uuid, numeric, text, text, text) TO authenticated, service_role;

-- 2. Secure v2 agent withdrawal request
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
  v_actor uuid := auth.uid();
BEGIN
  -- SECURITY: Ensure caller is the owner or an admin
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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

REVOKE ALL ON FUNCTION public.request_agent_withdrawal_v2_atomic(uuid, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_agent_withdrawal_v2_atomic(uuid, numeric, text, text, text) TO authenticated, service_role;