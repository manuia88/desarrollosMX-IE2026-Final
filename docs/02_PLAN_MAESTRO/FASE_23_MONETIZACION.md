# FASE 23 — Monetización (Stripe full + Feature gating + 7 productos B2B infraestructura + API externa + UPG 7.12)

> **Duración estimada:** 6 sesiones Claude Code (~24 horas con agentes paralelos)
> **Dependencias:** FASE 00-02 (bootstrap + BD + auth + **`feature_registry` / `role_features` / `profile_feature_overrides` / `resolve_features()` ya existen**), FASE 05 (i18n + multi-country — planes per country), FASE 06 (seguridad — vault pgsodium para stripe secrets), FASE 07 (ingesta base), FASE 08-12 (IE completo — endpoints API consumen scores), FASE 18 (Legal + Escrow — Stripe Connect ya configurado parcialmente), FASE 22 (notifs — trial_expiry + payment alerts).
> **Bloqueantes externos:**
> - **Cuenta Stripe México activa** + Stripe Connect onboarded con Platform account verified.
> - **Cuenta MercadoPago** multi-country (MX, CO, AR, BR, CL) — para fallback LATAM no-Stripe.
> - **Tax profiles** Stripe Tax configurado (IVA MX 16%, CO 19%, AR 21%, BR ICMS, CL 19%).
> - Seeds feature_registry con los 30+ flags (max_contacts, max_searches, ai_dossiers_month, max_projects, ai_extractions_month, drive_monitors, storage_gb, max_asesores, max_projects_authorized, max_captaciones, max_props_secundarias, acm_month, api_queries_day, etc.).
> - Feature flags gateando `billing_stripe_live`, `api_external_v1`, `product_livability_api`, `product_momentum_index`, `product_risk_score`, `product_site_selection`, `product_market_reports`, `product_estimate_avm`, `api_sandbox` en `feature_registry`.
> - Webhooks URLs públicas configuradas: `https://app.desarrollosmx.com/api/webhooks/stripe`, `/api/webhooks/stripe-connect`.
> - Dominio `api.desarrollosmx.com` con SSL (CNAME a Vercel).
> **Resultado esperado:** Sistema monetización operativo. 3 familias planes (Asesor/Dev/API externa) × 4 tiers cada uno con precios MXN + conversión multi-currency. Stripe Checkout + Customer Portal + Connect (fee 0.5% venta). Feature gating runtime `checkFeature()` consultando `feature_registry`. API externa v1 con 9+ endpoints (7 productos B2B + Estimate + genérico), 2 environments (sandbox/prod), rate limits, OpenAPI spec, Playground. Dashboard admin requests/revenue. UPG 7.12 completa. Tag `fase-23-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase convierte DMX de producto-gratis-valor en producto-pagante-con-valor. Aterriza el feature registry ya creado en FASE 02 a un layer de gating en runtime + Stripe API + API externa monetizable (infraestructura H1 para los 7 productos B2B que aterrizan comercialmente H2-H3).

Decisiones críticas ancladas:
- **3 fases de monetización** (§21 Contexto): Fase 1 todo gratis validación → **Fase 2 SUSCRIPCIONES + FEE venta (estamos acá en H1)** → Fase 3 IE monetizado (H2-H3).
- **Fee 0.5% valor cierre** al desarrollador via Stripe Connect application_fee.
- **Feature gating runtime** vía `resolve_features(user_id)` (ya existe FASE 02) + `checkFeatureLimit(userId, feature)` cruza con `countFeatureUsage`.
- **7 productos B2B como ENDPOINTS API** (infraestructura H1) — go-to-market H2-H3 (pricing page + sales leads + enterprise contracts). La fase construye los endpoints + middleware + dashboards, NO la venta.
- **DMX Estimate I01** H1 = regression lineal; v2 gradient boosting H2; v3 deep learning H3 (Fase 29).
- **API externa v1** con 2 environments (sandbox prefijo `dmx_test_`, prod prefijo `dmx_live_`).
- **UPG 7.12 (99-110)** scope-in: API completa, bulk, bancos/aseguradoras/retailers flows, rate limiting, docs, dashboard, sandbox, webhooks (ya FASE 22), batch, widget embed.

Cross-references:
- ADR-008 (monetization + feature gating — autoridad normativa de esta fase).
- ADR-003 (multi-country — planes/precios/currency).
- ADR-009 (seguridad — API keys hash bcrypt, secrets vault).
- FASE 02 (feature_registry + resolve_features).
- FASE 18 (Stripe Connect base para operaciones — aquí lo reusamos para fee venta).
- FASE 22 (notifs trial_expiry + payment_overdue).
- Catálogo 03.10 (features registry detalle).
- Catálogo 03.11 (7 productos B2B detalle).

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-1 | DMX API as Product (foundation H1 → FASE 30 H2 bridge) | H1 entrega infraestructura API externa completa + página `/developers` + OpenAPI; FASE 30 H2 formaliza go-to-market | Módulo 23.N.1 (nuevo) |
| GC-22 | DMX Insights (newsletter + podcast revenue stream) | H2 pin: newsletter signup + content strategy anchored in /indices + metodología | Módulo 23.N.2 (nuevo) |

## Bloques

### BLOQUE 23.A — Schema BD (plans + subscriptions + billing + api_keys)

#### MÓDULO 23.A.1 — Tablas `plans` + `plan_features`

**Pasos:**
- `[23.A.1.1]` Migration `20260417_billing_plans.sql`:
  ```sql
  CREATE TABLE plans (
    id TEXT PRIMARY KEY, -- slug: 'asesor_free', 'asesor_starter', ..., 'api_enterprise'
    family TEXT NOT NULL CHECK (family IN ('asesor','dev','api','addon')),
    tier TEXT NOT NULL CHECK (tier IN ('free','starter','pro','enterprise','custom')),
    display_name TEXT NOT NULL,
    description TEXT,
    stripe_product_id TEXT, -- prod_XXX
    monthly_price_cents INT NOT NULL, -- base MXN cents
    annual_price_cents INT,
    currency TEXT NOT NULL DEFAULT 'MXN',
    trial_days INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    metadata JSONB, -- cap límites numéricos
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE plan_features (
    plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
    feature_key TEXT REFERENCES feature_registry(key) ON DELETE CASCADE,
    limit_value INT, -- NULL = unlimited
    bool_value BOOLEAN, -- para features toggle (not numeric)
    PRIMARY KEY (plan_id, feature_key)
  );
  ```
- `[23.A.1.2]` Seed los 12 planes:
  - Asesor: `asesor_free` $0, `asesor_starter` $49900 (=$499 MXN), `asesor_pro` $99900, `asesor_enterprise` $249900.
  - Dev: `dev_free` $0, `dev_starter` $99900, `dev_pro` $299900, `dev_enterprise` custom (0=on quote).
  - API: `api_free` $0, `api_starter` $500000 (=$5K), `api_pro` $2500000 (=$25K), `api_enterprise` custom.
- `[23.A.1.3]` Seed `plan_features` con límites por plan:
  - `asesor_free`: max_contacts=50, max_searches=10, ai_dossiers_month=2, ai_briefings_month=2, max_captaciones=5, acm_month=2.
  - `asesor_starter`: max_contacts=200, max_searches=50, ai_dossiers_month=10, ai_briefings_month=4, max_captaciones=20, acm_month=10.
  - `asesor_pro`: max_contacts=NULL, max_searches=NULL, ai_dossiers_month=30, ai_briefings_month=8, acm_month=50.
  - `asesor_enterprise`: todo NULL + `max_asesores_team=NULL`, `max_projects_authorized=NULL`.
  - `dev_free`: max_projects=1, ai_extractions_month=5, drive_monitors=1, storage_gb=2, max_props_secundarias=5.
  - `dev_starter`: max_projects=5, ai_extractions_month=20, drive_monitors=5, storage_gb=10, max_props_secundarias=50.
  - `dev_pro`: max_projects=NULL, ai_extractions_month=50, storage_gb=50, max_props_secundarias=NULL.
  - `dev_enterprise`: unlimited + `api_access=true`.
  - `api_free`: api_queries_day=100, endpoints=[score+label solo], bulk=false, historical=false.
  - `api_starter`: api_queries_day=10000, endpoints=all_public, historical=false, bulk=false.
  - `api_pro`: api_queries_day=100000, historical=true, bulk=true.
  - `api_enterprise`: api_queries_day=NULL, sla_99_9=true, dedicated_support=true, custom_endpoints=true.
- `[23.A.1.4]` RLS: `plans` SELECT público (para pricing page); `plan_features` SELECT público.

**Criterio de done del módulo:**
- [ ] 12 planes + límites seed aplicados.
- [ ] Query public `SELECT * FROM plans WHERE active` retorna 12 rows.

#### MÓDULO 23.A.2 — Tabla `subscriptions` + `billing_history`

**Pasos:**
- `[23.A.2.1]` Schema:
  ```sql
  CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','incomplete','incomplete_expired','paused')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    country_code TEXT NOT NULL DEFAULT 'MX',
    currency TEXT NOT NULL DEFAULT 'MXN',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE UNIQUE INDEX one_active_sub_per_family ON subscriptions (user_id, (
    (SELECT family FROM plans WHERE plans.id = subscriptions.plan_id)
  )) WHERE status IN ('trialing','active','past_due');
  CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id TEXT,
    amount_cents INT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[23.A.2.2]` RLS: user ve solo suyo; admin todo.
- `[23.A.2.3]` Trigger `sync_role_feature_from_subscription`: cuando sub activa/cancela, update derived `role_features` caché si aplica.

**Criterio de done del módulo:**
- [ ] Subscriptions + invoices persistidos y consultables por user.

#### MÓDULO 23.A.3 — Tabla `usage_counters` (resetea mensual)

**Pasos:**
- `[23.A.3.1]` Schema:
  ```sql
  CREATE TABLE usage_counters (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL REFERENCES feature_registry(key),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    used INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, feature_key, period_start)
  );
  CREATE INDEX ON usage_counters (period_end) WHERE used > 0;
  ```
- `[23.A.3.2]` Stored function `increment_usage(user_id, feature_key, delta)` atómica con ON CONFLICT UPDATE.
- `[23.A.3.3]` Stored function `get_usage(user_id, feature_key)` retorna uso del periodo vigente.

**Criterio de done del módulo:**
- [ ] Increment concurrente-seguro.
- [ ] Reset mensual via cron (MÓDULO 23.F.1).

### BLOQUE 23.B — Stripe Products + Prices setup

#### MÓDULO 23.B.1 — Script sync `scripts/stripe/setup-products.ts`

**Pasos:**
- `[23.B.1.1]` Script Node TS que lee `plans` de BD + crea/actualiza Stripe Products con `stripe.products.upsert` (vía metadata.internal_plan_id).
- `[23.B.1.2]` Por plan → crea 2 Prices (monthly + annual) con metadata.plan_id.
- `[23.B.1.3]` Update `plans.stripe_product_id` con respuesta.
- `[23.B.1.4]` Idempotente — correr varias veces no duplica.
- `[23.B.1.5]` Ambientes: `STRIPE_SECRET_KEY_TEST` y `STRIPE_SECRET_KEY_LIVE` separados.
- `[23.B.1.6]` Run via `npm run stripe:sync`.

**Criterio de done del módulo:**
- [ ] Dashboard Stripe muestra 12 productos correctos.
- [ ] Re-run no crea duplicados.

#### MÓDULO 23.B.2 — Stripe Tax + multi-country

**Pasos:**
- `[23.B.2.1]` Activar Stripe Tax automatic calc en dashboard Stripe (country registrations MX, CO, AR, BR, CL).
- `[23.B.2.2]` Configurar tax codes: `txcd_10103000` (SaaS).
- `[23.B.2.3]` Customer billing address required al checkout — Stripe Tax calcula IVA/ICMS.
- `[23.B.2.4]` Currency mapping: MX→MXN, CO→COP, AR→ARS, BR→BRL, CL→CLP. Usar `currency_options` en Price para multi-currency pricing (o Price separados por país si pricing diferente).

**Criterio de done del módulo:**
- [ ] Test checkout MX: IVA 16% calculado auto.
- [ ] Test checkout CO: IVA 19% calculado auto.

### BLOQUE 23.C — Stripe Checkout + Customer Portal

#### MÓDULO 23.C.1 — Checkout flow

**Pasos:**
- `[23.C.1.1]` Route `/api/billing/create-checkout-session` POST con body `{ planId, annual?, returnUrl }`:
  1. Auth check.
  2. Fetch `plans.stripe_product_id` + price.
  3. Crear/recuperar `stripe_customer_id` (usa `profiles.stripe_customer_id`, create si null).
  4. `stripe.checkout.sessions.create` con mode='subscription', line_items=[price], customer=stripe_customer_id, success_url=`${returnUrl}?session_id={CHECKOUT_SESSION_ID}`, cancel_url, allow_promotion_codes=true, tax_id_collection.enabled=true, automatic_tax.enabled=true, metadata={ internal_user_id, internal_plan_id }, subscription_data.trial_period_days=plan.trial_days.
  5. Retorna session.url → client redirige.
- `[23.C.1.2]` Callback success page `/billing/success?session_id=` muestra confirmación + trigger refetch `useSubscription()`.
- `[23.C.1.3]` Pricing page `/pricing` 3 tabs (Asesor/Dev/API) × 4 columnas tiers + features comparison table + monthly/annual toggle + CTA "Empezar trial 14 días" (si free→trial) o "Suscribirse".

**Criterio de done del módulo:**
- [ ] User free hace checkout → redirige Stripe → vuelve → subscription activa en <30s (post webhook).
- [ ] Pricing page i18n + multi-currency.

#### MÓDULO 23.C.2 — Customer Portal

**Pasos:**
- `[23.C.2.1]` Route `/api/billing/create-portal-session` POST:
  - `stripe.billingPortal.sessions.create({ customer, return_url })` → retorna URL.
- `[23.C.2.2]` UI `/settings/billing` con:
  - Plan actual + status + próxima renovación.
  - Usage counters (bars con % usado vs limit).
  - Invoices últimos 12 meses.
  - Botón "Administrar suscripción" → Customer Portal.
  - Botón "Cambiar plan" (upgrade inmediato con proration, downgrade al final del periodo).
- `[23.C.2.3]` Portal config: allow_payment_method_update, invoice_history, subscription_cancel (feedback reasons obligatorio), subscription_pause.

**Criterio de done del módulo:**
- [ ] User cambia tarjeta en portal → sync OK.
- [ ] User cancela → status='canceled' con cancel_at al fin de periodo.

#### MÓDULO 23.C.3 — Webhook `/api/webhooks/stripe`

**Pasos:**
- `[23.C.3.1]` Route POST con `constructEvent(body, signature, webhookSecret)`.
- `[23.C.3.2]` Handlers eventos:
  - `customer.subscription.created/updated/deleted` → sync `subscriptions` row.
  - `invoice.paid` → INSERT `billing_history`, dispatch webhook `payment_received`.
  - `invoice.payment_failed` → notif payment_overdue + trigger dunning.
  - `checkout.session.completed` → link user_id ↔ stripe_customer_id si no existe.
- `[23.C.3.3]` Idempotency: `event.id` persisted en `stripe_events_processed` para evitar double-process.

**Criterio de done del módulo:**
- [ ] Webhook responde 200 <1s.
- [ ] Re-delivery webhook no duplica billing_history.

### BLOQUE 23.D — Feature gating runtime

#### MÓDULO 23.D.1 — `shared/lib/billing/check-feature.ts`

**Pasos:**
- `[23.D.1.1]` Export `async function checkFeature(userId, featureKey): Promise<{ allowed: boolean, limit?: number, used?: number, remaining?: number, plan: string, upgradeUrl?: string }>`:
  1. `SELECT resolve_features(userId)` → map con todos features + valores.
  2. Si feature es boolean → `{ allowed: value }`.
  3. Si feature es numeric (limit) → `SELECT get_usage(userId, featureKey)` → compare con limit.
  4. Retorna allowed=false si used >= limit.
  5. Incluye `upgradeUrl='/pricing?highlight=' + nextTier` cuando denied.
- `[23.D.1.2]` Export `async function countFeatureUsage(userId, featureKey): Promise<number>` (query BD activa tabla mapeada: ej `max_contacts` → `SELECT count(*) FROM contactos WHERE user_id`, etc.). Esto se usa solo si `usage_counters` no tiene el dato (fallback).
- `[23.D.1.3]` Export `async function incrementUsage(userId, featureKey, delta=1)` atomic via SQL function.
- `[23.D.1.4]` Cache en memoria (LRU 5min) por (userId, featureKey) para hot path (tRPC middleware).

**Criterio de done del módulo:**
- [ ] `checkFeature('user-abc', 'ai_dossiers_month')` retorna estado correcto.
- [ ] Cache hit en <1ms, miss en <20ms.

#### MÓDULO 23.D.2 — tRPC middleware `requireFeature`

**Pasos:**
- `[23.D.2.1]` Crear middleware `requireFeature(featureKey, { autoIncrement?: true })`:
  ```ts
  export const requireFeature = (key: string, opts={autoIncrement:false}) => 
    middleware(async ({ ctx, next }) => {
      const check = await checkFeature(ctx.user.id, key);
      if (!check.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: `Feature ${key} not in plan`, cause: { upgradeUrl: check.upgradeUrl, used: check.used, limit: check.limit } });
      const result = await next();
      if (opts.autoIncrement && !result.error) await incrementUsage(ctx.user.id, key);
      return result;
    });
  ```
- `[23.D.2.2]` Aplicar a procedures: `asesorCRM.createDossier` uses `requireFeature('ai_dossiers_month', {autoIncrement:true})`. `dev.createProject` uses `requireFeature('max_projects')`. Etc.
- `[23.D.2.3]` Tests: free plan max_contacts=50 → crear contacto 51 falla con FORBIDDEN + upgradeUrl.

**Criterio de done del módulo:**
- [ ] Middleware aplicado a 20+ procedures críticos.
- [ ] UI muestra upgrade modal ante FORBIDDEN con upgradeUrl.

#### MÓDULO 23.D.3 — UI indicators

**Pasos:**
- `[23.D.3.1]` Componente `<UsageBar featureKey>` progress bar visible en Dashboard (sidebar o pestaña billing) por feature.
- `[23.D.3.2]` Hook `useFeature(key)` devuelve `{ allowed, limit, used, remaining, plan }`.
- `[23.D.3.3]` `<UpgradeBadge>` en header cuando user está en free + tiene 80%+ uso de algún feature.

**Criterio de done del módulo:**
- [ ] Free user cerca límite ve bar roja + upgrade CTA.

### BLOQUE 23.E — Stripe Connect + Fee 0.5% venta

#### MÓDULO 23.E.1 — Connected accounts (developers)

**Pasos:**
- `[23.E.1.1]` Onboarding dev: al firstactivate producto dev, flow `/onboarding/connect` lanza Stripe Connect Express Account Onboarding Link.
- `[23.E.1.2]` Webhook `/api/webhooks/stripe-connect` handler eventos `account.updated`, `account.application.authorized` → update `developer_profiles.stripe_connected_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled`.
- `[23.E.1.3]` Check pre-venta: antes cerrar operación verificar `stripe_charges_enabled=true`; si no → notif dev "Completar KYC Stripe para recibir cobros".

**Criterio de done del módulo:**
- [ ] Dev pasa KYC Stripe → charges_enabled=true persistido.

#### MÓDULO 23.E.2 — Aplication fee 0.5% en cierre operación

**Pasos:**
- `[23.E.2.1]` En FASE 18 (Legal+Pagos) cuando operación.status='cerrada' y existe escrow Stripe PaymentIntent:
  1. Compute `valor_cierre_cents` (desde operaciones.precio_cierre).
  2. Compute `application_fee = valor_cierre_cents * 0.005` (redondeo floor).
  3. Stripe `paymentIntents.create({ amount: valor_cierre, currency: 'MXN', transfer_data: { destination: stripe_connected_account_id }, application_fee_amount: application_fee })`.
- `[23.E.2.2]` Registro `platform_fees` (operation_id, amount_cents, currency, stripe_transfer_id, status, created_at).
- `[23.E.2.3]` Dashboard admin `/admin/revenue` muestra fees cobradas por periodo.
- `[23.E.2.4]` Para Enterprise con negociación → fee_override_pct en `developer_profiles` (default 0.5, editable by admin con audit trail).

**Criterio de done del módulo:**
- [ ] Operación cierre $10M MXN → DMX cobra $50K MXN application fee.
- [ ] Fee visible en Stripe Dashboard + en `/admin/revenue`.

### BLOQUE 23.F — Crons monetización

#### MÓDULO 23.F.1 — `subscription_usage_reset` (mensual día 1 00:00 UTC)

**Pasos:**
- `[23.F.1.1]` Cron `0 0 1 * *` → ejecuta `cron/usage-reset.ts`:
  - Para cada usuario con subscription activa: reset features de tipo `*_month` (ai_dossiers_month, ai_briefings_month, ai_extractions_month, acm_month, api_queries_day NOT — se resetea daily).
  - Insert nueva row `usage_counters` con `period_start = first day month` + `period_end = last day month` + `used=0`.
- `[23.F.1.2]` Usage diario (api_queries_day): cron `0 0 * * *` reset diario.

**Criterio de done del módulo:**
- [ ] Día 1 mes → contador reseteado.

#### MÓDULO 23.F.2 — `trial_expiry_notification`

**Pasos:**
- `[23.F.2.1]` Cron `0 9 * * *` diario 9am local → detecta subscriptions status='trialing' AND trial_ends_at BETWEEN now() AND now()+interval '3 days' → dispatch notif tipo custom `trial_expiring` (agregar a 20 types si aún no).
- `[23.F.2.2]` Escalation: 7 días antes, 3 días, 1 día, día expiración.

**Criterio de done del módulo:**
- [ ] Trial día 12 → user recibe email warning.

#### MÓDULO 23.F.3 — `payment_retry_dunning`

**Pasos:**
- `[23.F.3.1]` Stripe Smart Retries activa por default — nuestro cron complementario `0 10 * * *` detecta subscriptions status='past_due' >3 días → email personalizado + WA con link retry.
- `[23.F.3.2]` 14 días past_due sin pago → status→canceled + downgrade a free + comunicación final.

**Criterio de done del módulo:**
- [ ] Flow past_due→canceled automatizado.

### BLOQUE 23.G — API externa v1 (7 productos B2B + Estimate + genéricos)

#### MÓDULO 23.G.1 — Endpoints públicos

**Pasos:**
- `[23.G.1.1]` Estructura `app/api/v1/` con route handlers edge function-compatible.
- `[23.G.1.2]` Endpoints (todos requieren API key):
  - `GET /api/v1/scores/livability?lat=X&lon=Y` → **DMX Livability API** (producto #1). Retorna `{ score, components: {F08, N08, N01, N10, N07, H01, H02, N02, N04}, confidence, methodology_link }`.
  - `GET /api/v1/scores/momentum?zone_id=X&period=30d|90d|1y` → **DMX Momentum Index** (producto #2). Response `{ zscore, signal, percentile, trend_30d, trend_90d, components }`.
  - `GET /api/v1/scores/risk?lat=X&lon=Y` → **DMX Risk Score** (producto #3). Multi-risk: seismic + flood + crime + water + market_volatility. `{ overall, factors[], insurance_adjusted_premium }`.
  - `GET /api/v1/scores/project?project_id=X` → score completo proyecto con todos components IE.
  - `GET /api/v1/scores/:scoreType` genérico — param route, opera sobre cualquiera de 108+ scores (`F08`, `A10`, etc.) con query `lat/lon` o `zone_id`. Response estándar `{ value, label, confidence, tier, computed_at }`.
  - `POST /api/v1/estimate` → **DMX Estimate AVM**. Body `{ address|lat/lon, type, surface_m2, recamaras, banos, antiguedad_years, amenidades[], condiciones[] }` → `{ estimate_mxn, range_low, range_high, confidence, comparables[], adjustments, market_context }`. H1 regression lineal (47 vars, 12 fuentes).
  - `POST /api/v1/site-selection` → **DMX Site Selection** (producto #4, H3 pero endpoint stub). Body `{ vertical: 'residential'|'retail'|'oficinas', budget_mxn, preferences }` → `{ ranked_zones[], rationale }`. H1 stub con mock + marcar `product_active=false`.
  - `GET /api/v1/reports/market?zone_id=X&format=pdf|json` → **DMX Market Intelligence Reports** (producto #5). Retorna PDF URL signed o JSON con secciones.
  - `GET /api/v1/rankings?index=livability|momentum|risk|opportunity&scope=colonia|alcaldia&country=MX&limit=10` → top N zonas por índice.
  - `GET /api/v1/neighborhood-report?zone_id=X` → reporte barrio amplio (profile + scores + comparables + photos).
  - `POST /api/v1/compass` stub (producto #6 H3) — 501 Not Implemented + upsell contact.
  - `POST /api/v1/knowledge-graph/query` stub (producto #7 H3) — 501.
- `[23.G.1.3]` Todos response envelope: `{ data, meta: { request_id, rate_limit: { limit, remaining, reset_at }, cost_credits: 1, plan: 'pro' } }`.

**Criterio de done del módulo:**
- [ ] 9 endpoints H1 operativos + 2 stubs H3.
- [ ] OpenAPI spec válido en `/api/v1/openapi.json`.

#### MÓDULO 23.G.2 — `POST /api/v1/estimate` implementación AVM H1

**Pasos:**
- `[23.G.2.1]` Input validation Zod: lat/lon OR address (geocoded via Mapbox), type ENUM, surface_m2 req, recamaras, banos, antiguedad_years, amenidades[], condiciones[].
- `[23.G.2.2]` Feature engineering: fetch 47 variables:
  - market_prices_secondary (5km radius 24mo) → baseline P/m²
  - project_scores zona → DMX Score + Livability + Momentum
  - zone_scores → N01..N11
  - macro_series → INEGI price_index
  - geo_data_points → DENUE density + FGJ crime + GTFS accessibility
  - operaciones cerradas (calibración) → recent transactions distance-weighted
  - Características propiedad: surface, recámaras, baños, antigüedad, amenidades.
- `[23.G.2.3]` Modelo H1: regression lineal multivariada entrenada offline en notebook → coeficientes persisted en `ie_model_params` (model_id, version, params jsonb, trained_at).
- `[23.G.2.4]` Inference: `estimate = intercept + Σ(β_i × x_i)`. Range 90% CI via residual standard error.
- `[23.G.2.5]` Comparables: top 5 transacciones similares (cosine distance en feature space).
- `[23.G.2.6]` Confidence score [0,1] = función de data density + model R².
- `[23.G.2.7]` Retrain cron `estimate_model_retrain` mensual con transacciones nuevas → H2 migra a gradient boosting (Fase 29).

**Criterio de done del módulo:**
- [ ] Test inference <800ms p95.
- [ ] Error rate sobre holdout set <20% H1 (target <15% H3).

#### MÓDULO 23.G.3 — Middleware compartido `validateApiKey → checkRateLimit → logRequest → formatResponse`

**Pasos:**
- `[23.G.3.1]` Edge middleware `/api/v1/_middleware.ts`:
  1. Extract `Authorization: Bearer dmx_live_XXX` o `dmx_test_YYY`.
  2. `validateApiKey(apiKey)`: lookup `api_keys` por `key_hash` (bcrypt compare); retorna `{ userId, plan, keyId, environment }`.
  3. Si plan free y endpoint no en allowed list → 403.
  4. `checkRateLimit(keyId, plan)`: consultar `api_rate_limits` (sliding window 60s per key), compare con plan.api_queries_day/86400 * 60. Si exceeds → 429 + header `Retry-After`.
  5. `logRequest(keyId, path, method, status, duration_ms, ip, user_agent)` INSERT `api_request_logs`.
  6. `formatResponse(plan, data)`: strip fields per plan (ej: free retorna solo `score` + `label`, pro retorna todo + components + historical).
  7. Inject rate limit headers.
- `[23.G.3.2]` Rate limit algo: Upstash Redis sliding window counter (o Vercel KV); fallback a PG con advisory locks si Redis down.

**Criterio de done del módulo:**
- [ ] Free plan 100 queries/día → query 101 retorna 429.
- [ ] Pro plan accede components + historical; free solo score+label.

#### MÓDULO 23.G.4 — Schema `api_keys` + `api_request_logs` + `api_rate_limits`

**Pasos:**
- `[23.G.4.1]` Schema:
  ```sql
  CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of 'dmx_live_XXX' or 'dmx_test_XXX'
    key_prefix TEXT NOT NULL, -- 'dmx_live_' or 'dmx_test_'
    plan_id TEXT NOT NULL REFERENCES plans(id),
    environment TEXT NOT NULL CHECK (environment IN ('sandbox','prod')),
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
    requests_today INT NOT NULL DEFAULT 0,
    requests_month INT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX ON api_keys (key_hash) WHERE revoked_at IS NULL;
  CREATE TABLE api_request_logs (
    id BIGSERIAL PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INT NOT NULL,
    duration_ms INT NOT NULL,
    ip INET,
    user_agent TEXT,
    country_code TEXT,
    cost_credits INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
  ) PARTITION BY RANGE (created_at);
  -- Crear partitions mensuales via pg_partman.
  CREATE TABLE api_rate_limits (
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    requests INT NOT NULL DEFAULT 0,
    PRIMARY KEY (api_key_id, window_start)
  );
  ```
- `[23.G.4.2]` Purge logs >90 días (cron `api_logs_purge` diario).

**Criterio de done del módulo:**
- [ ] Particiones mensuales auto.
- [ ] Logs purge operativo.

### BLOQUE 23.H — API Dashboard admin/dev

#### MÓDULO 23.H.1 — UI `/developer/api` (portal dev)

**Pasos:**
- `[23.H.1.1]` Tabs: Keys, Usage, Logs, Webhooks (FASE 22), Docs, Playground.
- `[23.H.1.2]` Keys: crear (modal copiar secret 1 vez), revocar, rotar. Naming + scope + environment (sandbox/prod).
- `[23.H.1.3]` Usage: chart daily requests últimos 30 días + distribución por endpoint + error rate.
- `[23.H.1.4]` Logs: tabla últimos 200 requests (filtros status/path/timestamp).

**Criterio de done del módulo:**
- [ ] Dev crea key → llama API → usage aparece en dashboard.

#### MÓDULO 23.H.2 — UI `/admin/api-metrics`

**Pasos:**
- `[23.H.2.1]` Vista global: requests/day total, top consumers (top 10 api_keys por volumen), revenue proyectada (sum subs plans api_*), errors top 5.
- `[23.H.2.2]` Alerts: consumer que pasó de pro a >110% plan límite → email oportunidad upsell.
- `[23.H.2.3]` Export CSV logs para billing analysis.

**Criterio de done del módulo:**
- [ ] Admin ve top 10 consumers con revenue attribution.

### BLOQUE 23.I — API Playground + OpenAPI docs

#### MÓDULO 23.I.1 — `/api/playground` interactive docs

**Pasos:**
- `[23.I.1.1]` Embed Swagger UI o Scalar pointing a `/api/v1/openapi.json`.
- `[23.I.1.2]` Sandbox mode: inyecta `dmx_test_XXX` del user actual automáticamente.
- `[23.I.1.3]` Examples request/response realistas por endpoint.
- `[23.I.1.4]` Changelog page `/api/changelog` con versiones API + breaking changes.

**Criterio de done del módulo:**
- [ ] Dev ejecuta llamada desde playground → ve respuesta en tiempo real.

#### MÓDULO 23.I.2 — OpenAPI spec auto-generado

**Pasos:**
- `[23.I.2.1]` Usar `zod-openapi` (o hono-openapi) para generar spec desde Zod schemas de cada endpoint.
- `[23.I.2.2]` Publish en `/api/v1/openapi.json` + `/api/v1/openapi.yaml`.
- `[23.I.2.3]` SDKs clientes generar con openapi-generator (TypeScript, Python) — H2 (pin Fase 29).

**Criterio de done del módulo:**
- [ ] Spec válido pasado `openapi validate`.

### BLOQUE 23.J — API Sandbox vs Prod

#### MÓDULO 23.J.1 — Dual environment

**Pasos:**
- `[23.J.1.1]` Prefijos key: `dmx_test_` (sandbox) vs `dmx_live_` (prod).
- `[23.J.1.2]` Sandbox: responses con datos sintéticos + flag `is_sandbox=true`, no cuenta contra cuota plan, rate limit alto (1000/min).
- `[23.J.1.3]` Prod: datos reales, cuenta cuota, rate limit por plan.
- `[23.J.1.4]` Dev puede tener ambas keys simultáneamente.

**Criterio de done del módulo:**
- [ ] Sandbox key retorna datos sintéticos clearly labeled.

### BLOQUE 23.K — UPG 7.12 (99-110) bulk/bancos/widgets/batch

#### MÓDULO 23.K.1 — Bulk endpoints

**Pasos:**
- `[23.K.1.1]` `POST /api/v1/scores/bulk` body `{ points: [{lat, lon}, ...] max 1000 }` → batch response array. Solo plans pro+enterprise. Cuenta 1 credit per point.
- `[23.K.1.2]` `POST /api/v1/estimate/bulk` para aseguradoras/bancos — input CSV signed URL, async job (queue), callback webhook cuando done.

**Criterio de done del módulo:**
- [ ] 1000 puntos procesados <10s p99.

#### MÓDULO 23.K.2 — Flows específicos bancos/aseguradoras/retailers

**Pasos:**
- `[23.K.2.1]` Documentación tutorial `/docs/use-cases/banks`: credit scoring con risk + livability + momentum → response adjusted-risk premium.
- `[23.K.2.2]` `/docs/use-cases/insurers`: insurance pricing con seismic + flood + crime + property feat.
- `[23.K.2.3]` `/docs/use-cases/retailers`: site-selection con trade area + DENUE competitive + demographic.

**Criterio de done del módulo:**
- [ ] 3 use-case docs published en `/docs/use-cases/*`.

#### MÓDULO 23.K.3 — Widget embed

**Pasos:**
- `[23.K.3.1]` `<script src="https://widget.desarrollosmx.com/v1/score-widget.js">` permite portales embed badge DMX Score en sus listings.
- `[23.K.3.2]` Widget params via data-attributes: `data-dmx-lat`, `data-dmx-lon`, `data-dmx-size`.
- `[23.K.3.3]` Server-side rendering al pedir widget → devuelve SVG/PNG + link back a DMX.
- `[23.K.3.4]` Counts como API request (charged al site dueño del key).

**Criterio de done del módulo:**
- [ ] Widget embed en página demo → renderiza badge <500ms.

### BLOQUE 23.L — Multi-country payments

#### MÓDULO 23.L.1 — MercadoPago adapter LATAM

**Pasos:**
- `[23.L.1.1]` Fallback para users CO/AR/BR/CL si prefieren local: `mercadopago` SDK + webhook dedicated.
- `[23.L.1.2]` UI checkout selector (si country != MX) → "Pagar con Stripe" vs "Pagar con MercadoPago".
- `[23.L.1.3]` Mappings subscription: MP preapprovals → sync a `subscriptions` table.

**Criterio de done del módulo:**
- [ ] User CO checkout MP → subscription creada + billing_history alineada.

### BLOQUE 23.N — Game-changer bridges

#### MÓDULO 23.N.1 — API H1 foundation + FASE 30 H2 bridge (GC-1)

**Pasos:**
- `[23.N.1.1]` Publicar página pública `/developers` (ya apuntada por navbar landing FASE 21): secciones Quickstart, API Reference (link a `/api/playground`), Pricing (link a /pricing tab API), Use cases (bancos, aseguradoras, retailers), Changelog, Status page link, Contact sales.
- `[23.N.1.2]` Exponer el `openapi.json` generado en BLOQUE 23.I con versión `v1` y marcar `info.x-product = "DMX API v1"`.
- `[23.N.1.3]` Developer onboarding wizard: signup → plan selection → first key generated → primer request example → success state (ready para FASE 30 formalizar DX + SDKs).
- `[23.N.1.4]` "H2 stub" explicit: secciones `/developers/sdks` (link TS + Python coming H2), `/developers/webhooks-as-code` (coming H2), `/developers/marketplace` (integraciones terceros coming H2) → banner "Próximamente FASE 30" + formulario waitlist.
- `[23.N.1.5]` PostHog tracking: `developer_portal_viewed`, `api_key_created`, `first_api_request` → funnel analysis.

**Criterio de done del módulo:**
- [ ] /developers publicada y accesible sin auth.
- [ ] OpenAPI spec v1 consumable con curl/Postman.
- [ ] Waitlist H2 funcional.

#### MÓDULO 23.N.2 — DMX Insights H2 pin (GC-22)

**Pasos:**
- `[23.N.2.1]` Crear sección pública `/insights` (stub H1 con teaser + newsletter signup + 3 artículos sample; full editorial H2):
  - Newsletter signup (reusa `newsletter_subscriptions` FASE 21).
  - Content strategy: "Monthly MX Real Estate Pulse" (basado en `/indices`), "Zone Deep Dives" (Del Valle Q1, Polanco Q2), "IE Insights" (scores behind-the-scenes).
  - Podcast placeholder (H2): feed placeholder + "Suscríbete en Spotify/Apple" links + RSS.
- `[23.N.2.2]` Monetización prevista H2: sponsored slots en newsletter (devs anunciando lanzamientos), podcast ads, paid premium tier ($99 MXN/mes) con reports trimestrales profundos.
- `[23.N.2.3]` H1 solo captura: newsletter opt-in + topic preferences (survey al signup: "¿Qué contenido quieres? [zonas, índices, devs, inversión]").
- `[23.N.2.4]` Cross-promoción: CTA "Suscríbete a DMX Insights" en emails transaccionales (weekly briefing, discover weekly, annual wrapped).
- `[23.N.2.5]` Feature flag `insights.public_page` ON H1, `insights.premium_tier` OFF H1.

**Criterio de done del módulo:**
- [ ] /insights page live con newsletter signup funcional.
- [ ] Preferences survey persiste en `newsletter_subscribers.interest_areas`.
- [ ] CTA cross-promoción en ≥2 emails existentes.

### BLOQUE 23.M — ADR-008 compliance checks

#### MÓDULO 23.M.1 — Validaciones finales

**Pasos:**
- `[23.M.1.1]` Test coverage: `checkFeature` unit tests 100% branches (allow/deny/numeric/boolean/cache hit).
- `[23.M.1.2]` Audit log: todas las decisiones gating con outcome en `audit_log` (para soportar disputas).
- `[23.M.1.3]` Documentation `/docs/billing/feature-matrix.md` auto-gen desde BD mostrando tabla 12 planes × 30+ features.

**Criterio de done del módulo:**
- [ ] Matrix pública alineada con BD.
- [ ] Audit log persiste decisiones ban.

## Criterio de done de la FASE

- [ ] 12 planes seed + features matrix completa.
- [ ] Stripe Products sync operativo (test + live).
- [ ] Checkout flow + Customer Portal funcionales MX + LATAM.
- [ ] Webhook Stripe + Stripe Connect procesando eventos críticos con idempotency.
- [ ] Feature gating `checkFeature()` + tRPC middleware aplicado a 20+ procedures.
- [ ] Stripe Connect application_fee 0.5% se cobra en cada operación cerrada.
- [ ] Crons: `subscription_usage_reset`, `trial_expiry_notification`, `payment_retry_dunning` activos.
- [ ] 9 endpoints API v1 H1 + 2 stubs H3 + DMX Estimate AVM operativo con error <20%.
- [ ] Middleware compartido `validateApiKey → checkRateLimit → logRequest → formatResponse` aplicado.
- [ ] Schema `api_keys` (bcrypt) + `api_request_logs` particionado + `api_rate_limits` sliding.
- [ ] API Dashboard dev + admin con usage/revenue/errors/top consumers.
- [ ] Playground + OpenAPI spec + Changelog.
- [ ] Sandbox (`dmx_test_`) vs Prod (`dmx_live_`) funcional.
- [ ] UPG 7.12: bulk endpoints, use-case docs bancos/aseguradoras/retailers, widget embed, batch async jobs.
- [ ] MercadoPago adapter LATAM funcional.
- [ ] Test pentest APIs: no se puede bypassear rate limit; keys revocadas denegadas <1s propagación cache.
- [ ] PostHog events: `subscription_created`, `subscription_upgraded`, `subscription_canceled`, `api_request`, `api_ratelimit_hit`, `feature_gate_denied`.
- [ ] Tag git `fase-23-complete`.

## Features añadidas por GCs (delta v2)

- **F-23-30** Developers portal público `/developers` (GC-1 foundation H1 → FASE 30 H2 bridge) con OpenAPI + quickstart + waitlist.
- **F-23-31** DMX Insights H2 pin (GC-22): `/insights` teaser + newsletter + content strategy stub + cross-promoción.

## E2E VERIFICATION CHECKLIST

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-23-complete`.

- [ ] Todos los botones UI mapeados en 03.13_E2E_CONNECTIONS_MAP
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas
- [ ] Todos los triggers/cascades testeados
- [ ] Permission enforcement validado para cada rol
- [ ] Loading + error + empty states implementados
- [ ] Mobile responsive verificado
- [ ] Accessibility WCAG 2.1 AA
- [ ] audit-dead-ui.mjs pasa sin violations (0 dead)
- [ ] Playwright smoke tests covering happy paths pasan
- [ ] PostHog events tracked para acciones clave
- [ ] Sentry captures errors (validación runtime)
- [ ] STUBs marcados explícitamente con // STUB — activar FASE XX

## Próxima fase

FASE 24 — Observabilidad + SRE (Sentry + PostHog + logs + SLO/SLI + runbooks + DR).

---

## Laterals pipeline (proposed durante ejecución previa)

Ver registro maestro: `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`

Aplican en esta fase:
- **L11 Closing-as-a-Service revenue** (Stripe Atlas pattern) — pricing + monetización del bundle definido en FASE 18. Sugerido: 1-2% del valor de transacción + tier "Concierge" $5K-15K para closings premium. Wire en feature_registry como producto separado.
- **L12 DMX Pro Terminal** (Bloomberg Terminal pattern) — interface premium con AVM + portfolio analytics + market alerts + comparables avanzados, suscripción $299-999/mes. Mercado pro LATAM underserved. Bloque sugerido: nuevo BLOQUE 23.PRO_TERMINAL como producto B2B premium en feature_registry.
- **L13 DMX Property API como infraestructura B2B** (Plaid pattern) — TODA la intelligence (scores, índices, comparables, AVM, risk) expuesta como API unificada con SDK + docs públicas. Stripe-like pricing $0.01-1.00/call. Bloque sugerido: BLOQUE 23.API_AS_PRODUCT (alineado ADR-013) — formalizar SDK npm + docs developer + API key management + observabilidad.
- **L23 DMX Concierge Onboarding B2B** (Stripe Atlas pattern) — proceso onboarding asistido (1-on-1 + setup) para clientes B2B (devs/asesores/aseguradoras), $5K-15K por setup. Bloque sugerido: nuevo BLOQUE 23.CONCIERGE como tier premium en feature_registry — incluye playbook humano + setup técnico personalizado + casos de uso documentados.

Al ejecutar FASE 23, revisar status en pipeline maestro y confirmar incorporación al scope.

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
**Pivot revisión:** 2026-04-18 (biblia v2 moonshot — GCs integrados + E2E checklist)
