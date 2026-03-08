-- Add unique username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- Create a function to look up email by username or phone
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles
  WHERE lower(username) = lower(_identifier)
     OR phone = _identifier
  LIMIT 1
$$;

-- Grant access to anon and authenticated
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated;