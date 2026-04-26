# ADR-049 — Naming Reconciliation BD shipped vs Spec docs (M01-M20)

**Status**: Aprobado 2026-04-25 · Founder OK
**Deciders**: Manu (founder) + PM
**Sub-bloque**: FASE 07.7.A.2 (post-audit M01-M20 reconciliation)
**Related ADRs**: ADR-029 (canonical catalog naming, rename `feature_registry` → `ui_feature_flags`), ADR-048 (frontend prototype canonical, supersedes Dopamine + hybrid)

---

## Context

La auditoría M01-M20 ejecutada en FASE 07.7.A.1 (`docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md`) detectó **8 inconsistencias canónicas** entre la BD live de Supabase (proyecto `qxfuqwlktmhokwwlvggy`, 240 tablas en `public.*`) y los specs/docs canon del repo:

- **7 naming mismatches** de tablas BD shipped vs nombres usados por specs M01-M20 / canon doc backend.
- **1 numeración divergente** del catálogo de módulos (`docs/04_MODULOS/M01-M20`) vs doc canon backend `docs/biblia-v5/15_CONEXIONES_E2E_Dopamine_Backend.md`.

Estas divergencias generan riesgo concreto:

1. Sub-agents CC y futuros auditors interpretan el spec como ground-truth y pueden generar migrations duplicadas (ej: `CREATE TABLE fiscal_documents` cuando `fiscal_docs` ya existe shipped con 0 rows + audit triggers + 4 policies RLS).
2. PM y founder no pueden cruzar canon ↔ BD sin context-switching mental cada referencia.
3. Bloquea ejecución de M07/M10/M12/M15/M16/M18 hasta resolver naming.

La regla maestra es **BIBLIA DECISIÓN 2** (`docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md:57-63`):

> Backend existente se PRESERVA. Las 110 tablas, 64 funciones, 36 triggers (...) — TODO se preserva. No se borra nada. Si algo ya no se necesita, se deja (no se borra).

Y filosofía **CLAUDE.md regla 4**: "Types BD auto-generados — tras cada migration: `npm run db:types`. Tipar a mano la BD está prohibido." — corolario natural: **la BD shipped es la única source of truth para naming de tablas; los docs deben alinearse a ella, no al revés.**

ADR-029 ya estableció el precedente con el rename `feature_registry → ui_feature_flags` (migration `20260424220000`). ADR-049 generaliza la regla a los 7 mismatches detectados + decisión de numeración módulos.

---

## Decision

### Regla canónica única

> **BD shipped siempre gana. Docs/specs se actualizan al nombre BD real.**
> Excepción única: cuando spec describe una **entidad semánticamente distinta** que casualmente compartió nombre con tabla BD existente — entonces se crea **tabla nueva** (NO rename, NO reuso). Ejemplo: `user_scores` (IE) ≠ `user_buyer_profiles` (M18 persona).

Esta regla emite directamente de DECISIÓN 2 (no borrar) + ADR-029 (canonical naming wins) + filosofía Zod SSOT (la BD genera types, los types generan tRPC inputs, los tRPC inputs generan forms — rebobinar la cadena desde un alias deprecated rompe el invariante).

### Tabla de resolución por mismatch

| # | BD canonical (gana) | Alias deprecated (en docs) | Acción | Evidencia BD shipped |
|---|---|---|---|---|
| 1 | `fiscal_docs` | `fiscal_documents` (M07/M12) | Update docs → `fiscal_docs` | `shared/types/database.ts`; migration `supabase/migrations/20260418060300_fiscal_docs.sql`; trigger `trg_audit_fiscal_docs` |
| 2 | `desarrolladoras` | `developers` (M10/M16) | Update docs → `desarrolladoras` (cuando refiere a tabla BD) | `shared/types/database.ts`; migration `20260418031624_tenants_desarrolladoras_agencies_brokers.sql`; VIEW `public_desarrolladoras` |
| 3 | `macro_series` | `macro_indicators` (M16) | Update docs → `macro_series` | `shared/types/database.ts`; migration `20260418080000_ingest_macro_schema.sql`; partitioning anual 2022..2030 (9 partitions); 880 rows reales |
| 4 | `market_anomalies` | `anomalies` (M15/M16, solo cuando refiere a tabla — la ruta UX `/admin/anomalies` se preserva) | Update docs → `market_anomalies` | `shared/types/database.ts`; migration `20260420074500_ie_market_anomalies.sql`; cols `score_id`/`deviation_sigma`/`ack`/`ack_at`/`ack_by` |
| 5 | `ui_feature_flags` | `feature_registry` + `feature_flags` (M16) | Update docs → `ui_feature_flags` (rename ya canonizado por ADR-029) | `shared/types/database.ts`; migration `20260424220000_rename_feature_registry_to_ui_feature_flags.sql`; trigger `trg_audit_ui_feature_flags`; 120 rows shipped |
| 6 | `zone_alert_subscriptions` | `score_subscriptions` (M18) | Update docs → `zone_alert_subscriptions` | `shared/types/database.ts`; FK `zone_alert_subscriptions_zone_id_fkey`; 5 RLS policies + 2 triggers + 3 índices |
| 7 | `user_scores` (entidad: IE scores N4) **+ NUEVA tabla `user_buyer_profiles`** (entidad: M18 persona) | spec M18 usa `user_scores.buyer_persona`/`budget`/`timeline` | **NO renombrar** `user_scores`; **CREAR** nueva tabla `user_buyer_profiles` con cols `buyer_persona text`, `budget_mxn numeric`, `timeline text`, `lifestyle_tags jsonb`. Update docs M18/M20 → consume `user_buyer_profiles` para persona, `user_scores` solo para IE. | `shared/types/database.ts` columnas reales: `score_type/score_value/level/tier/components/citations/inputs_used/provenance/confidence/period_date/valid_until`. Cero columnas `buyer_persona`/`budget`/`timeline` |

