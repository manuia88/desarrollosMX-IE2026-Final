-- F14.F.8 Sprint 7 BIBLIA — studio_avatar_variants (Upgrade 2 DIRECTO).
-- 3 estilos avatar per asesor (formal/casual/branded). Switch per video.
-- Branded variant aplica brand_kit colors + logo overlay automáticamente.

create table public.studio_avatar_variants (
  id uuid primary key default gen_random_uuid(),
  avatar_id uuid not null references public.studio_avatars(id) on delete cascade,
  style text not null check (style in ('formal','casual','branded')),
  heygen_variant_id text,
  storage_path text,
  preview_image_url text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (avatar_id, style)
);

create index idx_studio_avatar_variants_avatar on public.studio_avatar_variants(avatar_id);

alter table public.studio_avatar_variants enable row level security;

create policy studio_avatar_variants_select_via_avatar on public.studio_avatar_variants
  for select to authenticated
  using (
    exists (
      select 1 from public.studio_avatars a
      where a.id = studio_avatar_variants.avatar_id
        and a.user_id = auth.uid()
    )
  );
create policy studio_avatar_variants_insert_via_avatar on public.studio_avatar_variants
  for insert to authenticated
  with check (
    exists (
      select 1 from public.studio_avatars a
      where a.id = studio_avatar_variants.avatar_id
        and a.user_id = auth.uid()
    )
  );
create policy studio_avatar_variants_update_via_avatar on public.studio_avatar_variants
  for update to authenticated
  using (
    exists (
      select 1 from public.studio_avatars a
      where a.id = studio_avatar_variants.avatar_id
        and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.studio_avatars a
      where a.id = studio_avatar_variants.avatar_id
        and a.user_id = auth.uid()
    )
  );
create policy studio_avatar_variants_delete_via_avatar on public.studio_avatar_variants
  for delete to authenticated
  using (
    exists (
      select 1 from public.studio_avatars a
      where a.id = studio_avatar_variants.avatar_id
        and a.user_id = auth.uid()
    )
  );

comment on table public.studio_avatar_variants is
  'F14.F.8 Sprint 7 BIBLIA Upgrade 2 — 3 estilos avatar per asesor (formal/casual/branded).';
