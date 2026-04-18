# FASE 27 — Testing + QA (Vitest + Playwright + msw + RLS tests + CI + k6)

> **Duración estimada:** 3 sesiones Claude Code (~10 horas con agentes paralelos)
> **Dependencias:** Todas las fases 00-26. Esta fase consolida testing del producto entero.
> **Bloqueantes externos:**
> - **GitHub Actions** habilitado en repo + runners ubuntu-latest.
> - **Docker** instalable en CI runner para Supabase local.
> - Dataset seed realista (50+ contactos, 20 proyectos, 10 operaciones, scores calculados).
> - Feature flags: `ci_e2e_critical_flow`, `ci_rls_tests`, `ci_visual_regression`, `ci_load_tests`.
> **Resultado esperado:** Pipeline testing robusto. Vitest coverage 70%+ en `shared/lib/*` + todos calculators IE. Playwright E2E happy paths 20 módulos M01-M20. msw mocks externos. RLS tests Docker Supabase validan 207+ policies. CI GH Actions bloqueando PRs con regresiones. Visual regression Playwright screenshots. k6 load test API externa. Snapshot tests UI AI-generated. Tag `fase-27-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Tests no son plataforma separada — son el **gate de deploy**. Sin pipeline robusto, primera regresión en prod daña usuarios reales H1 (10 asesores piloto → rápido perdería confianza).

Principios no negociables:
- **70% coverage `shared/lib/*` + 100% calculators IE**: son IP propietaria, no se rompen.
- **E2E happy path** cada módulo M01-M20 verificado antes de merge.
- **RLS tests Docker Supabase** — único modo confiable de probar policies sin riesgo prod.
- **msw para ALL external APIs** — nunca llamar Anthropic/Stripe/Mifiel desde test.
- **CI fail fast**: primera etapa typecheck + lint (<1min); segunda etapa unit (<3min); tercera E2E (<10min).
- **Deterministic**: cero flaky; timers fake, random seeded, clock controlled.

Cross-references:
- ADR-006 (testing strategy — autoridad normativa).
- ADR-009 (seguridad — RLS tests obligatorios).
- FASE 01-12 (calculators IE a cubrir).
- FASE 13-21 (portales a E2E).
- FASE 22-26 (notifs + billing + compliance — E2E críticos billing flow + ARCO).

## Bloques

### BLOQUE 27.A — Vitest setup + unit tests

#### MÓDULO 27.A.1 — Config

**Pasos:**
- `[27.A.1.1]` Instalar `vitest` + `@vitest/coverage-v8` + `@vitest/ui`.
- `[27.A.1.2]` `vitest.config.ts`:
  ```ts
  export default defineConfig({
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text','json','html','lcov'],
        include: ['shared/lib/**','features/**/lib/**','features/**/routes/**','server/**'],
        exclude: ['**/*.test.ts','**/types/**','**/*.d.ts'],
        thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 }
      },
      testTimeout: 10000,
      pool: 'threads',
      poolOptions: { threads: { singleThread: false } }
    },
    resolve: { alias: { '@': '/' } }
  });
  ```
- `[27.A.1.3]` `tests/setup.ts`:
  ```ts
  import '@testing-library/jest-dom/vitest';
  import { setupServer } from 'msw/node';
  import { handlers } from './msw/handlers';
  import { vi } from 'vitest';
  
  export const server = setupServer(...handlers);
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  
  vi.useFakeTimers({ toFake: ['setTimeout','clearTimeout','setInterval','clearInterval','Date'] });
  vi.setSystemTime(new Date('2026-04-17T10:00:00Z'));
  ```
- `[27.A.1.4]` `npm scripts`: `test`, `test:watch`, `test:ui`, `test:coverage`.

**Criterio de done del módulo:**
- [ ] `npm run test` ejecuta 0 errors.
- [ ] Coverage report genera HTML en `coverage/`.

#### MÓDULO 27.A.2 — Tests calculators IE (118 scores)

**Pasos:**
- `[27.A.2.1]` Carpeta `features/scores/tests/fixtures/` con JSON inputs + expected outputs por score.
- `[27.A.2.2]` Tests obligatorios para cada calculator (N0 21 + N0_extras 11 + N1 16 + N2 14 + N3 12 + N4 7 + N5 26 + 7 índices = 114+):
  - Input válido → output correcto.
  - Input inválido → error con mensaje claro.
  - Edge cases: zero values, null data, data incompleta (confidence cascade), future dates.
  - Determinism: same input → same output.
- `[27.A.2.3]` Snapshot tests fixtures de referencia (permite detectar cambios inadvertidos de fórmula).
- `[27.A.2.4]` Cross-calculator dependencies: tests verifican que cascade works (ej: N03 Gentrification requiere 2+ snapshots).

**Criterio de done del módulo:**
- [ ] 100% calculators IE con tests golden + edge cases.
- [ ] Coverage calculators dir 90%+.

#### MÓDULO 27.A.3 — Tests multi-country formatters

**Pasos:**
- `[27.A.3.1]` `shared/lib/currency/format.ts` tests: 5 países × 3 monedas × edge cases (0, negativo, muy grande, decimales).
- `[27.A.3.2]` `shared/lib/i18n/*` tests: date formatter (es-MX "15 de enero de 2026" vs es-AR "15 de enero de 2026" diferencias sutiles), phone formatter (+52, +57, +54, +55, +56).
- `[27.A.3.3]` Address formatter: MX postal code 5 dígitos, CO 6, BR CEP 8, etc.

**Criterio de done del módulo:**
- [ ] Formatters cubren 5 países + test snapshots.

#### MÓDULO 27.A.4 — Tests shared/lib/*

**Pasos:**
- `[27.A.4.1]` `supabase/` client wrappers.
- `[27.A.4.2]` `trpc/` context builder + middleware.
- `[27.A.4.3]` `ai/` wrappers (mocked Anthropic).
- `[27.A.4.4]` `notifs/orchestrator` (ver FASE 22).
- `[27.A.4.5]` `billing/check-feature` (ver FASE 23).
- `[27.A.4.6]` `log.ts` PII redact.
- `[27.A.4.7]` `observability/sentry-context`.

**Criterio de done del módulo:**
- [ ] `shared/lib/*` coverage ≥80%.

#### MÓDULO 27.A.5 — Tests tRPC procedures unit (con mocked ctx)

**Pasos:**
- `[27.A.5.1]` Setup: mock `ctx` con user, supabase client mock, feature flags.
- `[27.A.5.2]` Tests CRUD críticos por router (features/*/routes/*):
  - Validación Zod falla → ZodError.
  - Auth missing → TRPCError UNAUTHORIZED.
  - Feature gate denied → FORBIDDEN con upgradeUrl.
  - Happy path retorna data esperada.
- `[27.A.5.3]` Transaction rollback en errores (mock Supabase transactional).

**Criterio de done del módulo:**
- [ ] 30+ procedures con tests unit.

### BLOQUE 27.B — Playwright E2E

#### MÓDULO 27.B.1 — Config

**Pasos:**
- `[27.B.1.1]` Instalar `@playwright/test`.
- `[27.B.1.2]` `playwright.config.ts`:
  ```ts
  export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 4 : undefined,
    reporter: [['html'],['github'],['json',{outputFile:'test-results.json'}]],
    use: {
      baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      locale: 'es-MX',
      timezoneId: 'America/Mexico_City'
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
      { name: 'mobile-safari', use: { ...devices['iPhone 14'] } }
    ],
    webServer: { command: 'npm run start:test', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI }
  });
  ```
- `[27.B.1.3]` `tests/e2e/fixtures/` con helpers `loginAs(role)`, `seedUser()`, `createProject()`.
- `[27.B.1.4]` Auth state reuse: `storageState: 'auth-asesor.json'` pre-computed para speed.

**Criterio de done del módulo:**
- [ ] `npx playwright test` runs green.

#### MÓDULO 27.B.2 — E2E críticos por módulo M01-M20

**Pasos:**
- `[27.B.2.1]` Lista de escenarios obligatorios:
  - **Auth**: signup → email verify → onboarding → dashboard.
  - **M01 Dashboard**: login → ver 7 KPIs → carrusel alerts → click KPI → drawer.
  - **⌘K Search**: open with keyboard → type "nápoles" → results aparecen → click → navega.
  - **M02 Desarrollos**: lista → filtros → click → ficha → tab Zona → scores visibles.
  - **M03 Contactos**: crear contacto → detectar duplicado phone → resolver → lista actualiza.
  - **M04 Búsquedas**: wizard crear → Kanban 6 etapas → drag & drop → match engine retorna 10 propiedades.
  - **M05 Captaciones**: crear con min dirección+tipo+precio → 4 etapas workflow → ACM generado.
  - **M06 Tareas**: crear con fecha absoluta + prioridad → aparece en calendario → done.
  - **M07 Operaciones**: wizard 6 pasos → IVA auto → estado Propuesta → disclaimer DMX no responsable mostrado.
  - **M08 Marketing**: generar PostCuadrado → preview → compartir → tracking lead capturado.
  - **M09 Estadísticas**: ver 11 KPIs semáforo → drawer pedagogía.
  - **M10-M15 Dev** equivalents: subir PDF → AI extract tabla → publish → inventory.
  - **M16-M17 Admin**: system health widget → audit log filter → revenue dashboard.
  - **M18-M20 Comprador + Público**: marketplace search → comparar proyectos → agendar visita.
- `[27.B.2.2]` Cada spec usa `test.describe.configure({ mode: 'serial' })` cuando depende de orden (ej: create then read).
- `[27.B.2.3]` Data cleanup entre tests via afterEach (delete seeded entities).
- `[27.B.2.4]` Accessibility: `@axe-core/playwright` en cada E2E → 0 critical violations.

**Criterio de done del módulo:**
- [ ] 20+ E2E specs activos.
- [ ] Todos verdes en 3 browsers.

#### MÓDULO 27.B.3 — Visual regression

**Pasos:**
- `[27.B.3.1]` Playwright `toHaveScreenshot({ threshold: 0.01 })` por page clave.
- `[27.B.3.2]` Baseline guardado en git (LFS si >1MB).
- `[27.B.3.3]` Pages críticas: Landing, Pricing, Dashboard, Módulo each.
- `[27.B.3.4]` Update workflow: `npm run test:visual -- --update-snapshots` manual review antes commit.
- `[27.B.3.5]` CI: si baseline diff >1% → fail + diff image posteado en PR comment.

**Criterio de done del módulo:**
- [ ] 15+ snapshots baseline.
- [ ] Test fails al cambio CSS inesperado.

### BLOQUE 27.C — msw mocking

#### MÓDULO 27.C.1 — Handlers externos

**Pasos:**
- `[27.C.1.1]` `tests/msw/handlers.ts` con handlers para:
  - **Anthropic**: `/v1/messages` → respuesta mock realista (7 tipos según use case: briefing, dossier, objection killer, etc.).
  - **OpenAI**: `/v1/embeddings`, `/v1/chat/completions`.
  - **Stripe**: `/v1/checkout/sessions`, `/v1/customers`, `/v1/subscriptions`, `/v1/invoices`. Webhooks: fake signature válido test.
  - **Mifiel**: `/documents`, `/signers`.
  - **Mapbox**: `/geocoding/v5`, `/styles/v1`, `/directions/v5`.
  - **Banxico**: `/series` FX rates.
  - **INEGI**: `/indicadores`.
  - **Meta WA Graph**: `/messages`, webhook events.
  - **Resend**: `/emails`.
  - **Twilio**: `/Messages.json`.
  - **PostHog**: `/capture` (silenciar).
- `[27.C.1.2]` Snapshots de responses realistas. Incluir error cases.
- `[27.C.1.3]` `tests/msw/scenarios/` con handlers alternativos (ej: `anthropic-rate-limited.ts`, `stripe-card-declined.ts`) para tests específicos.

**Criterio de done del módulo:**
- [ ] Test con `server.use(anthropicRateLimited)` → procedure maneja 429 correctamente.

### BLOQUE 27.D — Supabase RLS tests (Docker)

#### MÓDULO 27.D.1 — Docker compose Supabase local

**Pasos:**
- `[27.D.1.1]` `supabase/docker-compose.yml` (o `supabase start` CLI equivalente) boot local:
  - Postgres 16 + pgvector + pgsodium + pg_partman.
  - Supabase Auth + Realtime + Storage + PostgREST.
  - GoTrue, Kong.
- `[27.D.1.2]` `supabase db reset` aplica migrations desde `supabase/migrations/`.
- `[27.D.1.3]` Seed `supabase/seed.sql` con users per role (admin, superadmin, asesor, mb, developer, comprador) + datos minimalistas.
- `[27.D.1.4]` Script `npm run supabase:test` boot + reset + seed.

**Criterio de done del módulo:**
- [ ] Local Supabase funcional en <30s boot.

#### MÓDULO 27.D.2 — RLS test suite

**Pasos:**
- `[27.D.2.1]` Framework `pg-tap` o custom Vitest SQL helper que ejecuta SET ROLE + SET LOCAL auth.uid + queries.
- `[27.D.2.2]` Tests por tabla (110+):
  ```ts
  describe('profiles RLS', () => {
    it('asesor cannot SELECT other asesor PII', async () => {
      await setAuthUser(asesorA_id);
      const { data } = await supabase.from('profiles').select('email').eq('id', asesorB_id);
      expect(data?.[0]?.email).toBeUndefined(); // RLS oculta
    });
    it('asesor cannot UPDATE role', async () => {
      await setAuthUser(asesorA_id);
      const { error } = await supabase.from('profiles').update({ rol: 'superadmin' }).eq('id', asesorA_id);
      expect(error).toBeDefined(); // SEC-02 prevent_role_escalation trigger
    });
  });
  ```
- `[27.D.2.3]` Tests por policy (207+): SELECT/INSERT/UPDATE/DELETE permitidos o negados según rol + ownership.
- `[27.D.2.4]` Particular emphasis SEC-01..23 (auditoría): cada hallazgo con test que vefica fix.
- `[27.D.2.5]` SECURITY DEFINER functions: test que invoca como user X verifica auth.uid() enforcement (SEC-04).

**Criterio de done del módulo:**
- [ ] 300+ RLS test cases green.
- [ ] 23 SEC hallazgos verificados con tests específicos.

### BLOQUE 27.E — GitHub Actions CI

#### MÓDULO 27.E.1 — Workflow principal

**Pasos:**
- `[27.E.1.1]` `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on: [pull_request, push]
  jobs:
    lint:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v1 # or setup-node@v4
        - run: npm ci
        - run: npx biome check .
        - run: npx tsc --noEmit
    
    unit:
      needs: lint
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: npm ci
        - run: npm run test:coverage
        - uses: codecov/codecov-action@v4
    
    rls:
      needs: lint
      runs-on: ubuntu-latest
      services:
        supabase:
          image: supabase/postgres:15.x
          env: { POSTGRES_PASSWORD: postgres }
      steps:
        - uses: actions/checkout@v4
        - run: supabase db reset
        - run: npm run test:rls
    
    build:
      needs: [unit, rls]
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: npm ci
        - run: npm run build
    
    e2e:
      needs: build
      runs-on: ubuntu-latest
      timeout-minutes: 15
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
        - run: npm ci
        - run: npx playwright install --with-deps
        - run: npm run test:e2e
        - uses: actions/upload-artifact@v4
          if: failure()
          with: { name: playwright-report, path: playwright-report/ }
  ```
- `[27.E.1.2]` Branch protection main: require lint + unit + rls + build + e2e + Lighthouse CI + 1 approval.
- `[27.E.1.3]` Required status checks documentados `.github/CODEOWNERS`.

**Criterio de done del módulo:**
- [ ] PR debe pasar todas checks para merge.

#### MÓDULO 27.E.2 — Workflow deploy preview

**Pasos:**
- `[27.E.2.1]` Vercel automatic preview deployment por PR.
- `[27.E.2.2]` `.github/workflows/preview-tests.yml` corre Playwright contra URL preview.
- `[27.E.2.3]` Comment bot con link preview + Lighthouse report.

**Criterio de done del módulo:**
- [ ] PR review incluye URL preview + smoke tests results.

### BLOQUE 27.F — Load tests k6

#### MÓDULO 27.F.1 — Scenarios API externa

**Pasos:**
- `[27.F.1.1]` Instalar `k6` local + GH Actions step.
- `[27.F.1.2]` Scripts `tests/load/`:
  - `api-livability.js`: 5K req/min sobre `/api/v1/scores/livability` con random lat/lon MX.
  - `api-estimate.js`: 1K req/min sobre `/api/v1/estimate`.
  - `api-bulk.js`: 100 bulk requests 1000 points each.
- `[27.F.1.3]` Thresholds:
  ```js
  export const options = {
    scenarios: { constant: { executor: 'constant-arrival-rate', rate: 83, timeUnit: '1s', duration: '5m', preAllocatedVUs: 100 } },
    thresholds: { http_req_duration: ['p(99)<1000', 'p(95)<500'], http_req_failed: ['rate<0.01'] }
  };
  ```
- `[27.F.1.4]` Ejecutar weekly contra staging (GH Actions schedule) — alert si regression.

**Criterio de done del módulo:**
- [ ] Test confirms p99 <1s @ 5K req/min.

### BLOQUE 27.G — Snapshot tests UI AI-generated

#### MÓDULO 27.G.1 — Generative UI review

**Pasos:**
- `[27.G.1.1]` Para componentes AI-generated (generative components FASE 03), snapshot tests con inputs fijos + outputs capturados.
- `[27.G.1.2]` `__snapshots__/` en git, review manual antes update.
- `[27.G.1.3]` Componentes: `DossierAI`, `ObjectionKiller`, `MorningBriefing`, `DiscoverWeekly`, `WrappedPersonal`.

**Criterio de done del módulo:**
- [ ] Snapshots estables; update requiere approval humano.

### BLOQUE 27.H — Accessibility testing

#### MÓDULO 27.H.1 — axe + Playwright

**Pasos:**
- `[27.H.1.1]` `@axe-core/playwright` runs en E2E critical pages.
- `[27.H.1.2]` Assertions: 0 critical, 0 serious violations.
- `[27.H.1.3]` Storybook (si se usa) + `@storybook/test-runner` con axe addon.

**Criterio de done del módulo:**
- [ ] A11y automation green para landing + dashboard + 5 forms críticos.

### BLOQUE 27.I — Test data seeds

#### MÓDULO 27.I.1 — Seed factories

**Pasos:**
- `[27.I.1.1]` `tests/factories/` con faker-js factories:
  - `profileFactory(overrides)`, `contactoFactory`, `proyectoFactory`, `operacionFactory`, `zoneScoreFactory`, etc.
- `[27.I.1.2]` Locale es-MX: nombres, phones +52, addresses CDMX.
- `[27.I.1.3]` Deterministic: seed faker con `faker.seed(42)` en setup.

**Criterio de done del módulo:**
- [ ] Factories producen data válida contra constraint checks BD.

### BLOQUE 27.J — Flaky test detection

#### MÓDULO 27.J.1 — Retry + quarantine

**Pasos:**
- `[27.J.1.1]` Playwright `retries: 2` en CI.
- `[27.J.1.2]` Reporter que detecta tests que pasan en retry → marcar `flaky`.
- `[27.J.1.3]` Quarantine list `tests/flaky.txt` skip temp + issue GitHub para fix.

**Criterio de done del módulo:**
- [ ] Zero flaky tests en main.

## Criterio de done de la FASE

- [ ] Vitest config + setup + MSW integration + fake timers.
- [ ] Coverage 70%+ en `shared/lib/*`, 90%+ en calculators IE.
- [ ] 114+ calculator tests con golden fixtures + edge cases.
- [ ] Multi-country formatter tests 5 países.
- [ ] tRPC procedures unit tests 30+.
- [ ] Playwright config 5 devices × 3 browsers.
- [ ] E2E happy paths 20 módulos M01-M20 + auth + ⌘K.
- [ ] Visual regression 15+ baselines.
- [ ] Accessibility @axe 0 critical/serious en paths críticos.
- [ ] msw handlers 10+ external APIs con scenarios.
- [ ] Docker Supabase local + RLS test suite 300+ cases + 23 SEC hallazgos verificados.
- [ ] GH Actions CI pipeline completo (lint → unit → rls → build → e2e + Lighthouse).
- [ ] Branch protection main enforcing checks + CODEOWNERS.
- [ ] Preview deployments per PR + smoke tests auto.
- [ ] k6 load tests API externa p99 <1s @ 5K req/min.
- [ ] Snapshot tests AI-generated UI con manual approval flow.
- [ ] Factories + seed determinístico.
- [ ] Flaky detection + quarantine.
- [ ] Tag git `fase-27-complete`.

## Próxima fase

FASE 28 — Launch Soft (pre-launch checklist + onboarding + rollout gradual + feedback loop).

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
