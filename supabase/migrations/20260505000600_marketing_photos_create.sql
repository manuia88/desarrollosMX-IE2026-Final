-- F14.C M08 Marketing — photos (upload + classify Anthropic Vision)
-- 7 categorías canon: sala / cocina / recamara / bano / fachada / exterior / plano.
-- classify_status pipeline: pending → done | error.
-- Cero SECDEF nuevas.

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  captacion_id uuid references public.captaciones(id) on delete cascade,
  storage_path text not null,
  url text,
  mime_type text,
  file_size_bytes integer,
  category text check (category in ('sala', 'cocina', 'recamara', 'bano', 'fachada', 'exterior', 'plano')),
  classify_confidence numeric(3, 2) check (classify_confidence is null or (classify_confidence between 0 and 1)),
  classify_status text not null default 'pending' check (classify_status in ('pending', 'done', 'error')),
  classify_error text,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.photos is
  'F14.C M08 — Photos upload + classify Anthropic Vision (claude-haiku-4-5). 7 categorías canon. proyecto_id/captacion_id polimórfico (al menos uno presente o ambos NULL = standalone marketing).';
comment on column public.photos.category is
  '7 categorías canon: sala/cocina/recamara/bano/fachada/exterior/plano. NULL hasta classify done.';
comment on column public.photos.classify_confidence is
  'Confidence Anthropic Vision 0..1. NULL hasta classify done.';

create index if not exists idx_photos_user
  on public.photos(user_id);
create index if not exists idx_photos_proyecto
  on public.photos(proyecto_id)
  where proyecto_id is not null;
create index if not exists idx_photos_captacion
  on public.photos(captacion_id)
  where captacion_id is not null;
create index if not exists idx_photos_classify_pending
  on public.photos(classify_status, created_at)
  where classify_status = 'pending';

drop trigger if exists trg_photos_updated_at on public.photos;
create trigger trg_photos_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

alter table public.photos enable row level security;

drop policy if exists photos_select_owner on public.photos;
create policy photos_select_owner on public.photos
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists photos_select_admin on public.photos;
create policy photos_select_admin on public.photos
  for select to authenticated
  using (public.rls_is_admin());

drop policy if exists photos_insert_owner on public.photos;
create policy photos_insert_owner on public.photos
  for insert to authenticated
  with check (user_id = auth.uid() and public.rls_is_asesor());

drop policy if exists photos_update_owner on public.photos;
create policy photos_update_owner on public.photos
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists photos_delete_owner on public.photos;
create policy photos_delete_owner on public.photos
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.photos to authenticated;
