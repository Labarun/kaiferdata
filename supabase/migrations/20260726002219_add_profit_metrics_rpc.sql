-- Migration: Add profit metrics RPC
-- Calculates revenue, cost, and profit from delivered orders

CREATE OR REPLACE FUNCTION public.get_profit_metrics(start_date timestamptz, end_date timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- We only look at 'delivered' orders.
  WITH filtered_orders AS (
    SELECT 
      id,
      amount_charged,
      COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0) AS supplier_cost,
      network,
      bundle_code,
      bundle_name,
      actor_type,
      DATE(created_at AT TIME ZONE 'UTC') AS day
    FROM orders
    WHERE status = 'delivered'
      AND created_at >= start_date
      AND created_at <= end_date
  ),
  summary AS (
    SELECT 
      COALESCE(SUM(amount_charged), 0) AS total_revenue,
      COALESCE(SUM(supplier_cost), 0) AS total_cost,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS total_profit,
      COUNT(*) AS total_orders
    FROM filtered_orders
  ),
  daily_trends AS (
    SELECT 
      day,
      COALESCE(SUM(amount_charged), 0) AS revenue,
      COALESCE(SUM(supplier_cost), 0) AS cost,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit
    FROM filtered_orders
    GROUP BY day
    ORDER BY day ASC
  ),
  network_breakdown AS (
    SELECT 
      network,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit,
      COUNT(*) AS orders
    FROM filtered_orders
    GROUP BY network
    ORDER BY profit DESC
  ),
  bundle_breakdown AS (
    SELECT 
      bundle_code,
      MAX(bundle_name) AS bundle_name,
      MAX(network) AS network,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit,
      COUNT(*) AS orders
    FROM filtered_orders
    GROUP BY bundle_code
    ORDER BY profit DESC
    LIMIT 10
  ),
  actor_breakdown AS (
    SELECT 
      actor_type,
      COALESCE(SUM(amount_charged - supplier_cost), 0) AS profit,
      COUNT(*) AS orders
    FROM filtered_orders
    GROUP BY actor_type
    ORDER BY profit DESC
  )
  SELECT jsonb_build_object(
    'summary', (SELECT row_to_json(s) FROM summary s),
    'daily_trends', COALESCE((SELECT json_agg(row_to_json(d)) FROM daily_trends d), '[]'::json),
    'network_breakdown', COALESCE((SELECT json_agg(row_to_json(n)) FROM network_breakdown n), '[]'::json),
    'bundle_breakdown', COALESCE((SELECT json_agg(row_to_json(b)) FROM bundle_breakdown b), '[]'::json),
    'actor_breakdown', COALESCE((SELECT json_agg(row_to_json(a)) FROM actor_breakdown a), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
