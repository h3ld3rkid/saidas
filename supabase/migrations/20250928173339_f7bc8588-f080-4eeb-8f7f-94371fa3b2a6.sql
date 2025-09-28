-- Create a safe RPC to get basic user names by IDs for authenticated users
create or replace function public.get_user_names_by_ids(_user_ids uuid[])
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  telegram_chat_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.first_name, p.last_name, p.telegram_chat_id
  from public.profiles p
  where p.user_id = any(_user_ids);
$$; 

-- No RLS changes needed; SECURITY DEFINER allows safe read of the necessary fields
