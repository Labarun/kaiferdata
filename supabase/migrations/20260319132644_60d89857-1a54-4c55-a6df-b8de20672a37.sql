
-- Add fee tracking columns to purchase_intents
ALTER TABLE public.purchase_intents
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS fee_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric;

-- Backfill existing: base_amount = amount_expected, total_amount = amount_expected, fee = 0
UPDATE public.purchase_intents
SET base_amount = amount_expected,
    total_amount = amount_expected,
    fee_amount = 0,
    fee_rate = 0
WHERE base_amount IS NULL;

-- Add fee tracking columns to payment_records
ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS base_amount numeric,
  ADD COLUMN IF NOT EXISTS fee_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric;

-- Backfill existing payment_records
UPDATE public.payment_records
SET base_amount = amount,
    total_amount = amount,
    fee_amount = 0,
    fee_rate = 0
WHERE base_amount IS NULL;
