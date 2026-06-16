-- write_audit_log: authenticated + service_role only
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, text, jsonb) TO authenticated, service_role;

-- Public read RPCs: anon + authenticated
REVOKE ALL ON FUNCTION public.track_order_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order_public(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.lookup_intent_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_intent_public(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_storefront(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_storefront(text) TO anon, authenticated, service_role;

-- Admin/money RPCs: authenticated + service_role only
DO $$
DECLARE
  fn text;
  r record;
  fns text[] := ARRAY[
    'admin_set_user_role',
    'admin_credit_user_wallet',
    'admin_debit_user_wallet',
    'admin_set_account_status',
    'admin_activate_agent_subscription',
    'approve_agent_withdrawal_atomic',
    'reject_agent_withdrawal_atomic',
    'approve_agent_withdrawal_v2_atomic',
    'reject_agent_withdrawal_v2_atomic',
    'purchase_with_wallet_atomic',
    'purchase_bulk_with_wallet_atomic',
    'request_agent_withdrawal_atomic',
    'request_agent_withdrawal_v2_atomic'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    FOR r IN
      SELECT p.oid::regprocedure::text AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    END LOOP;
  END LOOP;
END $$;

DELETE FROM public.audit_logs WHERE id = '2b723264-891b-4717-85d8-387e8e280eeb';
