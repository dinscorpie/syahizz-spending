-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create families table
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Family',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create family_members junction table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Add family_id and added_by to receipts table
ALTER TABLE public.receipts 
ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
ADD COLUMN added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view profiles of family members" ON public.profiles
FOR SELECT USING (
  id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.family_members fm1, public.family_members fm2
    WHERE fm1.user_id = auth.uid() 
    AND fm2.user_id = profiles.id
    AND fm1.family_id = fm2.family_id
  )
);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- Families policies
CREATE POLICY "Family members can view their families" ON public.families
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = families.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create families" ON public.families
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Family admins can update families" ON public.families
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = families.id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- Family members policies
CREATE POLICY "Family members can view family membership" ON public.family_members
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Family admins can manage members" ON public.family_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid() AND fm.role = 'admin'
  )
);

CREATE POLICY "Users can join families" ON public.family_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to create user profile automatically on signup
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();