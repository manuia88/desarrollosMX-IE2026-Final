# FASE 24 — Observabilidad + SRE (Sentry + PostHog + Vercel + Supabase logs + SLO/SLI + DR + runbooks)

> **Duración estimada:** 3 sesiones Claude Code (~12 horas con agentes paralelos)
> **Dependencias:** FASE 00 (bootstrap env vars), FASE 02 (auth — user_id para context), FASE 06 (seguridad — PII masking rules), FASE 22 (notifs — alerts enviados como notifs admin), FASE 23 (billing — cost tracking por user).
> **Bloqueantes externos:**
> - **Cuenta Sentry** (plan Team mínimo para source maps + session replay).
> - **Cuenta PostHog** (Cloud EU para GDPR-friendlier o US según Manu decida; self-host opcional H2).
> - **Cuenta Vercel** con logs + analytics activados.
> - **Instatus.com account** o built-in status page.
> - **Slack workspace** para alerts webhook.
> - Env vars: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `POSTHOG_KEY`, `POSTHOG_HOST`, `VERCEL_ANALYTICS_ID`, `INSTATUS_API_KEY`, `SLACK_ALERTS_WEBHOOK`.
> **Resultado esperado:** Observabilidad integral. Sentry con source maps + releases + transaction tracing. PostHog product analytics + feature flags + session replay con PII masked. Structured logging con request-id traceable end-to-end. Endpoint `/api/health` con deps check + SystemHealthWidget admin. SLOs + SLIs trackeados con alerts. DR runbook + backups daily off-site. Status page pública. Cost tracking agregado por vendor. Tag `fase-24-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase es la "capa de telemetría, confiabilidad y resiliencia". No entrega features de usuario; habilita que DMX pueda operar en producción con claridad (qué pasa), diagnóstico (por qué pasó), recuperación (cómo resolverlo), y auditabilidad (cuánto cuesta).

Principios no negociables:
- **Zero PII en logs públicos** — mascaramos RFC, email, phone, dirección a patterns (`***@***.com`, `+52***4567`). Cumple ADR-002/007 y LFPDPPP (FASE 26).
- **Source of truth por layer**: Sentry=errores, PostHog=product events+replay, Vercel=infra, Supabase=DB logs, propio `audit_log`=seguridad.
- **Trace context**: request-id generado en middleware viaja en headers a Supabase (via `postgrest_request_id`), a Anthropic (`X-Request-Id`), a Stripe (`Stripe-Request-Id`), y vuelve en response headers.
- **Alertas accionables**: cada alert apunta a un runbook con pasos. Zero "ping genérico que nadie sabe qué hacer".
- **SLO público** — status page muestra uptime real; penaliza marketing fraude.
- **DR probado**: ejercicio trimestral restauración backup; RPO 1h, RTO 4h H1 → RPO 5min RTO 30min H2.

Cross-references:
- ADR-007 (observability stack — define autoridad).
- ADR-002 (PII masking session replay — obligatorio).
- ADR-009 (seguridad — audit log + access logs).
- FASE 05 (i18n — mensajes de error localizados user-facing, Sentry keys en inglés).
- FASE 22 (notifs — admins reciben alerts por WA/email).
- FASE 23 (billing — cost tracking usage API para revenue projection).
- Runbook 05.2 (Incident Response), 05.3 (DR), 05.6 (Data Retention).

## Bloques

### BLOQUE 24.A — Sentry setup

#### MÓDULO 24.A.1 — Install & config

**Pasos:**
- `[24.A.1.1]` Instalar `@sentry/nextjs`. Run `npx @sentry/wizard@latest -i nextjs`.
- `[24.A.1.2]` Config files generados: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`. Verificar.
- `[24.A.1.3]` `next.config.ts` wrap con `withSentryConfig({ silent: false, org: 'dmx', project: 'app', hideSourceMaps: true, widenClientFileUpload: true, transpileClientSDK: true })`.
- `[24.A.1.4]` DSN per environment (`SENTRY_DSN_DEV`, `SENTRY_DSN_PROD`).
- `[24.A.1.5]` Release tracking: `release: process.env.VERCEL_GIT_COMMIT_SHA`. Upload source maps en build con `SENTRY_AUTH_TOKEN`.

**Criterio de done del módulo:**
- [ ] Deploy preview dispara release en Sentry con source maps.
- [ ] Error en client visible con stack trace original (no minificado).

