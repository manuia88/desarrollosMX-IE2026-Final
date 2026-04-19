# FASE 33 — Data Ecosystem bilateral

> **Duración estimada:** 4 sesiones Claude Code (~16 horas)
> **Dependencias:** [FASE 30 — Platform API](./FASE_30_PLATFORM_API.md)
> **Bloqueantes externos:**
> - Legal review contracts por país (MX: LFPDPPP + LFPDPPP-Reglamento; BR: LGPD; AR: Ley 25.326; CO: Ley 1581; CL: Ley 19.628)
> - Abogados proyecto revisan templates Starter/Pro/Enterprise
> - AWS S3 bucket `dmx-partners-exports` con signed URLs (o Vercel Blob paid tier)
> - `RESEND_API_KEY` ya existe — canal "DMX Insights" newsletter
> - OpenMined o SmartNoise para differential privacy (H2/H3)
> - Cuenta Clay.com o Apollo.io para outbound sales enrichment
> **Horizonte:** H2
> **Resultado esperado:** Ecosistema bilateral de datos — DMX vende datos a partners (portales, fintechs, aseguradoras, REITs, gobierno) vía API + bulk exports, y partners contribuyen datos agregados en reverso con value-in-kind (credit). Partner portal `/partners`, contract tiers ($5K/$25K/$250K+ MRR), compliance engine (LFPDPPP/GDPR/LGPD + k-anonymity + differential privacy), reverse contribution pipeline, DMX Insights newsletter mensual con analytics sobre partner data, SLA dashboard, audit log para LFPDPPP ARCO. Tag `fase-33-complete`.
> **Priority:** [H2]

## Contexto y objetivo

FASE 30 expuso la API técnicamente. Esta fase monetiza el **dataset propio** (el moat real de DMX: 2+ años de scores temporales + acumulación ventas propias) y cierra el ciclo virtuoso: partners pagan por datos → contribuyen datos propios → DMX enriquece dataset → más valioso para próximos partners.

Rationale: [ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-013](../01_DECISIONES_ARQUITECTONICAS/ADR-013_API_AS_PRODUCT.md), [ADR-017 Data Ecosystem Revenue](../01_DECISIONES_ARQUITECTONICAS/ADR-017_DATA_ECOSYSTEM_REVENUE.md). En H2 target es 10 contratos con MRR combinado $200K+; en H3 con international expansion (FASE 38) target es 50+ contratos con MRR $2M+.

Pattern de referencia: Bloomberg (data + terminals), Cherre (knowledge graph real estate), Zillow (data licensing business unit), CoStar ($2B+/año just data licensing). La diferencia DMX: **bilateral desde día 1** — no solo vendemos, también incorporamos data de partners vía agreement formales.

Principios:
- **Compliance primero**. Cada export pasa por k-anonymity (k≥50 por default), LFPDPPP ARCO respected, data minimization, retention policy (6-12 meses por producto).
- **Audit everything**. Cada query partner registrada con timestamp, endpoint, rows returned, partner_user.
- **No re-identification**. Exports agregados solamente; filas individuales nunca para scores o transacciones.
- **Reverse value-in-kind**. Partner que contribuye data aggregada recibe credits en plan. Reduce cost acquisition dataset.

## Bloques

### BLOQUE 33.A — Partner portal `/partners`

#### MÓDULO 33.A.1 — Auth + onboarding + dashboard

**Pasos:**
- `[33.A.1.1]` Ruta `/partners` con auth dedicada (partners = Supabase `auth.users` con `role='partner'`). Separación clara de users comunes (asesor/comprador/dev).
- `[33.A.1.2]` Onboarding flow 4 pasos:
  1. Company info (razón social, country, tax ID).
  2. Use case declarations (qué datos, cómo, por qué) — texto libre + taxonomía predefinida.
  3. Legal acceptance (contracto tier auto-seleccionado según use case).
  4. Stripe subscription activation + API keys provision.
- `[33.A.1.3]` Dashboard partner con:
  - Usage mensual (requests, bulk exports downloaded)
  - Data contributed (si aplica reverse)
  - Contract terms visible (tier, limits, renewal)
  - SLA metrics (uptime, p95 latency, freshness)
  - Support tickets con CS assigned
