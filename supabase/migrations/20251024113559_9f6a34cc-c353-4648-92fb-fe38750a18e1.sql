-- Enable Row Level Security on receipts_with_profiles view
ALTER VIEW public.receipts_with_profiles SET (security_invoker = on);

-- Note: With security_invoker = on, the view will use the permissions and RLS policies
-- of the user executing the query, not the view creator. This means it will automatically
-- inherit the RLS policies from the underlying receipts and profiles tables.
-- 
-- This ensures:
-- 1. Users can only see receipts they own or are family members of (from receipts table RLS)
-- 2. Users can only see profile data for themselves or family members (from profiles table RLS)
-- 
-- No additional RLS policies are needed on the view itself because security_invoker
-- makes the view respect the underlying table policies.