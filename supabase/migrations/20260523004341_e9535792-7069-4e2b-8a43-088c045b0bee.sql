-- Add tenant-wide visibility policies so admins see records created by their team members and vice-versa

-- CLIENTES
DROP POLICY IF EXISTS "Tenant members can view clientes" ON public.clientes;
CREATE POLICY "Tenant members can view clientes"
ON public.clientes FOR SELECT
TO authenticated
USING (public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id));

-- EMPRESAS_TERCEIRAS
DROP POLICY IF EXISTS "Tenant members can view empresas" ON public.empresas_terceiras;
CREATE POLICY "Tenant members can view empresas"
ON public.empresas_terceiras FOR SELECT
TO authenticated
USING (public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id));

-- COFRE_SENHAS
DROP POLICY IF EXISTS "Tenant members can view cofre_senhas" ON public.cofre_senhas;
CREATE POLICY "Tenant members can view cofre_senhas"
ON public.cofre_senhas FOR SELECT
TO authenticated
USING (public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id));

-- MANUTENCOES
DROP POLICY IF EXISTS "Tenant members can view manutencoes" ON public.manutencoes;
CREATE POLICY "Tenant members can view manutencoes"
ON public.manutencoes FOR SELECT
TO authenticated
USING (public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id));

-- MANUTENCAO_EQUIPES (visibility through manutencao tenant)
DROP POLICY IF EXISTS "Tenant members can view manutencao_equipes" ON public.manutencao_equipes;
CREATE POLICY "Tenant members can view manutencao_equipes"
ON public.manutencao_equipes FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.manutencoes m
  WHERE m.id = manutencao_equipes.manutencao_id
    AND public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(m.user_id)
));