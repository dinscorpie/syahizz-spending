-- Add service_charge column to receipts table
ALTER TABLE receipts ADD COLUMN service_charge DECIMAL(10,2) DEFAULT 0;