-- Update receipts policies to work with families
-- First drop old policies
DROP POLICY IF EXISTS "Users can view their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON public.receipts;

-- Create new family-based policies
CREATE POLICY "Family members can view family receipts" ON public.receipts
FOR SELECT USING (
  (user_id)::text = (auth.uid())::text OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = receipts.family_id AND (fm.user_id)::text = (auth.uid())::text
  )
);

CREATE POLICY "Family members can insert receipts" ON public.receipts
FOR INSERT WITH CHECK (
  (user_id)::text = (auth.uid())::text AND
  (family_id IS NULL OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = receipts.family_id AND (fm.user_id)::text = (auth.uid())::text
  ))
);

CREATE POLICY "Receipt creators and family admins can update receipts" ON public.receipts
FOR UPDATE USING (
  (user_id)::text = (auth.uid())::text OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = receipts.family_id AND (fm.user_id)::text = (auth.uid())::text AND fm.role = 'admin'
  )
);

CREATE POLICY "Receipt creators and family admins can delete receipts" ON public.receipts
FOR DELETE USING (
  (user_id)::text = (auth.uid())::text OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = receipts.family_id AND (fm.user_id)::text = (auth.uid())::text AND fm.role = 'admin'
  )
);

-- Update existing receipts to have family_id and added_by
UPDATE public.receipts 
SET 
  added_by = (user_id)::uuid,
  family_id = (
    SELECT fm.family_id 
    FROM public.family_members fm 
    WHERE (fm.user_id)::text = (receipts.user_id)::text 
    LIMIT 1
  )
WHERE added_by IS NULL;