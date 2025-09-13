-- Insert common expense categories
INSERT INTO categories (name, level, parent_id, color, icon) VALUES
-- Level 1 categories (main categories)
('Food & Dining', 1, NULL, '#ff6b6b', '🍽️'),
('Transportation', 1, NULL, '#4ecdc4', '🚗'),
('Shopping', 1, NULL, '#45b7d1', '🛍️'),
('Entertainment', 1, NULL, '#96ceb4', '🎬'),
('Healthcare', 1, NULL, '#ffeaa7', '🏥'),
('Utilities', 1, NULL, '#dda0dd', '💡'),
('Housing', 1, NULL, '#98d8c8', '🏠'),
('Personal Care', 1, NULL, '#f7dc6f', '💄'),
('Education', 1, NULL, '#bb8fce', '📚'),
('Travel', 1, NULL, '#85c1e9', '✈️'),
('Business', 1, NULL, '#f8c471', '💼'),
('Other', 1, NULL, '#aab7b8', '📦');

-- Get the parent category IDs for level 2 subcategories
INSERT INTO categories (name, level, parent_id, color, icon) VALUES
-- Food & Dining subcategories
('Restaurants', 2, (SELECT id FROM categories WHERE name = 'Food & Dining' AND level = 1), '#ff6b6b', '🍽️'),
('Fast Food', 2, (SELECT id FROM categories WHERE name = 'Food & Dining' AND level = 1), '#ff6b6b', '🍟'),
('Groceries', 2, (SELECT id FROM categories WHERE name = 'Food & Dining' AND level = 1), '#ff6b6b', '🛒'),
('Coffee & Tea', 2, (SELECT id FROM categories WHERE name = 'Food & Dining' AND level = 1), '#ff6b6b', '☕'),

-- Transportation subcategories
('Gas', 2, (SELECT id FROM categories WHERE name = 'Transportation' AND level = 1), '#4ecdc4', '⛽'),
('Public Transport', 2, (SELECT id FROM categories WHERE name = 'Transportation' AND level = 1), '#4ecdc4', '🚌'),
('Taxi & Rideshare', 2, (SELECT id FROM categories WHERE name = 'Transportation' AND level = 1), '#4ecdc4', '🚕'),
('Car Maintenance', 2, (SELECT id FROM categories WHERE name = 'Transportation' AND level = 1), '#4ecdc4', '🔧'),

-- Shopping subcategories
('Clothing', 2, (SELECT id FROM categories WHERE name = 'Shopping' AND level = 1), '#45b7d1', '👕'),
('Electronics', 2, (SELECT id FROM categories WHERE name = 'Shopping' AND level = 1), '#45b7d1', '📱'),
('Home & Garden', 2, (SELECT id FROM categories WHERE name = 'Shopping' AND level = 1), '#45b7d1', '🏡'),
('Books & Media', 2, (SELECT id FROM categories WHERE name = 'Shopping' AND level = 1), '#45b7d1', '📖'),

-- Entertainment subcategories
('Movies & Shows', 2, (SELECT id FROM categories WHERE name = 'Entertainment' AND level = 1), '#96ceb4', '🎬'),
('Sports & Recreation', 2, (SELECT id FROM categories WHERE name = 'Entertainment' AND level = 1), '#96ceb4', '⚽'),
('Hobbies', 2, (SELECT id FROM categories WHERE name = 'Entertainment' AND level = 1), '#96ceb4', '🎨'),
('Subscriptions', 2, (SELECT id FROM categories WHERE name = 'Entertainment' AND level = 1), '#96ceb4', '📺');