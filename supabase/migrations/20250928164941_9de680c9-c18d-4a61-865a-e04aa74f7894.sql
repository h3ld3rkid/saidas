-- Corrigir funções com search_path não definido para resolver warnings de segurança

-- Atualizar função get_next_service_number para incluir search_path
CREATE OR REPLACE FUNCTION public.get_next_service_number(p_service_type text)
 RETURNS TABLE(service_num integer, total_num integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_service_num INTEGER;
  v_total_num INTEGER;
BEGIN
  -- Incrementar contador do tipo de serviço
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
  
  -- Incrementar contador total - fix: add WHERE clause to update specific row
  -- First ensure there's a row in total_service_counter
  INSERT INTO total_service_counter (current_number) 
  SELECT 0 
  WHERE NOT EXISTS (SELECT 1 FROM total_service_counter);
  
  -- Now update the row (there should only be one)
  UPDATE total_service_counter 
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE id = (SELECT id FROM total_service_counter LIMIT 1)
  RETURNING current_number INTO v_total_num;
  
  RETURN QUERY SELECT v_service_num, v_total_num;
END;
$function$;

-- Atualizar função get_next_service_number_no_total para incluir search_path
CREATE OR REPLACE FUNCTION public.get_next_service_number_no_total(p_service_type text)
 RETURNS TABLE(service_num integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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