
-- 1. Helper function: check if admin owns a user (via permission_profile ownership)
CREATE OR REPLACE FUNCTION public.admin_owns_user(_admin_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = _target_user_id
    AND up.permission_profile_id IN (
      SELECT id FROM public.permission_profiles pp WHERE pp.user_id = _admin_id
    )
  );
$$;

-- 2. Fix user_profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view tenant profiles" ON public.user_profiles
FOR SELECT TO public
USING (
  auth.uid() = user_id
  OR (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
CREATE POLICY "Admins can update tenant profiles" ON public.user_profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Admins can insert any profile" ON public.user_profiles;
CREATE POLICY "Admins can insert tenant profiles" ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- 3. Fix clientes - remove broad admin access
DROP POLICY IF EXISTS "Users can view permitted clientes" ON public.clientes;
CREATE POLICY "Users can view permitted clientes" ON public.clientes
FOR SELECT TO public
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_client_permissions ucp
    WHERE ucp.user_id = auth.uid() AND ucp.cliente_id = clientes.id AND ucp.can_view = true
  )
);

-- 4. Fix cofre_senhas - remove broad admin access
DROP POLICY IF EXISTS "Users can view cofre_senhas with permissions" ON public.cofre_senhas;
CREATE POLICY "Users can view cofre_senhas with permissions" ON public.cofre_senhas
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_client_permissions ucp
    WHERE ucp.user_id = auth.uid() AND ucp.cliente_id = cofre_senhas.cliente_id AND ucp.can_view = true
  )
  OR EXISTS (
    SELECT 1 FROM user_password_permissions upp
    WHERE upp.user_id = auth.uid() AND upp.senha_id = cofre_senhas.id AND upp.can_view = true
  )
);

DROP POLICY IF EXISTS "Users can update cofre_senhas by client permission" ON public.cofre_senhas;
CREATE POLICY "Users can update cofre_senhas by client permission" ON public.cofre_senhas
FOR UPDATE TO public
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_client_permissions ucp
    WHERE ucp.user_id = auth.uid() AND ucp.cliente_id = cofre_senhas.cliente_id AND ucp.can_edit = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_client_permissions ucp
    WHERE ucp.user_id = auth.uid() AND ucp.cliente_id = cofre_senhas.cliente_id AND ucp.can_edit = true
  )
);

DROP POLICY IF EXISTS "Users can delete cofre_senhas by client permission or admin" ON public.cofre_senhas;
CREATE POLICY "Users can delete cofre_senhas by permission" ON public.cofre_senhas
FOR DELETE TO public
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_client_permissions ucp
    WHERE ucp.user_id = auth.uid() AND ucp.cliente_id = cofre_senhas.cliente_id AND ucp.can_delete = true
  )
);

-- 5. Fix manutencoes - remove broad admin access
DROP POLICY IF EXISTS "Users can view manutencoes by permission" ON public.manutencoes;
CREATE POLICY "Users can view manutencoes by permission" ON public.manutencoes
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_client_permissions ucp
    WHERE ucp.user_id = auth.uid() AND ucp.cliente_id = manutencoes.cliente_id AND ucp.can_view = true
  )
);

-- 6. Fix empresas_terceiras - remove broad admin access
DROP POLICY IF EXISTS "Users can view empresas by permission" ON public.empresas_terceiras;
DROP POLICY IF EXISTS "Users can view empresas if can create clientes" ON public.empresas_terceiras;
DROP POLICY IF EXISTS "Users can view empresas with manutencao permission" ON public.empresas_terceiras;
DROP POLICY IF EXISTS "Users can view their own empresas_terceiras" ON public.empresas_terceiras;
CREATE POLICY "Users can view empresas scoped" ON public.empresas_terceiras
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_empresa_permissions uep
    WHERE uep.user_id = auth.uid() AND uep.empresa_terceira_id = empresas_terceiras.id AND uep.can_view = true
  )
  OR has_system_permission(auth.uid(), 'empresas_terceiras', 'view')
  OR has_system_permission(auth.uid(), 'clientes', 'create')
  OR has_system_permission(auth.uid(), 'manutencoes', 'view')
);

-- 7. Fix equipes - remove broad admin access
DROP POLICY IF EXISTS "Users can view equipes with system permission" ON public.equipes;
DROP POLICY IF EXISTS "Users can view their own equipes" ON public.equipes;
CREATE POLICY "Users can view equipes scoped" ON public.equipes
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_system_permission(auth.uid(), 'equipes', 'view')
  OR has_system_permission(auth.uid(), 'manutencoes', 'view')
);

