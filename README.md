# DesarrollosMX

Plataforma multi-portal AI-native para el mercado inmobiliario LATAM: captación, análisis de zonas (Inteligencia Espacial — 118 scores + 7 índices DMX), operaciones, contabilidad, legal/pagos, y marketplace público.

## Stack

Next.js 16 · React 19 · TypeScript 5 strict · Tailwind v4 CSS-first · tRPC 11 · Zod 4 · Supabase (Postgres 16 + RLS + pgvector) · next-intl · Biome · Vitest · Playwright · Vercel.

Detalle en [`docs/00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md`](./docs/00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md).

## Correr local

```bash
npm install
cp .env.example .env.local
# Completar las claves en .env.local
npm run dev
```

Abrir http://localhost:3000.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Next.js dev server con Turbopack |
| `npm run build` | Build de producción |
| `npm run start` | Start producción (post `build`) |
| `npm run lint` | Biome check |
| `npm run lint:fix` | Biome check + autofix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright e2e |
| `npm run format` | Biome format |
| `npm run db:types` | Genera `shared/types/database.ts` desde Supabase |
| `npm run db:push` | Aplica migrations locales al proyecto Supabase |
| `npm run db:reset` | Reset schema local Supabase |

## Documentación

- [`docs/00_FOUNDATION/`](./docs/00_FOUNDATION/) — visión, stack, glosario, comandos.
- [`docs/01_DECISIONES_ARQUITECTONICAS/`](./docs/01_DECISIONES_ARQUITECTONICAS/) — ADRs cerrados.
- [`docs/02_PLAN_MAESTRO/`](./docs/02_PLAN_MAESTRO/) — plan por fases (00 → 29).
- [`docs/03_CATALOGOS/`](./docs/03_CATALOGOS/) — catálogos técnicos (BD, scores, …).
- [`docs/04_MODULOS/`](./docs/04_MODULOS/) — specs UI por módulo.
- [`docs/05_OPERACIONAL/`](./docs/05_OPERACIONAL/) — runbooks, deployment, incident response.

## Seguridad

Reportes en [`SECURITY.md`](./SECURITY.md).
