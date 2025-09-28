-- Fix function search_path security issues for functions we added
CREATE OR REPLACE FUNCTION public.update_service_number_on_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_service_num INTEGER;
BEGIN
  -- Se o tipo de serviço mudou
  IF OLD.exit_type IS DISTINCT FROM NEW.exit_type THEN
    -- Obter novo número para o novo tipo
    UPDATE service_counters 
    SET current_number = current_number + 1,
        updated_at = now()
    WHERE service_type = NEW.exit_type
    RETURNING current_number INTO v_service_num;
    
    -- Se o tipo não existe, criar
    IF v_service_num IS NULL THEN
      INSERT INTO service_counters (service_type, current_number)
      VALUES (NEW.exit_type, 1)
      RETURNING current_number INTO v_service_num;
    END IF;
    
    NEW.service_number = v_service_num;
    -- Manter o total_service_number inalterado
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recount_service_numbers_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deleted_service_num INTEGER;
  v_deleted_total_num INTEGER;
  v_service_type TEXT;
BEGIN
  -- Store the deleted exit's numbers and type
  v_deleted_service_num := OLD.service_number;
  v_deleted_total_num := OLD.total_service_number;
  v_service_type := OLD.exit_type;
  
  -- Update all exits with higher service numbers for this type
  UPDATE vehicle_exits 
  SET service_number = service_number - 1,
      updated_at = now()
  WHERE exit_type = v_service_type 
    AND service_number > v_deleted_service_num;
    
  -- Update all exits with higher total service numbers
  UPDATE vehicle_exits 
  SET total_service_number = total_service_number - 1,
      updated_at = now()
  WHERE total_service_number > v_deleted_total_num;
  
  -- Update the service counter for this type
  UPDATE service_counters 
  SET current_number = GREATEST(current_number - 1, 0),
      updated_at = now()
  WHERE service_type = v_service_type;
  
  -- Update the total service counter with proper WHERE clause
  UPDATE total_service_counter 
  SET current_number = GREATEST(current_number - 1, 0),
      updated_at = now()
  WHERE id = (SELECT id FROM total_service_counter LIMIT 1);
  
  RETURN OLD;
END;
$function$;