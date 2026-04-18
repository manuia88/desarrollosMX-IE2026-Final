# ADR-007 — Observability stack: Sentry + PostHog + Vercel/Supabase logs

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

DesarrollosMX entra a soft launch (FASE 28) con 10-30 asesores piloto y un presupuesto operativo acotado. La decisión de arquitectura AI-native (ADR-002) introduce costos variables por query (Anthropic/OpenAI tokens) que deben monitorizarse día 1. La decisión multi-country (ADR-003) multiplica la superficie de logs y errores (5 países, 5 locales, múltiples payment processors, múltiples tax engines). La arquitectura monolito Next.js + Supabase (BRIEFING §4, §11) no requiere traces distribuidos complejos, pero sí requiere correlación cross-layer (browser → Next.js route handler → tRPC procedure → Supabase → AI provider).

Observables necesarios día 1:

1. **Errores frontend + backend con stack trace + context**: qué usuario, qué país, qué request, qué versión.
2. **Product analytics**: funnels AARRR (Acquisition → Activation → Retention → Referral → Revenue), time-to-first-action por asesor nuevo, abandono en wizard Operaciones paso 3, etc.
3. **Feature flags + A/B testing**: rollout controlado de features (ej. `ai_copilot_enabled`, `marketplace_escrow_enabled`), experimentos de onboarding.
4. **Session replay** para debugging UX (asesor reporta "no pude agendar visita") con masking PII obligatorio.
5. **Infrastructure logs**: Vercel function logs, Supabase query logs, cron execution logs.
6. **Structured logging**: request-id trace desde edge hasta DB, con campos estandarizados.
7. **Health check endpoint** para monitoring externo y `SystemHealthWidget` del portal admin.
8. **AI cost tracking**: tokens in/out por usuario, por modelo, por feature (alimenta `ai_usage_tracking`).

Proveedores evaluados:

- **Sentry**: estándar errors + performance + releases. Integración SDK Next.js 16 madura, source maps auto, replay opcional (no se usa — se delega a PostHog).
- **PostHog**: product analytics + feature flags + A/B testing + session replay + event pipeline. Self-hosted opcional, cloud PostHog EU/US.
- **Datadog**: enterprise-grade full stack, pricing significativo.
- **New Relic**: legacy fit, pricing opaco.
- **OpenTelemetry**: estándar abierto de traces/metrics/logs, no es SaaS sino protocolo. Se puede exportar a cualquier backend.
- **LogRocket / FullStory**: session replay excelente pero duplicado con PostHog.
- **Vercel Observability**: logs nativos gratis en plan Pro, más Vercel Analytics (Core Web Vitals).

## Decision

Se adopta **Sentry + PostHog + Vercel Logs + Supabase Logs** como stack base, con **exportadores OpenTelemetry** como escape hatch futuro:

### D1. Sentry — errors + performance + releases

- **Frontend SDK**: `@sentry/nextjs` en Next.js 16 App Router.
- **Backend SDK**: `@sentry/nextjs` cubre server components + route handlers + server actions.
- **Tracing**: sampling inicial `tracesSampleRate: 0.1` (10%), escalable según pricing.
- **Release tracking**: auto-upload source maps en CI (GitHub Actions), correlación commit ↔ error.
- **Performance**: Web Vitals (LCP, FID, CLS, INP) trackeados; objetivo p75 < 2.5s LCP en móvil.
- **Filtros**: PII (rfc, email, phone) scrubbed en `beforeSend` hook con denylist explícita.
- **Alerting**: threshold "error rate > 1% durante 5 min" → Slack + email. Errores críticos (fallo Stripe webhook, fallo Supabase auth) → notificación inmediata.
- **No session replay en Sentry**: se delega a PostHog para unificar.

### D2. PostHog — product analytics + feature flags + A/B + session replay

- **Product analytics**: eventos nombrados por convención `<feature>.<action>` (p. ej. `contactos.created`, `operaciones.step_advanced`, `copilot.query_submitted`). Definidos en `shared/lib/analytics/events.ts` como constantes enumeradas.
- **Funnels AARRR** definidos en PostHog:
  - Acquisition: landing view → signup form submit → email confirm
  - Activation: primer login → primer contacto creado → primera búsqueda matcheada
  - Retention: DAU/WAU/MAU por portal
  - Referral: usuarios con referral_code activo
  - Revenue: tracking Stripe MRR via webhooks
- **Feature flags**: servidor + cliente. Key flags H1:
  - `ai_copilot_enabled` (gradual rollout)
  - `marketplace_escrow_enabled` (post-KYC)
  - `multi_country_<code>` (CO/AR/BR rollout H2)
  - `pre_approval_credit_enabled`
