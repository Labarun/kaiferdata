CREATE OR REPLACE FUNCTION public.ensure_user_scaffold(
  _user_id uuid,
  _email text DEFAULT NULL,
  _full_name text DEFAULT NULL,
  _username text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_created boolean := false;
  v_role_created boolean := false;
  v_wallet_created boolean := false;
  v_extended_created boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'You can only initialize your own account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id
  ) THEN
    INSERT INTO public.profiles (user_id, email, full_name, username, phone)
    VALUES (
      _user_id,
      COALESCE(_email, ''),
      COALESCE(_full_name, ''),
      NULLIF(BTRIM(_username), ''),
      NULLIF(BTRIM(_phone), '')
    );
    v_profile_created := true;
  ELSE
    UPDATE public.profiles
    SET
      email = CASE WHEN COALESCE(email, '') = '' AND COALESCE(_email, '') <> '' THEN _email ELSE email END,
      full_name = CASE WHEN COALESCE(full_name, '') = '' AND COALESCE(_full_name, '') <> '' THEN _full_name ELSE full_name END,
      username = CASE WHEN username IS NULL AND NULLIF(BTRIM(_username), '') IS NOT NULL THEN NULLIF(BTRIM(_username), '') ELSE username END,
      phone = CASE WHEN phone IS NULL AND NULLIF(BTRIM(_phone), '') IS NOT NULL THEN NULLIF(BTRIM(_phone), '') ELSE phone END,
      updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'user'::public.app_role
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'user'::public.app_role);
    v_role_created := true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wallets WHERE user_id = _user_id
  ) THEN
    INSERT INTO public.wallets (user_id)
    VALUES (_user_id);
    v_wallet_created := true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = _user_id
  ) THEN
    INSERT INTO public.user_profiles (user_id)
    VALUES (_user_id);
    v_extended_created := true;
  END IF;

  RETURN jsonb_build_object(
    'profile_created', v_profile_created,
    'role_created', v_role_created,
    'wallet_created', v_wallet_created,
    'user_profile_created', v_extended_created
  );
END;
$$;

CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create own wallet"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can create direct purchase intents"
ON public.purchase_intents
FOR INSERT
TO authenticated
WITH CHECK (
  actor_type = 'user'
  AND actor_id = auth.uid()
  AND amount_expected > 0
  AND (
    (
      intent_type = 'user_buy'
      AND phone_number IS NOT NULL
      AND length(phone_number) >= 10
    )
    OR (
      intent_type = 'wallet_deposit'
      AND network = 'DEPOSIT'
    )
  )
);
