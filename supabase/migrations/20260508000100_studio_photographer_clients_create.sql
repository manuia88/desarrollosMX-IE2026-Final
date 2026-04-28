-- F14.F.10 Sprint 9 BIBLIA Upgrade 5 — studio_photographer_clients.
-- Tracking clientes asesores per fotógrafo (commission tracking + relation lifecycle).

create table public.studio_photographer_clients (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.studio_photographers(id) on delete cascade,
  client_user_id uuid references public.profiles(id) on delete set null,
  client_email text not null,
  client_name text,
  client_phone text,
  relation_status text not null default 'pending'
    check (relation_status in ('pending','invited','active','inactive','churned')),
  first_video_at timestamptz,
  last_video_at timestamptz,
  total_videos_generated integer not null default 0 check (total_videos_generated >= 0),
  total_revenue_attributed numeric(14,2) not null default 0,
  markup_applied numeric(5,2) check (markup_applied >= 0 and markup_applied <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_studio_photographer_clients_photographer on public.studio_photographer_clients(photographer_id);
create index idx_studio_photographer_clients_email on public.studio_photographer_clients(client_email);
create index idx_studio_photographer_clients_status on public.studio_photographer_clients(relation_status);
create index idx_studio_photographer_clients_client_user on public.studio_photographer_clients(client_user_id) where client_user_id is not null;

alter table public.studio_photographer_clients enable row level security;

create policy studio_photographer_clients_select_owner on public.studio_photographer_clients
  for select to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_clients.photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_clients_insert_owner on public.studio_photographer_clients
  for insert to authenticated
  with check (
    exists (
      select 1 from public.studio_photographers p
      where p.id = photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_clients_update_owner on public.studio_photographer_clients
  for update to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_clients.photographer_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.studio_photographers p
      where p.id = photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_clients_delete_owner on public.studio_photographer_clients
  for delete to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_clients.photographer_id
        and p.user_id = auth.uid()
    )
  );

comment on table public.studio_photographer_clients is
  'F14.F.10 Sprint 9 BIBLIA Upgrade 5 — Photographer clients tracking + commission attribution.';
