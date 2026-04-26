# features/lifepath — DEPRECATED (P35 audit canon, FASE 13 cut decision pending founder gate)

> **Status:** 🔴 DEPRECATED 2026-04-25 (F1.A audit canon).
> **Razón:** Audit M01-M20 (`docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md` + `docs/08_PRODUCT_AUDIT/11_IE_FILTER_AUDIT_M01_M20.md` §"Top 3 features CORTAR" P35) detectó **conflicto producto irresuelto** entre `lifepath` long-form (esta feature) y `LifestyleMatchWizard` 6-tile Netflix-pattern (M18 action 3 alternativa).
> **Decisión cut:** PENDIENTE FASE 13 founder gate. NO eliminar todavía — preserve sunk cost (routes shipped + components + schemas + types) hasta cut decision oficial.
> **Forward action:** **NO modificar/extender esta feature** sin founder gate decision F13. Cualquier nuevo work P35-related → `LifestyleMatchWizard` 6-tile (path canon recomendado audit).

## Razones audit P35 (resumen)

- **Score 3-5/5** según cuál se mantenga (canon "zero deuda técnica antes de avanzar" — memoria `feedback_zero_deuda_tecnica`).
- **0 rows** en tabla `lifepath_*` H1 (no traction, sunk cost build).
- Doble-mantenimiento `lifepath` long-form + `LifestyleMatchWizard` 6-tile = deuda técnica + UX confuso.
- Recomendación audit: **CORTAR `lifepath`**, mantener `LifestyleMatchWizard` (Netflix-pattern probado high-conversion).

## Files preserved (NO modificar forward)

- `components/LifePathQuiz.tsx`
- `components/LifePathResultsList.tsx`
- `routes/lifepath.ts`
- `schemas/lifepath.ts`
- `types/index.ts`
- `app/[locale]/(public)/lifepath/page.tsx` + `quiz/page.tsx` + `resultados/page.tsx`

## Cross-references

- `docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md` §M18 action 3
- `docs/08_PRODUCT_AUDIT/11_IE_FILTER_AUDIT_M01_M20.md` §"Top 3 features CORTAR" P35
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-051_MULTI_COUNTRY_SCOPE_H1_TIER.md` (F1.A scope foundation)
- L-NEW-DEPRECATE-LIFEPATH (FASE 13 cut decision — `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` pending agendar si founder confirma cut)
