-- 1. Permitir que admins criem user_profiles para outros usuários
CREATE POLICY "Admins can insert any profile" 
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- 2. Permitir que admins atualizem qualquer user_profile
CREATE POLICY "Admins can update any profile" 
ON user_profiles FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Adicionar colunas faltantes em user_empresa_permissions
ALTER TABLE public.user_empresa_permissions 
ADD COLUMN IF NOT EXISTS can_edit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete boolean DEFAULT false;

-- 4. Atualizar policy de empresas_terceiras para incluir usuários com permissão de criar clientes
DROP POLICY IF EXISTS "Users can view empresas if can create clientes" ON empresas_terceiras;
CREATE POLICY "Users can view empresas if can create clientes" 
ON empresas_terceiras FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid())
  OR has_system_permission(auth.uid(), 'clientes', 'create')
  OR has_system_permission(auth.uid(), 'empresas_terceiras', 'view')
  OR EXISTS (
    SELECT 1 FROM user_empresa_permissions uep
    WHERE uep.user_id = auth.uid() 
    AND uep.empresa_terceira_id = empresas_terceiras.id 
    AND uep.can_view = true
  )
);