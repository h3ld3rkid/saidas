ALTER TABLE public.readiness_alerts
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by_name text;

GRANT SELECT ON public.readiness_alerts TO authenticated;
GRANT ALL ON public.readiness_alerts TO service_role;
GRANT SELECT ON public.readiness_responses TO authenticated;
GRANT ALL ON public.readiness_responses TO service_role;

CREATE INDEX IF NOT EXISTS idx_readiness_alerts_created_at ON public.readiness_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_responses_alert_id ON public.readiness_responses (alert_id);