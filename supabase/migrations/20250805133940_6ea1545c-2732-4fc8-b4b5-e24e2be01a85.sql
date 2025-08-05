-- Create admin user (this will be done manually through auth, but we prepare the profile and role)
-- Insert admin profile data
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@cvamares.pt',
  crypt('CVAmares', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Admin","last_name":"Sistema","employee_number":"00001"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Get the user ID we just created
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find the admin user
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@cvamares.pt';
    
    -- Insert profile
    INSERT INTO public.profiles (user_id, first_name, last_name, employee_number)
    VALUES (admin_user_id, 'Admin', 'Sistema', '00001')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;