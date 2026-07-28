-- Fix supplier cost in profit calculator
-- Updates purchase RPCs to store supplier_price in snapshot
-- Updates profit metrics RPC to retroactively fetch missing supplier prices

DROP FUNCTION IF EXISTS public.purchase_with_wallet_atomic(uuid, uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.purchase_with_wallet_atomic(
  _user_id uuid, _package_id uuid, _phone_number text, _network text,
  _customer_name text DEFAULT NULL::text, _customer_email text DEFAULT NULL::text,
  _source_channel text DEFAULT 'user_dashboard'::text
)
RETURNS TABLE(order_id uuid, public_order_id text, amount_charged numeric, new_balance numeric, txn_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pkg RECORD; v_wallet RECORD; v_price numeric; v_order_id uuid;
  v_public_order_id text; v_debit RECORD; v_snapshot jsonb; v_safety text;
  v_alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_attempt int := 0; v_chars text; v_i int; v_exists boolean;
  v_actor uuid := auth.uid();
  v_is_agent boolean := false;
BEGIN
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT setting_value INTO v_safety FROM public.system_settings WHERE setting_key = 'order_submission_enabled' LIMIT 1;
  IF v_safety = 'false' THEN RAISE EXCEPTION 'Order submission is temporarily disabled. Please try again later.'; END IF;
  IF _phone_number IS NULL OR length(trim(_phone_number)) < 10 THEN
    RAISE EXCEPTION 'A valid recipient phone number is required';
  END IF;
  IF _network IS NULL OR length(trim(_network)) = 0 THEN RAISE EXCEPTION 'Network is required'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.agent_profiles WHERE user_id = _user_id AND status = 'active') INTO v_is_agent;
  SELECT id, network, package_name, package_code, package_size_label,
         selling_price, agent_base_price, currency, is_active, validity_label, buying_enabled, supplier_price
    INTO v_pkg FROM public.data_packages WHERE id = _package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT v_pkg.is_active THEN RAISE EXCEPTION 'This package is no longer available'; END IF;
  IF NOT COALESCE(v_pkg.buying_enabled, true) THEN RAISE EXCEPTION 'Ordering for this bundle is temporarily disabled'; END IF;
  IF lower(v_pkg.network) <> lower(_network) THEN RAISE EXCEPTION 'Network mismatch for this package'; END IF;
  IF v_is_agent AND v_pkg.agent_base_price IS NOT NULL AND v_pkg.agent_base_price > 0 THEN
    v_price := round(v_pkg.agent_base_price::numeric, 2);
  ELSE
    v_price := round(v_pkg.selling_price::numeric, 2);
  END IF;
  IF v_price <= 0 THEN RAISE EXCEPTION 'Invalid package price'; END IF;
  SELECT id, current_balance, status INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'Your wallet is not active'; END IF;
  IF v_wallet.current_balance < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You have GHS %, needed GHS %', v_wallet.current_balance, v_price;
  END IF;
  v_snapshot := jsonb_build_object(
    'id', v_pkg.id, 'package_code', v_pkg.package_code, 'package_name', v_pkg.package_name,
    'volume', v_pkg.package_size_label, 'amount', v_price, 'network', v_pkg.network,
    'description', v_pkg.validity_label, 'supplier_price', v_pkg.supplier_price
  );
  LOOP
    v_attempt := v_attempt + 1; v_chars := '';
    FOR v_i IN 1..5 LOOP
      v_chars := v_chars || substr(v_alphabet, 1 + (floor(random() * 32))::int, 1);
    END LOOP;
    v_public_order_id := 'KD-' || v_chars;
    SELECT EXISTS(SELECT 1 FROM public.orders o WHERE o.public_order_id = v_public_order_id) INTO v_exists;
    EXIT WHEN NOT v_exists;
    IF v_attempt >= 8 THEN
      v_public_order_id := 'KD-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 7)); EXIT;
    END IF;
  END LOOP;
  INSERT INTO public.orders (
    public_order_id, actor_type, actor_id, origin_type, source_channel,
    beneficiary_number, network, bundle_name, bundle_code, bundle_snapshot,
    amount_charged, currency, status, metadata
  ) VALUES (
    v_public_order_id, CASE WHEN v_is_agent THEN 'agent' ELSE 'user' END, _user_id, 'user_buy_wallet', _source_channel,
    _phone_number, v_pkg.network, v_pkg.package_name, v_pkg.package_code, v_snapshot,
    v_price, COALESCE(v_pkg.currency, 'GHS'), 'paid',
    jsonb_build_object('payment_method', 'wallet', 'customer_name', _customer_name,
      'customer_email', _customer_email, 'wallet_paid', true)
  ) RETURNING id INTO v_order_id;
  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, v_price, 'Bundle purchase - ' || v_pkg.package_name,
    'WPB-' || v_order_id::text, v_order_id, 'order', _user_id
  );
  INSERT INTO public.order_status_history (order_id, old_status, new_status, source, note, metadata)
  VALUES (v_order_id, NULL, 'paid', 'wallet_purchase',
    'Order paid from wallet (GHS ' || v_price::text || ')',
    jsonb_build_object('wallet_txn_id', v_debit.txn_id, 'method', 'wallet'));
  INSERT INTO public.audit_logs(action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('order_created_from_wallet', _user_id, CASE WHEN v_is_agent THEN 'agent' ELSE 'user' END, 'order', v_order_id::text,
    jsonb_build_object('public_order_id', v_public_order_id, 'amount', v_price,
      'wallet_txn_id', v_debit.txn_id, 'package_id', v_pkg.id,
      'network', v_pkg.network, 'phone', _phone_number));
  RETURN QUERY SELECT v_order_id, v_public_order_id, v_price, v_debit.new_balance, v_debit.txn_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.purchase_with_wallet_atomic(uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_with_wallet_atomic(uuid, uuid, text, text, text, text, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.purchase_bulk_with_wallet_atomic(uuid, uuid, text[], text, text);
CREATE OR REPLACE FUNCTION public.purchase_bulk_with_wallet_atomic(
  _user_id uuid, _package_id uuid, _phone_numbers text[], _network text,
  _source_channel text DEFAULT 'agent_dashboard'::text
)
RETURNS TABLE(orders_created integer, new_balance numeric, txn_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pkg RECORD; v_wallet RECORD; v_unit_price numeric; v_total_price numeric;
  v_count integer; v_debit RECORD; v_snapshot jsonb; v_safety text;
  v_alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_attempt int; v_chars text; v_i int; v_exists boolean;
  v_public_order_id text; v_order_id uuid; v_phone text;
  v_actor uuid := auth.uid();
  v_is_agent boolean := false;
BEGIN
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT setting_value INTO v_safety FROM public.system_settings WHERE setting_key = 'order_submission_enabled' LIMIT 1;
  IF v_safety = 'false' THEN RAISE EXCEPTION 'Order submission is temporarily disabled. Please try again later.'; END IF;
  v_count := array_length(_phone_numbers, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'At least one recipient phone number is required';
  END IF;
  IF _network IS NULL OR length(trim(_network)) = 0 THEN RAISE EXCEPTION 'Network is required'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.agent_profiles WHERE user_id = _user_id AND status = 'active') INTO v_is_agent;
  SELECT id, network, package_name, package_code, package_size_label,
         selling_price, agent_base_price, currency, is_active, validity_label, buying_enabled, supplier_price
    INTO v_pkg FROM public.data_packages WHERE id = _package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT v_pkg.is_active THEN RAISE EXCEPTION 'This package is no longer available'; END IF;
  IF NOT COALESCE(v_pkg.buying_enabled, true) THEN RAISE EXCEPTION 'Ordering for this bundle is temporarily disabled'; END IF;
  IF lower(v_pkg.network) <> lower(_network) THEN RAISE EXCEPTION 'Network mismatch for this package'; END IF;
  IF v_is_agent AND v_pkg.agent_base_price IS NOT NULL AND v_pkg.agent_base_price > 0 THEN
    v_unit_price := round(v_pkg.agent_base_price::numeric, 2);
  ELSE
    v_unit_price := round(v_pkg.selling_price::numeric, 2);
  END IF;
  v_total_price := v_unit_price * v_count;
  SELECT id, current_balance, status INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'Your wallet is not active'; END IF;
  IF v_wallet.current_balance < v_total_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You have GHS %, needed GHS %', v_wallet.current_balance, v_total_price;
  END IF;
  v_snapshot := jsonb_build_object(
    'id', v_pkg.id, 'package_code', v_pkg.package_code, 'package_name', v_pkg.package_name,
    'volume', v_pkg.package_size_label, 'amount', v_unit_price, 'network', v_pkg.network,
    'description', v_pkg.validity_label, 'supplier_price', v_pkg.supplier_price
  );
  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, v_total_price,
    'Bulk Bundle Purchase (' || v_count::text || 'x) - ' || v_pkg.package_name,
    'WPB-' || gen_random_uuid()::text, v_wallet.id, 'wallet', _user_id
  );
  FOREACH v_phone IN ARRAY _phone_numbers
  LOOP
    v_attempt := 0;
    LOOP
      v_attempt := v_attempt + 1; v_chars := '';
      FOR v_i IN 1..5 LOOP
        v_chars := v_chars || substr(v_alphabet, 1 + (floor(random() * 32))::int, 1);
      END LOOP;
      v_public_order_id := 'KS-' || v_chars;
      SELECT EXISTS(SELECT 1 FROM public.orders o WHERE o.public_order_id = v_public_order_id) INTO v_exists;
      EXIT WHEN NOT v_exists;
      IF v_attempt >= 8 THEN
        v_public_order_id := 'KS-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 7)); EXIT;
      END IF;
    END LOOP;
    INSERT INTO public.orders (
      public_order_id, actor_type, actor_id, origin_type, source_channel,
      beneficiary_number, network, bundle_name, bundle_code, bundle_snapshot,
      amount_charged, currency, status, metadata
    ) VALUES (
      v_public_order_id, CASE WHEN v_is_agent THEN 'agent'::text ELSE 'user'::text END, _user_id, 'agent_bulk_buy', _source_channel,
      v_phone, v_pkg.network, v_pkg.package_name, v_pkg.package_code, v_snapshot,
      v_unit_price, COALESCE(v_pkg.currency, 'GHS'), 'paid',
      jsonb_build_object('payment_method', 'wallet', 'wallet_paid', true,
        'wallet_txn_id', v_debit.txn_id, 'is_bulk', true)
    ) RETURNING id INTO v_order_id;
    INSERT INTO public.order_status_history (order_id, old_status, new_status, source, note, metadata)
    VALUES (v_order_id, NULL, 'paid', 'wallet_purchase', 'Order paid from wallet (bulk)',
      jsonb_build_object('wallet_txn_id', v_debit.txn_id, 'method', 'wallet', 'bulk_item', true));
    INSERT INTO public.audit_logs(action, actor_id, actor_role, target_type, target_id, metadata)
    VALUES ('bulk_order_created_from_wallet', _user_id, CASE WHEN v_is_agent THEN 'agent'::text ELSE 'user'::text END, 'order', v_order_id::text,
      jsonb_build_object('public_order_id', v_public_order_id, 'amount', v_unit_price,
        'wallet_txn_id', v_debit.txn_id, 'package_id', v_pkg.id,
        'network', v_pkg.network, 'phone', v_phone));
  END LOOP;
  RETURN QUERY SELECT v_count, v_debit.new_balance, v_debit.txn_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.purchase_bulk_with_wallet_atomic(uuid, uuid, text[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_bulk_with_wallet_atomic(uuid, uuid, text[], text, text) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.get_profit_metrics(start_date timestamptz, end_date timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- We only look at 'delivered' orders.
  WITH filtered_orders AS (
    SELECT 
      id,
      amount_charged,
      COALESCE(
        (bundle_snapshot->>'supplier_price')::numeric,
        (SELECT supplier_price FROM public.data_packages dp WHERE dp.package_code = orders.bundle_code AND dp.network = orders.network LIMIT 1),
        0
      ) AS supplier_cost,
      network,
      bundle_code,
      bundle_name,
      actor_type,
      DATE(created_at AT TIME ZONE 'UTC') AS day
    FROM orders
    WHERE status = 'delivered'
      AND created_at >= start_date
      AND created_at <= end_date
  ),
  summary AS (
    SELECT 
      COALESCE(SUM(amount_charged), 0) AS total_revenue,
      COALESCE(SUM(supplier_cost), 0) AS total_cost,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS total_profit,
      COUNT(*) AS total_orders
    FROM filtered_orders
  ),
  daily_trends AS (
    SELECT 
      day,
      COALESCE(SUM(amount_charged), 0) AS revenue,
      COALESCE(SUM(supplier_cost), 0) AS cost,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit
    FROM filtered_orders
    GROUP BY day
    ORDER BY day ASC
  ),
  network_breakdown AS (
    SELECT 
      network,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit,
      COUNT(*) AS orders
    FROM filtered_orders
    GROUP BY network
    ORDER BY profit DESC
  ),
  bundle_breakdown AS (
    SELECT 
      bundle_code,
      MAX(bundle_name) AS bundle_name,
      MAX(network) AS network,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit,
      COUNT(*) AS orders
    FROM filtered_orders
    GROUP BY bundle_code
    ORDER BY profit DESC
    LIMIT 10
  ),
  actor_breakdown AS (
    SELECT 
      actor_type,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit,
      COUNT(*) AS orders
    FROM filtered_orders
    GROUP BY actor_type
    ORDER BY profit DESC
  )
  SELECT jsonb_build_object(
    'summary', (SELECT row_to_json(s) FROM summary s),
    'daily_trends', COALESCE((SELECT json_agg(row_to_json(d)) FROM daily_trends d), '[]'::json),
    'network_breakdown', COALESCE((SELECT json_agg(row_to_json(n)) FROM network_breakdown n), '[]'::json),
    'bundle_breakdown', COALESCE((SELECT json_agg(row_to_json(b)) FROM bundle_breakdown b), '[]'::json),
    'actor_breakdown', COALESCE((SELECT json_agg(row_to_json(a)) FROM actor_breakdown a), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
