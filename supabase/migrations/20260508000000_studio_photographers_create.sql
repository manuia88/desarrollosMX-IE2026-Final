-- F14.F.10 Sprint 9 BIBLIA Tarea 9.1+9.3 — studio_photographers.
-- Plan Fotógrafo B2B2C: fotógrafo profesional usa Studio + revende videos a clientes asesores.
-- 1 photographer profile per user (UNIQUE user_id). Slug único portfolio público + white-label.

create table public.studio_photographers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  bio text,
  phone text,
  email text not null,
  website text,
  speciality_zones text[] not null default '{}',
  years_experience integer check (years_experience >= 0),
  portfolio_visible boolean not null default true,
  markup_pct numeric(5,2) check (markup_pct >= 0 and markup_pct <= 1000),
  white_label_enabled boolean not null default false,
  white_label_custom_footer text,
  directory_listing_enabled boolean not null default false,
  verified boolean not null default false,
  rating_avg numeric(3,2) check (rating_avg >= 0 and rating_avg <= 5),
  clients_count integer not null default 0 check (clients_count >= 0),
  videos_generated_total integer not null default 0 check (videos_generated_total >= 0),
  revenue_est_total numeric(14,2) not null default 0,
  reseller_terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_studio_photographers_user on public.studio_photographers(user_id);
create unique index idx_studio_photographers_slug on public.studio_photographers(slug);
create index idx_studio_photographers_verified on public.studio_photographers(verified) where verified = true;
create index idx_studio_photographers_directory on public.studio_photographers(directory_listing_enabled) where directory_listing_enabled = true;

alter table public.studio_photographers enable row level security;

create policy studio_photographers_select_self on public.studio_photographers
  for select to authenticated
  using (user_id = auth.uid());

create policy studio_photographers_select_public_portfolio on public.studio_photographers
  for select to anon, authenticated
  using (portfolio_visible = true or directory_listing_enabled = true);

create policy studio_photographers_insert_self on public.studio_photographers
  for insert to authenticated
  with check (user_id = auth.uid());

create policy studio_photographers_update_self on public.studio_photographers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy studio_photographers_delete_self on public.studio_photographers
  for delete to authenticated
  using (user_id = auth.uid());

comment on table public.studio_photographers is
  'F14.F.10 Sprint 9 BIBLIA Tarea 9.1+9.3 — Photographer B2B2C profile. Plan Foto $67. Slug portfolio público.';
comment on policy studio_photographers_select_public_portfolio on public.studio_photographers is
  'intentional_public_authed — portfolio público slug-based + marketplace directory verified read.';
