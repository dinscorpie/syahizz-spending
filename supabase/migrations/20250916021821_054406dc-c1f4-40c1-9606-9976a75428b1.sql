-- Create or replace the get_user_family_ids function
CREATE OR REPLACE FUNCTION public.get_user_family_ids(user_uuid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT family_id 
    FROM family_members 
    WHERE user_id = user_uuid
  );
$$;

-- Update the RLS policy for receipts to ensure family members can see all family receipts
DROP POLICY IF EXISTS "Family members can view family receipts" ON public.receipts;

CREATE POLICY "Family members can view family receipts" 
ON public.receipts 
FOR SELECT 
USING (
  (user_id::text = auth.uid()::text) OR 
  (family_id IS NOT NULL AND family_id = ANY(get_user_family_ids(auth.uid())))
);