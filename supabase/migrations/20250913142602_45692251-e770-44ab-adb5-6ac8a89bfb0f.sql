-- Fix infinite recursion in family_members policies by using security definer functions

-- Drop problematic policies
DROP POLICY IF EXISTS "Family members can view family membership" ON public.family_members;
DROP POLICY IF EXISTS "Family admins can manage members" ON public.family_members;

-- Create security definer function to check if user is in a family
CREATE OR REPLACE FUNCTION public.is_family_member(check_user_id uuid, check_family_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = check_user_id AND family_id = check_family_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create security definer function to check if user is family admin
CREATE OR REPLACE FUNCTION public.is_family_admin(check_user_id uuid, check_family_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = check_user_id AND family_id = check_family_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create security definer function to get user's family IDs
CREATE OR REPLACE FUNCTION public.get_user_family_ids(check_user_id uuid)
RETURNS uuid[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT family_id FROM public.family_members
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new simplified policies for family_members
CREATE POLICY "Users can view their own family membership" ON public.family_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Family admins can view all family members" ON public.family_members
FOR SELECT USING (
  public.is_family_admin(auth.uid(), family_id)
);

CREATE POLICY "Family admins can manage members" ON public.family_members
FOR ALL USING (
  public.is_family_admin(auth.uid(), family_id) OR user_id = auth.uid()
);

-- Update receipts policies to use the security definer function
DROP POLICY IF EXISTS "Family members can view family receipts" ON public.receipts;
DROP POLICY IF EXISTS "Family members can insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "Receipt creators and family admins can update receipts" ON public.receipts;
DROP POLICY IF EXISTS "Receipt creators and family admins can delete receipts" ON public.receipts;

CREATE POLICY "Family members can view family receipts" ON public.receipts
FOR SELECT USING (
  (user_id)::text = (auth.uid())::text OR
  (family_id = ANY(public.get_user_family_ids(auth.uid())))
);

CREATE POLICY "Family members can insert receipts" ON public.receipts
FOR INSERT WITH CHECK (
  (user_id)::text = (auth.uid())::text AND
  (family_id IS NULL OR family_id = ANY(public.get_user_family_ids(auth.uid())))
);

CREATE POLICY "Receipt creators and family admins can update receipts" ON public.receipts
FOR UPDATE USING (
  (user_id)::text = (auth.uid())::text OR
  (family_id IS NOT NULL AND public.is_family_admin(auth.uid(), family_id))
);

CREATE POLICY "Receipt creators and family admins can delete receipts" ON public.receipts
FOR DELETE USING (
  (user_id)::text = (auth.uid())::text OR
  (family_id IS NOT NULL AND public.is_family_admin(auth.uid(), family_id))
);