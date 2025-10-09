-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view settings
CREATE POLICY "Authenticated users can view settings"
ON public.settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default escalas_url setting if not exists
INSERT INTO public.settings (key, value)
VALUES ('escalas_url', '')
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();