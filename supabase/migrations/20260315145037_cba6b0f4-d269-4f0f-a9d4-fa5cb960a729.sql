
CREATE TABLE public.manutencao_equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id uuid NOT NULL REFERENCES public.manutencoes(id) ON DELETE CASCADE,
  equipe_id uuid NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manutencao_id, equipe_id)
);

ALTER TABLE public.manutencao_equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view manutencao_equipes via manutencao ownership"
ON public.manutencao_equipes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.manutencoes m WHERE m.id = manutencao_id AND m.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.manutencoes m
    JOIN public.user_client_permissions ucp ON ucp.cliente_id = m.cliente_id
    WHERE m.id = manutencao_id AND ucp.user_id = auth.uid() AND ucp.can_view = true
  )
);

CREATE POLICY "Users can insert manutencao_equipes for own manutencoes"
ON public.manutencao_equipes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.manutencoes m WHERE m.id = manutencao_id AND m.user_id = auth.uid())
);

CREATE POLICY "Users can delete manutencao_equipes for own manutencoes"
ON public.manutencao_equipes FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.manutencoes m WHERE m.id = manutencao_id AND m.user_id = auth.uid())
);
