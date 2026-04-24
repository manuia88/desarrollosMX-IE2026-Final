# FASE 07.6 — Product Audit Comprehensive

> **Duración estimada:** ~40h PM wall-clock (5-6 días) + ~3h founder review — 6 sub-sesiones 07.6.A-F
> **Dependencias:** tag `fase-07.5-ingesta-canonical-complete` shipped (FASE 07.5.F)
> **Bloqueantes externos:** ninguno (zero LLM calls, zero cost)
> **Resultado esperado:** 6 documentos producto shipped en `docs/08_PRODUCT_AUDIT/` + ADR-031 Design System Refresh + CONTRATO_EJECUCION.md + 02.0_INDICE_MAESTRO.md actualizados + 8 founder decision gates cerrados + tag `fase-07.6-complete`.
> **Trigger inicio:** post-FASE 07.5.F merge (tag final 07.5).
> **Priority:** bloqueante FASE 11.T-Z (7 bloques restantes) — sin audit = riesgo rework +50h.
> **ADR:** [ADR-032](../01_DECISIONES_ARQUITECTONICAS/ADR-032_FASE_07.6_PRODUCT_AUDIT_INSERTION.md)

## Contexto y objetivo

Post-FASE 07.5 (data layer foundational completo), founder introdujo inputs estructurales producto:

- Arquitectura moderna **6 capas × 27 productos × 160+ features** (prototype JSX) que redefine alcance DMX pre-launch.
- Design system **prototype refreshed** (tokens Dopamine, Card3D cleaner) con 3 decisiones clave no-documentadas que chocan con [ADR-023](../01_DECISIONES_ARQUITECTONICAS/ADR-023_DESIGN_SYSTEM_REFINEMENT.md) actual.
- **Memoria amplificada** `feedback_arquitectura_escalable_desacoplada.md` 2x 2026-04-24: "opción más grande dado contexto moonshot".
- **Trigger urgente:** FASE 11.T-Z restante (7 bloques) sin plan integrado post-inputs = riesgo rework masivo.

FASE 07.6 **NO agrega features nuevas**. Es auditoría + mapping + roadmap refresh. Justificación PM-heavy: `feedback_pm_schema_audit_pre_prompt.md` + `feedback_arquitectura_escalable_desacoplada.md` validadas por founder.

## Scope OUT

- NO cambios de código funcionales (scripts, migrations, features).
- NO LLM calls en sub-sesiones A-F (zero cost auditoría).
- NO shipping features nuevas (solo planning + canonization).
- NO refactor UI components pre-ADR-031 merge.

## Sub-sesiones

### 07.6.A — Auditoría exhaustiva estado actual (~6h)

**Deliverable:** `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md`

**Contenido:**
- Inventario exhaustivo componentes: `features/**/components/*.tsx` listados con props + state + hooks + tests.
- Inventario features por dominio: routes (`app/**/page.tsx`), tRPC routers, schemas Zod, migrations.
- Inventario tablas BD populated: row counts + ingest sources + last update.
- Gap analysis: features planificados en `docs/02_PLAN_MAESTRO/FASE_NN_*.md` vs shipped actual.
- Heatmap deuda técnica: componentes con `TODO`/`FIXME`, routes con `[stub]`, tests skipped.

**Tag:** `fase-07.6.A-complete`

### 07.6.B — Crosswalk Matrix 160+ features × 15 columnas (~14h)

**Deliverable:** `docs/08_PRODUCT_AUDIT/01_CROSSWALK_MATRIX.md`

**Contenido:**
Tabla Markdown comprehensiva mapeando cada feature prototype → DMX actual × 15 columnas:

1. `feature_id` — ID canonical prototype (F-001..F-160).
2. `layer` — Capa 1-6 (UI / State / Business Logic / Data / External / Infra).
3. `product` — Producto 1-27 (IE / Atlas / Pulse / DNA / Constellations / ...).
4. `nombre` — Descripción producto-facing 1 línea.
5. `status_dmx` — Implementado / Parcial / Missing / Deprecated.
6. `fase_actual` — Si existe, referencia fase DMX shipped.
7. `fase_target` — Fase DMX donde debe shipping (07.6.F → 29).
8. `complexity` — XS/S/M/L/XL (T-shirt sizing).
9. `deps_upstream` — Features/datos dependientes de.
10. `deps_downstream` — Features/datos que dependen de este.
11. `rice_r` — Reach (0-10).
12. `rice_i` — Impact (0-3 escala RICE estándar).
13. `rice_c` — Confidence (0-1).
14. `rice_e` — Effort (person-weeks).
15. `rice_score` — (R × I × C) / E.

