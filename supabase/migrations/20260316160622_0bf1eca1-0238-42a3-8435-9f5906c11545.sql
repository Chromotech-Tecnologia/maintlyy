
ALTER TABLE public.landing_plans 
  ADD COLUMN IF NOT EXISTS suporte_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suporte_whatsapp boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS relatorios_avancados boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS links_publicos boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS importacao_excel boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suporte_email_endereco text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suporte_whatsapp_numero text DEFAULT NULL;
