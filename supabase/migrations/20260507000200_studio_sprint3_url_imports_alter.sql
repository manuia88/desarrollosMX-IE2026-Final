-- F14.F.4 Sprint 3 BIBLIA — Studio URL imports Sprint 3 implementation.
--
-- Decisión arquitectónica: extender studio_portal_imports existente (creada
-- F14.F.1 stub canon) en lugar de duplicar tabla studio_url_imports. Mantiene
-- canon arquitectura escalable desacoplada (memoria founder).
--
-- Sprint 3 añade estructurado extracción 1-by-1 user-initiated URL paste:
--   - bulk_batch_id (groups 1-10 URLs same submission)
--   - retry_count, photos_extracted (ints)
--   - price_extracted, area_extracted, bedrooms_extracted, zone_extracted
--     (structured fields para queries rapidas + UI sin parsear jsonb cada vez)
--
-- ADR-054 canon: tablas studio_* dentro DMX único entorno.
-- ADR-018 canon: ALTER preservando RLS existing (already enabled F14.F.1).

alter table public.studio_portal_imports
  add column if not exists bulk_batch_id uuid,
  add column if not exists retry_count integer not null default 0,
  add column if not exists photos_extracted integer not null default 0,
  add column if not exists price_extracted numeric(14,2),
  add column if not exists area_extracted numeric(10,2),
  add column if not exists bedrooms_extracted integer,
  add column if not exists zone_extracted text;

create index if not exists idx_studio_portal_imports_bulk_batch
  on public.studio_portal_imports(bulk_batch_id)
  where bulk_batch_id is not null;

create index if not exists idx_studio_portal_imports_status
  on public.studio_portal_imports(scrape_status);

comment on column public.studio_portal_imports.bulk_batch_id is
  'Sprint 3 F14.F.4: groups 1-10 URLs same bulk submission. NULL = single URL paste.';
comment on column public.studio_portal_imports.retry_count is
  'Sprint 3 F14.F.4: retry counter on failed fetches. Max 3 (lib enforces).';
comment on column public.studio_portal_imports.photos_extracted is
  'Sprint 3 F14.F.4: count of photos extracted from og:image array.';
comment on column public.studio_portal_imports.price_extracted is
  'Sprint 3 F14.F.4: precio extraído en moneda local. Fast queries sin parsear jsonb.';
comment on column public.studio_portal_imports.area_extracted is
  'Sprint 3 F14.F.4: m2 área extraída.';
comment on column public.studio_portal_imports.bedrooms_extracted is
  'Sprint 3 F14.F.4: recamaras extraídas.';
comment on column public.studio_portal_imports.zone_extracted is
  'Sprint 3 F14.F.4: zona/colonia extraída.';
