# FASE 30 — Platform API (Stripe-like)

> **Duración estimada:** 5 sesiones Claude Code (~20 horas)
> **Dependencias:** [FASE 23 — Monetización](./FASE_23_MONETIZACION.md), [FASE 28 — Launch Soft](./FASE_28_LAUNCH_SOFT.md)
> **Bloqueantes externos:**
> - Dominio `developers.desarrollosmx.com` (DNS + SSL vía Vercel)
> - `MINTLIFY_API_KEY` o cuenta Docusaurus self-host (decidir en Bloque 30.B)
> - Cuenta GitHub Packages o npm para publicar SDKs
> - Cuenta Stripe con `stripe-meter-events` habilitado para metered billing
> - Discord server provisionado (DevRel community hook GC-12)
> - Postman Team plan para collection pública con run-in-browser
> **Horizonte:** H2
> **Resultado esperado:** API de DMX como producto independiente con docs portal `/developers`, OpenAPI 3.1 spec versioned, 5 SDKs oficiales (TypeScript, Python, Ruby, PHP, Go), webhooks bidireccionales con HMAC verification, sandbox environment con datos sintéticos, rate limit tiers (Free/Starter/Pro/Enterprise), metered billing por endpoint × request vía Stripe, Postman collection interactiva, DevRel program con Discord + office hours, API versioning strategy (v1 stable, v2 beta, deprecation 12 meses). Tag `fase-30-complete`.
> **Priority:** [H2]

## Contexto y objetivo

FASE 23 activó un primer endpoint de monetización B2B pero sin el tratamiento de "producto". Esta fase convierte la API DMX en **producto independiente** (pattern Stripe / Twilio / Algolia) — con su propio dominio, docs interactivos, SDKs mantenidos oficialmente, sandbox y developer experience de clase mundial. El objetivo estratégico: **la API es el canal que conecta a DMX con el ecosistema** (portales, fintechs, aseguradoras, brokers grandes, gobierno, notarías). En H2 target es 20 clientes pagando con MRR combinado ≥ $50K USD; en H3 con Data Ecosystem maduro (FASE 33) target es 100+ clientes con MRR ≥ $500K USD.

Rationale: ver [ADR-011 Moonshot 3 horizontes](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-013 API as Product](../01_DECISIONES_ARQUITECTONICAS/ADR-013_API_AS_PRODUCT.md), [ADR-015 Platform Play H2](../01_DECISIONES_ARQUITECTONICAS/ADR-015_PLATFORM_PLAY_H2.md). La API exposes data + scores + events; no exposes privileged mutations que permitirían a un tercero actuar como DMX (no crear operaciones, no cerrar ventas — solo read + subscribe + enrich).

Los productos licenciables del catálogo [03.11](../03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md) se montan sobre este API como "planes" (feature-gating en FASE 23) + documentación verticalizada en el portal.

## Bloques

### BLOQUE 30.A — OpenAPI 3.1 spec + codegen pipeline

#### MÓDULO 30.A.1 — Autoring OpenAPI spec

**Pasos:**
- `[30.A.1.1]` Crear `packages/api-spec/openapi.yaml` (OpenAPI 3.1):
  ```yaml
  openapi: 3.1.0
  info:
    title: DesarrollosMX Platform API
    version: 1.0.0
    description: |
      Spatial Decision Intelligence API for LATAM real estate.
      See https://developers.desarrollosmx.com for full docs.
    termsOfService: https://desarrollosmx.com/legal/api-terms
    contact:
      name: DMX DevRel
      email: devrel@desarrollosmx.com
    license:
      name: Commercial
      url: https://desarrollosmx.com/legal/api-license
  servers:
    - url: https://api.desarrollosmx.com/v1
      description: Production
    - url: https://sandbox.desarrollosmx.com/v1
      description: Sandbox (synthetic data, no rate limits for learning)
  security:
    - BearerAuth: []
  paths:
    /zones/{zone_id}:
      get:
        operationId: getZone
        summary: Get zone by ID with IE scores
        parameters:
          - in: path
            name: zone_id
            required: true
            schema: { type: string, format: uuid }
        responses:
          '200': { $ref: '#/components/responses/Zone' }
          '401': { $ref: '#/components/responses/Unauthorized' }
          '429': { $ref: '#/components/responses/RateLimited' }
  components:
    securitySchemes:
      BearerAuth:
        type: http
        scheme: bearer
        bearerFormat: JWT
  ```