### Numeración módulos M08/M09/M10

| Fuente | Numeración | Status forward |
|---|---|---|
| `docs/04_MODULOS/M08_MARKETING.md` (Asesor) | M08 Marketing | **CANON H1** — gana |
| `docs/04_MODULOS/M09_ESTADISTICAS.md` (Asesor) | M09 Estadísticas | **CANON H1** — gana |
| `docs/04_MODULOS/M10_DASHBOARD_DEV.md` (Dev) | M10 Dashboard Dev | **CANON H1** — gana |
| `docs/biblia-v5/15_CONEXIONES_E2E_Dopamine_Backend.md` "M9: MARKETING" | DEPRECATED — SUPERSEDED frontend (banner ADR-048 ya aplicado L6) |
| `docs/biblia-v5/15_CONEXIONES_E2E_Dopamine_Backend.md` "M10: ESTADÍSTICAS" | DEPRECATED — idem |

**Decisión:** numeración `04_MODULOS/M01-M20` es canónica forward (consistente con FASE 07.7.A.1 audit, RICE, roadmap, CONTRATO_EJECUCION). Doc `15_CONEXIONES_E2E_Dopamine_Backend.md` ya marca su frontend como SUPERSEDED — ADR-049 extiende el banner para aclarar también que la **numeración M9/M10** del cap. 15 refleja Pulppo histórico, NO numeración H1 vigente. La sección backend del cap. 15 (BD/tRPC/cascadas/RLS) sigue siendo canon hasta refresh; las referencias "M9 Marketing" / "M10 Estadísticas" deben leerse como "lo que M01-M20 catalog llama M08 Marketing / M09 Estadísticas".

No se modifica la numeración de M01-M20; se canoniza.

---

## Migration plan (paths absolutos)

> Bloque B Master CC aplica estos edits con `Edit` tool quirúrgico (no find-replace ciego — verifica que el alias se usa como nombre de tabla, no como concepto general).

### Mismatch 1 — `fiscal_documents` → `fiscal_docs`

Archivos:
- `docs/04_MODULOS/M07_OPERACIONES.md`
- `docs/04_MODULOS/M10_DASHBOARD_DEV.md`
- `docs/04_MODULOS/M12_CONTABILIDAD_DEV.md`

### Mismatch 2 — `developers` (table) → `desarrolladoras`

Archivos:
- `docs/04_MODULOS/M10_DASHBOARD_DEV.md` (línea 86: `` `developers` — company data. ``)
- `docs/04_MODULOS/M16_DASHBOARD_ADMIN.md` (línea 136: `` `asesores`, `developers`, `mbs` (moderación). ``)

**NO** tocar el concepto "developer" como rol/portal/persona — solo cuando refiere a la tabla BD.

### Mismatch 3 — `macro_indicators` → `macro_series`

Archivos:
- `docs/04_MODULOS/M16_DASHBOARD_ADMIN.md`

### Mismatch 4 — `anomalies` (tabla) → `market_anomalies`

Archivos:
- `docs/04_MODULOS/M16_DASHBOARD_ADMIN.md`

La ruta `/admin/anomalies` es URL pública admin y se mantiene (slug UX, no nombre tabla).

### Mismatch 5 — `feature_registry` + `feature_flags` → `ui_feature_flags`

Archivos:
- `docs/04_MODULOS/M16_DASHBOARD_ADMIN.md`

### Mismatch 6 — `score_subscriptions` → `zone_alert_subscriptions`

