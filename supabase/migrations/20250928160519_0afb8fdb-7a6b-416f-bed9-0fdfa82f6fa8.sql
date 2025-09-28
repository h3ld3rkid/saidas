-- Create tables for readiness alerts and responses
CREATE TABLE IF NOT EXISTS public.readiness_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id TEXT NOT NULL UNIQUE,
  alert_type TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.readiness_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  response BOOLEAN NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(alert_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.realtime_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id TEXT NOT NULL,
  responder_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.readiness_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for readiness_alerts
CREATE POLICY "Users can view all readiness alerts" 
ON public.readiness_alerts 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create alerts" 
ON public.readiness_alerts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for readiness_responses
CREATE POLICY "Users can view all responses" 
ON public.readiness_responses 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own responses" 
ON public.readiness_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for realtime_notifications
CREATE POLICY "Users can view all notifications" 
ON public.realtime_notifications 
FOR SELECT 
USING (true);

CREATE POLICY "System can create notifications" 
ON public.realtime_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_readiness_alerts_alert_id ON public.readiness_alerts(alert_id);
CREATE INDEX idx_readiness_responses_alert_id ON public.readiness_responses(alert_id);
CREATE INDEX idx_readiness_responses_user_id ON public.readiness_responses(user_id);
CREATE INDEX idx_realtime_notifications_alert_id ON public.realtime_notifications(alert_id);
CREATE INDEX idx_realtime_notifications_created_at ON public.realtime_notifications(created_at);