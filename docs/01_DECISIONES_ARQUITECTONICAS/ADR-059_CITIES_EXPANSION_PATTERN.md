---
adr_number: 059
title: Cities Expansion Pattern Canonical (zonas + IE scores + landings + cross-functions)
status: Accepted
date: 2026-04-28
phase: F14.1 Expansion Cities (Playa del Carmen + Guadalajara + Querétaro + Dubai STUB)
supersedes: null
related: ADR-051, ADR-053, ADR-055, ADR-056, ADR-018, ADR-049
---

## Contexto

Tag `fase-14-complete` cerró todo el master plan FASE 14 (M06 + M07 + M07.1 + M08 + M09 + M10 + M21 Studio v1.0.0-beta). El producto DMX se construyó canon CDMX-first: zonas + colonias CDMX seedeadas, IE scores calculados sobre CDMX, landings públicas (`/desarrollos`, `/portal-publico`, `/zona/<slug>`) operando sobre data CDMX.

Founder visión multi-país (ADR-003 + ADR-051) declara expansion eventual a otras ciudades MX + LATAM + US Latinx + Dubai. La pregunta "cómo añadimos una ciudad nueva sin reinventar el patrón" no estaba formalizada — primer expansion (Playa del Carmen + Guadalajara + Querétaro + Dubai STUB H1) emerge en FASE 14.1 post-tag.

Sin pattern canon documentado, cada expansion futura (Miami H2 + Colombia/Argentina/Brasil H2 + ar-AE Dubai full H2) corre riesgo de:
- Duplicar logic IE scores per-city con drift incremental
- Crear migrations BD redundantes (cuando schema actual ya soporta multi-país via `country_code` + `scope_type` + `parent_scope_id`)
- Hardcodear city slugs en 12+ features sin registry centralizado
- Inconsistencias multi-currency (Dubai requiere AED via FX cascade canon F14.B.1, expansion futura US requiere USD canon ADR-051)

ADR-059 formaliza el pattern repetible para expansion de ciudades sobre infraestructura existente (zones + proyectos + zone_scores + zone_slugs) sin migrations BD nuevas en el caso default.

## Decisión

Adoptar **Cities Expansion Pattern Canonical** con 6 pasos repetibles + registry centralizado + cross-functions M02+M17 extension auto-aplicada.

### Los 6 pasos canon de city expansion

**1. Data load city** — `features/cities/<city-slug>/data-loader.ts`

Cada ciudad expone una función `load<City>Zones(): Promise<ZoneInsert[]>` que:
- Define lista canon de zonas key (5-10 zonas iniciales por city, expansibles H2)
- Construye polígonos PostGIS básicos (boundaries simples, refinement L-NEW H2)
- Llama UPSERT a `zones` con `country_code` + `scope_type='zona'` + `parent_scope_id='<city-slug>'`
- INSERT a `zone_slugs` per zona (multilingual canon)

NO migrations BD — reuse `zones` + `zone_slugs` existentes.

**2. Seed projects city** — `features/cities/<city-slug>/seed-projects.sql`

3-5 proyectos seed (públicos referenciables, no marketing fake) per ciudad para validar landing + map render. INSERT a `proyectos` con `country_code` + `ciudad` + `colonia` + `zone_id` linked.

**3. IE scores per zone** — `features/cities/<city-slug>/ie-scores-calculator.ts`

Replicar logic CDMX existing (read-only via `shared/lib/ie-cross-feature/` canon ADR-055). Calcular scores per zone de la ciudad nueva: `pulse`, `futures`, `ghost`, `alpha`. INSERT a `zone_scores` con `provenance.is_synthetic=true` (transparency canon ADR-018) hasta que ingestion sources reales lleguen H2.

**4. Landing localized per city** — `app/[locale]/<city-slug>/page.tsx`

Page server-component público con:
- Hero (BlurText canon prototype)
- KPIs zona top 5 per IE scores
- Map polygons interactivo (Mapbox GL existing)
- CTA Stripe checkout pricing canon (MXN para MX cities, USD/AED para Dubai)

