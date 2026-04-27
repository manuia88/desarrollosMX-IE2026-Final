-- F14.C M08 Marketing — client_folders + folder_projects (Radar compartido)
-- Folder = 1 buyer target. Proyectos asociados expuestos público via slug /radar/[slug].
-- Cero SECDEF nuevas.

create table if not exists public.client_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_contacto_id uuid,
  title text not null check (char_length(title) between 3 and 200),
  description text check (char_length(description) <= 1000),
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_folders is
  'F14.C M08 — Client folders (Radar compartido). user_id asesor owner; slug expone público /radar/<slug>.';
comment on column public.client_folders.cliente_contacto_id is
  'FK soft a leads/buyer_twins (resolver app-layer). NULL si folder no aún asociado.';
comment on column public.client_folders.slug is
  'UNIQUE global. URL pública /radar/<slug> sin auth.';

create index if not exists idx_client_folders_user
  on public.client_folders(user_id);
create index if not exists idx_client_folders_slug
  on public.client_folders(slug)
  where is_active = true;

drop trigger if exists trg_client_folders_updated_at on public.client_folders;
create trigger trg_client_folders_updated_at
  before update on public.client_folders
  for each row execute function public.set_updated_at();

alter table public.client_folders enable row level security;

drop policy if exists client_folders_select_owner on public.client_folders;
create policy client_folders_select_owner on public.client_folders
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists client_folders_select_admin on public.client_folders;
create policy client_folders_select_admin on public.client_folders
  for select to authenticated
  using (public.rls_is_admin());

drop policy if exists client_folders_select_public_active on public.client_folders;
create policy client_folders_select_public_active on public.client_folders
  for select to anon, authenticated
  using (is_active = true);
comment on policy client_folders_select_public_active on public.client_folders is
  'intentional_public — folder activo accesible vía slug sin auth (Radar compartido). RATIONALE: feature core M08 distribución pública selección curada con IE.';

drop policy if exists client_folders_insert_owner on public.client_folders;
create policy client_folders_insert_owner on public.client_folders
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());

drop policy if exists client_folders_update_owner on public.client_folders;
create policy client_folders_update_owner on public.client_folders
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists client_folders_delete_owner on public.client_folders;
create policy client_folders_delete_owner on public.client_folders
  for delete to authenticated
  using (user_id = auth.uid());

grant select on public.client_folders to anon, authenticated;
grant insert, update, delete on public.client_folders to authenticated;

-- folder_projects (link M:N folder ↔ proyecto)

create table if not exists public.folder_projects (
  folder_id uuid not null references public.client_folders(id) on delete cascade,
  project_id uuid not null references public.proyectos(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (folder_id, project_id)
);

comment on table public.folder_projects is
  'F14.C M08 — Link M:N client_folders ↔ proyectos. CASCADE delete de cualquier lado.';

create index if not exists idx_folder_projects_folder_sort
  on public.folder_projects(folder_id, sort_order);

alter table public.folder_projects enable row level security;

drop policy if exists folder_projects_select_via_folder on public.folder_projects;
create policy folder_projects_select_via_folder on public.folder_projects
  for select to anon, authenticated
  using (
    folder_id in (
      select id from public.client_folders
      where user_id = auth.uid() or is_active = true
    )
  );
comment on policy folder_projects_select_via_folder on public.folder_projects is
  'intentional_public — visible si folder activo (Radar compartido) o owner asesor. RATIONALE: derivado de client_folders public access.';

drop policy if exists folder_projects_modify_owner on public.folder_projects;
create policy folder_projects_modify_owner on public.folder_projects
  for all to authenticated
  using (
    folder_id in (
      select id from public.client_folders where user_id = auth.uid()
    )
  )
  with check (
    folder_id in (
      select id from public.client_folders where user_id = auth.uid()
    )
  );
comment on policy folder_projects_modify_owner on public.folder_projects is
  'RATIONALE: asesor agrega/quita proyectos de sus folders propios.';

grant select on public.folder_projects to anon, authenticated;
grant insert, update, delete on public.folder_projects to authenticated;
