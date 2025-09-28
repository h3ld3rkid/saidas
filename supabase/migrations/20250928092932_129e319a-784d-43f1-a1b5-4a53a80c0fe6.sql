-- Disable trigger temporarily and create admin manually
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Final cleanup and admin creation
DELETE FROM public.notices;
DELETE FROM public.vehicle_exits;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- Create admin user without trigger interference
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@cvamares.pt',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now()
);

-- Create profile for admin
INSERT INTO public.profiles (user_id, first_name, last_name, employee_number, function_role, is_active)
SELECT id, 'Admin', 'Sistema', 'ADMIN001', 'Condutor', true
FROM auth.users WHERE email = 'admin@cvamares.pt';

-- Create admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users WHERE email = 'admin@cvamares.pt';

-- Create welcome notice
INSERT INTO public.notices (title, content, start_date, end_date, is_active, created_by)
SELECT 
    'Sistema Reinicializado',
    'Database limpa! Faça login com: admin@cvamares.pt / admin123',
    now(),
    now() + interval '30 days',
    true,
    id
FROM auth.users WHERE email = 'admin@cvamares.pt';

-- Re-enable trigger for future users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();