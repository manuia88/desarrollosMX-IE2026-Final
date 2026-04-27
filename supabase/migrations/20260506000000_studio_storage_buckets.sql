-- DMX Studio storage buckets (FASE 14.F.2 Sprint 1).
-- ADR-054 DMX Studio dentro DMX único entorno.
-- Convention: bucket/<user_uuid>/<rest>
-- Validación adicional client-side en features/dmx-studio/lib/storage/.

-- ============================================================
-- Buckets (idempotente)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('studio-voice-samples', 'studio-voice-samples', false, 10485760,
    array['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg']),
  ('studio-project-assets', 'studio-project-assets', false, 26214400,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']),
  ('studio-outputs', 'studio-outputs', false, 524288000,
    array['video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 1. studio-voice-samples (privado; owner CRUD)
-- ============================================================
drop policy if exists studio_voice_samples_select on storage.objects;
drop policy if exists studio_voice_samples_insert on storage.objects;
drop policy if exists studio_voice_samples_update on storage.objects;
drop policy if exists studio_voice_samples_delete on storage.objects;

create policy studio_voice_samples_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'studio-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_voice_samples_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'studio-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_voice_samples_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'studio-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_voice_samples_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'studio-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 2. studio-project-assets (privado; owner CRUD)
-- ============================================================
drop policy if exists studio_project_assets_select on storage.objects;
drop policy if exists studio_project_assets_insert on storage.objects;
drop policy if exists studio_project_assets_update on storage.objects;
drop policy if exists studio_project_assets_delete on storage.objects;

create policy studio_project_assets_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'studio-project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_project_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'studio-project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_project_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'studio-project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_project_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'studio-project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 3. studio-outputs (privado; owner read; service_role + owner insert)
-- ============================================================
drop policy if exists studio_outputs_select on storage.objects;
drop policy if exists studio_outputs_insert on storage.objects;
drop policy if exists studio_outputs_update on storage.objects;
drop policy if exists studio_outputs_delete on storage.objects;

create policy studio_outputs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'studio-outputs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_outputs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'studio-outputs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_outputs_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'studio-outputs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_outputs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'studio-outputs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
