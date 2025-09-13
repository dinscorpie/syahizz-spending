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
    
    -- Get existing categories
    SELECT id INTO category_food FROM categories WHERE name = 'Food & Dining' LIMIT 1;
    SELECT id INTO category_transport FROM categories WHERE name = 'Transportation' LIMIT 1;
    SELECT id INTO category_grocery FROM categories WHERE name = 'Groceries' LIMIT 1;
    SELECT id INTO category_entertainment FROM categories WHERE name = 'Entertainment' LIMIT 1;
    
    -- Create additional categories if they don't exist
    SELECT id INTO category_shopping FROM categories WHERE name = 'Shopping' LIMIT 1;
    IF category_shopping IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Shopping', 1) RETURNING id INTO category_shopping;
    END IF;
    
    SELECT id INTO category_healthcare FROM categories WHERE name = 'Healthcare' LIMIT 1;
    IF category_healthcare IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Healthcare', 1) RETURNING id INTO category_healthcare;
    END IF;
    
    SELECT id INTO category_utilities FROM categories WHERE name = 'Utilities & Bills' LIMIT 1;
    IF category_utilities IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Utilities & Bills', 1) RETURNING id INTO category_utilities;
    END IF;
    
    SELECT id INTO category_personal_care FROM categories WHERE name = 'Personal Care' LIMIT 1;
    IF category_personal_care IS NULL THEN
        INSERT INTO categories (name, level) VALUES ('Personal Care', 1) RETURNING id INTO category_personal_care;
    END IF;

    -- September 1, 2025 - Village Grocer
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Village Grocer', 156.80, '2025-09-01 10:30:00', '2025-09-01 10:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Fresh Salmon', 1, 45.90, 45.90, category_grocery),
    (receipt_id, 'Organic Vegetables', 1, 32.50, 32.50, category_grocery),
    (receipt_id, 'Premium Rice 10kg', 1, 28.90, 28.90, category_grocery);

    -- September 2, 2025 - Old Town White Coffee
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Old Town White Coffee', 28.50, '2025-09-02 12:45:00', '2025-09-02 12:45:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Hainanese Chicken Chop', 1, 18.90, 18.90, category_food),
    (receipt_id, 'White Coffee', 1, 6.50, 6.50, category_food),
    (receipt_id, 'Toast with Kaya', 1, 3.10, 3.10, category_food);

    -- September 3, 2025 - Shell Station
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Shell Station', 95.00, '2025-09-03 08:15:00', '2025-09-03 08:15:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Petrol RON97', 1, 95.00, 95.00, category_transport);

    -- September 4, 2025 - Guardian Pharmacy
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Guardian Pharmacy', 67.40, '2025-09-04 16:20:00', '2025-09-04 16:20:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Panadol Extra', 2, 12.90, 25.80, category_healthcare),
    (receipt_id, 'Vitamin C Tablets', 1, 18.50, 18.50, category_healthcare);

    -- September 5, 2025 - Restoran Wong Ah Wah
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Restoran Wong Ah Wah', 72.50, '2025-09-05 19:30:00', '2025-09-05 19:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Hokkien Mee', 2, 15.00, 30.00, category_food),
    (receipt_id, 'Char Kuey Teow', 1, 12.50, 12.50, category_food);

    -- September 6, 2025 - GSC Cinemas
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'GSC Cinemas', 58.00, '2025-09-06 20:00:00', '2025-09-06 20:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Movie Tickets', 2, 18.00, 36.00, category_entertainment),
    (receipt_id, 'Popcorn Large', 1, 12.00, 12.00, category_entertainment);

    -- September 7, 2025 - Uniqlo
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Uniqlo', 189.00, '2025-09-07 15:00:00', '2025-09-07 15:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Cotton T-Shirt', 2, 39.90, 79.80, category_shopping),
    (receipt_id, 'Jeans', 1, 109.20, 109.20, category_shopping);

    -- September 20, 2025 - McDonald's
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'McDonalds', 31.40, '2025-09-20 20:30:00', '2025-09-20 20:30:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Big Mac Meal', 1, 18.90, 18.90, category_food),
    (receipt_id, 'McFlurry', 1, 7.50, 7.50, category_food);

    -- September 25, 2025 - Tesco Extra
    INSERT INTO receipts (id, user_id, vendor_name, total_amount, date, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'Tesco Extra', 134.20, '2025-09-25 19:00:00', '2025-09-25 19:00:00')
    RETURNING id INTO receipt_id;
    
    INSERT INTO items (receipt_id, name, quantity, unit_price, total_price, category_id) VALUES
    (receipt_id, 'Beef Slices', 1, 28.90, 28.90, category_grocery),
    (receipt_id, 'Fish Fillets', 1, 22.50, 22.50, category_grocery),
    (receipt_id, 'Broccoli', 1, 6.90, 6.90, category_grocery),
    (receipt_id, 'Carrots', 1, 4.20, 4.20, category_grocery);

END $$;