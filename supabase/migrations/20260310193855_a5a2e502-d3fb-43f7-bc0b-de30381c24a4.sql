
-- Add super admin and tenant management columns
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_start date;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_permanent boolean DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create a security definer function for super admin check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.user_profiles WHERE user_id = _user_id), false);
$$;

-- RLS: Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON user_profiles FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

-- RLS: Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
ON user_profiles FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()));
