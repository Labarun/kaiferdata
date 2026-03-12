
-- Data Packages table — the real package catalog engine
CREATE TABLE public.data_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL,
  package_code TEXT NOT NULL,
  package_name TEXT NOT NULL,
  package_size_label TEXT NOT NULL,
  package_volume_value TEXT,
  package_type TEXT NOT NULL DEFAULT 'data_bundle',
  validity_label TEXT,
  supplier_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  is_active BOOLEAN NOT NULL DEFAULT true,
  visible_on_public BOOLEAN NOT NULL DEFAULT true,
  visible_for_logged_in BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL DEFAULT 'manual',
  supplier_source_id TEXT,
  source_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on package_code per network
ALTER TABLE public.data_packages ADD CONSTRAINT data_packages_network_code_unique UNIQUE (network, package_code);

-- Enable RLS
ALTER TABLE public.data_packages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage packages"
  ON public.data_packages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can read active packages (for public/logged-in display)
CREATE POLICY "Anyone can read active packages"
  ON public.data_packages FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Updated_at trigger
CREATE TRIGGER update_data_packages_updated_at
  BEFORE UPDATE ON public.data_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
