-- Drop existing manutencoes SELECT policy and create new one with client permissions
DROP POLICY IF EXISTS "Users can view their own manutencoes" ON public.manutencoes;

CREATE POLICY "Users can view manutencoes by permission"
  ON public.manutencoes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_client_permissions ucp
      WHERE ucp.user_id = auth.uid()
      AND ucp.cliente_id = manutencoes.cliente_id
      AND ucp.can_view = true
    )
  );

-- Fix user_system_permissions - ensure admins can INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Admins can manage all system permissions" ON public.user_system_permissions;

CREATE POLICY "Admins can manage system permissions insert"
  ON public.user_system_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage system permissions update"
  ON public.user_system_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage system permissions delete"
  ON public.user_system_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Update cofre_senhas policies to include password permissions
DROP POLICY IF EXISTS "Users can view cofre_senhas by client permission" ON public.cofre_senhas;
DROP POLICY IF EXISTS "Users can view their own cofre_senhas" ON public.cofre_senhas;

CREATE POLICY "Users can view cofre_senhas with permissions"
  ON public.cofre_senhas FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_client_permissions ucp
      WHERE ucp.user_id = auth.uid()
      AND ucp.cliente_id = cofre_senhas.cliente_id
      AND ucp.can_view = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_password_permissions upp
      WHERE upp.user_id = auth.uid()
      AND upp.senha_id = cofre_senhas.id
      AND upp.can_view = true
    )
  );