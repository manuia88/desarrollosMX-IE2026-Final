# CLAUDE.md — Instrucciones para Claude Code

> Cómo trabajar en este repo. Todo cambio a estas reglas pasa por un ADR.

## Frontend canon (actualizado 2026-04-25)

Frontend canon DMX = **prototype JSX** en `tmp/product_audit_input/DMX-prototype/` ↔ documentado en `docs/08_PRODUCT_AUDIT/07_FRONTEND_PROTOTYPE_CANONICAL.md` ↔ formalizado en `docs/01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md`.

Reemplaza:
- Frontend Dopamine (`ADR-023_DESIGN_SYSTEM_REFINEMENT.md` — SUPERSEDED frontend, mantiene parcial backend / utility classes en portales internos).
- Hybrid blend (`ADR-031_DESIGN_SYSTEM_REFRESH.md` — SUPERSEDED por prototype puro).
- BIBLIA DECISIÓN 1 — actualizada en `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md`.

Mapping prototype ↔ M01-M20 ↔ backend en `docs/08_PRODUCT_AUDIT/08_PROTOTYPE_TO_MODULES_MAPPING.md`.
Audit estado real M01-M20 en `docs/08_PRODUCT_AUDIT/06_AUDIT_ESTADO_REAL_M01_M20.md`.

## Stack (H1 cerrado)

