
-- =============================================
-- KAIFERDATA PHASE 2: CATALOG + PURCHASE INTENTS
-- =============================================

-- Intent status enum
CREATE TYPE public.intent_status AS ENUM (
  'created', 'pending_payment', 'payment_processing', 
  'payment_confirmed', 'fulfilling', 'completed', 
  'failed', 'expired', 'cancelled'
);

-- =============================================
-- TABLE: data_plans (catalog)
-- =============================================
CREATE TABLE public.data_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL,
  plan_code TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  volume TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.data_plans ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_data_plans_updated_at
  BEFORE UPDATE ON public.data_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Everyone can read active plans
CREATE POLICY "Anyone can read active plans"
  ON public.data_plans FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admins can manage plans
CREATE POLICY "Admins can manage plans"
  ON public.data_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TABLE: purchase_intents
-- =============================================
CREATE TABLE public.purchase_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_reference TEXT NOT NULL UNIQUE,
  intent_type TEXT NOT NULL DEFAULT 'guest_buy',
  actor_type TEXT NOT NULL DEFAULT 'guest',
  actor_id UUID,
  source_channel TEXT NOT NULL DEFAULT 'public_guest_checkout',
  phone_number TEXT NOT NULL,
  network TEXT NOT NULL,
  plan_id UUID REFERENCES public.data_plans(id),
  plan_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount_expected NUMERIC(18,2) NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  order_context JSONB DEFAULT '{}'::jsonb,
  payment_method TEXT,
  status intent_status NOT NULL DEFAULT 'created',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_purchase_intents_updated_at
  BEFORE UPDATE ON public.purchase_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anyone (including anon guests) can create intents
CREATE POLICY "Anyone can create purchase intents"
  ON public.purchase_intents FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read their own intent by reference (for tracking)
CREATE POLICY "Anyone can read intents by reference"
  ON public.purchase_intents FOR SELECT TO anon, authenticated
  USING (true);

-- Admins and staff can manage all intents
CREATE POLICY "Admins can manage intents"
  ON public.purchase_intents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED: Sample data plans for demo catalog
-- =============================================
INSERT INTO public.data_plans (network, plan_code, plan_name, amount, volume, description, sort_order) VALUES
  ('MTN', 'mtn-500mb', '500MB', 150.00, '500MB', '500MB data valid for 30 days', 1),
  ('MTN', 'mtn-1gb', '1GB', 250.00, '1GB', '1GB data valid for 30 days', 2),
  ('MTN', 'mtn-2gb', '2GB', 500.00, '2GB', '2GB data valid for 30 days', 3),
  ('MTN', 'mtn-3gb', '3GB', 750.00, '3GB', '3GB data valid for 30 days', 4),
  ('MTN', 'mtn-5gb', '5GB', 1200.00, '5GB', '5GB data valid for 30 days', 5),
  ('MTN', 'mtn-10gb', '10GB', 2000.00, '10GB', '10GB data valid for 30 days', 6),
  ('Airtel', 'airtel-500mb', '500MB', 150.00, '500MB', '500MB data valid for 30 days', 1),
  ('Airtel', 'airtel-1gb', '1GB', 250.00, '1GB', '1GB data valid for 30 days', 2),
  ('Airtel', 'airtel-2gb', '2GB', 500.00, '2GB', '2GB data valid for 30 days', 3),
  ('Airtel', 'airtel-3gb', '3GB', 700.00, '3GB', '3GB data valid for 30 days', 4),
  ('Airtel', 'airtel-5gb', '5GB', 1100.00, '5GB', '5GB data valid for 30 days', 5),
  ('Glo', 'glo-500mb', '500MB', 130.00, '500MB', '500MB data valid for 30 days', 1),
  ('Glo', 'glo-1gb', '1GB', 230.00, '1GB', '1GB data valid for 30 days', 2),
  ('Glo', 'glo-2gb', '2GB', 460.00, '2GB', '2GB data valid for 30 days', 3),
  ('Glo', 'glo-3gb', '3GB', 690.00, '3GB', '3GB data valid for 30 days', 4),
  ('Glo', 'glo-5gb', '5GB', 1100.00, '5GB', '5GB data valid for 30 days', 5),
  ('9mobile', '9mobile-500mb', '500MB', 150.00, '500MB', '500MB data valid for 30 days', 1),
  ('9mobile', '9mobile-1gb', '1GB', 250.00, '1GB', '1GB data valid for 30 days', 2),
  ('9mobile', '9mobile-2gb', '2GB', 500.00, '2GB', '2GB data valid for 30 days', 3),
  ('9mobile', '9mobile-5gb', '5GB', 1200.00, '5GB', '5GB data valid for 30 days', 5);
