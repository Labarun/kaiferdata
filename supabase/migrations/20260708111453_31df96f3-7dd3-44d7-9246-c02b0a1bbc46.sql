-- Add storefront_enabled toggle to agent_profiles
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS storefront_enabled BOOLEAN NOT NULL DEFAULT true;

-- Insert master_storefront_enabled into system_settings
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'master_storefront_enabled') THEN
INSERT INTO public.system_settings (id, setting_key, setting_value, setting_group, description, updated_at)
VALUES (
gen_random_uuid(),
'master_storefront_enabled', 
'true', 
'storefront', 
'Globally enable or disable all agent storefronts. Overrides individual agent settings.',
now()
);
END IF;
END $$;

-- Update get_public_storefront to include storefront_enabled
DROP FUNCTION IF EXISTS public.get_public_storefront(text);
CREATE OR REPLACE FUNCTION public.get_public_storefront(_slug text)
RETURNS TABLE(
id uuid, user_id uuid, store_slug text, store_name text,
store_logo_url text, store_tagline text, business_name text,
city text, contact_phone text, status agent_profile_status, created_at timestamp with time zone,
storefront_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT id, user_id, store_slug, store_name, store_logo_url, store_tagline,
business_name, city, contact_phone, status, created_at, storefront_enabled
FROM public.agent_profiles
WHERE lower(store_slug) = lower(_slug)
AND status = 'active'
LIMIT 1
$function$;