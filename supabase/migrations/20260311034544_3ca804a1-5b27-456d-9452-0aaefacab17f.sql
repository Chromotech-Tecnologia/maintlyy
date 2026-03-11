
-- Create landing_plans table
CREATE TABLE public.landing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'individual',
  categoria text NOT NULL DEFAULT 'gratis',
  preco text,
  max_usuarios integer DEFAULT 1,
  descricao text,
  recursos jsonb NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_numero text,
  whatsapp_mensagem text,
  texto_botao text NOT NULL DEFAULT 'Começar Grátis',
  destaque boolean DEFAULT false,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.landing_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans (public landing page)
CREATE POLICY "Anyone can view active plans" ON public.landing_plans
  FOR SELECT TO anon, authenticated USING (ativo = true);

-- Super admins can manage all plans (including inactive)
CREATE POLICY "Super admins can select all plans" ON public.landing_plans
  FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert plans" ON public.landing_plans
  FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update plans" ON public.landing_plans
  FOR UPDATE TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete plans" ON public.landing_plans
  FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

-- Allow anon to read system_settings for trial days on landing page
CREATE POLICY "Anon can read settings" ON public.system_settings
  FOR SELECT TO anon USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_landing_plans_updated_at
  BEFORE UPDATE ON public.landing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
