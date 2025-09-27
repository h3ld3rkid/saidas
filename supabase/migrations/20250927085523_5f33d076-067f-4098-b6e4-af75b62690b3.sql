-- Remove recursive trigger causing stack overflow
DROP TRIGGER IF EXISTS trigger_auto_complete_services ON public.vehicle_exits;
DROP FUNCTION IF EXISTS public.auto_complete_old_services();

-- Update RLS: only admins can update any exit; users can update own while not completed or within 3h after completion
DO $$
BEGIN
  -- Drop existing update policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vehicle_exits' AND policyname = 'Users can update their own exits'
  ) THEN
    DROP POLICY "Users can update their own exits" ON public.vehicle_exits;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vehicle_exits' AND policyname = 'Mods and admins can update all exits'
  ) THEN
    DROP POLICY "Mods and admins can update all exits" ON public.vehicle_exits;
  END IF;
END$$;

-- Admins can update all exits
CREATE POLICY "Admins can update all exits"
ON public.vehicle_exits
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Users can update their own exits if not completed OR within 3h after completion
CREATE POLICY "Users update own recent or active exits"
ON public.vehicle_exits
FOR UPDATE
USING (
  auth.uid() = user_id AND (
    status != 'completed' OR 
    (status = 'completed' AND (departure_date + departure_time::interval) >= now() - interval '3 hours')
  )
);
