-- Add admin delete policy for user_roles to allow demotions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can delete roles'
  ) THEN
    CREATE POLICY "Admins can delete roles"
    ON public.user_roles
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Allow assigned crew to update exits (same time constraints as owner)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicle_exits' AND policyname = 'Crew can update assigned exits'
  ) THEN
    CREATE POLICY "Crew can update assigned exits"
    ON public.vehicle_exits
    FOR UPDATE
    USING (
      (coalesce(crew,'') <> '') AND
      ((auth.uid())::text IN (
        SELECT ((TRIM(BOTH FROM unnest(string_to_array(vehicle_exits.crew, ','))))::uuid)::text
      )) AND
      ((status <> 'completed') OR ((status = 'completed') AND ((departure_date + (departure_time)::interval) >= (now() - interval '3 hours'))))
    )
    WITH CHECK (
      (coalesce(crew,'') <> '') AND
      ((auth.uid())::text IN (
        SELECT ((TRIM(BOTH FROM unnest(string_to_array(vehicle_exits.crew, ','))))::uuid)::text
      )) AND
      ((status <> 'completed') OR ((status = 'completed') AND ((departure_date + (departure_time)::interval) >= (now() - interval '3 hours'))))
    );
  END IF;
END $$;