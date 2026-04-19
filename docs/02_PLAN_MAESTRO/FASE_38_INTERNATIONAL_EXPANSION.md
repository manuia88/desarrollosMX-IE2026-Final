# FASE 38 — International Expansion (5 países LATAM + Latinx US)

> **Duración estimada:** 8 sesiones Claude Code (~32 horas, ejecutadas por country tracks paralelos)
> **Dependencias:** [FASE 30 — Platform API](./FASE_30_PLATFORM_API.md), [FASE 33 — Data Ecosystem](./FASE_33_DATA_ECOSYSTEM.md), [FASE 35 — DMX Terminal](./FASE_35_DMX_TERMINAL.md)
> **Bloqueantes externos:**
> - Per-country: legal entity constituida o partner legal firm retained (5+1 países)
> - Per-country: data source integrations contracts (DANE CO, INDEC AR, IBGE BR, INE CL; US County Assessor datasets)
> - Per-country: payment processor + tax engine integration
> - Per-country: legal doc signing integration (Certicámara CO, AFIP AR, NFS-e BR, SII CL, DocuSign US)
> - Spanish/Portuguese/English content translation pipeline (CrowdIn + human proofreaders)
> - Country-specific KYC providers (Veriff Enterprise covers 195 countries, fallback Jumio)
> - Staff on-ground: 1 country manager + 1 growth lead por país (operacional, no técnico)
> - US H3 Latinx: Remote.com o Deel para contratación cross-border
> **Horizonte:** H3
> **Resultado esperado:** DMX opera en 5 países LATAM (MX baseline + CO + AR + BR + CL) + US Latinx diaspora. México-First completo (CDMX + 10 metros), Colombia (Bogotá/Medellín/Cali), Argentina (CABA/Córdoba/Rosario con peso volatility handling), Brasil (SP/Rio/BH/Brasília, LGPD compliant, português), Chile (Santiago/Valparaíso/Concepción). US Latinx (Miami/LA/NY/Houston — $2T buying power). Localization por país stack (i18n ya cubierto H1 FASE 05, pero partnerships/payment/tax/legal por país nuevos). Tag `fase-38-complete`.
> **Priority:** [H3]

## Contexto y objetivo

H1 dejó la fundación multi-country (i18n, country_code, FX formatters — ver [ADR-003](../01_DECISIONES_ARQUITECTONICAS/ADR-003_MULTI_COUNTRY_SCHEMA.md)). Esta fase activa operationally 5 países LATAM más US Latinx — cada país agrega data sources, legal entity o partners, payment providers, tax engines, compliance registrations. Es la fase más operacional/legal del roadmap; el técnico es replicable fase-por-fase (patterns ya establecidos), la dificultad es el coordinación ground per país.

Rationale: [ADR-003](../01_DECISIONES_ARQUITECTONICAS/ADR-003_MULTI_COUNTRY_SCHEMA.md), [ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md). Target H3 close:
- Mexico: 50K users + 500 asesores + $50B GMV anual.
- Colombia: 15K users + 200 asesores + $8B GMV.
- Argentina: 10K users + 150 asesores + $4B GMV.
- Brasil: 20K users + 300 asesores + $15B GMV.
- Chile: 8K users + 100 asesores + $3B GMV.
- US Latinx: 25K users (cross-border compradores) + $30B GMV in corridors.

Orden de ejecución paralela: tracks independent per country con shared infra DMX. Manu + country managers drive each.

## Bloques

### BLOQUE 38.A — México-First complete baseline

#### MÓDULO 38.A.1 — CDMX + 10 metros expansion

**Pasos:**
- `[38.A.1.1]` Ciudades priority MX: CDMX (baseline H1) → Guadalajara (GDL) → Monterrey (MTY) → Puebla → Querétaro → Tijuana → Mérida → Cancún → León → San Luis Potosí → Toluca.
- `[38.A.1.2]` Per-city:
  - Ingestors locales: catastro municipal, DENUE scope expand, FGJ o equivalente seguridad, GTFS metro/transit local.
  - Calibración zone_scores N0-N5 con data local + 6 meses historical backfill.
  - Seeds 20+ asesores + 5+ desarrolladores via growth team.
  - Feature flag `region_gdl_enabled`, `region_mty_enabled`, etc.
