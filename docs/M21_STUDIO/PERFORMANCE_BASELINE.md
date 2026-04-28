# DMX Studio — Performance Baseline

**Sprint 10 · F14.F.11 · Fecha 2026-04-27**

> Baseline de performance para DMX Studio (M21). Lighthouse scores **sintéticos** H1
> (founder defer real Lighthouse run a H2). Activación real vía
> `L-NEW-STUDIO-LIGHTHOUSE-BASELINE-ACTIVATE` en H2 cuando Vercel deploy
> producción esté estable + 50+ asesores piloto generando tráfico real.

## Estado canon (H1 vs H2)

| Aspecto | Estado H1 | Plan H2 |
|---|---|---|
| Lighthouse scores | Sintéticos (mock) | Real run vía Vercel deploy + lighthouse-ci |
| Cost projections | **Real** (pure function canon prices) | Real + telemetry comparison |
| Break-even calc | **Real** (pure function) | Real + Stripe MRR live |
| Stress test | Mocked 100 concurrent jobs | Carga real con sandbox quota |

## Routes Studio cubiertas

| Route | Tipo | Render strategy | Notas |
|---|---|---|---|
| `/studio` | Anon landing | SSR + cache 24h | Marketing page |
| `/studio-app/dashboard` | Authenticated | RSC + tRPC client hydration | Hot path post-auth |
| `/studio-app/library` | Authenticated | RSC + paginated query | Lista videos generados |
| `/studio-app/projects/new` | Authenticated | Client form + RSC shell | Wizard creación |

## Lighthouse scores baseline (sintéticos H1)

> Datos sintéticos. Tabla refleja **target H1** Next.js 16 + Turbopack production
> build con PPR + `cache components` activado. Activación real H2.

| Route | FCP (s) | LCP (s) | TBT (ms) | CLS | Score |
|---|---:|---:|---:|---:|---:|
| `/studio` | 1.2 | 1.8 | 120 | 0.02 | 92 |
| `/studio-app/dashboard` | 1.4 | 2.1 | 180 | 0.03 | 88 |
| `/studio-app/library` | 1.5 | 2.4 | 210 | 0.04 | 85 |
| `/studio-app/projects/new` | 1.3 | 2.0 | 150 | 0.02 | 90 |

**Targets H1:** FCP < 2s · LCP < 3s · TBT < 300ms · CLS < 0.1 · Score ≥ 80.

## Ámbito stress test

- 100 video generations simultáneas mockeadas (`api-jobs-stress.test.ts`).
- Verifica `cost-tracker.trackJob` no pierde inserts bajo concurrencia.
- Verifica shape `studio_api_jobs` INSERT preservado.
- Cost aggregate matches projection model: 100 videos × $2.475 base = $247.5 estimated.
- Mixed job types (kling/elevenlabs/deepgram) bajo concurrencia → 0 race conditions.

## STUB ADR-018 (4 señales)

1. STUB comment explícito en `lighthouse-baseline-mock.test.ts` + `PerformanceDashboard.tsx`.
2. Schema `LighthouseScoreSchema` requiere `synthetic: boolean` flag — runtime detectable.
3. UI flag visible: `<DisclosurePill tone="amber">Datos sintéticos · H2 real</DisclosurePill>` en card Lighthouse.
4. L-NEW pointer: `L-NEW-STUDIO-LIGHTHOUSE-BASELINE-ACTIVATE` H2.

## Activación H2 (checklist)

- [ ] Vercel deploy producción estable (>30 días sin downtime mayor)
- [ ] 50+ asesores piloto generando tráfico real
- [ ] `lighthouse-ci` GitHub Action configurada + secret `LHCI_GITHUB_APP_TOKEN`
- [ ] Workflow corre Lighthouse contra preview deploys + reporta en PRs
- [ ] Reemplazar `MOCK_LIGHTHOUSE_BASELINE` constante con import de baseline real
- [ ] Update `synthetic: false` en filas y test debe seguir pasando
- [ ] Quitar `<DisclosurePill tone="amber">` de PerformanceDashboard (cambiar a `tone="indigo">Real`)

## Archivos relacionados

- `features/dmx-studio/lib/cost-tracking/projections.ts` — cost calculator (real H1)
- `features/dmx-studio/lib/cost-tracking/break-even.ts` — break-even calculator (real H1)
- `features/dmx-studio/tests/performance/lighthouse-baseline-mock.test.ts` — schema test (mock H1)
- `features/dmx-studio/tests/performance/projections.test.ts` — projections + break-even tests
- `features/dmx-studio/tests/performance/api-jobs-stress.test.ts` — stress test 100 concurrent
- `features/dmx-studio/components/admin/PerformanceDashboard.tsx` — admin-only dashboard
- `docs/M21_STUDIO/UNIT_ECONOMICS.md` — unit economics + margen analysis
