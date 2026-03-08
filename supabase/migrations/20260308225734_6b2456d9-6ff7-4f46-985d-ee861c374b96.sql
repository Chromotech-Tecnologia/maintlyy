
ALTER TABLE public.permission_profiles 
ADD COLUMN IF NOT EXISTS client_access jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS empresa_access jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS password_access jsonb NOT NULL DEFAULT '[]'::jsonb;
