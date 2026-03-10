CREATE POLICY "All authenticated users can view tipos_manutencao"
ON public.tipos_manutencao FOR SELECT TO authenticated
USING (true);