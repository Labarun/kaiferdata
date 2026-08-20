-- =================================================================================
-- Update refund_wallet_purchase_atomic to allow admins to bypass the 
-- supplier_reference strict constraint. This allows admins to manually refund 
-- an order from the dashboard even if it reached the supplier but failed.
-- =================================================================================

CREATE OR REPLACE FUNCTION public.refund_wallet_purchase_atomic(
  _order_id uuid,
  _reason text DEFAULT 'Order failed before supplier submission',
  _actor_id uuid DEFAULT NULL
)
RETURNS TABLE(
  refunded boolean,
  amount numeric,
  new_balance numeric,
  txn_id uuid,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_existing RECORD;
  v_supplier_ok RECORD;
  v_credit RECORD;
  v_ref text;
  v_meta jsonb;
  v_is_admin boolean := false;
BEGIN
  -- Lock the order row
  SELECT id, public_order_id, status, amount_charged, currency, metadata,
         supplier_reference, actor_id, actor_type, source_channel, origin_type
    INTO v_order
    FROM public.orders
   WHERE id = _order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, NULL::uuid, 'order_not_found'::text;
    RETURN;
  END IF;

  v_meta := COALESCE(v_order.metadata, '{}'::jsonb);

  -- Only wallet-paid orders are eligible for auto-refund
  IF COALESCE(v_meta->>'payment_method','') <> 'wallet'
     AND COALESCE((v_meta->>'wallet_paid')::boolean, false) IS NOT TRUE
     AND v_order.origin_type <> 'user_buy_wallet' THEN
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, NULL::uuid, 'not_wallet_paid'::text;
    RETURN;
  END IF;

  -- Already refunded? (idempotency)
  IF COALESCE((v_meta->>'wallet_refunded')::boolean, false) THEN
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, NULL::uuid, 'already_refunded'::text;
    RETURN;
  END IF;

  -- Check if caller is admin
  IF _actor_id IS NOT NULL THEN
    v_is_admin := public.has_role(_actor_id, 'admin'::app_role);
  END IF;

  -- Refuse refund if a successful supplier submission exists OR if it has a reference
  -- UNLESS the actor is an admin explicitly requesting the refund.
  IF NOT v_is_admin THEN
    SELECT id INTO v_supplier_ok
      FROM public.supplier_request_logs
     WHERE order_id = _order_id
       AND is_success = true
     LIMIT 1;

    IF FOUND OR v_order.supplier_reference IS NOT NULL THEN
      RETURN QUERY SELECT false, 0::numeric, 0::numeric, NULL::uuid, 'supplier_submission_exists'::text;
      RETURN;
    END IF;
  END IF;

  -- Idempotency on wallet ledger reference
  v_ref := 'WPB-REFUND-' || v_order.id::text;
  SELECT wt.id, w.current_balance
    INTO v_existing
    FROM public.wallet_transactions wt
    JOIN public.wallets w ON w.id = wt.wallet_id
   WHERE wt.reference = v_ref
   LIMIT 1;

  IF FOUND THEN
    -- Make sure the order metadata reflects the refund even if a prior call
    -- crashed after crediting but before flagging the order.
    UPDATE public.orders
       SET metadata = v_meta
                       || jsonb_build_object(
                            'wallet_refunded', true,
                            'wallet_refund_txn_id', v_existing.id,
                            'wallet_refund_reason', _reason,
                            'wallet_refund_at', now()
                          )
     WHERE id = _order_id;
    RETURN QUERY SELECT true, v_order.amount_charged, v_existing.current_balance, v_existing.id, 'already_credited'::text;
    RETURN;
  END IF;

  IF v_order.actor_id IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, NULL::uuid, 'no_actor_for_refund'::text;
    RETURN;
  END IF;

  -- Lock the wallet
  SELECT id INTO v_wallet
    FROM public.wallets
   WHERE user_id = v_order.actor_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, NULL::uuid, 'wallet_not_found'::text;
    RETURN;
  END IF;

  -- Credit back the order amount
  SELECT * INTO v_credit FROM public.credit_wallet_atomic(
    v_wallet.id,
    v_order.amount_charged,
    'Refund: ' || _reason || ' (' || v_order.public_order_id || ')',
    v_ref,
    v_order.id,
    'order_refund',
    _actor_id
  );

  -- Mark the order as refunded (preserves status semantics by using metadata
  -- and a dedicated 'refunded' status). Status=refunded is the canonical
  -- terminal state for refunded orders.
  UPDATE public.orders
     SET status = 'refunded',
         metadata = v_meta
                     || jsonb_build_object(
                          'wallet_refunded', true,
                          'wallet_refund_txn_id', v_credit.txn_id,
                          'wallet_refund_reason', _reason,
                          'wallet_refund_at', now()
                        ),
         updated_at = now()
   WHERE id = _order_id;

  -- Status history entry
  INSERT INTO public.order_status_history(order_id, old_status, new_status, source, note, metadata)
  VALUES (
    _order_id,
    v_order.status,
    'refunded',
    'wallet_refund',
    _reason,
    jsonb_build_object('wallet_txn_id', v_credit.txn_id, 'amount', v_order.amount_charged)
  );

  -- Audit
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES (
    'order_wallet_refunded',
    CASE WHEN _actor_id IS NULL THEN 'system' ELSE 'admin' END,
    _actor_id,
    'order',
    _order_id::text,
    jsonb_build_object(
      'public_order_id', v_order.public_order_id,
      'amount', v_order.amount_charged,
      'wallet_txn_id', v_credit.txn_id,
      'reason', _reason
    )
  );

  RETURN QUERY SELECT true, v_order.amount_charged, v_credit.new_balance, v_credit.txn_id, 'refunded'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_wallet_purchase_atomic(uuid, text, uuid) TO authenticated, service_role;