#### MÓDULO 24.A.2 — Transaction tracing & sampling

**Pasos:**
- `[24.A.2.1]` `tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0` (10% prod, 100% dev).
- `[24.A.2.2]` `tracesSampler` custom: 100% sampling en paths `/api/webhooks/*`, `/api/v1/estimate`; 5% en GET estáticos; resto 10%.
- `[24.A.2.3]` Custom spans para operaciones IE pesadas: `Sentry.startSpan({ name: 'calc_zone_scores', op: 'ie.calc' }, async () => { ... })`.
- `[24.A.2.4]` DB instrumentation via Supabase client hook: timing query + log slow queries (>500ms).

**Criterio de done del módulo:**
- [ ] Sentry Performance muestra traces completos con spans DB + external calls.

#### MÓDULO 24.A.3 — User context + PII scrubbing

**Pasos:**
- `[24.A.3.1]` Middleware `shared/lib/observability/sentry-context.ts` en tRPC context builder:
  ```ts
  Sentry.setUser({ id: user.id, role: user.role, country: user.country_code });
  Sentry.setTag('feature_plan', user.plan_id);
  ```
  NO enviar email/name/phone.
- `[24.A.3.2]` `beforeSend` hook: scan payload with regex (RFC, phone, email) → replace with `[REDACTED]`. Usar lista alcance de ADR-007 (emails, RFCs, phones, IPs clientes en prod).
- `[24.A.3.3]` `denyUrls` regex para errores de extensiones browser no-nuestros.
- `[24.A.3.4]` Ignore known noise: `ResizeObserver loop limit exceeded`, `Script error.` (cross-origin), `Network request failed` user offline.

**Criterio de done del módulo:**
- [ ] Error con PII en mensaje → Sentry muestra `[REDACTED]`.
- [ ] User context incluye id pero no email.

#### MÓDULO 24.A.4 — Integrations Sentry

**Pasos:**
- `[24.A.4.1]` Integration Vercel (auto-link commits ↔ deploys ↔ releases).
- `[24.A.4.2]` Integration Slack (alerts Sentry → channel `#sentry-dmx`).
- `[24.A.4.3]` Integration GitHub (crear issues desde Sentry errors críticos).
- `[24.A.4.4]` Integration PostHog (link session replay ↔ Sentry error).

**Criterio de done del módulo:**
- [ ] Error crítico → Slack alert en <60s + GitHub issue opcional.

### BLOQUE 24.B — PostHog setup

#### MÓDULO 24.B.1 — Install & config

**Pasos:**
- `[24.B.1.1]` Instalar `posthog-js` + `posthog-node`.
- `[24.B.1.2]` Client init en `app/providers.tsx`:
  ```ts
  posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, person_profiles: 'identified_only', capture_pageview: false /* manual */, capture_pageleave: true, session_recording: { maskAllInputs: true, maskTextSelector: '[data-sensitive]' } });
  ```
- `[24.B.1.3]` Identify al login: `posthog.identify(user.id, { role, plan, country_code, locale, created_at })`.
- `[24.B.1.4]` Logout: `posthog.reset()`.

**Criterio de done del módulo:**
- [ ] Events visible en PostHog UI después de sesión test.

#### MÓDULO 24.B.2 — Product analytics events

**Pasos:**
- `[24.B.2.1]` Event catalog en `shared/lib/observability/events.ts` — type-safe enum con ~80 eventos:
  - Auth: `user_signed_up`, `user_logged_in`, `mfa_enabled`.
  - CRM: `contact_created`, `search_created`, `busqueda_etapa_changed`, `task_completed`.
  - Deals: `operation_created`, `operation_stage_changed`, `operation_closed`.
  - Marketing: `landing_viewed`, `qr_scanned`, `asset_generated`.
  - AI: `ai_dossier_generated`, `ai_briefing_requested`, `copilot_query`.
  - IE: `score_viewed`, `zone_explored`, `ranking_clicked`.
  - Billing: `checkout_started`, `subscription_created`, `upgrade_modal_shown`.
  - API: `api_request`, `api_ratelimit_hit`.
- `[24.B.2.2]` Helper `track(event, properties)` wrapping posthog.capture + strip PII.
- `[24.B.2.3]` Server-side tracking via `posthog-node` en routers tRPC críticos.