- `[38.A.1.3]` Effort ~2-3 semanas per city tras GDL primera (patrón replicable).
- `[38.A.1.4]` DMX legal entity MX: ya constituida H1. Registros CNBV Fintech, CONDUSEF, LFPDPPP — vigentes.

**Criterio de done del módulo:**
- [ ] 10 metros MX activos con zone_scores populados.
- [ ] 200+ asesores onboarded.

### BLOQUE 38.B — Colombia (Bogotá / Medellín / Cali)

#### MÓDULO 38.B.1 — Data sources + legal + payments CO

**Pasos:**
- `[38.B.1.1]` Legal entity: DesarrollosMX Colombia S.A.S. constituida via law firm Brigard Urrutia. Registro Cámara de Comercio Bogotá. RUT ante DIAN.
- `[38.B.1.2]` Data sources:
  - **DANE** (Departamento Administrativo Nacional de Estadística) — equivalente INEGI. Series IPC, IPVN (Índice Precios Vivienda Nueva).
  - **Catastro** municipal (Bogotá, Medellín, Cali) — API Catastro Distrital Bogotá existing; Medellín via SIGC; Cali via MapaCali.
  - **Super Notariado y Registro** — para títulos propiedad (si API available).
  - **Cámara de Comercio Bogotá** — equivalent DENUE (registros mercantiles).
  - **Policía Nacional Colombia** — estadísticas criminalidad per comuna.
- `[38.B.1.3]` Ingestors nuevos `shared/lib/ingest/co/` siguiendo patterns MX (orchestrator FASE 07):
  - `dane.ts`, `catastro-bogota.ts`, `snr.ts`, `ccb.ts`, `crime-police-co.ts`
- `[38.B.1.4]` Payment: Wompi o PayU Latam (PSE + tarjetas + Nequi/Daviplata).
- `[38.B.1.5]` Tax: IVA 19% engine + retenciones.
- `[38.B.1.6]` Legal signing: Certicámara electronic signature.
- `[38.B.1.7]` i18n: ya es es-CO en H1; review copy local (colombianismos).
- `[38.B.1.8]` Compliance: Ley 1581 data protection + Registro Bases de Datos SIC.

**Criterio de done del módulo:**
- [ ] 3 ciudades CO activas.
- [ ] Payments + legal flows end-to-end.

### BLOQUE 38.C — Argentina (CABA / Córdoba / Rosario)

#### MÓDULO 38.C.1 — Data + peso volatility handling

**Pasos:**
- `[38.C.1.1]` Legal entity: DesarrollosMX Argentina S.A. (o S.R.L.) via Marval O'Farrell Mairal. Registro IGJ + AFIP.
- `[38.C.1.2]` Data sources:
  - **INDEC** (Instituto Nacional de Estadística y Censos) — IPC, Índice Construcción.
  - **Reporte Inmobiliario** o **ZonaProp** (scraping) — market prices.
  - **AFIP** — emisión facturas electrónicas (CAE — Código de Autorización Electrónico).
  - **IGJ** — Inspección General de Justicia para business registrations.
  - **Colegio Inmobiliario** CABA, Córdoba, Rosario — listings.
- `[38.C.1.3]` **Peso volatility handling** crítico:
  - Dual currency BD: amounts almacenados ARS + USD equivalent al timestamp (spot rate MEP/CCL vía Banco Central API).
  - UI siempre mostrar ambos.
  - Tax calculations respect "dólar oficial" vs "dólar blue" distinction regulatory.
- `[38.C.1.4]` Legal framework: Ley 25.326 (data protection) + Ley Corretaje Inmobiliario (Colegios matriculados compulsory).
- `[38.C.1.5]` Payment: Mercado Pago + transferencia CBU.
- `[38.C.1.6]` Tax: IVA 21% + Ingresos Brutos per province + Ganancias.

**Criterio de done del módulo:**
- [ ] 3 ciudades AR activas.
- [ ] Peso volatility handled correctly.

### BLOQUE 38.D — Brasil (SP / Rio / BH / Brasília)

#### MÓDULO 38.D.1 — Data + LGPD + PT-BR