- `[33.A.1.4]` Migration tablas:
  ```sql
  CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    tier TEXT NOT NULL CHECK (tier IN ('starter','pro','enterprise')),
    contract_start DATE NOT NULL,
    contract_end DATE,
    use_cases TEXT[],
    stripe_customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','churned')),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE public.partner_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('admin','analyst','viewer')),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE UNIQUE INDEX idx_partner_users_unique ON public.partner_users (partner_id, user_id);
  ```

**Criterio de done del módulo:**
- [ ] Portal live + onboarding funcional.
- [ ] Dashboard mostrando métricas reales.

### BLOQUE 33.B — Contract tiers

#### MÓDULO 33.B.1 — Starter / Pro / Enterprise

**Pasos:**
- `[33.B.1.1]` Tabla + seed `partner_contracts`:
  ```sql
  CREATE TABLE public.partner_contract_tiers (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monthly_price_usd_minor BIGINT NOT NULL,
    api_requests_per_day INT,
    bulk_exports_per_month INT,
    countries_included CHAR(2)[],
    data_categories TEXT[],
    sla_uptime_pct NUMERIC(5,2),
    sla_p95_latency_ms INT,
    freshness_sla_hours INT,
    support_tier TEXT NOT NULL,
    features JSONB NOT NULL DEFAULT '{}'::jsonb
  );
  INSERT INTO public.partner_contract_tiers VALUES
    ('starter', 'Starter', 500000, 10000, 2, ARRAY['MX'], ARRAY['scores','macro'], 99.5, 1000, 24, 'email', '{"custom_reports": false}'),
    ('pro', 'Pro', 2500000, 100000, 12, ARRAY['MX','CO','AR'], ARRAY['scores','macro','market','demographics'], 99.9, 500, 6, 'slack', '{"custom_reports": true, "white_label": false}'),
    ('enterprise', 'Enterprise', 25000000, NULL, NULL, ARRAY['MX','CO','AR','BR','CL'], ARRAY['*'], 99.95, 250, 1, 'dedicated_cs', '{"custom_reports": true, "white_label": true, "sla_credits": true}');
  ```
  (precios en USD minor: Starter $5K, Pro $25K, Enterprise $250K+ mensual).
- `[33.B.1.2]` Enterprise custom — negociable; modelo base pero custom adds (ej: SLA 99.99%, dedicated sandbox, private API version).
- `[33.B.1.3]` Upgrade/downgrade flow — requiere approval admin DMX + legal review si tier change across jurisdicción.

**Criterio de done del módulo:**
- [ ] 3 tiers en BD.
- [ ] Upgrade flow documentado.

### BLOQUE 33.C — Data packaging

#### MÓDULO 33.C.1 — API access + bulk exports

**Pasos:**
- `[33.C.1.1]` API access — ya cubierto FASE 30; partner_users tienen API keys con `plan_code='partner_{tier}'` linked a `partner_id`.
- `[33.C.1.2]` Bulk exports — endpoint `POST /v1/partners/exports` crea job de export:
  ```ts
  const schema = z.object({
    dataset: z.enum(['zone_scores','macro_series','market_prices_aggregated','demographics','transit_aggregated']),
    country_code: z.string().length(2),
    filters: z.object({ bbox: BboxSchema.optional(), period_start: z.string().date(), period_end: z.string().date() }),
    format: z.enum(['parquet','csv','jsonl']),
    aggregation_level: z.enum(['zone','municipality','state']).default('zone'),
  });
  ```
- `[33.C.1.3]` Pipeline: DuckDB o ClickHouse embedded Lambda procesa query sobre Postgres read-replica + escribe Parquet a S3, firma URL 7 días TTL.
- `[33.C.1.4]` Metadata en bundle (`_meta.json`): row count, k-anonymity level applied, generation timestamp, DMX license terms, checksum SHA256.
- `[33.C.1.5]` Compliance pre-flight: k-anonymity check — si bucket tiene <50 registros, genera warning en log y expandir aggregation (municipality en lugar zone).

**Criterio de done del módulo:**
- [ ] Bulk export genera Parquet signed URL.
- [ ] k-anonymity enforced.

### BLOQUE 33.D — Compliance engine

#### MÓDULO 33.D.1 — Multi-country privacy

