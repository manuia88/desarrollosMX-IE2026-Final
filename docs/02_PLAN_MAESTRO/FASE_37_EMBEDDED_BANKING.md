# FASE 37 — Embedded Banking (Nu-style)

> **Duración estimada:** 5 sesiones Claude Code (~20 horas)
> **Dependencias:** [FASE 18 — Legal + Pagos + Escrow](./FASE_18_LEGAL_PAGOS_ESCROW.md), [FASE 23 — Monetización](./FASE_23_MONETIZACION.md), [FASE 36 — Fractional Investing](./FASE_36_FRACTIONAL_INVESTING.md)
> **Bloqueantes externos:**
> - Partnership Banking-as-a-Service (BaaS): Bitso Business, Cuenca Labs, Klar BaaS, o Grupo Financiero Monex BaaS (decidir 37.A)
> - AXA/GNP/Qualitas partnership para insurance integration
> - Mastercard/Visa issuer agreement via BaaS partner para virtual cards
> - Banxico SPEI/CoDi direct participant certification (via partner)
> - CONDUSEF registration (Comisión Nacional para la Protección y Defensa de los Usuarios de Servicios Financieros)
> - KYC pipeline de FASE 36.F reutilizado + ampliado
> - FX partners per corridor: Bitso (cripto-hedge), Wise Business, Currencies Direct
> **Horizonte:** H3
> **Resultado esperado:** Cuenta DMX Pay — embedded banking pattern Nubank/Mercado Pago para asesores/compradores/inversores. Partnership BaaS, wallet con SPEI + CoDi + virtual card, savings goals (comprar pie en N años, auto-save), micro-credit commission advance para asesores, insurance integrations (hogar, vida), FX seamless multi-currency, onboarding 3 minutos. Tag `fase-37-complete`.
> **Priority:** [H3]

## Contexto y objetivo

Con FASE 36 (Fractional Investing) DMX tiene flujos de yield distribution entrando y saliendo. Crear cuenta propia (DMX Pay) reduce costo de payouts (SPEI interno gratis vs $15-50 comisiones bancos), aumenta retention (users salen menos), y abre nuevo revenue (interchange cards + lending + insurance commissions). Pattern directo: Nubank empezó como tarjeta crédito, expandió a cuenta cheques + investing + insurance + crypto = super-app LATAM.

