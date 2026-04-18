-- Storage buckets H1: profile-avatars, project-photos, operation-files, commission-invoices, dossier-exports
-- FASE 06 / MÓDULO 6.B.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.B.1 + ADR-009 D6
--
-- Convención de path: bucket/<owner_uuid>/<filename>
--   owner_uuid es auth.uid() (para avatars/dossier) o la entidad dueña (operations, projects).
-- Validación adicional client-side en shared/lib/storage/upload.ts (defense in depth).

-- ============================================================
-- Helper stub: is_operation_participant(uuid)
-- En FASE 07+ (operations) se reemplaza con lógica real (JOIN operations + participantes).
-- Hasta entonces, sólo superadmin puede leer/escribir operation-files.
-- ============================================================
create or replace function public.is_operation_participant(p_operation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return false; end if;
  -- TODO FASE 07: JOIN public.operations + public.operation_participants.
  return public.is_superadmin();
end;
$$;

comment on function public.is_operation_participant(uuid) is
  'Stub FASE 06: solo superadmin. FASE 07+ agrega JOIN a operations + participantes. ADR-009 D6.';

revoke execute on function public.is_operation_participant(uuid) from public, anon;
grant execute on function public.is_operation_participant(uuid) to authenticated, service_role;

-- ============================================================
-- Buckets (idempotente)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-avatars', 'profile-avatars', true, 5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('project-photos', 'project-photos', true, 15728640,
    array['image/png', 'image/jpeg', 'image/webp']),
  ('operation-files', 'operation-files', false, 52428800,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('commission-invoices', 'commission-invoices', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'application/xml', 'text/xml']),
  ('dossier-exports', 'dossier-exports', false, 52428800,
    array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- RLS policies por bucket (idempotentes: drop+create)
-- storage.objects.name convención: '<owner_uuid>/<rest>' → (storage.foldername(name))[1] = owner_uuid
-- ============================================================

-- 1. profile-avatars (public read, owner CRUD)
drop policy if exists avatars_select_public on storage.objects;
drop policy if exists avatars_insert_owner on storage.objects;
drop policy if exists avatars_update_owner on storage.objects;
drop policy if exists avatars_delete_owner on storage.objects;

-- intentional_public: avatars son bucket público (ADR-009 D6 tabla).
-- (COMMENT ON POLICY no se emite en storage.objects; su owner es supabase_storage_admin.)
create policy avatars_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-avatars');

create policy avatars_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_owner on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. project-photos (public read, dev/asesor/superadmin INSERT)
drop policy if exists photos_select_public on storage.objects;
drop policy if exists photos_insert_dev on storage.objects;
drop policy if exists photos_update_dev on storage.objects;
drop policy if exists photos_delete_dev on storage.objects;

-- intentional_public: fotos de proyecto listables en marketplace. ADR-009 D6.
create policy photos_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'project-photos');

create policy photos_insert_dev on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-photos'
    and public.get_user_role() in ('admin_desarrolladora', 'asesor', 'superadmin')
  );

create policy photos_update_dev on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-photos'
    and public.get_user_role() in ('admin_desarrolladora', 'asesor', 'superadmin')
  );

create policy photos_delete_dev on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-photos'
    and public.get_user_role() in ('admin_desarrolladora', 'superadmin')
  );

-- 3. operation-files (privado; solo participantes de la operación)
drop policy if exists opfiles_select_participant on storage.objects;
drop policy if exists opfiles_insert_participant on storage.objects;
drop policy if exists opfiles_update_participant on storage.objects;
drop policy if exists opfiles_delete_participant on storage.objects;

create policy opfiles_select_participant on storage.objects
  for select to authenticated
  using (
    bucket_id = 'operation-files'
    and public.is_operation_participant(((storage.foldername(name))[1])::uuid)
  );

create policy opfiles_insert_participant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'operation-files'
    and public.is_operation_participant(((storage.foldername(name))[1])::uuid)
  );

create policy opfiles_update_participant on storage.objects
  for update to authenticated
  using (
    bucket_id = 'operation-files'
    and public.is_operation_participant(((storage.foldername(name))[1])::uuid)
  );

create policy opfiles_delete_participant on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'operation-files'
    and public.is_superadmin()
  );

-- 4. commission-invoices (privado; admin_desarrolladora/mb_admin/superadmin)
drop policy if exists invoices_select on storage.objects;
drop policy if exists invoices_insert on storage.objects;
drop policy if exists invoices_update on storage.objects;
drop policy if exists invoices_delete on storage.objects;

create policy invoices_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'commission-invoices'
    and public.get_user_role() in ('admin_desarrolladora', 'mb_admin', 'superadmin')
  );

create policy invoices_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'commission-invoices'
    and public.get_user_role() in ('admin_desarrolladora', 'mb_admin', 'superadmin')
  );

create policy invoices_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'commission-invoices'
    and public.get_user_role() in ('admin_desarrolladora', 'mb_admin', 'superadmin')
  );

create policy invoices_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'commission-invoices'
    and public.is_superadmin()
  );

-- 5. dossier-exports (privado; creator + superadmin)
drop policy if exists dossier_select on storage.objects;
drop policy if exists dossier_insert on storage.objects;
drop policy if exists dossier_update on storage.objects;
drop policy if exists dossier_delete on storage.objects;

create policy dossier_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dossier-exports'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_superadmin())
  );

create policy dossier_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dossier-exports'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_superadmin())
  );

create policy dossier_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dossier-exports'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_superadmin())
  );

create policy dossier_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dossier-exports'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_superadmin())
  );
