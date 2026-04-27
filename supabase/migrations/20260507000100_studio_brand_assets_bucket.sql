-- F14.F.3 Sprint 2 BIBLIA — Brand assets bucket
-- studio-brand-assets: logos + watermarks + mockup previews per asesor.
-- Privado, owner CRUD scope <user_uuid>/.../

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('studio-brand-assets', 'studio-brand-assets', false, 5242880,
    array['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists studio_brand_assets_select on storage.objects;
drop policy if exists studio_brand_assets_insert on storage.objects;
drop policy if exists studio_brand_assets_update on storage.objects;
drop policy if exists studio_brand_assets_delete on storage.objects;

create policy studio_brand_assets_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'studio-brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_brand_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'studio-brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_brand_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'studio-brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy studio_brand_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'studio-brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