Rationale: [GC-16 Nubank embedded banking](../07_GAME_CHANGERS/07.2_FINTECH_CLUSTER.md#gc-16), [ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-013](../01_DECISIONES_ARQUITECTONICAS/ADR-013_API_AS_PRODUCT.md). DMX NO se vuelve banco (licencia bancaria $20M+ capital regulatorio + 2 años proceso) — usa BaaS. Partners candidates:
- **Bitso Business** — stablecoin + SPEI + virtual card, API developer-first, LATAM native.
- **Cuenca Labs** — neobank BaaS México, tarjetas Mastercard.
- **Klar BaaS** — infraestructura bancos, más enterprise-oriented.

Decision framework: evaluar coste total (setup + monthly + per-transaction) × velocidad (integration weeks) × LATAM coverage (H2 MX solo; H3 expand).

Meta H3: 10,000 cuentas DMX Pay abiertas, $100M+ transaction volume anual, 30%+ margin en interchange + lending.

## Bloques

### BLOQUE 37.A — Partnership BaaS decision

#### MÓDULO 37.A.1 — Vendor selection + contract

**Pasos:**
- `[37.A.1.1]` RFP a 3 vendors (Bitso Business, Cuenca Labs, Klar BaaS). Criterios:
  - Setup cost (<$50K)
  - Per-account cost (<$2/mes)
  - Per-transaction cost (SPEI <$1, card <1% interchange retained DMX)
  - API quality (REST + webhooks)
  - LATAM corridor support (MX baseline, CO/AR/BR futuro)
  - KYC pipeline integration
  - SLA (99.9%+)
- `[37.A.1.2]` Decisión: **Bitso Business** (pattern) — developer-first API + Spanish docs + stablecoin-hedged FX + LATAM multi-country futuro. Trade-off: menos legacy banks integration vs Cuenca.
- `[37.A.1.3]` Contract signed + onboarding BaaS environment (sandbox + prod keys).
- `[37.A.1.4]` Compliance: registro CONDUSEF como comisionista + aviso en UI "DMX Pay opera con Bitso Business, institución financiera regulada CNBV".

**Criterio de done del módulo:**
- [ ] Partner seleccionado.
- [ ] Sandbox + prod keys obtenidas.

### BLOQUE 37.B — DMX Pay wallet

#### MÓDULO 37.B.1 — Cuenta + SPEI + CoDi + virtual card

**Pasos:**
- `[37.B.1.1]` Schema:
  ```sql
  CREATE TABLE public.dmx_pay_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    baas_partner TEXT NOT NULL DEFAULT 'bitso_business',
    baas_account_id TEXT NOT NULL UNIQUE,
    clabe TEXT NOT NULL UNIQUE,                  -- 18-digit CLABE
    balance_minor BIGINT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'MXN',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed')),
    opened_at TIMESTAMPTZ DEFAULT now(),
    kyc_level TEXT NOT NULL DEFAULT 'basic'
  );
  CREATE TABLE public.dmx_pay_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.dmx_pay_accounts(id),
    type TEXT NOT NULL CHECK (type IN ('spei_in','spei_out','codi','card_purchase','card_refund','internal_transfer','distribution_in','fee')),
    amount_minor BIGINT NOT NULL,
    counterparty JSONB,                          -- {clabe, name, tax_id}
    reference TEXT,
    baas_transaction_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending','completed','failed','reversed')),
    created_at TIMESTAMPTZ DEFAULT now()
  ) PARTITION BY RANGE (created_at);
  SELECT partman.create_parent('public.dmx_pay_transactions', 'created_at', 'native', 'monthly');
  CREATE INDEX idx_dmx_pay_tx_account ON public.dmx_pay_transactions (account_id, created_at DESC);
  CREATE TABLE public.dmx_pay_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.dmx_pay_accounts(id),
    type TEXT NOT NULL CHECK (type IN ('virtual','physical')),
    last4 TEXT NOT NULL,
    brand TEXT NOT NULL,                         -- Mastercard, Visa
    status TEXT NOT NULL CHECK (status IN ('active','locked','canceled')),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[37.B.1.2]` UI `/pay/wallet` con:
  - Balance + CLABE visible
  - Tabs: Transactions, Cards, Receive, Send
  - Send flow: SPEI (CLABE destino) o CoDi (QR scan) + 2FA biométrico si >$5K MXN
- `[37.B.1.3]` Virtual card instant on signup (Mastercard Virtual Debit vía BaaS). Apple Pay / Google Pay tokenization opt-in.
- `[37.B.1.4]` Webhooks BaaS → DMX endpoints: `dmx_pay.transaction.completed`, `dmx_pay.transaction.failed`, `dmx_pay.account.frozen`.

**Criterio de done del módulo:**
- [ ] Apertura cuenta 3 minutos.
- [ ] SPEI enviado+recibido.
- [ ] Virtual card usa en e-commerce.

### BLOQUE 37.C — Savings goals

#### MÓDULO 37.C.1 — Meta "pie de casa" con auto-save

**Pasos:**
- `[37.C.1.1]` Feature "Meta Casa" — wizard:
  1. Define propiedad target (zona + tipo + precio estimado vía DMX Estimate FASE 11).
  2. Plazo (12-60 meses).
  3. Ingreso mensual declarado.
  4. DMX calcula auto-save weekly/monthly + compara con rendimiento.
  5. Linked investment option: auto-invest en SPVs (FASE 36) para maximizar yield.
- `[37.C.1.2]` Schema:
  ```sql
  CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.dmx_pay_accounts(id),
    name TEXT NOT NULL,
    target_amount_minor BIGINT NOT NULL,
    target_date DATE NOT NULL,
    current_amount_minor BIGINT NOT NULL DEFAULT 0,
    auto_save_amount_minor BIGINT,
    auto_save_frequency TEXT CHECK (auto_save_frequency IN ('weekly','biweekly','monthly')),
    linked_property_id UUID REFERENCES public.properties(id),
    invest_in_spvs BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','achieved','canceled')),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[37.C.1.3]` Cron weekly ejecuta auto-saves → move balance to "sub-account" goal + opcional invest in SPVs.
- `[37.C.1.4]` Gamification: progress bar + milestones (25%, 50%, 75%, 100%) + notification "Você está a X% da sua meta!" (multi-lang).

**Criterio de done del módulo:**
- [ ] Goal creado con auto-save.
- [ ] Cron funciona + gamification visible.

### BLOQUE 37.D — Micro-credit commission advance

#### MÓDULO 37.D.1 — Asesor loan product

**Pasos:**
- `[37.D.1.1]` Product: asesor cierra operación → comisión se cobrará en 30-60 días (desarrollador paga tras escrituración). DMX adelanta 70% de la comisión al firmar contrato, descuenta + interés al cobrar.
- `[37.D.1.2]` Elegibilidad: asesor con ≥6 meses DMX + ≥3 operaciones cerradas + score crediticio (Círculo de Crédito integration).
- `[37.D.1.3]` Schema:
  ```sql
  CREATE TABLE public.commission_advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asesor_user_id UUID NOT NULL REFERENCES auth.users(id),
    operacion_id UUID NOT NULL REFERENCES public.operaciones(id),
    advance_amount_minor BIGINT NOT NULL,
    expected_commission_minor BIGINT NOT NULL,
    interest_rate_apr NUMERIC(6,4) NOT NULL,     -- e.g., 0.18 = 18% APR
    disbursed_at TIMESTAMPTZ,
    due_date DATE NOT NULL,
    repaid_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','disbursed','repaid','defaulted')),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- `[37.D.1.4]` Flow: asesor aplica → DMX aprueba (auto or manual) → disburse a DMX Pay account → cuando desarrollador paga comisión, SPEI intercepted → DMX charges loan + interest + pays resto a asesor.
- `[37.D.1.5]` Compliance: registrado como crédito persona física en BaaS partner (Bitso Business bajo su SOFOM). Buró Crédito reporting mensual.
- `[37.D.1.6]` Risk mgmt: expose total outstanding vs colateral (commission expected); default-predict model (H3 deep) alerta.

**Criterio de done del módulo:**
- [ ] Advance flow completo.
- [ ] Repayment interceptado.

### BLOQUE 37.E — Insurance integrations

#### MÓDULO 37.E.1 — AXA/GNP partner embeds

**Pasos:**
- `[37.E.1.1]` Products embedded:
  - **Seguro Hogar** — AXA partner, cover incendio + robo + desastres. DMX offers en checkout FASE 36 (property investment) y FASE 18 (closing operación).
  - **Seguro Vida** — GNP, protege pago hipoteca en caso de fallecimiento.
  - **Seguro Título** — ACE/Chubb, protege contra vicios de título propiedad.
- `[37.E.1.2]` Integration via partner API (AXA MX API, GNP B2B). Quote → embed form → redirect or inline checkout → commission a DMX (10-15% premium).
- `[37.E.1.3]` Schema:
  ```sql
  CREATE TABLE public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    partner TEXT NOT NULL CHECK (partner IN ('axa','gnp','chubb')),
    product_type TEXT NOT NULL CHECK (product_type IN ('hogar','vida','titulo')),
    partner_policy_id TEXT NOT NULL,
    premium_monthly_minor BIGINT NOT NULL,
    coverage_minor BIGINT NOT NULL,
    linked_property_id UUID REFERENCES public.properties(id),
    linked_operation_id UUID REFERENCES public.operaciones(id),
    status TEXT NOT NULL CHECK (status IN ('quoted','active','canceled','claimed')),
    started_at DATE,
    ends_at DATE
  );
  ```
- `[37.E.1.4]` Dashboard user `/pay/insurance` muestra polizas activas + billing.

**Criterio de done del módulo:**
- [ ] Seguro hogar quote + purchase end-to-end.
- [ ] Commission tracked.

### BLOQUE 37.F — FX seamless

#### MÓDULO 37.F.1 — Multi-currency para compradores internacionales Latinx US

**Pasos:**
- `[37.F.1.1]` Target users: Latinx US (diaspora) comprando property MX. Flow: cuenta DMX Pay multi-currency (USD + MXN wallet). User deposita USD via ACH US → DMX convierte a MXN al rate preferencial (spread 0.5-1.5% vs 3-5% bancos).
- `[37.F.1.2]` Partners:
  - **Bitso** (stablecoin-hedged) — USDT/USDC rail luego on-ramp a MXN.
  - **Wise Business** — directo ACH→SPEI conversion.
- `[37.F.1.3]` Schema extiende `dmx_pay_accounts` con balance multi-currency (separate row per currency + FK account parent).
- `[37.F.1.4]` UI `/pay/fx` — rate display live + "lock rate 24h" option + transaction history.
- `[37.F.1.5]` Compliance: reportes CONDUSEF + cross-border reporting (FinCEN US, UIF MX).

**Criterio de done del módulo:**
- [ ] USD→MXN conversion ejecuta.
- [ ] Rate lock 24h funciona.

### BLOQUE 37.G — Compliance KYC + AML + PLD

#### MÓDULO 37.G.1 — LFPIORPI full stack

**Pasos:**
- `[37.G.1.1]` Extiende KYC FASE 36.F para incluir:
  - Transacciones high-value (SAT reporte >$400K UDIs mes agregado)
  - Structuring detection (múltiples transacciones < umbral)
  - Fuente fondos cuestionarios cuando USD→MXN >$10K
- `[37.G.1.2]` PLD program:
  - Oficial de Cumplimiento registered CONDUSEF
  - Comité Comunicación y Control
  - Training anual staff
  - Annual external audit
- `[37.G.1.3]` UIF reporting auto — operaciones relevantes (usuales, inusuales, preocupantes) generan Report in system → revisión → envío via portal UIF formato oficial.

**Criterio de done del módulo:**
- [ ] Estructura PLD documented.
- [ ] UIF reports auto-generados para review.

### BLOQUE 37.H — Onboarding flow 3 minutos

#### MÓDULO 37.H.1 — UX optimized

**Pasos:**
- `[37.H.1.1]` Flow:
  1. Landing `/pay` con CTA "Open in 3 min" + social proof
  2. Email + phone OTP (30s)
  3. KYC Jumio: ID + selfie (90s)
  4. Terms acceptance (20s)
  5. Virtual card provisioned + CLABE shown (10s)
  6. Upsell: "Fund your account" SPEI instructions o add external card
- `[37.H.1.2]` PostHog conversion funnel tracking; iterate based on drop-off analysis.
- `[37.H.1.3]` Target: 70% completion rate onboarding.

**Criterio de done del módulo:**
- [ ] Flow 3 min achievable in median user.
- [ ] Conversion tracked.

## Criterio de done de la FASE

- [ ] Partnership BaaS signed + sandbox+prod keys.
- [ ] Schema `dmx_pay_accounts` + `dmx_pay_transactions` + `dmx_pay_cards`.
- [ ] UI wallet con SPEI + CoDi + virtual card + Apple/Google Pay.
- [ ] Savings goals con auto-save + linked SPV investing.
- [ ] Commission advance para asesores con Círculo de Crédito score.
- [ ] Insurance embeds AXA/GNP/Chubb 3 productos.
- [ ] FX seamless USD↔MXN con Bitso/Wise.
- [ ] Compliance PLD + UIF reports.
- [ ] Onboarding 3 min target.
- [ ] RLS per-account owner + admin audit.
- [ ] Tag git: `fase-37-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados (transaction.completed → balance update)
- [ ] Permission enforcement validado (user / asesor / compliance_officer / admin)

