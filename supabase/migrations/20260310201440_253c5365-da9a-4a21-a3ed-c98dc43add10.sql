CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage settings" ON public.system_settings
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated can read settings" ON public.system_settings
FOR SELECT TO authenticated
USING (true);

INSERT INTO public.system_settings (key, value) VALUES ('default_trial_days', '7')
ON CONFLICT (key) DO NOTHING;