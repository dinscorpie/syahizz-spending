-- Add RLS policy so family members can view items belonging to receipts of their families
DROP POLICY IF EXISTS "Family members can view items of family receipts" ON public.items;

CREATE POLICY "Family members can view items of family receipts"
ON public.items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.receipts r
    WHERE r.id::text = items.receipt_id::text
      AND r.family_id IS NOT NULL
      AND r.family_id = ANY(public.get_user_family_ids(auth.uid()))
  )
);