**Criterio de done del módulo:**
- [ ] Dashboard PostHog AARRR activo con eventos llegando.

#### MÓDULO 24.B.3 — Feature flags

**Pasos:**
- `[24.B.3.1]` Flags gestionados en PostHog (no en BD) para toggle runtime sin deploy:
  - `new_onboarding_v2` (% rollout: 10→50→100)
  - `copilot_voice_enabled`
  - `ai_estimate_v2_enabled`
  - `marketplace_secondary_visible`
- `[24.B.3.2]` Hook `useFeatureFlag(key)` que consulta PostHog SDK. Fallback a Edge Config si PostHog down.
- `[24.B.3.3]` Server-side: `getServerFeatureFlag(key, userId)` para SSR.
- `[24.B.3.4]` A/B tests via PostHog Experiments (primary metric + variants).

**Criterio de done del módulo:**
- [ ] Toggle flag en PostHog → cambio visible en app <60s (CDN cache).

#### MÓDULO 24.B.4 — Session replay con PII masking

**Pasos:**
- `[24.B.4.1]` `session_recording.maskAllInputs: true` (obligatorio ADR-002).
- `[24.B.4.2]` `maskTextSelector: '[data-sensitive]'` — atribuir a: email, phone, RFC, CURP, card numbers, balances, comisión montos.
- `[24.B.4.3]` Componentes con data-sensitive: `<ContactCard>`, `<BillingInvoice>`, `<CommissionTile>`, `<IdentityDoc>`, `<BankInfo>`.
- `[24.B.4.4]` Sampling replay: 10% sessions normales + 100% sessions con error (link Sentry integration).
- `[24.B.4.5]` Retention 30 días (ADR-007 + política 05.6).

**Criterio de done del módulo:**
- [ ] Replay test muestra inputs censurados + textos marcados ocultos.

### BLOQUE 24.C — Structured logging (request-id traceable)

#### MÓDULO 24.C.1 — `shared/lib/log.ts`

**Pasos:**
- `[24.C.1.1]` Logger pino-based + JSON structured:
  ```ts
  export const log = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.rfc', '*.email', '*.phone'], censor: '[REDACTED]' },
    base: { service: 'dmx-app', env: process.env.VERCEL_ENV }
  });
  ```
- `[24.C.1.2]` Context propagation: `AsyncLocalStorage` para request-id + user-id + country.
- `[24.C.1.3]` Export wrapper: `logWithContext('info', 'msg', props)`.

**Criterio de done del módulo:**
- [ ] Vercel log viewer muestra JSON estructurado con `requestId`, `userId`, `country`.

#### MÓDULO 24.C.2 — Request-id propagation

**Pasos:**
- `[24.C.2.1]` Middleware Next: generar `X-Request-Id` si no existe (`nanoid`) + setear en ALS.
- `[24.C.2.2]` Response header incluye `X-Request-Id` para correlacionar client-side errors.
- `[24.C.2.3]` Supabase client wrapper inyecta header `X-Client-Info: dmx-app/{sha}-{requestId}`.
- `[24.C.2.4]` Stripe/Anthropic/Mifiel: pasar header `Idempotency-Key: {requestId}-{operation}` cuando aplique.
- `[24.C.2.5]` Sentry scope: `scope.setTag('request_id', requestId)` para link Sentry ↔ logs.

**Criterio de done del módulo:**
- [ ] Trace cross-system: request-id viaja de client → app → Supabase → external services.

### BLOQUE 24.D — Health check + SystemHealthWidget

#### MÓDULO 24.D.1 — `/api/health` endpoint

**Pasos:**
- `[24.D.1.1]` Route handler GET con checks paralelos:
  ```ts
  const checks = await Promise.allSettled([
    checkSupabase(),     // SELECT 1
    checkStripe(),        // account retrieve
    checkAnthropic(),     // /v1/models
    checkOpenAI(),        // /v1/models
    checkResend(),        // api.resend.com status
    checkMapbox(),        // styles/v1
    checkMetaWA(),        // phone_numbers
    checkSentry(),        // ping event with dummy tag
  ]);
  ```
- `[24.D.1.2]` Response format:
  ```json
  {"status":"healthy|degraded|down","checks":{"supabase":{"status":"ok","latency_ms":12},...},"timestamp":"...","version":"{sha}"}
  ```
