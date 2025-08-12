-- Add SELECT policies so users can read their own permissions and view permitted clients

-- Allow non-admin users to read their own client permission rows
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'user_client_permissions'
    AND policyname = 'Users can view their own client permissions'
) THEN
  CREATE POLICY "Users can view their own client permissions"
  ON public.user_client_permissions
  FOR SELECT
  USING (auth.uid() = user_id);
END IF;
END $$;

-- Allow non-admin users to read their own system permission rows
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'user_system_permissions'
    AND policyname = 'Users can view their own system permissions'
) THEN
  CREATE POLICY "Users can view their own system permissions"
  ON public.user_system_permissions
  FOR SELECT
  USING (auth.uid() = user_id);
END IF;
END $$;

-- Allow users to SELECT clientes they own OR were granted view permission for (or if admin)
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'clientes'
    AND policyname = 'Users can view permitted clientes'
) THEN
  CREATE POLICY "Users can view permitted clientes"
  ON public.clientes
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_client_permissions ucp
      WHERE ucp.user_id = auth.uid()
        AND ucp.cliente_id = clientes.id
        AND ucp.can_view = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.is_admin = true
    )
  );
END IF;
END $$;