- Next.js 16 App Router + Turbopack. React 19 (Server Components).
- TypeScript 5 strict (`noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Tailwind v4 **CSS-first** — tokens en `styles/tokens.css` (`@theme`). NO hay `tailwind.config.ts`.
- tRPC 11 (único endpoint `/api/trpc/[trpc]`).
- Zod 4 — Single Source of Truth (types + input tRPC + forms react-hook-form).
- Supabase (Postgres 16 + RLS + pgvector + pgsodium + pg_partman). CLI linked al proyecto `qxfuqwlktmhokwwlvggy`.
- next-intl (es-MX, es-CO, es-AR, pt-BR, en-US).
- Biome único (linter + formatter + imports).
- Vitest + Playwright.
- Vercel preview deploys + GitHub Actions CI.

Lista completa y rationale: `docs/00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md`.

## Estructura feature-sliced

Cada dominio en `/features/<feature>/{components,hooks,routes,schemas,types,lib,tests}`.
Zero imports cross-feature — todo lo compartido va en `/shared/`.

- `app/` solo routing + layouts.
- `features/` dominio.
- `shared/{ui,lib,hooks,constants,schemas,types}` cross-feature.
- `server/trpc/` context + middleware + root router.
- `supabase/migrations/` versionadas con timestamp + nombre.
- `messages/<locale>.json` i18n.
- `styles/tokens.css` tokens Dopamine.

## Las 10 reglas no negociables

1. **Zod Single Source of Truth** — un schema declara type + input tRPC + validación form.
2. **tRPC authenticated por default** — `publicProcedure` solo en `features/portal-publico/` con justificación.
3. **RLS siempre ON** — cada tabla nueva incluye `ENABLE ROW LEVEL SECURITY` en la misma migration.
4. **Types BD auto-generados** — tras cada migration: `npm run db:types`. Tipar a mano la BD está prohibido.
5. **Zero `any`** — `noImplicitAny: true`. Usa `unknown` + narrow con Zod.
6. **`import type`** cuando es solo tipo (Biome `useImportType`).
7. **Error handling consistente** — `TRPCError` con `code`, `ErrorBoundary` en features, `Sentry.captureException`.
8. **i18n everywhere** — zero strings hardcoded. `useTranslations()` / `getTranslations()`.
9. **Multi-country formatters** — `formatCurrency`, `formatDate`, `formatAddress`, `formatPhone` enrutados por `country_code`.
10. **A11y + `prefers-reduced-motion`** — aria-labels, semantic HTML, keyboard nav, contrast ≥ 4.5:1, focus visible, reduced-motion respeta.

## audit-dead-ui obligatorio (ADR-018 enforcement)

Cada PR a `main` ejecuta `npm run audit:dead-ui:ci` automáticamente vía GitHub Actions workflow `.github/workflows/e2e-audit.yml`. PR que detecte violations (severity `error`) falla CI y no mergea hasta resolver.

Patterns detectados (ADR-018 §M1):

1. Button sin onClick activo (acepta `disabled`, `type="submit"`, `href`, `formAction`, `asChild`).
2. `<form>` sin `onSubmit` ni `action` (Server Action).
3. `useEffect` sin dependency array (warn).
4. `<Link>` / `<a>` con `href="#"` o `href=""`.
5. tRPC stub sin marcado ADR-018 (`// STUB — activar` + heurística mensaje validación).
6. Hardcoded mock data en render path (gap parcial — agendar implementación high-confidence post-A.2).
7. `alert()` o `console.*` placeholders en handlers (`onClick`, `onSubmit`, `onChange`, `on*`).

Local: `npm run audit:dead-ui` antes de commit. Tests del enforcer en `scripts/__tests__/audit-dead-ui.test.ts`. Ver [ADR-018](docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md) para spec completo + STUBs marcados (4 señales) permitidos.

## Convenciones

- Archivos: `kebab-case`. Componentes: `PascalCase`. Vars/funcs/hooks: `camelCase`. Constantes: `SCREAMING_SNAKE_CASE`.
- BD: `snake_case` plural español (`contactos`, `operaciones`). FKs: `<tabla_singular>_id`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` …). Squash merge a `main`. Tags por fase: `fase-NN-complete`.
- Branch: `feat/<fase>-<nombre>`, `fix/<issue>-<nombre>`, `docs/...`, `chore/...`.

## Prohibiciones al escribir código

- No crear documentación no pedida. No READMEs. No comentarios decorativos ni emojis en código.
- No inventar features, tablas, endpoints no documentados.
- No instalar libs fuera de `docs/00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md`.
- No bypass de RLS desde cliente público.
- No `any`, no `@ts-ignore` sin issue link.
- No hardcodear strings user-facing, currency, date, teléfono.

## Workflow de ejecución

Este repo se construye fase por fase (FASE 00 → FASE 29) siguiendo el contrato en `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md`. Plan operativo en `docs/02_PLAN_MAESTRO/FASE_NN_*.md`. ADRs cerrados en `docs/01_DECISIONES_ARQUITECTONICAS/`.

Cualquier conflicto entre docs se resuelve por la jerarquía del contrato. Si no se resuelve, **preguntar**.

## Comunicación con founder (Manu)

Manu no es técnico. Reglas estrictas de respuesta:

- **Cuando proponga upgrades, mejoras, optimizaciones o cambios:** explicar en lenguaje natural y sencillo. Estructura obligatoria por upgrade:
  1. **Qué es** (1 línea, sin jerga)
  2. **Para qué sirve** (1-2 líneas, en términos de producto o usuario)
  3. **Beneficio concreto** (1 línea, qué mejora real aporta)
  - NO incluir: nombres de tablas, funciones, flags TypeScript, jerga DevOps, paths de archivos.
  - SÍ incluir: analogías cotidianas si ayudan.
- **SIEMPRE que Manu pregunte "algún upgrade?" o equivalente:** dar 2 categorías obligatorias:
  - **Upgrades DIRECTOS** al módulo/bloque actual (qué se puede mejorar en lo que se está construyendo)
  - **Upgrades LATERALES** pensando en empresas que crearon nuevas categorías que revolucionaron el mundo (Spotify Wrapped, Strava Segments, Robinhood, Yelp, Zillow Zestimate, etc.) — qué features adicionales podrían posicionar a DMX como categoría nueva, no como portal más.
- **Paralelización agresiva por defecto (founder OK 2026-04-20):** cuando sea posible aplicar sub-agentes paralelos o unir bloques/sub-fases sin generar riesgo de información, HACERLO automáticamente para reducir wall-clock time. Regla: SIN RIESGO = paralelizar / unir. CON RIESGO = secuencial. Riesgo se define como:
  - ❌ NO paralelizar: migrations, edits a mismo archivo (registry.ts, persist.ts), auth/RLS, schema changes, anything que requiera orden estricto.
  - ✅ SÍ paralelizar: archivos independientes (calculators puros distintos, tests aislados, components UI separados, i18n keys en secciones diferentes del mismo JSON).
  - ✅ SÍ unir bloques: cuando dos sub-bloques son lógicamente independientes y caben juntos en contexto disponible.
  - Cada prompt CC debe explicitar "SUB-AGENTS PARALELOS" + "UNIONES DE BLOQUES" sección con groupings y justificación del paralelismo seguro.
- **Git branch safety cuando hay sesiones CC paralelas (regla obligatoria post-incident 2026-04-20):**
  - **ANTES de cualquier git checkout/switch/commit**, ejecutar `git branch --show-current` para validar estado.
  - **CUANDO una sesión CC esté activa en branch X**, cualquier PM paralelo en misma máquina DEBE hacer sus operaciones git en worktree separado o esperar a que CC termine su commit. El filesystem git está compartido — `git checkout` en una sesión afecta HEAD global del repo local.
  - **Alternativas seguras para PM paralelo mientras CC ejecuta:**
    - (a) `git worktree add ../main-pm-work main` → working directory separado, no afecta CC
    - (b) Esperar checkpoint CC (post commit atómico) antes de switch
    - (c) Hacer edits sin commit en una rama temporal, integrar al final sin afectar CC
  - **Incident origen de la regla:** 2026-04-20 PM hizo `git checkout main` para Pass 1 docs housekeeping mientras CC ejecutaba FASE 10 sesión 1/3 en branch `fase-10/ie-scores-n2-n3-n4`. CC commit A1 (756d913 N2.0-migration) cayó en main branch accidentalmente. Remedio non-destructive: `git branch -f fase-10 756d913` (mover branch al commit) sin force-push.
- Respuestas cortas, sin rollos. Una idea por bloque.
- Zero asumir: si requiere decisión de producto → proponer A/B/C con recomendación explícita.
- Zero gasto sin validación previa (regla inviolable).
- Comandos siempre con context tag explícito: `[Claude Code terminal]`, `[Terminal Mac mini]`, `[Vercel Dashboard]`, `[Supabase Dashboard]`, `[GitHub web]`, `[Browser — servicio X]`.
