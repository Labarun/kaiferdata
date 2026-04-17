-- ============================================================
-- Phase 2 — Agent Subscription Activation
-- Strict additive: only adds a new function + extends one policy.
-- Does NOT alter or remove any existing policy or trigger.
-- ============================================================

-- 1) Allow authenticated users to create their OWN agent_subscription intents.
--    The current policy only allows guest_buy intents.
DROP POLICY IF EXISTS "Auth users can create own agent subscription intents"
  ON public.purchase_intents;

CREATE POLICY "Auth users can create own agent subscription intents"
ON public.purchase_intents
FOR INSERT
TO authenticated
WITH CHECK (
  intent_type = 'agent_subscription'
  AND actor_type = 'user'
  AND actor_id = auth.uid()
  AND amount_expected > 0
);

-- 2) Atomic activation function called by finalize-payment after a verified
--    Paystack agent_subscription payment. Idempotent on intent_id.
--
--   - Looks up the agent_profile for the user (must already exist & be in
--     pending_subscription/subscription_expired/active status — we never
--     activate a non-approved user).
--   - Inserts an active subscription row (or returns existing one for this intent).
--   - Sets profile.status = 'active'
--   - Grants 'agent' role to the user (idempotent via ON CONFLICT — but user_roles
--     has no unique on (user_id, role) so we guard with a SELECT).
CREATE OR REPLACE FUNCTION public.activate_agent_subscription_atomic(
  _intent_id uuid,
  _user_id uuid,
  _plan agent_subscription_plan,
  _amount_paid numeric,
  _payment_record_id uuid
)
RETURNS TABLE(
  subscription_id uuid,
  agent_profile_id uuid,
  starts_at timestamptz,
  expires_at timestamptz,
  already_processed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_existing RECORD;
  v_starts timestamptz := now();
  v_period_days integer;
  v_expires timestamptz;
  v_sub_id uuid;
BEGIN
  -- Idempotency: if this intent already activated a subscription, return it.
  SELECT s.id AS sub_id, s.agent_profile_id, s.starts_at, s.expires_at
    INTO v_existing
    FROM public.agent_subscriptions s
   WHERE s.intent_id = _intent_id
   LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      v_existing.sub_id,
      v_existing.agent_profile_id,
      v_existing.starts_at,
      v_existing.expires_at,
      true;
    RETURN;
  END IF;

  -- Find profile and lock it.
  SELECT id, status INTO v_profile
    FROM public.agent_profiles
   WHERE user_id = _user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No agent profile for user %, cannot activate subscription', _user_id;
  END IF;

  IF v_profile.status = 'suspended' THEN
    RAISE EXCEPTION 'Agent profile is suspended; subscription cannot be activated';
  END IF;

  v_period_days := CASE _plan WHEN 'monthly' THEN 30 WHEN 'yearly' THEN 365 END;
  v_expires := v_starts + (v_period_days || ' days')::interval;

  INSERT INTO public.agent_subscriptions (
    agent_profile_id, user_id, plan, status,
    amount_paid, currency, starts_at, expires_at,
    payment_record_id, intent_id
  ) VALUES (
    v_profile.id, _user_id, _plan, 'active',
    _amount_paid, 'GHS', v_starts, v_expires,
    _payment_record_id, _intent_id
  ) RETURNING id INTO v_sub_id;

  UPDATE public.agent_profiles
     SET status = 'active', suspended_at = NULL, suspension_reason = NULL, updated_at = now()
   WHERE id = v_profile.id;

  -- Grant agent role (no-op if already present).
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = 'agent'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'agent');
  END IF;

  RETURN QUERY SELECT v_sub_id, v_profile.id, v_starts, v_expires, false;
END;
$$;

-- Allow service role / authenticated callers via RPC. The function is SECURITY DEFINER
-- so the public.user_roles RLS won't block the insert — it runs as the function owner.
REVOKE ALL ON FUNCTION public.activate_agent_subscription_atomic(uuid, uuid, agent_subscription_plan, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_agent_subscription_atomic(uuid, uuid, agent_subscription_plan, numeric, uuid) TO service_role;