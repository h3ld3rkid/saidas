-- Sample data for Portugal address hierarchy
insert into public.distritos (nome) values ('Braga') on conflict do nothing;
insert into public.distritos (nome) values ('Porto') on conflict do nothing;
insert into public.distritos (nome) values ('Lisboa') on conflict do nothing;

-- Get district IDs for Braga
with braga_id as (select id from public.distritos where nome = 'Braga' limit 1)
insert into public.concelhos (distrito_id, nome) 
select braga_id.id, 'Amares' from braga_id
on conflict do nothing;

with braga_id as (select id from public.distritos where nome = 'Braga' limit 1)
insert into public.concelhos (distrito_id, nome) 
select braga_id.id, 'Braga' from braga_id
on conflict do nothing;

with braga_id as (select id from public.distritos where nome = 'Braga' limit 1)
insert into public.concelhos (distrito_id, nome) 
select braga_id.id, 'Guimarães' from braga_id
on conflict do nothing;

-- Get concelho ID for Amares
with amares_id as (select c.id from public.concelhos c join public.distritos d on c.distrito_id = d.id where d.nome = 'Braga' and c.nome = 'Amares' limit 1)
insert into public.freguesias (concelho_id, nome) 
select amares_id.id, 'Ferreiros' from amares_id
on conflict do nothing;

with amares_id as (select c.id from public.concelhos c join public.distritos d on c.distrito_id = d.id where d.nome = 'Braga' and c.nome = 'Amares' limit 1)
insert into public.freguesias (concelho_id, nome) 
select amares_id.id, 'Dornelas' from amares_id
on conflict do nothing;

-- Sample streets for Ferreiros
with ferreiros_id as (
  select f.id 
  from public.freguesias f 
  join public.concelhos c on f.concelho_id = c.id 
  join public.distritos d on c.distrito_id = d.id 
  where d.nome = 'Braga' and c.nome = 'Amares' and f.nome = 'Ferreiros' 
  limit 1
)
insert into public.ruas (freguesia_id, nome) 
select ferreiros_id.id, 'Rua Principal' from ferreiros_id
on conflict do nothing;

with ferreiros_id as (
  select f.id 
  from public.freguesias f 
  join public.concelhos c on f.concelho_id = c.id 
  join public.distritos d on c.distrito_id = d.id 
  where d.nome = 'Braga' and c.nome = 'Amares' and f.nome = 'Ferreiros' 
  limit 1
)
insert into public.ruas (freguesia_id, nome) 
select ferreiros_id.id, 'Rua da Igreja' from ferreiros_id
on conflict do nothing;