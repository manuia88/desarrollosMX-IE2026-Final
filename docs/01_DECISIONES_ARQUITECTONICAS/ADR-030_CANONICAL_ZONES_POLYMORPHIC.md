# ADR-030 — Canonical Zones Polymorphic Schema

**Status**: Accepted 2026-04-24
**Deciders**: Manu (founder) + PM

## Contexto

Auditoría integral 2026-04-24 §13 (`docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md`) detectó 3 patrones inconsistentes para identificar entidades geográficas en 33+ tablas del schema DMX:

- 18 tablas con `zone_id uuid` (sin FK a master table — convention-only).
- 6 tablas con `colonia_id uuid` (naming legacy CDMX-céntrico).
- 9 tablas con `scope_type text + scope_id text` (patrón polimórfico ad-hoc).

3 fallos recurrentes pre-planning: BATCH 11.M+N, BATCH 11.O+P y Opción D inicial — cada vez el PM olvidaba validar consistency naming cross-tablas antes de emitir prompt CC. Síntoma repetido: cada bloque agregaba tablas con el patrón "del momento" sin canonizar.

Necesidad arquitectural: tabla master canonical GLOBAL-READY multi-país día 1 (MX / CO / AR / BR / US). La filosofía "agregamos países después" ya generó cascade breakage documentado (memoria `feedback_arquitectura_escalable_desacoplada.md`): tablas con taxonomies locales (alcaldía CDMX vs municipio resto de MX vs comuna AR vs bairro BR vs county US) no son intercambiables sin polimorfismo intencional.

## Decisión

Crear `public.zones` tabla polimórfica con natural key `(country_code, scope_type, scope_id)` y UUID primary key v5 determinística.

Estructura escalable `content/zones/{country_code}/...` como source-of-truth declarativo (JSON files validados Zod) — NO hardcode en scripts. Los scripts de seed sólo iteran el folder y upsert a DB.

UUIDs v5 determinísticos con namespace DMX estable `f7e9c4a8-6b2d-4e5f-9a1c-8d3b2e7f6c5a` → mismo `(country, scope_type, scope_id)` siempre regenera mismo UUID. Consecuencia: idempotencia seed + consistency cross-repo + migraciones triviales entre entornos.

**6 upgrades DIRECTOS incluidos día 1** (justificación: cimientos ambiciosos, opción más grande dado contexto moonshot):

- **U1 CHECK constraints robustos**: `scope_type` enum cerrado (22 valores cubriendo taxonomies LATAM + US: `country, state, province, department, region, city, municipality, alcaldia, partido, comuna, county, district, neighborhood, colonia, barrio, bairro, zip_code, postal_code, census_tract, ward, locality, hamlet`), `country_code` whitelist (MX/CO/AR/BR/US inicial), rangos lat/lng válidos, hierarchy valid (country sin parent; resto con parent_id NOT NULL), `name_non_empty`, `area_km2 > 0`, `population >= 0`. Costo migration ≈0; previene data corruption forever.
- **U2 Nombres 3 locales**: `name_es`, `name_en`, `name_pt` — UX consistency para los 5 locales DMX (es-MX, es-CO, es-AR, pt-BR, en-US) + SEO multi-país. Sin esto, traducir post-launch = rework costoso.
- **U3 PostGIS MultiPolygon boundary**: columna `boundary geography(MultiPolygon, 4326)` nullable. Habilita rendering Mapbox GL interactive + spatial queries `ST_Contains` + overlap fuzzy matching cross-dataset.
- **U4 H3 hexagonal index r8**: columna `h3_r8 text` nullable alineada con `geo_data_points.h3_r8` existente. Queries espaciales O(1) tipo "todas zonas en radio 5km". Uber's global standard.
- **U5 OSM admin_level abstracto** en metadata jsonb: `{ admin_level: 2..11 }` — queries cross-country comparables aunque `scope_type` varíe por país ("todos los neighborhoods del mundo" = filtro por `admin_level=10` independiente de si son `colonia` / `barrio` / `bairro` / `neighborhood`).
- **U6 UUIDs v5 namespaced**: `uuidv5(${country}:${scope_type}:${scopeId}, DMX_ZONES_NAMESPACE)`. Regenerar mismo ID siempre = idempotencia seed + futuras migrations triviales (mismo UUID entre dev/staging/prod sin export/import).