**Pasos:**
- `[33.D.1.1]` Módulo `shared/lib/compliance/privacy.ts` con policies por país:
  - **MX (LFPDPPP)**: ARCO rights — user/partner puede solicitar acceso/rectificación/cancelación/oposición. Aviso de privacidad visible en portal. Retention policy documentado.
  - **BR (LGPD)**: Similar ARCO + DPO requirement. Auditoría cada 6 meses.
  - **AR (Ley 25.326)**: Registro AAIP de base de datos.
  - **CO (Ley 1581)**: Registro SIC (Superintendencia Industria y Comercio).
  - **CL (Ley 19.628)**: Menos estricto pero registra titulares.
- `[33.D.1.2]` k-anonymity library `privacy.kAnonymize(dataset, { k: 50, columns: ['zone_id','age_bucket'] })` — suprime filas que hacen bucket < k.
- `[33.D.1.3]` Differential privacy (H3 pin activable) — `privacy.dpNoise(value, { epsilon: 1.0 })` añade Laplace noise.
- `[33.D.1.4]` DPO dashboard `/admin/compliance/privacy` tracks requests ARCO, response SLA (15 días MX, 15 días BR, 30 días CL).

**Criterio de done del módulo:**
- [ ] Policies por 5 países documentadas.
- [ ] k-anonymity funcional en todos exports.
- [ ] DPO dashboard live.

### BLOQUE 33.E — Reverse data contribution

#### MÓDULO 33.E.1 — Contribution pipeline

**Pasos:**
- `[33.E.1.1]` UI `/partners/contribute` permite a partners subir datasets aggregated:
  - Portal submits monthly new listing counts por CP/colonia.
  - Fintech submits credit approvals aggregated por zona.
  - Aseguradora submits claim rates por zona.
- `[33.E.1.2]` Schema declarations JSON por dataset type. Upload pasa por:
  1. Schema validation
  2. k-anonymity check (rechaza si <50 por bucket)
  3. Anomaly detection (valores outlier → hold for review)
  4. Admin DMX approval
  5. INSERT en tabla destino con `source='partner_{partner_id}'`
- `[33.E.1.3]` Value-in-kind credit — `partner_credits` table:
  ```sql
  CREATE TABLE public.partner_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES public.partners(id),
    amount_usd_minor BIGINT NOT NULL,
    reason TEXT NOT NULL,
    expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[33.E.1.4]` Stripe customer balance synced con credits — se aplican a siguiente invoice.

**Criterio de done del módulo:**
- [ ] Contribution flow funcional end-to-end.
- [ ] Credits sync Stripe.

### BLOQUE 33.F — DMX Insights newsletter

#### MÓDULO 33.F.1 — Bloomberg+WSJ pattern (GC-22)

**Pasos:**
- `[33.F.1.1]` Contenido mensual curado por content team + DMX data analytics:
  - "State of LATAM Real Estate" — top 10 insights del mes basados en dataset propio.
  - Zones alcistas/bajistas.
  - Partners contribuciones relevantes (anonimizadas).
  - Próximos eventos, reports Cushman/CBRE highlights.
- `[33.F.1.2]` Subscribers: partners (free), DMX Pro/Enterprise, opt-in public (con tracking ConvertKit-style).
- `[33.F.1.3]` Delivery via Resend broadcast. Template React Email con data viz (Recharts SSR → PNG via Satori).
- `[33.F.1.4]` Archive público `/insights` — SEO-friendly para acquisition.
- `[33.F.1.5]` Cross-reference [GC-22 Bloomberg/WSJ paid content](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-22).

**Criterio de done del módulo:**
- [ ] Primer issue published.
- [ ] 500+ subscribers al mes 3.

### BLOQUE 33.G — SLA monitoring dashboard

#### MÓDULO 33.G.1 — Per-tier SLA enforcement

**Pasos:**
- `[33.G.1.1]` Métricas continuas (Vercel Analytics + custom Supabase):
  - Uptime — probe externo cada 30s → `sla_probes` table.
  - p95 latency — derivado de Vercel logs.
  - Freshness — lag desde última ingesta por source.
- `[33.G.1.2]` Tabla `sla_incidents`:
  ```sql
  CREATE TABLE public.sla_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id),
    metric TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    impact TEXT NOT NULL,
    credit_applied_usd_minor BIGINT,
    rca_url TEXT
  );
  ```
- `[33.G.1.3]` Auto credit si SLA breach: Enterprise 99.95% uptime → si mes <99.95%, prorratea credit automático.
- `[33.G.1.4]` Status page pública `status.desarrollosmx.com` con history 90 días.

**Criterio de done del módulo:**
- [ ] Dashboard SLA live per partner.
- [ ] Auto-credits funcional.

