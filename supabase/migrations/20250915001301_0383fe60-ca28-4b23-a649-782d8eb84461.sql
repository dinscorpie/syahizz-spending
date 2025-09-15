-- Remove tax_amount and service_charge columns from receipts table
ALTER TABLE public.receipts 
DROP COLUMN IF EXISTS tax_amount,
DROP COLUMN IF EXISTS service_charge;

-- Add tax and service charge categories if they don't exist
INSERT INTO public.categories (id, name, level, icon, color) 
VALUES 
  ('tax', 'Tax', 1, 'Receipt', '#ef4444'),
  ('service_charge', 'Service Charge', 1, 'CreditCard', '#f97316')
ON CONFLICT (id) DO NOTHING;