## Consecuencias

**Positivas**:
- Multi-país día 1 ("opción más grande" ambicioso schema moonshot) — zero refactor futuro por naming/scope polimórfico.
- UUIDs v5 = seed scripts idempotentes + deploy cross-repo consistente.
- Integraciones futuras (Stripe Connect country-state, Zillow ZIP fuzzy, Airbnb districts, INEGI/DANE/IBGE) shape-compatible.
- `content/zones/` declarativo → PM puede revisar diffs de data sin leer código.
- Seed H1 CDMX (229 entries) valida el shape antes de escalar nacional.

**Negativas**:
- Scope sesión 07.5.0: 5-7h inversión (vs 2h "solo tabla simple"). Justificable como one-shot pre-producto.
- FK enforcement en 18+ tablas `zone_id` / `colonia_id` DIFERIDO a L-NEW13 FASE 08 — consistency durante H1 enforced a nivel app via UUIDs v5 determinísticos, no DB FK.
- PostGIS `boundary` + `h3_r8` NULL en H1 (populate cuando haya data INEGI real o cuando se integre lib `h3-js` — agendado como L-NEW future).

## Alternativas consideradas y rechazadas

1. **Tablas separadas** (`colonias`, `alcaldias`, `cities`, `estados` dedicated por taxonomy): rígido, viola polimorfismo requerido para multi-país con taxonomies distintas (alcaldía ≠ municipio ≠ county ≠ partido aunque todos sean "admin level 8").
2. **`zone_id` huérfano convention-only** (sin tabla master): viola "zero cascade breakage" (memoria `feedback_arquitectura_escalable_desacoplada.md`) — no hay enforcement referencial ni consistency; reproduce el problema detectado en auditoría.
3. **OSM Overpass bulk import H1**: 12M+ entries globales overkill pre-producto-real. Agendado como L-NEW17 H2 Data Lake cuando escala >10K zones justifique.
4. **Una sola tabla con `admin_level` sin `scope_type` nombrado**: pierde semántica local (alcaldía ≠ municipio aunque ambos `admin_level=8`). Tanto `admin_level` abstracto como `scope_type` específico coexisten (U5 intencional, no redundancia).

Ver: memoria `feedback_arquitectura_escalable_desacoplada.md` sección "Default: opción más escalable/desacoplada/versionable aunque tome más trabajo".

## Enforcement forward

Todo nuevo campo geográfico en schema DMX debe:
- Referenciar `public.zones(id)` vía FK, no `text` suelto ni convention-only UUID.
- Usar UUIDs v5 namespaced si genera zones nuevas (via helper compartido en `shared/lib/zones/uuid.ts`).
- Declararse en `content/zones/{country}/...` si es dataset, no hardcoded inline en scripts.

Laterales agendados (ver `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`):
- **L-NEW13** (FASE 08 post-Opción D): ALTER TABLE ADD FOREIGN KEY en 18+ tablas existentes con `zone_id` / `colonia_id` → `public.zones(id)`.
- **L-NEW14** (FASE 13): seed MX expansión nacional (31 estados + municipios + colonias).
- **L-NEW15** (FASE 38): seed Colombia (DANE).
- **L-NEW16** (FASE 38+): seed AR / BR / US.
- **L-NEW17** (H2 Data Lake): OSM Overpass bulk automation.
- **L-NEW18** (H2+): conectores APIs oficiales (INEGI / DANE / IBGE / Census).
- **L-NEW19** (FASE 12 N5 + FASE 22): aliases + Stripe Connect pattern research + Google Maps cross-check.

## Referencias

- Auditoría: `docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md` §13
- Memorias canonizadas: `feedback_arquitectura_escalable_desacoplada.md`, `feedback_pm_schema_audit_pre_prompt.md`
- Migration: `supabase/migrations/20260424230000_create_zones_master_polymorphic.sql`
- Seed script: `scripts/ingest/00_seed-zones-canonical.ts`
- Content source-of-truth: `content/zones/`
- ADR relacionado: `ADR-029_CANONICAL_CATALOG_NAMING.md` (misma filosofía canonical naming pre-Opción D)
