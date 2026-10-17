
DROP POLICY IF EXISTS "Users can view cofre_senhas with permissions" ON public.cofre_senhas;

CREATE POLICY "Users can view cofre_senhas with permissions"
ON public.cofre_senhas
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_client_permissions ucp
    WHERE ucp.user_id = auth.uid()
      AND ucp.cliente_id = cofre_senhas.cliente_id
      AND ucp.can_view = true
  )
  OR EXISTS (
    SELECT 1 FROM user_password_permissions upp
    WHERE upp.user_id = auth.uid()
      AND upp.senha_id = cofre_senhas.id
      AND upp.can_view = true
  )
  OR EXISTS (
    SELECT 1 FROM user_empresa_permissions uep
    WHERE uep.user_id = auth.uid()
      AND uep.empresa_terceira_id = cofre_senhas.empresa_terceira_id
      AND uep.can_view = true
  )
);
