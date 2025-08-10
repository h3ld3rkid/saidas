-- Address hierarchy tables
create table if not exists public.distritos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.concelhos (
  id uuid primary key default gen_random_uuid(),
  distrito_id uuid not null references public.distritos(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.freguesias (
  id uuid primary key default gen_random_uuid(),
  concelho_id uuid not null references public.concelhos(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ruas (
  id uuid primary key default gen_random_uuid(),
  freguesia_id uuid not null references public.freguesias(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.distritos enable row level security;
alter table public.concelhos enable row level security;
alter table public.freguesias enable row level security;
alter table public.ruas enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Authenticated can view distritos" on public.distritos;
drop policy if exists "Admins manage distritos" on public.distritos;
drop policy if exists "Authenticated can view concelhos" on public.concelhos;
drop policy if exists "Admins manage concelhos" on public.concelhos;
drop policy if exists "Authenticated can view freguesias" on public.freguesias;
drop policy if exists "Admins manage freguesias" on public.freguesias;
drop policy if exists "Authenticated can view ruas" on public.ruas;
drop policy if exists "Admins manage ruas" on public.ruas;

-- Policies: authenticated users can read; admins can manage
create policy "Authenticated can view distritos" on public.distritos for select to authenticated using (true);
create policy "Admins manage distritos" on public.distritos for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "Authenticated can view concelhos" on public.concelhos for select to authenticated using (true);
create policy "Admins manage concelhos" on public.concelhos for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "Authenticated can view freguesias" on public.freguesias for select to authenticated using (true);
create policy "Admins manage freguesias" on public.freguesias for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create policy "Authenticated can view ruas" on public.ruas for select to authenticated using (true);
create policy "Admins manage ruas" on public.ruas for all to authenticated using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

-- Triggers to keep updated_at fresh
drop trigger if exists trg_distritos_updated_at on public.distritos;
drop trigger if exists trg_concelhos_updated_at on public.concelhos;
drop trigger if exists trg_freguesias_updated_at on public.freguesias;
drop trigger if exists trg_ruas_updated_at on public.ruas;

create trigger trg_distritos_updated_at
before update on public.distritos for each row execute function public.update_updated_at_column();

create trigger trg_concelhos_updated_at
before update on public.concelhos for each row execute function public.update_updated_at_column();

create trigger trg_freguesias_updated_at
before update on public.freguesias for each row execute function public.update_updated_at_column();

create trigger trg_ruas_updated_at
before update on public.ruas for each row execute function public.update_updated_at_column();

-- Make driver fields optional
alter table public.vehicle_exits alter column driver_name drop not null;
alter table public.vehicle_exits alter column driver_license drop not null;

-- Crew search function
create or replace function public.search_active_crew_profiles(q text)
returns table(user_id uuid, display_name text)
language sql stable security definer set search_path = 'public' as $$
  select p.user_id,
         trim(both ' ' from coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) as display_name
  from public.profiles p
  where p.is_active = true
    and (
      q is null or q = ''
      or (coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')) ilike '%' || q || '%'
      or p.employee_number ilike '%' || q || '%'
    )
  order by p.first_name, p.last_name
$$;