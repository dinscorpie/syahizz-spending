-- Fix security issue: Set search_path for the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name')
  );
  
  -- Create a family for the user
  INSERT INTO public.families (name, created_by)
  VALUES ('My Family', NEW.id)
  RETURNING id INTO new_family_id;
  
  -- Add user as admin of their family
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;