### BLOQUE 33.H — Audit log para LFPDPPP ARCO

#### MÓDULO 33.H.1 — Full audit trail

**Pasos:**
- `[33.H.1.1]` Middleware global captures:
  - Partner user who accessed
  - Endpoint + parameters (sanitized)
  - Rows returned count + data category
  - Timestamp + IP
- `[33.H.1.2]` Tabla `partner_access_log`:
  ```sql
  CREATE TABLE public.partner_access_log (
    id BIGSERIAL,
    partner_id UUID NOT NULL,
    partner_user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    parameters JSONB,
    rows_returned INT,
    data_categories TEXT[],
    ip INET,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, accessed_at)
  ) PARTITION BY RANGE (accessed_at);
  SELECT partman.create_parent('public.partner_access_log', 'accessed_at', 'native', 'monthly');
  ```
- `[33.H.1.3]` ARCO requests — UI `/compliance/arco/request` (partner admin o citizen) genera request → handled dentro SLA (15 días MX).
- `[33.H.1.4]` Retention policy: audit log 7 años (LFPDPPP). Scheduled partition drop después de 7y.

**Criterio de done del módulo:**
- [ ] Audit log partition particionado.
- [ ] ARCO flow funcional.

## Criterio de done de la FASE

- [ ] Portal `/partners` auth + onboarding + dashboard.
- [ ] 3 contract tiers (Starter $5K, Pro $25K, Enterprise $250K+) en BD.
- [ ] Bulk exports Parquet con signed URL + k-anonymity.
- [ ] Compliance engine multi-country (LFPDPPP/LGPD/Ley 25.326/1581/19.628).
- [ ] DPO dashboard ARCO requests.
- [ ] Reverse contribution pipeline con value-in-kind credits.
- [ ] DMX Insights newsletter mensual published.
- [ ] SLA monitoring dashboard + auto credits.
- [ ] Audit log particionado 7 años retention.
- [ ] RLS en `partners`, `partner_users`, `partner_credits`, `partner_access_log`.
- [ ] Tag git: `fase-33-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados con integration tests
- [ ] Permission enforcement validado para cada rol (partner_admin / partner_analyst / partner_viewer / dmx_admin)

### States
- [ ] Loading states: export job running, dashboard loading, newsletter preview
- [ ] Error states: k-anonymity failed, contract expired, tier limit reached
- [ ] Empty states: "No exports yet", "No contributions yet"
- [ ] Success states: export ready, ARCO request acknowledged

### Quality
- [ ] Mobile responsive verificado
- [ ] Accessibility WCAG 2.1 AA
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded (portal en/es/pt)
- [ ] Core Web Vitals green

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright smoke tests (onboard → first export → contribute → credit applied)
- [ ] PostHog events tracked (partner_onboarded, export_created, contribution_submitted, arco_request)
- [ ] Sentry captures errors
- [ ] Privacy tests — 100% exports k≥50

### Stubs (si aplica)
- [ ] Differential privacy STUB marcado si no activo `// STUB — activar FASE 36+ con ε=1.0`
- [ ] STUBs documentados en §5.B

### Sign-off
- [ ] Legal reviewer: @____ firmó contract tiers
- [ ] DPO reviewer: @____ firmó compliance flow
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-33-complete aplicado post-merge

## Schema SQL adicional

```sql
-- Use case taxonomy (constrained for compliance tracking)
CREATE TABLE public.partner_use_cases_taxonomy (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  regulatory_notes TEXT
);
INSERT INTO public.partner_use_cases_taxonomy VALUES
  ('fintech_credit_scoring', 'Credit scoring con geo signals', 'LFPDPPP ARCO + buró crédito relevante'),
  ('insurance_underwriting', 'Insurance pricing via hazard scores', 'CNSF MX oversight'),
  ('portal_marketplace_enrichment', 'Enriquecer listings portal', 'Attribution to DMX required'),
  ('reit_analytics', 'REIT investment analytics', 'CNBV Fintech approval if tokenized'),
  ('government_observatory', 'Analíticas para gobierno', 'Data sharing agreement formal');

-- Newsletter tracking
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  country_code CHAR(2),
  subscriber_type TEXT CHECK (subscriber_type IN ('partner','dmx_pro','dmx_enterprise','public_optin')),
  stripe_customer_id TEXT,
  opted_in_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);
CREATE INDEX idx_ns_type ON public.newsletter_subscribers (subscriber_type, opted_in_at DESC);

CREATE TABLE public.newsletter_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  body_html TEXT,
  published_at TIMESTAMPTZ,
  opens_count INT DEFAULT 0,
  clicks_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SLA probes (pattern stateless writes)
CREATE TABLE public.sla_probes (
  id BIGSERIAL,
  probe_target TEXT NOT NULL,
  status_code INT,
  latency_ms INT,
  probed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, probed_at)
) PARTITION BY RANGE (probed_at);
SELECT partman.create_parent('public.sla_probes', 'probed_at', 'native', 'monthly');
```

