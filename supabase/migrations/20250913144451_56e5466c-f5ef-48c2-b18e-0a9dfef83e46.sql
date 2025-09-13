-- Create family_invitations table
CREATE TABLE public.family_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for family_invitations
CREATE POLICY "Family admins can create invitations" 
ON public.family_invitations 
FOR INSERT 
WITH CHECK (
  is_family_admin(auth.uid(), family_id) AND 
  invited_by = auth.uid()
);

CREATE POLICY "Family admins can view their family invitations" 
ON public.family_invitations 
FOR SELECT 
USING (is_family_admin(auth.uid(), family_id));

CREATE POLICY "Invited users can view their own invitations" 
ON public.family_invitations 
FOR SELECT 
USING (
  invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Invited users can update their own invitations" 
ON public.family_invitations 
FOR UPDATE 
USING (
  invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) AND 
  status = 'pending'
);

CREATE POLICY "Family admins can delete their family invitations" 
ON public.family_invitations 
FOR DELETE 
USING (is_family_admin(auth.uid(), family_id));

-- Create index for better performance
CREATE INDEX idx_family_invitations_email ON public.family_invitations(invited_email);
CREATE INDEX idx_family_invitations_family_id ON public.family_invitations(family_id);

-- Create function to handle invitation acceptance
CREATE OR REPLACE FUNCTION public.accept_family_invitation(invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM public.profiles WHERE id = auth.uid();
  
  -- Get invitation details
  SELECT * INTO invitation_record 
  FROM public.family_invitations 
  WHERE id = invitation_id 
    AND invited_email = user_email 
    AND status = 'pending' 
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Add user to family
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (invitation_record.family_id, auth.uid(), 'member');
  
  -- Update invitation status
  UPDATE public.family_invitations 
  SET status = 'accepted' 
  WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$;