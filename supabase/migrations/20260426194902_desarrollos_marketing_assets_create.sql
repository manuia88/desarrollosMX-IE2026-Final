-- F2.13.C-datasource — marketing_assets (5 variantes canonicas + locale)
-- RLS heredado proyecto_id

create type public.marketing_asset_type as enum (
  'photo_gallery',
  'video',
  'video_story',
  'brochure_pdf',
  'render_3d',
  'virtual_tour',
  'floor_plan',
  'post_cuadrado',
  'post_largo',
  'story'
);
create type public.marketing_asset_status as enum ('ready', 'generating', 'expired', 'error');

create table public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  asset_type public.marketing_asset_type not null,
  url text,
  thumbnail_url text,
  format text,
  locale char(5) not null default 'es-MX',
  status public.marketing_asset_status not null default 'ready',
  display_order smallint not null default 0,
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketing_assets_proyecto_idx on public.marketing_assets (proyecto_id);
create index marketing_assets_type_idx on public.marketing_assets (proyecto_id, asset_type);
create index marketing_assets_status_idx on public.marketing_assets (status);
create index marketing_assets_locale_idx on public.marketing_assets (locale);

comment on table public.marketing_assets is 'Assets marketing (5 variantes canonicas: postCuadrado/postLargo/story/videoStory/video). videoStory + video TTL 24h via expires_at.';

create trigger marketing_assets_set_updated_at
  before update on public.marketing_assets
  for each row
  execute function public.set_updated_at();

alter table public.marketing_assets enable row level security;

create policy marketing_assets_superadmin_all on public.marketing_assets
  for all
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy marketing_assets_select_via_proyecto on public.marketing_assets
  for select
  to authenticated
  using (
    proyecto_id in (
      select id from public.proyectos
    )
  );

create policy marketing_assets_developer_modify on public.marketing_assets
  for insert
  to authenticated
  with check (
    public.rls_is_developer()
    and proyecto_id in (
      select id from public.proyectos
      where desarrolladora_id = (
        select desarrolladora_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy marketing_assets_developer_update on public.marketing_assets
  for update
  to authenticated
  using (
    public.rls_is_developer()
    and proyecto_id in (
      select id from public.proyectos
      where desarrolladora_id = (
        select desarrolladora_id from public.profiles where id = auth.uid()
      )
    )
  )
  with check (
    public.rls_is_developer()
  );

grant select on public.marketing_assets to authenticated;
grant insert, update on public.marketing_assets to authenticated;
