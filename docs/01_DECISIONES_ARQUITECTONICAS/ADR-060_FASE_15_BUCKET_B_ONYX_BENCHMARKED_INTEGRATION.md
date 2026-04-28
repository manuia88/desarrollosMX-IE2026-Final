# ADR-060 — FASE 15 Bucket B Onyx-Benchmarked Integration

**Status**: Accepted 2026-04-28 · Founder OK
**Deciders**: Manu (founder) + PM
**Sub-bloque**: FASE 15 onyx-benchmarked v3 (pre-tag `fase-15-onyx-benchmarked`)
**Related ADRs**: ADR-053 (feature module unified pattern), ADR-054 (Studio dentro DMX), ADR-050 (frontend canon), ADR-018 (E2E connectedness + STUBs 4 señales), ADR-008 (monetization tiers canon), ADR-058 (DMX IA add-on), ADR-061 (FASE 18 M21 After-Sales dedicada)

---

## Context

FASE 15 Portal Desarrollador (M10-M15) tiene scope canon original definido en `docs/02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md` (v2 cerrada 2026-04-18) con 8 bloques: 15.A Layout + Dashboard + Site Selection AI, 15.B M11 Inventario, 15.C Canal distribución, 15.D M13 CRM Dev + M14 Marketing Dev, 15.E M15 Analytics IE 7 tabs + Dynamic Pricing daily + Competitor Radar, 15.F UPG 7.10 9 herramientas, 15.G Upload docs + Contabilidad pin stub, 15.X Moonshots, 15.H Plans + feature gating.

Audit competitivo Onyx Technologies (Montréal CA, $60B+ inventario, 135K unidades, 50+ devs activos, clientes Four Seasons + QuadReal + Parkbridge + DevMcGill, mercados CA/EUA/UAE/KSA/FR/GR, idiomas EN+FR únicamente) realizado 2026-04-28 evidencia 50 features distribuidas en 10 módulos:

- **DMX shipped equivalente:** 8 features
- **Canon FASE 15 planeado (no shipped):** 11 features
- **Parcial shipped:** 11 features
- **Gap real (ni código ni canon):** 20 features

Métricas declaradas Onyx (anchor priorización):
- Dynamic pricing IA: +15% revenue/u
- AI pricing: +20% velocidad absorción
- Marketing journeys auto: -30% ciclo ventas
- Unit map interactivo: +30% eficiencia operativa
- Broker collab integrada: -25% ciclo ventas
- Lead response <5min: 21x conversión
- Real-time analytics: +20% velocidad decisión
- Property mgmt: +35% retención

Cancelaciones founder 2026-04-28:
- ❌ M1.1.4 Tours virtuales 360°/Matterport (no entra ni H1 ni H2 — defer indefinido)
- ❌ M4.4.4 Background checks biométricos identidad ventas (no H1)
- ❌ M4.4.5 Tenant screening rentas (no H1, alineado Gate-9 asset class residencial nueva only H1)

Donde DMX SUPERA estructuralmente a Onyx (10 áreas que NO requieren catch-up):
1. Intelligence Engine 15 índices DMX + 5 niveles N1-N5 AI scores
2. Atlas público + Constellations 43K edges
3. DMX Studio Director IA Video (único LATAM)
4. CFDI 4.0 + Facturapi + AML/UIF + ESG nativo MX
5. Multi-país día 1 (5 locales, 4 cities expansion shipped F14.1)
6. Open data LATAM masivo (76K climate + 226 INEGI + 208 ENIGH + 43K constellations)
7. B07 Competitive Intel 8 dimensiones
8. B08 Absorption Forecast 12-24m + 3 escenarios
9. B12 Cost Tracker INEGI INPP real-time
10. Trust Score H05 desarrolladora 5 categorías

## Decision

Integrar 7 upgrades onyx-benchmarked + 4 cross-functions descubiertas en audit como BUCKET B agregado a scope FASE 15 original (BUCKET A canon). Wall-clock estimado FASE 15 v3 onyx-benchmarked: ~50h CC-A multi-agent canon paralelo (3 ventanas) / ~5-7 días calendario.

### BUCKET B — 7 upgrades onyx-inspired H1

Priorizado por business impact declarado Onyx:

| # | ID | Anchor Onyx | Esfuerzo | Ubicación FASE 15 |
|---|---|---|---|---|
| 🥇 | B.6 Lead scoring C01 IA shipped real | 21x conv <5min | 8-12h | 15.D.1.5 reforzado |
| 🥇 | B.7 Journey builder visual básico | -30% ciclo | 16-20h | 15.D.3 nuevo |
| 🥇 | B.4 Ad spend multi-touch + Claude IA pause | optimiz directa | 10-14h | extiende 15.D.2 |
| 🥈 | B.1 Worksheets brokers | -25% ciclo brokers | 8-10h | 15.C.3 nuevo |
| 🥈 | B.2 Unit-level demand heatmap | +30% eficiencia | 6-8h | extiende 15.B.1 |
| 🥈 | B.3 Contracts e-sign Mifiel + smart pre-fill | smart templates | 12-16h | 15.G.3 nuevo |
| 🥉 | B.5 Export BI Power BI/Tableau/Looker | enterprise unlock | 4-6h | 15.H.3 nuevo |

