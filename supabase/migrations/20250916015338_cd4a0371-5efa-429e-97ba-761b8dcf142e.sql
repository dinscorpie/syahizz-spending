-- Fix family_invitations RLS policy for declining invitations
-- The current policy only allows updates when status is 'pending', but we need to allow changing it to 'declined'

DROP POLICY IF EXISTS "Invited users can update their own invitations" ON public.family_invitations;

CREATE POLICY "Invited users can update their own invitations" ON public.family_invitations
FOR UPDATE USING (
  invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  AND status IN ('declined', 'accepted')
);

-- Add RLS policy for family members to leave families
CREATE POLICY "Users can leave families" ON public.family_members
FOR DELETE USING (
  user_id = auth.uid()
);

-- Add RLS policy for admins to remove other members
CREATE POLICY "Family admins can remove members" ON public.family_members  
FOR DELETE USING (
  is_family_admin(auth.uid(), family_id)
  AND user_id != auth.uid() -- Prevent self-removal through admin powers
);