
-- Insert admin permission profile
INSERT INTO public.permission_profiles (
  nome_perfil, 
  system_permissions, 
  is_admin_profile, 
  user_id
) VALUES (
  'Administrador',
  '{
    "manutencoes": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "dashboard": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "empresas_terceiras": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "equipes": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "tipos_manutencao": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "clientes": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "cofre_senhas": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "perfis_usuarios": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true},
    "permissoes": {"can_view": true, "can_view_details": true, "can_edit": true, "can_create": true, "can_delete": true}
  }'::jsonb,
  true,
  '0092ffb5-7e25-4efc-9e49-817e3fa908bb'
);

-- Assign admin profile to alexandre@chromotech.com.br
UPDATE public.user_profiles 
SET permission_profile_id = (
  SELECT id FROM public.permission_profiles WHERE nome_perfil = 'Administrador' AND is_admin_profile = true LIMIT 1
)
WHERE user_id = '0092ffb5-7e25-4efc-9e49-817e3fa908bb';