### CROSS-FUNCTIONS — 4 nuevas descubiertas en audit

| # | Origen → Destino | Mecanismo | Esfuerzo |
|---|---|---|---|
| CF.1 | Smart contract pre-fill ↔ M07 Operaciones shipped | Trigger BD operaciones.stage='oferta' → draft contract | incluido B.3 |
| CF.2 | DMX Studio video AI ↔ M14 Marketing Dev | Reusa Studio routes shipped → "Auto-generar video proyecto" tab Marketing | 3-5h (15.D.4 nuevo) |
| CF.3 | Atlas + Constellations ↔ Site Selection AI | Claude function-calling tools (`getConstellationContext`, `getGhostZoneRanking`, `getEcosystemDelta`) | 4-6h (extiende 15.A.4) |
| CF.4 | Trust Score H05 + B.6 Lead score → Worksheet priority sort | UI lógica orden | 1-2h (incluido B.1) |

### Scope total FASE 15 v3 onyx-benchmarked

- BUCKET A canon original (8 bloques sin cambios)
- BUCKET B 7 upgrades onyx-inspired (B.1-B.7)
- 4 cross-functions (CF.1-CF.4)
- 4 tablas BD nuevas: `lead_scores`, `marketing_journeys`, `journey_executions`, `unit_worksheets`, `contracts`, `unit_demand_signals` (jsonb agregado a unidades) + extensión `campaign_analytics` (columnas attribution_*)
- 9 notif types nuevos (17-25): hot lead, worksheet pendiente/aprobada, contract sent/viewed/signed/rejected/expired, ad spend alert
- 3 crons nuevos: `lead_score_recompute_hourly`, `journey_executor_hourly`, `ad_spend_optimizer_daily`, `unit_demand_score_daily`, `worksheets_expire_30min`
- Feature flags adicionales: `dev.lead_scoring_c01`, `dev.journey_builder`, `dev.ad_attribution_multi_touch`, `dev.worksheets`, `dev.demand_heatmap`, `dev.contracts_esign`, `dev.bi_export`

## Multi-agent canon execution (3 olas)

### 🌊 OLA 1 — paralelo 3 ventanas CC-A simultáneas branches independientes (~20h)
- CC-A 1 `feat/fase-15-m11-inventario`: 15.B M11 Inventario completo + B.2 demand heatmap unit-level
- CC-A 2 `feat/fase-15-m13-crm`: 15.D.1 M13 CRM Dev + B.6 lead scoring C01 + B.7 journey builder
- CC-A 3 `feat/fase-15-m15-analytics`: 15.E M15 Analytics IE 7 tabs + Dynamic Pricing daily + Competitor Radar

### 🌊 OLA 2 — secuencial sobre ola 1 (~20h)
- 15.A Layout + Dashboard + Trust Score H05 + Site Selection AI con CF.3 Atlas tools
- 15.C Canal distribución + B.1 Worksheets + CF.4 priority sort
- 15.D.2 M14 Marketing Dev + B.4 ad spend + CF.2 Studio video auto
- 15.G.3 B.3 Contracts e-sign Mifiel + smart pre-fill

### 🌊 OLA 3 — final (~10h)
- 15.F UPG 7.10 9 herramientas Developer Intelligence
- 15.X Moonshots: Simulador + Radar + Reporte Comité + Pipeline Tracker + API Enterprise
- 15.G Upload docs + Contabilidad pin stub
- 15.H Plans seed + feature gating + B.5 BI export
- Seed 9 notif types nuevos
- Tag `fase-15-onyx-benchmarked`

## Bucket C — Defer H2 (canonizar como L-NEW post fase-15-onyx-benchmarked)

18 L-NEW H2 distribuidos por destino concreto (memoria 11):

| L-NEW | Origen Onyx | Fase target |
|---|---|---|
| L-NEW-AFTER-SALES-PORTAL-M21 + 7 sub | M7 8 features | FASE 18 nueva (ADR-061) |
| L-NEW-BUYER-SELF-SERVE-CHECKOUT | M1 1.2 | FASE 21 (M19 full) |
| L-NEW-STRIPE-BUYER-DEPOSITS | M1 1.3 | FASE 22.A Banking |
| L-NEW-PROPERTY-MGMT-LEASING + 4 sub | M10 4 features | H2 sin fase (Gate-9) |
| L-NEW-ML-PERSONALIZATION-CONTENT-ENGINE | M5 5.3 | H2 sin fase |
| L-NEW-PRELAUNCH-MARKET-STUDIES-POLLS | M5 5.6 | H2 sin fase |
| L-NEW-ANOMALY-DETECTION-DASHBOARD-ALERTS | M8 8.4 | FASE 24 SRE |
| L-NEW-CUSTOM-DASHBOARD-DRAG-DROP-WIDGETS | M8 8.3 | H2 sin fase |
| L-NEW-MANAGED-MARKETING-SERVICES-REVENUE | M5 5.7 | H2 sin fase (modelo negocio) |
| L-NEW-MULTI-CURRENCY-MULTI-MARKET-BI | M8 reportes | H2 sin fase |

