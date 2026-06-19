-- ============================================================
-- Fix login identifier resolution + clean up existing profiles
-- ============================================================
-- This migration fixes three issues:
-- 1. Trims whitespace from existing profile records (username, phone, email)
-- 2. Upgrades resolve_login_identifier to handle:
--    - Case-insensitive username matching (already was)
--    - Trimmed input comparison
--    - Phone suffix matching (last 9 digits) to handle +233/0 format differences
-- 3. Re-grants EXECUTE to anon and authenticated roles (previously revoked,
--    but anon users NEED this to resolve usernames/phones before logging in)
-- ============================================================

-- 1. Clean up existing profile data — trim whitespace from all records
UPDATE public.profiles
SET
  username   = NULLIF(btrim(username), ''),
  phone      = NULLIF(btrim(phone), ''),
  email      = NULLIF(btrim(lower(email)), ''),
  full_name  = NULLIF(btrim(full_name), ''),
  updated_at = now()
WHERE
  username   IS DISTINCT FROM NULLIF(btrim(username), '')
  OR phone   IS DISTINCT FROM NULLIF(btrim(phone), '')
  OR email   IS DISTINCT FROM NULLIF(btrim(lower(email)), '')
  OR full_name IS DISTINCT FROM NULLIF(btrim(full_name), '');

-- 2. Recreate resolve_login_identifier with improved matching
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles
  WHERE
    -- Case-insensitive, trimmed username match
    lower(btrim(username)) = lower(btrim(_identifier))
    -- Phone match: compare last 9 digits (strips country code & leading zero differences)
    -- e.g. "+233241234567" and "0241234567" both yield "241234567"
    OR (
      length(regexp_replace(btrim(phone), '[^0-9]', '', 'g')) >= 9
      AND length(regexp_replace(btrim(_identifier), '[^0-9]', '', 'g')) >= 9
      AND right(regexp_replace(btrim(phone), '[^0-9]', '', 'g'), 9)
        = right(regexp_replace(btrim(_identifier), '[^0-9]', '', 'g'), 9)
    )
  LIMIT 1
$$;

-- 3. Re-grant permissions — anon MUST be able to call this to log in with username/phone
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated, service_role;
