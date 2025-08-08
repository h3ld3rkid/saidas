-- Grant admin role to the initial administrator if missing
insert into public.user_roles (user_id, role)
select 'f0a8225e-1a0e-434b-878d-8acf6979baec'::uuid, 'admin'::app_role
where not exists (
  select 1 from public.user_roles
  where user_id = 'f0a8225e-1a0e-434b-878d-8acf6979baec'::uuid and role = 'admin'::app_role
);