- **A/B testing**: PostHog Experiments para UI changes (hero landing, onboarding flow).
- **Session replay**: enabled para asesores + devs con **masking PII obligatorio**: inputs con `data-ph-capture-attribute-input-mask` en campos de RFC, CURP, email, teléfono; máscara automática para inputs `type=password`. Compradores NO tienen replay por privacidad.
- **Persona identification**: identificar usuarios por `user.id` de Supabase (no email directo); propiedades `country_code`, `rol`, `plan_name` para segmentación.

### D3. Vercel Logs + Vercel Analytics

- **Function logs** capturados automáticamente (Pro plan).
- **Retention**: 30 días en Pro, 7 días en Hobby.
- **Vercel Analytics**: Core Web Vitals + RUM (real user monitoring) básico.
- **Log format**: JSON estructurado con `request_id`, `user_id?`, `country_code?`, `feature`, `level` (info/warn/error/debug).

### D4. Supabase Logs

- **Postgres logs**: auto-captured. Consultables desde Supabase Studio Logs UI.
- **Auth logs**: login attempts, MFA challenges, role changes (fuente de audit complementaria).
- **Realtime + Storage + Edge Functions logs**: según componente.

### D5. Structured logging con request-id

- Middleware `server/trpc/middleware.ts` + edge middleware genera `request_id = crypto.randomUUID()` y lo propaga como header `X-Request-Id`.
- Cliente Supabase admin pasa el `request_id` como header custom para correlación en Postgres logs.
- Todos los `console.log` productivos son reemplazados por helper `logger.info/warn/error` en `shared/lib/logger.ts` con shape JSON estandarizado.
- Sentry scope incluye `request_id` en cada evento.

### D6. Health check `/api/health` + SystemHealthWidget Admin

- **Endpoint**: `/api/health` retorna JSON con checks:
  ```json
  {
    "status": "ok|degraded|down",
    "checks": {
      "db": { "status": "ok", "latency_ms": 12 },
      "supabase_auth": { "status": "ok" },
      "ai_anthropic": { "status": "ok", "last_success": "..." },
      "ai_openai": { "status": "ok" },
      "fx_rates": { "status": "ok", "last_update": "..." },
      "trigger_dev": { "status": "ok", "queue_depth": 42 }
    },
    "version": "<git-sha>",
    "timestamp": "..."
  }
  ```
- Consumido por **SystemHealthWidget** en Portal Admin (M16, FASE 19).
- Usado por monitoring externo (UptimeRobot / BetterStack / Vercel Monitoring).

### D7. AI cost tracking en `ai_usage_tracking`

- Tabla `ai_usage_tracking (user_id, model, feature, prompt_tokens, completion_tokens, cost_usd, latency_ms, success, created_at)`.
- Cada llamada a Vercel AI SDK pasa por wrapper que incrementa la tabla.
- Dashboard admin consume esta tabla + PostHog para atribuir costo por feature / por plan / por usuario.
- Alert: usuario individual >100 queries en 1 hora → revisión (posible abuso o scraping por Copilot).

### D8. OpenTelemetry como escape hatch

