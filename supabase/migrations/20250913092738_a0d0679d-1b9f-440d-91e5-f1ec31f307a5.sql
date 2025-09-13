-- Drop the old users table that conflicts with auth.users
DROP TABLE IF EXISTS public.users CASCADE;