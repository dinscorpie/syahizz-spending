-- Remove duplicate categories, keeping only the first occurrence of each name
DELETE FROM public.categories 
WHERE id NOT IN (
    SELECT DISTINCT ON (name) id 
    FROM public.categories 
    ORDER BY name, created_at ASC
);