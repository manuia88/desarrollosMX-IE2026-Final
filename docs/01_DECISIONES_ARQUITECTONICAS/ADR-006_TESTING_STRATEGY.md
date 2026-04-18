# ADR-006 — Estrategia de testing: Vitest + Playwright + msw + Supabase test utils

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

El repo viejo (`desarrollosmx-v8final`) no tiene una estrategia de testing sistemática. Existen tests dispersos (Jest en algunos archivos, RTL esporádico), sin coverage tracking, sin CI gate por tests, sin tests e2e, sin pruebas de RLS policies. La auditoría SEC-01..23 lista 23 hallazgos de seguridad que un testing estricto hubiera detectado antes.

El rewrite tiene la oportunidad de establecer testing nativo desde FASE 00 con las siguientes restricciones y prioridades:

- **Turbopack** es el bundler por default en Next.js 16. Vite-compat para test runners es mandatoria.
- **tRPC + Zod + Supabase types** dan type safety alta; los tests deben enfocarse en lógica de negocio y flujos E2E, no en "typeguards" triviales.
- **RLS policies** son críticas (ADR-009). Sin tests de RLS, se reproducen los SEC-01..04. Necesitamos test utils que ejecuten contra `anon`, `authenticated` y `service_role` con JWTs diferentes.
- **AI-native** (ADR-002) implica lógica con LLMs no determinista. Tests de prompts requieren golden tests de estructura Zod + evaluaciones offline.
- **Multi-country** (ADR-003) multiplica casos de prueba: cada función crítica (comisión, FX, parseo fiscal) se testea al menos MX + uno LATAM.
- **Prioridad mobile PWA**: algunos e2e deben ejecutarse en viewport móvil.
- **Presupuesto H1**: no más de ~20% del tiempo de desarrollo en tests. Objetivo pragmático, no 100% TDD.

Frameworks candidatos y sus fit con Next.js 16 + Turbopack + Supabase:

- **Vitest**: Vite-native, extremadamente rápido con HMR, fit nativo con Turbopack, syntax Jest-compatible, parallel execution.
- **Jest + next/jest**: maduro pero más lento, menor integración con Turbopack, transform chain más pesado.
- **Playwright**: estándar 2026 de e2e, multi-browser (Chromium, Firefox, WebKit), soporte mobile viewports, auto-wait, test isolation.
- **Cypress**: menor soporte WebKit, más lento en CI, ecosistema fragmentado.
- **msw (Mock Service Worker)**: intercepta HTTP a nivel de service worker / fetch, compatible con tRPC, funciona en unit + e2e.
- **Supabase testing**: Supabase CLI expone `supabase test db` + función `begin/rollback` en cada test con schema fixtures.

## Decision

Se adopta **Vitest + Playwright + msw + Supabase test utils** con la siguiente distribución de responsabilidades:

### D1. Vitest para unit + integration tests

- **Scope**: toda lógica pura, hooks, tRPC procedures, calculators del IE, schemas Zod, utils de formateo, adapters legal/fiscal, cascade logic.
- **Target de coverage**: **70% en `shared/lib/`** (core), **60% en `features/<X>/lib/` + `features/<X>/routes/`** (feature code), **40% en componentes UI** (tests "smoke" + interacción crítica).
- **Ubicación**: co-located `features/<X>/tests/*.test.ts` y `shared/lib/**/*.test.ts`.
- **Parallel**: `vitest --pool=threads` para ejecución paralela.
- **Config**: `vitest.config.ts` con alias `@/` + setup para `@testing-library/react` + jsdom environment por default, node environment para lógica server-side.

### D2. Playwright para e2e

- **Scope**: happy paths críticos por módulo M01-M20 (1 test e2e por módulo como mínimo), flows cross-module (crear contacto → crear búsqueda → matching → visita → operación), flow completo Dev (subir PDF → document-intel → publicar proyecto → marketplace visible).
- **Fixtures**: cuentas de prueba `asesor_test`, `dev_test`, `admin_test`, `comprador_test` sembradas en `supabase/seed.sql` con data deterministic.
- **Browsers**: Chromium como default H1; Firefox + WebKit selectivos en smoke tests de launch (FASE 28).
- **Mobile**: viewport `iPhone 14 Pro` y `Pixel 7` en tests de PWA (dashboard asesor mobile, marketplace comprador mobile).
- **Ubicación**: `/tests/e2e/*.spec.ts`, fixtures en `/tests/fixtures/`.
- **CI**: GitHub Actions con Playwright retry = 2, screenshots on failure, traces on first retry.

