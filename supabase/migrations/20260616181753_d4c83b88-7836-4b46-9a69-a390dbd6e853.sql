
-- ========== SPECIAL BUNDLE FEATURE (isolated) ==========

-- 1. Tables
CREATE TABLE public.special_bundle_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  size_label text NOT NULL,
  bundle_type text NOT NULL DEFAULT 'data' CHECK (bundle_type IN ('data','data_airtime')),
  network text NOT NULL DEFAULT 'MTN',
  supplier_price numeric(18,2) NOT NULL DEFAULT 0,
  user_price numeric(18,2) NOT NULL DEFAULT 0,
  agent_price numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  delivery_note text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.special_bundle_packages TO authenticated;
GRANT ALL ON public.special_bundle_packages TO service_role;
ALTER TABLE public.special_bundle_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spb_pkg_select" ON public.special_bundle_packages
  FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "spb_pkg_admin_all" ON public.special_bundle_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_spb_pkg_updated
  BEFORE UPDATE ON public.special_bundle_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.special_bundle_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_order_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  buyer_role text NOT NULL DEFAULT 'user' CHECK (buyer_role IN ('user','agent')),
  package_id uuid REFERENCES public.special_bundle_packages(id),
  package_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  recipient_number text NOT NULL,
  network text NOT NULL DEFAULT 'MTN',
  price_tier text NOT NULL CHECK (price_tier IN ('user','agent')),
  amount_charged numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','cancelled','refunded')),
  supplier_reference text,
  admin_note text,
  wallet_debit_txn_id uuid,
  wallet_refund_txn_id uuid,
  refund_requested boolean NOT NULL DEFAULT false,
  refund_request_reason text,
  refund_requested_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.special_bundle_orders TO authenticated;
GRANT ALL ON public.special_bundle_orders TO service_role;
ALTER TABLE public.special_bundle_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spb_orders_select" ON public.special_bundle_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX idx_spb_orders_user ON public.special_bundle_orders(user_id);
CREATE INDEX idx_spb_orders_status ON public.special_bundle_orders(status);
CREATE INDEX idx_spb_orders_status_refund ON public.special_bundle_orders(status, refund_requested);
CREATE INDEX idx_spb_orders_created ON public.special_bundle_orders(created_at);

