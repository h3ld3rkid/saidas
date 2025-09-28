-- Criar função para obter próximo número de serviço sem incrementar o contador total
CREATE OR REPLACE FUNCTION public.get_next_service_number_no_total(p_service_type text)
 RETURNS TABLE(service_num integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_service_num INTEGER;
BEGIN
  -- Incrementar apenas o contador do tipo de serviço, não o total
  UPDATE service_counters 
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE service_type = p_service_type
  RETURNING current_number INTO v_service_num;
  
  -- Se o tipo não existe, criar
  IF v_service_num IS NULL THEN
    INSERT INTO service_counters (service_type, current_number)
    VALUES (p_service_type, 1)
    RETURNING current_number INTO v_service_num;
  END IF;
  
  RETURN QUERY SELECT v_service_num;
END;
$function$;