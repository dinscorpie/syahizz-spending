-- Insert Pets parent category
INSERT INTO public.categories (id, name, icon, color, level, parent_id)
VALUES ('pets', 'Pets', '🐾', '#f59e0b', 1, NULL);

-- Insert Pets subcategories
INSERT INTO public.categories (id, name, icon, color, level, parent_id)
VALUES 
  ('pets-food', 'Pet Food', '🦴', '#f59e0b', 2, 'pets'),
  ('pets-supplies', 'Pet Supplies', '🧸', '#f59e0b', 2, 'pets'),
  ('pets-veterinary', 'Veterinary', '💉', '#f59e0b', 2, 'pets'),
  ('pets-grooming', 'Pet Grooming', '✂️', '#f59e0b', 2, 'pets');