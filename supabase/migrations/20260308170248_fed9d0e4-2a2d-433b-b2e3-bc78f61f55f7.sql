
-- ═══════════════════════════════════════════════════
-- Suppliers table
-- ═══════════════════════════════════════════════════
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  api_base_url TEXT,
  auth_config JSONB DEFAULT '{}'::jsonb,
  request_timeout_ms INTEGER NOT NULL DEFAULT 30000,
  supported_networks JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suppliers"
  ON public.suppliers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active suppliers"
  ON public.suppliers FOR SELECT
  USING (is_active = true);

-- ═══════════════════════════════════════════════════
-- Order status history
-- ═══════════════════════════════════════════════════
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read order status history"
  ON public.order_status_history FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage order status history"
  ON public.order_status_history FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);

-- ═══════════════════════════════════════════════════
-- Supplier request logs
-- ═══════════════════════════════════════════════════
CREATE TABLE public.supplier_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  request_payload JSONB DEFAULT '{}'::jsonb,
  response_payload JSONB DEFAULT '{}'::jsonb,
  normalized_result TEXT,
  is_success BOOLEAN DEFAULT false,
  supplier_reference TEXT,
  error_message TEXT,
  request_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier logs"
  ON public.supplier_request_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can read supplier logs"
  ON public.supplier_request_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'staff'));

CREATE INDEX idx_supplier_request_logs_order_id ON public.supplier_request_logs(order_id);

-- ═══════════════════════════════════════════════════
-- Triggers
-- ═══════════════════════════════════════════════════
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
