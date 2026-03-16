
-- Add test_results JSONB column to url_check_logs
ALTER TABLE public.url_check_logs 
ADD COLUMN IF NOT EXISTS test_results jsonb DEFAULT '[]'::jsonb;

-- Add keyword and tipo columns to monitored_urls
ALTER TABLE public.monitored_urls 
ADD COLUMN IF NOT EXISTS keyword text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'url';
