
-- Deactivate all non-Ghana network plans
UPDATE public.data_plans SET is_active = false WHERE network IN ('Glo', '9mobile', 'Airtel');

-- Insert Telecel plans
INSERT INTO public.data_plans (network, plan_code, plan_name, amount, volume, description, sort_order) VALUES
('Telecel', 'telecel-500mb', '500MB', 140.00, '500MB', '500MB data valid for 30 days', 1),
('Telecel', 'telecel-1gb', '1GB', 240.00, '1GB', '1GB data valid for 30 days', 2),
('Telecel', 'telecel-2gb', '2GB', 480.00, '2GB', '2GB data valid for 30 days', 3),
('Telecel', 'telecel-3gb', '3GB', 720.00, '3GB', '3GB data valid for 30 days', 4),
('Telecel', 'telecel-5gb', '5GB', 1150.00, '5GB', '5GB data valid for 30 days', 5);

-- Insert AirtelTigo plans
INSERT INTO public.data_plans (network, plan_code, plan_name, amount, volume, description, sort_order) VALUES
('AirtelTigo', 'airteltigo-500mb', '500MB', 145.00, '500MB', '500MB data valid for 30 days', 1),
('AirtelTigo', 'airteltigo-1gb', '1GB', 245.00, '1GB', '1GB data valid for 30 days', 2),
('AirtelTigo', 'airteltigo-2gb', '2GB', 490.00, '2GB', '2GB data valid for 30 days', 3),
('AirtelTigo', 'airteltigo-3gb', '3GB', 710.00, '3GB', '3GB data valid for 30 days', 4),
('AirtelTigo', 'airteltigo-5gb', '5GB', 1100.00, '5GB', '5GB data valid for 30 days', 5);