- `[30.A.1.2]` Endpoints v1 iniciales (25):
  - `GET /zones/{id}` → zona + scores N0-N5
  - `GET /zones/search?country=MX&bbox=...` → lista paginada
  - `GET /zones/{id}/scores?levels=N0,N1,N2,N3,N5` → scores con rationale
  - `GET /zones/{id}/trends?metric=price_per_m2&period=12m` → time-series
  - `GET /properties/{id}` → ficha + estimate
  - `POST /estimates/valuate` → DMX Estimate on-demand (body: lat/lng + propiedad)
  - `POST /match/run` → matching comprador ↔ inventario
  - `GET /developments/{id}`, `GET /developments/search`
  - `GET /macro/series?country=MX&source=banxico&series=SF43783`
  - `POST /webhooks/subscriptions` + `GET` / `DELETE`
  - `GET /audit/{endpoint}/usage` → usage analytics self-service
- `[30.A.1.3]` Versioning headers: `DMX-API-Version: 2026-04-18` (fecha, pattern Stripe). Cliente puede pinear a fecha; si omitida usa latest stable.
- `[30.A.1.4]` Contract tests en `tests/api-contract/` con `openapi-validator` verificando request/response matchean spec en cada PR.

**Criterio de done del módulo:**
- [ ] `openapi.yaml` con 25 endpoints autorados.
- [ ] Contract tests verdes en CI.

#### MÓDULO 30.A.2 — Pipeline codegen multi-target

**Pasos:**
- `[30.A.2.1]` Script `scripts/codegen-sdks.mjs` que lee `openapi.yaml` y ejecuta:
  - `openapi-typescript` → `packages/sdk-ts/src/types.ts`
  - `openapi-generator-cli generate -g python` → `packages/sdk-python/`
  - `... -g ruby` → `packages/sdk-ruby/`
  - `... -g php` → `packages/sdk-php/`
  - `... -g go` → `packages/sdk-go/`
- `[30.A.2.2]` GitHub Action `.github/workflows/sdk-publish.yml` se dispara en tag `api-spec-v*` y publica:
  - `@desarrollosmx/sdk` a npm (TypeScript)
  - `desarrollosmx-sdk` a PyPI
  - `desarrollosmx` gem a RubyGems
  - `desarrollosmx/sdk` Composer a Packagist
  - `github.com/desarrollosmx/sdk-go` (Go modules auto vía tag)
- `[30.A.2.3]` Postman collection generada vía `openapi-to-postmanv2` en cada push a `main`, publicada en Postman public workspace.

**Criterio de done del módulo:**
- [ ] Codegen genera 5 SDKs sin errores.
- [ ] Workflow publica a registries en tag.

### BLOQUE 30.B — Docs portal `/developers`

#### MÓDULO 30.B.1 — Mintlify vs Docusaurus eval + setup

**Pasos:**
- `[30.B.1.1]` Decisión: **Mintlify** (pattern Stripe, Linear, Resend). Justificación: AI search nativo, hot reload, interactive examples sin setup, custom domain incluido. Trade-off: $300/mes vs Docusaurus free self-host (más trabajo, pero branding total).
- `[30.B.1.2]` Proyecto Mintlify `apps/developers/` con `mint.json`:
  ```json
  {
    "name": "DesarrollosMX API",
    "logo": { "light": "/logo-light.svg", "dark": "/logo-dark.svg" },
    "favicon": "/favicon.svg",
    "colors": { "primary": "#7C3AED", "light": "#A78BFA", "dark": "#4C1D95" },
    "openapi": "https://raw.githubusercontent.com/desarrollosmx/monorepo/main/packages/api-spec/openapi.yaml",
    "tabs": [
      { "name": "Guides", "url": "guides" },
      { "name": "API Reference", "url": "api-reference" },
      { "name": "SDKs", "url": "sdks" },
      { "name": "Webhooks", "url": "webhooks" },
      { "name": "Changelog", "url": "changelog" }
    ],
    "anchors": [
      { "name": "Discord", "url": "https://discord.gg/desarrollosmx", "icon": "discord" },
      { "name": "Support", "url": "mailto:devrel@desarrollosmx.com", "icon": "envelope" }
    ]
  }
  ```
