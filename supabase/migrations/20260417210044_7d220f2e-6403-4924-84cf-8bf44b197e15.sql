-- ============================================================
-- Phase 1: Live-Safe Polish & Admin Operations Upgrade
-- Additive only — no changes to existing functions/tables.
-- ============================================================

-- 1. Withdrawal requests table -------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_profile_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  momo_number text NOT NULL,
  momo_network text NOT NULL,
  momo_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid')),
  admin_note text,
  wallet_transaction_id uuid,
  refund_transaction_id uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_agent ON public.withdrawal_requests(agent_profile_id);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own withdrawals"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage withdrawals"
  ON public.withdrawal_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff read withdrawals"
  ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Admin internal notes about users ------------------------
CREATE TABLE IF NOT EXISTS public.admin_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_notes_user ON public.admin_user_notes(user_id);

ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user notes"
  ON public.admin_user_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Atomic debit_wallet (mirror of credit_wallet_atomic) ----
CREATE OR REPLACE FUNCTION public.debit_wallet_atomic(
  _wallet_id uuid,
  _amount numeric,
  _narration text,
  _reference text,
  _linked_record_id uuid DEFAULT NULL,
  _linked_record_type text DEFAULT NULL,
  _created_by uuid DEFAULT NULL
)
RETURNS TABLE(new_balance numeric, opening_bal numeric, closing_bal numeric, txn_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_closing numeric;
  v_txn_id uuid;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive';
  END IF;

  SELECT id, current_balance INTO v_wallet
  FROM public.wallets WHERE id = _wallet_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found: %', _wallet_id;
  END IF;

  IF v_wallet.current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_wallet.current_balance, _amount;
  END IF;

  v_closing := v_wallet.current_balance - _amount;

  UPDATE public.wallets
  SET current_balance = v_closing, updated_at = now()
  WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, transaction_type, direction, amount,
    opening_balance, closing_balance, status,
    narration, reference, linked_record_id, linked_record_type, created_by
  ) VALUES (
    _wallet_id, 'debit', 'outflow', _amount,
    v_wallet.current_balance, v_closing, 'completed',
    _narration, _reference, _linked_record_id, _linked_record_type, _created_by
  ) RETURNING id INTO v_txn_id;

  RETURN QUERY SELECT v_closing, v_wallet.current_balance, v_closing, v_txn_id;
END;
$$;

-- 4. Agent withdrawal request (atomic) -----------------------
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
BEGIN
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

-- 5. Approve withdrawal (mark paid; funds already debited) ---
CREATE OR REPLACE FUNCTION public.approve_agent_withdrawal_atomic(
  _request_id uuid,
  _admin_id uuid,
  _note text DEFAULT NULL
)
RETURNS TABLE(request_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req RECORD;
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests
  WHERE id = _request_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status;
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'paid', admin_note = COALESCE(_note, admin_note),
      reviewed_by = _admin_id, reviewed_at = now(), updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_approved','admin',_admin_id,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note));

  RETURN QUERY SELECT _request_id, 'paid'::text;
END;
$$;

-- 6. Reject withdrawal (refund) ------------------------------
CREATE OR REPLACE FUNCTION public.reject_agent_withdrawal_atomic(
  _request_id uuid,
  _admin_id uuid,
  _note text DEFAULT NULL
)
RETURNS TABLE(request_id uuid, status text, refunded_amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_wallet RECORD;
  v_credit RECORD;
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests
  WHERE id = _request_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Withdrawal is not pending (status=%)', v_req.status;
  END IF;

  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_req.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  SELECT * INTO v_credit FROM public.credit_wallet_atomic(
    v_wallet.id, v_req.amount,
    'Withdrawal rejected — refund',
    'WD-REFUND-' || _request_id::text,
    _request_id, 'withdrawal_request', _admin_id
  );

  UPDATE public.withdrawal_requests
  SET status = 'rejected', admin_note = COALESCE(_note, admin_note),
      reviewed_by = _admin_id, reviewed_at = now(),
      refund_transaction_id = v_credit.txn_id, updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('agent_withdrawal_rejected','admin',_admin_id,'withdrawal_request',_request_id::text,
          jsonb_build_object('amount', v_req.amount, 'note', _note, 'refund_txn', v_credit.txn_id));

  RETURN QUERY SELECT _request_id, 'rejected'::text, v_req.amount;
END;
$$;

-- 7. Admin set user role -------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  _target_user_id uuid,
  _role app_role,
  _admin_id uuid,
  _grant boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Safety: don't allow removing the LAST admin
    IF _role = 'admin'::app_role THEN
      IF (SELECT count(*) FROM public.user_roles WHERE role='admin'::app_role) <= 1
         AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_target_user_id AND role='admin'::app_role) THEN
        RAISE EXCEPTION 'Cannot remove the last admin';
      END IF;
    END IF;
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = _role;
  END IF;

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES (
    CASE WHEN _grant THEN 'admin_role_granted' ELSE 'admin_role_revoked' END,
    'admin', _admin_id, 'user', _target_user_id::text,
    jsonb_build_object('role', _role)
  );
END;
$$;

-- 8. Admin credit/debit user wallet --------------------------
CREATE OR REPLACE FUNCTION public.admin_credit_user_wallet(
  _target_user_id uuid,
  _amount numeric,
  _reason text,
  _admin_id uuid
)
RETURNS TABLE(txn_id uuid, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_credit RECORD;
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = _target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  SELECT * INTO v_credit FROM public.credit_wallet_atomic(
    v_wallet.id, _amount,
    COALESCE('Admin credit: ' || _reason, 'Admin credit'),
    'ADMIN-CR-' || extract(epoch from now())::bigint::text,
    NULL, 'admin_adjustment', _admin_id
  );

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('admin_wallet_credit','admin',_admin_id,'user',_target_user_id::text,
          jsonb_build_object('amount',_amount,'reason',_reason,'txn_id',v_credit.txn_id));

  RETURN QUERY SELECT v_credit.txn_id, v_credit.new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_debit_user_wallet(
  _target_user_id uuid,
  _amount numeric,
  _reason text,
  _admin_id uuid
)
RETURNS TABLE(txn_id uuid, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_debit RECORD;
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = _target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, _amount,
    COALESCE('Admin debit: ' || _reason, 'Admin debit'),
    'ADMIN-DR-' || extract(epoch from now())::bigint::text,
    NULL, 'admin_adjustment', _admin_id
  );

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('admin_wallet_debit','admin',_admin_id,'user',_target_user_id::text,
          jsonb_build_object('amount',_amount,'reason',_reason,'txn_id',v_debit.txn_id));

  RETURN QUERY SELECT v_debit.txn_id, v_debit.new_balance;
END;
$$;

-- 9. Admin set account status --------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  _target_user_id uuid,
  _status account_status,
  _reason text,
  _admin_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  UPDATE public.profiles
  SET account_status = _status, updated_at = now()
  WHERE user_id = _target_user_id;

  INSERT INTO public.audit_logs(action, actor_role, actor_id, target_type, target_id, metadata)
  VALUES ('admin_account_status_changed','admin',_admin_id,'user',_target_user_id::text,
          jsonb_build_object('status',_status,'reason',_reason));
END;
$$;

-- 10. Default minimum withdrawal setting (idempotent) --------
INSERT INTO public.system_settings (setting_key, setting_value, setting_group, description)
VALUES ('agent_withdrawal_min_amount','10','agent','Minimum agent withdrawal amount in GH₵')
ON CONFLICT (setting_key) DO NOTHING;
