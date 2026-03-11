-- Fix permission_profiles SELECT policy to be tenant-scoped
-- Users should only see profiles owned by their admin (or their own if they are admin)
DROP POLICY IF EXISTS "Users can view permission profiles" ON public.permission_profiles;

CREATE POLICY "Users can view own tenant permission profiles"
ON public.permission_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR permission_profiles.id IN (
    SELECT up.permission_profile_id FROM public.user_profiles up WHERE up.user_id = auth.uid()
  )
);