- `[30.B.1.3]` Dominio `developers.desarrollosmx.com` CNAME → Mintlify. SSL auto.
- `[30.B.1.4]` Guides iniciales (15 archivos MD):
  - `quickstart.mdx` — "Get your first zone score in 5 minutes"
  - `authentication.mdx` — Bearer tokens + rotation + best practices
  - `pagination.mdx`, `errors.mdx`, `rate-limits.mdx`, `idempotency.mdx`
  - `guides/first-integration.mdx` — "Build a zone scorecard"
  - `guides/sync-listings.mdx` — "Subscribe to market_prices_secondary via webhooks"
  - `guides/batch-enrich.mdx` — "Enrich 10k zones in one request"
  - `guides/fintech-credit.mdx` — "Credit scoring with DMX geo signals"
  - `guides/insurance-risk.mdx` — "Insurance pricing via hazard scores"
  - 5 más verticalizados por producto (Livability API, Momentum Index, etc).
- `[30.B.1.5]` Interactive examples: cada endpoint tiene tab "Try it" con ejecución real contra sandbox + code snippets auto en 5 lenguajes.

**Criterio de done del módulo:**
- [ ] Portal live en `developers.desarrollosmx.com`.
- [ ] 15 guides publicadas.
- [ ] Try-it funciona end-to-end en sandbox.

#### MÓDULO 30.B.2 — Navegación + search + feedback

**Pasos:**
- `[30.B.2.1]` Mintlify AI search activo (`"search": { "ai": true }` en `mint.json`).
- `[30.B.2.2]` Footer con "Was this helpful?" tracked vía PostHog event `docs_feedback` (props: page, helpful_bool, comment).
- `[30.B.2.3]` "Edit on GitHub" link en cada page → abre PR contra `apps/developers/`.
- `[30.B.2.4]` Analytics dashboard interno `/admin/devrel/docs-analytics` muestra top pages, time on page, search queries sin resultados (signal para escribir nueva doc).

**Criterio de done del módulo:**
- [ ] Search AI responde a queries en <500ms p50.
- [ ] Feedback tracked.

### BLOQUE 30.C — SDKs 5 lenguajes

#### MÓDULO 30.C.1 — SDK TypeScript (referencia canónica)

**Pasos:**
- `[30.C.1.1]` `packages/sdk-ts/src/client.ts`:
  ```ts
  import type { paths } from './types';
  export interface DmxClientOptions {
    apiKey: string;
    baseUrl?: string;           // default https://api.desarrollosmx.com/v1
    apiVersion?: string;        // default '2026-04-18'
    timeout?: number;           // default 30_000 ms
    retries?: number;           // default 3 (exponential backoff, jitter)
  }
  export class DmxClient {
    constructor(private opts: DmxClientOptions) {}
    zones = {
      get: (id: string) => this.request<paths['/zones/{zone_id}']['get']['responses']['200']['content']['application/json']>('GET', `/zones/${id}`),
      search: (params: paths['/zones']['get']['parameters']['query']) => this.request('GET', '/zones', { query: params }),
      trends: (id: string, params: { metric: string; period: string }) => this.request('GET', `/zones/${id}/trends`, { query: params }),
    };
    // ... properties, estimates, match, webhooks
    private async request<T>(method: string, path: string, init?: { query?: any; body?: any }): Promise<T> { /* fetch + retry + parse errors */ }
  }
  ```
- `[30.C.1.2]` Features: typed responses via `openapi-typescript`, auto-retry en 429/5xx con respeto a `Retry-After`, `AbortSignal` support, webhooks verification helper `verifyWebhook(body, signature, secret)`.
- `[30.C.1.3]` Tests: Vitest con MSW mockeando `api.desarrollosmx.com` + sandbox integration tests en CI.
- `[30.C.1.4]` Docs: `README.md` + typedoc auto-generado + link desde Mintlify.

**Criterio de done del módulo:**
- [ ] SDK TS publicado `@desarrollosmx/sdk@1.0.0`.
- [ ] Coverage ≥ 85%.

