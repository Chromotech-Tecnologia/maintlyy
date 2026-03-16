
-- Add max_urls column to landing_plans
ALTER TABLE public.landing_plans ADD COLUMN IF NOT EXISTS max_urls integer DEFAULT 0;

-- Create monitored_urls table
CREATE TABLE public.monitored_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  nome text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  empresa_terceira_id uuid REFERENCES public.empresas_terceiras(id) ON DELETE SET NULL,
  check_interval_minutes integer NOT NULL DEFAULT 60,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monitored_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monitored_urls" ON public.monitored_urls FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sub-users can view monitored_urls" ON public.monitored_urls FOR SELECT TO authenticated
  USING (has_system_permission(auth.uid(), 'monitoramento', 'view'));

CREATE TRIGGER update_monitored_urls_updated_at BEFORE UPDATE ON public.monitored_urls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create url_check_logs table
CREATE TABLE public.url_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_url_id uuid NOT NULL REFERENCES public.monitored_urls(id) ON DELETE CASCADE,
  status_code integer,
  response_time_ms integer,
  is_online boolean NOT NULL DEFAULT false,
  error_message text,
  screenshot_url text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.url_check_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own url_check_logs" ON public.url_check_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.monitored_urls mu WHERE mu.id = monitored_url_id AND mu.user_id = auth.uid()));

CREATE POLICY "Users can insert own url_check_logs" ON public.url_check_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.monitored_urls mu WHERE mu.id = monitored_url_id AND mu.user_id = auth.uid()));

CREATE POLICY "Service role can manage all logs" ON public.url_check_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create monitor_schedules table
CREATE TABLE public.monitor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'daily' CHECK (report_type IN ('daily', 'alert')),
  frequency_minutes integer NOT NULL DEFAULT 60,
  report_time time DEFAULT '08:00',
  email_destinatario text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monitor_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monitor_schedules" ON public.monitor_schedules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_monitor_schedules_updated_at BEFORE UPDATE ON public.monitor_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