- `[24.D.1.3]` Status codes: 200 all ok, 207 degraded (some fail), 503 critical down (Supabase).
- `[24.D.1.4]` Endpoint público (no auth) pero rate-limited 60 req/min.
- `[24.D.1.5]` Cache 30s edge to reduce load.

**Criterio de done del módulo:**
- [ ] Down Stripe sandbox → `/api/health` retorna degraded con Stripe fail.

#### MÓDULO 24.D.2 — `SystemHealthWidget` admin UI

**Pasos:**
- `[24.D.2.1]` Componente `/admin/system-health` consume `/api/health` cada 30s.
- `[24.D.2.2]` Grid de tiles con estado + latency + trend 24h (query Supabase `system_health_snapshots` que un cron llena cada 5min).
- `[24.D.2.3]` Alert banner si cualquier check != ok.
- `[24.D.2.4]` Link a Sentry + PostHog desde cada tile.

**Criterio de done del módulo:**
- [ ] Admin ve widget actualizado 30s + trend histórico.

### BLOQUE 24.E — SLOs + SLIs

#### MÓDULO 24.E.1 — Definición SLO/SLI

**Pasos:**
- `[24.E.1.1]` SLO H1 (baseline):
  - **Availability app**: 99.5% /mes (permite ~3.5h downtime).
  - **tRPC p95 latency**: <500ms.
  - **API externa p99 latency**: <1000ms.
  - **Error rate global**: <1%.
  - **Stripe webhook delivery**: 99.9% success.
  - **Notif WA delivery**: 95% delivered <60s.
- `[24.E.1.2]` SLO H2 target (Fase 29 pin):
  - Availability 99.9%.
  - tRPC p95 <300ms.
  - API p99 <500ms.
- `[24.E.1.3]` SLIs medidos:
  - Error rate = `5xx_requests / total_requests`.
  - Latency histograms por endpoint (Vercel Analytics + Sentry Performance).
  - DB query time p95 per router (Sentry DB span).
  - Cold start rate (Vercel logs).
  - Queue depth `notification_queue` + `ai_jobs`.

**Criterio de done del módulo:**
- [ ] Dashboard PostHog "SLO Tracker" con 6 SLIs actualizados hourly.

#### MÓDULO 24.E.2 — Alerts

**Pasos:**
- `[24.E.2.1]` Sentry alerts:
  - Error rate >1% 5min window → #sentry-critical.
  - New error type → #sentry-triage.
  - p95 >2s sustained 10min → #perf-alerts.
- `[24.E.2.2]` PostHog alerts:
  - Dropoff funnel checkout >threshold → product team.
  - Rate limit hit rate >50% top API keys → ops.
- `[24.E.2.3]` Vercel alerts:
  - Build fail → Slack + notif admin.
  - Bandwidth 80% plan → email Manu.
- `[24.E.2.4]` Custom alerts via cron `alerts_evaluate` cada 5min:
  - Queue `notification_queue` depth >1000 → Slack.
  - Webhooks fail rate >20% 30min → Slack.
  - Supabase storage usage >80% → email.

**Criterio de done del módulo:**
- [ ] Alert disparado → aparece en Slack #ops en <90s.

### BLOQUE 24.F — Disaster Recovery

#### MÓDULO 24.F.1 — Backups Supabase

**Pasos:**
- `[24.F.1.1]` Activar Supabase PITR (Point-in-Time Recovery) plan Pro — retention 7 días H1, 14 días H2.
- `[24.F.1.2]` Daily backup dump via `pg_dump` → Supabase Storage bucket `backups-offsite` (copy to external S3 por redundancy).
- `[24.F.1.3]` Schedule: cron GH Actions `0 3 * * *` corre `scripts/backup/daily-dump.sh` + upload.
- `[24.F.1.4]` Retention: 7 diarios + 4 semanales (domingo) + 12 mensuales (día 1).
- `[24.F.1.5]` Encryption at rest: bucket KMS + cliente encrypts dump con GPG antes subida.

**Criterio de done del módulo:**
- [ ] Backup diario automático + verificación integridad (test restore mensual en DB temporal).

#### MÓDULO 24.F.2 — Storage backups

**Pasos:**
- `[24.F.2.1]` Supabase Storage buckets critical (`document-jobs`, `operation-files`, `commission-invoices`, `marketing-assets`) replicados via edge function cron a bucket S3 off-site.
- `[24.F.2.2]` Sync incremental: last_modified > last_sync_at.

