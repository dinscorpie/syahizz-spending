-- Add explicit authentication requirement for profiles table
-- This prevents unauthenticated users from attempting to query user emails

-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles of family members" ON public.profiles;

-- Create a new SELECT policy that explicitly requires authentication
CREATE POLICY "Authenticated users can view profiles of family members" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1
      FROM family_members fm1,
           family_members fm2
      WHERE fm1.user_id = auth.uid() 
        AND fm2.user_id = profiles.id 
        AND fm1.family_id = fm2.family_id
    )
  )
);