-- First, update items to point to the canonical category (the one we want to keep)
WITH canonical_categories AS (
    SELECT DISTINCT ON (name) id as canonical_id, name
    FROM public.categories 
    ORDER BY name, created_at ASC
),
duplicate_categories AS (
    SELECT c.id as duplicate_id, cc.canonical_id
    FROM public.categories c
    JOIN canonical_categories cc ON c.name = cc.name
    WHERE c.id != cc.canonical_id
)
UPDATE public.items 
SET category_id = dc.canonical_id
FROM duplicate_categories dc
WHERE items.category_id = dc.duplicate_id;

-- Now remove the duplicate categories
DELETE FROM public.categories 
WHERE id NOT IN (
    SELECT DISTINCT ON (name) id 
    FROM public.categories 
    ORDER BY name, created_at ASC
);