-- Cleanup completely and use edge function approach
DELETE FROM public.notices;
DELETE FROM public.user_roles;  
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- Simple restart - we'll use the manage-users edge function to create admin properly