CREATE OR REPLACE FUNCTION public.get_admin_profit_stats()
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
BEGIN
  SELECT COALESCE(SUM(amount_charged - COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0)), 0)
  INTO v_total_profit
  FROM orders
  WHERE status = 'delivered';

  SELECT COALESCE(SUM(amount_charged - COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0)), 0)
  INTO v_direct_profit
  FROM orders
  WHERE status = 'delivered' AND COALESCE(actor_type, 'user') != 'agent';

  SELECT COALESCE(SUM(amount_charged - COALESCE((bundle_snapshot->>'supplier_price')::numeric, 0)), 0)
  INTO v_agent_profit
  FROM orders
  WHERE status = 'delivered' AND actor_type = 'agent';

  SELECT COALESCE(SUM(commission_amount), 0)
  INTO v_total_commission
  FROM agent_earnings
  WHERE status != 'failed';

  RETURN QUERY SELECT v_total_profit, v_direct_profit, v_agent_profit, v_total_commission;
END;
$$;