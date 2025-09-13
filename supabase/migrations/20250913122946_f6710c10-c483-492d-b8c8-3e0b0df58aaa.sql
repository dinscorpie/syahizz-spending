-- Create dummy data for today (13 Sept 2025)
-- First, let's create some receipts for today
DO $$
DECLARE
    user_uuid uuid;
    receipt_id1 uuid;
    receipt_id2 uuid;
    receipt_id3 uuid;
    receipt_id4 uuid;
    receipt_id5 uuid;
    category_food uuid;
    category_transport uuid;
    category_grocery uuid;
    category_entertainment uuid;
BEGIN
    -- Get the current user (assuming there's at least one user)
    SELECT id INTO user_uuid FROM auth.users LIMIT 1;
    
    -- Get category IDs (assuming they exist)
    SELECT id INTO category_food FROM categories WHERE name ILIKE '%food%' OR name ILIKE '%restaurant%' LIMIT 1;
    SELECT id INTO category_transport FROM categories WHERE name ILIKE '%transport%' OR name ILIKE '%gas%' LIMIT 1;
    SELECT id INTO category_grocery FROM categories WHERE name ILIKE '%grocery%' OR name ILIKE '%supermarket%' LIMIT 1;
    SELECT id INTO category_entertainment FROM categories WHERE name ILIKE '%entertainment%' OR name ILIKE '%movie%' LIMIT 1;
    
    -- If categories don't exist, create some basic ones
    IF category_food IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Food & Dining', 1) RETURNING id INTO category_food;
    END IF;
    
    IF category_transport IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Transportation', 1) RETURNING id INTO category_transport;
    END IF;
    
    IF category_grocery IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Groceries', 1) RETURNING id INTO category_grocery;
    END IF;
    
    IF category_entertainment IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Entertainment', 1) RETURNING id INTO category_entertainment;
    END IF;
    
    -- Create receipts for today (2025-09-13)
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES 
        (gen_random_uuid(), user_uuid, 'Mamak Restaurant', 45.50, '2025-09-13 08:30:00', '2025-09-13 08:30:00')
    RETURNING id INTO receipt_id1;
    
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES 
        (gen_random_uuid(), user_uuid, 'Petronas Gas Station', 85.00, '2025-09-13 12:15:00', '2025-09-13 12:15:00')
    RETURNING id INTO receipt_id2;
    
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES 
        (gen_random_uuid(), user_uuid, 'AEON Supermarket', 124.75, '2025-09-13 14:45:00', '2025-09-13 14:45:00')
    RETURNING id INTO receipt_id3;
    
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES 
        (gen_random_uuid(), user_uuid, 'TGV Cinemas', 32.00, '2025-09-13 19:20:00', '2025-09-13 19:20:00')
    RETURNING id INTO receipt_id4;
    
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES 
        (gen_random_uuid(), user_uuid, 'Starbucks Coffee', 18.90, '2025-09-13 16:00:00', '2025-09-13 16:00:00')
    RETURNING id INTO receipt_id5;
    
    -- Create items for each receipt
    -- Mamak Restaurant items
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id)
    VALUES 
        (receipt_id1, 'Nasi Lemak', 2, 12.50, 25.00, category_food),
        (receipt_id1, 'Teh Tarik', 2, 3.50, 7.00, category_food),
        (receipt_id1, 'Roti Canai', 3, 4.50, 13.50, category_food);
    
    -- Petronas Gas Station items
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id)
    VALUES 
        (receipt_id2, 'Petrol RON95', 1, 85.00, 85.00, category_transport);
    
    -- AEON Supermarket items
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id)
    VALUES 
        (receipt_id3, 'Fresh Vegetables', 1, 24.50, 24.50, category_grocery),
        (receipt_id3, 'Chicken Breast', 2, 18.90, 37.80, category_grocery),
        (receipt_id3, 'Rice 5kg', 1, 22.90, 22.90, category_grocery),
        (receipt_id3, 'Milk 1L', 2, 7.90, 15.80, category_grocery),
        (receipt_id3, 'Bread', 1, 4.50, 4.50, category_grocery),
        (receipt_id3, 'Eggs 30pcs', 1, 19.25, 19.25, category_grocery);
    
    -- TGV Cinemas items
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id)
    VALUES 
        (receipt_id4, 'Movie Ticket', 2, 16.00, 32.00, category_entertainment);
    
    -- Starbucks Coffee items
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id)
    VALUES 
        (receipt_id5, 'Caramel Macchiato', 1, 18.90, 18.90, category_food);
        
END $$;