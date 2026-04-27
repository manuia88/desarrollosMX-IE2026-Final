# ADR-053 — Feature Module Pattern Canonical (Unified)

**Status**: Aprobado 2026-04-27 · Founder OK
**Deciders**: Manu (founder) + PM
**Sub-bloque**: FASE 14.B.1 (cleanup deuda técnica F14.B post M07 Operaciones)
**Related ADRs**: ADR-018 (E2E connectedness + audit-dead-ui enforcement), ADR-049 (naming reconciliation BD shipped vs spec)

---

## Context

La estructura `features/<dominio>/` declarada en `CLAUDE.md` sección "Estructura feature-sliced" indica que cada dominio vive en `/features/<feature>/{components,hooks,routes,schemas,types,lib,tests}` con zero imports cross-feature. La intención canónica original era **un módulo = un directorio**, donde UI + dominio + datos conviven juntos.

Sin embargo, durante FASE 13 (M01-M06 portales asesor) se shippearon 6 módulos con un **split pattern** divergente:

- `features/asesor-<dominio>/` — solo componentes UI (cards, tabs, layouts portal asesor).
- `features/<dominio>/` — solo dominio (routes tRPC + schemas + lib + tests).

El split nació orgánicamente para aislar UI portal-asesor de dominio puro reutilizable cross-portal (asesor + dev + admin), pero generó:

1. Doble directorio por módulo → mental load duplicado en navegación + búsquedas.
2. Imports `@/features/<dominio>/...` desde `features/asesor-<dominio>/components/` rompen sutilmente la regla zero-cross-feature (mismo dominio fragmentado).
3. Sub-agents CC future audits leen 6 módulos con un pattern y M07+ con otro → ambigüedad canónica.

FASE 14.B (M07 Operaciones, shipped commit `7678d75`) shippeó **unified pattern** consolidando UI + dominio en `features/operaciones/`. Esto se hizo deliberado-canon-prototype (precedent ADR-048 frontend canonical) pero quedó implícito sin ADR formal.

ADR-053 formaliza la decisión y declara el path forward sin forzar rework masivo de los 6 módulos legacy.

---

## Decision

### Regla canónica única forward

> **`features/<dominio>/` unified es canon forward.** Un módulo = un directorio que contiene UI portal (asesor/dev/admin/usuario) + dominio (routes tRPC + schemas Zod + lib + tests + types + hooks).

Todo módulo nuevo M08+ y refactor mayor de módulos existentes adopta esta estructura. El catálogo `04_MODULOS/Mxx_*.md` declara un único `features/<dominio>/` sin split por portal.

### Estructura canon `features/<dominio>/`

```
features/<dominio>/
├── components/         # UI componentes — agrupar por portal con sub-dirs si necesario
│   ├── asesor/         # opcional — solo si UI portal-específica significativa
│   ├── dev/            # opcional
│   ├── admin/          # opcional
│   └── shared/         # cards/widgets reutilizables cross-portal
├── routes/             # tRPC procedures (router por dominio)
├── schemas/            # Zod schemas (single source of truth Zod SSOT regla 1)
├── lib/                # business logic puro (calculators, formatters, transformers)
├── tests/              # Vitest unit + integration por subcarpeta espejada
├── types/              # type-only exports (re-export de schemas + DB-derived)
└── hooks/              # custom hooks React feature-scoped
```

Sub-dirs `components/<portal>/` solo cuando el split aporta clarity (M07 ejemplo: `components/asesor/operaciones-table.tsx` vs `components/shared/operacion-card.tsx`). Si el módulo es portal-único, usar `components/` plano sin nesting.

### Excepción legacy M01-M06 split preservado

Los 6 módulos shippeados FASE 13 mantienen su estructura split actual:

- `features/asesor-dashboard/` ↔ `features/dashboard/`
- `features/asesor-leads/` ↔ `features/leads/`
- `features/asesor-clientes/` ↔ `features/clientes/`
- `features/asesor-propiedades/` ↔ `features/propiedades/`
- `features/asesor-busqueda/` ↔ `features/busqueda/`
- `features/asesor-tareas/` ↔ `features/tareas/`