### D3. msw para mocking HTTP

- **Scope**: interceptar calls a APIs externas en unit/integration tests:
  - tRPC procedures desde componentes client-side (alternativa a `trpc-msw`).
  - APIs externas en calculators IE: Banxico SieAPI, INEGI, Open Exchange Rates, Mapbox Traffic, AirDNA.
  - Anthropic/OpenAI en tests de Copilot (retornar fixtures deterministic).
  - Stripe, MercadoPago, Mifiel webhooks en flows legal/pagos.
- **Handlers**: `tests/msw/handlers/` organizados por proveedor externo.

### D4. Supabase test utils para RLS testing

- **Framework**: `supabase test db` + tests escritos en pg_tap o JS con `@supabase/supabase-js` apuntando a instancia local `supabase start`.
- **Patrón de test por policy**:
  ```typescript
  describe('RLS: profiles_select', () => {
    it('anon cannot read PII columns', async () => {
      const anon = getClient('anon')
      const { data, error } = await anon.from('profiles').select('email, rfc').limit(1)
      expect(data).toBeNull()  // o filtrado a null
      // o: expect(error.code).toBe('PGRST301')
    })

    it('authenticated asesor can read only own full profile', async () => {
      const asesorA = getClient('authenticated', { sub: 'asesor-a-uuid' })
      const { data } = await asesorA.from('profiles').select('*').eq('id', 'asesor-a-uuid').single()
      expect(data?.email).toBeDefined()
    })

    it('authenticated asesor cannot read another asesor PII', async () => { ... })

    it('superadmin can read all profiles', async () => { ... })
  })
  ```
- **Por cada tabla con RLS**: mínimo 4 test cases (anon, authenticated owner, authenticated non-owner, superadmin).
- **Por cada SECURITY DEFINER function**: test que valida que `IF p_id != auth.uid() AND NOT is_superadmin() THEN RAISE` funciona.
- **Ubicación**: `supabase/tests/*.test.ts` + setup que aplica migrations en instancia local.

### D5. Golden tests para AI outputs

- **Estructura Zod esperada**: cada prompt que devuelve JSON tiene un Zod schema. El test valida `parse()` sobre la respuesta IA.
- **Evaluación offline**: dataset de pares (input, expected_facets) en `features/ia-generativa/tests/golden/`. Evaluador compara respuesta real contra expected_facets (contains, absent, numeric_range).
- **No snapshot tests de texto completo** (son frágiles con modelos generativos). Sí snapshots en componentes generativos estables (TableGenerated, ChartGenerated) donde la estructura React es determinista.

### D6. Tests obligatorios por feature nueva

- **Toda PR que agrega un feature** debe incluir:
  - Al menos 1 unit test por procedure tRPC nueva.
  - Al menos 1 test e2e del happy path si el feature toca UI.
  - Test RLS si el feature añade tabla o policy nueva.
- **CI gate**: PRs con cobertura decremental son bloqueadas (codecov threshold).

### D7. Mocking policies

- **AI calls en Copilot + Document Intel**: siempre mock en CI (msw), opcional live en dev.
- **Supabase queries**: live contra instancia local `supabase start` (no mock), asegura RLS real.
- **Stripe/MercadoPago**: siempre mock (msw + Stripe test keys en staging).
- **Email (Resend), SMS (Twilio), WhatsApp**: mock en CI, smoke test live en staging pre-launch.

## Rationale

Se eligió este stack porque:

1. **Vitest nativo Vite/Turbopack**: integración cero-fricción con Next.js 16 + Turbopack. Performance significativamente superior a Jest en proyectos grandes (cache incremental, paralelismo mejor).
2. **Playwright multi-platform multi-browser** cubre las necesidades PWA (mobile viewports) y desktop. Auto-wait elimina flakiness común en Cypress.
3. **msw + tRPC** permite tests de componentes client-side sin arrancar servidor completo. Patrón maduro en ecosistema TS.
4. **Supabase test utils contra instancia local** valida RLS con schema real (no mocked Postgres). Es la única forma confiable de prevenir SEC-01..04 del repo viejo.
5. **Golden tests sobre estructura Zod** alinea con la decisión de Zod como SSoT (ADR-005 §D5). Un LLM puede generar texto distinto, pero la estructura JSON debe ser predecible.
6. **Coverage targets pragmáticos** (70% core, no 100%) balancea velocidad vs. confianza. El founder prioriza shipping.

## Consequences