### States
- [ ] Loading states: onboarding KYC, transaction processing, FX quote loading
- [ ] Error states: KYC rejected, insufficient funds, BaaS timeout, fraud flag
- [ ] Empty states: no transactions yet, no cards yet
- [ ] Success states: account opened, SPEI received, card active

### Quality
- [ ] Mobile responsive (wallet primary mobile experience)
- [ ] Accessibility WCAG 2.1 AA
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded
- [ ] Core Web Vitals green

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright E2E (signup → KYC → fund → send SPEI → use card)
- [ ] PostHog events (pay_account_opened, spei_sent, card_used, insurance_purchased)
- [ ] Sentry captures errors
- [ ] Chaos test BaaS timeout → graceful degradation + retry

### Stubs (si aplica)
- [ ] Crypto wallet STUB H3-deep marcado
- [ ] STUBs documentados en §5.B

### Sign-off
- [ ] Compliance officer: @____ firmó PLD structure
- [ ] Legal reviewer: @____ firmó contratos BaaS + insurance
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-37-complete aplicado post-merge

## tRPC procedures nuevos (features/dmx-pay/routes/)

- `dmxPay.account.open(kyc_level)`, `dmxPay.account.getBalance`, `dmxPay.account.getDetails`
- `dmxPay.transactions.list(filters, pagination)`, `dmxPay.transactions.getById`
- `dmxPay.send.spei(clabe, amount, reference)`, `dmxPay.send.codi(qr_payload)`
- `dmxPay.cards.issueVirtual`, `dmxPay.cards.lock(card_id)`, `dmxPay.cards.getDetails(card_id, 2fa_token)`
- `dmxPay.savings.createGoal`, `dmxPay.savings.updateAutoSave`, `dmxPay.savings.pauseGoal`, `dmxPay.savings.listGoals`
- `dmxPay.credit.applyAdvance(operacion_id)`, `dmxPay.credit.getOutstanding(user_id)`
- `dmxPay.insurance.quote(product_type, inputs)`, `dmxPay.insurance.purchase(quote_id)`, `dmxPay.insurance.listPolicies`
- `dmxPay.fx.getRate(from, to)`, `dmxPay.fx.lockRate(from, to, amount, ttl=24h)`, `dmxPay.fx.executeConversion(lock_id)`
- `dmxPay.compliance.listUifReports(admin)`, `dmxPay.compliance.reviewUifReport(id, decision)` (compliance officer)

