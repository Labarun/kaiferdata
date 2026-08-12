REVOKE EXECUTE ON FUNCTION public.get_admin_profit_stats(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sales_trends(int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_profit_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_trends(int) TO authenticated;
