-- 1. Remover constraint de resource_type que está bloqueando novos tipos
ALTER TABLE public.user_system_permissions 
DROP CONSTRAINT IF EXISTS user_system_permissions_resource_type_check;

-- 2. Criar política para tipos_manutencao - permitir visualização para quem tem permissão no sistema
DROP POLICY IF EXISTS "Users can view tipos with system permission" ON public.tipos_manutencao;
CREATE POLICY "Users can view tipos with system permission"
ON public.tipos_manutencao FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid()) 
  OR has_system_permission(auth.uid(), 'tipos_manutencao', 'view')
  OR has_system_permission(auth.uid(), 'manutencoes', 'view')
);

-- 3. Criar política para equipes - permitir visualização para quem tem permissão no sistema
DROP POLICY IF EXISTS "Users can view equipes with system permission" ON public.equipes;
CREATE POLICY "Users can view equipes with system permission"
ON public.equipes FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid()) 
  OR has_system_permission(auth.uid(), 'equipes', 'view')
  OR has_system_permission(auth.uid(), 'manutencoes', 'view')
);

-- 4. Atualizar política de empresas_terceiras para incluir permissão de manutenção
DROP POLICY IF EXISTS "Users can view empresas with manutencao permission" ON public.empresas_terceiras;
CREATE POLICY "Users can view empresas with manutencao permission"
ON public.empresas_terceiras FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM user_empresa_permissions uep
    WHERE uep.user_id = auth.uid() 
    AND uep.empresa_terceira_id = empresas_terceiras.id 
    AND uep.can_view = true
  )
  OR has_system_permission(auth.uid(), 'empresas_terceiras', 'view')
  OR has_system_permission(auth.uid(), 'manutencoes', 'view')
);