- `@opentelemetry/api` instalado en `shared/lib/otel/`.
- Instrumentación no activada H1 (sampling 0%), preparada para FASE 29 + H2 si el volumen justifica un backend propio.
- Exportador configurable vía env var `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Rationale

Se eligió Sentry + PostHog + Vercel/Supabase nativo porque:

1. **Costo controlable**: Sentry Teams $26/mes + PostHog Cloud scale tier escalonado = < $100/mes hasta 50K eventos/mes. Escalable con tracking de costo explícito en FASE 24.
2. **Cobertura end-to-end con mínimo setup**: Sentry cubre errors+perf, PostHog cubre analytics+replay+flags, Vercel/Supabase cubren infra logs. No hay solapamiento ni gap significativo.
3. **No vendor lock fuerte**: OpenTelemetry deja la puerta abierta para migrar a Datadog/Honeycomb si el volumen crece. Los eventos PostHog se pueden exportar.
4. **Feature flags nativos en PostHog** evita adoptar LaunchDarkly / Unleash separado. Combinar flags + A/B en mismo provider simplifica.
5. **Session replay con masking** es pieza clave de debugging UX; PostHog tiene masking granular (selectors CSS + atributos). Sentry Replay es más limitado.
6. **AI cost tracking propio** (`ai_usage_tracking` table) no se delega a proveedor externo porque se integra con feature gating (`resolve_features`) y billing (Stripe). Es lógica de negocio, no observabilidad pura.

## Consequences

### Positivas
- **Observabilidad completa desde FASE 24** (paralelizable a launch soft).
- **Alerting automático** reduce MTTR ante incidentes (FASE 05.2).
- **Funnels AARRR accionables** para iterar producto en soft launch.
- **Feature flags desacoplan deploy de release**: se puede deployar código con flag off y activarlo gradualmente.
- **Session replay acelera bug reports**: en lugar de "no me funcionó" el asesor reporta con video reproducible.
- **Masking PII cumple LFPDPPP/LGPD**: replay no captura RFC, email, teléfono, documentos.
- **Health check + SystemHealthWidget** da visibilidad interna y externa del estado real.
- **AI cost tracking evita sorpresas en factura Anthropic/OpenAI**.

### Negativas / tradeoffs
- **Costo fijo mensual**: Sentry ~$26/mes + PostHog ~$50-$200/mes (según volumen). Totaliza ~$80-$250/mes con tracking. Mitigación: sampling agresivo Sentry (10%) y retention corta PostHog (90 días) H1.
- **Complejidad de masking**: falta de rigor en marcar inputs sensibles con `data-ph-capture-attribute-input-mask` deja PII expuesto en session replay. Mitigación: lint rule custom que obliga `mask` attribute en inputs de tipos conocidos (rfc, email, phone, curp).
- **Duplicación de eventos con tRPC telemetry**: cada procedure puede ser loggeada en Sentry (performance) + PostHog (analytics). Requiere decisión explícita qué va dónde. Convención: errores a Sentry, intent/funnels a PostHog.
- **Session replay pesa**: cada replay grabado ocupa storage y bandwidth. Sampling `session_recording.sample_rate: 0.3` (30% de sesiones) hasta ver stabilización de costos.
- **PostHog Cloud EU vs US**: MX no tiene instancia regional; elegir US por latencia con usuarios en México. LFPDPPP no prohíbe hosting US si hay disclaimer en aviso de privacidad.
- **Vercel Analytics es limitado** (sin custom events) comparado con PostHog, pero complementa con Web Vitals específicos.
- **Dependencia de 4 proveedores** (Sentry, PostHog, Vercel, Supabase) para observabilidad completa; caídas coincidentes son improbables pero posibles. Mitigación: health check propio + alertas externas BetterStack.

### Neutrales
- **No Datadog**: demasiado enterprise para piloto < 100 usuarios. Revisable H3 si volumen crece.
- **OpenTelemetry como puerta futura**: sin lock-in, pero sin beneficio actual.
- **Replay para asesores+devs, no compradores**: decisión de privacidad explícita, documentada en política.

## Alternatives considered

### Alt 1: Datadog all-in-one
APM + Logs + Metrics + Session Replay + Feature Flags + Synthetic monitoring en un solo proveedor. **Descartada** porque:
- Pricing mínimo ~$15/host/mes + ingest fees escalonan rápido. Piloto < 100 usuarios no justifica.
- Complejidad de onboarding (DataDog Agent, log parser setup) excesiva para equipo de 1-2.
- Feature flags Datadog son débiles comparado con PostHog.

### Alt 2: OpenTelemetry puro + backend self-hosted (Grafana Tempo + Loki + Mimir)
Stack open source con telemetry exportada a instancia propia. **Descartada** porque:
- Overhead operativo (mantener Grafana + Loki + Tempo) desproporcionado para el tamaño del equipo.
- Curva de aprendizaje alta.
- PostHog ya cubre product analytics (feature que no viene "gratis" con OTel).

### Alt 3: Sentry solo (sin PostHog)
Sentry cubre errors + performance + replay. **Descartada** porque:
- Product analytics en Sentry es rudimentario.
- Feature flags y A/B testing requerirían herramienta separada (LaunchDarkly, ~$180/mes mínimo).
- Masking PII en Sentry Replay es menos granular que en PostHog.

### Alt 4: New Relic
APM histórico con full stack. **Descartada** porque:
- Pricing opaco, recomendaciones de compra complejas.
- UX del producto más orientada a ops tradicional vs. developer-first como Sentry/PostHog.
- Menor integración con Next.js 16 App Router vs. Sentry SDK oficial.

## References
- `../BRIEFING_PARA_REWRITE.md` §4 (stack), §11 (anti-over-engineering)
- `../CONTEXTO_MAESTRO_DMX_v5.md` §17 (admin pages — SystemHealthWidget), §7 (`/api/health`)
- `../02_PLAN_MAESTRO/FASE_24_OBSERVABILIDAD_SRE.md` (setup detallado)
- `../02_PLAN_MAESTRO/FASE_26_COMPLIANCE_AUDITORIA.md` (masking PII)
- `../05_OPERACIONAL/05.2_INCIDENT_RESPONSE.md` (runbook alertas)
- ADR-009 Security Model (rate limit + audit log)
- Sentry Next.js docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- PostHog docs: https://posthog.com/docs
- OpenTelemetry: https://opentelemetry.io

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