### Positivas
- **CI rápido**: Vitest parallel + Playwright retry inteligente mantienen el pipeline total en < 10 min para PRs típicas.
- **RLS cubierto desde Fase 01**: las 200+ policies tienen tests automáticos, cerrando la superficie de SEC-01..04 antes de que se reintroduzca.
- **Regression safety en IE calculators**: el registry de 118 scores se testea con datos sembrados; errores como el B02 Margin Pressure del repo viejo se detectan antes del release.
- **E2E cross-module confirma flujos de negocio**: subir PDF → publicar proyecto → matching → operación completo, probado en CI.
- **msw permite tests offline**: contribuidores pueden desarrollar sin API keys reales.
- **Playwright trace viewer** acelera debugging de flaky tests.

### Negativas / tradeoffs
- **Costo inicial de setup**: Fase 00 debe configurar Vitest + Playwright + Supabase test utils + msw. Tiempo estimado ~1-2 días de agente dedicado (Fase 27 completa la batería).
- **Instancia Supabase local obligatoria para RLS tests**: contribuidores deben correr `supabase start` (requiere Docker). Documentado en `docs/05_OPERACIONAL/05.4_ONBOARDING_DEV.md`.
- **Flakiness de e2e**: aún con Playwright, tests que dependen de tiempos reales (notificaciones WhatsApp, webhooks Stripe) son flaky. Mitigación: mocking agresivo + feature flags para desactivar ruido en e2e.
- **Coverage metrics pueden engañar**: 70% coverage no garantiza calidad (se puede cubrir lo fácil y dejar edge cases). Mitigación: código de RLS y calculators requiere test cases explícitos por branch además de coverage general.
- **Mantenimiento de fixtures**: fixtures Supabase se desactualizan cuando cambia el schema. Mitigación: generar fixtures programáticamente con factories (`tests/fixtures/factories.ts`) que usan `faker-js` + types generados.
- **Tests AI golden tests pueden fallar con model upgrade**: al actualizar Claude Sonnet 4 → 4.5, estructuras pueden cambiar sutilmente. Mitigación: regenerar golden baselines con review humano antes de merge del upgrade.
- **Mobile e2e requiere devices emulados**: no reemplaza testing manual real device. Mitigación: BrowserStack/Sauce Labs en FASE 25 performance-mobile.

### Neutrales
- **Vitest API es Jest-compatible**: migración desde Jest es trivial. Equipo familiarizado con Jest no necesita curva.
- **Playwright y Cypress son ambos maduros**: la elección de Playwright es preferencia por multi-browser. Cypress seguiría siendo válido.
- **Snapshot tests selectivos** (no como default): reducen ruido en refactors UI pero se usan en componentes con output determinista.

## Alternatives considered

### Alt 1: Jest + React Testing Library + Cypress
Stack clásico 2020-2023. **Descartada** porque:
- Jest transform chain significativamente más lento con Next.js 16 + Turbopack que Vitest.
- Cypress no soporta WebKit nativamente; no ideal para launch i18n iOS PWA.
- Jest config con `next/jest` tiene más edge cases reportados.

### Alt 2: Solo Playwright (unit + e2e con Playwright Component Testing)
Playwright ofrece Component Testing (beta). **Descartada** porque:
- Component Testing de Playwright todavía es beta en 2026 (inestable).
- Unit tests de lógica pura son 10x más rápidos en Vitest que en un runner de browser.
- Perder `@testing-library/react` es un costo alto.

### Alt 3: Vitest para unit, sin e2e automatizado
Manual QA + smoke tests manuales antes de release. **Descartada** porque:
- El producto tiene 20 módulos y 5 portales; QA manual no escala.
- Flujos cross-module (Dev sube PDF → matching → operación) son propensos a regresión silenciosa.
- Contradicción con el principio de "documentación como spec viva" (spec debe ser verificable).

### Alt 4: Testing via contract tests (Pact) + snapshot puro
Contract testing entre servicios + snapshots de UI. **Descartada** porque:
- El producto es monolito Next.js (ADR-001); no hay contratos entre servicios que necesiten Pact.
- Snapshot puro sin interacción cubre pobremente happy paths.

## References
- `../BRIEFING_PARA_REWRITE.md` §4 (stack testing), §5 (reglas)
- `../02_PLAN_MAESTRO/FASE_00_BOOTSTRAP.md` (setup Vitest + Playwright)
- `../02_PLAN_MAESTRO/FASE_27_TESTING_QA.md` (batería completa e2e)
- `../02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md` (RLS tests obligatorios)
- ADR-009 Security Model (RLS testing requirements)
- Vitest docs: https://vitest.dev
- Playwright docs: https://playwright.dev
- msw docs: https://mswjs.io

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
