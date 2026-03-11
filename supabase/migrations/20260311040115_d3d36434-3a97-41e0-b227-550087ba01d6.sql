ALTER TABLE public.user_profiles ADD COLUMN plan_id uuid REFERENCES public.landing_plans(id);
ALTER TABLE public.landing_plans ADD COLUMN max_equipes integer DEFAULT 0;