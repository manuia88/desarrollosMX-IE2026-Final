---
adr_number: 056
title: Studio Sprint 8 Modo Serie cross-feature M02 Desarrollos + M14 Marketing Dev + M10 Dashboard Dev
status: Accepted
date: 2026-04-27
phase: F14.F.9 Sprint 8 BIBLIA
supersedes: null
related: ADR-053, ADR-054, ADR-055, ADR-030
---

## Contexto

DMX Studio Sprint 8 BIBLIA Modo Serie/Documental requiere consumir y exponer datos
cross-feature para tres módulos:

1. M02 Desarrollos (existing): leer assets + obra progress de un desarrollo asociado a la
   serie + colocar botón "Crear Serie Documental" en la vista detalle del proyecto cuando
   éste tiene >5 fotos en distintas etapas.
2. M14 Marketing Dev (FASE 15 — no shipped H1): exportar series episodios a campañas
   marketing developer cuando éstas existan.
3. M10 Dashboard Dev (existing): registrar widget "Serie activa" en dashboard developer
   cuando user tiene serie en producción asociada a un desarrollo.

CLAUDE.md regla "Zero imports cross-feature — todo lo compartido va en `/shared/`"
prohíbe imports directos `features/dmx-studio/* → features/{desarrollos, developer, marketing-dev}/*`.

Pattern canon ya validado en ADR-055 (`shared/lib/ie-cross-feature/`): primitives
read-only desacoplados de feature UI internals.

## Decisión

Crear 3 shared modules `shared/lib/{desarrollos, marketing-dev, dashboard-dev}-cross-feature/`
que exponen API read-only / write-controlado para consumo por Studio + futuras features.

API canon:

```ts
// shared/lib/desarrollos-cross-feature/index.ts
export interface DesarrolloAsset {
  readonly id: string;
  readonly storagePath: string;
  readonly assetType: string;
  readonly capturedAt: string | null;
  readonly etapa: string | null;
}
export interface DesarrolloProgress {
  readonly pctCompleted: number | null;
  readonly currentPhase: string | null;
  readonly lastUpdatedAt: string | null;
}
export interface DesarrolloDetails {
  readonly id: string;
  readonly nombre: string;
  readonly desarrolladoraId: string | null;
  readonly statusComercial: string | null;
}
export async function getDesarrolloAssets(desarrolloId: string): Promise<ReadonlyArray<DesarrolloAsset>>;
export async function getDesarrolloProgress(desarrolloId: string): Promise<DesarrolloProgress>;
export async function getDesarrolloDetails(desarrolloId: string): Promise<DesarrolloDetails | null>;
export async function hasMinimumPhotosForSeries(desarrolloId: string, threshold: number): Promise<boolean>;
```

```ts
// shared/lib/marketing-dev-cross-feature/index.ts (STUB ADR-018 — FASE 15 activate)
export interface SeriesExportToCampaignInput {
  readonly seriesId: string;
  readonly campaignId: string;
  readonly episodeIds: ReadonlyArray<string>;
}
export async function exportSeriesToMarketingCampaign(input: SeriesExportToCampaignInput): Promise<{ ok: false; reason: 'NOT_IMPLEMENTED' }>;
export async function getEligibleCampaignsForSeries(seriesId: string): Promise<ReadonlyArray<never>>;
```

```ts
// shared/lib/dashboard-dev-cross-feature/index.ts
export interface DashboardWidgetRegistration {
  readonly userId: string;
  readonly widgetType: 'studio_serie_activa' | 'studio_metrics' | 'studio_streaks';
  readonly data: Record<string, unknown>;
}
export interface ActiveSeriesWidgetData {
  readonly seriesId: string;
  readonly title: string;
  readonly nextEpisodeNumber: number | null;
  readonly totalEpisodes: number;
  readonly publishedEpisodes: number;
  readonly desarrolloId: string | null;
}
export async function getActiveSeriesForDeveloper(userId: string): Promise<ActiveSeriesWidgetData | null>;
export async function shouldShowStudioWidget(userId: string): Promise<boolean>;
```

Studio + otros features importan únicamente desde `@/shared/lib/{name}-cross-feature` —
NO desde `features/{desarrollos, developer, marketing-dev}/*`.

## Razones

1. Zero coupling Studio ↔ features UI: Studio no depende de cambios internos de
   M02 / M10 / M14.
2. Reutilizable: M14 Marketing Dev (FASE 15) y otros features futuros pueden consumir
   misma API.
3. Read-only intencional para M02 + M10 (writes quedan en features owners). Marketing-dev
   declara API STUB con shape canónico para FASE 15 implementation flip.
4. Pattern canon ya validado: ADR-055 ie-cross-feature precedent shipped F14.F.8.
5. CLAUDE.md regla "Zero imports cross-feature" respetada.

## Consecuencias

Pro:
- Studio Sprint 8 Modo Serie viable sin coupling con M02/M10/M14.
- Marketing dev integration future-proof — flip STUB → real al shippear M14.
- Cross-functions registry pattern ya existing en `features/dmx-studio/lib/cross-functions/`
  delega solo en estos shared modules para data fetching.

Contra:
- 3 modules nuevos en shared/lib/ — compensado por desacoplamiento ganado.
- Marketing-dev es STUB H1: Studio UI debe esconder feature export hasta flag activa.

## STUB ADR-018 (4 señales) — marketing-dev-cross-feature

1. Comentario código `// STUB ADR-018 — activar FASE 15 cuando M14 Marketing Dev shipped`.
2. Throw `NOT_IMPLEMENTED` desde funciones write principales.
3. TODO list en `_README.md` documentando flip path.
4. UI del Studio condicional al shipping flag (gating M14 disponibilidad).

## Implementación referencia

- shared/lib/desarrollos-cross-feature/index.ts shipped F14.F.9 Sprint 8.
- shared/lib/dashboard-dev-cross-feature/index.ts shipped F14.F.9 Sprint 8.
- shared/lib/marketing-dev-cross-feature/index.ts STUB shipped F14.F.9 Sprint 8 — flip FASE 15.
- Tests Modo A en cada módulo `__tests__/index.test.ts`.

## Migración

H1: Studio Sprint 8 consume estos modules.
H2: Lint rule prohibiendo `from '@/features/{desarrollos, developer, marketing-dev}'` excepto
desde shared/lib/* itself (alineado con tracking ADR-055 future lint).