**Pasos:**
- `[38.D.1.1]` Legal entity: DesarrollosMX do Brasil Ltda via Pinheiro Neto. Registro CNPJ + Junta Comercial.
- `[38.D.1.2]` Data sources:
  - **IBGE** (Instituto Brasileiro de Geografia e Estatística) — Censo, IPCA, IVGR (Índice Valores Gerais de Reposição).
  - **Prefeitura-level catastro** (IPTU datasets SP, Rio, BH).
  - **CRECI** (Conselho Regional Corretores Imóveis) — registro asesores.
  - **RFB (Receita Federal)** — NFS-e (Nota Fiscal de Serviços) emission per município.
  - **Sicoob / Sicredi banks** cooperativos data.
- `[38.D.1.3]` **LGPD compliance estrita** (más rigurosa que LFPDPPP):
  - DPO obligatory registered ANPD
  - Bases legais documentadas por processing activity
  - Direitos titulares (acesso, correção, anonimização, portabilidade, eliminação) flujos dedicados
  - Audit trimestral externo
- `[38.D.1.4]` i18n adicional: `messages/pt-BR.json` + translated by native proofreader (no MT-only).
- `[38.D.1.5]` Payment: Pix (instant payment), boleto, cartão via Pagar.me, Stone, Cielo.
- `[38.D.1.6]` Tax: ICMS (state) + ISS (municipal NFS-e) + IR Capital Gains.
- `[38.D.1.7]` Legal signing: ICP-Brasil certs (equivalent DocuSign).

**Criterio de done del módulo:**
- [ ] 4 ciudades BR activas.
- [ ] LGPD audit pass.
- [ ] PT-BR translation complete.

### BLOQUE 38.E — Chile (Santiago / Valparaíso / Concepción)

#### MÓDULO 38.E.1 — Data + CL-specific

**Pasos:**
- `[38.E.1.1]` Legal entity: DesarrollosMX Chile SpA via Carey o Barros. Registro SII (Servicio Impuestos Internos) + Comercio.
- `[38.E.1.2]` Data sources:
  - **INE Chile** — IPC, Índice Real Precios Vivienda.
  - **Conservador Bienes Raíces** (CBR) Santiago, Valparaíso, Concepción — folios electrónicos.
  - **SII** — emisión facturas DTE (Documento Tributario Electrónico).
  - **SERNAC** — consumer protection complaints.
  - **Colegio Corredores** Propiedad CL.
- `[38.E.1.3]` Legal framework: Ley 19.799 (documentos electrónicos) + Ley 19.628 (data protection — menos estricta que MX pero registra titulares) + Ley 20.609 (anti-discrimination).
- `[38.E.1.4]` Payment: Webpay Transbank + transferencia.
- `[38.E.1.5]` Tax: IVA 19% + Impuesto Primera Categoría.
- `[38.E.1.6]` CL-specific: UF (Unidad de Fomento) inflation-indexed unit widely used in real estate → currency table incluye UF como pseudo-currency.

**Criterio de done del módulo:**
- [ ] 3 ciudades CL activas.
- [ ] UF handling correct.

### BLOQUE 38.F — US Latinx expansion (Miami / LA / NY / Houston)

#### MÓDULO 38.F.1 — Cross-border Latinx diaspora play

**Pasos:**
- `[38.F.1.1]` Scope: NO operar como broker en US (licencing complicado 50 state-by-state). Scope es:
  - Marketplace marketing de propiedades MX+LATAM para diaspora Latinx US.
  - Cross-border financial rails (ACH→SPEI vía FASE 37 FX).
  - Data partnerships con US Latinx real estate brokers (ref commission share).
  - Content en español + inglés específico para audience (home-buying in MX as expat/investor).
- `[38.F.1.2]` Legal entity: DesarrollosMX USA LLC Delaware via Cooley LLP. Register FinCEN MSB si movemos >$25K monthly (KYC compliance BSA).
- `[38.F.1.3]` Data sources US focus (pasivo):
  - **ACS (American Community Survey)** Census — demographic Latinx density per zip.
  - **HUD** (Department Housing and Urban Development) — home prices.
  - **Zillow public API** or **Redfin Data Center** — reference only (not compete).
