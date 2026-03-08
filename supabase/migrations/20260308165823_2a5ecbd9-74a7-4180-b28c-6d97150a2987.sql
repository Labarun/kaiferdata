
-- ═══════════════════════════════════════════════════
-- Order status enum
-- ═══════════════════════════════════════════════════
CREATE TYPE public.order_status AS ENUM (
  'paid', 'queued', 'processing', 'delivered', 'failed', 'cancelled', 'refunded'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending', 'verified', 'failed', 'reversed'
);

-- ═══════════════════════════════════════════════════
-- Payment records table
-- ═══════════════════════════════════════════════════
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_reference TEXT NOT NULL,
  internal_reference TEXT NOT NULL,
  intent_id UUID REFERENCES public.purchase_intents(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  customer_email TEXT,
  customer_identifier TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  provider_response JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_reference)
);

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own payment by reference (for callback page)
CREATE POLICY "Anyone can read payment records by reference"
  ON public.payment_records FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage payment records"
  ON public.payment_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════
-- Orders table
-- ═══════════════════════════════════════════════════
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  public_order_id TEXT NOT NULL UNIQUE,
  actor_type TEXT NOT NULL DEFAULT 'guest',
  actor_id UUID,
  origin_type TEXT NOT NULL DEFAULT 'guest_buy',
  source_channel TEXT NOT NULL DEFAULT 'public_guest_checkout',
  beneficiary_number TEXT NOT NULL,
  network TEXT NOT NULL,
  bundle_name TEXT NOT NULL,
  bundle_code TEXT NOT NULL,
  bundle_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount_charged NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  intent_id UUID REFERENCES public.purchase_intents(id),
  payment_record_id UUID REFERENCES public.payment_records(id),
  status public.order_status NOT NULL DEFAULT 'paid',
  supplier_status TEXT,
  supplier_reference TEXT,
  delivery_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can read orders (for guest tracking by public_order_id)
CREATE POLICY "Anyone can read orders"
  ON public.orders FOR SELECT
  USING (true);

-- Admins can manage orders
CREATE POLICY "Admins can manage orders"
  ON public.orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Staff can read orders
CREATE POLICY "Staff can read orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'staff'));

-- Add updated_at triggers
CREATE TRIGGER update_payment_records_updated_at
  BEFORE UPDATE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
