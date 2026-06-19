-- Clean up existing profile data — trim whitespace from all records
UPDATE public.profiles
SET
  username = NULLIF(btrim(username), ''),
  phone = NULLIF(btrim(phone), ''),
  email = NULLIF(btrim(lower(email)), ''),
  full_name = NULLIF(btrim(full_name), ''),
  updated_at = now()
WHERE
  username IS DISTINCT FROM NULLIF(btrim(username), '')
  OR phone IS DISTINCT FROM NULLIF(btrim(phone), '')
  OR email IS DISTINCT FROM NULLIF(btrim(lower(email)), '')
  OR full_name IS DISTINCT FROM NULLIF(btrim(full_name), '');

-- Recreate resolve_login_identifier with improved matching
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles
  WHERE
    lower(btrim(username)) = lower(btrim(_identifier))
    OR (
      length(regexp_replace(btrim(phone), '[^0-9]', '', 'g')) >= 9
      AND length(regexp_replace(btrim(_identifier), '[^0-9]', '', 'g')) >= 9
      AND right(regexp_replace(btrim(phone), '[^0-9]', '', 'g'), 9)
        = right(regexp_replace(btrim(_identifier), '[^0-9]', '', 'g'), 9)
    )
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated, service_role;