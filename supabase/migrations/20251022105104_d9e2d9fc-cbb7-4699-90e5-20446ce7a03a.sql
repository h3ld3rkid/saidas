-- Create table for splash screen announcements
CREATE TABLE IF NOT EXISTS public.splash_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_roles TEXT[] NOT NULL DEFAULT ARRAY['user'], -- Array of roles: 'admin', 'mod', 'user'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.splash_announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view active announcements for their role
CREATE POLICY "Users can view splash announcements for their role"
ON public.splash_announcements
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    -- Check if user's role is in the target_roles array
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role::text = ANY(target_roles)
    )
  )
);

-- Policy: Admins can manage splash announcements
CREATE POLICY "Admins can manage splash announcements"
ON public.splash_announcements
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_splash_announcements_updated_at
BEFORE UPDATE ON public.splash_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();