---
adr_number: 055
title: Studio cross-feature IE DMX integration via shared/lib/ie-cross-feature
status: Accepted
date: 2026-04-27
phase: F14.F.8 Sprint 7 BIBLIA
supersedes: null
related: ADR-053, ADR-054, ADR-030
---

## Contexto

DMX Studio Sprint 7 BIBLIA (Tarea 7.5 Video de Zona) requiere consumir IE DMX
scores existing M17 Market Observatory (zone_scores, zone_pulse_scores,
zona_snapshots, market_pulse, str_market_monthly_aggregates) para narración
automática + heatmap de zona + smart zone selector top 3 (Upgrade 5).

CLAUDE.md regla "Zero imports cross-feature — todo lo compartido va en
`/shared/`" prohíbe imports directos `features/dmx-studio/* → features/intelligence-engine/*`.

Existen ya patterns canon similares para crosss-features:
- features/dmx-studio/lib/cross-functions/ (M03 timeline, M07 celebration, M09 metrics)
- shared/lib/intelligence-engine/* (calculators puros sin coupling de feature UI)

Necesidad: Studio Sprint 7 + futuras features (M02 Desarrollos Tarea 7.5,
landing pages dinámicas con scores M08, etc) requieren acceso read-only a
indicadores IE de zona.

## Decisión

Crear shared module `shared/lib/ie-cross-feature/` que expone API read-only
sobre IE DMX para consumo por Studio + otros features.

API canon:

```ts
// shared/lib/ie-cross-feature/index.ts
export interface ZoneScoresSnapshot {
  pulse: number | null;
  futures: number | null;
  ghost: number | null;
  alpha: number | null;
}

export interface ZoneMarketData {
  precio_promedio_m2: number | null;
  trend_30d_pct: number | null;
  amenidades_destacadas: ReadonlyArray<string>;
  occupancy_rate_str: number | null;
  adr_str: number | null;
}

export interface SuggestedZone {
  zone_id: string;
  zone_name: string;
  reason: string;
  score: number;
}

export async function getZoneScores(zoneId: string): Promise<ZoneScoresSnapshot>;
export async function getZoneMarketData(zoneId: string): Promise<ZoneMarketData>;
export async function suggestZonesForAsesor(userId: string): Promise<ReadonlyArray<SuggestedZone>>;
```

Implementación: queries Supabase admin client read-only sobre tablas existing
(zone_pulse_scores, zone_scores, zona_snapshots, market_pulse, str_market_monthly_aggregates,
zones, operaciones, leads). Re-exporta types desde shared/types/database.ts.

Studio + otros features importan únicamente desde
`@/shared/lib/ie-cross-feature` — NO desde `features/intelligence-engine/*`.

## Razones

1. Zero coupling Studio ↔ IE feature UI: Studio no depende de cambios internos
   de IE features (M17 Market Observatory, F11 BLOQUE refactors).
2. Reutilizable: M02 Desarrollos, M08 Marketing, futuras features pueden consumir
   misma API sin re-implementación.
3. Read-only intencional: previene mutations IE desde features no-autorizadas
   (writes IE quedan en features/intelligence-engine/* + scripts).
4. Pattern canon ya validado: shared/lib/intelligence-engine/calculators/* exporta
   primitives (pulse-score, futures, climate-twin, etc); este módulo expone
   accessor + projection layer.
5. CLAUDE.md regla "Zero imports cross-feature" respetada.

## Consecuencias

Pro:
- Studio Tarea 7.5 + Upgrade 5 + Upgrade 8 viables sin coupling.
- M03 referral lead create (Upgrade 10) consume `leads` table directo (cross-function
  pattern existing F14.F.5) — NO usa este module (módulos diferentes con scope
  diferente: leads write vs IE read).
- M09 metrics expand reusa este module para correlacionar Sprint 7 KPIs con
  zonas IE scores.

Contra:
- Layer adicional indirección — compensado por desacoplamiento ganado.
- Code duplication potencial si future features bypassean shared module —
  mitigado vía lint rule futuro (L-NEW-LINT-CROSS-FEATURE-IMPORTS).

## Implementación referencia

shared/lib/ie-cross-feature/index.ts shipped en F14.F.8 Sprint 7.
Tests Modo A en shared/lib/ie-cross-feature/__tests__/index.test.ts.

## Migración

H1: Studio Sprint 7 consume este module. Otros features (M02, M08) migran cuando
toquen IE-aware functionality.

H2: Lint rule prohibiendo `from '@/features/intelligence-engine'` excepto desde
shared/lib/ie-cross-feature itself.