**Tag:** `fase-07.6.B-complete`

### 07.6.C — Design Migration Plan + ADR-031 formal (~5h)

**Deliverables:**
- `docs/08_PRODUCT_AUDIT/02_DESIGN_MIGRATION.md`
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-031_DESIGN_SYSTEM_REFRESH.md`

**Contenido:**
- Diff ADR-023 vs prototype actual: tokens (`tokens.css`), Card3D config, animaciones, `prefers-reduced-motion` observance, color palette.
- 3 decisiones producto pendientes → resueltas en ADR-031:
  - (1) Card3D default tilt Y/N (memoria `feedback_card3d_no_tilt.md`: default NO tilt — confirmar para ADR-031).
  - (2) Dark mode: aspirational H2 vs shipped H1.
  - (3) Animation philosophy: 60fps everywhere vs adaptive (cheap devices degraded graceful).
- Migration plan: componentes afectados + batch strategy (no big-bang).
- Visual regression test plan (Playwright + % diff threshold).

**Tag:** `fase-07.6.C-complete`

### 07.6.D — RICE Priorities + Critical Path Graph (~4h)

**Deliverable:** `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md`

**Contenido:**
- RICE sort descending (top 30 features) con justificación per feature.
- Critical path graph (Mermaid): features bloqueantes → dependientes.
- Quick wins identificados: alto impact + low effort + low deps.
- Deprioritized features: bajo RICE + altos deps (agendar H2/H3).
- L-NEW backlog consolidación: 46 existentes + L-NEW47-49 cross-reference.

**Tag:** `fase-07.6.D-complete`

### 07.6.E — Roadmap Integration FASE 07.5.F → 29 (~8h)

**Deliverable:** `docs/08_PRODUCT_AUDIT/04_ROADMAP_INTEGRATION.md`

**Contenido:**
- Asignación concreta features → fases DMX existentes.
- Refresh planes `FASE_08_IE_SCORES_N0.md` → `FASE_29_*.md` con cross-refs features prototype asignadas.
- Re-estimación duration per fase post-crosswalk.
- Gantt textual (sesiones Claude Code × fases × paralelización agresiva).
- Risk register: features de alto riesgo (LLM-heavy, externos bloqueantes, CV-heavy).

**Tag:** `fase-07.6.E-complete`

### 07.6.F — Founder Decision Gates + Canonization final (~3h)

**Deliverable:** `docs/08_PRODUCT_AUDIT/05_FOUNDER_DECISION_GATES.md` + tag final.

**Contenido — 8 founder decision gates:**

1. **G-FD1 — Design system ADR-031**: accept/modify/reject propuesta 07.6.C.
2. **G-FD2 — Top 10 RICE priorities**: confirmar orden ejecución.
3. **G-FD3 — Quick wins sprint**: ship antes o después de 11.T?
4. **G-FD4 — Deprioritized H2 features**: confirmar agendamiento.
5. **G-FD5 — Card3D tilt default**: confirmar decisión (memoria + prototype).
6. **G-FD6 — Dark mode scope**: H1 solo accesibilidad, H2 full.
7. **G-FD7 — Paralelización agresiva 11.T-Z**: sub-agents plan.
8. **G-FD8 — FASE 07.6 shipped criteria**: aceptar tag `fase-07.6-complete`.

**Tag:** `fase-07.6-complete` (culminación FASE 07.6).

## Paralelización

Sub-sesiones **secuenciales** (cada una depende de la previa). Dentro de sub-sesión 07.6.B (crosswalk matrix), se permiten 3 sub-agents paralelos (1 por capa agrupada).

## Criterios de cierre

Ver ADR-032 sección "Criterios de cierre".

## Memoria canonizada

- `feedback_arquitectura_escalable_desacoplada.md` amplificada.
- `feedback_pm_schema_audit_pre_prompt.md` ritual PM ~5 min antes de prompt CC.
- `feedback_cc_guardrails_exhaustivos.md` 3 secciones fijas.
- `feedback_pm_audit_exhaustivo_post_cc.md` 10 min validation vs 2h rework.
