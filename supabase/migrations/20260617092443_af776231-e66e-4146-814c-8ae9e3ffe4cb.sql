CREATE OR REPLACE FUNCTION public.get_agent_storefront_orders(p_profile_id uuid, p_limit int DEFAULT 50)
RETURNS SETOF public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.agent_profiles WHERE id = p_profile_id;
  IF v_actor IS NULL OR (v_actor <> v_owner
       AND NOT has_role(v_actor,'admin'::app_role)
       AND NOT has_role(v_actor,'staff'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT o.*
    FROM public.orders o
    JOIN public.purchase_intents pi ON pi.id = o.intent_id
   WHERE (pi.order_context->'referral'->>'agent_profile_id') = p_profile_id::text
   ORDER BY o.created_at DESC
   LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_storefront_orders(uuid, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_agent_storefront_orders(uuid, int) FROM anon, public;