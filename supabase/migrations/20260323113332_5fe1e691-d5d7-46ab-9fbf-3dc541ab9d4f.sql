
-- Function to get the tenant owner (admin) user_id for any user
CREATE OR REPLACE FUNCTION public.get_tenant_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN up.is_admin = true THEN up.user_id
    ELSE COALESCE(pp.user_id, up.user_id)
  END
  FROM public.user_profiles up
  LEFT JOIN public.permission_profiles pp ON pp.id = up.permission_profile_id
  WHERE up.user_id = _user_id
  LIMIT 1
$$;

-- Fix equipes: scope has_system_permission to same tenant
DROP POLICY IF EXISTS "Users can view equipes scoped" ON public.equipes;
CREATE POLICY "Users can view equipes scoped" ON public.equipes
FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    (has_system_permission(auth.uid(), 'equipes', 'view') OR has_system_permission(auth.uid(), 'manutencoes', 'view'))
    AND user_id = get_tenant_owner_id(auth.uid())
  )
);

-- Fix tipos_manutencao: scope to same tenant
DROP POLICY IF EXISTS "Users can view tipos scoped" ON public.tipos_manutencao;
CREATE POLICY "Users can view tipos scoped" ON public.tipos_manutencao
FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    (has_system_permission(auth.uid(), 'tipos_manutencao', 'view') OR has_system_permission(auth.uid(), 'manutencoes', 'view'))
    AND user_id = get_tenant_owner_id(auth.uid())
  )
);

-- Fix empresas_terceiras: scope to same tenant
DROP POLICY IF EXISTS "Users can view empresas scoped" ON public.empresas_terceiras;
CREATE POLICY "Users can view empresas scoped" ON public.empresas_terceiras
FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id)
  OR (EXISTS (
    SELECT 1 FROM user_empresa_permissions uep
    WHERE uep.user_id = auth.uid() AND uep.empresa_terceira_id = empresas_terceiras.id AND uep.can_view = true
  ))
  OR (
    (has_system_permission(auth.uid(), 'empresas_terceiras', 'view')
     OR has_system_permission(auth.uid(), 'clientes', 'create')
     OR has_system_permission(auth.uid(), 'manutencoes', 'view'))
    AND empresas_terceiras.user_id = get_tenant_owner_id(auth.uid())
  )
);

-- Fix monitored_urls: scope to same tenant
DROP POLICY IF EXISTS "Sub-users can view monitored_urls" ON public.monitored_urls;
CREATE POLICY "Sub-users can view monitored_urls" ON public.monitored_urls
FOR SELECT TO authenticated
USING (
  has_system_permission(auth.uid(), 'monitoramento', 'view')
  AND user_id = get_tenant_owner_id(auth.uid())
);