i18n keys `cities.<citySlug>.*` en Tier 1 active locales (es-MX + en-US canon ADR-051). Tier 2 H2 placeholders (es-CO + es-AR + pt-BR + ar-AE) mantienen fallback es-MX/en-US.

**5. Multi-currency display canon** — `shared/lib/cities/registry.ts`

Cada ciudad declara su currency canon (MXN para MX cities, USD primary + AED secondary para Dubai). Display dual-currency via FX cascade canon F14.B.1 (Banxico + OpenExchangeRates fallback).

**6. Cities selector UI global** — `shared/ui/cities/CitySelector.tsx`

Dropdown global header con cities activas. Persiste en URL state (nuqs) + cookie preference. Aplica canon ADR-050 visual.

### Cross-functions M02 + M17 auto-extension

Cada ciudad nueva auto-extiende:

- **M02 Desarrollos filter city dropdown** — `features/asesor-desarrollos/components/DesarrollosFilters.tsx` lee registry y muestra todas las cities activas
- **M17 Market Observatory zones Atlas** — features observatory consume zones expandidas via cross-feature read-only canon ADR-055

Pattern via ADR-056 cross-function (no imports cross-feature directos).

### Registry centralizado

`shared/lib/cities/registry.ts` exporta:

```ts
export interface CitySettings {
  readonly slug: string;
  readonly nameKey: string;       // i18n key
  readonly countryCode: string;   // ISO 3166-1 alpha-2
  readonly currency: string;      // ISO 4217
  readonly localesPrimary: ReadonlyArray<string>;
  readonly localesSecondary: ReadonlyArray<string>;
  readonly featureFlag?: string;  // si STUB ADR-018 H1
  readonly status: 'active' | 'beta' | 'coming_soon';
  readonly defaultLat: number;
  readonly defaultLng: number;
  readonly defaultZoom: number;
}

export const ACTIVE_CITIES: ReadonlyArray<CitySettings>;
export function getActiveCities(countryCode?: string): ReadonlyArray<CitySettings>;
export function getCitySettings(slug: string): CitySettings | null;
```

ACTIVE_CITIES H1 (FASE 14.1):
- `cdmx` (canon original, MX, MXN, es-MX + en-US)
- `playa-del-carmen` (MX, MXN, es-MX + en-US)
- `guadalajara` (MX, MXN, es-MX + en-US)
- `queretaro` (MX, MXN, es-MX + en-US)
- `dubai` (AE, USD primary + AED secondary, en-US Tier 1 + ar-AE STUB H2, status='beta', featureFlag='DUBAI_REELLY_API_ENABLED')

### Integración Reelly API (Dubai source canon)

Dubai requiere data feed externo (Reelly API). H1 STUB ADR-018 (4 señales) hasta que founder configure `REELLY_API_KEY`. Activación via `DUBAI_REELLY_API_ENABLED` feature flag (default `false`).

Wrapper canon en `features/cities/dubai/lib/reelly/`:
- `index.ts` singleton con `listProjectsDubai`, `getProjectDetails`, `getProjectMarkers`, `syncProjectsToDmx`, `testConnection`
- `types.ts` schemas Reelly response

Cuando flag `false`:
1. Comentario código top `// STUB ADR-018 — activar cuando REELLY_API_KEY configured`
2. `testConnection()` retorna `{ ok: false, reason: 'REELLY_API_KEY missing' }`
3. UI badge `[próximamente]` en landing Dubai
4. tRPC procedures relacionados retornan `TRPCError NOT_IMPLEMENTED`

L-NEW H2 expansions futuras siguiendo este pattern:
- `miami` (US Tier 1 Latinx audience canon ADR-051) — DEFER H2
- `bogota` + `medellin` (CO Tier 2) — DEFER H2 FASE 38
- `caba` (AR Tier 2) — DEFER H2 FASE 38
- `sao-paulo` + `rio` (BR Tier 2) — DEFER H2 FASE 38
- Dubai full ar-AE locale — DEFER H2 cuando founder ship Tier 2 LATAM completo

