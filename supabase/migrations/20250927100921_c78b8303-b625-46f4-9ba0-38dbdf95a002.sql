-- Add policy to allow crew members to view exits where they are listed
CREATE POLICY "Crew can view exits where they are assigned" 
ON public.vehicle_exits 
FOR SELECT 
USING (
  crew IS NOT NULL 
  AND crew != '' 
  AND auth.uid()::text = ANY(
    SELECT TRIM(unnest(string_to_array(crew, ',')))::uuid::text
  )
);

-- Update the existing policies to allow better management
DROP POLICY IF EXISTS "Users can view their own exits" ON public.vehicle_exits;

CREATE POLICY "Users can view their own exits and assigned crew exits" 
ON public.vehicle_exits 
FOR SELECT 
USING (
  (auth.uid() = user_id AND (
    (status <> 'completed') 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR (status = 'completed' AND (departure_date + departure_time::interval) >= (now() - interval '3 hours'))
  ))
  OR 
  (crew IS NOT NULL 
   AND crew != '' 
   AND auth.uid()::text = ANY(
     SELECT TRIM(unnest(string_to_array(crew, ',')))::uuid::text
   ))
);