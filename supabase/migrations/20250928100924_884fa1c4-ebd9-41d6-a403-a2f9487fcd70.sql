-- Completar a reestruturação: atualizar funções para usar profiles.role

-- Atualizar funções para usar a nova estrutura
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Atualizar função get_all_users_details para usar a nova estrutura
CREATE OR REPLACE FUNCTION public.get_all_users_details()
RETURNS TABLE(profile_id uuid, user_id uuid, email text, first_name text, last_name text, employee_number text, function_role text, is_active boolean, access_role app_role, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
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
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
$$;

-- Atualizar trigger handle_new_user para incluir role padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, employee_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'employee_number', ''),
    'user'::app_role
  );
  
  RETURN NEW;
END;
$$;