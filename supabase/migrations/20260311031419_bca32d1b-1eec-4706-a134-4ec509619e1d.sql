
CREATE TABLE public.generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  public_id text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  title text NOT NULL DEFAULT 'Relatório',
  filters jsonb NOT NULL DEFAULT '{}',
  report_html text NOT NULL DEFAULT '',
  format text NOT NULL DEFAULT 'pdf',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reports" ON public.generated_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view by public_id" ON public.generated_reports
  FOR SELECT TO anon, authenticated USING (true);
