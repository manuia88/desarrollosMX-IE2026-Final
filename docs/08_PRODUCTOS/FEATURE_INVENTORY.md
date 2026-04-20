# 08.1 — Feature Inventory (consolidado único)

> **Propósito:** inventario maestro de TODAS las features DMX identificadas (existentes + planificadas + propuestas) con IDs únicos, estado actual, fase target, dependencias. Base para empaquetado en productos (ver 08.3 PRODUCT_CATALOG).
> **Principio:** feature aparece SOLO UNA VEZ aquí, aunque se use en múltiples productos. Un producto es combinación de features de este inventario.
> **Última actualización:** 2026-04-20

---

## Taxonomía de IDs

| Prefijo | Categoría | Ejemplo |
|---|---|---|
| **S-Nxx** | Scores nivel N (IE core) | S-F01 Safety · S-N11 DMX Momentum |
| **S-Pxx** | Productos IE (I01-I06) | S-I01 DMX Estimate AVM |
| **S-DMXxxx** | Índices DMX propietarios | S-DMX-IPV · S-DMX-MOM |
| **U-NN** | Upgrades arquitectónicos aplicados | U-01 Vercel cron native · U-13 comparable_zones |
| **D-NN** | Upgrades directos calculators | D-08 weights runtime · D-19 LIME explainable AI |
| **E-NN** | UI Dopamine components | E-01 ConfidenceBadge · E-05 ScoreRecommendations |
| **F-NN** | Infra features (registry/queue/wiring) | F-01 registry · F-02 score_recalc_queue |
| **L-NNN** | Laterales (pipeline) | L-01 Zona Wrapped · L-72 Heat maps colonies |
| **CF-NN** | Cross-functions (combinaciones) | CF-L01 Pulso Inmobiliario · CF-G01 MX Deep Data |
| **G-NN** | Global benchmarks (research ADR-026) | G-FD01 ValueChat · G-LR01 Time Machine |

## Estados

| Estado | Símbolo | Significado |
|---|---|---|
| Shipped | ✅ | En main, tests passing, mergeado |
| Planificado | 🚧 | En roadmap FASE activa/próxima |
| Propuesto | 💡 | Aprobado founder, pendiente fase target |
| Reference-only | 📚 | Research conservado (ADR-026), NO implementación automática |
| Deferred | ⏸️ | H2/H3, backlog |

---

## 1. Scores IE (S-*) — 118 totales

### Nivel 0 Fundacionales (32 shipped)
**21 originales FASE 08:** S-F01 Safety · S-F02 Transit · S-F03 Ecosystem DENUE · S-F04 Air Quality (stub RAMA H2) · S-F05 Water · S-F06 Land Use (stub SEDUVI H2) · S-F07 Predial (stub Catastro H2) · S-H01 School Quality · S-H02 Health Access · S-H03 Seismic Risk · S-H04 Credit Demand · S-H06 City Services (stub 0311 H2) · S-H08 Heritage Zone · S-H09 Commute Time · S-H10 Water Crisis · S-H11 Infonavit Calc · S-A01 Affordability · S-A03 Migration · S-A04 Arbitrage · S-B12 Cost Tracker · S-D07 STR/LTR (AirROI)

**11 nuevos N01-N11 FASE 08 BLOQUE 8.C:** S-N01 Ecosystem Diversity Shannon-Wiener · S-N02 Employment Accessibility · S-N03 Gentrification Velocity · S-N04 Crime Trajectory · S-N05 Infrastructure Resilience · S-N06 School Premium · S-N07 Water Security · S-N08 Walkability MX · S-N09 Nightlife Economy · S-N10 Senior Livability · S-N11 DMX Momentum Index

### Nivel 1 Combinaciones (16 shipped FASE 09)
S-F08 Life Quality Index · S-F12 Risk Map · S-H07 Environmental · S-A02 Investment Simulation · S-A05 TCO 10y · S-A06 Neighborhood · S-A12 Price Fairness · S-B01 Demand Heatmap · S-B02 Margin Pressure · S-B04 Product-Market Fit · S-B07 Competitive Intel · S-B08 Absorption Forecast · S-D05 Gentrification macro · S-D06 Affordability Crisis · S-H05 Trust Score · S-H14 Buyer Persona

