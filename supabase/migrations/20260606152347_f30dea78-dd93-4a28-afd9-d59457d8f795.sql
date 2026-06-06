-- Admin Analytics & Agent Features RPCs

-- 1. Get Top Agents
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
  GROUP BY ap.id, ap.user_id, ap.store_name
  ORDER BY total_orders DESC, total_revenue DESC
  LIMIT 50;
END;
$$;

-- 2. Get Sales Source Breakdown
CREATE OR REPLACE FUNCTION public.get_sales_source_breakdown(timeframe text DEFAULT 'all')
RETURNS TABLE (
  actor_type text,
  total_orders bigint,
  total_revenue numeric
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
    o.actor_type,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.amount_charged), 0) as total_revenue
  FROM public.orders o
  WHERE o.status = 'delivered' AND o.created_at >= start_date
  GROUP BY o.actor_type
  ORDER BY total_revenue DESC;
END;
$$;

-- 3. Get Sales Trends (Daily)
CREATE OR REPLACE FUNCTION public.get_sales_trends(days_limit int DEFAULT 30)
RETURNS TABLE (
  sale_date date,
  total_orders bigint,
  total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('day', o.created_at)::date as sale_date,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.amount_charged), 0) as total_revenue
  FROM public.orders o
  WHERE o.status = 'delivered' 
    AND o.created_at >= (now() - (days_limit || ' days')::interval)
  GROUP BY date_trunc('day', o.created_at)::date
  ORDER BY sale_date ASC;
END;
$$;

-- 4. Add Last Active Timestamp to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_last_active_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.last_active_at = now();
  RETURN NEW;
END;
$$;