## tRPC procedures nuevos (features/partners/routes/)

- `partners.onboarding.start`, `partners.onboarding.completeStep`, `partners.onboarding.finalize`
- `partners.dashboard.getSummary` (usage, SLA, contract terms, earnings if contribute)
- `partners.exports.create` (Zod input en 33.C.1.2), `partners.exports.status(job_id)`, `partners.exports.list`
- `partners.contributions.submit`, `partners.contributions.listPending` (admin), `partners.contributions.approve|reject` (admin)
- `partners.credits.list`, `partners.credits.apply` (sistema interno)
- `partners.sla.getMetrics(period)`, `partners.sla.listIncidents`
- `partners.compliance.submitArcoRequest`, `partners.compliance.listArcoRequests` (DPO)
- `partners.auditLog.query(filters)` (admin + DPO scope)

## Crons nuevos

- `partner_sla_aggregator` — cada 5 min. Agrega probes uptime + p95 latency + freshness + alerta PagerDuty si breach detectada.
- `partner_auto_credit` — nightly 01:00 UTC. Si SLA breach cerrada, calcula credit prorratear según SLA contract + inserta `partner_credits` + sync Stripe balance.
- `insights_newsletter_dispatch` — mensual día 3 09:00 local por país. Trigger Resend broadcast con audiencia = all active partners + opt-in subscribers.
- `audit_log_partition_prune` — anual enero. Detecta partitions viejas >7 años (LFPDPPP limit) y hace drop. Archiva primero a S3 Glacier compressed.

## Archivos feature-sliced

```
features/partners/
├── components/
│   ├── partner-onboarding-wizard.tsx
│   ├── partner-dashboard.tsx
│   ├── export-builder.tsx
│   ├── contribution-uploader.tsx
│   ├── sla-incidents-table.tsx
│   └── arco-request-form.tsx
├── hooks/
│   ├── use-partner-plan.ts
│   └── use-usage-metrics.ts
├── lib/
│   ├── k-anonymity.ts
│   ├── differential-privacy.ts       (STUB H3 activable ε=1.0)
│   ├── export-pipeline.ts            (DuckDB → Parquet → S3)
│   └── newsletter-generator.tsx      (React Email + Satori charts)
├── routes/
│   └── partners-router.ts
├── schemas/
│   └── partners.schema.ts
└── tests/
    ├── k-anonymity.test.ts
    └── export-pipeline.test.ts
```

## Features implementadas en esta fase (≈ 18)

1. **F-33-01** Partner portal `/partners` con auth dedicada
2. **F-33-02** Onboarding 4 pasos + legal acceptance
3. **F-33-03** Dashboard partner con usage + SLA + contract
4. **F-33-04** Tabla `partners` + `partner_users` con RLS
5. **F-33-05** 3 contract tiers Starter/Pro/Enterprise
6. **F-33-06** Bulk export Parquet/CSV/JSONL signed URL
7. **F-33-07** k-anonymity enforcement global (k≥50)
8. **F-33-08** Compliance engine 5 países LATAM
9. **F-33-09** DPO dashboard ARCO requests
10. **F-33-10** Reverse contribution UI `/partners/contribute`
11. **F-33-11** Schema validation + anomaly detection + admin approval
12. **F-33-12** Value-in-kind credits + Stripe sync
13. **F-33-13** DMX Insights newsletter mensual (Resend + React Email)
14. **F-33-14** Archive público `/insights` SEO-friendly
15. **F-33-15** SLA monitoring dashboard per-tier
16. **F-33-16** Auto SLA credits si breach
17. **F-33-17** Status page `status.desarrollosmx.com`
18. **F-33-18** Audit log `partner_access_log` particionado 7 años

## Próxima fase

[FASE 34 — Creator Economy](./FASE_34_CREATOR_ECONOMY.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
