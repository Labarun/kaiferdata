DO $$
BEGIN
  RAISE NOTICE 'Public agent-stores bucket is intentionally left public for storefront assets; no schema change required.';
END $$;