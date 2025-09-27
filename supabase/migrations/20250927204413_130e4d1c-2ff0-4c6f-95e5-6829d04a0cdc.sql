-- Fix the search_path issue for the new function
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  employee_number text,
  function_role text,
  is_active boolean,
  created_at timestamptz,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.first_name,
    p.last_name,
    p.employee_number,
    p.function_role,
    p.is_active,
    p.created_at,
    au.email
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
$$;