-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    auth_key text NOT NULL,
    p256dh_key text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow admins to see and manage all subscriptions, and users to manage their own
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all push subscriptions" ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert the VAPID Private Key into system settings so edge functions can access it without env vars
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('vapid_private_key', 'Rm3f4GVpVDM8NAKc6_CiHhDlD8aQXboeF36_-shcfL8')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
