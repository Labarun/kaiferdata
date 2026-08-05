CREATE OR REPLACE FUNCTION public.track_orders_by_phone_public(_phone text)
RETURNS TABLE (
public_order_id text,
status order_status,
network text,
bundle_snapshot jsonb,
created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
v_phone text;
BEGIN
v_phone := btrim(COALESCE(_phone, ''));

IF length(v_phone) < 9 THEN 
RETURN; 
END IF;

RETURN QUERY
SELECT o.public_order_id, o.status, o.network, o.bundle_snapshot, o.created_at
FROM public.orders o
WHERE o.beneficiary_number = v_phone
OR o.beneficiary_number LIKE '%' || v_phone
ORDER BY o.created_at DESC
LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.track_orders_by_phone_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_orders_by_phone_public(text) TO anon, authenticated, service_role;