CREATE OR REPLACE FUNCTION public.admin_set_special_bundle_status(_order_id uuid, _new_status text, _note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_order RECORD; v_old text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _new_status NOT IN ('processing','delivered','pending') THEN
    RAISE EXCEPTION 'Invalid target status';
  END IF;
  SELECT * INTO v_order FROM public.special_bundle_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  v_old := v_order.status;

  IF _new_status = 'processing' AND v_old <> 'pending' THEN
    RAISE EXCEPTION 'Cannot move order from % to %', v_old, _new_status;
  ELSIF _new_status = 'delivered' AND v_old NOT IN ('pending','processing') THEN
    RAISE EXCEPTION 'Cannot move order from % to %', v_old, _new_status;
  ELSIF _new_status = 'pending' AND v_old <> 'processing' THEN
    RAISE EXCEPTION 'Cannot move order from % to %', v_old, _new_status;
  END IF;

  UPDATE public.special_bundle_orders
     SET status = _new_status,
         delivered_at = CASE WHEN _new_status = 'delivered' THEN now() ELSE delivered_at END,
         admin_note = COALESCE(_note, admin_note),
         updated_at = now()
   WHERE id = _order_id;
  INSERT INTO public.special_bundle_status_history (order_id, old_status, new_status, note, changed_by)
  VALUES (_order_id, v_old, _new_status, _note, auth.uid());
  INSERT INTO public.audit_logs (action, actor_id, actor_role, target_type, target_id, metadata)
  VALUES ('special_bundle_status_changed', auth.uid(), 'admin', 'special_bundle_order', _order_id::text,
    jsonb_build_object('old_status', v_old, 'new_status', _new_status, 'note', _note));
END; $function$;

REVOKE ALL ON FUNCTION public.admin_set_special_bundle_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_special_bundle_status(uuid, text, text) TO authenticated, service_role;