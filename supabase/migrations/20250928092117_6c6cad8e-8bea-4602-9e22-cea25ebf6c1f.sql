-- Create a function to get users with email and roles (for easy viewing in Supabase)
CREATE OR REPLACE FUNCTION public.get_all_users_details()
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  employee_number text,
  function_role text,
  is_active boolean,
  access_role app_role,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as profile_id,
    p.user_id,
    au.email,
    p.first_name,
    p.last_name,
    p.employee_number,
    p.function_role,
    p.is_active,
    ur.role as access_role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  ORDER BY p.created_at DESC;
$$;

-- Create optimized index for CODU searches
CREATE INDEX IF NOT EXISTS idx_vehicle_exits_observations_codu 
ON public.vehicle_exits (observations)
WHERE observations LIKE '%CODU:%';

-- Create function to check if CODU number already exists
CREATE OR REPLACE FUNCTION public.check_codu_exists(codu_number text)
RETURNS TABLE (
  exit_id uuid,
  departure_date date,
  departure_time time,
  found boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as exit_id,
    departure_date,
    departure_time,
    true as found
  FROM public.vehicle_exits
  WHERE observations LIKE '%CODU: ' || codu_number || '%'
  LIMIT 1;
$$;