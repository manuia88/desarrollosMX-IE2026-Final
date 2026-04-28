-- F14.F.8 Sprint 7 BIBLIA — studio_gallery_views_log (Tarea 7.3 analytics + Upgrade 6 social proof).
-- Tracking visitas galería pública. Privacy-respectful: ip_hash (SHA256) NO ip raw.
-- H1 tabla simple. H2 partitioning mensual via pg_partman cuando volumen lo justifique
-- (L-NEW-PUBLIC-GALLERY-CDN-CACHE-OPTIMIZATION agendado canon).

create table public.studio_gallery_views_log (
  id uuid primary key default gen_random_uuid(),
  asesor_slug text not null,
  asesor_user_id uuid references public.profiles(id) on delete cascade,
  video_id uuid references public.studio_video_outputs(id) on delete set null,
  referer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country_code char(2),
  device_type text check (device_type in ('desktop','mobile','tablet','bot','unknown')),
  ip_hash text,
  user_agent_truncated text,
  created_at timestamptz not null default now()
);

create index idx_studio_gallery_views_slug on public.studio_gallery_views_log(asesor_slug);
create index idx_studio_gallery_views_created on public.studio_gallery_views_log(created_at desc);
create index idx_studio_gallery_views_video on public.studio_gallery_views_log(video_id) where video_id is not null;
create index idx_studio_gallery_views_user on public.studio_gallery_views_log(asesor_user_id) where asesor_user_id is not null;

alter table public.studio_gallery_views_log enable row level security;

-- Insert público (anon tracking) — INSERT policy con qual=true es ignorado por audit (cmd <> 'a').
create policy studio_gallery_views_insert_public on public.studio_gallery_views_log
  for insert to anon, authenticated
  with check (true);

-- Select solo dueño galería (asesor del slug).
create policy studio_gallery_views_select_owner on public.studio_gallery_views_log
  for select to authenticated
  using (asesor_user_id = auth.uid());

comment on table public.studio_gallery_views_log is
  'F14.F.8 Sprint 7 BIBLIA Tarea 7.3 — Tracking visitas galería pública. ip_hash SHA256 (privacy).';