#### MÓDULO 30.C.2 — SDKs Python / Ruby / PHP / Go

**Pasos:**
- `[30.C.2.1]` Base generada con `openapi-generator-cli`. Override templates para:
  - Python: async/await con `httpx`, Pydantic models, tipo `DmxError` con campos `code` + `message` + `doc_url`.
  - Ruby: Faraday adapter, `DMX::Client.new(api_key:)`, `DMX::Zones.get(id)`.
  - PHP: Guzzle, PSR-18 compatible.
  - Go: idiomatic (`dmx.NewClient(ApiKey: ...)`, errors vía `errors.As`).
- `[30.C.2.2]` Cada SDK tiene integration test que hace 1 request real al sandbox en CI.
- `[30.C.2.3]` Versioning: SDK version = API spec version. Release coordinado.

**Criterio de done del módulo:**
- [ ] 4 SDKs publicados en sus registries.
- [ ] Integration tests verdes.

### BLOQUE 30.D — Rate limit tiers

#### MÓDULO 30.D.1 — Tiers + enforcement

**Pasos:**
- `[30.D.1.1]` Migration `api_plans_tiers.sql`:
  ```sql
  CREATE TABLE public.api_plans (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly_usd_minor BIGINT NOT NULL,
    requests_per_day INT,                   -- NULL = unlimited
    requests_per_minute INT,
    burst_multiplier NUMERIC(3,2) DEFAULT 1.5,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    metered_overage_usd_minor BIGINT,       -- cost per request over limit
    created_at TIMESTAMPTZ DEFAULT now()
  );
  INSERT INTO public.api_plans VALUES
    ('free', 'Free', 0, 100, 10, 1.5, '{"webhooks": false, "sandbox_only": false, "support": "community"}', NULL),
    ('starter', 'Starter', 9900, 10000, 100, 2.0, '{"webhooks": true, "support": "email"}', 100),         -- $0.001 overage
    ('pro', 'Pro', 49900, 100000, 1000, 2.5, '{"webhooks": true, "batch": true, "support": "slack"}', 50),
    ('enterprise', 'Enterprise', 0, NULL, NULL, NULL, '{"webhooks": true, "batch": true, "dedicated_cs": true, "sla_99_95": true}', NULL);
  ```
- `[30.D.1.2]` Tabla `api_keys` ya existe de FASE 23 → extender con columna `plan_code` (FK a `api_plans.code`), `requests_today_counter` (reset nightly via pg_cron), `requests_this_minute` (Vercel Runtime Cache con TTL 60s).
- `[30.D.1.3]` Middleware `server/middleware/rate-limit.ts`:
  ```ts
  export async function enforceRateLimit(req: Request, apiKey: ApiKey) {
    const plan = await getPlan(apiKey.plan_code);
    if (plan.requests_per_minute !== null) {
      const cacheKey = `rl:minute:${apiKey.id}`;
      const count = await runtimeCache.increment(cacheKey, { ttl: 60 });
      if (count > plan.requests_per_minute * plan.burst_multiplier) {
        throw new RateLimitError({ retry_after: 60 - (Date.now() % 60000) / 1000 });
      }
    }
    // similar for per-day; daily uses atomic Postgres counter
  }
  ```
