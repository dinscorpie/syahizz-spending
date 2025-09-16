-- Add invited_by_name column to family_invitations table
ALTER TABLE public.family_invitations 
ADD COLUMN invited_by_name TEXT;