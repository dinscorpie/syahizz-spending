-- Add explicit authentication requirement for profiles table
-- This prevents unauthenticated users from attempting to query user emails

-- Drop existing policies to recreate with proper authentication checks
DROP POLICY IF EXISTS "Users can view profiles of family members" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles of family members" ON public.profiles;

-- Create a new SELECT policy that explicitly requires authentication
-- Using TO authenticated ensures only authenticated users can execute this policy
CREATE POLICY "Authenticated users can view family member profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() 
  OR EXISTS (
    SELECT 1
    FROM family_members fm1,
         family_members fm2
    WHERE fm1.user_id = auth.uid() 
      AND fm2.user_id = profiles.id 
      AND fm1.family_id = fm2.family_id
  )
);