
-- ============================================================
-- SECURITY HARDENING — Phase A + B (no signature breakage)
-- ============================================================

-- ---------- 1. Lock raw ledger functions (service_role only) ----------
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, text, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_wallet_atomic(uuid, numeric, text, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_agent_earnings_wallet_atomic(uuid, numeric, text, text, uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_agent_earnings_wallet_atomic(uuid, numeric, text, text, uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_agent_commission_atomic(uuid, uuid, uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_atomic(uuid, numeric, text, text, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_wallet_atomic(uuid, numeric, text, text, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_agent_earnings_wallet_atomic(uuid, numeric, text, text, uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_agent_earnings_wallet_atomic(uuid, numeric, text, text, uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_agent_commission_atomic(uuid, uuid, uuid, numeric, numeric) TO service_role;

-- ---------- 2. Deposit idempotency on wallet_transactions.reference ----------
-- De-dupe defensively: keep the earliest row per reference.
DELETE FROM public.wallet_transactions wt
USING public.wallet_transactions wt2
WHERE wt.reference IS NOT NULL
  AND wt.reference = wt2.reference
  AND wt.id > wt2.id;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_reference_unique
  ON public.wallet_transactions(reference)
  WHERE reference IS NOT NULL;

-- credit_wallet_atomic: catch unique_violation → return existing row (idempotent)
CREATE OR REPLACE FUNCTION public.credit_wallet_atomic(
  _wallet_id uuid, _amount numeric, _narration text, _reference text,
  _linked_record_id uuid DEFAULT NULL::uuid,
  _linked_record_type text DEFAULT NULL::text,
  _created_by uuid DEFAULT NULL::uuid
)
RETURNS TABLE(new_balance numeric, opening_bal numeric, closing_bal numeric, txn_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet RECORD;
  v_closing numeric;
  v_txn_id uuid;
  v_existing RECORD;
BEGIN
  -- Idempotency: if a row with this reference already exists, return it without re-crediting.
  IF _reference IS NOT NULL THEN
    SELECT wt.id, wt.closing_balance, wt.opening_balance, wt.amount, w.current_balance
      INTO v_existing
      FROM public.wallet_transactions wt
      JOIN public.wallets w ON w.id = wt.wallet_id
     WHERE wt.reference = _reference
     LIMIT 1;
    IF FOUND THEN
      RETURN QUERY SELECT v_existing.current_balance, v_existing.opening_balance, v_existing.closing_balance, v_existing.id;
      RETURN;
    END IF;
  END IF;

  SELECT id, current_balance INTO v_wallet
    FROM public.wallets WHERE id = _wallet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found: %', _wallet_id; END IF;

  v_closing := v_wallet.current_balance + _amount;

  UPDATE public.wallets
     SET current_balance = v_closing, updated_at = now()
   WHERE id = _wallet_id;

  BEGIN
    INSERT INTO public.wallet_transactions (
      wallet_id, transaction_type, direction, amount,
      opening_balance, closing_balance, status,
      narration, reference, linked_record_id, linked_record_type, created_by
    ) VALUES (
      _wallet_id, 'credit', 'inflow', _amount,
      v_wallet.current_balance, v_closing, 'completed',
      _narration, _reference, _linked_record_id, _linked_record_type, _created_by
    ) RETURNING id INTO v_txn_id;
  EXCEPTION WHEN unique_violation THEN
    -- Concurrent caller already inserted this reference; roll back the balance bump.
    UPDATE public.wallets SET current_balance = v_wallet.current_balance, updated_at = now()
     WHERE id = _wallet_id;
    SELECT wt.id, w.current_balance INTO v_existing
      FROM public.wallet_transactions wt
      JOIN public.wallets w ON w.id = wt.wallet_id
     WHERE wt.reference = _reference LIMIT 1;
    RETURN QUERY SELECT v_existing.current_balance, v_wallet.current_balance, v_existing.current_balance, v_existing.id;
    RETURN;
  END;

  RETURN QUERY SELECT v_closing, v_wallet.current_balance, v_closing, v_txn_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.credit_wallet_atomic(uuid, numeric, text, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_atomic(uuid, numeric, text, text, uuid, text, uuid) TO service_role;

-- ---------- 3. Admin functions — enforce auth.uid() (signatures unchanged) ----------

-- admin_set_user_role
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user_id uuid, _role app_role, _admin_id uuid, _grant boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role) ON CONFLICT DO NOTHING;
  ELSE
    IF _role = 'admin'::app_role THEN
      IF (SELECT count(*) FROM public.user_roles WHERE role='admin'::app_role) <= 1
         AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_target_user_id AND role='admin'::app_role) THEN
        RAISE EXCEPTION 'Cannot remove the last admin';
      END IF;
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  END IF;
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES (
    CASE WHEN _grant THEN 'admin_role_granted' ELSE 'admin_role_revoked' END,
    'admin', v_actor, 'user', _target_user_id::text,
    jsonb_build_object('role', _role)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, app_role, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, app_role, uuid, boolean) TO authenticated;

-- admin_credit_user_wallet
CREATE OR REPLACE FUNCTION public.admin_credit_user_wallet(_target_user_id uuid, _amount numeric, _reason text, _admin_id uuid)
RETURNS TABLE(txn_id uuid, new_balance numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_wallet RECORD; v_credit RECORD; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = _target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  SELECT * INTO v_credit FROM public.credit_wallet_atomic(
    v_wallet.id, _amount, COALESCE('Admin credit: ' || _reason, 'Admin credit'),
    'ADMIN-CR-' || extract(epoch from now())::bigint::text,
    NULL, 'admin_adjustment', v_actor
  );
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('admin_wallet_credit','admin',v_actor,'user',_target_user_id::text,
          jsonb_build_object('amount',_amount,'reason',_reason,'txn_id',v_credit.txn_id));
  RETURN QUERY SELECT v_credit.txn_id, v_credit.new_balance;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_credit_user_wallet(uuid, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_credit_user_wallet(uuid, numeric, text, uuid) TO authenticated;

-- admin_debit_user_wallet
CREATE OR REPLACE FUNCTION public.admin_debit_user_wallet(_target_user_id uuid, _amount numeric, _reason text, _admin_id uuid)
RETURNS TABLE(txn_id uuid, new_balance numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_wallet RECORD; v_debit RECORD; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = _target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, _amount, COALESCE('Admin debit: ' || _reason, 'Admin debit'),
    'ADMIN-DR-' || extract(epoch from now())::bigint::text,
    NULL, 'admin_adjustment', v_actor
  );
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('admin_wallet_debit','admin',v_actor,'user',_target_user_id::text,
          jsonb_build_object('amount',_amount,'reason',_reason,'txn_id',v_debit.txn_id));
  RETURN QUERY SELECT v_debit.txn_id, v_debit.new_balance;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_debit_user_wallet(uuid, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_debit_user_wallet(uuid, numeric, text, uuid) TO authenticated;

-- admin_set_account_status
CREATE OR REPLACE FUNCTION public.admin_set_account_status(_target_user_id uuid, _status account_status, _reason text, _admin_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  UPDATE public.profiles SET account_status = _status, updated_at = now() WHERE user_id = _target_user_id;
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('admin_account_status_changed','admin',v_actor,'user',_target_user_id::text,
          jsonb_build_object('status',_status,'reason',_reason));
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, account_status, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, account_status, text, uuid) TO authenticated;

-- approve_agent_withdrawal_atomic (v1)
CREATE OR REPLACE FUNCTION public.approve_agent_withdrawal_atomic(_request_id uuid, _admin_id uuid, _note text DEFAULT NULL::text)
RETURNS TABLE(request_id uuid, status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_req RECORD; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT has_role(v_actor, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status; END IF;
  UPDATE public.withdrawal_requests
  SET status = 'paid', admin_note = COALESCE(_note, admin_note),
      reviewed_by = v_actor, reviewed_at = now(), updated_at = now()
  WHERE id = _request_id;
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_approved','admin',v_actor,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note));
  RETURN QUERY SELECT _request_id, 'paid'::text;
END;
$function$;
REVOKE ALL ON FUNCTION public.approve_agent_withdrawal_atomic(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_agent_withdrawal_atomic(uuid, uuid, text) TO authenticated;

-- reject_agent_withdrawal_atomic (v1)
CREATE OR REPLACE FUNCTION public.reject_agent_withdrawal_atomic(_request_id uuid, _admin_id uuid, _note text DEFAULT NULL::text)
RETURNS TABLE(request_id uuid, status text, refunded_amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_req RECORD; v_wallet RECORD; v_credit RECORD; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT has_role(v_actor, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status; END IF;
  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_req.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  SELECT * INTO v_credit FROM public.credit_wallet_atomic(
    v_wallet.id, v_req.amount, 'Withdrawal rejected — refund',
    'WD-REFUND-' || _request_id::text, _request_id, 'withdrawal_request', v_actor
  );
  UPDATE public.withdrawal_requests
  SET status = 'rejected', admin_note = COALESCE(_note, admin_note),
      reviewed_by = v_actor, reviewed_at = now(),
      refund_transaction_id = v_credit.txn_id, updated_at = now()
  WHERE id = _request_id;
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_rejected','admin',v_actor,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note, 'refund_txn', v_credit.txn_id));
  RETURN QUERY SELECT _request_id, 'rejected'::text, v_req.amount;
END;
$function$;
REVOKE ALL ON FUNCTION public.reject_agent_withdrawal_atomic(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_agent_withdrawal_atomic(uuid, uuid, text) TO authenticated;

-- approve_agent_withdrawal_v2_atomic
CREATE OR REPLACE FUNCTION public.approve_agent_withdrawal_v2_atomic(_request_id uuid, _admin_id uuid, _note text DEFAULT NULL::text)
RETURNS TABLE(request_id uuid, status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_req RECORD; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT has_role(v_actor, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status; END IF;
  UPDATE public.withdrawal_requests
  SET status = 'paid', admin_note = COALESCE(_note, admin_note),
      reviewed_by = v_actor, reviewed_at = now(), updated_at = now()
  WHERE id = _request_id;
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_approved_v2','admin',v_actor,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note, 'wallet_kind', v_req.wallet_kind));
  RETURN QUERY SELECT _request_id, 'paid'::text;
END;
$function$;
REVOKE ALL ON FUNCTION public.approve_agent_withdrawal_v2_atomic(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_agent_withdrawal_v2_atomic(uuid, uuid, text) TO authenticated;

-- reject_agent_withdrawal_v2_atomic — create with hardening (v2 reject may not exist; CREATE OR REPLACE handles both)
CREATE OR REPLACE FUNCTION public.reject_agent_withdrawal_v2_atomic(_request_id uuid, _admin_id uuid, _note text DEFAULT NULL::text)
RETURNS TABLE(request_id uuid, status text, refunded_amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_req RECORD; v_actor uuid := auth.uid();
  v_wallet_id uuid; v_credit RECORD; v_txn_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT has_role(v_actor, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin role required'; END IF;
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status; END IF;

  IF v_req.wallet_kind = 'agent_earnings' THEN
    SELECT id INTO v_wallet_id FROM public.agent_earnings_wallets WHERE user_id = v_req.user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'Agent earnings wallet not found'; END IF;
    SELECT * INTO v_credit FROM public.credit_agent_earnings_wallet_atomic(
      v_wallet_id, v_req.amount, 'Withdrawal rejected — refund',
      'AWD-REFUND-' || _request_id::text,
      _request_id, 'withdrawal_request', 'refund', v_actor
    );
    v_txn_id := v_credit.txn_id;
  ELSE
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_req.user_id FOR UPDATE;
    IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
    SELECT * INTO v_credit FROM public.credit_wallet_atomic(
      v_wallet_id, v_req.amount, 'Withdrawal rejected — refund',
      'WD-REFUND-' || _request_id::text, _request_id, 'withdrawal_request', v_actor
    );
    v_txn_id := v_credit.txn_id;
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'rejected', admin_note = COALESCE(_note, admin_note),
      reviewed_by = v_actor, reviewed_at = now(),
      refund_transaction_id = v_txn_id, updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_rejected_v2','admin',v_actor,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note, 'refund_txn', v_txn_id, 'wallet_kind', v_req.wallet_kind));

  RETURN QUERY SELECT _request_id, 'rejected'::text, v_req.amount;
END;
$function$;
REVOKE ALL ON FUNCTION public.reject_agent_withdrawal_v2_atomic(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_agent_withdrawal_v2_atomic(uuid, uuid, text) TO authenticated;

-- admin_activate_agent_subscription
CREATE OR REPLACE FUNCTION public.admin_activate_agent_subscription(_admin_id uuid, _target_user_id uuid, _plan agent_subscription_plan, _note text DEFAULT NULL::text)
RETURNS TABLE(subscription_id uuid, agent_profile_id uuid, starts_at timestamp with time zone, expires_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD; v_starts timestamptz := now(); v_period_days integer;
  v_expires timestamptz; v_sub_id uuid; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  SELECT id, status INTO v_profile FROM public.agent_profiles WHERE user_id = _target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agent profile not found — applicant must be approved first'; END IF;
  v_period_days := CASE _plan WHEN 'monthly' THEN 30 WHEN 'yearly' THEN 365 END;
  v_expires := v_starts + (v_period_days || ' days')::interval;
  INSERT INTO public.agent_subscriptions(
    agent_profile_id, user_id, plan, status, amount_paid, currency,
    starts_at, expires_at, payment_record_id, intent_id
  ) VALUES (
    v_profile.id, _target_user_id, _plan, 'active', 0, 'GHS',
    v_starts, v_expires, NULL, NULL
  ) RETURNING id INTO v_sub_id;
  UPDATE public.agent_profiles
     SET status = 'active', suspended_at = NULL, suspension_reason = NULL, updated_at = now()
   WHERE id = v_profile.id;
  INSERT INTO public.user_roles(user_id, role) VALUES (_target_user_id, 'agent'::app_role) ON CONFLICT DO NOTHING;
  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_admin_manual_activation','admin',v_actor,'agent_profile',v_profile.id::text,
    jsonb_build_object('target_user_id', _target_user_id, 'plan', _plan,
      'starts_at', v_starts, 'expires_at', v_expires, 'note', _note,
      'subscription_id', v_sub_id, 'source', 'admin_manual_activation'));
  RETURN QUERY SELECT v_sub_id, v_profile.id, v_starts, v_expires;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_activate_agent_subscription(uuid, uuid, agent_subscription_plan, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activate_agent_subscription(uuid, uuid, agent_subscription_plan, text) TO authenticated;

-- ---------- 4. Bind purchase/withdrawal functions to caller ----------

-- purchase_with_wallet_atomic: add caller binding (preserve full body)
CREATE OR REPLACE FUNCTION public.purchase_with_wallet_atomic(_user_id uuid, _package_id uuid, _phone_number text, _network text, _customer_name text DEFAULT NULL::text, _customer_email text DEFAULT NULL::text, _source_channel text DEFAULT 'user_dashboard'::text)
RETURNS TABLE(order_id uuid, public_order_id text, amount_charged numeric, new_balance numeric, txn_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pkg RECORD; v_wallet RECORD; v_price numeric; v_order_id uuid;
  v_public_order_id text; v_debit RECORD; v_snapshot jsonb; v_safety text;
  v_alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_attempt int := 0; v_chars text; v_i int; v_exists boolean;
  v_actor uuid := auth.uid();
BEGIN
  -- Caller binding: only the user themselves, the service role (auth.uid() IS NULL), or an admin may purchase.
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT setting_value INTO v_safety FROM public.system_settings
   WHERE setting_key = 'order_submission_enabled' LIMIT 1;
  IF v_safety = 'false' THEN RAISE EXCEPTION 'Order submission is temporarily disabled. Please try again later.'; END IF;

  IF _phone_number IS NULL OR length(trim(_phone_number)) < 10 THEN
    RAISE EXCEPTION 'A valid recipient phone number is required';
  END IF;
  IF _network IS NULL OR length(trim(_network)) = 0 THEN RAISE EXCEPTION 'Network is required'; END IF;

  SELECT id, network, package_name, package_code, package_size_label,
         selling_price, currency, is_active, validity_label
    INTO v_pkg FROM public.data_packages WHERE id = _package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT v_pkg.is_active THEN RAISE EXCEPTION 'This package is no longer available'; END IF;
  IF lower(v_pkg.network) <> lower(_network) THEN RAISE EXCEPTION 'Network mismatch for this package'; END IF;

  v_price := round(v_pkg.selling_price::numeric, 2);
  IF v_price <= 0 THEN RAISE EXCEPTION 'Invalid package price'; END IF;

  SELECT id, current_balance, status INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'Your wallet is not active'; END IF;
  IF v_wallet.current_balance < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You have GH₵ %, needed GH₵ %', v_wallet.current_balance, v_price;
  END IF;

  v_snapshot := jsonb_build_object(
    'id', v_pkg.id, 'package_code', v_pkg.package_code, 'package_name', v_pkg.package_name,
    'volume', v_pkg.package_size_label, 'amount', v_price, 'network', v_pkg.network,
    'description', v_pkg.validity_label
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
    v_public_order_id, 'user', _user_id, 'user_buy_wallet', _source_channel,
    _phone_number, v_pkg.network, v_pkg.package_name, v_pkg.package_code, v_snapshot,
    v_price, COALESCE(v_pkg.currency, 'GHS'), 'paid',
    jsonb_build_object('payment_method', 'wallet', 'customer_name', _customer_name,
      'customer_email', _customer_email, 'wallet_paid', true)
  ) RETURNING id INTO v_order_id;

  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, v_price, 'Bundle purchase — ' || v_pkg.package_name,
    'WPB-' || v_order_id::text, v_order_id, 'order', _user_id
  );

  INSERT INTO public.order_status_history (order_id, old_status, new_status, source, note, metadata)
  VALUES (v_order_id, NULL, 'paid', 'wallet_purchase',
    'Order paid from wallet (GHS ' || v_price::text || ')',
    jsonb_build_object('wallet_txn_id', v_debit.txn_id, 'method', 'wallet'));

  INSERT INTO public.audit_logs(action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('order_created_from_wallet', _user_id, 'user', 'order', v_order_id::text,
    jsonb_build_object('public_order_id', v_public_order_id, 'amount', v_price,
      'wallet_txn_id', v_debit.txn_id, 'package_id', v_pkg.id,
      'network', v_pkg.network, 'phone', _phone_number));

  RETURN QUERY SELECT v_order_id, v_public_order_id, v_price, v_debit.new_balance, v_debit.txn_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.purchase_with_wallet_atomic(uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_with_wallet_atomic(uuid, uuid, text, text, text, text, text) TO authenticated, service_role;

-- purchase_bulk_with_wallet_atomic: add caller binding
CREATE OR REPLACE FUNCTION public.purchase_bulk_with_wallet_atomic(_user_id uuid, _package_id uuid, _phone_numbers text[], _network text, _source_channel text DEFAULT 'agent_bulk_dashboard'::text)
RETURNS TABLE(created_count integer, new_balance numeric, txn_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pkg RECORD; v_wallet RECORD; v_unit_price numeric; v_total_price numeric;
  v_debit RECORD; v_snapshot jsonb; v_safety text; v_count int; v_phone text;
  v_order_id uuid; v_public_order_id text;
  v_alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_attempt int; v_chars text; v_i int; v_exists boolean;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT setting_value INTO v_safety FROM public.system_settings
   WHERE setting_key = 'order_submission_enabled' LIMIT 1;
  IF v_safety = 'false' THEN RAISE EXCEPTION 'Order submission is temporarily disabled. Please try again later.'; END IF;

  v_count := array_length(_phone_numbers, 1);
  IF v_count IS NULL OR v_count = 0 THEN RAISE EXCEPTION 'At least one phone number is required for bulk purchase'; END IF;
  IF _network IS NULL OR length(trim(_network)) = 0 THEN RAISE EXCEPTION 'Network is required'; END IF;

  SELECT id, network, package_name, package_code, package_size_label,
         selling_price, agent_base_price, currency, is_active, validity_label
    INTO v_pkg FROM public.data_packages WHERE id = _package_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF NOT v_pkg.is_active THEN RAISE EXCEPTION 'This package is no longer available'; END IF;
  IF lower(v_pkg.network) <> lower(_network) THEN RAISE EXCEPTION 'Network mismatch for this package'; END IF;

  v_unit_price := round(COALESCE(NULLIF(v_pkg.agent_base_price, 0), v_pkg.selling_price)::numeric, 2);
  IF v_unit_price <= 0 THEN RAISE EXCEPTION 'Invalid package price'; END IF;
  v_total_price := v_unit_price * v_count;

  SELECT id, current_balance, status INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.status <> 'active' THEN RAISE EXCEPTION 'Your wallet is not active'; END IF;
  IF v_wallet.current_balance < v_total_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You have GH₵ %, needed GH₵ % for % recipients', v_wallet.current_balance, v_total_price, v_count;
  END IF;

  v_snapshot := jsonb_build_object(
    'id', v_pkg.id, 'package_code', v_pkg.package_code, 'package_name', v_pkg.package_name,
    'volume', v_pkg.package_size_label, 'amount', v_unit_price, 'network', v_pkg.network,
    'description', v_pkg.validity_label, 'is_bulk', true
  );

  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, v_total_price,
    'Bulk Bundle Purchase (' || v_count::text || 'x) — ' || v_pkg.package_name,
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
      v_public_order_id, 'user', _user_id, 'agent_bulk_buy', _source_channel,
      v_phone, v_pkg.network, v_pkg.package_name, v_pkg.package_code, v_snapshot,
      v_unit_price, COALESCE(v_pkg.currency, 'GHS'), 'paid',
      jsonb_build_object('payment_method', 'wallet', 'wallet_paid', true,
        'wallet_txn_id', v_debit.txn_id, 'is_bulk', true)
    ) RETURNING id INTO v_order_id;

    INSERT INTO public.order_status_history (order_id, old_status, new_status, source, note, metadata)
    VALUES (v_order_id, NULL, 'paid', 'wallet_purchase', 'Order paid from wallet (bulk)',
      jsonb_build_object('wallet_txn_id', v_debit.txn_id, 'method', 'wallet', 'bulk_item', true));

    INSERT INTO public.audit_logs(action, actor_id, actor_role, target_type, target_id, metadata)
    VALUES ('bulk_order_created_from_wallet', _user_id, 'user', 'order', v_order_id::text,
      jsonb_build_object('public_order_id', v_public_order_id, 'amount', v_unit_price,
        'wallet_txn_id', v_debit.txn_id, 'package_id', v_pkg.id,
        'network', v_pkg.network, 'phone', v_phone));
  END LOOP;

  RETURN QUERY SELECT v_count, v_debit.new_balance, v_debit.txn_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.purchase_bulk_with_wallet_atomic(uuid, uuid, text[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_bulk_with_wallet_atomic(uuid, uuid, text[], text, text) TO authenticated, service_role;

-- request_agent_withdrawal_atomic (v1) — caller binding
CREATE OR REPLACE FUNCTION public.request_agent_withdrawal_atomic(_user_id uuid, _amount numeric, _momo_number text, _momo_network text, _momo_name text)
RETURNS TABLE(request_id uuid, txn_id uuid, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_min_amount numeric; v_setting text; v_profile RECORD;
  v_wallet RECORD; v_debit RECORD; v_request_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  SELECT setting_value INTO v_setting FROM public.system_settings
   WHERE setting_key = 'agent_withdrawal_min_amount' LIMIT 1;
  v_min_amount := COALESCE(NULLIF(v_setting,'')::numeric, 10);
  IF _amount < v_min_amount THEN RAISE EXCEPTION 'Minimum withdrawal is GH₵ %', v_min_amount; END IF;
  SELECT id, status INTO v_profile FROM public.agent_profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No agent profile found'; END IF;
  IF v_profile.status = 'suspended' THEN RAISE EXCEPTION 'Agent profile is suspended'; END IF;
  SELECT id, current_balance INTO v_wallet FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.current_balance < _amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO public.withdrawal_requests (
    user_id, agent_profile_id, amount, momo_number, momo_network, momo_name, status
  ) VALUES (_user_id, v_profile.id, _amount, _momo_number, _momo_network, _momo_name, 'pending')
  RETURNING id INTO v_request_id;
  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, _amount, 'Agent withdrawal request',
    'WD-' || v_request_id::text, v_request_id, 'withdrawal_request', _user_id
  );
  UPDATE public.withdrawal_requests SET wallet_transaction_id = v_debit.txn_id, updated_at = now() WHERE id = v_request_id;
  RETURN QUERY SELECT v_request_id, v_debit.txn_id, v_debit.new_balance;
END;
$function$;
REVOKE ALL ON FUNCTION public.request_agent_withdrawal_atomic(uuid, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_agent_withdrawal_atomic(uuid, numeric, text, text, text) TO authenticated, service_role;

-- request_agent_withdrawal_v2_atomic — caller binding
CREATE OR REPLACE FUNCTION public.request_agent_withdrawal_v2_atomic(_user_id uuid, _amount numeric, _momo_number text, _momo_network text, _momo_name text)
RETURNS TABLE(request_id uuid, txn_id uuid, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_min numeric; v_setting text; v_profile RECORD; v_ewallet RECORD;
  v_debit RECORD; v_request_id uuid; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NOT NULL AND v_actor <> _user_id AND NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  SELECT setting_value INTO v_setting FROM public.system_settings
   WHERE setting_key = 'agent_withdrawal_min_amount' LIMIT 1;
  v_min := COALESCE(NULLIF(v_setting,'')::numeric, 10);
  IF _amount < v_min THEN RAISE EXCEPTION 'Minimum withdrawal is GH₵ %', v_min; END IF;
  SELECT id, status INTO v_profile FROM public.agent_profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No agent profile found'; END IF;
  IF v_profile.status = 'suspended' THEN RAISE EXCEPTION 'Agent profile is suspended'; END IF;
  SELECT id, current_balance INTO v_ewallet FROM public.agent_earnings_wallets WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agent earnings wallet not found'; END IF;
  IF v_ewallet.current_balance < _amount THEN RAISE EXCEPTION 'Insufficient earnings balance'; END IF;
  INSERT INTO public.withdrawal_requests (
    user_id, agent_profile_id, amount, momo_number, momo_network, momo_name, status, wallet_kind
  ) VALUES (_user_id, v_profile.id, _amount, _momo_number, _momo_network, _momo_name, 'pending', 'agent_earnings')
  RETURNING id INTO v_request_id;
  SELECT * INTO v_debit FROM public.debit_agent_earnings_wallet_atomic(
    v_ewallet.id, _amount, 'Agent withdrawal request',
    'AWD-' || v_request_id::text, v_request_id, 'withdrawal_request', 'withdrawal', _user_id
  );
  UPDATE public.withdrawal_requests SET wallet_transaction_id = v_debit.txn_id, updated_at = now() WHERE id = v_request_id;
  RETURN QUERY SELECT v_request_id, v_debit.txn_id, v_debit.new_balance;
END;
$function$;
REVOKE ALL ON FUNCTION public.request_agent_withdrawal_v2_atomic(uuid, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_agent_withdrawal_v2_atomic(uuid, numeric, text, text, text) TO authenticated, service_role;

-- ---------- 5. Drop unsafe public-read policies ----------

-- Suppliers: admin/staff only (edge funcs use service_role)
DROP POLICY IF EXISTS "Anyone can read active suppliers" ON public.suppliers;
CREATE POLICY "Staff read suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- system_settings: restrict public reads to an allowlist
DROP POLICY IF EXISTS "Anyone can read settings" ON public.system_settings;
CREATE POLICY "Public settings readable by anon" ON public.system_settings FOR SELECT TO anon
  USING (setting_key IN (
    'guest_buy_enabled','guest_checkout_enabled','paystack_checkout_enabled',
    'system_maintenance_mode','order_submission_enabled','user_buy_enabled',
    'deposits_enabled','agent_store_enabled','delivery_speed',
    'supplier_status_text','support_status_text'
  ));
CREATE POLICY "Settings readable by authenticated" ON public.system_settings FOR SELECT TO authenticated
  USING (setting_key IN (
    'guest_buy_enabled','guest_checkout_enabled','paystack_checkout_enabled',
    'system_maintenance_mode','order_submission_enabled','user_buy_enabled',
    'deposits_enabled','agent_store_enabled','delivery_speed',
    'supplier_status_text','support_status_text',
    'agent_withdrawal_min_amount','agent_commission_rate_percent'
  ) OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));

-- agent_profiles: drop the broad public read, expose a slug-only RPC instead
DROP POLICY IF EXISTS "Public can read active store profiles" ON public.agent_profiles;

CREATE OR REPLACE FUNCTION public.get_public_agent_store(_slug text)
RETURNS TABLE(
  id uuid, store_slug text, store_name text, store_logo_url text,
  store_tagline text, city text, status agent_profile_status, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, store_slug, store_name, store_logo_url, store_tagline, city, status, created_at
  FROM public.agent_profiles
  WHERE lower(store_slug) = lower(_slug) AND status = 'active'
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_public_agent_store(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent_store(text) TO anon, authenticated;

-- ---------- 6. resolve_login_identifier: backend only ----------
REVOKE EXECUTE ON FUNCTION public.resolve_login_identifier(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO service_role;

-- ---------- 7. Analytics RPCs: admin/staff only ----------
CREATE OR REPLACE FUNCTION public.get_admin_profit_stats()
RETURNS TABLE(total_profit numeric, direct_profit numeric, agent_profit numeric, total_commission numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_total_profit numeric := 0; v_direct_profit numeric := 0;
  v_agent_profit numeric := 0; v_total_commission numeric := 0;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR (NOT has_role(v_actor,'admin'::app_role) AND NOT has_role(v_actor,'staff'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COALESCE(SUM(amount_charged - COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0)), 0)
   INTO v_total_profit FROM orders WHERE status = 'delivered';
  SELECT COALESCE(SUM(amount_charged - COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0)), 0)
   INTO v_direct_profit FROM orders WHERE status = 'delivered' AND COALESCE(actor_type, 'user') != 'agent';
  SELECT COALESCE(SUM(amount_charged - COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0)), 0)
   INTO v_agent_profit FROM orders WHERE status = 'delivered' AND actor_type = 'agent';
  SELECT COALESCE(SUM(commission_amount), 0) INTO v_total_commission FROM agent_earnings WHERE status != 'failed';
  RETURN QUERY SELECT v_total_profit, v_direct_profit, v_agent_profit, v_total_commission;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_admin_profit_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_profit_stats() TO authenticated;

-- Wrap existing get_top_agents / get_sales_source_breakdown / get_sales_trends with role checks via REVOKE/GRANT
-- (Their bodies are already SECURITY DEFINER; we add an authorization guard by re-creating them with the same signatures.)

DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname='get_top_agents' AND pronamespace='public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_top_agents(text) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_top_agents(text) TO authenticated';
  END IF;
  PERFORM 1 FROM pg_proc WHERE proname='get_sales_source_breakdown' AND pronamespace='public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_sales_source_breakdown(text) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_sales_source_breakdown(text) TO authenticated';
  END IF;
  PERFORM 1 FROM pg_proc WHERE proname='get_sales_trends' AND pronamespace='public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_sales_trends(integer) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_sales_trends(integer) TO authenticated';
  END IF;
END $$;

-- Add an inline authorization guard to each analytics RPC by re-creating with same signature
CREATE OR REPLACE FUNCTION public.get_top_agents(timeframe text DEFAULT 'all')
RETURNS TABLE(agent_id uuid, user_id uuid, store_name text, total_orders bigint, total_revenue numeric, total_commission numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE start_date timestamptz; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR (NOT has_role(v_actor,'admin'::app_role) AND NOT has_role(v_actor,'staff'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF timeframe = 'today' THEN start_date := date_trunc('day', now());
  ELSIF timeframe = 'week' THEN start_date := date_trunc('week', now());
  ELSIF timeframe = 'month' THEN start_date := date_trunc('month', now());
  ELSE start_date := '1970-01-01'::timestamptz;
  END IF;
  RETURN QUERY
  SELECT ap.id, ap.user_id, ap.store_name,
         COUNT(o.id) AS total_orders,
         COALESCE(SUM(o.amount_charged), 0) AS total_revenue,
         COALESCE(SUM(ae.commission_amount), 0) AS total_commission
  FROM public.agent_profiles ap
  LEFT JOIN public.orders o ON o.actor_id = ap.user_id AND o.actor_type = 'agent' AND o.status = 'delivered' AND o.created_at >= start_date
  LEFT JOIN public.agent_earnings ae ON ae.agent_profile_id = ap.id AND ae.status = 'paid' AND ae.created_at >= start_date
  GROUP BY ap.id, ap.user_id, ap.store_name
  ORDER BY total_revenue DESC
  LIMIT 20;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_top_agents(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_top_agents(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sales_source_breakdown(timeframe text DEFAULT 'all'::text)
RETURNS TABLE(actor_type text, total_orders bigint, total_revenue numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE start_date timestamptz; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR (NOT has_role(v_actor,'admin'::app_role) AND NOT has_role(v_actor,'staff'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF timeframe = 'today' THEN start_date := date_trunc('day', now());
  ELSIF timeframe = 'week' THEN start_date := date_trunc('week', now());
  ELSIF timeframe = 'month' THEN start_date := date_trunc('month', now());
  ELSE start_date := '1970-01-01'::timestamptz;
  END IF;
  RETURN QUERY
  SELECT o.actor_type, COUNT(o.id) AS total_orders, COALESCE(SUM(o.amount_charged), 0) AS total_revenue
  FROM public.orders o
  WHERE o.status = 'delivered' AND o.created_at >= start_date
  GROUP BY o.actor_type
  ORDER BY total_revenue DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_sales_source_breakdown(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_source_breakdown(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_sales_trends(days_limit integer DEFAULT 30)
RETURNS TABLE(sale_date date, total_orders bigint, total_revenue numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR (NOT has_role(v_actor,'admin'::app_role) AND NOT has_role(v_actor,'staff'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT date_trunc('day', o.created_at)::date AS sale_date,
         COUNT(o.id) AS total_orders,
         COALESCE(SUM(o.amount_charged), 0) AS total_revenue
  FROM public.orders o
  WHERE o.status = 'delivered'
    AND o.created_at >= (now() - (days_limit || ' days')::interval)
  GROUP BY date_trunc('day', o.created_at)::date
  ORDER BY sale_date ASC;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_sales_trends(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_trends(integer) TO authenticated;

-- ---------- 8. Seed settings (idempotent) ----------
INSERT INTO public.system_settings (setting_key, setting_value, setting_group, description) VALUES
  ('order_submission_enabled','true','flow','Master switch for fulfilling orders'),
  ('guest_buy_enabled','true','flow','Allow guests to purchase'),
  ('user_buy_enabled','true','flow','Allow logged-in users to purchase'),
  ('deposits_enabled','true','flow','Allow wallet top-ups'),
  ('paystack_checkout_enabled','true','flow','Allow Paystack checkout'),
  ('guest_checkout_enabled','true','flow','Allow guest checkout'),
  ('agent_store_enabled','true','flow','Allow agent storefront purchases'),
  ('system_maintenance_mode','false','flow','Global maintenance mode'),
  ('agent_commission_rate_percent','8','agent','Default agent commission %'),
  ('agent_withdrawal_min_amount','10','agent','Minimum agent withdrawal in GHS'),
  ('delivery_speed','Delivery speed: within hours.','status','Public-facing delivery speed text'),
  ('supplier_status_text','Operational','status','Public supplier status'),
  ('support_status_text','Available','status','Public support status')
ON CONFLICT (setting_key) DO NOTHING;
