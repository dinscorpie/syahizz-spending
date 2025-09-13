-- Create comprehensive dummy data for September 2025
DO $$
DECLARE
    user_uuid uuid;
    receipt_id uuid;
    category_food uuid;
    category_transport uuid;
    category_grocery uuid;
    category_entertainment uuid;
    category_shopping uuid;
    category_healthcare uuid;
    category_utilities uuid;
    category_personal_care uuid;
BEGIN
    -- Get the current user
    SELECT id INTO user_uuid FROM auth.users LIMIT 1;
    
    -- Get or create categories
    SELECT id INTO category_food FROM categories WHERE name = 'Food & Dining' LIMIT 1;
    SELECT id INTO category_transport FROM categories WHERE name = 'Transportation' LIMIT 1;
    SELECT id INTO category_grocery FROM categories WHERE name = 'Groceries' LIMIT 1;
    SELECT id INTO category_entertainment FROM categories WHERE name = 'Entertainment' LIMIT 1;
    
    -- Create additional categories
    INSERT INTO categories (name, level) VALUES ('Shopping', 1) ON CONFLICT (name) DO NOTHING;
    INSERT INTO categories (name, level) VALUES ('Healthcare', 1) ON CONFLICT (name) DO NOTHING;
    INSERT INTO categories (name, level) VALUES ('Utilities & Bills', 1) ON CONFLICT (name) DO NOTHING;
    INSERT INTO categories (name, level) VALUES ('Personal Care', 1) ON CONFLICT (name) DO NOTHING;
    
    SELECT id INTO category_shopping FROM categories WHERE name = 'Shopping' LIMIT 1;
    SELECT id INTO category_healthcare FROM categories WHERE name = 'Healthcare' LIMIT 1;
    SELECT id INTO category_utilities FROM categories WHERE name = 'Utilities & Bills' LIMIT 1;
    SELECT id INTO category_personal_care FROM categories WHERE name = 'Personal Care' LIMIT 1;

    -- September 1, 2025 - Sunday
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Village Grocer', 156.80, '2025-09-01 10:30:00', '2025-09-01 10:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Fresh Salmon', 1, 45.90, 45.90, category_grocery),
    (receipt_id, 'Organic Vegetables', 1, 32.50, 32.50, category_grocery),
    (receipt_id, 'Premium Rice 10kg', 1, 28.90, 28.90, category_grocery),
    (receipt_id, 'Fresh Milk 2L', 2, 8.90, 17.80, category_grocery),
    (receipt_id, 'Free Range Eggs', 1, 12.50, 12.50, category_grocery),
    (receipt_id, 'Imported Cheese', 1, 19.20, 19.20, category_grocery);

    -- September 2, 2025 - Lunch
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Old Town White Coffee', 28.50, '2025-09-02 12:45:00', '2025-09-02 12:45:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Hainanese Chicken Chop', 1, 18.90, 18.90, category_food),
    (receipt_id, 'White Coffee', 1, 6.50, 6.50, category_food),
    (receipt_id, 'Toast with Kaya', 1, 3.10, 3.10, category_food);

    -- September 3, 2025 - Fuel
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Shell Station', 95.00, '2025-09-03 08:15:00', '2025-09-03 08:15:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Petrol RON97', 1, 95.00, 95.00, category_transport);

    -- September 4, 2025 - Healthcare
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Guardian Pharmacy', 67.40, '2025-09-04 16:20:00', '2025-09-04 16:20:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Panadol Extra', 2, 12.90, 25.80, category_healthcare),
    (receipt_id, 'Vitamin C Tablets', 1, 18.50, 18.50, category_healthcare),
    (receipt_id, 'Hand Sanitizer', 1, 8.90, 8.90, category_healthcare),
    (receipt_id, 'Face Masks', 1, 14.20, 14.20, category_healthcare);

    -- September 5, 2025 - Dinner
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Restoran Wong Ah Wah', 72.50, '2025-09-05 19:30:00', '2025-09-05 19:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Hokkien Mee', 2, 15.00, 30.00, category_food),
    (receipt_id, 'Char Kuey Teow', 1, 12.50, 12.50, category_food),
    (receipt_id, 'Fresh Orange Juice', 3, 6.50, 19.50, category_food),
    (receipt_id, 'Tau Fu Fa', 2, 5.25, 10.50, category_food);

    -- September 6, 2025 - Weekend Movie
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'GSC Cinemas', 58.00, '2025-09-06 20:00:00', '2025-09-06 20:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Movie Tickets', 2, 18.00, 36.00, category_entertainment),
    (receipt_id, 'Popcorn Large', 1, 12.00, 12.00, category_entertainment),
    (receipt_id, 'Soft Drinks', 2, 5.00, 10.00, category_entertainment);

    -- September 7, 2025 - Weekend Shopping
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Uniqlo', 189.00, '2025-09-07 15:00:00', '2025-09-07 15:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Cotton T-Shirt', 2, 39.90, 79.80, category_shopping),
    (receipt_id, 'Jeans', 1, 109.20, 109.20, category_shopping);

    -- September 8, 2025 - Coffee
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Starbucks KLCC', 24.50, '2025-09-08 09:00:00', '2025-09-08 09:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Americano Tall', 1, 12.50, 12.50, category_food),
    (receipt_id, 'Croissant', 1, 12.00, 12.00, category_food);

    -- September 22-30 additional entries
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'KFC', 42.90, '2025-09-22 18:00:00', '2025-09-22 18:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Original Recipe Chicken', 2, 18.90, 37.80, category_food),
    (receipt_id, 'Coleslaw', 1, 5.10, 5.10, category_food);

    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'BHP Petrol Station', 78.50, '2025-09-25 07:30:00', '2025-09-25 07:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Petrol RON95', 1, 78.50, 78.50, category_transport);

    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Mydin Hypermarket', 187.60, '2025-09-28 16:00:00', '2025-09-28 16:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Whole Chicken', 1, 18.90, 18.90, category_grocery),
    (receipt_id, 'Fresh Prawns', 1, 35.80, 35.80, category_grocery),
    (receipt_id, 'Local Vegetables Bundle', 1, 22.50, 22.50, category_grocery),
    (receipt_id, 'Jasmine Rice 5kg', 1, 24.90, 24.90, category_grocery),
    (receipt_id, 'Coconut Milk', 3, 4.90, 14.70, category_grocery),
    (receipt_id, 'Cleaning Supplies', 1, 28.50, 28.50, category_grocery),
    (receipt_id, 'Snacks Pack', 1, 15.80, 15.80, category_grocery),
    (receipt_id, 'Frozen Fish', 1, 26.50, 26.50, category_grocery);

    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'McDonald''s', 31.40, '2025-09-30 20:30:00', '2025-09-30 20:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Big Mac Meal', 1, 18.90, 18.90, category_food),
    (receipt_id, 'McFlurry', 1, 7.50, 7.50, category_food),
    (receipt_id, 'Apple Pie', 1, 5.00, 5.00, category_food);

END $$;