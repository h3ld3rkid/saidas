-- Grant admin role to the specified initial administrator by email (idempotent)
insert into public.user_roles (user_id, role)
select u.id, 'admin'::app_role
from auth.users u
where u.email in ('admin@cvamares.pt')
  and not exists (
    select 1 from public.user_roles ur where ur.user_id = u.id and ur.role = 'admin'
  );

-- Optionally ensure 'mod' role is present for future use (no-op if already there)
-- insert into public.user_roles (user_id, role)
-- select u.id, 'mod'::app_role from auth.users u where false; -- placeholder, intentionally disabled
