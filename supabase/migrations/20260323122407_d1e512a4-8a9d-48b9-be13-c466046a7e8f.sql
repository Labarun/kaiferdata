
-- Atomic wallet credit function: prevents race conditions with SELECT FOR UPDATE
CREATE OR REPLACE FUNCTION public.credit_wallet_atomic(
  _wallet_id uuid,
  _amount numeric,
  _narration text,
  _reference text,
  _linked_record_id uuid DEFAULT NULL,
  _linked_record_type text DEFAULT NULL,
  _created_by uuid DEFAULT NULL
)
RETURNS TABLE(new_balance numeric, opening_bal numeric, closing_bal numeric, txn_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_closing numeric;
  v_txn_id uuid;
BEGIN
  -- Lock the wallet row to prevent concurrent modifications
  SELECT id, current_balance INTO v_wallet
  FROM public.wallets
  WHERE id = _wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found: %', _wallet_id;
  END IF;

  v_closing := v_wallet.current_balance + _amount;

  -- Update wallet balance atomically
  UPDATE public.wallets
  SET current_balance = v_closing, updated_at = now()
  WHERE id = _wallet_id;

  -- Insert wallet transaction
  INSERT INTO public.wallet_transactions (
    wallet_id, transaction_type, direction, amount,
    opening_balance, closing_balance, status,
    narration, reference, linked_record_id, linked_record_type, created_by
  ) VALUES (
    _wallet_id, 'credit', 'inflow', _amount,
    v_wallet.current_balance, v_closing, 'completed',
    _narration, _reference, _linked_record_id, _linked_record_type, _created_by
  ) RETURNING id INTO v_txn_id;

  RETURN QUERY SELECT v_closing, v_wallet.current_balance, v_closing, v_txn_id;
END;
$$;

-- Atomic intent claim: only one caller can claim an intent for processing
CREATE OR REPLACE FUNCTION public.claim_intent_for_verification(_intent_id uuid)
RETURNS SETOF public.purchase_intents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.purchase_intents
  SET status = 'payment_processing', updated_at = now()
  WHERE id = _intent_id
    AND status IN ('created', 'pending_payment', 'payment_processing')
  RETURNING *;
END;
$$;

-- Atomic order claim: only one caller can claim an order for fulfillment
CREATE OR REPLACE FUNCTION public.claim_order_for_fulfillment(_order_id uuid)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.orders
  SET status = 'processing', supplier_status = 'submitting', updated_at = now()
  WHERE id = _order_id
    AND status IN ('paid', 'queued', 'failed')
  RETURNING *;
END;
$$;
