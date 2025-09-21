-- Add delete permission for admins on vehicle_exits table
CREATE POLICY "Admins can delete exits"
ON public.vehicle_exits
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to recount service numbers when an exit is deleted
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
  
  -- Update the total service counter
  UPDATE total_service_counter 
  SET current_number = GREATEST(current_number - 1, 0),
      updated_at = now();
  
  RETURN OLD;
END;
$$;

-- Create trigger for recount on delete
CREATE TRIGGER recount_after_delete
AFTER DELETE ON public.vehicle_exits
FOR EACH ROW
EXECUTE FUNCTION public.recount_service_numbers_after_delete();