-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule job to auto-close old alerts every 15 minutes
SELECT cron.schedule(
  'auto-close-old-readiness-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://mubuncckmiyxxnlxnecn.supabase.co/functions/v1/auto-close-old-alerts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YnVuY2NrbWl5eHhubHhuZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTg4NDYsImV4cCI6MjA2OTk3NDg0Nn0.7MAZ0jbRiE6s1cp1DsENTcXOBF-bez1qCle5LyUDAXk"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);