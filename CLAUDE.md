# CLAUDE.md — Instrucciones para Claude Code

> Cómo trabajar en este repo. Todo cambio a estas reglas pasa por un ADR.

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
