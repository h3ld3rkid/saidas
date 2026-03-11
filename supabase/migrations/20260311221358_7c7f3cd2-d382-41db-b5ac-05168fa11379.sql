DROP FUNCTION public.get_all_users_details();

CREATE OR REPLACE FUNCTION public.get_all_users_details()
 RETURNS TABLE(profile_id uuid, user_id uuid, email text, first_name text, last_name text, employee_number text, function_role text, is_active boolean, access_role app_role, created_at timestamp with time zone, manually_blocked boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
    p.role as access_role,
    p.created_at,
    p.manually_blocked
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
$$;