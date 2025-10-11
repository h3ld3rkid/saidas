-- Function to get vehicle exits with sensitive data masked after 24h
CREATE OR REPLACE FUNCTION public.get_vehicle_exits_with_privacy()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  vehicle_id uuid,
  departure_date date,
  departure_time time without time zone,
  exit_type text,
  service_number integer,
  total_service_number integer,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  purpose text,
  observations text,
  crew text,
  ambulance_number text,
  inem_si boolean,
  is_reserve boolean,
  is_pem boolean,
  driver_name text,
  driver_license text,
  expected_return_date date,
  expected_return_time time without time zone,
  -- Sensitive fields that will be masked after 24h
  patient_name text,
  patient_age integer,
  patient_gender text,
  patient_contact text,
  patient_address text,
  patient_district text,
  patient_municipality text,
  patient_parish text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ve.id,
    ve.user_id,
    ve.vehicle_id,
    ve.departure_date,
    ve.departure_time,
    ve.exit_type,
    ve.service_number,
    ve.total_service_number,
    ve.status,
    ve.created_at,
    ve.updated_at,
    ve.purpose,
    ve.observations,
    ve.crew,
    ve.ambulance_number,
    ve.inem_si,
    ve.is_reserve,
    ve.is_pem,
    ve.driver_name,
    ve.driver_license,
    ve.expected_return_date,
    ve.expected_return_time,
    -- Mask sensitive data after 24h from departure
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_name 
    END as patient_name,
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_age 
    END as patient_age,
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_gender 
    END as patient_gender,
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_contact 
    END as patient_contact,
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_address 
    END as patient_address,
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_district 
    END as patient_district,
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_municipality 
    END as patient_municipality,
    CASE 
      WHEN (ve.departure_date + ve.departure_time::interval) < (now() - interval '24 hours')
        AND NOT has_role(auth.uid(), 'admin'::app_role)
      THEN NULL 
      ELSE ve.patient_parish 
    END as patient_parish
  FROM vehicle_exits ve
  WHERE (
    -- User's own exits
    (auth.uid() = ve.user_id AND (
      ve.status <> 'completed' 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (ve.status = 'completed' AND (ve.departure_date + ve.departure_time::interval) >= (now() - interval '3 hours'))
    ))
    OR
    -- Exits where user is crew
    (ve.crew IS NOT NULL AND ve.crew <> '' 
      AND (auth.uid())::text IN (
        SELECT (TRIM(BOTH FROM unnest(string_to_array(ve.crew, ','))))::uuid::text
      )
    )
    OR
    -- Mods and admins can see all
    (has_role(auth.uid(), 'mod'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );
$$;