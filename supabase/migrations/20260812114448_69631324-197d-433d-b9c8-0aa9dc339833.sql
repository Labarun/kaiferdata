-- ============================================================
-- Fix: Ensure get_top_agents only returns agents with valid active subscriptions
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_top_agents(timeframe text DEFAULT 'all')
RETURNS TABLE (
  agent_id uuid,
  user_id uuid,
  store_name text,
  total_orders bigint,
  total_revenue numeric,
  total_commission numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date timestamptz;
BEGIN
  IF timeframe = 'today' THEN
    start_date := date_trunc('day', now());
  ELSIF timeframe = 'week' THEN
    start_date := date_trunc('week', now());
  ELSIF timeframe = 'month' THEN
    start_date := date_trunc('month', now());
  ELSE
    start_date := '1970-01-01'::timestamptz;
  END IF;

  RETURN QUERY
  SELECT 
    ap.id as agent_id,
    ap.user_id,
    ap.store_name,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.amount_charged), 0) as total_revenue,
    COALESCE(SUM(ae.commission_amount), 0) as total_commission
  FROM public.agent_profiles ap
  LEFT JOIN public.orders o 
    ON o.actor_id = ap.user_id 
    AND o.actor_type = 'agent' 
    AND o.status = 'delivered'
    AND o.created_at >= start_date
  LEFT JOIN public.agent_earnings ae
    ON ae.agent_profile_id = ap.id
    AND ae.order_id = o.id
  WHERE ap.status = 'active'
  -- ONLY include agents that currently have an active, unexpired subscription
  AND EXISTS (
    SELECT 1 
    FROM public.agent_subscriptions s 
    WHERE s.user_id = ap.user_id 
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at >= now())
  )
  GROUP BY ap.id, ap.user_id, ap.store_name
  ORDER BY total_orders DESC, total_revenue DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_top_agents(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_agents(text) TO anon, authenticated, service_role;