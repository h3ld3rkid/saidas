DROP POLICY IF EXISTS "Mods can update exits within 24h" ON public.vehicle_exits;

CREATE POLICY "Mods can update exits within 3h"
ON public.vehicle_exits
FOR UPDATE
USING (has_role(auth.uid(), 'mod'::app_role) AND created_at >= (now() - interval '3 hours'))
WITH CHECK (has_role(auth.uid(), 'mod'::app_role) AND created_at >= (now() - interval '3 hours'));

DROP POLICY IF EXISTS "Mods and admins can view all exits" ON public.vehicle_exits;

CREATE POLICY "Mods and admins can view all exits"
ON public.vehicle_exits
FOR SELECT
USING (
  (has_role(auth.uid(), 'mod'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    status <> 'completed'
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (departure_date + (departure_time)::interval) >= (now() - interval '3 hours')
    OR created_at >= (now() - interval '3 hours')
  )
);