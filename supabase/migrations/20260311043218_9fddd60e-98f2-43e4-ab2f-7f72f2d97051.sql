ALTER TABLE public.landing_plans 
ADD COLUMN IF NOT EXISTS max_manutencoes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_empresas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS offer_free_signup boolean DEFAULT false;