- `[30.D.1.4]` Headers de respuesta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` en 429.

**Criterio de done del módulo:**
- [ ] 4 tiers en BD.
- [ ] Enforcement con RPM + RPD.
- [ ] Headers devueltos correctamente.

### BLOQUE 30.E — Webhooks bidireccionales

#### MÓDULO 30.E.1 — Outbound webhooks (DMX → client)

**Pasos:**
- `[30.E.1.1]` Migration extiende `webhook_subscriptions` (FASE 22):
  ```sql
  ALTER TABLE public.webhook_subscriptions
    ADD COLUMN api_key_id UUID REFERENCES public.api_keys(id),
    ADD COLUMN signing_secret TEXT NOT NULL,
    ADD COLUMN tolerance_seconds INT DEFAULT 300,
    ADD COLUMN retry_policy JSONB DEFAULT '{"max_retries": 5, "backoff_base_ms": 1000, "backoff_multiplier": 2}';
  ```
- `[30.E.1.2]` Eventos disponibles (enum `webhook_event_type`):
  - `zone.score.updated`, `zone.trend.alert`
  - `property.estimate.refreshed`
  - `match.opportunity.created`
  - `market.price_drop.detected`
  - `development.published`
  - `ingest.anomaly.detected`
- `[30.E.1.3]` Delivery worker `shared/lib/webhooks/deliver.ts` con HMAC-SHA256 signature:
  ```ts
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', subscription.signing_secret).update(signedPayload).digest('hex');
  await fetch(subscription.target_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DMX-Signature': `t=${timestamp},v1=${signature}`,
      'DMX-Event': event.type,
      'DMX-Event-Id': event.id,
      'DMX-API-Version': apiVersion,
    },
    body: payload,
  });
  ```
- `[30.E.1.4]` Retry con exponential backoff. Dead-letter queue tras 5 fails.

**Criterio de done del módulo:**
- [ ] Eventos disparan webhooks.
- [ ] HMAC verification documented + SDK helper.

#### MÓDULO 30.E.2 — Inbound webhooks (client → DMX)

**Pasos:**
- `[30.E.2.1]` Endpoint `POST /v1/inbound/{integration_slug}` para que clientes envíen eventos a DMX (ej: portal notifica cambio de precio listing).
- `[30.E.2.2]` Cada integración declara su signing key (mirror del pattern outbound).
- `[30.E.2.3]` Validación HMAC + idempotency key (`DMX-Idempotency-Key` header) → rechaza duplicados en ventana 24h.
- `[30.E.2.4]` Ejemplo uso: Inmuebles24 podría enviar webhook cuando nuevo listing aparece, DMX enriquece y devuelve via outbound webhook.

**Criterio de done del módulo:**
- [ ] Endpoint inbound funcional.
- [ ] Idempotency y HMAC enforced.

### BLOQUE 30.F — Sandbox environment

#### MÓDULO 30.F.1 — Dataset sintético + provisioning

**Pasos:**
- `[30.F.1.1]` Script `scripts/sandbox-seed.mjs` que:
  1. `pg_dump` de prod con subset (CDMX + 3 alcaldías) → `seeds/sandbox-subset.sql`.
  2. Anonimización: regex replace nombres asesores/compradores con faker, emails `user+123@sandbox.dmx`, telefonos `+52-55-SANDBOX-###`, direcciones exactas → aproximadas (cuadrícula de bloque).
  3. Marcar `meta->>'synthetic' = true` en filas.
- `[30.F.1.2]` Sandbox Supabase project dedicado `qxfuqwlktmhokwwlvggy-sandbox`. Reset weekly via cron.
- `[30.F.1.3]` API domain `sandbox.desarrollosmx.com/v1` apunta a sandbox Supabase. Rate limits más laxos (10K/min).
- `[30.F.1.4]` Banner visible en responses: header `X-DMX-Environment: sandbox`.
- `[30.F.1.5]` Test keys obtenibles sin tarjeta — provisioning auto en registro developer.

**Criterio de done del módulo:**
- [ ] Sandbox live con dataset sintético.
- [ ] Reset weekly funcional.

### BLOQUE 30.G — Billing metering (Stripe)

#### MÓDULO 30.G.1 — Metered billing por endpoint × request

**Pasos:**
- `[30.G.1.1]` Stripe Products mapeados 1:1 con `api_plans.code`. Precios en Stripe con pricing model `metered` para overage.
- `[30.G.1.2]` Middleware post-response:
  ```ts
  afterResponse(async (req, res, apiKey) => {
    if (!apiKey.stripe_subscription_item_id) return;
    await stripe.billing.meterEvents.create({
      event_name: 'api_request',
      timestamp: Math.floor(Date.now() / 1000),
      payload: {
        stripe_customer_id: apiKey.stripe_customer_id,
        value: '1',
        endpoint: req.url,
        plan: apiKey.plan_code,
      },
    });
  });
  ```
- `[30.G.1.3]` Dashboard cliente `/dashboard/api/usage` muestra: requests hoy/mes, % cuota, overage $, top endpoints.
- `[30.G.1.4]` Alerta por email al 80% y 100% de cuota mensual.

