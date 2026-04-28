# Cross-functions (DMX Studio M21)

Adapters cross-feature owned por DMX Studio (M21). Permiten que features
externas (M02 desarrollos, M07 operaciones, M09 estadísticas) consuman
funcionalidad Studio sin acoplar imports en sentido contrario.

## Pattern canon

Per ADR-053 (unified feature pattern) + ADR-050 (design language) + canon
memory rule "Arquitectura siempre opción escalable desacoplada":

- Estos adapters viven aquí porque DMX Studio es **owner** del dominio
  (raw video, virtual staging, drone sim, celebration projects, metrics).
- Features externas consumen vía:
  1. `import type { ... } from '@/features/dmx-studio/lib/cross-functions/<file>'`
     para tipos.
  2. Import de funciones puras (zero side-effects, zero supabase) para
     deep links, payload builders, decisión-trigger.
- Side-effects (DB inserts, queries) viven en el caller (M02/M07/M09 service-layer)
  o en los routers tRPC de Studio. Cross-functions NUNCA hacen mutations.

## Sprint 6 adapters (F14.F.7)

| Archivo | Owner externo | Propósito |
| --- | --- | --- |
| `m02-virtual-staging-bridge.ts` | M02 desarrollos | CTA Virtual Staging visibility + deep link builder |
| `m07-celebration-trigger.ts` | M07 operaciones | Opt-in trigger + celebration project payload builder |
| `m09-sprint6-metrics.ts` | M09 estadísticas | Pure aggregator de KPIs Sprint 6 |

## Reglas inviolables

1. Cero `any`. `import type` para tipos puros.
2. Cero supabase queries directas en estos archivos (excepción legacy
   pre-Sprint 6 documentada en archivos individuales).
3. Cero modificaciones a features externas desde aquí — son consumers,
   no callees.
4. Toda lógica determinista debe aceptar `nowMs?: number` o equivalente
   para testing sin mocks de Date.
