-- Create an RPC to create a family and add the creator as admin in one transaction
CREATE OR REPLACE FUNCTION public.create_family_with_admin(family_name text)
RETURNS public.families
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_family public.families%ROWTYPE;
BEGIN
  -- Create the family owned by the current user
  INSERT INTO public.families (name, created_by)
  VALUES (family_name, auth.uid())
  RETURNING * INTO new_family;

  -- Add the current user as admin member (ignore if already exists)
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family.id, auth.uid(), 'admin')
  ON CONFLICT DO NOTHING;

  RETURN new_family;
END;
$$;
