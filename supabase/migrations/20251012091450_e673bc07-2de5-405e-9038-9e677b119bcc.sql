-- Criar agendamento automático para resetar contadores no dia 1 de janeiro
-- Usando pg_cron para execução automática às 00:00 do dia 1 de janeiro de cada ano

-- A extensão pg_cron já está ativa da migração anterior

-- Agendar execução automática do reset de contadores no dia 1 de janeiro às 00:00
SELECT cron.schedule(
  'reset-counters-new-year',
  '0 0 1 1 *', -- Às 00:00 do dia 1 de janeiro de cada ano
  $$
  SELECT
    net.http_post(
        url:='https://mubuncckmiyxxnlxnecn.supabase.co/functions/v1/reset-counters',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YnVuY2NrbWl5eHhubHhuZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTg4NDYsImV4cCI6MjA2OTk3NDg0Nn0.7MAZ0jbRiE6s1cp1DsENTcXOBF-bez1qCle5LyUDAXk"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);