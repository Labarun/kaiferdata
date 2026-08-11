-- Re-scope admin/staff policies from the catch-all `public` role to `authenticated`
-- so the anon role never evaluates has_role() (which anon may not execute).

-- orders
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

-- payment_records
DROP POLICY IF EXISTS "Admins can manage payment records" ON public.payment_records;
CREATE POLICY "Admins can manage payment records" ON public.payment_records
  FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

-- suppliers
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

-- order_status_history
DROP POLICY IF EXISTS "Admins can manage order status history" ON public.order_status_history;
CREATE POLICY "Admins can manage order status history" ON public.order_status_history
  FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

-- supplier_request_logs
DROP POLICY IF EXISTS "Admins can manage supplier logs" ON public.supplier_request_logs;
CREATE POLICY "Admins can manage supplier logs" ON public.supplier_request_logs
  FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

DROP POLICY IF EXISTS "Staff can read supplier logs" ON public.supplier_request_logs;
CREATE POLICY "Staff can read supplier logs" ON public.supplier_request_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'staff'::app_role)));

-- express_data_packages: keep the public catalog readable by anon without has_role
DROP POLICY IF EXISTS "Anyone can read active express packages" ON public.express_data_packages;
CREATE POLICY "Anyone can read active express packages" ON public.express_data_packages
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage express packages" ON public.express_data_packages;
CREATE POLICY "Admins can manage express packages" ON public.express_data_packages
  FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));

-- express_orders
DROP POLICY IF EXISTS "Users can view own express orders" ON public.express_orders;
CREATE POLICY "Users can view own express orders" ON public.express_orders
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role))
  );

DROP POLICY IF EXISTS "Admins can manage express orders" ON public.express_orders;
CREATE POLICY "Admins can manage express orders" ON public.express_orders
  FOR ALL TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::app_role)));
