-- Storage buckets para ingesta:
--   ingest-uploads  → admin upload XLSX/CSV/PDF (privado, mb_admin only).
--   ingest-raw      → raw payloads de ingest_runs para replay (privado, retention 30d).
-- FASE 07 / BLOQUE 7.A / MÓDULO 7.A.1 + upgrade #2 ingestion replay
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.H
--   §5.A FASE 07 — upgrade #2 (ingestion replay raw payloads)
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-009_SECURITY.md (Storage signed URLs)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'ingest-uploads',
    'ingest-uploads',
    false,
    104857600, -- 100 MB
    array[
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
      'application/zip'
    ]
  ),
  (
    'ingest-raw',
    'ingest-raw',
    false,
    52428800, -- 50 MB
    array[
      'application/json',
      'application/gzip',
      'application/octet-stream'
    ]
  )
on conflict (id) do nothing;

-- ============================================================
-- RLS Storage policies — solo mb_admin / superadmin pueden leer/escribir.
-- ============================================================

create policy "ingest_uploads_admin_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ingest-uploads'
    and (
      public.is_superadmin()
      or public.get_user_role() = 'mb_admin'
    )
  );

create policy "ingest_uploads_admin_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ingest-uploads'
    and (
      public.is_superadmin()
      or public.get_user_role() = 'mb_admin'
    )
  );

create policy "ingest_uploads_admin_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'ingest-uploads'
    and public.is_superadmin()
  );

create policy "ingest_raw_admin_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ingest-raw'
    and (
      public.is_superadmin()
      or public.get_user_role() = 'mb_admin'
    )
  );

create policy "ingest_raw_service_only_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ingest-raw'
    and public.is_superadmin()
  );

-- Comments en storage.objects requieren ownership; Supabase no permite. Documentado
-- aquí en su lugar:
--   ingest_uploads_admin_select → mb_admin/superadmin pueden listar uploads administrativos.
--   ingest_raw_service_only_insert → solo service_role (orchestrator) escribe raw payloads.
