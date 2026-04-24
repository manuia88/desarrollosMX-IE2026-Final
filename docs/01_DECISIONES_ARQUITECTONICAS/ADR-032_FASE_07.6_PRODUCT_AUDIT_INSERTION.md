# ADR-032 — FASE 07.6 Product Audit Comprehensive Insertion

**Status**: Aprobado 2026-04-24 · Founder OK
**Deciders**: Manu (founder) + PM
**Fecha**: 2026-04-24

## Contexto

FASE 07.5 ingesta canonical foundational shipped 7/7 sub-sesiones (0 + A + B + C + D + E + F, tag `fase-07.5-ingesta-canonical-complete`). Data layer H1 completo: 229 zones · 5,267 zone_scores · 3,192 dmx_indices · 880 macro_series · 83,220 zone_pulse_scores · 6,840 pulse_forecasts · 210 colonia_dna_vectors · 43,776 climate_monthly_aggregates · 228 climate_zone_signatures · 21,945 zone_constellations_edges · 210 ghost_zones_ranking · 210 colonia_wiki_entries.

Post-07.5.E, founder introdujo inputs estructurales de producto:
- Arquitectura moderna 6 capas × 27 productos × 160+ features (prototype JSX) que redefine alcance DMX pre-launch.
- Design system prototype refreshed (tokens Dopamine, Card3D cleaner) con 3 decisiones clave no-documentadas que chocan con ADR-023 actual.
- Memoria amplificada `feedback_arquitectura_escalable_desacoplada.md`: "regla ambigüedad opción más grande dado contexto moonshot".
- Trigger: FASE 11.T-Z restante (7 bloques) sin plan integrado post-inputs = riesgo rework masivo (+50h dev downstream).

Tres patrones de riesgo identificados:
1. **Features prototype sin asignación de fase** → cascada cambios mid-ejecución 11.T-Z.
2. **Design system drift** ADR-023 vs prototype actual → UI inconsistente al shipping.
3. **L-NEW backlog consolidation missing** → 46 entradas dispersas sin RICE ni dependencies graph.

## Decisión

Insertar **FASE 07.6 Product Audit Comprehensive** entre fases 07.5 (canonical foundational) y 11.T-Z (feature blocks restantes) como fase PM-heavy dedicada a:

1. Auditoría exhaustiva estado actual (componentes, features, schema, tests).
2. Crosswalk Matrix 160+ features prototype vs DMX actual × 15 columnas (status · fase target · complexity · dependencies · RICE · etc.).
3. Design Migration Plan formal + ADR-031 Design System Refresh.
4. RICE Priorities + Critical Path Graph.
5. Roadmap Integration FASE 07.5.F → 29 refreshed.
6. 8 Founder Decision Gates consolidados para decisiones producto bloqueantes.

**6 sub-sesiones (tag granular `fase-07.6.A`-`fase-07.6.F`, tag final `fase-07.6-complete`)**:

- **07.6.A** — Auditoría exhaustiva estado actual (~6h) → `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md`
- **07.6.B** — Crosswalk Matrix 160+ features × 15 columnas (~14h) → `01_CROSSWALK_MATRIX.md`
- **07.6.C** — Design Migration Plan + ADR-031 formal (~5h) → `02_DESIGN_MIGRATION.md` + `ADR-031_DESIGN_SYSTEM_REFRESH.md`
- **07.6.D** — RICE Priorities + Critical Path Graph (~4h) → `03_RICE_PRIORITIES.md`
- **07.6.E** — Roadmap Integration FASE 07.5.F → 29 (~8h) → `04_ROADMAP_INTEGRATION.md`
- **07.6.F** — Founder Decision Gates + Canonization final (~3h) → `05_FOUNDER_DECISION_GATES.md` + tag `fase-07.6-complete`

**Wall-clock total**: ~40h PM + ~3h founder review. Sub-sesiones 07.6.A-E son ejecución sin bloqueo; 07.6.F requiere founder review síncrona para cerrar gates.

**Trigger de inicio**: tag `fase-07.5-ingesta-canonical-complete` shipped (FASE 07.5.F).

**Scope OUT**:
- NO cambios de código funcionales (scripts, migrations, features).
- NO LLM calls en sub-sesiones A-F (zero cost auditoría).
- NO shipping features nuevas (solo planning + canonization).

## Consecuencias

**Positivas**:
- FASE 11.T-Z refresh con plan integrado antes de ejecución 7 bloques restantes (estimado savings +50h dev downstream).
- ADR-031 Design System Refresh shipped en 07.6.C resuelve drift ADR-023 vs prototype.
- L-NEW backlog consolidado (46 existentes + carryover 07.5.F L-NEW47-49) con RICE + critical path.
- Planes FASE 08-29 refreshed con features prototype asignadas a fases específicas.
- 8 founder decision gates formalizados cierran decisiones producto bloqueantes antes de 11.T.
- Pattern canonical reutilizable: insertar Product Audit comprehensive post-foundational major.

**Negativas**:
- Wall-clock +40h PM sin shipping nuevo (planning puro). Justificado por risk reduction downstream.
- Riesgo sobre-especificación: mitigar con founder review iterativa sub-sesión 07.6.C + 07.6.F.
- Inserción rompe secuencia lineal de fases del Contrato Ejecución (07.5 → 11 → 08) → actualizar CONTRATO_EJECUCION.md + 02.0_INDICE_MAESTRO.md.

## Alternativas consideradas

- **A) Ejecutar directo 11.T-Z sin audit** → riesgo rework masivo (cascada cambios mid-ejecución). **Rechazada**.
- **B) Audit mid-11.T-Z (después del primer bloque T)** → rompe flujo y fuerza re-plan parcial; PM tracking fracturado. **Rechazada**.
- **C) APROBADO** — Audit dedicado FASE 07.6 antes de 11.T-Z con 6 sub-sesiones granulares. Unlock ejecución 11.T-Z con plan realista.

## Referencias

- Memoria canonizada: `feedback_arquitectura_escalable_desacoplada.md` amplificada 2026-04-24 ("opción más grande dado contexto moonshot").
- Plan maestro detallado: `docs/02_PLAN_MAESTRO/FASE_07.6_PRODUCT_AUDIT.md`.
- ADR-030 Canonical Zones Polymorphic (precedente: auditoría masiva antes de ejecución Opción D).
- Pipeline entry: `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` L-NEW47.
- Contrato Ejecución: `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md` sección FASE 07.6.

## Criterios de cierre (tag `fase-07.6-complete`)

1. 6 archivos shipped en `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md` → `05_FOUNDER_DECISION_GATES.md`.
2. ADR-031 Design System Refresh merged.
3. CONTRATO_EJECUCION.md actualizado con sección FASE 07.6.
4. 02.0_INDICE_MAESTRO.md actualizado con nuevo orden.
5. 8 founder decision gates cerrados (o explícitamente deferred con owner + fecha).
6. Planes FASE 08-29 refreshed con features asignadas (cross-refs).
7. Tag `fase-07.6-complete` pushed.
