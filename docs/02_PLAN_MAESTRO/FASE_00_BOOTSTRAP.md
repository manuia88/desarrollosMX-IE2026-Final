# FASE 00 — Bootstrap

> **Duración estimada:** 2 sesiones Claude Code (~4 horas con agentes paralelos)
> **Dependencias:** Ninguna (es la fase inicial)
> **Bloqueantes externos:**
> - Manu debe confirmar acceso al repo `git@github.com:manuia88/desarrollosMX-IE2026-Final.git` (ya existe)
> - Manu debe confirmar acceso al proyecto Supabase `qxfuqwlktmhokwwlvggy` (ya existe, schema vacío)
> - Manu debe proveer `SUPABASE_ACCESS_TOKEN` (personal access token) para CLI link
> - Manu debe tener cuenta Vercel con permisos para vincular el repo
> - Node.js LTS instalado (≥ 20.x) en la máquina de desarrollo
> - GitHub CLI (`gh`) autenticado como `manuia88`
> - Supabase CLI instalado (`brew install supabase/tap/supabase`)
> **Resultado esperado:** Repo listo con estructura base, Next.js 16 corriendo en `localhost:3000`, Tailwind v4 CSS-first con tokens Dopamine, tRPC 11 skeleton funcional, Supabase CLI linkeado al proyecto remoto, Vercel con preview deploy activo y CI pasando. Tag `fase-00-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase establece los cimientos técnicos del rewrite. Deja el repo con la estructura feature-sliced, el stack base configurado (Next.js 16 + TS 5 strict + Tailwind v4 CSS-first + tRPC 11 + Zod 4), la conexión a Supabase CLI operativa, un primer deploy preview en Vercel y CI en GitHub Actions. A partir de aquí cada fase puede asumir que `npm run dev`, `npm run build`, `npm run test` y `npm run typecheck` funcionan sin fricción. No se escribe lógica de producto — solo andamiaje.

## Bloques

### BLOQUE 0.A — Repo y estructura de carpetas

Deja el repositorio clonado con todas las carpetas feature-sliced, archivos raíz obligatorios (package.json, tsconfig, .env.example, .nvmrc, CLAUDE.md, README) y workflows CI base. Git init ya fue ejecutado en la creación del repo remoto.

#### MÓDULO 0.A.1 — Clonar y crear estructura base

**Pasos:**
- `[0.A.1.1]` Clonar repo: `git clone git@github.com:manuia88/desarrollosMX-IE2026-Final.git && cd desarrollosMX-IE2026-Final`.
- `[0.A.1.2]` Crear rama de trabajo: `git checkout -b fase-00/bootstrap`.
- `[0.A.1.3]` Crear estructura de carpetas con un comando: `mkdir -p app/{\(asesor\),\(developer\),\(admin\),\(comprador\),\(public\),api} features shared/{ui/{primitives,dopamine,layout},lib/{supabase,trpc,ai,i18n,currency,utils},hooks,constants,schemas,types} server/trpc styles supabase/migrations messages public/{images,icons} tests/{e2e,fixtures} docs/{00_FOUNDATION,01_DECISIONES_ARQUITECTONICAS,02_PLAN_MAESTRO,03_CATALOGOS,04_MODULOS,05_OPERACIONAL} .github/workflows`.
- `[0.A.1.4]` Crear placeholder `.gitkeep` en cada carpeta vacía para que git las tracke.
- `[0.A.1.5]` Agregar `docs/biblia-v5/` a `.gitignore` (referencias internas, no se versiona).

**Criterio de done del módulo:**
- [ ] `tree -L 2 -I node_modules` muestra la estructura esperada.
- [ ] `git status` no muestra carpetas vacías huérfanas.
- [ ] `.gitignore` excluye `node_modules`, `.next`, `.env*` (salvo `.env.example`), `docs/biblia-v5/`.

#### MÓDULO 0.A.2 — Archivos raíz obligatorios

**Pasos:**
- `[0.A.2.1]` Crear `.nvmrc` con el contenido `lts/*` (fija Node LTS para CI).
- `[0.A.2.2]` Crear `package.json` con `name: "desarrollosmx"`, `type: "module"`, `private: true`, y scripts:
  - `"dev": "next dev --turbo"`
  - `"build": "next build"`
  - `"start": "next start"`
  - `"lint": "biome check ."`
  - `"lint:fix": "biome check --write ."`
  - `"typecheck": "tsc --noEmit"`
  - `"test": "vitest"`
  - `"test:e2e": "playwright test"`
  - `"format": "biome format --write ."`
  - `"db:types": "supabase gen types typescript --project-id qxfuqwlktmhokwwlvggy > shared/types/database.ts"`
  - `"db:push": "supabase db push"`
  - `"db:reset": "supabase db reset"`
- `[0.A.2.3]` Instalar deps core: `npm i next@latest react@latest react-dom@latest zod @trpc/server @trpc/client @trpc/react-query @tanstack/react-query @supabase/supabase-js @supabase/ssr next-intl zustand date-fns date-fns-tz`.
- `[0.A.2.4]` Instalar deps dev: `npm i -D typescript @types/node @types/react @types/react-dom @biomejs/biome vitest @vitejs/plugin-react @playwright/test tailwindcss@next @tailwindcss/postcss@next supabase`.
- `[0.A.2.5]` Crear `.env.example` con las claves: `NEXT_PUBLIC_SUPABASE_URL=https://qxfuqwlktmhokwwlvggy.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=`, `ANTHROPIC_API_KEY=`, `OPENAI_API_KEY=`, `OPEN_EXCHANGE_RATES_APP_ID=`, `SENTRY_DSN=`, `NEXT_PUBLIC_POSTHOG_KEY=`.
- `[0.A.2.6]` Crear `CLAUDE.md` raíz con instrucciones para Claude Code (stack, convenciones, no-crear-docs, granularidad, zero `any`, feature-sliced).
- `[0.A.2.7]` Crear `README.md` raíz con: descripción del producto, stack, cómo correr local (`npm i && cp .env.example .env.local && npm run dev`), link al `docs/00_FOUNDATION/`.
- `[0.A.2.8]` Crear `.editorconfig` con `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`, `insert_final_newline = true`.

**Criterio de done del módulo:**
- [ ] `npm install` corre sin errores.
- [ ] `cat .env.example` lista las 8+ variables obligatorias.
- [ ] `CLAUDE.md` existe con instrucciones claras.

#### MÓDULO 0.A.3 — Gitignore y archivos de seguridad

**Pasos:**
- `[0.A.3.1]` Crear `.gitignore` con: `node_modules/`, `.next/`, `.env`, `.env.local`, `.env.*.local`, `dist/`, `coverage/`, `playwright-report/`, `.vercel/`, `*.log`, `.DS_Store`, `docs/biblia-v5/`, `supabase/.branches/`, `supabase/.temp/`.
- `[0.A.3.2]` Crear `.gitattributes` con `* text=auto eol=lf`.
- `[0.A.3.3]` Crear `SECURITY.md` raíz con email de contacto (`security@desarrollosmx.com`) y política 90 días.

**Criterio de done del módulo:**
- [ ] `git check-ignore .env.local` retorna truthy.
- [ ] `git check-ignore docs/biblia-v5/01_BACKEND_PART1_Tablas_Seguridad.md` retorna truthy.

### BLOQUE 0.B — TypeScript, Biome y Next.js 16

Configura el lenguaje y el framework principal con modo estricto y bundler Turbopack.

#### MÓDULO 0.B.1 — TypeScript strict

**Pasos:**
- `[0.B.1.1]` Crear `tsconfig.json` con `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`, `"exactOptionalPropertyTypes": true`, `"jsx": "preserve"`, `"incremental": true`, `"skipLibCheck": true`, `"allowJs": false`, `"esModuleInterop": true`, `"resolveJsonModule": true`, `"isolatedModules": true`.
- `[0.B.1.2]` Agregar `paths` aliases: `"@/*": ["./*"]`, `"@/features/*": ["./features/*"]`, `"@/shared/*": ["./shared/*"]`, `"@/server/*": ["./server/*"]`, `"@/app/*": ["./app/*"]`.
- `[0.B.1.3]` Agregar `include`: `["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]` y `exclude`: `["node_modules", ".next", "dist"]`.
- `[0.B.1.4]` Verificar con `npx tsc --noEmit` (debe pasar sin errores, sin archivos TS aún).

**Criterio de done del módulo:**
- [ ] `npm run typecheck` retorna 0.
- [ ] Aliases funcionan en un test manual (`import x from '@/shared/lib/utils'`).

#### MÓDULO 0.B.2 — Biome (linter + formatter)

**Pasos:**
- `[0.B.2.1]` Crear `biome.json` con `$schema: "https://biomejs.dev/schemas/1.9.4/schema.json"`, `formatter: { enabled: true, indentStyle: "space", indentWidth: 2, lineWidth: 100 }`, `linter: { enabled: true, rules: { recommended: true, suspicious: { noExplicitAny: "error" }, style: { useImportType: "error", noNonNullAssertion: "error" }, correctness: { noUnusedVariables: "error" } } }`, `organizeImports: { enabled: true }`, `files: { ignore: ["node_modules", ".next", "dist", "shared/types/database.ts"] }`.
- `[0.B.2.2]` Configurar Git hook con `husky`: `npx husky-init && npm i -D husky lint-staged` y crear `.husky/pre-commit` con `npx lint-staged`.
- `[0.B.2.3]` Agregar en `package.json` la clave `"lint-staged": { "*.{ts,tsx,js,jsx,json}": ["biome check --write"] }`.
- `[0.B.2.4]` Ejecutar `npm run lint` — debe pasar limpio.

**Criterio de done del módulo:**
- [ ] `npm run lint` retorna 0.
- [ ] Un archivo con `any` explícito hace fallar `npm run lint`.
- [ ] `git commit` con un archivo mal formateado dispara lint-staged.

#### MÓDULO 0.B.3 — Next.js 16 config

**Pasos:**
- `[0.B.3.1]` Crear `next.config.ts` con `experimental: { typedRoutes: true, ppr: 'incremental' }`, `reactStrictMode: true`, `poweredByHeader: false`, `images: { remotePatterns: [{ protocol: 'https', hostname: 'qxfuqwlktmhokwwlvggy.supabase.co' }, { protocol: 'https', hostname: 'api.mapbox.com' }] }`, `async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' }] }] }`.
- `[0.B.3.2]` Crear `app/layout.tsx` mínimo con `<html lang="es-MX">` + metadata.
- `[0.B.3.3]` Crear `app/page.tsx` mínimo con un `<h1>DesarrollosMX</h1>`.
- `[0.B.3.4]` Crear `app/globals.css` que importa `@import "../styles/tokens.css";` + `@import "tailwindcss";`.
- `[0.B.3.5]` Ejecutar `npm run dev` y verificar en navegador `http://localhost:3000`.
- `[0.B.3.6]` Ejecutar `npm run build` y verificar que compila.

**Criterio de done del módulo:**
- [ ] `localhost:3000` responde con el `<h1>`.
- [ ] Turbopack corre (ver mensaje en consola al `dev`).
- [ ] `npm run build` produce `.next/` sin errores.

### BLOQUE 0.C — Tailwind v4 CSS-first con tokens Dopamine

Tailwind v4 es 100% CSS-first. CERO archivo `tailwind.config.ts`. Todos los tokens Dopamine (tipografía, colores, gradientes, tintes, animaciones) se declaran en `styles/tokens.css` con el bloque `@theme`.

#### MÓDULO 0.C.1 — Setup Tailwind v4 CSS-first

**Pasos:**
- `[0.C.1.1]` Crear `postcss.config.mjs` con `export default { plugins: { "@tailwindcss/postcss": {} } }`.
- `[0.C.1.2]` NO crear `tailwind.config.ts` (Tailwind v4 no lo usa).
- `[0.C.1.3]` Verificar con `npm run dev` que las clases `bg-brand-primary text-lg` (cuando se agreguen tokens) aplican.

**Criterio de done del módulo:**
- [ ] PostCSS carga `@tailwindcss/postcss`.
- [ ] No existe `tailwind.config.ts` ni `.js`.

#### MÓDULO 0.C.2 — Tokens Dopamine completos en `styles/tokens.css`

Todos los tokens se declaran dentro de `@theme { }`. Modo oscuro via `:root.dark { }` overrides. Referencia visual: `docs/biblia-v5/dmx-dopamine-v2.jsx` y M1-M9.

**Pasos:**
- `[0.C.2.1]` Crear `styles/tokens.css` con `@theme { ... }` conteniendo:
  - **Typography**: `--font-display: "Outfit", sans-serif; --font-body: "DM Sans", sans-serif; --font-mono: "JetBrains Mono", monospace;` + escalas `--text-xs: 0.75rem` hasta `--text-5xl: 3rem`.
  - **Colors semantic**: `--color-brand-primary: oklch(0.67 0.19 285)` (violeta), `--color-brand-secondary: oklch(0.78 0.12 180)` (turquesa), `--color-accent-warm: oklch(0.80 0.15 65)` (coral), `--color-success: oklch(0.72 0.17 150)`, `--color-warning: oklch(0.82 0.17 85)`, `--color-danger: oklch(0.64 0.23 25)`, `--color-info: oklch(0.72 0.15 240)`.
  - **Tints (backgrounds suaves)**: `--color-bg-lavender: oklch(0.97 0.025 300)`, `--color-bg-mint: oklch(0.97 0.03 170)`, `--color-bg-peach: oklch(0.97 0.035 60)`, `--color-bg-slate: oklch(0.97 0.01 240)`, `--color-bg-rose: oklch(0.97 0.03 10)`.
  - **Gradients**: `--gradient-p: linear-gradient(135deg, oklch(0.67 0.19 285), oklch(0.72 0.17 230))`, `--gradient-warm: linear-gradient(135deg, oklch(0.80 0.15 65), oklch(0.75 0.19 30))`, `--gradient-cool: linear-gradient(135deg, oklch(0.78 0.12 180), oklch(0.72 0.15 240))`, `--gradient-fresh: linear-gradient(135deg, oklch(0.85 0.12 145), oklch(0.78 0.12 180))`, `--gradient-sunset: linear-gradient(135deg, oklch(0.78 0.17 50), oklch(0.64 0.23 25))`.
  - **Radii**: `--radius-sm: 0.375rem; --radius-md: 0.75rem; --radius-lg: 1.25rem; --radius-xl: 1.75rem; --radius-pill: 999px;`.
  - **Shadows**: `--shadow-xs` (elevación 1), `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl` (card hover), `--shadow-glow-primary: 0 0 32px oklch(0.67 0.19 285 / 0.4)`.
  - **Spacing**: heredar escala default Tailwind + `--spacing-sidebar-collapsed: 60px`, `--spacing-sidebar-expanded: 240px`, `--spacing-header: 54px`, `--spacing-copilot-collapsed: 60px`, `--spacing-copilot-expanded: 420px`, `--content-max: 1100px`.
  - **Durations**: `--duration-fast: 150ms; --duration-base: 250ms; --duration-slow: 400ms; --duration-slower: 700ms;`.
  - **Easings**: `--ease-dopamine: cubic-bezier(0.22, 1, 0.36, 1);`.
  - **Keyframes**: `@keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }`, `@keyframes float-y { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }`, `@keyframes pulse-glow { ... }`.
- `[0.C.2.2]` Agregar override `:root.dark { --color-bg-base: oklch(0.15 0.02 280); --color-text-primary: oklch(0.95 0 0); ... }`.
- `[0.C.2.3]` Respetar `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important } }`.
- `[0.C.2.4]` Agregar fuentes via `<link>` en `app/layout.tsx`: Outfit 400/600/700 + DM Sans 400/500 + JetBrains Mono 400 desde Google Fonts (o self-hosted en `public/fonts/`).

**Criterio de done del módulo:**
- [ ] `styles/tokens.css` tiene >= 60 CSS vars declaradas.
- [ ] `bg-brand-primary`, `rounded-lg`, `shadow-glow-primary` funcionan como utilidades en JSX.
- [ ] Dark mode se activa con `document.documentElement.classList.add('dark')`.

### BLOQUE 0.D — Supabase CLI link

Conecta el repo al proyecto Supabase existente `qxfuqwlktmhokwwlvggy` y deja el local dev listo.

#### MÓDULO 0.D.1 — Link y config.toml

**Pasos:**
- `[0.D.1.1]` Exportar token: `export SUPABASE_ACCESS_TOKEN=<pat_proveído_por_Manu>`.
- `[0.D.1.2]` Linkear: `supabase link --project-ref qxfuqwlktmhokwwlvggy`.
- `[0.D.1.3]` Esto crea `supabase/config.toml` — validar que tiene `project_id = "qxfuqwlktmhokwwlvggy"`.
- `[0.D.1.4]` Ajustar `config.toml`: `[auth] enable_signup = true`, `[auth.email] enable_confirmations = true`, `[db] major_version = 16`, `[storage] enabled = true, file_size_limit = "50MiB"`.
- `[0.D.1.5]` Ejecutar `supabase db pull` — debe traer un schema vacío (crea `supabase/migrations/` vacío o con una migration inicial).

**Criterio de done del módulo:**
- [ ] `supabase/config.toml` con project_id correcto commiteado.
- [ ] `supabase projects list` muestra el proyecto.
- [ ] `supabase db pull` no falla.

#### MÓDULO 0.D.2 — Clientes Supabase en `shared/lib/supabase/`

Tres clientes: browser (RLS-enforced), server (cookies SSR), admin (service role — solo tRPC backend).

**Pasos:**
- `[0.D.2.1]` Crear `shared/lib/supabase/client.ts` con `createBrowserClient` de `@supabase/ssr` usando `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `[0.D.2.2]` Crear `shared/lib/supabase/server.ts` con `createServerClient` + cookies handler (`cookies()` de `next/headers`). Export function `createClient()` async.
- `[0.D.2.3]` Crear `shared/lib/supabase/admin.ts` con `createClient` (de `@supabase/supabase-js`) usando `SUPABASE_SERVICE_ROLE_KEY`. Advertir en comentario: "SOLO en server-side tRPC/API routes/crons. NUNCA en Client Components.".
- `[0.D.2.4]` Crear `shared/types/database.ts` placeholder vacío (será sobrescrito por `npm run db:types` cuando haya tablas).
- `[0.D.2.5]` Tipar cada cliente con `Database` generado: `createBrowserClient<Database>(...)`.

**Criterio de done del módulo:**
- [ ] Los 3 clientes se importan sin errores de TS.
- [ ] Un test `supabase.auth.getSession()` en `app/page.tsx` no rompe el build.

### BLOQUE 0.E — tRPC 11 skeleton

Deja los routers encadenables con context autenticado + middleware de rate limit (stubs a completar en Fase 02).

#### MÓDULO 0.E.1 — init.ts + context.ts

**Pasos:**
- `[0.E.1.1]` Crear `server/trpc/init.ts` con `import { initTRPC } from '@trpc/server'; import { ZodError } from 'zod';` — define `const t = initTRPC.context<Context>().create({ errorFormatter: ({ shape, error }) => ({ ...shape, data: { ...shape.data, zodError: error.cause instanceof ZodError ? error.cause.flatten() : null } }) }); export const router = t.router; export const publicProcedure = t.procedure; export const middleware = t.middleware;`.
- `[0.E.1.2]` Crear `server/trpc/context.ts` con `export async function createContext(opts: FetchCreateContextFnOptions)` que retorna `{ supabase: await createClient(), headers: opts.req.headers, user: null as User | null }` — carga user con `supabase.auth.getUser()`.
- `[0.E.1.3]` Crear `server/trpc/middleware.ts` con `authenticatedProcedure = publicProcedure.use(async ({ ctx, next }) => { if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' }); return next({ ctx: { ...ctx, user: ctx.user } }); })`.

**Criterio de done del módulo:**
- [ ] Archivos tipados sin errores.
- [ ] `authenticatedProcedure` exporta correctamente.

#### MÓDULO 0.E.2 — root router + API handler

**Pasos:**
- `[0.E.2.1]` Crear `server/trpc/root.ts` con `export const appRouter = router({ health: publicProcedure.query(() => ({ ok: true, timestamp: Date.now() })) }); export type AppRouter = typeof appRouter;`.
- `[0.E.2.2]` Crear `app/api/trpc/[trpc]/route.ts` con `fetchRequestHandler` de `@trpc/server/adapters/fetch` apuntando a `appRouter` + `createContext`.
- `[0.E.2.3]` Crear `shared/lib/trpc/client.ts` con `createTRPCReact<AppRouter>()` y export `trpc`.
- `[0.E.2.4]` Crear `shared/lib/trpc/provider.tsx` (client component) con `QueryClientProvider` + `trpc.Provider` + `httpBatchLink({ url: '/api/trpc' })`.
- `[0.E.2.5]` Envolver `app/layout.tsx` con `<TrpcProvider>{children}</TrpcProvider>`.
- `[0.E.2.6]` Probar con una página de test: `const { data } = trpc.health.useQuery();` retorna `{ ok: true, ... }`.

**Criterio de done del módulo:**
- [ ] `curl http://localhost:3000/api/trpc/health` retorna JSON con `ok:true`.
- [ ] `trpc.health.useQuery()` funciona en Client Component.

### BLOQUE 0.F — Vercel link y primer deploy preview

#### MÓDULO 0.F.1 — Vercel CLI link

**Pasos:**
- `[0.F.1.1]` `npm i -g vercel` (si no está) y `vercel login`.
- `[0.F.1.2]` `vercel link` (seleccionar proyecto o crear uno nuevo llamado `desarrollosmx`).
- `[0.F.1.3]` Configurar env vars en Vercel dashboard o con `vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development` (repetir para cada variable de `.env.example`).
- `[0.F.1.4]` Push branch + crear PR contra main: `git add -A && git commit -m "chore: fase 00 bootstrap"  && git push -u origin fase-00/bootstrap`.
- `[0.F.1.5]` Abrir PR → Vercel genera preview URL automáticamente.
- `[0.F.1.6]` Verificar preview URL responde con el `<h1>DesarrollosMX</h1>`.

**Criterio de done del módulo:**
- [ ] `.vercel/project.json` commiteado (con `orgId` pero SIN `projectId` sensitive? — revisar vercel docs; `.vercel/` va en `.gitignore`).
- [ ] Preview deploy pasa.
- [ ] PostHog, Sentry stubs no rompen el build en prod.

### BLOQUE 0.G — CI/CD GitHub Actions base

#### MÓDULO 0.G.1 — Workflow `ci.yml`

**Pasos:**
- `[0.G.1.1]` Crear `.github/workflows/ci.yml` con trigger `on: [pull_request, push]` para `main`.
- `[0.G.1.2]` Job `lint`: `actions/checkout@v4` → `actions/setup-node@v4` con `node-version-file: '.nvmrc'`, `cache: 'npm'` → `npm ci` → `npm run lint`.
- `[0.G.1.3]` Job `typecheck`: idem + `npm run typecheck`.
- `[0.G.1.4]` Job `test`: idem + `npm run test -- --run`.
- `[0.G.1.5]` Job `build`: idem + `npm run build` (con env vars dummy desde `secrets.*`).
- `[0.G.1.6]` Job `db-types-check` (opcional): corre `npm run db:types` y verifica con `git diff --exit-code shared/types/database.ts` que no hay drift.

**Criterio de done del módulo:**
- [ ] PR dispara los 4-5 jobs, todos pasan verde.
- [ ] `main` queda protegida con "require status checks" en settings del repo.

#### MÓDULO 0.G.2 — Workflow `deploy.yml` (opcional H1)

**Pasos:**
- `[0.G.2.1]` Crear `.github/workflows/deploy.yml` con `on: push: branches: [main]` → job que hace `vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}` (Vercel lo hace nativo sin workflow — este job es opcional para promote manual).
- `[0.G.2.2]` Documentar en `docs/05_OPERACIONAL/05.1_DEPLOYMENT_GUIDE.md` (stub en esta fase, desarrollar en fase posterior).

**Criterio de done del módulo:**
- [ ] Push a `main` dispara deploy prod (nativo Vercel).

### BLOQUE 0.H — Primer commit y tag

#### MÓDULO 0.H.1 — Merge, tag, checkpoint

**Pasos:**
- `[0.H.1.1]` Code review del PR — que Manu lo apruebe.
- `[0.H.1.2]` Squash merge a `main`.
- `[0.H.1.3]` En `main` actualizado: `git tag -a fase-00-complete -m "Bootstrap completo"` y `git push origin fase-00-complete`.
- `[0.H.1.4]` Crear GitHub Release con título "Fase 00 — Bootstrap" y notas: estructura, stack instalado, Supabase linkeado, Vercel deploy, CI verde.
- `[0.H.1.5]` Documentar en `docs/00_FOUNDATION/00.4_COMANDOS_Y_WORKFLOWS.md` los comandos principales (dev, test, db:types, db:push, lint, deploy).

**Criterio de done del módulo:**
- [ ] Tag `fase-00-complete` visible en `git tag`.
- [ ] Release publicado en GitHub.

## Criterio de done de la FASE

- [ ] Todos los bloques (0.A a 0.H) cerrados con sus criterios.
- [ ] `npm run dev`, `npm run build`, `npm run test`, `npm run typecheck`, `npm run lint` funcionan localmente.
- [ ] Preview URL de Vercel responde 200 con el landing mínimo.
- [ ] CI verde en `main`.
- [ ] `supabase db pull` funciona.
- [ ] Tokens Dopamine en `styles/tokens.css` declarados (>= 60 CSS vars).
- [ ] tRPC `health` endpoint responde.
- [ ] Tag `fase-00-complete` creado y pusheado.
- [ ] Documentación actualizada en `docs/00_FOUNDATION/`.
- [ ] Zero errores de TypeScript / Biome / Build.

## Features implementadas en esta fase (≈ 10)

1. **F-00-01** Estructura feature-sliced del repo
2. **F-00-02** Archivos raíz (package, tsconfig, biome, next.config)
3. **F-00-03** Tailwind v4 CSS-first con tokens Dopamine
4. **F-00-04** Supabase CLI linked al proyecto remoto
5. **F-00-05** 3 clientes Supabase (browser/server/admin)
6. **F-00-06** tRPC 11 skeleton + health endpoint
7. **F-00-07** Provider tRPC + React Query en layout
8. **F-00-08** Vercel preview deploy operativo
9. **F-00-09** CI GitHub Actions (lint/typecheck/test/build)
10. **F-00-10** Tag `fase-00-complete` + release notes

## Próxima fase

[FASE 01 — BD Fundación](./FASE_01_BD_FUNDACION.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
