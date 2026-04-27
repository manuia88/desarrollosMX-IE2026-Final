-- F14.C M08 Marketing — marketing_portales (configs portales) + marketing_publications (log) + utm_tracks
-- 7 portales canon: inmuebles24, mercadolibre, vivanuncios, icasas, propiedades_com, facebook_marketplace, easybroker.
-- H1: 2 reales (inmuebles24 + easybroker), 5 STUBs ADR-018 (rest).
-- credentials_encrypted bytea via pgsodium encrypt_secret/decrypt_secret existing helpers.
-- Cero SECDEF nuevas.

create table if not exists public.marketing_portales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portal text not null check (
    portal in (
      'inmuebles24',
      'mercadolibre',
      'vivanuncios',
      'icasas',
      'propiedades_com',
      'facebook_marketplace',
      'easybroker'
    )
  ),
  credentials_encrypted bytea,
  is_active boolean not null default false,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, portal)
);

comment on table public.marketing_portales is
  'F14.C M08 — Configs credenciales portales externos por user × portal. credentials_encrypted via pgsodium (encrypt_secret).';
comment on column public.marketing_portales.credentials_encrypted is
  'pgsodium ciphertext bytea — usar public.encrypt_secret(plaintext)::bytea / public.decrypt_secret(bytea).';

create index if not exists idx_marketing_portales_user
  on public.marketing_portales(user_id);

drop trigger if exists trg_marketing_portales_updated_at on public.marketing_portales;
create trigger trg_marketing_portales_updated_at
  before update on public.marketing_portales
  for each row execute function public.set_updated_at();

alter table public.marketing_portales enable row level security;

drop policy if exists marketing_portales_select_owner on public.marketing_portales;
create policy marketing_portales_select_owner on public.marketing_portales
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists marketing_portales_select_admin on public.marketing_portales;
create policy marketing_portales_select_admin on public.marketing_portales
  for select to authenticated
  using (public.rls_is_admin());

drop policy if exists marketing_portales_insert_owner on public.marketing_portales;
create policy marketing_portales_insert_owner on public.marketing_portales
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());

drop policy if exists marketing_portales_update_owner on public.marketing_portales;
create policy marketing_portales_update_owner on public.marketing_portales
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists marketing_portales_delete_owner on public.marketing_portales;
create policy marketing_portales_delete_owner on public.marketing_portales
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.marketing_portales to authenticated;

-- marketing_publications (log envíos a portales)

create table if not exists public.marketing_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.proyectos(id) on delete cascade,
  portal text not null check (
    portal in (
      'inmuebles24',
      'mercadolibre',
      'vivanuncios',
      'icasas',
      'propiedades_com',
      'facebook_marketplace',
      'easybroker'
    )
  ),
  status text not null default 'pending' check (status in ('pending', 'published', 'error', 'retry')),
  external_id text,
  error_message text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

comment on table public.marketing_publications is
  'F14.C M08 — Log publicaciones a portales externos. status canon (pending/published/error/retry).';

create index if not exists idx_marketing_publications_user
  on public.marketing_publications(user_id);
create index if not exists idx_marketing_publications_project
  on public.marketing_publications(project_id, portal);
create index if not exists idx_marketing_publications_status
  on public.marketing_publications(status, created_at desc);

alter table public.marketing_publications enable row level security;

drop policy if exists marketing_publications_select_owner on public.marketing_publications;
create policy marketing_publications_select_owner on public.marketing_publications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists marketing_publications_select_admin on public.marketing_publications;
create policy marketing_publications_select_admin on public.marketing_publications
  for select to authenticated
  using (public.rls_is_admin());

drop policy if exists marketing_publications_insert_owner on public.marketing_publications;
create policy marketing_publications_insert_owner on public.marketing_publications
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());

drop policy if exists marketing_publications_update_owner on public.marketing_publications;
create policy marketing_publications_update_owner on public.marketing_publications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.marketing_publications to authenticated;

-- utm_tracks (tracking links UTM unified)

create table if not exists public.utm_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('landing', 'qr', 'wa_template', 'folder')),
  source_id uuid,
  utm_params jsonb not null default '{}'::jsonb,
  short_url text not null unique,
  clicks_count integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.utm_tracks is
  'F14.C M08 — Tracking links UTM unified across landings/QR/WA/folders. short_url UNIQUE redirect via /t/<short>.';
comment on column public.utm_tracks.utm_params is
  '{utm_source, utm_medium, utm_campaign, utm_content?, utm_term?} validado Zod.';

create index if not exists idx_utm_tracks_user
  on public.utm_tracks(user_id);
create index if not exists idx_utm_tracks_short_url
  on public.utm_tracks(short_url);
create index if not exists idx_utm_tracks_source
  on public.utm_tracks(source_type, source_id);

alter table public.utm_tracks enable row level security;

drop policy if exists utm_tracks_select_owner on public.utm_tracks;
create policy utm_tracks_select_owner on public.utm_tracks
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists utm_tracks_select_admin on public.utm_tracks;
create policy utm_tracks_select_admin on public.utm_tracks
  for select to authenticated
  using (public.rls_is_admin());

drop policy if exists utm_tracks_insert_owner on public.utm_tracks;
create policy utm_tracks_insert_owner on public.utm_tracks
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());

drop policy if exists utm_tracks_update_owner on public.utm_tracks;
create policy utm_tracks_update_owner on public.utm_tracks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists utm_tracks_delete_owner on public.utm_tracks;
create policy utm_tracks_delete_owner on public.utm_tracks
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.utm_tracks to authenticated;
