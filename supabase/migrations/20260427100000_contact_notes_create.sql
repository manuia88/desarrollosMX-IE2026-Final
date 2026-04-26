-- FASE 13.F PR-C — M03 Contact Notes 3-niveles visibility
-- Tabla contact_notes con RLS tri-level: personal | colaborativo (broker_company) | sistema
-- author_user_id FK profiles.id (no auth.users) por consistency CRM Foundation

create type public.contact_note_level as enum ('personal', 'colaborativo', 'sistema');

create table public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  level public.contact_note_level not null default 'personal',
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  content_md text not null check (length(content_md) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_notes_lead_id_idx on public.contact_notes (lead_id);
create index contact_notes_author_user_id_idx on public.contact_notes (author_user_id);
create index contact_notes_level_idx on public.contact_notes (level);
create index contact_notes_created_at_idx on public.contact_notes (created_at desc);
create index contact_notes_lead_created_idx on public.contact_notes (lead_id, created_at desc);

create trigger contact_notes_set_updated_at
  before update on public.contact_notes
  for each row execute function public.set_updated_at();

alter table public.contact_notes enable row level security;

-- SELECT personal: solo author
create policy contact_notes_select_personal
  on public.contact_notes
  for select
  to authenticated
  using (
    level = 'personal'::public.contact_note_level
    and author_user_id = auth.uid()
  );

-- SELECT colaborativo: caller comparte broker_company_id con author
create policy contact_notes_select_colaborativo
  on public.contact_notes
  for select
  to authenticated
  using (
    level = 'colaborativo'::public.contact_note_level
    and exists (
      select 1
      from public.profiles author_p
      join public.profiles caller_p on caller_p.id = auth.uid()
      where author_p.id = contact_notes.author_user_id
        and author_p.broker_company_id is not null
        and caller_p.broker_company_id = author_p.broker_company_id
    )
  );

-- SELECT sistema: cualquier authenticated
create policy contact_notes_select_sistema
  on public.contact_notes
  for select
  to authenticated
  using (
    level = 'sistema'::public.contact_note_level
    and auth.uid() is not null
  );

-- SELECT admin: superadmin override
create policy contact_notes_select_admin
  on public.contact_notes
  for select
  to authenticated
  using (public.rls_is_admin());

-- INSERT: author_user_id = auth.uid() (force ownership)
create policy contact_notes_insert_self
  on public.contact_notes
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and auth.uid() is not null
  );

-- UPDATE: author OR admin
create policy contact_notes_update_owner
  on public.contact_notes
  for update
  to authenticated
  using (author_user_id = auth.uid() or public.rls_is_admin())
  with check (author_user_id = auth.uid() or public.rls_is_admin());

-- DELETE: author OR admin
create policy contact_notes_delete_owner
  on public.contact_notes
  for delete
  to authenticated
  using (author_user_id = auth.uid() or public.rls_is_admin());

comment on table public.contact_notes is
  'FASE 13.F PR-C M03 — Notas asociadas a leads con visibility tri-level (personal/colaborativo/sistema). RLS enforced per level.';
comment on column public.contact_notes.level is
  'personal: solo author. colaborativo: team mismo broker_company_id. sistema: read-all authenticated.';
comment on column public.contact_notes.content_md is
  'Markdown content (1-8000 chars). Renderizado en cliente via react-markdown.';
