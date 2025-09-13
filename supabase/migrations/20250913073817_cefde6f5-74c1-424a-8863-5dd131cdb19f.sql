-- Enable Row Level Security for all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Categories: Public read access, admin/system can insert/update
CREATE POLICY "Allow public read access to categories" 
ON categories FOR SELECT 
USING (true);

-- Items: Users can only access their own items (through receipt ownership)
CREATE POLICY "Users can view their own items" 
ON items FOR SELECT 
USING (EXISTS (SELECT 1 FROM receipts WHERE receipts.id = items.receipt_id AND receipts.user_id = auth.uid()::text));

CREATE POLICY "Users can insert items for their own receipts" 
ON items FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM receipts WHERE receipts.id = items.receipt_id AND receipts.user_id = auth.uid()::text));

CREATE POLICY "Users can update their own items" 
ON items FOR UPDATE 
USING (EXISTS (SELECT 1 FROM receipts WHERE receipts.id = items.receipt_id AND receipts.user_id = auth.uid()::text));

CREATE POLICY "Users can delete their own items" 
ON items FOR DELETE 
USING (EXISTS (SELECT 1 FROM receipts WHERE receipts.id = items.receipt_id AND receipts.user_id = auth.uid()::text));

-- Receipts: Users can only access their own receipts
CREATE POLICY "Users can view their own receipts" 
ON receipts FOR SELECT 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own receipts" 
ON receipts FOR INSERT 
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own receipts" 
ON receipts FOR UPDATE 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own receipts" 
ON receipts FOR DELETE 
USING (user_id = auth.uid()::text);

-- Users: Users can only access their own data
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT 
USING (id = auth.uid()::text);

CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
USING (id = auth.uid()::text);

-- Vendors: Public read access for now
CREATE POLICY "Allow public read access to vendors" 
ON vendors FOR SELECT 
USING (true);