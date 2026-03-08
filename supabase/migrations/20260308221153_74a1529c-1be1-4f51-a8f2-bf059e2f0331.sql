
-- Create permission_profiles table
CREATE TABLE public.permission_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_perfil text NOT NULL,
  system_permissions jsonb NOT NULL DEFAULT '{}',
  client_permissions_mode text NOT NULL DEFAULT 'none',
  empresa_permissions_mode text NOT NULL DEFAULT 'none',
  is_admin_profile boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add permission_profile_id to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN permission_profile_id uuid REFERENCES public.permission_profiles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for permission_profiles
CREATE POLICY "Admins can manage permission profiles"
ON public.permission_profiles FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view permission profiles"
ON public.permission_profiles FOR SELECT TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_permission_profiles_updated_at
  BEFORE UPDATE ON public.permission_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
