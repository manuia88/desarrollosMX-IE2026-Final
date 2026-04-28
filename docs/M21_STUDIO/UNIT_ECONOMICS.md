# DMX Studio — Unit Economics

**Sprint 10 · F14.F.11 · Fecha 2026-04-27**

> Cost breakdown + margen analysis per plan + break-even thresholds. Source of
> truth: `features/dmx-studio/lib/cost-tracking/projections.ts` (canon prices
> hardcoded BIBLIA v4) + `break-even.ts`.

## Pricing canon (proveedores APIs externas)

| Provider | Unidad | Costo USD |
|---|---|---:|
| Replicate Kling | video render | $2.25 |
| ElevenLabs TTS Flash | narración | $0.025 |
| Anthropic Claude Director | proyecto | $0.10 |
| Anthropic Vision classify | foto | $0.003 |
| Deepgram Nova-3 | transcripción 5min | $0.04 |
| HeyGen avatar | clip | $0.20 |
| fal.ai Seedance | clip | $0.80 |
| Pedra virtual staging | foto | $0.25 |
| Vercel Sandbox FFmpeg | render | $0.10 |

**Per-video base cost** (Kling + TTS + Director + Sandbox FFmpeg) = **$2.475**.

## Costos fijos infra Studio

| Concepto | USD/mes | Notas |
|---|---:|---|
| Vercel Pro (atribución Studio) | $5 | Compartido DMX, ~25% atribuido |
| Supabase Pro (atribución Studio) | $10 | Compartido DMX, ~40% atribuido |
| Sentry telemetry | $0 | Free tier H1 |
| Domain + DNS | $0 | Compartido DMX |
| **Total fixed infra (per plan calc)** | **$15** | Usado en `projectMonthlyCosts` |
| **Operational fixed (break-even calc)** | **$100** | Tooling externo + capacidad ops H1 |

## Cost projections — 9 combinaciones (3 planes × 3 perfiles uso)

### Pro — $47/mes · 5 videos/mes (limit canon)

| Perfil | Videos | $/video | Variable | Fijo | Total | Margen $ | Margen % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Light | 5 | $2.475 | $12.38 | $15 | $27.38 | **+$19.63** | **+41.8%** |
| Typical | 20 | $2.475 | $49.50 | $15 | $64.50 | -$17.50 | -37.2% |
| Heavy | 50 | $2.475 | $123.75 | $15 | $138.75 | -$91.75 | -195.2% |

**Conclusión Pro:** rentable solo en `light` (≤5 videos canon limit). Si asesor
excede limit (vía bursting o agency upsell path), plan se vuelve unprofitable.

### Foto — $67/mes · 50 videos/mes (incluye photo pack 10 photos)

| Perfil | Videos | $/video | Variable | Fijo | Total | Margen $ | Margen % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Light | 5 | $2.505 | $12.52 | $15 | $27.52 | **+$39.48** | **+58.9%** |
| Typical | 20 | $2.505 | $50.10 | $15 | $65.10 | **+$1.90** | +2.8% |
| Heavy | 50 | $2.505 | $125.25 | $15 | $140.25 | -$73.25 | -109.3% |

**Conclusión Foto:** rentable hasta `typical` (~20 videos). En `heavy` (50 videos
quota completa) plan opera con pérdida — quota canon **NO debería usarse al 100%**
en steady state. Recomendación H2: ajustar limit canon a 25 videos/mes o cambiar
pricing a $97 para alinear con consumo real.

### Agency — $97/mes · 20 videos/mes (incluye virtual staging + voice clone)

| Perfil | Videos | $/video | Variable | Fijo | Total | Margen $ | Margen % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Light | 5 | $2.750 | $13.75 | $15 | $28.75 | **+$68.25** | **+70.4%** |
| Typical | 20 | $2.750 | $55.00 | $15 | $70.00 | **+$27.00** | **+27.8%** |
| Heavy | 50 | $2.750 | $137.50 | $15 | $152.50 | -$55.50 | -57.2% |

**Conclusión Agency:** plan más rentable y resiliente. `typical` (límite canon)
deja **+$27 margen/mes/usuario** = sustainable unit economics. `heavy` solo
ocurriría si agency excede quota — gating Stripe canon previene esto.

## Break-even thresholds

> Asumiendo `typical` usage profile (20 videos/mes) + operational fixed $100/mes.
> Contribution margin = (plan price − variable cost por usuario).

| Plan | Costo/usuario | Margen contribución | Margen % | Usuarios break-even | MRR target | Estado |
|---|---:|---:|---:|---:|---:|---|
| Pro | $49.50 | -$2.50 | -5.3% | **No alcanzable** | — | NEGATIVE |
| Foto | $50.10 | $16.90 | 25.2% | **6 usuarios** | $402 | Profitable |
| Agency | $55.00 | $42.00 | 43.3% | **3 usuarios** | $291 | Profitable |

### Hallazgos clave

1. **Pro plan unprofitable en typical usage**: 20 videos × $2.475 ($49.50) > $47 plan price.
   - Mitigación H1: canon limit `videosPerMonth: 5` previene este escenario en Stripe.
   - Riesgo H2: si feature flag `pro_burst_to_10` se activa sin re-pricing, plan opera con pérdida.
   - L-NEW: `L-NEW-STUDIO-PRO-PLAN-REPRICE-OR-LIMIT-ENFORCE` H2.

2. **Agency es el caballo de batalla rentable**: 3 usuarios cubren ops fixed.
   Sweet spot growth = focusar GTM en agencias inmobiliarias multi-asesor.

3. **Foto plan saludable solo si quota NO se exhausta**: usuarios power-user (50 videos)
   son drag negativo. Solución H2: implementar throttling progresivo + upsell agency at
   30+ videos/mes.

4. **MRR target 2026-Q3 (escenario blended)**: 50% Foto + 50% Agency × 6 usuarios × precios
   blended ~$82 = **~$500 MRR** cubre operational fixed + buffer 5×.

## Cost tracking implementation (real H1)

- `studio_api_jobs` table: cada llamada IA registra `estimated_cost_usd` + `actual_cost_usd`.
- `studio_usage_logs` aggregate per pipeline run (period_month indexed).
- Stress test (`api-jobs-stress.test.ts`): 100 concurrent inserts → 0 race conditions.
- Cost-tracker pure functions (`projections.ts`, `break-even.ts`): zero side effects, deterministic.

## Activación H2 (telemetry-based reconciliation)

- [ ] Cron `cost-reconciliation` lee `studio_api_jobs.actual_cost_usd` mensual y compara con projections.
- [ ] Variance > 10% genera alert Sentry + ticket review pricing canon.
- [ ] Stripe MRR live integration para validar `mrrTargetUsd` real vs target.
- [ ] Per-plan dashboards admin con drill-down por usuario top consumers.

## Archivos relacionados

- `features/dmx-studio/lib/cost-tracking/projections.ts`
- `features/dmx-studio/lib/cost-tracking/break-even.ts`
- `features/dmx-studio/lib/stripe-products.ts` (plans canon ADR-054)
- `features/dmx-studio/lib/pipeline/cost-tracker.ts` (real cost logging)
- `features/dmx-studio/components/admin/PerformanceDashboard.tsx`
- `docs/M21_STUDIO/PERFORMANCE_BASELINE.md`
