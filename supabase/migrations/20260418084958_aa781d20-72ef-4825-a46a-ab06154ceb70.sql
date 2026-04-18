CREATE OR REPLACE FUNCTION public.purchase_with_wallet_atomic(
  _user_id uuid,
  _package_id uuid,
  _phone_number text,
  _network text,
  _customer_name text DEFAULT NULL,
  _customer_email text DEFAULT NULL,
  _source_channel text DEFAULT 'user_dashboard'
)
RETURNS TABLE (
  order_id uuid,
  public_order_id text,
  amount_charged numeric,
  new_balance numeric,
  txn_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg RECORD;
  v_wallet RECORD;
  v_price numeric;
  v_order_id uuid;
  v_public_order_id text;
  v_debit RECORD;
  v_snapshot jsonb;
  v_safety text;
  v_alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_attempt int := 0;
  v_chars text;
  v_i int;
  v_exists boolean;
BEGIN
  -- 0. Safety guard
  SELECT setting_value INTO v_safety
    FROM public.system_settings
   WHERE setting_key = 'order_submission_enabled' LIMIT 1;
  IF v_safety = 'false' THEN
    RAISE EXCEPTION 'Order submission is temporarily disabled. Please try again later.';
  END IF;

  IF _phone_number IS NULL OR length(trim(_phone_number)) < 10 THEN
    RAISE EXCEPTION 'A valid recipient phone number is required';
  END IF;
  IF _network IS NULL OR length(trim(_network)) = 0 THEN
    RAISE EXCEPTION 'Network is required';
  END IF;

  SELECT id, network, package_name, package_code, package_size_label,
         selling_price, currency, is_active, validity_label
    INTO v_pkg
    FROM public.data_packages
   WHERE id = _package_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT v_pkg.is_active THEN RAISE EXCEPTION 'This package is no longer available'; END IF;
  IF lower(v_pkg.network) <> lower(_network) THEN
    RAISE EXCEPTION 'Network mismatch for this package';
  END IF;

  v_price := round(v_pkg.selling_price::numeric, 2);
  IF v_price <= 0 THEN RAISE EXCEPTION 'Invalid package price'; END IF;

  SELECT id, current_balance, status INTO v_wallet
    FROM public.wallets
   WHERE user_id = _user_id
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'Your wallet is not active'; END IF;
  IF v_wallet.current_balance < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You have GH₵ %, needed GH₵ %', v_wallet.current_balance, v_price;
  END IF;

  v_snapshot := jsonb_build_object(
    'id', v_pkg.id,
    'package_code', v_pkg.package_code,
    'package_name', v_pkg.package_name,
    'volume', v_pkg.package_size_label,
    'amount', v_price,
    'network', v_pkg.network,
    'description', v_pkg.validity_label
  );

  -- Generate short customer-facing order id (KD-XXXXX) with collision retry.
  -- Crockford-style alphabet (no I/L/O/U) → 32^5 ≈ 33M combinations.
  LOOP
    v_attempt := v_attempt + 1;
    v_chars := '';
    FOR v_i IN 1..5 LOOP
      v_chars := v_chars || substr(v_alphabet, 1 + (floor(random() * 32))::int, 1);
    END LOOP;
    v_public_order_id := 'KD-' || v_chars;

    SELECT EXISTS(SELECT 1 FROM public.orders WHERE public_order_id = v_public_order_id)
      INTO v_exists;
    EXIT WHEN NOT v_exists;
    IF v_attempt >= 8 THEN
      -- Extreme fallback: append more entropy to guarantee uniqueness
      v_public_order_id := 'KD-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 7));
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.orders (
    public_order_id, actor_type, actor_id, origin_type,
    source_channel, beneficiary_number, network,
    bundle_name, bundle_code, bundle_snapshot,
    amount_charged, currency, status, metadata
  ) VALUES (
    v_public_order_id, 'user', _user_id, 'user_buy_wallet',
    _source_channel, _phone_number, v_pkg.network,
    v_pkg.package_name, v_pkg.package_code, v_snapshot,
    v_price, COALESCE(v_pkg.currency, 'GHS'), 'paid',
    jsonb_build_object(
      'payment_method', 'wallet',
      'customer_name', _customer_name,
      'customer_email', _customer_email,
      'wallet_paid', true
    )
  )
  RETURNING id INTO v_order_id;

  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id,
    v_price,
    'Bundle purchase — ' || v_pkg.package_name,
    'WPB-' || v_order_id::text,
    v_order_id, 'order', _user_id
  );

  INSERT INTO public.order_status_history (order_id, old_status, new_status, source, note, metadata)
  VALUES (
    v_order_id, NULL, 'paid', 'wallet_purchase',
    'Order paid from wallet (GHS ' || v_price::text || ')',
    jsonb_build_object('wallet_txn_id', v_debit.txn_id, 'method', 'wallet')
  );

  INSERT INTO public.audit_logs(action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES (
    'order_created_from_wallet', _user_id, 'user', 'order', v_order_id::text,
    jsonb_build_object(
      'public_order_id', v_public_order_id,
      'amount', v_price,
      'wallet_txn_id', v_debit.txn_id,
      'package_id', v_pkg.id,
      'network', v_pkg.network,
      'phone', _phone_number
    )
  );

  RETURN QUERY SELECT v_order_id, v_public_order_id, v_price, v_debit.new_balance, v_debit.txn_id;
END;
$$;