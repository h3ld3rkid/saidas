DROP FUNCTION IF EXISTS public.get_exits_for_stats(integer, integer);

CREATE OR REPLACE FUNCTION public.get_exits_for_stats(p_year integer, p_month integer)
 RETURNS TABLE(id uuid, user_id uuid, vehicle_id uuid, ambulance_number text, departure_date date, exit_type text, crew text, patient_district text, patient_municipality text, patient_parish text, patient_address text, patient_name text, patient_age integer, patient_gender text, purpose text, is_pem boolean, is_reserve boolean, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ve.id, ve.user_id, ve.vehicle_id, ve.ambulance_number, ve.departure_date,
         ve.exit_type, ve.crew, ve.patient_district, ve.patient_municipality,
         ve.patient_parish, ve.patient_address, ve.patient_name, ve.patient_age,
         ve.patient_gender, ve.purpose, ve.is_pem, ve.is_reserve, ve.status
  FROM public.vehicle_exits ve
  WHERE (has_role(auth.uid(), 'mod'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND EXTRACT(YEAR FROM ve.departure_date) = p_year
    AND (p_month IS NULL OR EXTRACT(MONTH FROM ve.departure_date) = p_month);
$function$;