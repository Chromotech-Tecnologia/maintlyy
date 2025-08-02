-- Criar tabelas para sistema de perfis e permissões

-- Tabela de perfis de usuário
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_admin BOOLEAN DEFAULT false
);

-- Tabela de permissões de clientes
CREATE TABLE public.user_client_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, cliente_id)
);

-- Tabela de permissões de senhas específicas
CREATE TABLE public.user_password_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  senha_id UUID NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, senha_id)
);

-- Tabela de permissões de grupos
CREATE TABLE public.user_group_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grupo_nome TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, grupo_nome)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_client_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_password_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_permissions ENABLE ROW LEVEL SECURITY;

-- Policies para user_profiles
CREATE POLICY "Users can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policies para user_client_permissions
CREATE POLICY "Admins can view all client permissions" 
ON public.user_client_permissions 
FOR SELECT 
USING (
  EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can manage client permissions" 
ON public.user_client_permissions 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Policies para user_password_permissions
CREATE POLICY "Admins can view all password permissions" 
ON public.user_password_permissions 
FOR SELECT 
USING (
  EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can manage password permissions" 
ON public.user_password_permissions 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Policies para user_group_permissions
CREATE POLICY "Admins can view all group permissions" 
ON public.user_group_permissions 
FOR SELECT 
USING (
  EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can manage group permissions" 
ON public.user_group_permissions 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Triggers para timestamps
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_client_permissions_updated_at
BEFORE UPDATE ON public.user_client_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_password_permissions_updated_at
BEFORE UPDATE ON public.user_password_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_group_permissions_updated_at
BEFORE UPDATE ON public.user_group_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();