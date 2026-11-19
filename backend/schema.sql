begin;
create table public.tickets (
  id integer generated always as identity primary key,
  titre text not null check (length(trim(titre)) between 1 and 120),
  description text not null check (length(trim(description)) between 1 and 2000),
  statut text not null default 'Ouvert' check (statut in ('Ouvert', 'En cours', 'Résolu')),
  created_at timestamptz not null default now()
);
alter table public.tickets enable row level security;
revoke all on public.tickets from public, anon, authenticated;
grant select, insert, update on public.tickets to service_role;
grant usage, select on sequence public.tickets_id_seq to service_role;
commit;
