-- ============================================================
-- Add setting for Express Delivery Speed
-- ============================================================

INSERT INTO public.system_settings (setting_key, setting_value, setting_group, description)
VALUES (
  'express_delivery_speed',
  'within 10 - 30 minutes',
  'general',
  'Delivery speed message shown on the Express data packages tab'
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_group = EXCLUDED.setting_group,
    description = EXCLUDED.description;
