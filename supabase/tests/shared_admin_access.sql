-- Read-only regression checks for the real team and installed access rules.
-- Execute with the Supabase read query tool. A failed rule raises division by zero.
WITH team AS (
  SELECT up.user_id, public.get_tenant_owner_id(up.user_id) AS tenant_owner,
    COALESCE(up.is_admin, false) OR COALESCE(pp.is_admin_profile, false) AS admin
  FROM public.user_profiles up
  LEFT JOIN public.permission_profiles pp ON pp.id = up.permission_profile_id
), rules AS (
  SELECT 'Elaine is an admin of Alexandre team' AS rule,
    EXISTS (SELECT 1 FROM team WHERE user_id='14101e78-5141-4252-8c43-459b7ec11e8f' AND admin AND tenant_owner='0092ffb5-7e25-4efc-9e49-817e3fa908bb') AS passed
  UNION ALL
  SELECT 'Independent Elaine account remains isolated',
    EXISTS (SELECT 1 FROM team WHERE user_id='6313bf89-1a4a-4076-843a-4b884766364c' AND tenant_owner <> '0092ffb5-7e25-4efc-9e49-817e3fa908bb')
  UNION ALL
  SELECT 'Company admin CRUD is tenant scoped',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='empresas_terceiras' AND policyname='Tenant admins share company access' AND cmd='ALL' AND qual LIKE '%private.current_user_is_tenant_admin()%' AND qual LIKE '%get_tenant_owner_id(user_id)%' AND with_check LIKE '%get_tenant_owner_id(user_id)%')
  UNION ALL
  SELECT 'Client admin CRUD is tenant scoped',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes' AND policyname='Tenant admins share client access' AND cmd='ALL' AND qual LIKE '%private.current_user_is_tenant_admin()%' AND qual LIKE '%get_tenant_owner_id(user_id)%' AND with_check LIKE '%get_tenant_owner_id(e.user_id)%')
  UNION ALL
  SELECT 'Admin permission selectors share team profiles',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='permission_profiles' AND policyname='Tenant admins view team permission profiles' AND cmd='SELECT' AND qual LIKE '%private.current_user_is_tenant_admin()%' AND qual LIKE '%get_tenant_owner_id(auth.uid())%')
)
SELECT rule, 1 / passed::integer AS assertion FROM rules;