**Criterio de done del módulo:**
- [ ] Bucket off-site con contenido mirror.

#### MÓDULO 24.F.3 — DR runbook (05.3 detalle)

**Pasos:**
- `[24.F.3.1]` Documentar en `docs/05_OPERACIONAL/05.3_DR_RUNBOOK.md` procedimiento restauración:
  - RPO 1h H1 (5min H2 con streaming replication).
  - RTO 4h H1 (30min H2).
  - Steps: identify issue → comm status page → restore PITR → verify data integrity → smoke tests → DNS switchover si región down.
- `[24.F.3.2]` Ejercicios trimestrales: "GameDay DR" con role playing.

**Criterio de done del módulo:**
- [ ] Runbook completo con comandos exactos + checklist.

### BLOQUE 24.G — Status page

#### MÓDULO 24.G.1 — Instatus setup

**Pasos:**
- `[24.G.1.1]` Crear status page `status.desarrollosmx.com` con 6 componentes: App (web), API externa, Dashboard asesor, Dashboard dev, Dashboard comprador, Landing público.
- `[24.G.1.2]` Automated updates via Instatus API — cron `status_update` cada 5min consulta `/api/health` + reporta.
- `[24.G.1.3]` Incident workflow: admin UI `/admin/incidents` crea incident → publish a Instatus → notifs subscribers → timeline updates → post-mortem.
- `[24.G.1.4]` Subscribers email + RSS.

**Criterio de done del módulo:**
- [ ] Status page live con 99.9% (cuando todo ok) y downtime real trackeado.

### BLOQUE 24.H — Performance budgets (Core Web Vitals)

#### MÓDULO 24.H.1 — Budgets enforcement

**Pasos:**
- `[24.H.1.1]` Budgets: LCP <2.5s, INP <200ms, CLS <0.1. (FASE 25 tiene detalle implementación).
- `[24.H.1.2]` CI check: Lighthouse CI en PRs con `.lighthouserc.json`. Fail build si LCP >3s.
- `[24.H.1.3]` Vercel Analytics Web Vitals trackeado por page.
- `[24.H.1.4]` Sentry Performance tracks Web Vitals real users.
- `[24.H.1.5]` Alert: LCP p75 >3s 24h → triage.

**Criterio de done del módulo:**
- [ ] PR con regression Lighthouse bloqueado.

### BLOQUE 24.I — Cost tracking

#### MÓDULO 24.I.1 — Vendor spend dashboard

**Pasos:**
- `[24.I.1.1]` Cron `cost_tracker_daily` fetch cost APIs:
  - Vercel (`https://api.vercel.com/v1/billing/usage`)
  - Supabase (plan pro + usage bandwidth/storage via dashboard API)
  - Anthropic (token usage per model via Admin API)
  - OpenAI (similar)
  - PostHog (events/month via API)
  - Sentry (events/month)
  - Mapbox (requests/month)
  - Meta WA (conversations/month via Graph API)
  - Resend (emails sent)
  - Twilio (sms segments)
- `[24.I.1.2]` Persist en `vendor_costs_daily` (date, vendor, cost_usd, units, metadata jsonb).
- `[24.I.1.3]` Dashboard `/admin/costs` agregado mensual + trend + top ascending.
- `[24.I.1.4]` Attribution por user via PostHog persons (ai_dossier user A costed $0.08).
- `[24.I.1.5]` Alert: vendor cost >20% MoM increase sin razón aparente.

**Criterio de done del módulo:**
- [ ] Dashboard muestra $ spent mes por vendor + trend 6 meses.

### BLOQUE 24.J — PII masking obligatorio global

#### MÓDULO 24.J.1 — Audit

**Pasos:**
- `[24.J.1.1]` Script `scripts/audit/pii-scan.ts` busca en codebase literales emails/RFCs/phones en logs o console.log.
- `[24.J.1.2]` CI check bloquea merge si nuevo `console.log` en `src/` con patrón PII-like.
- `[24.J.1.3]` Runbook detalle cómo redactar si error.
- `[24.J.1.4]` Sentry + PostHog + logs todos tienen redact activado (ver 24.A.3, 24.B.4, 24.C.1).

**Criterio de done del módulo:**
- [ ] pii-scan retorna 0 hits.
- [ ] Replay test: session con form llenado no muestra valores.