## Triggers BD

- `trg_dmx_pay_tx_balance_update` — AFTER INSERT `dmx_pay_transactions` status=completed → UPDATE `dmx_pay_accounts.balance_minor` atomically.
- `trg_commission_advance_repayment` — AFTER INSERT transaction where reference matches operacion_id con outstanding advance → auto-apply payment, mark `commission_advances.repaid_at`.
- `trg_high_value_tx_uif_flag` — AFTER INSERT where amount >= 400K UDIs equivalent monthly aggregate → INSERT `uif_reports` for review.
- `trg_structuring_detection` — AFTER INSERT multiple txs same user < threshold within 24h window → flag suspicious, insert alert compliance.

## Crons nuevos

- `dmx_pay_balance_reconciliation` — diario 01:00 UTC. Query BaaS partner API total balances vs sum `dmx_pay_accounts.balance_minor` DMX → alert si drift >$100.
- `dmx_pay_savings_auto_save` — cron per-user schedule (weekly, biweekly, monthly). Ejecuta transfer `balance_minor` → goal sub-account; opcional auto-invest SPV.
- `commission_advance_repayment_check` — nightly. Scan operaciones comisiones cobradas últimos 3d, aplica repayments pendientes.
- `insurance_policy_renewal_reminders` — diario. Policies expiring in 30d / 7d → email + SMS user.
- `fx_rate_cache_refresh` — 1 min. Pull rates Bitso + Wise, cache 60s with TTL. Used by `dmxPay.fx.getRate`.
- `uif_monthly_report_dispatch` — mensual día 10. Exporta reports operaciones relevantes agregados, envía via portal UIF.