### Nivel 2-4 (33 planificados FASE 10)
**N2 14 scores 🚧:** S-F09 Value · S-F10 Gentrification 2.0 · S-B03 Pricing Autopilot · S-B05 Market Cycle · S-B09 Cash Flow · S-B10 Unit Revenue Opt · S-B13 Amenity ROI · S-B14 Buyer Persona Proyecto · S-B15 Launch Timing · S-C01 Lead Score · S-C03 Matching Engine · S-D03 Supply Pipeline · S-H12 Zona Oportunidad · S-H16 Neighborhood Evolution

**N3 12 scores 🚧:** S-A07 Timing Optimizer · S-A08 Comparador Multi-D · S-A09 Risk Score Comprador · S-A10 Lifestyle Match · S-A11 Patrimonio 20y · S-B06 Project Genesis · S-B11 Channel Performance · S-C04 Objection Killer · S-C06 Commission Forecast · S-D04 Cross Correlation · S-H13 Site Selection AI · S-H15 Due Diligence

**N4 7 scores 🚧:** S-E01 Full Project Score interno · S-G01 Full Score 2.0 público · S-E02 Portfolio Optimizer · S-E03 Predictive Close · S-E04 Anomaly Detector · S-D09 Ecosystem Health · S-D02 Zona Ranking

### Nivel 5 AI (26 planificados FASE 12 🚧)
S-C02 Argumentario · S-C05 Weekly Briefing · S-C08 Dossier Inversión · S-E05 Market Narrative · S-E06 Developer Benchmark · S-E07 Scenario Planning · S-E08 Auto Report · S-G02 Narrative 2.0 · S-G03 Due Diligence Report · S-G04 Zone Comparison · S-G05 Impact Predictor · S-D01 Market Pulse · S-D08 Foreign Investment · S-D10 API Gateway Score · S-F11 Supply Pipeline Zone · S-F13 Commute Isócronas · S-F14 Neighborhood Change · S-F16 Hipotecas Comparador · S-F17 Site Selection AI

### Productos IE (6 — I01 shipped, I02-I06 planificados)
S-I01 DMX Estimate AVM ✅ (MVP FASE 08 regresión H1, evolución H2 gradient) · S-I02 Market Intelligence Report 🚧 · S-I03 Feasibility Report 🚧 · S-I04 Índices Licenciables 🚧 · S-I05 Insurance Risk API 🚧 · S-I06 Valuador Automático 🚧

### Índices DMX (7 planificados FASE 11 🚧)
S-DMX-IPV Precio-Valor · S-DMX-IAB Absorción Benchmark · S-DMX-IDS Desarrollo Social · S-DMX-IRE Riesgo Estructural · S-DMX-ICO Costo Oportunidad · S-DMX-MOM Momentum · S-DMX-LIV Livability

---

## 2. Upgrades Arquitectónicos (U-*) — 26 shipped (FASE 08-09)

| ID | Nombre | Fase | Estado |
|---|---|---|---|
| U-01 | Vercel Cron native auth | 8.A.4 | ✅ |
| U-02 | pg_partman score_history particionado | 8.A.3 | ✅ |
| U-03 | Cost tracker hookup runScore | 8.A.2 | ✅ |
| U-04 | Provenance jsonb obligatorio | 8.A.3 | ✅ |
| U-05 | Calculator semver versioning | 8.B | ✅ |
| U-06 | Snapshot tests 16 fixtures CDMX | 8.B | ✅ |
| U-07 | PostHog telemetría rica | 8.B | ✅ |
| U-09 | Fixtures reutilizables | 8.B | ✅ |
| U-10 | Methodology field per calculator | 8.B | ✅ |
| U-11 | Anomaly detection market_anomalies | 8.F | ✅ |
| U-12 | reasoning_template + template_vars | 8.B | ✅ |
| U-13 | comparable_zones precalculadas | 8.B | ✅ |
| U-14 | score_label_key i18n 5 locales | 8.B | ✅ |
| U-P1 | valid_until separado period_date | 8.B | ✅ |
| U-S1 | RLS comparable_zones country filter | 8.B | ✅ |
| U-S2 | hash user_id telemetría | 8.B | ✅ |

## 3. Upgrades Directos calculators (D-*)

**Shipped FASE 09 (4):**
- D-08 Weights runtime configurables ✅
- D-09 Fallback graceful deps missing ✅
- D-10 Score lineage graph ✅
- D-11 Cascade auto-recalc N1↔N0 ✅

