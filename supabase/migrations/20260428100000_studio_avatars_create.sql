-- F14.F.8 Sprint 7 BIBLIA — studio_avatars (Tarea 7.1).
-- Avatar IA del asesor (HeyGen). Agency-only. 1 avatar per user (UNIQUE user_id).
-- Source: foto frontal asesor + voice sample 30s. HeyGen API genera avatar_id estable.

create table public.studio_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  heygen_avatar_id text,
  source_photo_storage_path text not null,
  voice_sample_storage_path text not null,
  linked_voice_clone_id uuid references public.studio_voice_clones(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','failed')),
  quality_score numeric(4,2),
  cost_usd numeric(8,4) not null default 0,
  failure_reason text,
  created_at timestamptz not null default now(),
  ready_at timestamptz
);

create index idx_studio_avatars_user on public.studio_avatars(user_id);
create index idx_studio_avatars_status on public.studio_avatars(status);

alter table public.studio_avatars enable row level security;

create policy studio_avatars_select_self on public.studio_avatars
  for select to authenticated
  using (user_id = auth.uid());
create policy studio_avatars_insert_self on public.studio_avatars
  for insert to authenticated
  with check (user_id = auth.uid());
create policy studio_avatars_update_self on public.studio_avatars
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy studio_avatars_delete_self on public.studio_avatars
  for delete to authenticated
  using (user_id = auth.uid());

comment on table public.studio_avatars is
  'F14.F.8 Sprint 7 BIBLIA Tarea 7.1 — Avatar IA per asesor (HeyGen). Agency-only paywall.';