### BLOQUE 24.K — Structured errors API

#### MÓDULO 24.K.1 — Error format

**Pasos:**
- `[24.K.1.1]` Todas respuestas de error API v1 formato estándar:
  ```json
  {"error":{"code":"RATE_LIMIT_EXCEEDED","message":"...","details":{},"request_id":"...","docs_url":"https://docs.desarrollosmx.com/errors/rate-limit"}}
  ```
- `[24.K.1.2]` tRPC errors mapeados a códigos HTTP + mensaje localizado user-facing (FASE 05 i18n).
- `[24.K.1.3]` Admin logs tienen stack trace completo; user ve mensaje sanitizado + request-id.

**Criterio de done del módulo:**
- [ ] 429 response incluye docs_url + retry-after header.

### BLOQUE 24.L — On-call rotation (preparación soft launch)

#### MÓDULO 24.L.1 — Rotation setup

**Pasos:**
- `[24.L.1.1]` PagerDuty o OpsGenie stub H1 (Manu solo on-call H1; H2 rotation cuando team crezca).
- `[24.L.1.2]` Escalation: page Manu → si no ack en 15min → SMS backup Manu.
- `[24.L.1.3]` Runbook vinculado a cada alert tipo (link Sentry → runbook 05.2).

**Criterio de done del módulo:**
- [ ] Test alert → page Manu en <2min.

### BLOQUE 24.M — Observability ADR compliance

#### MÓDULO 24.M.1 — Validations

**Pasos:**
- `[24.M.1.1]` Review con ADR-007 checklist:
  - ✅ Sentry con PII scrubbing.
  - ✅ PostHog con masking.
  - ✅ Request-id propagation cross-service.
  - ✅ Health check + widget.
  - ✅ DR backups off-site.
  - ✅ Cost tracking.
- `[24.M.1.2]` Documentation `docs/05_OPERACIONAL/05.2_INCIDENT_RESPONSE.md` cubre 6 runbooks: high error rate, DB down, WA API down, payment webhook lag, storage quota, breach suspected.

**Criterio de done del módulo:**
- [ ] ADR-007 checklist 100% verde.

## Criterio de done de la FASE

- [ ] Sentry configurado prod + dev con source maps, releases, transaction tracing, user context, PII scrubbing.
- [ ] PostHog product analytics activo con 80+ eventos + feature flags + session replay PII masked.
- [ ] Logger pino con redact + request-id propagation cross-service (app→supabase→externals).
- [ ] `/api/health` endpoint + SystemHealthWidget admin en tiempo real.
- [ ] 6 SLOs definidos + 6 SLIs medidos + alerts Slack + email.
- [ ] DR: PITR Supabase 7 días + daily dump off-site + GPG encryption + quarterly restore drill.
- [ ] Status page pública `status.desarrollosmx.com` automated updates.
- [ ] Lighthouse CI + Core Web Vitals alerts + Vercel Analytics.
- [ ] Cost tracking 10 vendors + dashboard admin + alerts spike.
- [ ] PII scan CI gate + runbook.
- [ ] Error API v1 format estandarizado con request-id + docs_url.
- [ ] On-call rotation stub con PagerDuty/OpsGenie.
- [ ] Runbook 05.2 (incident response) + 05.3 (DR) + 05.6 (data retention) completos.
- [ ] Tag git `fase-24-complete`.

## Próxima fase

FASE 25 — Performance + Mobile (PWA H1 + optimizaciones + mobile-first UX).

---

## Laterals pipeline (proposed durante ejecución previa)

Ver registro maestro: `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`

Aplican en esta fase:
- **L20 DMX Data Quality Dashboard** (Datadog pattern) — observability pública del IE como producto público (Status Page tipo Stripe). Bloque sugerido: nuevo BLOQUE 24.PUBLIC_STATUS — exposición externa de métricas operacionales del IE como brand asset.
- **L21 DMX Pipeline Audit Trail** (Vercel Functions Logs pattern) — exposición de audit trail de scores como capability B2B. Bloque sugerido: integrar en setup logging Vercel + Sentry + PostHog ya planeado, agregando endpoint `/api/v1/scores/{id}/audit` con log completo cascade trace.

Al ejecutar FASE 24, revisar status en pipeline maestro y confirmar incorporación al scope.

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
