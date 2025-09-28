-- Criar agendamento automático para completar serviços antigos
-- Usando pg_cron para execução automática a cada 30 minutos

-- Primeiro, ativar a extensão pg_cron se não estiver ativa
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar execução automática da função auto_complete_old_services a cada 30 minutos
SELECT cron.schedule(
  'auto-complete-old-services',
  '*/30 * * * *', -- A cada 30 minutos
  $$SELECT public.auto_complete_old_services();$$
);