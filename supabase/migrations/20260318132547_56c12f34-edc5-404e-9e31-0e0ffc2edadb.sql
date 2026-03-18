
-- Extend suppliers table with sync configuration
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS supports_product_sync boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS supports_order_submission boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS supports_status_sync boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS polling_interval_seconds integer NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS last_product_sync_at timestamptz,
ADD COLUMN IF NOT EXISTS endpoint_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Supplier sync logs table for product/status sync auditing
CREATE TABLE IF NOT EXISTS public.supplier_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  packages_created integer DEFAULT 0,
  packages_updated integer DEFAULT 0,
  packages_deactivated integer DEFAULT 0,
  orders_updated integer DEFAULT 0,
  error_message text,
  raw_response jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync logs" ON public.supplier_sync_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can read sync logs" ON public.supplier_sync_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

-- Enable realtime on orders for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
