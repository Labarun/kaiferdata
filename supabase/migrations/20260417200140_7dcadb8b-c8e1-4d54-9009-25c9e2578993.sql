
DO $$ BEGIN
  CREATE TYPE public.agent_application_status AS ENUM (
    'draft', 'submitted', 'under_review', 'needs_changes', 'approved', 'declined'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_profile_status AS ENUM (
    'pending_subscription', 'active', 'subscription_expired', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_subscription_plan AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agent_subscription_status AS ENUM (
    'pending', 'active', 'expired', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status public.agent_application_status NOT NULL DEFAULT 'draft',
  full_name text,
  phone text,
  email text,
  city text,
  business_name text,
  has_sold_data_before boolean,
  selling_channels text,
  expected_customer_base text,
  motivation text,
  social_link text,
  store_name text,
  store_slug text UNIQUE,
  store_logo_url text,
  store_tagline text,
  agreed_to_terms boolean NOT NULL DEFAULT false,
  acknowledged_subscription boolean NOT NULL DEFAULT false,
  admin_note text,
  internal_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON public.agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_user ON public.agent_applications(user_id);

ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own application" ON public.agent_applications;
CREATE POLICY "Users manage own application"
  ON public.agent_applications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage applications" ON public.agent_applications;
CREATE POLICY "Admins manage applications"
  ON public.agent_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read applications" ON public.agent_applications;
CREATE POLICY "Staff read applications"
  ON public.agent_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  application_id uuid REFERENCES public.agent_applications(id) ON DELETE SET NULL,
  status public.agent_profile_status NOT NULL DEFAULT 'pending_subscription',
  store_name text NOT NULL,
  store_slug text NOT NULL UNIQUE,
  store_logo_url text,
  store_tagline text,
  business_name text,
  city text,
  total_orders integer NOT NULL DEFAULT 0,
  total_sales numeric(14,2) NOT NULL DEFAULT 0,
  total_profit numeric(14,2) NOT NULL DEFAULT 0,
  approved_at timestamptz NOT NULL DEFAULT now(),
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_status ON public.agent_profiles(status);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_slug ON public.agent_profiles(store_slug);

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active store profiles" ON public.agent_profiles;
CREATE POLICY "Public can read active store profiles"
  ON public.agent_profiles FOR SELECT TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Owner reads own profile" ON public.agent_profiles;
CREATE POLICY "Owner reads own profile"
  ON public.agent_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner updates store details" ON public.agent_profiles;
CREATE POLICY "Owner updates store details"
  ON public.agent_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage agent profiles" ON public.agent_profiles;
CREATE POLICY "Admins manage agent profiles"
  ON public.agent_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read agent profiles" ON public.agent_profiles;
CREATE POLICY "Staff read agent profiles"
  ON public.agent_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

CREATE TABLE IF NOT EXISTS public.agent_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan public.agent_subscription_plan NOT NULL,
  status public.agent_subscription_status NOT NULL DEFAULT 'pending',
  amount_paid numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  starts_at timestamptz,
  expires_at timestamptz,
  payment_record_id uuid REFERENCES public.payment_records(id) ON DELETE SET NULL,
  intent_id uuid REFERENCES public.purchase_intents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_user ON public.agent_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_profile ON public.agent_subscriptions(agent_profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_status ON public.agent_subscriptions(status);

ALTER TABLE public.agent_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own subscriptions" ON public.agent_subscriptions;
CREATE POLICY "Owner reads own subscriptions"
  ON public.agent_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.agent_subscriptions;
CREATE POLICY "Admins manage subscriptions"
  ON public.agent_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read subscriptions" ON public.agent_subscriptions;
CREATE POLICY "Staff read subscriptions"
  ON public.agent_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

DROP TRIGGER IF EXISTS trg_agent_applications_updated_at ON public.agent_applications;
CREATE TRIGGER trg_agent_applications_updated_at
  BEFORE UPDATE ON public.agent_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_agent_profiles_updated_at ON public.agent_profiles;
CREATE TRIGGER trg_agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_agent_subscriptions_updated_at ON public.agent_subscriptions;
CREATE TRIGGER trg_agent_subscriptions_updated_at
  BEFORE UPDATE ON public.agent_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_store_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.store_slug IS NOT NULL THEN
    NEW.store_slug := lower(NEW.store_slug);
    IF NEW.store_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$' THEN
      RAISE EXCEPTION 'Invalid store slug. Use 3-32 lowercase letters, numbers, or dashes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_applications_slug ON public.agent_applications;
CREATE TRIGGER trg_agent_applications_slug
  BEFORE INSERT OR UPDATE ON public.agent_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_store_slug();

DROP TRIGGER IF EXISTS trg_agent_profiles_slug ON public.agent_profiles;
CREATE TRIGGER trg_agent_profiles_slug
  BEFORE INSERT OR UPDATE ON public.agent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_store_slug();

INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-stores', 'agent-stores', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view store assets" ON storage.objects;
CREATE POLICY "Anyone can view store assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-stores');

DROP POLICY IF EXISTS "Authenticated can upload to own folder" ON storage.objects;
CREATE POLICY "Authenticated can upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'agent-stores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner can update own store assets" ON storage.objects;
CREATE POLICY "Owner can update own store assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'agent-stores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner can delete own store assets" ON storage.objects;
CREATE POLICY "Owner can delete own store assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'agent-stores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