- `[38.F.1.4]` Marketing channels: TikTok en español (diaspora engagement), Telemundo/Univision partnerships, influencer campaigns.
- `[38.F.1.5]` Support bilingual CS team 24/7.
- `[38.F.1.6]` Payment: Stripe US + ACH (Plaid integration) + Wise for cross-border.
- `[38.F.1.7]` Compliance: GLBA (Gramm-Leach-Bliley) for financial data privacy + CCPA California + FinCEN MSB registration.

**Criterio de done del módulo:**
- [ ] Miami + LA + NY + Houston activated as secondary regions (buyer-focused, not seller).
- [ ] Cross-border ACH→SPEI live.

### BLOQUE 38.G — Localization per país

#### MÓDULO 38.G.1 — Partnerships/payment/tax/legal stack per country

**Pasos:**
- `[38.G.1.1]` Tabla `country_operations_config` para centralizar:
  ```sql
  CREATE TABLE public.country_operations_config (
    country_code CHAR(2) PRIMARY KEY REFERENCES public.countries(code),
    legal_entity_name TEXT,
    tax_id TEXT,
    payment_processors TEXT[],
    tax_engine TEXT,
    legal_signing_provider TEXT,
    kyc_provider TEXT,
    compliance_registrations JSONB,             -- {cnbv_fintech: "pending", condusef: "active"}
    supported_currencies CHAR(3)[],
    active_cities TEXT[],
    launch_date DATE,
    country_manager_user_id UUID REFERENCES auth.users(id)
  );
  ```
- `[38.G.1.2]` Seeds initial 6 países (MX, CO, AR, BR, CL, US).
- `[38.G.1.3]` UI admin `/admin/countries` muestra status por country + toggle features per region.
- `[38.G.1.4]` i18n extension ya H1 — extend cuando falta locale (pt-BR, en-US).

**Criterio de done del módulo:**
- [ ] Config table populated 6 países.
- [ ] Admin UI funcional.

### BLOQUE 38.H — Data source integrations per país

#### MÓDULO 38.H.1 — Ver 03.9 para mapping equivalentes multi-country

**Pasos:**
- `[38.H.1.1]` Referencia [03.9 Catalogo Fuentes de Datos](../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md) — tabla mapea fuente MX → equivalente por país.
- `[38.H.1.2]` Implementar ingestors patroneados por `shared/lib/ingest/{country}/` directory siguiendo FASE 07 patterns.
- `[38.H.1.3]` Per-country orchestrator schedules:
  - MX: cron existentes H1
  - CO: shift 1h UTC
  - AR: shift 3h UTC (use UTC-3)
  - BR: shift 3h UTC (UTC-3)
  - CL: shift 4h UTC (UTC-4)
  - US: shift 5-8h UTC
- `[38.H.1.4]` Data source count per país target:
  - MX: 50+ (baseline H1)
  - CO: 15+ (DANE, catastro, CCB, SNR, police, Fedesarrollo)
  - AR: 12+ (INDEC, reporte inmobiliario, AFIP, IGJ, colegios)
  - BR: 18+ (IBGE, IPTU 4 cities, CRECI, RFB, ANPD)
  - CL: 10+ (INE, CBR 3 cities, SII, SERNAC, colegio)
  - US: 8+ (ACS, HUD, Zillow reference, county assessors top 10)
- `[38.H.1.5]` Per-country testing + calibración zone_scores con data sintética + 6 meses backfill live data.

**Criterio de done del módulo:**
- [ ] 6 países con ingestors funcionando.
- [ ] Zone scores computados per país.

## Criterio de done de la FASE

