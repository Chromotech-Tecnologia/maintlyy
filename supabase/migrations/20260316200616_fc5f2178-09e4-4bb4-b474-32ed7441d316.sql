
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tenant_admin_id uuid,
  action text NOT NULL, -- 'create', 'update', 'delete'
  resource_type text NOT NULL, -- 'manutencao', 'cliente', 'empresa', 'equipe', 'cofre_senha', 'tipo_manutencao', 'usuario', 'monitoramento', 'permissao'
  resource_id uuid,
  resource_name text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast tenant queries
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs (tenant_admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view logs of themselves and their sub-users
CREATE POLICY "Admins can view tenant audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() = tenant_admin_id
  OR auth.uid() = user_id
  OR is_super_admin(auth.uid())
);

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role full access"
ON public.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