-- 8. Fix tipos_manutencao - remove broad admin access
DROP POLICY IF EXISTS "Users can view tipos with system permission" ON public.tipos_manutencao;
DROP POLICY IF EXISTS "All authenticated users can view tipos_manutencao" ON public.tipos_manutencao;
DROP POLICY IF EXISTS "Users can view their own tipos_manutencao" ON public.tipos_manutencao;
CREATE POLICY "Users can view tipos scoped" ON public.tipos_manutencao
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_system_permission(auth.uid(), 'tipos_manutencao', 'view')
  OR has_system_permission(auth.uid(), 'manutencoes', 'view')
);

-- 9. Fix permission_profiles - scope admin CRUD to own profiles
DROP POLICY IF EXISTS "Admins can manage permission profiles" ON public.permission_profiles;
CREATE POLICY "Admins can manage own permission profiles" ON public.permission_profiles
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. Fix user_client_permissions - scope to tenant
DROP POLICY IF EXISTS "Admins can manage client permissions" ON public.user_client_permissions;
DROP POLICY IF EXISTS "Admins can manage all user client permissions" ON public.user_client_permissions;
DROP POLICY IF EXISTS "Admins can view all client permissions" ON public.user_client_permissions;
DROP POLICY IF EXISTS "Admins can view all user client permissions" ON public.user_client_permissions;
DROP POLICY IF EXISTS "Admins can update all user client permissions" ON public.user_client_permissions;
DROP POLICY IF EXISTS "Admins can delete all user client permissions" ON public.user_client_permissions;
CREATE POLICY "Admins can manage tenant client permissions" ON public.user_client_permissions
FOR ALL TO public
USING (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id))
WITH CHECK (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id));

-- 11. Fix user_system_permissions - scope to tenant
DROP POLICY IF EXISTS "Admins can manage all system permissions" ON public.user_system_permissions;
DROP POLICY IF EXISTS "Admins can manage system permissions delete" ON public.user_system_permissions;
DROP POLICY IF EXISTS "Admins can manage system permissions insert" ON public.user_system_permissions;
DROP POLICY IF EXISTS "Admins can manage system permissions update" ON public.user_system_permissions;
CREATE POLICY "Admins can manage tenant system permissions" ON public.user_system_permissions
FOR ALL TO authenticated
USING (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id))
WITH CHECK (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id));

-- 12. Fix user_password_permissions - scope to tenant
DROP POLICY IF EXISTS "Admins can manage password permissions" ON public.user_password_permissions;
DROP POLICY IF EXISTS "Admins can view all password permissions" ON public.user_password_permissions;
CREATE POLICY "Admins can manage tenant password permissions" ON public.user_password_permissions
FOR ALL TO public
USING (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id))
WITH CHECK (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id));

-- 13. Fix user_group_permissions - scope to tenant
DROP POLICY IF EXISTS "Admins can manage group permissions" ON public.user_group_permissions;
DROP POLICY IF EXISTS "Admins can view all group permissions" ON public.user_group_permissions;
CREATE POLICY "Admins can manage tenant group permissions" ON public.user_group_permissions
FOR ALL TO public
USING (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id))
WITH CHECK (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id));

-- 14. Fix user_empresa_permissions - scope to tenant
DROP POLICY IF EXISTS "Admins can manage empresa permissions" ON public.user_empresa_permissions;
CREATE POLICY "Admins can manage tenant empresa permissions" ON public.user_empresa_permissions
FOR ALL TO authenticated
USING (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id))
WITH CHECK (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id));

-- 15. Fix user_profile_data - scope to tenant
DROP POLICY IF EXISTS "Admins can view all profile data" ON public.user_profile_data;
DROP POLICY IF EXISTS "Admins can update all profile data" ON public.user_profile_data;
DROP POLICY IF EXISTS "Admins can insert profile data for any user" ON public.user_profile_data;
CREATE POLICY "Admins can view tenant profile data" ON public.user_profile_data
FOR SELECT TO public
USING (auth.uid() = user_id OR (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id)));
CREATE POLICY "Admins can update tenant profile data" ON public.user_profile_data
FOR UPDATE TO public
USING (auth.uid() = user_id OR (is_admin(auth.uid()) AND public.admin_owns_user(auth.uid(), user_id)));
CREATE POLICY "Admins can insert tenant profile data" ON public.user_profile_data
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));
