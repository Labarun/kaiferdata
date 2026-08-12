-- Move expired subscriptions from 'active' to 'expired'
UPDATE public.agent_subscriptions
SET status = 'expired'
WHERE status = 'active' 
  AND expires_at IS NOT NULL 
  AND expires_at < NOW();

-- Update agent_profiles to 'subscription_expired' if they have no valid active subscription
UPDATE public.agent_profiles p
SET status = 'subscription_expired'
WHERE status = 'active'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.agent_subscriptions s 
    WHERE s.user_id = p.user_id 
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at >= NOW())
  );
