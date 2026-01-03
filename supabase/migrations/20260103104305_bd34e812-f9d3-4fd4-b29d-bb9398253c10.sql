-- Corrigir função que atualiza números quando o tipo de serviço muda
CREATE OR REPLACE FUNCTION public.update_service_number_on_type_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_num INTEGER;
BEGIN
  -- Se o tipo de serviço mudou
  IF OLD.exit_type IS DISTINCT FROM NEW.exit_type THEN
    -- Decrementar contador do tipo antigo
    UPDATE service_counters 
    SET current_number = GREATEST(current_number - 1, 0),
        updated_at = now()
    WHERE service_type = OLD.exit_type;
    
    -- Obter novo número para o novo tipo
    UPDATE service_counters 
    SET current_number = current_number + 1,
        updated_at = now()
    WHERE service_type = NEW.exit_type
    RETURNING current_number INTO v_service_num;
    
    -- Se o novo tipo não existe, criar
    IF v_service_num IS NULL THEN
      INSERT INTO service_counters (service_type, current_number)
      VALUES (NEW.exit_type, 1)
      RETURNING current_number INTO v_service_num;
    END IF;
    
    NEW.service_number = v_service_num;
    -- Manter o total_service_number inalterado (já foi atribuído na criação)
  END IF;
  
  RETURN NEW;
END;
$function$;