## Archivos feature-sliced

```
features/dmx-pay/
├── components/
│   ├── wallet-page.tsx
│   ├── send-spei-flow.tsx
│   ├── send-codi-flow.tsx             (QR scanner)
│   ├── card-details.tsx               (2FA protected)
│   ├── savings-goal-wizard.tsx
│   ├── commission-advance-page.tsx
│   ├── insurance-quote-form.tsx
│   ├── fx-converter.tsx
│   └── compliance/
│       ├── uif-reports-queue.tsx
│       └── pld-dashboard.tsx
├── hooks/
│   ├── use-account-balance.ts
│   ├── use-realtime-transactions.ts   (Supabase Realtime subscribe)
│   └── use-fx-quote.ts
├── lib/
│   ├── baas-adapter.ts                (Bitso Business API client)
│   ├── spei-validator.ts              (CLABE checksum)
│   ├── codi-qr-parser.ts
│   ├── credito-score-circulo.ts       (Círculo de Crédito API)
│   ├── insurance-adapters/            (axa.ts, gnp.ts, chubb.ts)
│   ├── fx-router.ts                   (Bitso vs Wise best rate)
│   └── pld-structuring-detector.ts
├── routes/
│   └── dmx-pay-router.ts
├── schemas/
│   └── dmx-pay.schema.ts
└── tests/
    ├── baas-adapter.test.ts
    ├── spei-validator.test.ts
    ├── pld-structuring-detector.test.ts
    └── dmx-pay-e2e.spec.ts
```

## Features implementadas en esta fase (≈ 20)

1. **F-37-01** Partnership BaaS (Bitso Business) signed
2. **F-37-02** Schema `dmx_pay_accounts` + transactions partitioned
3. **F-37-03** Schema `dmx_pay_cards`
4. **F-37-04** UI wallet `/pay/wallet`
5. **F-37-05** Send SPEI + CoDi + 2FA biométrico
6. **F-37-06** Virtual card Mastercard instant + Apple/Google Pay
7. **F-37-07** Webhooks BaaS + state sync
8. **F-37-08** Savings goals "Meta Casa" con auto-save
9. **F-37-09** Linked investing in SPVs (FASE 36 integration)
10. **F-37-10** Commission advance product para asesores
11. **F-37-11** Círculo de Crédito score integration
12. **F-37-12** Repayment interception al cobrar comisión
13. **F-37-13** Insurance hogar AXA embed
14. **F-37-14** Insurance vida GNP embed
15. **F-37-15** Insurance título Chubb embed
16. **F-37-16** FX USD↔MXN Bitso + Wise
17. **F-37-17** Rate lock 24h
18. **F-37-18** Compliance PLD LFPIORPI
19. **F-37-19** UIF auto-reports operaciones relevantes
20. **F-37-20** Onboarding 3-min optimized + funnel tracking

## Próxima fase

[FASE 38 — International Expansion](./FASE_38_INTERNATIONAL_EXPANSION.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
