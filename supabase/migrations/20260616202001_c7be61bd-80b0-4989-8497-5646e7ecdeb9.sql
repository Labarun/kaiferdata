CREATE OR REPLACE FUNCTION public.purchase_special_bundle_atomic(_package_id uuid, _recipient_number text)
 RETURNS TABLE(order_id uuid, public_order_id text, amount_charged numeric, new_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_enabled text;
  v_pkg RECORD;
  v_wallet RECORD;
  v_is_agent boolean := false;
  v_tier text;
  v_price numeric;
  v_snapshot jsonb;
  v_order_id uuid;
  v_public text;
  v_attempt int := 0;
  v_exists boolean;
  v_debit RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT setting_value INTO v_enabled FROM public.system_settings WHERE setting_key='special_bundle_offer_enabled' LIMIT 1;
  IF lower(COALESCE(v_enabled,'true')) = 'false' THEN
    RAISE EXCEPTION 'This offer is not available right now.';
  END IF;

  SELECT * INTO v_pkg FROM public.special_bundle_packages WHERE id = _package_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bundle not available.'; END IF;

  IF _recipient_number IS NULL OR _recipient_number !~ '^0[0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid recipient number. Must be 10 digits starting with 0.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.agent_profiles ap
    WHERE ap.user_id = v_uid AND ap.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.agent_subscriptions s
         WHERE s.user_id = v_uid
           AND s.status = 'active'
           AND (s.expires_at IS NULL OR s.expires_at > now())
      )
  ) INTO v_is_agent;

  v_tier := CASE WHEN v_is_agent THEN 'agent' ELSE 'user' END;
  v_price := CASE WHEN v_is_agent THEN v_pkg.agent_price ELSE v_pkg.user_price END;

  SELECT id, current_balance, status INTO v_wallet FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'Your wallet is not active'; END IF;
  IF v_wallet.current_balance < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You have GH₵ %, needed GH₵ %', v_wallet.current_balance, v_price;
  END IF;

  v_snapshot := jsonb_build_object(
    'id', v_pkg.id, 'name', v_pkg.name, 'size_label', v_pkg.size_label,
    'bundle_type', v_pkg.bundle_type, 'network', v_pkg.network,
    'supplier_price', v_pkg.supplier_price, 'user_price', v_pkg.user_price,
    'agent_price', v_pkg.agent_price
  );

  LOOP
    v_attempt := v_attempt + 1;
    v_public := 'KSB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.special_bundle_orders sbo WHERE sbo.public_order_id = v_public) INTO v_exists;
    EXIT WHEN NOT v_exists;
    IF v_attempt >= 5 THEN
      v_public := 'KSB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.special_bundle_orders AS sbo (
    public_order_id, user_id, buyer_role, package_id, package_snapshot,
    recipient_number, network, price_tier, amount_charged, currency, status
  ) VALUES (
    v_public, v_uid, v_tier, v_pkg.id, v_snapshot,
    _recipient_number, 'MTN', v_tier, v_price, 'GHS', 'pending'
  ) RETURNING sbo.id INTO v_order_id;

  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, v_price,
    'Special bundle — ' || v_pkg.size_label,
    'SPB-' || v_order_id::text,
    v_order_id, 'special_bundle_order', v_uid
  );

  UPDATE public.special_bundle_orders sbo SET wallet_debit_txn_id = v_debit.txn_id WHERE sbo.id = v_order_id;

  INSERT INTO public.special_bundle_status_history (order_id, old_status, new_status, note, changed_by)
  VALUES (v_order_id, NULL, 'pending', 'Order placed (paid from wallet)', v_uid);

  INSERT INTO public.audit_logs (action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('special_bundle_purchased', v_uid, v_tier, 'special_bundle_order', v_order_id::text,
    jsonb_build_object('amount', v_price, 'tier', v_tier, 'public_order_id', v_public));

  RETURN QUERY SELECT v_order_id, v_public, v_price, v_debit.new_balance;
END; $function$;