-- Create a helper function to check if a user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.user_profiles WHERE user_id = _user_id), false);
$$;

-- Restrict user_profiles visibility: only self or admins
DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can view all profiles'
) THEN
  DROP POLICY "Users can view all profiles" ON public.user_profiles;
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can view own profile'
) THEN
  CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Admins can view all profiles'
) THEN
  CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));
END IF;
END $$;

-- Allow viewing and editing cofre_senhas based on client permissions or admin override
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'cofre_senhas' AND policyname = 'Users can view cofre_senhas by client permission'
) THEN
  CREATE POLICY "Users can view cofre_senhas by client permission"
  ON public.cofre_senhas
  FOR SELECT
  USING (
    -- owner can always view
    auth.uid() = user_id
    OR 
    -- users with view permission for the related cliente can view
    EXISTS (
      SELECT 1 FROM public.user_client_permissions ucp
      WHERE ucp.user_id = auth.uid()
        AND ucp.cliente_id = cofre_senhas.cliente_id
        AND ucp.can_view = true
    )
    OR
    -- admins can view all
    public.is_admin(auth.uid())
  );
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'cofre_senhas' AND policyname = 'Users can update cofre_senhas by client permission'
) THEN
  CREATE POLICY "Users can update cofre_senhas by client permission"
  ON public.cofre_senhas
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_client_permissions ucp
      WHERE ucp.user_id = auth.uid()
        AND ucp.cliente_id = cofre_senhas.cliente_id
        AND ucp.can_edit = true
    )
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_client_permissions ucp
      WHERE ucp.user_id = auth.uid()
        AND ucp.cliente_id = cofre_senhas.cliente_id
        AND ucp.can_edit = true
    )
    OR public.is_admin(auth.uid())
  );
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'cofre_senhas' AND policyname = 'Users can delete cofre_senhas by client permission or admin'
) THEN
  CREATE POLICY "Users can delete cofre_senhas by client permission or admin"
  ON public.cofre_senhas
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_client_permissions ucp
      WHERE ucp.user_id = auth.uid()
        AND ucp.cliente_id = cofre_senhas.cliente_id
        AND ucp.can_delete = true
    )
    OR public.is_admin(auth.uid())
  );
END IF;
END $$;