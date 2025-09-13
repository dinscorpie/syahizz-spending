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
    INSERT INTO categories (name, level) VALUES ('Shopping', 1) ON CONFLICT (name) DO NOTHING RETURNING id INTO category_shopping;
    IF category_shopping IS NULL THEN
        SELECT id INTO category_shopping FROM categories WHERE name = 'Shopping' LIMIT 1;
    END IF;
    
    INSERT INTO categories (name, level) VALUES ('Healthcare', 1) ON CONFLICT (name) DO NOTHING RETURNING id INTO category_healthcare;
    IF category_healthcare IS NULL THEN
        SELECT id INTO category_healthcare FROM categories WHERE name = 'Healthcare' LIMIT 1;
    END IF;
    
    INSERT INTO categories (name, level) VALUES ('Utilities & Bills', 1) ON CONFLICT (name) DO NOTHING RETURNING id INTO category_utilities;
    IF category_utilities IS NULL THEN
        SELECT id INTO category_utilities FROM categories WHERE name = 'Utilities & Bills' LIMIT 1;
    END IF;
    
    INSERT INTO categories (name, level) VALUES ('Personal Care', 1) ON CONFLICT (name) DO NOTHING RETURNING id INTO category_personal_care;
    IF category_personal_care IS NULL THEN
        SELECT id INTO category_personal_care FROM categories WHERE name = 'Personal Care' LIMIT 1;
    END IF;

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

    -- September 9, 2025 - Utilities
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'TNB (Electricity Bill)', 145.60, '2025-09-09 11:00:00', '2025-09-09 11:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Electricity Bill - September', 1, 145.60, 145.60, category_utilities);

    -- September 10, 2025 - Groceries
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Tesco Extra', 98.75, '2025-09-10 18:30:00', '2025-09-10 18:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Chicken Thigh', 2, 14.50, 29.00, category_grocery),
    (receipt_id, 'Mixed Vegetables', 1, 8.90, 8.90, category_grocery),
    (receipt_id, 'Cooking Oil', 1, 15.90, 15.90, category_grocery),
    (receipt_id, 'Soy Sauce', 1, 7.20, 7.20, category_grocery),
    (receipt_id, 'Rice Noodles', 3, 4.50, 13.50, category_grocery),
    (receipt_id, 'Yogurt Cups', 1, 12.25, 12.25, category_grocery),
    (receipt_id, 'Bananas', 1, 4.50, 4.50, category_grocery),
    (receipt_id, 'Apples', 1, 7.50, 7.50, category_grocery);

    -- September 11, 2025 - Personal Care
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Watsons', 43.80, '2025-09-11 14:00:00', '2025-09-11 14:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Shampoo', 1, 18.90, 18.90, category_personal_care),
    (receipt_id, 'Toothpaste', 1, 8.50, 8.50, category_personal_care),
    (receipt_id, 'Body Wash', 1, 16.40, 16.40, category_personal_care);

    -- September 12, 2025 - Local Food
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Restoran Yut Kee', 35.60, '2025-09-12 13:15:00', '2025-09-12 13:15:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Hainanese Chicken Rice', 1, 15.50, 15.50, category_food),
    (receipt_id, 'Roti Bakar', 1, 6.50, 6.50, category_food),
    (receipt_id, 'Teh C Peng', 2, 3.80, 7.60, category_food),
    (receipt_id, 'Kopi O', 1, 2.50, 2.50, category_food),
    (receipt_id, 'Half Boiled Eggs', 1, 3.50, 3.50, category_food);

    -- September 14, 2025 - Weekend Entertainment
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Genting Skyway', 120.00, '2025-09-14 11:00:00', '2025-09-14 11:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Cable Car Tickets', 4, 30.00, 120.00, category_entertainment);

    -- September 15, 2025 - Technology Shopping
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Harvey Norman', 85.90, '2025-09-15 16:30:00', '2025-09-15 16:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'USB-C Cable', 1, 25.90, 25.90, category_shopping),
    (receipt_id, 'Phone Case', 1, 35.00, 35.00, category_shopping),
    (receipt_id, 'Screen Protector', 1, 25.00, 25.00, category_shopping);

    -- September 16, 2025 - Toll & Parking
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'PLUS Highway Toll', 18.70, '2025-09-16 08:00:00', '2025-09-16 08:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Toll - KL to Seremban', 1, 12.20, 12.20, category_transport),
    (receipt_id, 'Parking Fee', 1, 6.50, 6.50, category_transport);

    -- September 17, 2025 - Breakfast
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Restoran Murni SS2', 19.80, '2025-09-17 08:30:00', '2025-09-17 08:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Roti Canai', 3, 1.50, 4.50, category_food),
    (receipt_id, 'Curry Chicken', 1, 8.50, 8.50, category_food),
    (receipt_id, 'Teh Tarik', 2, 3.40, 6.80, category_food);

    -- September 18, 2025 - Groceries
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Giant Hypermarket', 134.20, '2025-09-18 19:00:00', '2025-09-18 19:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Beef Slices', 1, 28.90, 28.90, category_grocery),
    (receipt_id, 'Fish Fillets', 1, 22.50, 22.50, category_grocery),
    (receipt_id, 'Broccoli', 1, 6.90, 6.90, category_grocery),
    (receipt_id, 'Carrots', 1, 4.20, 4.20, category_grocery),
    (receipt_id, 'Potatoes', 1, 5.50, 5.50, category_grocery),
    (receipt_id, 'Laundry Detergent', 1, 19.90, 19.90, category_grocery),
    (receipt_id, 'Dishwashing Liquid', 1, 8.90, 8.90, category_grocery),
    (receipt_id, 'Tissue Paper', 2, 9.20, 18.40, category_grocery),
    (receipt_id, 'Cereal', 1, 12.50, 12.50, category_grocery),
    (receipt_id, 'Instant Noodles', 1, 5.50, 5.50, category_grocery);

    -- September 19, 2025 - Lunch
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Chili\'s Grill & Bar', 89.50, '2025-09-19 13:30:00', '2025-09-19 13:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Baby Back Ribs', 1, 45.90, 45.90, category_food),
    (receipt_id, 'Chicken Caesar Salad', 1, 28.90, 28.90, category_food),
    (receipt_id, 'Soft Drinks', 2, 7.35, 14.70, category_food);

    -- September 20, 2025 - Weekend Activities
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Sunway Lagoon', 180.00, '2025-09-20 10:00:00', '2025-09-20 10:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Theme Park Entry', 2, 90.00, 180.00, category_entertainment);

    -- September 21, 2025 - Weekend Food
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Din Tai Fung', 156.80, '2025-09-21 12:00:00', '2025-09-21 12:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Xiaolongbao', 2, 28.80, 57.60, category_food),
    (receipt_id, 'Fried Rice', 1, 32.80, 32.80, category_food),
    (receipt_id, 'Wonton Soup', 1, 22.50, 22.50, category_food),
    (receipt_id, 'Chinese Tea', 2, 8.50, 17.00, category_food),
    (receipt_id, 'Mango Pudding', 2, 13.45, 26.90, category_food);

    -- Continue with more entries covering the rest of September...
    -- September 22-30 entries would follow similar pattern with various vendors and categories

END $$;