**Criterio de done del módulo:**
- [ ] Meter events llegan a Stripe.
- [ ] Invoicing correcto en ciclo mensual.

### BLOQUE 30.H — Postman collection + starter repos

#### MÓDULO 30.H.1 — Postman workspace público

**Pasos:**
- `[30.H.1.1]` Workspace `DesarrollosMX Platform` en Postman Public API Network. Collection generada cada push a `main` via `newman run` + `postman-api` publish.
- `[30.H.1.2]` Environment `DMX Sandbox` pre-poblado con variables `api_key`, `base_url=https://sandbox.desarrollosmx.com/v1`.
- `[30.H.1.3]` Botón "Run in Postman" en cada página del docs portal.

**Criterio de done del módulo:**
- [ ] Collection live con 25 requests.
- [ ] Botón embed funcional.

#### MÓDULO 30.H.2 — Starter repos GitHub

**Pasos:**
- `[30.H.2.1]` Repos públicos en `github.com/desarrollosmx-examples/`:
  - `starter-nextjs-zone-map` — Next.js 16 + DMX SDK muestra mapa con scores.
  - `starter-python-batch-enrich` — notebook Jupyter enriquece CSV de propiedades.
  - `starter-webhook-handler-node` — Express server recibe webhooks, verifica HMAC, persiste en Postgres.
  - `starter-fintech-credit-score` — demo integración credit bureau + DMX.
- `[30.H.2.2]` Cada repo con README bilingüe (es/en), licencia MIT, CI GitHub Actions verifica `npm test`.

**Criterio de done del módulo:**
- [ ] 4 starter repos publicados y testeados.

### BLOQUE 30.I — DevRel program

#### MÓDULO 30.I.1 — Community Discord + office hours

**Pasos:**
- `[30.I.1.1]` Server Discord `discord.gg/desarrollosmx` con canales:
  - `#announcements`, `#general`, `#api-help`, `#sdk-help` (5 canales, uno por SDK), `#webhooks`, `#integrations`, `#feedback`, `#off-topic`.
  - Roles: `@Developer`, `@Enterprise-Customer`, `@DMX-Team`, `@Community-Leader`.
- `[30.I.1.2]` Bot DMX en Discord (`apps/discord-bot/`):
  - `/api-status` → health + latency prod/sandbox
  - `/lookup <zone_id>` → estructura básica de la zona (pull from sandbox)
  - `/rate-limits` → muestra cuotas por plan
  - `/docs <query>` → search en Mintlify retorna top 3 links
- `[30.I.1.3]` Office hours: semanal Jueves 11:00 CDMX, grabadas en YouTube. Calendly booking con DevRel lead.
- `[30.I.1.4]` Patrón Midjourney [GC-12](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-12) — comunidad como moat.

**Criterio de done del módulo:**
- [ ] Server live con ≥ 50 miembros en mes 1.
- [ ] Bot responde a 4 comandos.

### BLOQUE 30.J — API versioning strategy

#### MÓDULO 30.J.1 — Policy + deprecation

**Pasos:**
- `[30.J.1.1]` Política documentada en `docs-mintlify/api-versioning.mdx`:
  - v1 = stable (producción). Breaking changes requieren v2.
  - v2 = beta, opt-in via `DMX-API-Version` header. Estable tras 6 meses + 3 clientes canary.
  - Deprecation: anuncio en changelog + email a API key owners + 12 meses lead time antes de sunset.
  - Sunset: header `Sunset: Sat, 01 Jan 2028 00:00:00 GMT` + `Deprecation: true` en responses de v deprecated.
- `[30.J.1.2]` Changelog Mintlify auto-populado desde `CHANGELOG.md` del monorepo bajo `### API` sección.
- `[30.J.1.3]` Alert system: endpoint con `Deprecation: true` tracked en PostHog → dashboard muestra clientes afectados, envío email automático semanal hasta migración.

**Criterio de done del módulo:**
- [ ] Policy publicada.
- [ ] Changelog sync funcional.
- [ ] Deprecation tracking activo.

## Criterio de done de la FASE

