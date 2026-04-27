-- F14.F.4 Sprint 3 BIBLIA — Copy versions histórico (Time Machine UPGRADE 7).
--
-- Cada studio_copy_outputs puede tener N versiones (regeneration + 3 tonos
-- variations). Asesor selecciona favorita → marca is_current=true. Time
-- Machine UI permite rollback a versions anteriores.
--
-- ADR-054 canon: tablas studio_* dentro DMX único entorno.
-- RLS owner-only via copy_outputs project_id (ownership cascade).

create table public.studio_copy_versions (
  id uuid primary key default gen_random_uuid(),
  copy_output_id uuid not null references public.studio_copy_outputs(id) on delete cascade,
  version_number integer not null,
  content text not null,
  tone text not null check (tone in ('formal','cercano','aspiracional','original')),
  regenerated_by uuid references public.profiles(id) on delete set null,
  regenerated_at timestamptz not null default now(),
  is_current boolean not null default false,
  cost_usd numeric(8,4),
  ai_model text,
  meta jsonb not null default '{}'::jsonb,
  unique (copy_output_id, version_number)
);

create index idx_studio_copy_versions_output
  on public.studio_copy_versions(copy_output_id);

create index idx_studio_copy_versions_current
  on public.studio_copy_versions(copy_output_id, is_current)
  where is_current = true;

create index idx_studio_copy_versions_tone
  on public.studio_copy_versions(copy_output_id, tone);

alter table public.studio_copy_versions enable row level security;

create policy studio_copy_versions_select_self
  on public.studio_copy_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.studio_copy_outputs co
      where co.id = studio_copy_versions.copy_output_id
        and co.user_id = auth.uid()
    )
  );

create policy studio_copy_versions_insert_self
  on public.studio_copy_versions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.studio_copy_outputs co
      where co.id = studio_copy_versions.copy_output_id
        and co.user_id = auth.uid()
    )
  );

create policy studio_copy_versions_update_self
  on public.studio_copy_versions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.studio_copy_outputs co
      where co.id = studio_copy_versions.copy_output_id
        and co.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.studio_copy_outputs co
      where co.id = studio_copy_versions.copy_output_id
        and co.user_id = auth.uid()
    )
  );

create policy studio_copy_versions_delete_self
  on public.studio_copy_versions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.studio_copy_outputs co
      where co.id = studio_copy_versions.copy_output_id
        and co.user_id = auth.uid()
    )
  );

comment on table public.studio_copy_versions is
  'F14.F.4 Sprint 3: histórico versions copy outputs (Time Machine UPGRADE 7). 3 tonos variations + regeneration audit. RLS via copy_outputs ownership.';
comment on column public.studio_copy_versions.tone is
  'formal | cercano | aspiracional | original. Original = primer generate antes regeneration.';
comment on column public.studio_copy_versions.is_current is
  'true = version actualmente seleccionada por asesor. UNIQUE-ish per copy_output (UI enforces single current).';
comment on column public.studio_copy_versions.version_number is
  'Sequential per copy_output. Empieza en 1 (original).';
