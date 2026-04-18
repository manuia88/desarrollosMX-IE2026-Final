# ADR-001 — Rewrite desde cero del producto DesarrollosMX

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

DesarrollosMX llegó a abril de 2026 con 5 iteraciones acumuladas (v3 → v4 → v5.0 → v5.1 en 5 sub-sprints S1..S5) sobre el repositorio `desarrollosmx-v8final` y el proyecto Supabase `kcxnjdzichxixukfnenm`. La fotografía del estado a la fecha de esta decisión:

- **110 tablas** con RLS habilitado al 100%, **~207 policies**, 36 triggers, 64 funciones SQL, ~150 foreign keys, ~165 índices de performance, ~90 CHECK constraints.
- **15 routers tRPC** (9 funcionales + 6 stubs tras v5.1-S3), 51 API routes, 19 crons activos + 12 stubs.
- **23 hallazgos de seguridad** abiertos (4 críticos, 6 altos, 13 medios) documentados en `biblia-v5/14_AUDITORIA_SEGURIDAD_23Hallazgos.md`. De esos 23, apenas 2-3 han sido cerrados parcialmente tras v5.1-S5.
- **9 discrepancias DISC-01..09** entre schema BD y frontend Dopamine (columnas duplicadas como `operaciones.lado`, CHECK español en BD vs inglés en UI de `tareas`, index_code DMX sin entradas para DMX-MOM/DMX-LIV, etc.).
- **Solo 5 scores IE de 107-118** están efectivamente implementados (B02 con bug de fórmula, B08, B11, B12, H05). La mayoría de tablas IE clave están vacías: `geo_data_points(0)`, `zone_scores(0)`, `project_scores(0)`, `user_scores(0)`, `dmx_indices(0)`, `score_history(0)`, `score_recalculation_queue(0)`, `score_subscriptions(0)`.
- **Deuda acumulada de arquitectura**: estructura `app/` + `components/` + `lib/` mezclada sin feature-slicing, sin i18n nativo (hardcoded es-MX), sin multi-country schema (`country_code` no existe en las tablas), sin testing sistemático (Vitest/Playwright ausentes), sin feature registry uniforme (`feature_registry`/`role_features`/`profile_feature_overrides` apenas introducidos en v5.0-S0).
- **Stack desactualizado contra objetivo 2026**: Next.js 16.2.1 ya instalado pero convive con patrones del 15, Tailwind v3-v4 mezclado, ESLint+Prettier (no Biome), React 19 sin RSC nativo en varias rutas, sin Trigger.dev ni Vercel Queues. No hay integración AI-native más allá de llamadas puntuales a Claude/GPT.

Las fuerzas en juego al tomar esta decisión:

1. **Claude Code + agentes paralelos** colapsan el coste temporal del rewrite. Escribir 600+ features desde cero con agentes especializados se estima en **3-4 semanas** frente a **2 semanas** de refactor incremental: la diferencia es pequeña y queda compensada por la ausencia de deuda.
2. **Spec exhaustiva disponible** — 28 documentos en `biblia-v5/` + `CONTEXTO_MAESTRO_DMX_v5.md` (1,357 líneas) + `BRIEFING_PARA_REWRITE.md` + 10 DOCX Pulppo + JSX Dopamine v2 + JSX Landing. El "Second System Effect" (Brooks, 1975) no aplica porque la spec precede al código.
3. **Cero usuarios reales, cero data productiva, cero contratos, cero licencias, cero IP en BD**. No hay fricción de migración de cuentas, ni rescate de registros, ni obligaciones SLA.
4. **Rigidez de v3/v4/v5 acumulada**: añadir multi-country día 1, AI-native primary, feature-sliced architecture, testing nativo, i18n nativo e i18n de catálogos (SCIAN, estados, colonias) requiere tocar las 110 tablas y los 15 routers. El costo de retrofit supera al de rewrite.
5. **Momento comercial**: el soft launch (FASE 28) se planifica con 10-30 asesores piloto H2 2026. Cualquier migración post-launch multiplica el riesgo por órdenes de magnitud.

## Decision

**Abandonar el repositorio `desarrollosmx-v8final` y el proyecto Supabase `kcxnjdzichxixukfnenm` como plataformas de producción. Iniciar el producto DesarrollosMX v5 Final en un repositorio nuevo (`desarrollosMX-IE2026-Final`) y un proyecto Supabase nuevo y vacío (`qxfuqwlktmhokwwlvggy`).** El repositorio y proyecto viejos quedan archivados como histórico de aprendizaje, referencia visual (JSX Dopamine) y fuente de lecciones (SEC-01..23, DISC-01..09), pero **ningún artefacto de código, schema, policy ni migration se arrastra literalmente** al repo nuevo. Los 10 DOCX Pulppo, los 9 JSX Dopamine de módulos M1-M10, el JSX landing v2, el mapeo SCIAN propietario y los 28 documentos de biblia-v5 son **spec**, no código portado.

## Rationale

Se eligió rewrite por sobre refactor porque el **costo temporal diferencial** es marginal (~1-2 semanas) mientras que el **costo de calidad arquitectónica diferencial es grande**:

- Un rewrite permite definir, desde la primera migration, `country_code NOT NULL` en todas las tablas de dominio, lo cual es prácticamente irreversible en refactor (ver ADR-003).
- Un rewrite permite estructurar `features/<feature>/` con co-location desde el archivo 1, evitando el costo de mover componentes y routers existentes (ver ADR-004).
- Un rewrite permite tratar el AI-native shell (⌘K + Copilot + voice) como shell primario, no como patch sobre el shell actual (ver ADR-002).
- Un rewrite permite incorporar las lecciones de `14_AUDITORIA_SEGURIDAD_23Hallazgos.md` como **patrones preventivos de diseño** (RLS explícito desde Fase 01, trigger `prevent_role_escalation` desde la creación de `profiles`, Storage buckets con size_limit y mime allowlist desde el día cero) en lugar de como parches a policies existentes (ver ADR-009).

Se consideraron y descartaron dos alternativas principales (detalle en § Alternatives considered): refactor incremental v5.2..v5.5 y fork + cleanup branch.

## Consequences

### Positivas
- **Schema limpio multi-country desde la primera migration**. No hay que re-ejecutar `ALTER TABLE ... ADD COLUMN country_code` sobre 110 tablas con backfill.
- **Cero bugs heredados**: las 9 discrepancias DISC-01..09 desaparecen porque no se recrean (p. ej. `operaciones.lado` nunca se crea, `tareas.type` se define en inglés desde el inicio coherente con el STATUS_MAP del frontend).
- **Las 4 vulnerabilidades críticas SEC-01..04 dejan de ser backlog** y se convierten en requisitos de diseño desde la fase de seguridad baseline.
- **Stack 2026 homogéneo**: Next.js 16 App Router + RSC + Cache Components + Turbopack + Tailwind v4 CSS-first + Biome + Trigger.dev v3 desde el archivo 1.
- **Documentación como spec viva**: los 70+ archivos de `docs/` se escriben antes del código, sirviendo a la vez como contrato de desarrollo y de onboarding para colaboradores futuros.
- **AI-native sin retrofit**: la Command Palette ⌘K, el Copilot persistente, el Memory API y la generative UI se diseñan como shell primario, no como superposición.

### Negativas / tradeoffs
- **Pérdida del histórico de commits** del repo viejo. Las decisiones incrementales v3→v4→v5.1 (5 commits) no quedan en el git log del repo nuevo; quedan únicamente en los 28 documentos de `biblia-v5/` como conocimiento explícito.
- **Doble trabajo temporal**: durante las 3-4 semanas de rewrite, el repo viejo queda congelado; si surge una emergencia comercial que requiera mostrar producto funcionando, no hay capacidad de parchar el viejo y al mismo tiempo avanzar el nuevo.
- **Riesgo de "Second System Effect"** mitigado pero no eliminado: la existencia de una spec exhaustiva reduce el riesgo, pero la tentación de sobreingeniería (micro-servicios, GraphQL, Kubernetes) sigue latente. Mitigado explícitamente en el briefing §11 ("cosas que el founder NO quiere").
- **Los 5 scores IE implementados (B02 con bug, B08, B11, B12, H05)** se reescriben. En el caso de B02 esto es ganancia (corrige la fórmula `precio_total/superficie_m2` por `precio/m2_totales`); en los otros 4 es trabajo repetido pero con oportunidad de unificar patrones con el registry definitivo.
- **Dependencia crítica de la spec**: cualquier ambigüedad o contradicción en `biblia-v5/` (p. ej., 107 vs 108 vs 118 scores) tiene que resolverse antes de escribir código, no durante. El rewrite exige disciplina de decisión previa.

### Neutrales
- Las 5 migrations aplicadas en el proyecto Supabase viejo (`profiles_security`, `marketing_portales`, `streaks_function`, entre otras) no se migran literalmente; se rediseñan como parte de la Fase 01.
- Los tokens Dopamine (paleta, gradientes, animaciones, Card3D, FloatingShapes, Outfit/DM Sans) se portan conceptualmente al nuevo Design System (Fase 04) pero se reescriben en Tailwind v4 CSS-first en lugar de la combinación v3+v4 actual.
- El mapeo SCIAN propietario (33 premium / ~80 standard / ~30 basic con 12 macro_categories y staff_estimate midpoints) se porta tal cual como semilla de la Fase 07 — es IP de dominio, no código.

## Alternatives considered

### Alt 1: Refactor incremental v5.2..v5.5 sobre repo viejo
Consistía en liberar 4-5 sprints adicionales (v5.2 security, v5.3 multi-country, v5.4 AI-native, v5.5 testing) aplicando migrations aditivas a `kcxnjdzichxixukfnenm`. **Descartada** porque:
- Añadir `country_code NOT NULL` a 110 tablas pobladas (25/110 con datos) exige backfill de registros dummy, defaults temporales, o policies de compatibilidad hacia atrás. Eso crea un segundo sistema de consistencia que sobrevive más allá de la migración.
- Las 4 críticas SEC-01..04 obligan a parchar 8 funciones SECURITY DEFINER, 3 policies `true` y 1 trigger faltante de forma coordinada. Cada fix es aditivo pero incrementa la superficie de RLS y de testing.
- La estructura `app/` + `components/` + `lib/` actual no se convierte a `features/<feature>/` sin mover cientos de archivos y ajustar imports — exactamente el tipo de trabajo que los agentes paralelos hacen mejor desde cero que sobre un árbol existente.
- El ahorro temporal estimado (~1-2 semanas) no compensa arrastrar DISC-01..09 + SEC-01..23 + `any` residuales + Tailwind v3/v4 mezclado + ESLint+Prettier vs. Biome.

