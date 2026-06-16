
-- orders
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can read orders" ON public.orders;
DROP POLICY IF EXISTS "Owner/staff/admin can read orders" ON public.orders;
CREATE POLICY "Owner/staff/admin can read orders"
ON public.orders FOR SELECT TO authenticated
USING (
  actor_id = auth.uid()
  OR has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'staff'::app_role)
);

-- order_status_history
DROP POLICY IF EXISTS "Anyone can read order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Owner/staff/admin can read order status history" ON public.order_status_history;
CREATE POLICY "Owner/staff/admin can read order status history"
ON public.order_status_history FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'staff'::app_role)
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND o.actor_id = auth.uid())
);

-- payment_records
DROP POLICY IF EXISTS "Anyone can read payment records by reference" ON public.payment_records;
DROP POLICY IF EXISTS "Owner/staff/admin can read payment records" ON public.payment_records;
CREATE POLICY "Owner/staff/admin can read payment records"
ON public.payment_records FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'staff'::app_role)
  OR EXISTS (SELECT 1 FROM public.purchase_intents pi WHERE pi.id = payment_records.intent_id AND pi.actor_id = auth.uid())
);

-- purchase_intents
DROP POLICY IF EXISTS "Anyone can read intents by reference" ON public.purchase_intents;
DROP POLICY IF EXISTS "Owner/staff/admin can read intents" ON public.purchase_intents;
CREATE POLICY "Owner/staff/admin can read intents"
ON public.purchase_intents FOR SELECT TO authenticated
USING (
  actor_id = auth.uid()
  OR has_role(auth.uid(),'admin'::app_role)
  OR has_role(auth.uid(),'staff'::app_role)
);

-- Public lookup RPCs
CREATE OR REPLACE FUNCTION public.lookup_intent_public(_reference text)
RETURNS TABLE (
  id uuid, intent_reference text, intent_type text, status intent_status,
  network text, phone_number text, amount_expected numeric, total_amount numeric,
  fee_amount numeric, base_amount numeric, plan_snapshot jsonb,
  source_channel text, customer_name text, expires_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, intent_reference, intent_type, status, network, phone_number,
         amount_expected, total_amount, fee_amount, base_amount,
         plan_snapshot, source_channel, customer_name, expires_at, created_at
    FROM public.purchase_intents
   WHERE intent_reference = upper(btrim(_reference))
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.lookup_intent_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_intent_public(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.track_order_public(_reference text)
RETURNS TABLE (
  id uuid, public_order_id text, status order_status, network text,
  bundle_name text, bundle_snapshot jsonb, beneficiary_number text,
  amount_charged numeric, currency text, delivery_message text,
  created_at timestamptz, updated_at timestamptz, timeline jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_ref text;
  v_order public.orders%ROWTYPE;
  v_masked text;
  v_safe_snapshot jsonb;
BEGIN
  v_ref := upper(btrim(COALESCE(_reference, '')));
  IF length(v_ref) = 0 THEN RETURN; END IF;

  SELECT * INTO v_order FROM public.orders o WHERE o.public_order_id = v_ref LIMIT 1;
  IF NOT FOUND THEN
    SELECT o.* INTO v_order
      FROM public.orders o
      JOIN public.purchase_intents pi ON pi.id = o.intent_id
     WHERE pi.intent_reference = v_ref LIMIT 1;
  END IF;
  IF NOT FOUND THEN RETURN; END IF;

  v_masked := CASE
    WHEN v_order.beneficiary_number IS NULL THEN NULL
    WHEN length(v_order.beneficiary_number) >= 7
      THEN substr(v_order.beneficiary_number, 1, 3)
        || repeat('*', length(v_order.beneficiary_number) - 5)
        || substr(v_order.beneficiary_number, length(v_order.beneficiary_number) - 1)
    ELSE v_order.beneficiary_number
  END;

  v_safe_snapshot := jsonb_build_object(
    'volume', v_order.bundle_snapshot->>'volume',
    'plan_name', v_order.bundle_snapshot->>'plan_name',
    'package_name', v_order.bundle_snapshot->>'package_name',
    'package_code', v_order.bundle_snapshot->>'package_code',
    'description', v_order.bundle_snapshot->>'description',
    'network', v_order.bundle_snapshot->>'network'
  );

  RETURN QUERY
  SELECT v_order.id, v_order.public_order_id, v_order.status, v_order.network,
         v_order.bundle_name, v_safe_snapshot, v_masked,
         v_order.amount_charged, v_order.currency, v_order.delivery_message,
         v_order.created_at, v_order.updated_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'id', h.id, 'new_status', h.new_status,
             'changed_at', h.changed_at, 'note', h.note
           ) ORDER BY h.changed_at ASC)
           FROM public.order_status_history h WHERE h.order_id = v_order.id
         ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.track_order_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order_public(text) TO anon, authenticated, service_role;
