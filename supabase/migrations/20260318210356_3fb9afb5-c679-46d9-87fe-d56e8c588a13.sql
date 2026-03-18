UPDATE public.suppliers SET priority = 1 WHERE provider_code = 'afrohub';
UPDATE public.suppliers SET priority = 99, is_active = false WHERE provider_code = 'stub';