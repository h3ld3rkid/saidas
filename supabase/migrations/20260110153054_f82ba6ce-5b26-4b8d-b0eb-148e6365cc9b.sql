CREATE OR REPLACE FUNCTION public.log_vehicle_exit_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action TEXT;
  v_user_name TEXT;
  v_user_id UUID;
  v_details TEXT;
BEGIN
  -- Get current user or fallback for system operations (cron jobs)
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    -- Normal user operation
    SELECT TRIM(BOTH ' ' FROM COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO v_user_name
    FROM public.profiles
    WHERE user_id = v_user_id;
  ELSE
    -- System operation (cron job, etc.) - use the record's user_id for reference
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    v_user_name := 'Sistema (Auto-conclusão)';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_details := 'Serviço criado - Tipo: ' || COALESCE(NEW.exit_type, 'N/A');
    
    INSERT INTO public.vehicle_exit_logs (exit_id, action, user_id, user_name, details)
    VALUES (NEW.id, v_action, v_user_id, v_user_name, v_details);
    
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
    VALUES (NEW.id, v_action, v_user_id, v_user_name, v_details);
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;