-- Create vehicle exit audit logs table
CREATE TABLE public.vehicle_exit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exit_id UUID NOT NULL REFERENCES public.vehicle_exits(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'completed', 'cancelled', 'reactivated'
  user_id UUID NOT NULL,
  user_name TEXT, -- Store name for quick access without joins
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details TEXT -- Optional details about what changed
);

-- Enable RLS
ALTER TABLE public.vehicle_exit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs"
ON public.vehicle_exit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs (via trigger with security definer)
CREATE POLICY "System can insert logs"
ON public.vehicle_exit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_vehicle_exit_logs_exit_id ON public.vehicle_exit_logs(exit_id);
CREATE INDEX idx_vehicle_exit_logs_created_at ON public.vehicle_exit_logs(created_at DESC);

-- Function to log vehicle exit actions
CREATE OR REPLACE FUNCTION public.log_vehicle_exit_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_user_name TEXT;
  v_details TEXT;
BEGIN
  -- Get user name
  SELECT TRIM(BOTH ' ' FROM COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
  INTO v_user_name
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_details := 'Serviço criado - Tipo: ' || COALESCE(NEW.exit_type, 'N/A');
    
    INSERT INTO public.vehicle_exit_logs (exit_id, action, user_id, user_name, details)
    VALUES (NEW.id, v_action, auth.uid(), v_user_name, v_details);
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'completed' THEN
        v_action := 'completed';
        v_details := 'Serviço concluído';
      ELSIF NEW.status = 'cancelled' THEN
        v_action := 'cancelled';
        v_details := 'Serviço cancelado';
      ELSIF NEW.status = 'active' AND OLD.status IN ('completed', 'cancelled') THEN
        v_action := 'reactivated';
        v_details := 'Serviço reativado (status anterior: ' || OLD.status || ')';
      ELSE
        v_action := 'updated';
        v_details := 'Status alterado para: ' || NEW.status;
      END IF;
    ELSE
      v_action := 'updated';
      v_details := 'Dados do serviço atualizados';
    END IF;
    
    INSERT INTO public.vehicle_exit_logs (exit_id, action, user_id, user_name, details)
    VALUES (NEW.id, v_action, auth.uid(), v_user_name, v_details);
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for INSERT
CREATE TRIGGER log_vehicle_exit_insert
AFTER INSERT ON public.vehicle_exits
FOR EACH ROW
EXECUTE FUNCTION public.log_vehicle_exit_action();

-- Create trigger for UPDATE
CREATE TRIGGER log_vehicle_exit_update
AFTER UPDATE ON public.vehicle_exits
FOR EACH ROW
EXECUTE FUNCTION public.log_vehicle_exit_action();