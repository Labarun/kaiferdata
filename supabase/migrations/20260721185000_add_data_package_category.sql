-- Migration to add category for distinguishing Regular vs Express data packages

ALTER TABLE data_packages ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'regular';

-- Update any existing rows to regular
UPDATE data_packages SET category = 'regular' WHERE category IS NULL;
