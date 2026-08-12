-- ============================================================
-- Fix: Admin Analytics Logic
-- 1. Fix get_sales_trends to not skip days with zero sales.
-- 2. Fix get_admin_profit_stats to deduct agent commission from profit.
-- 3. Add timeframe filtering to get_admin_profit_stats.
-- ============================================================

-- 1. Get Sales Trends (Daily) - Calendar Series Fill
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
  WITH dates AS (
    SELECT generate_series(
      date_trunc('day', now()) - ((days_limit - 1) || ' days')::interval,
      date_trunc('day', now()),
      '1 day'::interval
    )::date AS d
  )
  SELECT 
    dates.d as sale_date,
    COUNT(o.id)::bigint as total_orders,
    COALESCE(SUM(o.amount_charged), 0)::numeric as total_revenue
  FROM dates
  LEFT JOIN public.orders o 
    ON date_trunc('day', o.created_at)::date = dates.d
    AND o.status = 'delivered'
  GROUP BY dates.d
  ORDER BY dates.d ASC;
END;
$$;

-- 2. Get Admin Profit Stats - Commission Deduction & Timeframes
CREATE OR REPLACE FUNCTION public.get_admin_profit_stats(timeframe text DEFAULT 'all')
RETURNS TABLE (
  total_profit numeric,
  direct_profit numeric,
  agent_profit numeric,
  total_commission numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_profit numeric := 0;
  v_direct_profit numeric := 0;
  v_agent_profit numeric := 0;
  v_total_commission numeric := 0;
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

  -- Total net profit (Revenue - Supplier Cost - Agent Commission)
  SELECT COALESCE(SUM(o.amount_charged - COALESCE((o.bundle_snapshot->>'supplier_price')::numeric, 0) - COALESCE(ae.commission_amount, 0)), 0)
  INTO v_total_profit
  FROM orders o
  LEFT JOIN agent_earnings ae ON ae.order_id = o.id AND ae.status != 'failed'
  WHERE o.status = 'delivered' AND o.created_at >= start_date;

  -- Direct profit (No agents, so no commissions)
  SELECT COALESCE(SUM(amount_charged - COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0)), 0)
  INTO v_direct_profit
  FROM orders
  WHERE status = 'delivered' AND COALESCE(actor_type, 'user') != 'agent' AND created_at >= start_date;

  -- Agent profit (Revenue - Supplier Cost - Agent Commission)
  SELECT COALESCE(SUM(o.amount_charged - COALESCE((o.bundle_snapshot->>'supplier_price')::numeric, 0) - COALESCE(ae.commission_amount, 0)), 0)
  INTO v_agent_profit
  FROM orders o
  LEFT JOIN agent_earnings ae ON ae.order_id = o.id AND ae.status != 'failed'
  WHERE o.status = 'delivered' AND o.actor_type = 'agent' AND o.created_at >= start_date;

  -- Total commission paid/pending to agents
  -- Join orders to filter commission based on order creation date for the timeframe
  SELECT COALESCE(SUM(ae.commission_amount), 0)
  INTO v_total_commission
  FROM agent_earnings ae
  JOIN orders o ON ae.order_id = o.id
  WHERE ae.status != 'failed' AND o.created_at >= start_date;

  RETURN QUERY SELECT v_total_profit, v_direct_profit, v_agent_profit, v_total_commission;
END;
$$;
