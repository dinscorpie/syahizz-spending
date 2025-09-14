-- Remove tip_amount column from receipts table as it's not applicable in Malaysia
ALTER TABLE receipts DROP COLUMN tip_amount;