CREATE TRIGGER trg_spb_orders_updated
  BEFORE UPDATE ON public.special_bundle_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.special_bundle_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.special_bundle_orders(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.special_bundle_status_history TO authenticated;
GRANT ALL ON public.special_bundle_status_history TO service_role;
ALTER TABLE public.special_bundle_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spb_history_select" ON public.special_bundle_status_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.special_bundle_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE INDEX idx_spb_history_order ON public.special_bundle_status_history(order_id);

-- 2. system_settings seed
INSERT INTO public.system_settings (setting_key, setting_value, setting_group)
VALUES
  ('special_bundle_offer_enabled','true','special_bundle'),
  ('special_bundle_delivery_eta','few_minutes','special_bundle')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. RPCs

-- get settings
CREATE OR REPLACE FUNCTION public.get_special_bundle_settings()
RETURNS TABLE(offer_enabled boolean, delivery_eta text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_en text; v_eta text;
BEGIN
  SELECT setting_value INTO v_en FROM public.system_settings WHERE setting_key='special_bundle_offer_enabled' LIMIT 1;
  SELECT setting_value INTO v_eta FROM public.system_settings WHERE setting_key='special_bundle_delivery_eta' LIMIT 1;
  RETURN QUERY SELECT COALESCE(lower(v_en)='true', true), COALESCE(NULLIF(v_eta,''),'few_minutes');
END; $$;
REVOKE ALL ON FUNCTION public.get_special_bundle_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_special_bundle_settings() TO authenticated, service_role;

-- admin set setting
CREATE OR REPLACE FUNCTION public.admin_set_special_bundle_setting(_key text, _value text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _key NOT IN ('special_bundle_offer_enabled','special_bundle_delivery_eta') THEN
    RAISE EXCEPTION 'Invalid setting key';
  END IF;
  IF _key = 'special_bundle_offer_enabled' AND lower(_value) NOT IN ('true','false') THEN
    RAISE EXCEPTION 'special_bundle_offer_enabled must be true or false';
  END IF;
  IF _key = 'special_bundle_delivery_eta' AND _value NOT IN ('instant','few_minutes','max_2h','max_4h','over_4h') THEN
    RAISE EXCEPTION 'Invalid delivery_eta value';
  END IF;
  INSERT INTO public.system_settings (setting_key, setting_value, setting_group, updated_by, updated_at)
  VALUES (_key, _value, 'special_bundle', auth.uid(), now())
  ON CONFLICT (setting_key) DO UPDATE
    SET setting_value = EXCLUDED.setting_value,
        updated_by = auth.uid(),
        updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_special_bundle_setting(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_special_bundle_setting(text,text) TO authenticated, service_role;

-- purchase
CREATE OR REPLACE FUNCTION public.purchase_special_bundle_atomic(_package_id uuid, _recipient_number text)
RETURNS TABLE(order_id uuid, public_order_id text, amount_charged numeric, new_balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    v_public := 'KSB-' || upper(substring(encode(gen_random_bytes(5),'hex') from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.special_bundle_orders WHERE public_order_id = v_public) INTO v_exists;
    EXIT WHEN NOT v_exists;
    IF v_attempt >= 8 THEN
      v_public := 'KSB-' || upper(substring(encode(gen_random_bytes(6),'hex') from 1 for 10));
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.special_bundle_orders (
    public_order_id, user_id, buyer_role, package_id, package_snapshot,
    recipient_number, network, price_tier, amount_charged, currency, status
  ) VALUES (
    v_public, v_uid, v_tier, v_pkg.id, v_snapshot,
    _recipient_number, 'MTN', v_tier, v_price, 'GHS', 'pending'
  ) RETURNING id INTO v_order_id;

  SELECT * INTO v_debit FROM public.debit_wallet_atomic(
    v_wallet.id, v_price,
    'Special bundle — ' || v_pkg.size_label,
    'SPB-' || v_order_id::text,
    v_order_id, 'special_bundle_order', v_uid
  );

  UPDATE public.special_bundle_orders SET wallet_debit_txn_id = v_debit.txn_id WHERE id = v_order_id;

  INSERT INTO public.special_bundle_status_history (order_id, old_status, new_status, note, changed_by)
  VALUES (v_order_id, NULL, 'pending', 'Order placed (paid from wallet)', v_uid);

  INSERT INTO public.audit_logs (action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('special_bundle_purchased', v_uid, v_tier, 'special_bundle_order', v_order_id::text,
    jsonb_build_object('amount', v_price, 'tier', v_tier, 'public_order_id', v_public));

  RETURN QUERY SELECT v_order_id, v_public, v_price, v_debit.new_balance;
END; $$;
REVOKE ALL ON FUNCTION public.purchase_special_bundle_atomic(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_special_bundle_atomic(uuid,text) TO authenticated, service_role;

-- user refund request
CREATE OR REPLACE FUNCTION public.request_special_bundle_refund(_order_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_order RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_order FROM public.special_bundle_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id <> v_uid THEN RAISE EXCEPTION 'Not your order.'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'Only pending orders can be cancelled.'; END IF;
  UPDATE public.special_bundle_orders
     SET refund_requested = true,
         refund_request_reason = _reason,
         refund_requested_at = now(),
         updated_at = now()
   WHERE id = _order_id;
  INSERT INTO public.audit_logs (action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('special_bundle_refund_requested', v_uid, 'user', 'special_bundle_order', _order_id::text,
    jsonb_build_object('reason', _reason));
END; $$;
REVOKE ALL ON FUNCTION public.request_special_bundle_refund(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_special_bundle_refund(uuid,text) TO authenticated, service_role;

-- admin set status
CREATE OR REPLACE FUNCTION public.admin_set_special_bundle_status(_order_id uuid, _new_status text, _note text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order RECORD; v_old text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _new_status NOT IN ('processing','delivered') THEN
    RAISE EXCEPTION 'Invalid target status';
  END IF;
  SELECT * INTO v_order FROM public.special_bundle_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  v_old := v_order.status;
  IF _new_status = 'processing' AND v_old <> 'pending' THEN
    RAISE EXCEPTION 'Can only move to processing from pending (current %)', v_old;
  END IF;
  IF _new_status = 'delivered' AND v_old NOT IN ('pending','processing') THEN
    RAISE EXCEPTION 'Can only mark delivered from pending or processing (current %)', v_old;
  END IF;
  UPDATE public.special_bundle_orders
     SET status = _new_status,
         delivered_at = CASE WHEN _new_status = 'delivered' THEN now() ELSE delivered_at END,
         admin_note = COALESCE(_note, admin_note),
         updated_at = now()
   WHERE id = _order_id;
  INSERT INTO public.special_bundle_status_history (order_id, old_status, new_status, note, changed_by)
  VALUES (_order_id, v_old, _new_status, _note, auth.uid());
  INSERT INTO public.audit_logs (action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('special_bundle_status_changed', auth.uid(), 'admin', 'special_bundle_order', _order_id::text,
    jsonb_build_object('old_status', v_old, 'new_status', _new_status, 'note', _note));
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_special_bundle_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_special_bundle_status(uuid,text,text) TO authenticated, service_role;

-- admin cancel + refund
CREATE OR REPLACE FUNCTION public.admin_cancel_refund_special_bundle(_order_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order RECORD; v_wallet_id uuid; v_credit RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  SELECT * INTO v_order FROM public.special_bundle_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending orders can be cancelled & refunded.';
  END IF;
  IF v_order.wallet_refund_txn_id IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_order.user_id FOR UPDATE;
  IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'Buyer wallet not found'; END IF;

  SELECT * INTO v_credit FROM public.credit_wallet_atomic(
    v_wallet_id, v_order.amount_charged,
    'Refund: special bundle ' || v_order.public_order_id,
    'SPB-REFUND-' || v_order.id::text,
    v_order.id, 'special_bundle_refund', auth.uid()
  );

  UPDATE public.special_bundle_orders
     SET status = 'refunded',
         wallet_refund_txn_id = v_credit.txn_id,
         admin_note = COALESCE(_reason, admin_note),
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.special_bundle_status_history (order_id, old_status, new_status, note, changed_by)
  VALUES (_order_id, 'pending', 'refunded', 'Cancelled & refunded: ' || COALESCE(_reason,''), auth.uid());

  INSERT INTO public.audit_logs (action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('special_bundle_cancelled_refunded', auth.uid(), 'admin', 'special_bundle_order', _order_id::text,
    jsonb_build_object('amount', v_order.amount_charged, 'reason', _reason, 'refund_txn_id', v_credit.txn_id));
END; $$;
REVOKE ALL ON FUNCTION public.admin_cancel_refund_special_bundle(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cancel_refund_special_bundle(uuid,text) TO authenticated, service_role;

-- 5. Seed packages
INSERT INTO public.special_bundle_packages (name, size_label, bundle_type, network, supplier_price, user_price, agent_price, sort_order, is_active)
VALUES
  ('MTN Special 1.7GB', '1.7GB', 'data', 'MTN', 4, 6, 5, 1, true),
  ('MTN Special 5.1GB', '5.1GB', 'data', 'MTN', 8, 15, 13, 2, true),
  ('MTN Special 7.2GB', '7.2GB', 'data', 'MTN', 9, 18.5, 16, 3, true),
  ('MTN 2.6GB + 1,077 mins', '2.6GB + 1,077 mins', 'data_airtime', 'MTN', 10, 22, 18, 4, true);
