DROP POLICY IF EXISTS "Mods and admins can view all exits" ON public.vehicle_exits;
CREATE POLICY "Mods and admins can view all exits"
ON public.vehicle_exits
FOR SELECT
USING (has_role(auth.uid(), 'mod'::app_role) OR has_role(auth.uid(), 'admin'::app_role));