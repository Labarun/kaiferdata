
-- Drop the FK constraint that causes the error (plan_id -> data_plans)
-- We now use data_packages and store full snapshots, so a hard FK is unnecessary
ALTER TABLE public.purchase_intents DROP CONSTRAINT IF EXISTS purchase_intents_plan_id_fkey;

-- Add a unique constraint on payment_records for upsert idempotency
-- (provider, provider_reference) must be unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_records_provider_reference_unique'
  ) THEN
    ALTER TABLE public.payment_records 
      ADD CONSTRAINT payment_records_provider_reference_unique 
      UNIQUE (provider, provider_reference);
  END IF;
END $$;