- [ ] 10 metros MX activos + 500 asesores onboarded.
- [ ] 3 ciudades CO activas con legal + payments + data.
- [ ] 3 ciudades AR activas con peso volatility handling.
- [ ] 4 ciudades BR activas con LGPD compliant + PT-BR complete.
- [ ] 3 ciudades CL activas con UF handling.
- [ ] 4 metros US (Miami/LA/NY/Houston) con cross-border Latinx flow.
- [ ] Tabla `country_operations_config` seed 6 países.
- [ ] Ingestors patron per país cumpliendo 3.9 catalog.
- [ ] i18n 5 locales completas + proofread nativos.
- [ ] Compliance registrations per país vigentes (CNBV MX, SIC CO, ANPD BR, etc).
- [ ] Tag git: `fase-38-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md) per-country
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados per country
- [ ] Permission enforcement validado para cada rol + country context

### States
- [ ] Loading states: country switcher, ingest status, city activation
- [ ] Error states: data source timeout, payment failed, KYC rejected per country
- [ ] Empty states: "No listings in this city yet"
- [ ] Success states: first trade per country, ingest complete

### Quality
- [ ] Mobile responsive verificado en 5 locales
- [ ] Accessibility WCAG 2.1 AA
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded across 5 locales (es-MX, es-CO, es-AR, pt-BR, es-CL, en-US)
- [ ] Core Web Vitals green per region (CDN edges per país)

### Automation
- [ ] `npm run audit:dead-ui` pasa per country (0 violations)
- [ ] Playwright E2E per country (signup → first transaction → compliance check)
- [ ] PostHog events tagged por `country_code` property
- [ ] Sentry captures errors grouped by country
- [ ] Ingest monitoring per country — alerts si source falla >24h

### Stubs (si aplica)
- [ ] Países futuros (PE, EC, UY) marcados STUB post-H3
- [ ] STUBs documentados en §5.B

### Sign-off
- [ ] Country managers (6): @____ firmaron launch per país
- [ ] Legal reviewers per país: 5 firmas
- [ ] Compliance officers per país: 5 firmas
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-38-complete aplicado post-merge

## tRPC procedures nuevos (features/countries/routes/)

- `countries.config.get(country_code)`, `countries.config.update(country_code, patch)` (admin)
- `countries.launch.activateCity(country, city_slug, feature_flags)`, `countries.launch.deactivateCity`
- `countries.admin.getMetrics(country_code, period)` — DAU, MAU, GMV, asesores, data freshness per source
- `countries.ingest.status(country_code)` — status de todos los ingestors país
- `countries.ingest.triggerManualRun(country_code, source)` (admin)
- `countries.compliance.getRegistrations(country_code)`, `countries.compliance.updateRegistration(country_code, key, value)`

## Tabla adicional para per-country city activation

```sql
CREATE TABLE public.city_activations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
  city_slug TEXT NOT NULL,
  city_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planning','data_ingest','calibration','soft_launch','live')),
  feature_flags JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ,
  data_sources_status JSONB DEFAULT '{}'::jsonb,
  asesores_onboarded_count INT DEFAULT 0,
  notes TEXT,
  UNIQUE(country_code, city_slug)
);
CREATE INDEX idx_city_activations_country ON public.city_activations (country_code, status);
```

## Crons nuevos

- `ingest_health_per_country` — cada 15 min. Valida última ingesta per source per país, alerta PagerDuty si lag >SLA del país.
- `country_metrics_aggregator` — diario 06:00 UTC por país (offset por tz). Computa metrics country dashboard.
- `per_country_compliance_cron` — mensual día 15. Genera reports per país según registrations (SIC CO, ANPD BR, SII CL, CNBV MX, FinCEN US).
- `fx_cross_border_rates_sweep` — horario. Updates rates corridors (USD-MXN, USD-COP, USD-ARS, USD-BRL, USD-CLP) usados por FASE 37 FX.

## Archivos feature-sliced per-country tracks

```
shared/lib/ingest/
├── mx/                               (ya existe H1)
├── co/
│   ├── dane.ts
│   ├── catastro-bogota.ts
│   ├── catastro-medellin.ts
│   ├── catastro-cali.ts
│   ├── snr.ts                        (Super Notariado Registro)
│   ├── ccb.ts                        (Cámara Comercio Bogotá)
│   └── crime-police-co.ts
├── ar/
│   ├── indec.ts
│   ├── reporte-inmobiliario.ts
│   ├── afip-cae.ts
│   ├── igj.ts
│   └── peso-volatility-handler.ts   (dual currency)
├── br/
│   ├── ibge.ts
│   ├── iptu-sp.ts
│   ├── iptu-rio.ts
│   ├── iptu-bh.ts
│   ├── iptu-brasilia.ts
│   ├── creci.ts
│   ├── nfse-multi-municipio.ts
│   └── sicoob.ts
├── cl/
│   ├── ine-cl.ts
│   ├── cbr-santiago.ts
│   ├── cbr-valparaiso.ts
│   ├── cbr-concepcion.ts
│   ├── sii-dte.ts
│   ├── sernac.ts
│   └── uf-handler.ts                 (UF pseudo-currency)
└── us/
    ├── acs-census.ts
    ├── hud.ts
    ├── zillow-reference.ts            (read-only reference)
    ├── county-assessors/              (county-specific scrapers)
    └── plaid-ach.ts