## Decisiones producto founder lock-in 2026-04-28

| Decisión | Lock-in |
|---|---|
| D.1 Buyer self-serve checkout | defer H2 FASE 22 |
| D.2 M21 After-Sales como FASE 18 nueva | SÍ (ADR-061) |
| D.3 Bucket B 7 upgrades completo | SÍ COMPLETO |
| D.4 Pricing dev tiers ↔ Studio canon | Opción C híbrida — Pro+ dev = Studio Pro bundled |
| D.5 Property mgmt leasing | defer H2 (Gate-9 vigente) |
| D.6 Managed marketing services | defer H2 (modelo negocio) |
| D.7 Smart contract pre-fill engine | integrado a B.3 (+4-6h ya contado en 12-16h) |
| D.8 CF.2 Studio video auto en M14 | SÍ (3-5h, 15.D.4 nuevo) |
| D.9 CF.3 Atlas constellations en Site Selection AI | SÍ (4-6h, extiende 15.A.4) |
| D.10 CF.4 Worksheet priority sort Trust+Score | SÍ (1-2h, incluido B.1) |
| D.11 9 notif types nuevos (17-25) seed | SÍ |
| Cancelaciones | M1.1.4 + M4.4.4 + M4.4.5 confirmadas |

## Consequences

### Positivas
- Cierra 7 gaps competitivos críticos vs Onyx + 4 cross-fn que mejoran portales asesor/dev shipped
- Posicionamiento "Market.Sell" cubierto al 100% post tag (Lease.Manage = FASE 18 + H2)
- Diferenciador único LATAM: CF.2 Studio video auto integrado en flujo dev (Onyx no lo tiene)
- Site Selection AI 10x más preciso que Onyx vía CF.3 Atlas constellations integrado
- Reusa código shipped Marketing M08 + Operaciones M07 + Studio routes (zero rebuild)
- Multi-agent canon paralelizable limpio (3 dominios independientes ola 1)

### Negativas
- +1 mes calendario H1 launch vs scope original (250-400h CC restante → 300-450h)
- Requiere API key Mifiel pre-ola 2 (founder action)
- 4 tablas nuevas + 9 RLS policies + 5 SECDEF functions = audit_rls_allowlist v.N+ obligatorio mismo PR (memoria 22)
- Stub DocuSign multi-país H1 marcado ADR-018 (4 señales: comentario + UI badge + doc módulo + tRPC NOT_IMPLEMENTED)

### Mitigaciones canon
- Multi-agent canon 3 ventanas branches independientes (memoria multi-agent canon)
- MCP apply_migration acceptable pre-merge (memoria 27) para 4 tablas nuevas + types regen
- Audit-dead-ui CI obligatorio (ADR-018) — DocuSign stub marcado explícito 4 señales
- PM audit exhaustivo post-CC pre-push (memoria 17) cada ola

## Validation post-tag fase-15-onyx-benchmarked

- [ ] 11 nuevas features Bucket B + 4 CF shipped + smoke tested en preview Vercel
- [ ] Studio video auto desde M14 dev genera video proyecto end-to-end con APIs reales
- [ ] Lead score C01 alimenta M03/M04 asesor + M01 dashboard widget hot leads
- [ ] Journey builder ejecuta 5 templates seed (bienvenida + follow-up + reactivación + aniversario + drip)
- [ ] Worksheets cross-portal: asesor solicita → dev aprueba → operacion pre-fill cascade
- [ ] Demand heatmap unit-level color-codes correcto basado en signals 30d
- [ ] Contracts pre-fill auto-llena unidades + esquemas + comisión + IVA correcto
- [ ] BI export funciona en 3 formatos (Power BI + Tableau + CSV) con auth Enterprise
- [ ] Site Selection AI usa Atlas constellations tools en function-calling
- [ ] 9 notif types nuevos disparan + se entregan via canales correctos
- [ ] audit-dead-ui CI passes 0 violations
- [ ] audit_rls_strict 1:1 SECDEF↔allowlist v.N+ vigente

## References

- `docs/02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md` (v3 onyx-benchmarked post este ADR)
- `docs/02_PLAN_MAESTRO/FASE_18_AFTER_SALES_M21.md` (nueva, ADR-061)
- `docs/04_MODULOS/M11_INVENTARIO_DEV.md` (post-update con B.2)
- `docs/04_MODULOS/M13_CRM_DEV.md` (post-update con B.6 + B.7)
- `docs/04_MODULOS/M14_MARKETING_DEV.md` (post-update con B.4 + CF.2)
- `docs/03_CATALOGOS/03.1_CATALOGO_BD_TABLAS.md` (post-update 4 tablas nuevas)
- `docs/03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md` (post-update procedures B.1-B.7)
- `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` (post-update 18 L-NEW Bucket C)
- `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` (append decisión N+6 onyx-benchmark)
- Onyx Technologies feature audit (autoritativo founder 2026-04-28, contexto chat)

---

**Autor:** Claude Opus 4.7 (PM canon zero preguntas — memoria 19) | **Fecha:** 2026-04-28