Justificación: rework masivo (~12-16h CC × 6 módulos + tests + audit + reviews) bloquearía launch H1 sin beneficio funcional inmediato. Memoria canon "arquitectura escalable desacoplada" admite excepciones temporales cuando el costo de migración supera el beneficio actual; aquí el split funciona, no rompe RLS, no rompe audit-dead-ui (ADR-018), y los tests existentes pasan.

La migración queda agendada como `L-NEW-FEATURE-PATTERN-MIGRATE-M01-M06-SPLIT-TO-UNIFIED` en `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` para H2 post-launch.

### Trade-offs

**Pros unified pattern:**

- Un módulo = un directorio → match conceptual `04_MODULOS/Mxx` ↔ `features/<dominio>/` 1:1.
- Imports lineales `@/features/<dominio>/...` sin fragmentation.
- Sub-agents CC futuros leen un patrón único forward.
- Match prototype canon ADR-048 (cada feature card prototype = un módulo dirigido por su `features/<dominio>/`).
- Reduce mental load navegación PM/founder.

**Cons unified pattern:**

- Sub-dirs `components/<portal>/` requeridos cuando hay múltiples portales (M10/M16 admin+dev) → overhead leve estructural.
- Migración M01-M06 queda pendiente (deuda técnica explícita L-NEW H2).

**Mitigaciones:**

- ADR-053 documenta excepción legacy M01-M06 sin asumir rework H1.
- L-NEW agendado con effort estimado + priority + trigger condition.
- audit-dead-ui ADR-018 sigue siendo enforcement universal sobre ambos patterns.

---

## Migration plan (L-NEW H2)

`L-NEW-FEATURE-PATTERN-MIGRATE-M01-M06-SPLIT-TO-UNIFIED`:

- **Trigger:** capacity disponible post-launch H1 + sin presión de scope nuevo bloqueante.
- **Effort estimado:** ~12-16h CC (6 módulos × ~2h cada uno + test reorg + audit-dead-ui re-baseline).
- **Scope migration por módulo:**
  1. `mv features/asesor-<dom>/components/* features/<dom>/components/asesor/`
  2. Update import paths (rg replace `@/features/asesor-<dom>` → `@/features/<dom>/components/asesor`)
  3. Run `npm run typecheck` + `npm run test` + `npm run audit:dead-ui` por módulo
  4. Eliminar `features/asesor-<dom>/` directorio vacío
  5. Update `04_MODULOS/Mxx_*.md` referencias paths
- **Priority:** H2 no bloqueante H1, lower-tier RICE.

---

## Consequences

### Inmediatas (F14.B.1)

- `features/operaciones/` (M07) declarado canónico unified pattern shipped F14.B.
- `CLAUDE.md` sección "Estructura feature-sliced" actualizada con nota explícita unified canon forward + excepción M01-M06.
- L-NEW agendado en pipeline H2.
- Cero migrations BD. Cero cambios runtime. Cambio puramente arquitectónico-documental.

### Forward H1

- M08 Marketing → unified `features/marketing/`.
- M09 Estadísticas → unified `features/estadisticas/`.
- M10 Dashboard Dev → unified `features/dashboard-dev/` (si naming canon lo prefiere) o `features/dev-dashboard/`.
- M11+ → unified canon.

### Forward H2

- L-NEW migración M01-M06 ejecutado → cero deuda pattern.
- ADR-053 supersedeado por ADR-NEW si emerge necesidad split-por-portal a escala (ej. dominio compartido por > 5 portales con UI radicalmente distinta).

---

## Refs

- `CLAUDE.md` sección "Estructura feature-sliced" (canon original).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md` (audit-dead-ui enforcement universal sobre ambos patterns).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-049_NAMING_RECONCILIATION_BD_SPEC.md` (precedent ADR style + decision-table format).
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md` (prototype unified canon precedent).
- `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` (`L-NEW-FEATURE-PATTERN-MIGRATE-M01-M06-SPLIT-TO-UNIFIED` agendado H2).
- `features/operaciones/` (M07 shipped FASE 14.B precedent unified).

---

**Fin ADR-053** — Aprobado founder 2026-04-27. Implementación FASE 14.B.1 cleanup.
