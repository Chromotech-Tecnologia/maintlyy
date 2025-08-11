-- Adicionar colunas can_create e can_delete na tabela user_client_permissions
ALTER TABLE public.user_client_permissions 
ADD COLUMN IF NOT EXISTS can_create boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete boolean DEFAULT false;

-- Criar tabela para edição de perfis de usuário (dados adicionais além do auth)
CREATE TABLE IF NOT EXISTS public.user_profile_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  department text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS na tabela user_profile_data
ALTER TABLE public.user_profile_data ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profile_data
CREATE POLICY "Users can view their own profile data"
ON public.user_profile_data
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile data"
ON public.user_profile_data
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile data"
ON public.user_profile_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins podem ver e editar todos os perfis
CREATE POLICY "Admins can view all profile data"
ON public.user_profile_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update all profile data"
ON public.user_profile_data
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can insert profile data for any user"
ON public.user_profile_data
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_profile_data_updated_at
  BEFORE UPDATE ON public.user_profile_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();