### Alt 2: Fork + cleanup branch + squash a main
Consistía en forkear `desarrollosmx-v8final` a una rama `cleanup/v5-final`, aplicar cirugías (DROP de `operaciones.lado`, fix SEC-01..04 con migrations correctivas, conversión a feature-sliced con codemods, introducción de `country_code` con default `'MX'`), y eventualmente hacer squash a `main`. **Descartada** porque:
- Las codemods para feature-slicing requieren inferencia de dominio que es más confiable escribir que reescribir (p. ej., distinguir si un hook `useProjectPhotos` pertenece a `features/desarrollos/` o a `shared/hooks/` depende del contrato, no del nombre).
- Los squash merges esconden decisiones; el histórico de "cómo llegamos aquí" queda atrapado en la rama fork, difícil de auditar.
- El proyecto Supabase `kcxnjdzichxixukfnenm` queda arrastrando su pasado (objetos con owners, policies con nombres históricos, vistas intermedias). Supabase nuevo da un espacio de nombres limpio auditable.

### Alt 3: Rewrite sólo backend (schema + tRPC) manteniendo frontend Dopamine actual
Consistía en conservar los 7,424 LOC de JSX Dopamine (M1-M10) + DesignSystem (940 LOC) + landing v2 y reescribir sólo schema + tRPC + RLS + crons. **Descartada** porque:
- El frontend Dopamine actual está cableado al schema viejo (ver `15_CONEXIONES_E2E_Dopamine_Backend.md`); recablear a un nuevo tRPC/schema con feature-slicing y i18n implica reescribir prácticamente cada componente.
- El AI-native shell (⌘K primary, Copilot persistente, Memory API, generative components) no encaja como patch sobre el shell Dopamine actual; cambia la jerarquía de navegación.
- Multi-country día 1 obliga a tocar todos los formatters de moneda/fecha/dirección y todos los catálogos visuales (estados, colonias, tipos de operación). El esfuerzo es comparable al rewrite de UI.

### Alt 4: Rewrite sólo frontend (mantener backend viejo + schema)
Mantener las 110 tablas, 64 funciones, 36 triggers, 207 policies en `kcxnjdzichxixukfnenm` y reescribir sólo frontend + feature-sliced. **Descartada** porque:
- No resuelve SEC-01..04 (hallazgos críticos son de backend/RLS/triggers, no UI).
- Multi-country requiere `country_code NOT NULL` en 110 tablas (backend), no frontend.
- Feature-sliced sin realinear tRPC routers genera imports cruzados raros (frontend `features/contactos/` importando `server/trpc/asesorCRM.ts` monolítico).
- Los bugs DISC-01..09 (ej. B02 Margin Pressure con fórmula errónea en `register-all.ts:82`) quedan sin corregir.

## Plan de transición

1. **T=0** Archivar `desarrollosmx-v8final` como repo de referencia (protegido, read-only). Archivar proyecto Supabase `kcxnjdzichxixukfnenm` (pausar sin borrar, retención mínima 90 días por si se necesita extracción puntual de algún dato).
2. **T+0** Inicializar `desarrollosMX-IE2026-Final` con Next.js 16 + Tailwind v4 + Biome (FASE 00).
3. **T+1-3 días** BATCH 1 de documentación (este trabajo + Foundation + Plan Maestro fases 00-14).
4. **T+3-5 días** BATCH 2: Plan Maestro fases 15-29 + Catálogos + Módulos.
5. **T+5-6 días** BATCH 3: runbooks operacionales + README.
6. **T+1-4 semanas** Ejecución fases 00-28 con agentes paralelos Claude Code.
7. **T+4 semanas** Soft launch piloto (FASE 28).

## References
- `../BRIEFING_PARA_REWRITE.md` §1 "Decisión arquitectónica core: rewrite desde cero"
- `../CONTEXTO_MAESTRO_DMX_v5.md` §2 "Inventario BD — 110 tablas", §14 "Seguridad — 23 hallazgos"
- `../biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` (visión global, plan v5.1)
- `../biblia-v5/14_AUDITORIA_SEGURIDAD_23Hallazgos.md` (fuente de los 23 SEC)
- `../02_PLAN_MAESTRO/FASE_00_BOOTSTRAP.md` (primer tag `fase-00-complete`)
- Brooks, F. P. (1975) *The Mythical Man-Month*, cap. "The Second-System Effect" (descarte explícito de over-engineering)
- Nygard, M. (2011) "Documenting Architecture Decisions" (formato de este ADR)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
