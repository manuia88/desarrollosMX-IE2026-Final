# FASE 36 — Fractional Investing

> **Duración estimada:** 6 sesiones Claude Code (~24 horas)
> **Dependencias:** [FASE 18 — Legal + Pagos + Escrow](./FASE_18_LEGAL_PAGOS_ESCROW.md), [FASE 33 — Data Ecosystem](./FASE_33_DATA_ECOSYSTEM.md)
> **Bloqueantes externos:**
> - SOFOM entidad constituida México (o alianza con SOFOM autorizada CNBV Fintech Law)
> - CNV Argentina registration para cross-country ops (H3 cuando aplique)
> - CMVM Brasil registration (H3)
> - Legal/regulatory team retained por país — compliance Ley para Regular las Instituciones de Tecnología Financiera (LRITF)
> - Jumio o Veriff enterprise account KYC/AML
> - Custody/escrow partner (BBVA Bancomer Custodia, Actinver, o fintech Kuspit) per país
> - Cuenta Coinbase Custody o Fireblocks (H3 tokenization opcional)
> - Stripe Connect Custom accounts + marketplace model approved por Stripe
> **Horizonte:** H3
> **Resultado esperado:** Democratización de inversión inmobiliaria LATAM (pattern Robinhood + Arrived.com + Fintor). Legal framework SOFOM/SOFOMES + sandbox CNBV Fintech Law. SPV por propiedad (cada propiedad es entidad legal con N inversores fractional). Platform UI compra fracciones desde $500 MXN / $100 USD. Secondary market para sell fractions AMM-like spread. Yield distribution mensual prorrateada (renta + apreciación). KYC/AML Jumio/Veriff. Tokenization optional H3-deep (Coinbase custody pattern). Tag `fase-36-complete`.
> **Priority:** [H3]

## Contexto y objetivo

Real estate en LATAM tiene barrera enorme: pie de $200K+ USD, financiamiento 30% annual tasas, títulos de propiedad engorrosos. Fractional investing la quita — comprador pone $500 MXN y participa proporcionalmente en la apreciación + rentas de un SPV que tiene la propiedad. Pattern validado US (Arrived, Fintor, Lofty.ai, Groundfloor), pendiente LATAM — DMX como first-mover con el moat de datos propios (DMX Score decide qué propiedades listar).

