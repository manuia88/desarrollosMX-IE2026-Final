-- F14.C M08 Marketing — landings (asesor landing pages personalizadas)
-- 4 templates (hero/grid/long-form/single-project) + project_ids[] (1..20) + brand colors + copy + seo_meta + is_published.
-- RLS owner-only mutations + public select via is_published=true (intentional_public).
-- Cero SECDEF nuevas — usa helpers existentes (rls_is_asesor / rls_is_admin / set_updated_at).

create table if not exists public.landings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code char(2) not null,
  slug text not null unique,
  template text not null check (template in ('hero', 'grid', 'long-form', 'single-project')),
  project_ids uuid[] not null check (
    array_length(project_ids, 1) between 1 and 20
  ),
  brand_colors jsonb not null default '{}'::jsonb,
  copy jsonb not null default '{}'::jsonb,
  seo_meta jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.landings is
  'F14.C M08 Marketing — landing pages personalizadas asesor (4 templates × project_ids[] × brand colors). Public select via slug cuando is_published=true.';
comment on column public.landings.user_id is
  'Asesor owner. ON DELETE CASCADE — privacy LFPDPPP.';
comment on column public.landings.slug is
  'Slug público URL /l/<asesor>/<slug>. UNIQUE global para evitar collisions cross-asesor.';
comment on column public.landings.project_ids is
  'Array uuid proyectos incluidos (1..20). FK polimórfico app-layer (resolver via proyectos table).';
comment on column public.landings.brand_colors is
  '{primary: hex, accent?: hex} validado Zod app-layer.';
comment on column public.landings.copy is
  '{headline?: str max 120, subheadline?: str max 240, cta?: str max 40} validado Zod.';
comment on column public.landings.seo_meta is
  '{title?: str max 70, description?: str max 160}.';

create index if not exists idx_landings_user
  on public.landings(user_id);
create index if not exists idx_landings_slug
  on public.landings(slug)
  where is_published = true;
create index if not exists idx_landings_user_published
  on public.landings(user_id, is_published, created_at desc);

drop trigger if exists trg_landings_updated_at on public.landings;
create trigger trg_landings_updated_at
  before update on public.landings
  for each row execute function public.set_updated_at();

alter table public.landings enable row level security;

drop policy if exists landings_select_owner on public.landings;
create policy landings_select_owner on public.landings
  for select to authenticated
  using (user_id = auth.uid());
comment on policy landings_select_owner on public.landings is
  'RATIONALE: asesor ve sus propios landings (default). Match pattern tareas_select_asesor_owned.';

drop policy if exists landings_select_admin on public.landings;
create policy landings_select_admin on public.landings
  for select to authenticated
  using (public.rls_is_admin());
comment on policy landings_select_admin on public.landings is
  'RATIONALE: superadmin override soporte + auditoría.';

drop policy if exists landings_select_public_published on public.landings;
create policy landings_select_public_published on public.landings
  for select to anon, authenticated
  using (is_published = true);
comment on policy landings_select_public_published on public.landings is
  'intentional_public — landing pública via slug accesible sin auth (canon /l/asesor/slug). RATIONALE: distribución pública del landing es feature core M08; publicación explícita gated por owner via update is_published=true.';

drop policy if exists landings_insert_owner on public.landings;
create policy landings_insert_owner on public.landings
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());
comment on policy landings_insert_owner on public.landings is
  'RATIONALE: asesor crea landings asignados a sí mismo.';

drop policy if exists landings_update_owner on public.landings;
create policy landings_update_owner on public.landings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
comment on policy landings_update_owner on public.landings is
  'RATIONALE: asesor actualiza sus landings (publish/unpublish/edit).';

drop policy if exists landings_delete_owner on public.landings;
create policy landings_delete_owner on public.landings
  for delete to authenticated
  using (user_id = auth.uid());
comment on policy landings_delete_owner on public.landings is
  'RATIONALE: asesor elimina sus landings.';

grant select on public.landings to anon, authenticated;
grant insert, update, delete on public.landings to authenticated;
