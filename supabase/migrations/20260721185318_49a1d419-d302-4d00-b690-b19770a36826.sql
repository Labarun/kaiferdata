ALTER TABLE public.data_packages ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'regular';
UPDATE public.data_packages SET category = 'regular' WHERE category IS NULL;