**Shipped FASE 08 (7):**
- D-01 Recomendaciones accionables (methodology) ✅
- D-02 Deltas first-class 3m/6m/12m ✅
- D-03 Ranking explícito vs país ✅
- D-04 MAE + intervalos confianza AVM ✅
- D-05 Adjustments auditables ✅
- D-06 Counter-estimate AVM ✅
- D-07 Cache 24h fingerprint AVM ✅

**Planificados FASE 10 (7 🚧):**
- D-13 Confidence propagation dependencies
- D-14 Sensitivity analysis per score
- D-16 Precomputed score matrices comparisons
- D-18 Public vs internal score views
- D-19 Explainable AI LIME ML scores
- D-21 Score change events webhooks
- D-25 Score stability metric

**Propuestos pendientes founder approval (10 💡 TODO #24):**
- D-12 Score explanations AI-generated runtime
- D-15 Score version migration backfill controlled
- D-17 ML model versioning + drift detection
- D-20 Continuous learning feedback loop
- D-22 Data freshness SLA per score
- D-23 Benchmarks cross-country (requiere data CO/AR)
- D-24 Performance monitoring per calculator
- D-26 SDK TypeScript npm package
- D-27 Voice interface Copilot STT/TTS
- D-28 AR preview móvil

## 4. UI Components Dopamine (E-*) — 5 shipped FASE 08 BLOQUE 8.E

- E-01 ConfidenceBadge (4 variantes) ✅
- E-02 ScoreTransparencyPanel (E4 upgrade) ✅
- E-03 ScoreRecommendationsCard (E5) ✅
- E-04 ScorePlaceholder tier-gated ✅
- E-05 IntelligenceCard wrapper ✅

## 5. Infra Features (F-*)

**Shipped FASE 08-09:**
- F-01 Registry central scores ✅
- F-02 score_recalculation_queue ✅
- F-03 Worker cron /api/cron/score-worker daily ✅
- F-04 Cascade dependency graph ✅
- F-05 Cascade replay tool ✅
- F-06 Cost guard rails ✅
- F-07 registerCalculator wiring ✅
- F-08 tier_requirements table ✅
- F-09 market_anomalies table ✅
- F-10 cascade_replay_log ✅
- F-11 score_weights table + admin endpoint ✅
- F-12 score lineage export helper ✅
- F-13 tRPC ieScores router (5 procedures) ✅
- F-14 React hooks ieScores (6 hooks) ✅
- F-15 Playwright e2e smoke tests ✅
- F-16 n1-snapshot-harness 256 cases ✅

---

## 6. Laterales (L-*) — 72 items (LATERAL_UPGRADES_PIPELINE.md)

Ver detalle completo en `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`. Resumen por categoría:

**Retention + Engagement (L-01/04/06/08/09/30-35):**
- L-01 Zona Wrapped anual · L-04 Watchlist zonas · L-06 DMX Vibe Score™ · L-08 Today's Top Movers · L-09 Newsletter zona · L-30 Personality Score · L-31 Multiplayer collab · L-32 Zone Certified · L-33 Predictive Portfolio 20y · L-34 Weekly Newsletter auto-gen · L-35 AI Deep Analysis

**Data Moat + Social (L-10/11/12/13/14/43-52):**
- L-10 Property Fax · L-11 Closing-as-a-Service · L-12 Pro Terminal · L-13 Property API · L-14 Living Map · L-43 Social Radar · L-44 Real-Time Feed · L-45 Verified Reviews · L-46 DMX Spaces · L-47 Community Notes · L-48 Trending extended · L-49 Influencer Map · L-50 Crisis Alerting · L-51 Voice Notes · L-52 For You Feed

**Product UX (L-15/16/17/18/19):**
- L-15 Score Layers Toggle · L-16 Insight Cards · L-17 Score Story vertical · L-18 Score Reactions (dual PPD) · L-19 Comparison Gallery

**Observability + B2B (L-20/21/22/23/24):**
- L-20 Data Quality Dashboard · L-21 Pipeline Audit Trail · L-22 Score Time Travel · L-23 Concierge Onboarding · L-24 Cascade Marketplace

**Listing Intelligence (L-53/54/55/56/57/58 — pilar ADR-025):**
- L-53 Project Intelligence Pipeline · L-54 Developer Claim Cross-Check · L-55 Broker Leaderboard · L-56 DMX Terminal Bloomberg-style · L-57 WhatsApp/Email Broker Integration · L-58 Unified Listing Layer

**Research-derived nuevos 2026-04-20 (L-59/60/61/62/63/64/65/66/67/68/69/70/71/72):**
- L-59 WhatsApp IE Copilot · L-60 LandAnalyzer · L-61 CV Property Features · L-62 Environmental Report PDF · L-63 ExpansionEngine · L-64 Commercial Tier · L-65 Pricing público · L-66 Gender credits · L-67 Time on Market FREE · L-68 Projected Credits forward · L-69 Demand+Salary profiling · L-70 Space Optimization · L-71 Branded PDFs · L-72 Heat maps colonies

**Financial Products (L-37/38/40):**
- L-37 Ready-to-Buy Score · L-38 Zone ESG Rating · L-40 Insurance Bid Engine

---

## 7. Cross-Functions (CF-*) — 16 items

**Locales MX (CF-L1 a CF-L8):** DMX Pulso Trimestral · WhatsApp IE Copilot · LandAnalyzer Enterprise · Property Explorer vector-based · Zone Demographics Profile N13 · Financial Feasibility Pro · DMX Enterprise Dashboard · Comprehensive Appraisal EAA-style

**Globales (CF-G1 a CF-G8):** MX Deep Data · Marketplace IE-embedded · Digital Twin 3D · Quarterly Intelligence vs CBRE/JLL · AI Consulting-as-Service · Conversational Discovery PPD · Broker Aggregator MX · Collaborative RE Decisions

---

## 8. Global Benchmarks (G-*) — 65 items reference-only (ADR-026)

Ver `docs/01_DECISIONES_ARQUITECTONICAS/ADR-026_GLOBAL_PROPTECH_BENCHMARKS.md`. Distribución:
- 25 Features Directos (G-FD01 a G-FD25) — ValueChat, Pierce corporate veil, Likelihood to sell, Image recognition condition, Foot traffic panel, Crowdsourced brokers, AI Video Inspection, etc.
- 20 Cross-Functions (G-CF01 a G-CF20)
- 20 Laterales Revolucionarios (G-LR01 a G-LR20) — Time Machine, Digital Twin 3D, Agentic Broker, Climate Migration Predictor, AR Zone Tour, Institutional Matchmaking, etc.

**Status:** 📚 Reference-only H2+, revisión trimestral.

---

## Totales

| Categoría | Shipped | Planificado | Propuesto | Reference | **Total** |
|---|---|---|---|---|---|
| Scores IE | 48 | 66 | 0 | 0 | 114 |
| Productos IE | 1 | 5 | 0 | 0 | 6 |
| Índices DMX | 0 | 7 | 0 | 0 | 7 |
| Upgrades U-* | 16 | 0 | 0 | 0 | 16 |
| Upgrades D-* | 11 | 7 | 10 | 0 | 28 |
| UI Components | 5 | 0 | 0 | 0 | 5 |
| Infra Features | 16 | 0 | 0 | 0 | 16 |
| Laterales L-* | 0 | 0 | 72 | 0 | 72 |
| Cross-Functions | 0 | 0 | 16 | 0 | 16 |
| Global Benchmarks | 0 | 0 | 0 | 65 | 65 |
| **TOTAL** | **97** | **85** | **98** | **65** | **345** |

**DMX universo total catalogado: 345 capabilities/features únicos.**

---

**Cross-references:**
- `docs/08_PRODUCTOS/PERSONA_MAP.md` — 9 personas con JTBD
- `docs/08_PRODUCTOS/PRODUCT_CATALOG.md` — productos empaquetados
- `docs/08_PRODUCTOS/COMPETITIVE_POSITIONING.md` — matriz vs competidores
- `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` — pipeline laterales vivo
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-025_SOCIAL_LISTING_INTELLIGENCE.md` — pilar social+listing
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-026_GLOBAL_PROPTECH_BENCHMARKS.md` — research global
- `docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md` — detalle técnico 118 scores

**Autor:** PM Sr Dev (sesión product packaging 2026-04-20) | **Status:** Doc vivo, actualizar en cada cierre fase
