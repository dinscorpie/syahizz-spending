-- Allow family admins to delete families
DROP POLICY IF EXISTS "Family admins can delete families" ON public.families;
CREATE POLICY "Family admins can delete families" 
ON public.families 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = families.id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Update the handle_new_user function to not create default family
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile only, no default family
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name')
  );
  
  RETURN NEW;
END;
$$;