## Reglas inviolables

1. **Cero migrations BD por city expansion default.** Reuse `zones` + `zone_slugs` + `proyectos` + `zone_scores` existentes via `country_code` + `scope_type='zona'` + `parent_scope_id='<city-slug>'`. Excepción: si emerge feature city-specific que requiere column nueva → ADR independiente.

2. **Cero hardcoding city slug fuera de registry.** Cualquier feature que lista/itera cities consume `getActiveCities()`. Filter dropdowns + Atlas zones + IE scores cascade leen registry.

3. **i18n Tier 1 obligatorio.** Cada city H1 ship con keys `cities.<citySlug>.*` en es-MX + en-US (canon ADR-051). Tier 2 placeholders permitidos con fallback graceful.

4. **Multi-currency via FX cascade canon F14.B.1.** Display dual currency requerido cuando city currency ≠ MXN. NO hardcodear FX rates — usa cascade Banxico + OpenExchangeRates.

5. **IE scores synthetic transparency obligatoria.** `provenance.is_synthetic=true` + UI disclosure flag visible en landings hasta que ingestion sources reales (cliente API per-city) emerjan H2.

6. **STUB external APIs ADR-018 4 señales.** Reelly Dubai + futuro Miami sources + Colombia/Argentina/Brasil sources marcados con 4 señales (comentario + testConnection ok:false + UI badge + 501/NOT_IMPLEMENTED).

7. **Cross-functions M02+M17 auto-extension obligatoria.** Cada PR de city expansion incluye verificación M02 filter dropdown + M17 Atlas zones expandidas (read-only via ADR-055 + ADR-056).

8. **Pattern feature-sliced canon ADR-053.** `features/cities/<city-slug>/` unified directory. NO split UI vs domain.

## Consecuencias

### Positivas

- Add-city onboarding documentado: ~6h wall-clock per ciudad (5 zonas + IE scores + landing + i18n) sin re-arquitectura
- Cero migrations BD overhead post-FASE 14.1 (excepto schema changes raros)
- Registry single-source-of-truth elimina drift incremental cities en filtros/observatory/landings
- L-NEW H2 expansions Miami + LATAM + ar-AE Dubai siguen pattern probado FASE 14.1
- Cross-functions M02+M17 auto-extend sin tocar features destino (ADR-056 pattern)

### Negativas

- IE scores synthetic H1 reduce credibilidad data observatory para cities nuevas hasta ingestion real H2
- Reelly STUB Dubai bloquea revenue Dubai H1 hasta API key configured (founder action)
- Polígonos zonas básicos (no boundaries oficiales catastrales) requieren refinement H2

### Trade-offs aceptados

- Speed-to-market sobre refinement boundary precision: zonas key con polígonos básicos OK H1
- IE scores synthetic + disclosure flag visible OK H1 vs ingestion real per-city overhead

## Cross-references

- **ADR-003** Multi-country día 1
- **ADR-049** country_code char(2) canon
- **ADR-051** Multi-country scope H1 vs H2 (Tier 1 active vs Tier 2 prepared)
- **ADR-053** Feature-sliced unified pattern
- **ADR-055** shared/lib/ie-cross-feature/ canon read-only IE scores
- **ADR-056** Studio Series M02+M14+M10 cross-function pattern
- **ADR-018** E2E Connectedness 4 señales STUB
- **F14.B.1** FX cascade Banxico + OpenExchangeRates
- **L-NEW H2** Miami expansion (Tier 1 Latinx US)
- **L-NEW H2** Colombia + Argentina + Brasil expansion (Tier 2 master plan)
- **L-NEW H2** Dubai full ar-AE locale + Reelly daily sync cron
- **L-NEW H2** Cities Atlas full IE wiki entries Playa/GDL/QRO/Dubai

## Decision log

- 2026-04-28: Founder canon decisions (México expansion: Playa + GDL + QRO; Dubai con Reelly STUB H1; Miami + Colombia/AR/BR DEFER H2)
- 2026-04-28: ADR-059 Accepted post-tag fase-14-complete
