CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
ALTER FUNCTION public.current_user_is_tenant_admin() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.current_user_is_tenant_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_is_tenant_admin() TO authenticated, service_role;