Rationale: ver [GC-15 Fractional investing](../07_GAME_CHANGERS/07.2_FINTECH_CLUSTER.md#gc-15), [ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-017](../01_DECISIONES_ARQUITECTONICAS/ADR-017_DATA_ECOSYSTEM_REVENUE.md). Critical: compliance y legal no son opcionales — la fase se implementa después de SOFOM constituida + legal team on-board; de otra forma no pasa audit CNBV.

Meta H3: 5,000 usuarios activos invirtiendo, $50M USD assets under management (AUM) al cierre H3, 200+ propiedades listadas, 30%+ secondary market liquidity ratio.

## Bloques

### BLOQUE 36.A — Legal framework

#### MÓDULO 36.A.1 — SOFOM + CNBV Fintech Sandbox

**Pasos:**
- `[36.A.1.1]` Constitución SOFOM (Sociedad Financiera de Objeto Múltiple) en México via notario + acta CNBV. Alternativa: partner con SOFOM existente (ej: Kubo Financiero, Mercado Credito) via revenue share — evaluar costo vs velocidad.
- `[36.A.1.2]` Sandbox CNBV (Ley para Regular las Instituciones de Tecnología Financiera, LRITF, art. 80-87) — aplicación formal para operar como ITF (Institución de Tecnología Financiera) categoría "Fondos de Pago Electrónico" con approval para fractional ownership via SPV.
- `[36.A.1.3]` Compliance documentación requerida:
  - Plan de negocio (5 años forecast)
  - Modelo de capitalización mínima
  - Plan Anti-Lavado de Dinero (PLD) LFPIORPI
  - Auditoría interna
  - Plan de continuidad operacional (BCP)
  - Transparencia y protección usuarios
- `[36.A.1.4]` Legal team retained: 1 partner law firm Chevez Ruiz Zamarripa o White & Case para México; 1 CFO con background CNBV; 1 compliance officer interno.
- `[36.A.1.5]` Terms of service + prospecto inversionista template revisados y firmados por legal per tipo producto (residencial, comercial, mixed-use).

**Criterio de done del módulo:**
- [ ] SOFOM constituida o acuerdo partner firmado.
- [ ] Sandbox CNBV application submitted.
- [ ] Legal docs aprobados.

### BLOQUE 36.B — SPV setup

#### MÓDULO 36.B.1 — Per-property SPV model

**Pasos:**
- `[36.B.1.1]` Modelo legal: cada propiedad = 1 SPV (Vehículo de Propósito Específico, S.A. de C.V. mexicana). DMX administra via trust structure (Fideicomiso en CIBanco/HSBC como fiduciario).
- `[36.B.1.2]` Migration schema:
  ```sql
  CREATE TABLE public.spvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) UNIQUE,
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    legal_name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    fiduciary_partner TEXT NOT NULL,             -- 'CIBanco', 'HSBC', etc.
    total_shares BIGINT NOT NULL,                -- ej: 10,000 shares por propiedad
    share_price_minor BIGINT NOT NULL,           -- precio initial por share
    currency CHAR(3) NOT NULL,
    status TEXT NOT NULL DEFAULT 'forming' CHECK (status IN ('forming','active','selling_out','divesting','closed')),
    listed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE public.spv_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spv_id UUID NOT NULL REFERENCES public.spvs(id) ON DELETE CASCADE,
    investor_user_id UUID NOT NULL REFERENCES auth.users(id),
    shares_count BIGINT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cost_basis_per_share_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL
  );
  CREATE INDEX idx_holdings_investor ON public.spv_holdings (investor_user_id);
  CREATE INDEX idx_holdings_spv ON public.spv_holdings (spv_id);
  ```
- `[36.B.1.3]` Share economics:
  - Property valued at $5M MXN → 10,000 shares × $500 MXN.
  - DMX retains 5% (performance alignment) + 2% management fee annual.
  - Investors receive 85% net rent + 95% of appreciation (prorated) al sale.
- `[36.B.1.4]` Onboarding propiedad: workflow admin `/admin/spvs/new` lista propiedad → legal review → SOFOM approval → SPV constituido → listing platform.

**Criterio de done del módulo:**
- [ ] SPV schema + 1 propiedad piloto live.

### BLOQUE 36.C — Platform UI (buy shares)

#### MÓDULO 36.C.1 — Listing page + checkout

**Pasos:**
- `[36.C.1.1]` Página `/invest/marketplace` lista SPVs active con:
  - Propiedad (fotos + DMX Score + zone scores — hook FASE 11, 12)
  - Shares available + price current
  - Projected yield (rent + appreciation forecasts)
  - Risk level (DMX Risk Score)
  - Min investment, Max investment per user
- `[36.C.1.2]` Ficha detalle `/invest/spv/{id}`:
  - Documentos legales downloadable (prospecto, contrato fideicomiso, estado cuenta)
  - Historical performance simulated (usando datos zone históricos)
  - Secondary market order book (FASE 36.D)
  - Holdings transparency (# investors total, avg investment)
- `[36.C.1.3]` Checkout flow:
  1. KYC verification status check (Bloque 36.F)
  2. Amount selection (min $500 MXN, max según plan: Retail $100K, Sophisticated $1M, Institutional unlimited)
  3. Risk disclosures (3 screens must scroll + confirm)
  4. Cooling-off period 48h (regulatory requirement CNBV)
  5. Payment: SPEI instantaneo + escrow partner custody
  6. Shares allocation confirmed + digital certificate PDF
- `[36.C.1.4]` Dashboard investor `/invest/portfolio`:
  - Total invested, current value, yield received, tax-to-be-paid estimate
  - Per-SPV breakdown
  - Distribution timeline (when next rent hits)

**Criterio de done del módulo:**
- [ ] Marketplace live con 3 SPVs piloto.
- [ ] Checkout end-to-end validated.

### BLOQUE 36.D — Secondary market

#### MÓDULO 36.D.1 — AMM-like order book

**Pasos:**
- `[36.D.1.1]` Users sell shares pre-divestment (DMX SPV hold period 3-5 años default pero users need liquidity). Model: AMM (Automated Market Maker) estilo Uniswap — pool de liquidity per SPV, price function `x*y=k` + spread 3% (1.5% DMX + 1.5% pool).
- `[36.D.1.2]` Schema:
  ```sql
  CREATE TABLE public.spv_liquidity_pools (
    spv_id UUID PRIMARY KEY REFERENCES public.spvs(id) ON DELETE CASCADE,
    shares_pool BIGINT NOT NULL,                 -- shares disponibles para comprar
    currency_pool_minor BIGINT NOT NULL,         -- moneda disponible para recomprar
    currency CHAR(3) NOT NULL,
    k_constant NUMERIC NOT NULL,                 -- x*y = k
    last_price_minor BIGINT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE public.spv_secondary_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spv_id UUID NOT NULL REFERENCES public.spvs(id),
    seller_user_id UUID REFERENCES auth.users(id),   -- null si pool compra
    buyer_user_id UUID REFERENCES auth.users(id),    -- null si pool vende
    shares_count BIGINT NOT NULL,
    price_per_share_minor BIGINT NOT NULL,
    spread_bps INT NOT NULL,
    dmx_fee_minor BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[36.D.1.3]` Cuando user vende: pool compra al precio AMM actual, pool acumula shares. Pool vende cuando otro user compra al precio AMM actual. DMX capitaliza pool inicial + re-balancing periódico.
- `[36.D.1.4]` Order types: Market (ejecuta immediate al precio AMM), Limit (saved en table + triggered cuando price crosses).
- `[36.D.1.5]` Compliance: cada trade registrado en Mifiel + emite CFDI 4.0 ganancia capital según régimen fiscal user.

**Criterio de done del módulo:**
- [ ] AMM funciona con swap bidireccional.
- [ ] Market + Limit orders ejecutan.

### BLOQUE 36.E — Yield distribution

#### MÓDULO 36.E.1 — Monthly rent distribution

**Pasos:**
- `[36.E.1.1]` Cada SPV cobra renta mensual (managed by fiduciary partner). Workflow:
  1. Inquilino paga renta → cuenta escrow SPV en CIBanco.
  2. Mensual day 5: DMX calcula distribution = (rent - fees - taxes - reserves) * 0.85.
  3. Prorate por `shares_count / total_shares` × distribution amount.
  4. Dispersa via SPEI a cuenta DMX Pay de cada investor (ver FASE 37 Embedded Banking).
  5. Emite CFDI de renta (ingresos por arrendamiento) al investor automated.
- `[36.E.1.2]` Schema:
  ```sql
  CREATE TABLE public.spv_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spv_id UUID NOT NULL REFERENCES public.spvs(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_rent_minor BIGINT NOT NULL,
    fees_minor BIGINT NOT NULL,
    taxes_withheld_minor BIGINT NOT NULL,
    reserves_minor BIGINT NOT NULL,
    distributable_minor BIGINT NOT NULL,
    distributed_at TIMESTAMPTZ,
    UNIQUE(spv_id, period_start)
  );
  CREATE TABLE public.spv_distribution_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribution_id UUID NOT NULL REFERENCES public.spv_distributions(id) ON DELETE CASCADE,
    investor_user_id UUID NOT NULL REFERENCES auth.users(id),
    shares_at_record_date BIGINT NOT NULL,
    amount_minor BIGINT NOT NULL,
    cfdi_id TEXT,
    paid_at TIMESTAMPTZ
  );
  ```
- `[36.E.1.3]` Dashboard investor — timeline "next distribution in X days, estimated $Y".
- `[36.E.1.4]` Annual tax summary exportable (Constancia de retenciones para SAT).

**Criterio de done del módulo:**
- [ ] Distribution mensual ejecuta OK para SPV piloto.
- [ ] CFDIs emitted + receibos individuales.

### BLOQUE 36.F — KYC/AML

#### MÓDULO 36.F.1 — Jumio/Veriff enterprise

**Pasos:**
- `[36.F.1.1]` Integration Jumio Netverify o Veriff — user upload ID (INE/pasaporte) + selfie liveness → return verified status + risk score.
- `[36.F.1.2]` Levels KYC:
  - **Basic** ($100K MXN/año agregado) — INE + selfie
  - **Advanced** ($1M MXN/año) — + comprobante domicilio + fuente ingresos
  - **Institutional** — documentación corporate + beneficiario final UBO
- `[36.F.1.3]` AML: screening contra PEP + OFAC sanctions list (Jumio nativo) + continuous monitoring (alert si user aparece en lista actualizada).
- `[36.F.1.4]` LFPIORPI compliance: reportes a SAT/UIF cuando umbrales (e.g., inversión >400K UDIs un mes) + audit log siempre.
- `[36.F.1.5]` Schema:
  ```sql
  CREATE TABLE public.kyc_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    level TEXT NOT NULL CHECK (level IN ('basic','advanced','institutional')),
    provider TEXT NOT NULL,                      -- 'jumio','veriff'
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','expired')),
    provider_reference_id TEXT,
    expires_at DATE,
    risk_score NUMERIC(3,2),
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT
  );
  CREATE INDEX idx_kyc_user ON public.kyc_verifications (user_id, status);
  ```

**Criterio de done del módulo:**
- [ ] KYC flow 3 levels.
- [ ] AML screening activo.

### BLOQUE 36.G — Regulatorio sandbox CNBV Fintech Law

#### MÓDULO 36.G.1 — Reporting + audit

**Pasos:**
- `[36.G.1.1]` Reports mensuales a CNBV:
  - Usuarios nuevos + verified + rejected (by reason)
  - Assets under management (AUM) by SPV category
  - Transactions count + volume + anomalies
  - Complaints + resolutions (SLA 10 días hábiles)
- `[36.G.1.2]` Endpoint interno `/admin/compliance/cnbv-reports` genera PDF + envía via portal CNBV (manual upload con plantilla).
- `[36.G.1.3]` Audit trail inmutable — tabla `compliance_audit_log` con hash chain (bloque anterior incluido para proof-of-chronology).
- `[36.G.1.4]` Comité riesgos interno — reunión trimestral revisa métricas + incident reports.

**Criterio de done del módulo:**
- [ ] Mensual report template + data query funcional.
- [ ] Audit log inmutable implementado.

### BLOQUE 36.H — Tokenization optional (H3 deep pin)

#### MÓDULO 36.H.1 — STUB Coinbase/Fireblocks

**Pasos:**
- `[36.H.1.1]` STUB — activar post H3 (mes 30+) si CNBV permite tokenización real estate (no permitido default 2026).
- `[36.H.1.2]` Arquitectura hipotética: cada SPV share representada por ERC-20 token en L2 (Polygon) via Coinbase Custody o Fireblocks. Secondary market moves off-chain AMM hacia on-chain DEX.
- `[36.H.1.3]` UI opt-in "Convert my SPV shares to tokens" flow con KYC adicional + disclosure Web3 risks.
- `[36.H.1.4]` Cross-reference GC-15 (fractional) + stablecoin real estate (H3 deep exploration).
- `[36.H.1.5]` Badge `[H3-deep próximamente, pendiente regulación]` en UI.

**Criterio de done del módulo:**
- [ ] STUB documentado.
- [ ] Waitlist "DMX Token" signups tracking.

## Criterio de done de la FASE

- [ ] SOFOM constituida o partner firmado + legal docs.
- [ ] CNBV Fintech sandbox application.
- [ ] SPV schema + 3 propiedades piloto live.
- [ ] Marketplace `/invest/marketplace` con checkout KYC → payment → shares.
- [ ] Secondary market AMM con Market + Limit orders.
- [ ] Yield distribution mensual + CFDIs automated.
- [ ] KYC 3 levels + AML screening continuous.
- [ ] Regulatory reporting CNBV monthly.
- [ ] Tokenization STUB H3-deep.
- [ ] RLS sobre spvs, spv_holdings, distribution_receipts, kyc_verifications (owner + admin).
- [ ] Tag git: `fase-36-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados (distribution → receipts → CFDI)
- [ ] Permission enforcement validado (investor / sophisticated_investor / compliance_officer / admin)

### States
- [ ] Loading states: KYC processing, checkout, AMM swap, distribution calculation
- [ ] Error states: KYC rejected, insufficient balance, trade failed, regulatory block
- [ ] Empty states: no investments yet, no SPVs available
- [ ] Success states: shares acquired, distribution received, trade executed

### Quality
- [ ] Mobile responsive verificado
- [ ] Accessibility WCAG 2.1 AA (forms, KYC upload, amount selectors)
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded (legal docs localized per country)
- [ ] Core Web Vitals green

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright E2E (register → KYC → invest → distribute → secondary trade)
- [ ] PostHog events (kyc_submitted, investment_completed, distribution_paid, secondary_trade)
- [ ] Sentry captures errors
- [ ] Regulatory checks automated (cooling-off 48h, KYC level limits)

### Stubs (si aplica)
- [ ] Tokenization STUB marcado `// STUB — activar FASE 38+ H3-deep`
- [ ] STUB visible al user con badge `[H3-deep próximamente]`
- [ ] STUBs documentados en §5.B

### Sign-off
- [ ] Legal reviewer (outside counsel): @____ firmó compliance
- [ ] CFO / compliance officer: @____ firmó flujos fiscales + PLD
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-36-complete aplicado post-merge

## tRPC procedures nuevos (features/invest/routes/)

- `invest.kyc.initiate(level)` → returns Jumio/Veriff URL; `invest.kyc.status()`
- `invest.marketplace.listSpvs(filters)`, `invest.marketplace.getSpv(id)`
- `invest.spvs.buyShares(input)` — validates KYC, cooling-off, max per level, creates Payment Intent, records holding
- `invest.spvs.getUserHoldings(user_id)`
- `invest.secondary.getPoolState(spv_id)`, `invest.secondary.quoteTrade(spv_id, direction, shares)`, `invest.secondary.executeMarketOrder`, `invest.secondary.placeLimitOrder`, `invest.secondary.cancelLimitOrder`
- `invest.distributions.listReceipts(user_id, period)`, `invest.distributions.downloadCfdi(receipt_id)`
- `invest.compliance.submitCnbvReport(period)` (admin), `invest.compliance.getAuditLog(filters)` (admin + DPO)
- `invest.admin.createSpv`, `invest.admin.approveSpvListing`, `invest.admin.triggerDistribution(spv_id, period)`

## Triggers BD

- `trg_spv_holdings_insert_audit` — AFTER INSERT → escribe row en `compliance_audit_log` con hash-chain.
- `trg_secondary_trade_cfdi_queue` — AFTER INSERT en `spv_secondary_trades` → enqueue job generar CFDI ganancia capital prorateada.
- `trg_distribution_receipts_notify` — AFTER INSERT → emit channel `user:{id}:distribution_paid` Supabase Realtime.

## Crons nuevos

- `spv_rent_collect_cron` — mensual día 5 09:00 local. Recorre SPVs active, valida rent received en escrow account, computa distribution formula, escribe en `spv_distributions`.
- `spv_distribution_disburse_cron` — mensual día 6 09:00 local. Toma `spv_distributions` no `distributed_at` aún, para cada holder prorratea, ejecuta SPEI/DMX Pay transfer, marca `distribution_receipts.paid_at`.
- `cnbv_monthly_report_generator` — mensual día 3. Agrega usuarios + AUM + transactions + complaints, genera PDF, notifica compliance officer para upload manual portal CNBV.
- `secondary_amm_rebalance` — diario 18:00 local. Evalúa k_constant vs real fair value (DMX AVM), re-balance si divergencia >5%.
- `kyc_expiry_sweep` — semanal. KYC con `expires_at < NOW()+30d` → notifica user renew.
- `compliance_audit_log_integrity_check` — diario. Verifica hash-chain intact (cada row hash_current = SHA256(prev_hash + row_data)).

## Archivos feature-sliced

```
features/invest/
├── components/
│   ├── marketplace-grid.tsx
│   ├── spv-detail-page.tsx
│   ├── checkout-flow.tsx              (KYC → cooling-off → payment)
│   ├── portfolio-dashboard.tsx
│   ├── secondary-market-order-book.tsx
│   ├── distribution-timeline.tsx
│   └── admin/
│       ├── spv-creation-wizard.tsx
│       └── cnbv-report-viewer.tsx
├── hooks/
│   ├── use-kyc-status.ts
│   ├── use-spv-holdings.ts
│   └── use-amm-quote.ts
├── lib/
│   ├── amm-formula.ts                 (x*y=k + spread)
│   ├── yield-calculator.ts
│   ├── cfdi-generator-rent.ts
│   ├── cfdi-generator-capital-gain.ts
│   ├── compliance-audit-log.ts        (hash-chain)
│   └── tokenization-stub.ts           (STUB H3-deep)
├── routes/
│   └── invest-router.ts
├── schemas/
│   └── invest.schema.ts
└── tests/
    ├── amm-formula.test.ts
    ├── yield-calculator.test.ts
    ├── compliance-audit-log.test.ts
    └── invest-e2e.spec.ts
```

## Features implementadas en esta fase (≈ 20)

1. **F-36-01** Constitución SOFOM o partner agreement
2. **F-36-02** CNBV Fintech sandbox application submitted
3. **F-36-03** Schema `spvs` + `spv_holdings`
4. **F-36-04** SPV formation workflow admin
5. **F-36-05** Marketplace `/invest/marketplace`
6. **F-36-06** Ficha SPV detail con docs legales downloadable
7. **F-36-07** Checkout con KYC + cooling-off 48h + SPEI
8. **F-36-08** Shares allocation + certificate PDF
9. **F-36-09** Portfolio dashboard investor
10. **F-36-10** AMM secondary market pool per SPV
11. **F-36-11** Market + Limit orders
12. **F-36-12** Distribution mensual prorrateada
13. **F-36-13** CFDI auto por renta + constancia retenciones
14. **F-36-14** Jumio/Veriff KYC 3 levels
15. **F-36-15** AML PEP + OFAC + continuous monitoring
16. **F-36-16** LFPIORPI reports SAT/UIF
17. **F-36-17** Regulatory monthly reports CNBV
18. **F-36-18** Compliance audit log inmutable hash-chained
19. **F-36-19** Tokenization STUB H3-deep + waitlist
20. **F-36-20** Comité de riesgos trimestral tooling

## Próxima fase

[FASE 37 — Embedded Banking](./FASE_37_EMBEDDED_BANKING.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
