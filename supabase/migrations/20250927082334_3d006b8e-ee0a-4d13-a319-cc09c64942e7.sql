-- Fix the recount function with proper WHERE clause
CREATE OR REPLACE FUNCTION public.recount_service_numbers_after_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;