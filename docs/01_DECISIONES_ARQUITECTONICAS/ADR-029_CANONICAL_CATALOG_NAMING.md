# ADR-029 — Canonical catalog naming

**Status**: Accepted 2026-04-24
**Deciders**: Manu (founder) + PM

## Contexto

Durante auditoría integral FASE 0 → 11.S (2026-04-24), el auditor CC confundió 3 catálogos distintos por naming ambiguo:

1. `shared/lib/intelligence-engine/registry.ts` — SCORE CALCULATORS IE (fórmulas, dependencies, triggers cascade).
2. `public.feature_registry` tabla DB — FEATURE FLAGS UI tier-gating (pro/free).
3. `docs/08_PRODUCTOS/FEATURE_INVENTORY.md` — Catálogo docs producto (inventario humano).

Los 3 nombres sonaban sinónimos ("registry" / "feature" / "inventory"). CC auditor genero un false positive reportado como "desync 138 TS vs 120 DB" — pero eran catálogos diferentes sin obligación de sync.

## Decisión

Rename arquitectural para eliminar ambigüedad:

| Antes | Después | Propósito canónico |
|---|---|---|
| `registry.ts` | `score-registry.ts` | Score calculators IE |
| tabla `feature_registry` | tabla `ui_feature_flags` | Feature flags UI tier-gating |
| `FEATURE_INVENTORY.md` | (sin cambio) | Catálogo docs producto humano |

3 fronteras semánticas explícitas. Headers de cada artefacto documentan la distinción.

## Consecuencias

**Positivas**:
- Zero confusión futura para devs humanos o AI auditors
- Naming comunica propósito semantic (score vs flags vs inventory)
- Cimientos ambiciosos canonizados

**Negativas**:
- Refactor puntual 5-6h (migration + 5 refs TS + docs)
- Historical docs (biblia-v5, ADRs 001-028) mantienen naming antiguo — requiere context switching cuando se revisan archivos históricos

## Alternativas consideradas y rechazadas

1. **Comments docs clarification (30 min)**: parche. Violaba filosofía canonizada "naming non-ambiguo" + "cimientos ambiciosos día 1". Futuros auditors se confundirían igual.
2. **Split D.1 AHORA + D.2 diferido L-NEW11**: half-measure. Genera deuda diferida, viola "zero deuda técnica antes de avanzar".
3. **Cancel refactor**: dejar ambigüedad. Inaceptable bajo auditoría encontró false positive por este motivo.

Ver: memoria `feedback_arquitectura_escalable_desacoplada.md` sección "Regla de ambigüedad — opción más grande dado contexto moonshot".

## Enforcement forward

Todo catálogo nuevo debe:
- Tener nombre que comunique propósito semantic único (score, flag, config, catalog, inventory).
- Header comment con cross-reference a catálogos relacionados si hay riesgo de confusión.
- ADR dedicado si introduce nueva frontera semantic.

## Referencias

- Auditoría: `docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md` §13 punto 5
- Memoria canonizada: `feedback_arquitectura_escalable_desacoplada.md`
- Migrations: `20260424220000_rename_feature_registry_to_ui_feature_flags.sql` + `20260424220100_audit_rls_allowlist_v26.sql`