Archivos:
- `docs/04_MODULOS/M18_DASHBOARD_COMPRADOR.md`

> NO modificar catálogos cross-cutting (`03.5 tRPC`, `03.7 Crons`, `03.10 UI Flags`, `03.12 Notifs`, `03.13 E2E Map`) en este sub-bloque. Esos contienen referencias amplias a `score_subscriptions` como concepto IE genérico (cron `score_subscriptions_notify`, feature gate `ie.score_subscriptions`).

### Mismatch 7 — `user_scores.buyer_persona` → `user_buyer_profiles` (NUEVA tabla)

Archivos:
- `docs/04_MODULOS/M18_DASHBOARD_COMPRADOR.md`
- `docs/04_MODULOS/M20_FICHA_PROYECTO_PERSONALIZADA.md`

Acción quirúrgica:
1. Reemplazar referencias `user_scores.buyer_persona` / `user_scores` (cuando refiere a persona/budget/timeline) → `user_buyer_profiles.*`.
2. Mantener `user_scores` solo cuando refiere a scores IE buyer-tier (level, tier, score_value).
3. Añadir nota editorial al inicio de la sección "Tablas BD tocadas" en M18/M20.

> NO se crea la migration `user_buyer_profiles` en este sub-bloque A.2 (eso es FASE 22 / M18 implementation). ADR-049 solo canoniza el naming + separación entidades.

### Numeración módulos (banner extension cap. 15)

Archivo: `docs/biblia-v5/15_CONEXIONES_E2E_Dopamine_Backend.md`

Acción: extender el banner SUPERSEDED frontend top con bullet adicional sobre numeración M9/M10 vs canónico M08/M09/M10.

---

## Consequences

### Positivas

- **Zero ambigüedad** para sub-agents CC y futuros auditors: `grep \`fiscal_docs\`` retorna BD + docs alineados.
- **Refactor barato**: 7 mismatches → ~21 line edits en 6 archivos M01-M20 + 1 banner editorial cap. 15 + 0 migrations BD nuevas.
- **Cumple BIBLIA DECISIÓN 2** (no borrar BD shipped) y **ADR-029** (canonical naming wins).
- **Desbloquea ejecución M07/M10/M12/M15/M16/M18** — sub-agents pueden generar tRPC procedures con type safety inmediato apuntando a tabla canónica BD shipped.
- **Crea precedente forward**: cualquier mismatch BD vs spec futuro se resuelve por defecto "BD wins" sin re-debate.

### Negativas (manejables)

- **Refresh requerido** en catálogos numerados:
  - `docs/03_CATALOGOS/03.1_CATALOGO_BD_TABLAS.md` ya menciona `fiscal_docs` y `score_subscriptions` — verificar consistencia post-edit.
  - `docs/03_CATALOGOS/03.10_CATALOGO_UI_FEATURE_FLAGS.md` referencia `ie.score_subscriptions` (feature gate, no nombre tabla — queda igual).
- **Cross-refs en `15_CONEXIONES_E2E_Dopamine_Backend.md`** mantendrán `M9 Marketing` / `M10 Estadísticas` headers internos hasta refresh profundo (deuda doc menor, mitigada por banner top).
- **Migration BD nueva pendiente** para M18 persona: `create_user_buyer_profiles.sql` (a ejecutar pre-FASE 22 M18 — NO en bloque B).

### Forward enforcement

Toda futura auditoría / ADR / sub-agent que detecte mismatch BD vs doc:

1. Si entidad **igual** con nombre distinto → BD wins, doc actualiza.
2. Si entidad **distinta** que casualmente comparte nombre → crear tabla nueva, documentar separación.
3. Si nombre BD es objetivamente peor (typo, ambigüedad) → ADR dedicado con migration de rename + audit_rls_allowlist + plan de rollback. **No es el caso de los 7 mismatches actuales.**

---

## Alternatives considered (rechazadas)

### A. Renombrar tablas BD para alinearse a specs (rechazado)

Implicaba 7 migrations `ALTER TABLE RENAME` + audit_rls_allowlist_vN + actualizar `shared/types/database.ts` + 4 RLS policies + triggers + FKs por cada tabla.

**Rechazado por:**
- Viola **BIBLIA DECISIÓN 2** ("backend existente se preserva, no se borra nada").
- `desarrolladoras` tiene 0 rows pero pgsodium encryption trigger + 6 índices + 3 policies — refactor riesgoso.
- `macro_series` tiene 880 rows reales + partitioning anual + cascade trigger — rename rompe partitions.
- `ui_feature_flags` ya fue renombrado UNA vez por ADR-029 — segundo rename = inestabilidad arquitectural.
- ROI negativo: el alias deprecado en docs es 21 line edits triviales; rename BD es ~30 archivos código + migrations + tests + types regen.

