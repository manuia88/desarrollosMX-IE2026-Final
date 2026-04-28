-- F14.F.10 Sprint 9 BIBLIA LATERAL 7 — studio_photographer_directory.
-- Public marketplace listing (verified photographers DMX Studio).

create table public.studio_photographer_directory (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null unique references public.studio_photographers(id) on delete cascade,
  listing_status text not null default 'pending'
    check (listing_status in ('pending','verified','rejected','suspended')),
  listing_priority integer not null default 0,
  tags text[] not null default '{}',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_studio_photographer_directory_photographer on public.studio_photographer_directory(photographer_id);
create index idx_studio_photographer_directory_status on public.studio_photographer_directory(listing_status);
create index idx_studio_photographer_directory_priority on public.studio_photographer_directory(listing_priority desc) where listing_status = 'verified';

alter table public.studio_photographer_directory enable row level security;

create policy studio_photographer_directory_select_public on public.studio_photographer_directory
  for select to anon, authenticated
  using (listing_status = 'verified');

create policy studio_photographer_directory_select_owner on public.studio_photographer_directory
  for select to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_directory.photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_directory_insert_owner on public.studio_photographer_directory
  for insert to authenticated
  with check (
    exists (
      select 1 from public.studio_photographers p
      where p.id = photographer_id
        and p.user_id = auth.uid()
    )
  );

create policy studio_photographer_directory_update_owner on public.studio_photographer_directory
  for update to authenticated
  using (
    exists (
      select 1 from public.studio_photographers p
      where p.id = studio_photographer_directory.photographer_id
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

comment on table public.studio_photographer_directory is
  'F14.F.10 Sprint 9 BIBLIA LATERAL 7 — Public marketplace verified photographers directory.';
comment on policy studio_photographer_directory_select_public on public.studio_photographer_directory is
  'intentional_public_authed — directory público read-only verified listings (consumer marketplace).';
