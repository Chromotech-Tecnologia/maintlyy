-- Adicionar permissões para outras entidades do sistema
CREATE TABLE public.user_system_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('manutencoes', 'dashboard', 'empresas_terceiras', 'equipes', 'tipos_manutencao')),
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_type)
);

-- Enable RLS
ALTER TABLE public.user_system_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage system permissions" 
ON public.user_system_permissions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_profiles.user_id = auth.uid() 
  AND user_profiles.is_admin = true
));

-- Trigger para updated_at
CREATE TRIGGER update_user_system_permissions_updated_at
BEFORE UPDATE ON public.user_system_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar permissões de sistema
CREATE OR REPLACE FUNCTION public.has_system_permission(
  _user_id UUID, 
  _resource TEXT, 
  _permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_system_permissions
    WHERE user_id = _user_id 
    AND resource_type = _resource
    AND (
      (_permission = 'view' AND can_view = true) OR
      (_permission = 'edit' AND can_edit = true) OR
      (_permission = 'create' AND can_create = true) OR
      (_permission = 'delete' AND can_delete = true)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;