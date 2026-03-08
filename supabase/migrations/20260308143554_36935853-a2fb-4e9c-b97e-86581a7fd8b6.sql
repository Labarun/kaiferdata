
-- Fix audit_logs insert policy to be more specific
DROP POLICY "Auth users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Auth users can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
