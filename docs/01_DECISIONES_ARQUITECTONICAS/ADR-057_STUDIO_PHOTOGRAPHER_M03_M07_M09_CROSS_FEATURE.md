---
adr_number: 057
title: Studio Sprint 9 Plan Fotógrafo cross-feature M03 Contactos + M07 Operaciones + M09 Estadísticas
status: Accepted
date: 2026-04-27
phase: F14.F.10 Sprint 9 BIBLIA
supersedes: null
related: ADR-053, ADR-054, ADR-055, ADR-056, ADR-018
---

## Contexto

DMX Studio Sprint 9 BIBLIA Plan Fotógrafo B2B2C abre 3rd revenue stream donde fotógrafos
profesionales usan Studio + revenden videos a sus clientes asesores. Esto requiere
integración cross-feature con tres módulos:

1. **M03 Contactos / Leads** (existing): fotógrafo importa lista clientes asesores
   actuales como leads B2B (Upgrade 9). Read-only desde tabla `leads` existente para
   evitar coupling Studio ↔ features/asesor-contactos UI internals.
2. **M07 Operaciones** (existing): fotógrafo factura venta video como operacion B2B
   tracking (Upgrade 10). Pattern STUB ADR-018: schema `operaciones.operacion_type`
   CHECK constraint actual NO incluye `studio_video_sale`; flip H2 cuando founder
   valide demand + altera CHECK constraint.
3. **M09 Estadísticas** (existing): KPIs específicos fotógrafo (clientes activos +
   videos generados + revenue est + commission referrer) en dashboard estadísticas.
   Read-only aggregations (Upgrade 11).

CLAUDE.md regla "Zero imports cross-feature — todo lo compartido va en `/shared/`"
prohíbe imports directos `features/dmx-studio/* → features/{asesor-contactos,
operaciones, estadisticas}/*`.

Pattern canon ya validado en ADR-055 (`shared/lib/ie-cross-feature/`) y ADR-056
(`shared/lib/{desarrollos, marketing-dev, dashboard-dev}-cross-feature/`).

## Decisión

Crear 2 shared modules nuevos:

```ts
// shared/lib/photographer-clients-cross-feature/index.ts
// Read M03 leads + write M07 operaciones STUB pattern.
export interface LeadForImport {
  readonly id: string;
  readonly contactName: string;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly status: string;
  readonly zoneId: string;
}
export interface ImportLeadsAsClientsInput {
  readonly photographerId: string;
  readonly userId: string;
  readonly filterCriteria?: {
    readonly zoneId?: string;
    readonly status?: string;
    readonly limit?: number;
  };
}
export async function fetchLeadsForPhotographer(
  input: ImportLeadsAsClientsInput,
): Promise<ReadonlyArray<LeadForImport>>;

// STUB ADR-018 — H2 flip cuando operaciones.operacion_type CHECK altera para
// 'studio_video_sale'. H1 path tracking via studio_photographer_clients.total_revenue_attributed.
export interface RecordVideoSaleAsOperacionInput {
  readonly photographerId: string;
  readonly clientId: string;
  readonly videoId: string;
  readonly amount: number;
  readonly currency: string;
}
export async function recordVideoSaleAsOperacion(
  input: RecordVideoSaleAsOperacionInput,
): Promise<{ readonly ok: false; readonly reason: 'NOT_IMPLEMENTED_H2' }>;
```

```ts
// shared/lib/photographer-metrics-cross-feature/index.ts
// Read-only aggregations para M09 Estadísticas dashboard.
export interface PhotographerKpis {
  readonly clientsActive: number;
  readonly videosGenerated: number;
  readonly revenueEstUsd: number;
  readonly commissionEarnedUsd: number;
  readonly ratingAvg: number | null;
}
export interface PhotographerStatsRange {
  readonly start: string;
  readonly end: string;
}
export async function getPhotographerKpis(photographerId: string): Promise<PhotographerKpis>;
export async function aggregatePhotographerStats(
  photographerId: string,
  range: PhotographerStatsRange,
): Promise<PhotographerKpis>;
```

Studio Sprint 9 + futuras features importan únicamente desde
`@/shared/lib/photographer-{clients,metrics}-cross-feature` — NO desde
`features/{asesor-contactos, operaciones, estadisticas}/*`.

## Razones

1. Zero coupling Studio ↔ features UI/internals existing.
2. Reutilizable: M14 Marketing Dev (FASE 15) y otros features futuros podrían
   importar mismas APIs.
3. Read-only intencional para M03 Leads + M09 Estadísticas (writes quedan en
   features owners). M07 Operaciones declara API STUB ADR-018 (4 señales)
   con shape canónico para H2 implementation flip.
4. Pattern canon validado: ADR-055 + ADR-056 precedents shipped F14.F.8 + F14.F.9.
5. CLAUDE.md regla "Zero imports cross-feature" respetada.

## Consecuencias

Pro:
- Studio Sprint 9 Plan Fotógrafo viable sin coupling con M03/M07/M09 internals.
- M07 Operaciones integration future-proof — flip STUB → real cuando founder
  valida demand + altera operaciones.operacion_type CHECK constraint.
- Cross-functions registry pattern existing en `features/dmx-studio/lib/cross-functions/`
  delega solo en estos shared modules para data fetching.

Contra:
- 2 modules nuevos en shared/lib/ — compensado por desacoplamiento ganado.
- M07 es STUB H1: Studio UI debe esconder feature export hasta CHECK altered + flip flag.

## STUB ADR-018 (4 señales) — recordVideoSaleAsOperacion

1. Comentario código `// STUB ADR-018 — activar H2 cuando operaciones.operacion_type CHECK altered para 'studio_video_sale'`.
2. Throw `NOT_IMPLEMENTED_H2` desde función write principal.
3. TODO list en `_README.md` documentando flip path (alter operaciones CHECK + flip flag).
4. UI del Studio condicional al flag (gating M07 disponibilidad H1).

## STUB ADR-018 (4 señales) — commission auto-payment processor

H1 path: founder manual ACH/Wire process documentado en
`features/dmx-studio/lib/photographer/commission/payment-processor.ts`.

1. Comentario código `// STUB ADR-018 — activar H2 cuando ACH/Wire processor integrado`.
2. Throw `NOT_IMPLEMENTED_H2_MANUAL_PROCESS` desde función auto-pay.
3. TODO list documentando manual process H1 (founder action items).
4. UI condicional flag commission_auto_payment_enabled (false H1 canon).

## Implementación referencia

- shared/lib/photographer-clients-cross-feature/index.ts shipped F14.F.10 Sprint 9.
- shared/lib/photographer-metrics-cross-feature/index.ts shipped F14.F.10 Sprint 9.
- Tests Modo A en cada módulo `__tests__/index.test.ts`.

## Migración

H1: Studio Sprint 9 consume estos modules.
H2: 
- Lint rule prohibiendo `from '@/features/{asesor-contactos, operaciones, estadisticas}'` excepto desde shared/lib/* itself.
- Flip recordVideoSaleAsOperacion STUB → real (alter operaciones.operacion_type CHECK).
- Flip commission auto-payment STUB → real (ACH/Wire processor integration).
