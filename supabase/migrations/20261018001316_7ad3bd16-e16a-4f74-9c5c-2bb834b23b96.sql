CREATE OR REPLACE FUNCTION public.current_user_is_tenant_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT EXISTS (
   SELECT 1 FROM public.user_profiles up
   LEFT JOIN public.permission_profiles pp ON pp.id = up.permission_profile_id
   WHERE up.user_id = auth.uid()
     AND (COALESCE(up.is_admin, false) OR COALESCE(pp.is_admin_profile, false))
 );
$$;
REVOKE ALL ON FUNCTION public.current_user_is_tenant_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_tenant_admin() TO authenticated, service_role;

CREATE POLICY "Tenant admins share company access"
ON public.empresas_terceiras FOR ALL TO authenticated
USING (public.current_user_is_tenant_admin() AND public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id))
WITH CHECK (public.current_user_is_tenant_admin() AND public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id));

CREATE POLICY "Tenant admins share client access"
ON public.clientes FOR ALL TO authenticated
USING (public.current_user_is_tenant_admin() AND public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id))
WITH CHECK (
 public.current_user_is_tenant_admin()
 AND public.get_tenant_owner_id(auth.uid()) = public.get_tenant_owner_id(user_id)
 AND EXISTS (SELECT 1 FROM public.empresas_terceiras e WHERE e.id = empresa_terceira_id AND public.get_tenant_owner_id(e.user_id) = public.get_tenant_owner_id(auth.uid()))
);

CREATE POLICY "Tenant admins view team permission profiles"
ON public.permission_profiles FOR SELECT TO authenticated
USING (public.current_user_is_tenant_admin() AND user_id = public.get_tenant_owner_id(auth.uid()));