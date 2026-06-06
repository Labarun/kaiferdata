-- Agent Customers CRM Table
CREATE TABLE IF NOT EXISTS public.agent_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_profile_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  name text,
  phone_number text NOT NULL,
  network text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_profile_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_agent_customers_profile ON public.agent_customers(agent_profile_id);

ALTER TABLE public.agent_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own customers"
  ON public.agent_customers FOR ALL TO authenticated
  USING (agent_profile_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()))
  WITH CHECK (agent_profile_id IN (SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all customers"
  ON public.agent_customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_agent_customers_updated_at ON public.agent_customers;
CREATE TRIGGER update_agent_customers_updated_at
  BEFORE UPDATE ON public.agent_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