- [ ] OpenAPI 3.1 spec con 25 endpoints.
- [ ] Codegen pipeline produce 5 SDKs.
- [ ] Docs portal `developers.desarrollosmx.com` live con 15 guides + AI search + try-it.
- [ ] 5 SDKs publicados (npm, PyPI, RubyGems, Packagist, Go modules).
- [ ] 4 rate limit tiers con enforcement RPM/RPD + Stripe metered billing.
- [ ] Webhooks bidireccionales con HMAC.
- [ ] Sandbox environment con datos sintéticos + reset weekly.
- [ ] Postman collection pública + botón Run in Postman.
- [ ] 4 starter repos GitHub.
- [ ] DevRel program: Discord + bot + office hours.
- [ ] API versioning policy publicada + changelog sync.
- [ ] Tag git: `fase-30-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados con integration tests
- [ ] Permission enforcement validado para cada rol (asesor / dev / comprador / admin / superadmin / api_client)

### States
- [ ] Loading states (skeleton matching layout) en docs try-it, dashboard usage, sandbox
- [ ] Error states con recovery path (rate limit, auth, 5xx)
- [ ] Empty states con call-to-action (no API keys → "Create your first key")
- [ ] Success states con feedback visual (key created, webhook delivered)

### Quality
- [ ] Mobile responsive verificado (iPhone 15, Pixel 8, iPad) — docs portal + dashboard
- [ ] Accessibility WCAG 2.1 AA (keyboard nav, ARIA, contrast ≥4.5:1, focus visible)
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded (docs en/es)
- [ ] Core Web Vitals green (LCP <2.5s, FID <100ms, CLS <0.1)

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright smoke tests covering golden paths pasan en CI (register → key → first call → webhook)
- [ ] PostHog events tracked para acciones clave (docs_feedback, api_key_created, first_api_call)
- [ ] Sentry captures errors (validación runtime con error fixture)

### Stubs (si aplica)
- [ ] STUBs marcados con `// STUB — activar FASE XX con [dependencia]`
- [ ] STUBs visibles al user con badge `[beta]` / `[próximamente]`
- [ ] STUBs documentados en §5.B — Inferencias y stubs permitidos
- [ ] STUB endpoints devuelven 501 Not Implemented (no 200 fake)

### Sign-off
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-30-complete aplicado post-merge

## Features implementadas en esta fase (≈ 25)

1. **F-30-01** OpenAPI 3.1 spec versioned con 25 endpoints v1
2. **F-30-02** Contract tests en CI validando request/response
3. **F-30-03** Pipeline codegen multi-target (TS, Python, Ruby, PHP, Go)
4. **F-30-04** Docs portal Mintlify `developers.desarrollosmx.com`
5. **F-30-05** 15 guides iniciales (quickstart, auth, pagination, errors, rate limits, vertical guides)
6. **F-30-06** Interactive try-it integrado con sandbox
7. **F-30-07** AI search nativo Mintlify
8. **F-30-08** SDK TypeScript `@desarrollosmx/sdk` canónico
9. **F-30-09** SDK Python `desarrollosmx-sdk` con async httpx + Pydantic
10. **F-30-10** SDK Ruby gem + Faraday
11. **F-30-11** SDK PHP + Guzzle PSR-18
12. **F-30-12** SDK Go idiomatic
13. **F-30-13** Tabla `api_plans` con 4 tiers (Free/Starter/Pro/Enterprise)
14. **F-30-14** Middleware rate limit RPM + RPD con Runtime Cache
15. **F-30-15** Headers `X-RateLimit-*` + 429 con `Retry-After`
16. **F-30-16** Outbound webhooks con HMAC-SHA256 signature
17. **F-30-17** Inbound webhooks con idempotency keys
18. **F-30-18** Dead-letter queue para webhook deliveries fallidas
19. **F-30-19** Sandbox environment con datos sintéticos anonimizados
20. **F-30-20** Stripe metered billing por endpoint × request
21. **F-30-21** Dashboard cliente usage `/dashboard/api/usage`
22. **F-30-22** Postman collection pública + Run in Postman
23. **F-30-23** 4 starter repos en `github.com/desarrollosmx-examples/`
24. **F-30-24** DevRel program: Discord server + bot + office hours weekly
25. **F-30-25** API versioning policy + changelog sync + deprecation tracking

## Próxima fase

[FASE 31 — Agentic Marketplace](./FASE_31_AGENTIC_MARKETPLACE.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
