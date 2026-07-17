-- ============================================================
-- Express Data Packages
-- ============================================================
CREATE TABLE public.express_data_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_gb TEXT NOT NULL,
  validity_days TEXT NOT NULL,
  regular_price_ghs NUMERIC NOT NULL,
  agent_price_ghs NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.express_data_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.express_data_packages TO authenticated;
GRANT ALL ON public.express_data_packages TO service_role;

ALTER TABLE public.express_data_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active express packages"
ON public.express_data_packages FOR SELECT
USING (is_active = true OR public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Admins can manage express packages"
ON public.express_data_packages FOR ALL
USING (public.has_role((select auth.uid()), 'admin'))
WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE TRIGGER update_express_packages_updated_at
BEFORE UPDATE ON public.express_data_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Express Orders
-- ============================================================
CREATE TABLE public.express_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_role TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  data_size TEXT NOT NULL,
  price_paid_ghs NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending Express',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.express_orders TO authenticated;
GRANT ALL ON public.express_orders TO service_role;

ALTER TABLE public.express_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own express orders"
ON public.express_orders FOR SELECT
USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Admins can manage express orders"
ON public.express_orders FOR ALL
USING (public.has_role((select auth.uid()), 'admin'))
WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE TRIGGER update_express_orders_updated_at
BEFORE UPDATE ON public.express_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Secure order processing RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_express_order(
  p_user_id UUID,
  p_phone_number TEXT,
  p_package_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role public.app_role;
  v_package RECORD;
  v_price NUMERIC;
  v_wallet RECORD;
  v_order_id TEXT;
  v_new_order_uuid UUID;
BEGIN
  -- Auth gate: caller must be the target user (admins exempt)
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF v_caller <> p_user_id AND NOT public.has_role(v_caller, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  -- 1. Resolve role
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
  IF v_role IS NULL THEN
    v_role := 'user';
  END IF;

  -- 2. Package
  SELECT * INTO v_package FROM public.express_data_packages WHERE id = p_package_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Package not found or inactive');
  END IF;

  -- 3. Price
  IF v_role = 'agent' OR v_role = 'admin' THEN
    v_price := v_package.agent_price_ghs;
  ELSE
    v_price := v_package.regular_price_ghs;
  END IF;

  -- 4. Wallet
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  IF v_wallet.current_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- 5. Debit
  UPDATE public.wallets
     SET current_balance = current_balance - v_price
   WHERE id = v_wallet.id;

  -- 6. Ledger
  INSERT INTO public.wallet_transactions (
    wallet_id, amount, transaction_type, direction, narration, status
  ) VALUES (
    v_wallet.id, v_price, 'debit', 'outflow',
    'MTN Express Data Purchase: ' || v_package.size_gb || ' for ' || p_phone_number,
    'completed'
  );

  -- 7. Order ID
  v_order_id := 'EXP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

  -- 8. Create order
  INSERT INTO public.express_orders (
    order_id, user_id, user_role, phone_number, data_size, price_paid_ghs, status
  ) VALUES (
    v_order_id, p_user_id, v_role::TEXT, p_phone_number, v_package.size_gb, v_price, 'Pending Express'
  ) RETURNING id INTO v_new_order_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'uuid', v_new_order_uuid
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_express_order(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_express_order(UUID, TEXT, UUID) TO authenticated, service_role;