### B. Mantener divergencia + STATUS_MAP traductor (rechazado)

Inspirado en BIBLIA DECISIÓN 1 ("STATUS_MAP traduce, BD no se cambia"). Mantener ambos nombres y documentar mapping en glosario.

**Rechazado por:**
- STATUS_MAP funciona para **valores** (status string en español ↔ inglés), no para **nombres de tablas** (no hay capa de traducción runtime para nombres BD).
- Cada sub-agent CC tendría que cargar el mapping mental antes de cada query — fricción acumulativa exponencial.
- Founder feedback: "Deudas que afectan UX/datos/flujos se resuelven SIEMPRE antes del siguiente bloque." Naming mismatch es deuda flujos.

### C. Diferir resolución a FASE de implementación (rechazado)

Cada FASE M07/M10/M12/M15/M16/M18 resuelve su propio mismatch al construir.

**Rechazado por:**
- Genera 6+ ADRs / sub-decisiones inconsistentes (cada FASE tomaría criterio distinto).
- Bloquea sub-agents CC que necesitan canon ahora para generar prompts coherentes.
- Founder feedback: "resolver decisiones producto con founder antes de prompt CC; zero Opciones A/B/C mid-run". ADR-049 cierra las 8 decisiones de un solo viaje.

### D. Cambiar `user_scores` para añadir cols `buyer_persona`/`budget`/`timeline` (rechazado para mismatch 7)

**Rechazado por:**
- `user_scores` es entidad IE Nivel 4 con schema bien definido (score_type/score_value/level/tier/components/citations/inputs_used/provenance) y triggers cascade `fn_trg_user_scores_cascade*`.
- Mezclar persona M18 con scores IE rompe normalización (founder feedback: "tablas normalizadas sobre jsonb inline").
- Persona compradora cambia poco (timeline meses, budget años); IE scores recalculan diario por cron — ciclos de vida distintos = tablas distintas.
- 1 row `user_scores` por (user_id, score_type, period_date) vs 1 row `user_buyer_profiles` por user_id — cardinalidad distinta.

---

## References

- **Audit origen**: `docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md` §"Hallazgos cross-módulos críticos" + §"Naming mismatches BD vs canon doc" + §"Numeración divergente"
- **BD ground truth**: `shared/types/database.ts` (auto-generado vía `npm run db:types`)
- **Migrations evidence**: `supabase/migrations/20260418031624_tenants_desarrolladoras_agencies_brokers.sql`, `20260418060300_fiscal_docs.sql`, `20260418080000_ingest_macro_schema.sql`, `20260420074500_ie_market_anomalies.sql`, `20260424220000_rename_feature_registry_to_ui_feature_flags.sql`
- **ADRs relacionados**:
  - `ADR-029_CANONICAL_CATALOG_NAMING.md` — precedente rename `feature_registry → ui_feature_flags`.
  - `ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md` — supersede frontend Dopamine.
- **Filosofía maestra**:
  - `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` (DECISIÓN 2 backend preservado).
  - `docs/00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md` (snake_case plural español BD).
  - `CLAUDE.md` regla 4 (types BD auto-generados).

---

## Apéndice — Resumen ejecutivo de impacto

| Mismatch # | Ocurrencias docs | Archivos afectados | Acción | Riesgo migration |
|---|---|---|---|---|
| 1 fiscal_docs | 5 líneas | M07 + M10 + M12 | Replace | None (zero rows BD) |
| 2 desarrolladoras | 2 líneas | M10 + M16 | Replace | None |
| 3 macro_series | 1 línea | M16 | Replace | None (880 rows protegidos) |
| 4 market_anomalies | 1 línea | M16 | Replace selectivo (no ruta URL) | None |
| 5 ui_feature_flags | 2 líneas | M16 | Replace + consolidar dup | None (rename ya canonizado ADR-029) |
| 6 zone_alert_subscriptions | 2 líneas | M18 | Replace | None |
| 7 user_buyer_profiles | 11 líneas | M18 + M20 | Replace + nota editorial NUEVA tabla | NEW migration pendiente FASE 22 |
| 8 numeración M08-M10 | 1 banner editorial | biblia-v5/15 | Append banner extension | None |

**Totales**: ~24 line edits + 1 banner extension ≈ 25 cambios documentales. Cero migrations BD nuevas en bloque B.

**Archivos productivos a tocar bloque B Master CC**: 7 (M07, M10, M12, M16, M18, M20, biblia-v5/15).

---

**Fin ADR-049** — Aprobado founder 2026-04-25. Implementación bloque B FASE 07.7.A.2.