features/countries/
├── components/
│   ├── country-switcher.tsx
│   ├── admin/
│   │   ├── countries-overview.tsx
│   │   ├── country-detail-page.tsx
│   │   ├── city-activation-wizard.tsx
│   │   └── ingest-health-matrix.tsx
│   └── per-country-overrides/        (UI-level localization extras)
├── lib/
│   ├── country-routing.ts            (routes i18n /[locale]/[country])
│   ├── country-tax-engines/          (tax-mx.ts, tax-co.ts, tax-ar.ts, tax-br.ts, tax-cl.ts, tax-us.ts)
│   ├── country-legal-signing/        (mifiel.ts, certicamara.ts, afip-cae.ts, icp-brasil.ts, dte-sii.ts, docusign-us.ts)
│   └── country-payment-processors/   (stripe.ts, mp.ts, wompi.ts, pagarme.ts, webpay.ts, ach-plaid.ts)
├── routes/
│   └── countries-router.ts
└── schemas/
    └── countries.schema.ts
```

## Features implementadas en esta fase (≈ 25)

1. **F-38-01** México 10 metros zone_scores + asesores onboarded
2. **F-38-02** Per-city feature flag `region_*_enabled` + rollout controlled
3. **F-38-03** Colombia S.A.S. legal + registros
4. **F-38-04** CO ingestors DANE + Catastro + CCB + SNR + Policía
5. **F-38-05** CO payment Wompi + legal signing Certicámara + Ley 1581 compliance
6. **F-38-06** Argentina S.A. legal + AFIP CAE
7. **F-38-07** AR ingestors INDEC + Reporte Inmobiliario + AFIP + IGJ
8. **F-38-08** Peso volatility dual-currency handling + dólar oficial vs blue
9. **F-38-09** AR payment Mercado Pago + legal Ley Corretaje
10. **F-38-10** Brasil Ltda + CNPJ + LGPD strict audit
11. **F-38-11** BR ingestors IBGE + IPTU 4 cities + CRECI + NFS-e + Sicoob
12. **F-38-12** BR payment Pix + boleto + Pagar.me + ICP-Brasil
13. **F-38-13** i18n pt-BR translations complete by proofreader
14. **F-38-14** Chile SpA + SII DTE
15. **F-38-15** CL ingestors INE + CBR + SII + SERNAC
16. **F-38-16** UF handling as pseudo-currency inflation-indexed
17. **F-38-17** CL payment Webpay Transbank + Ley 19.799
18. **F-38-18** US LLC Delaware + FinCEN MSB registration
19. **F-38-19** US data sources ACS + HUD + Zillow reference
20. **F-38-20** Cross-border ACH→SPEI via Plaid + Wise
21. **F-38-21** US Latinx bilingual content + influencer campaigns
22. **F-38-22** Tabla `country_operations_config` + admin UI
23. **F-38-23** Per-country cron schedules offset UTC
24. **F-38-24** 6 country managers dashboards `/admin/countries/{code}`
25. **F-38-25** Data source count alcanzado: MX 50+, CO 15+, AR 12+, BR 18+, CL 10+, US 8+

## Próxima fase

No hay siguiente fase ejecutable. Plan moonshot completo al cierre de FASE 38.

Siguiente iteración: **roadmap H4** posterior a mes 36 — definir post-expansion (Asia-Pacific? Europa? Vertical-specific platforms e.g., DMX Commercial, DMX Industrial, DMX Land?). Requiere ADR-??? (futuro) antes de construir.

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
