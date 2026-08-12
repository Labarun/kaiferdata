-- ============================================================
-- Advanced Analytics RPCs
-- ============================================================

-- 1. Top Selling Packages
CREATE OR REPLACE FUNCTION public.get_top_selling_packages(timeframe text DEFAULT 'all')
RETURNS TABLE (
  network text,
  bundle_name text,
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
    o.network,
    o.bundle_name,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.amount_charged), 0) as total_revenue
  FROM public.orders o
  WHERE o.status = 'delivered' AND o.created_at >= start_date
  GROUP BY o.network, o.bundle_name
  ORDER BY total_orders DESC
  LIMIT 10;
END;
$$;

-- 2. Order Status Breakdown
CREATE OR REPLACE FUNCTION public.get_order_status_breakdown(timeframe text DEFAULT 'all')
RETURNS TABLE (
  status text,
  total_orders bigint
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
    o.status::text,
    COUNT(o.id) as total_orders
  FROM public.orders o
  WHERE o.created_at >= start_date
  GROUP BY o.status;
END;
$$;

-- 3. Payment Method Breakdown (origin_type)
CREATE OR REPLACE FUNCTION public.get_payment_method_breakdown(timeframe text DEFAULT 'all')
RETURNS TABLE (
  payment_method text,
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
    CASE 
      WHEN o.origin_type = 'wallet_buy' THEN 'Wallet'
      ELSE 'Paystack (Direct)'
    END as payment_method,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.amount_charged), 0) as total_revenue
  FROM public.orders o
  WHERE o.status = 'delivered' AND o.created_at >= start_date
  GROUP BY 
    CASE 
      WHEN o.origin_type = 'wallet_buy' THEN 'Wallet'
      ELSE 'Paystack (Direct)'
    END;
END;
$$;

-- Lock down execution privileges so only authenticated users can call these RPCs
REVOKE EXECUTE ON FUNCTION public.get_top_selling_packages(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_status_breakdown(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_payment_method_breakdown(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_top_selling_packages(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status_breakdown(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_method_breakdown(text) TO authenticated;
