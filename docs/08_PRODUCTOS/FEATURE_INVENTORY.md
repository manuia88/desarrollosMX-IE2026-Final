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

---

## 9. FASE 11 XL — 75 nuevas capabilities (expansion 2026-04-21)

> **Contexto:** FASE 11 XL agrega 15 índices DMX propietarios + atlas + causal engine + genoma + pulse + flow + ghost zones + stickers + lifepath + climate twin + press kit auto. Arquitectura: `/features/indices/*`, `/features/atlas/*`, `/features/causal/*`, `/features/embed/*`, `/features/lifepath/*`, `/server/api/v1/*`.

### 9.1 Índices DMX (FI-001 a FI-015)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-001 | Índice DMX-MOM (Momentum mensual publicable) | IE-Index | H1 | Full | /indices/dmx-mom, /api/v1/indices/momentum, /api/v1/indices/momentum/monthly |
| FI-002 | Índice DMX-FAM (Zona Familiar) | IE-Index | H1 | Full | /indices/dmx-fam, /api/v1/indices/fam |
| FI-003 | Índice DMX-YUP (Young Urban Professional) | IE-Index | H1 | Full | /indices/dmx-yup, /api/v1/indices/yup |
| FI-004 | Índice DMX-RET (Retirement Fit) | IE-Index | H1 | Full | /indices/dmx-ret, /api/v1/indices/ret |
| FI-005 | Índice DMX-INV (Inversor Retail) | IE-Index | H1 | Full | /indices/dmx-inv, /api/v1/indices/inv |
| FI-006 | Índice DMX-STR (Short-Term Rental fit) | IE-Index | H1 | Full | /indices/dmx-str, /api/v1/indices/str |
| FI-007 | Índice DMX-LIV (Livability compuesto) | IE-Index | H1 | Full | /indices/dmx-liv, /api/v1/indices/livability |
| FI-008 | Índice DMX-RISK (Riesgo Integral) | IE-Index | H1 | Full | /indices/dmx-risk, /api/v1/indices/risk |
| FI-009 | Índice DMX-CLIM (Climate Twin) | IE-Index | H1 | MVP | /indices/dmx-clim, /api/v1/indices/climate-twin |
| FI-010 | Índice DMX-GHOST (Ghost Zones emergentes) | IE-Index | H1 | MVP | /indices/dmx-ghost, /indices/ghost |
| FI-011 | Índice DMX-FLOW (Migration Flow zonal) | IE-Flow | H1 | MVP | /indices/dmx-flow, /indices/flujos, /api/v1/flows |
| FI-012 | Índice DMX-PULSE (Signos Vitales B2B) | IE-Pulse | H1 | MVP | /indices/dmx-pulse, /api/v1/pulse |
| FI-013 | Índice DMX-CULT (Cultural Density) | IE-Index | H2 | Seed | /indices/dmx-cult |
| FI-014 | Índice DMX-EDU (Education Premium) | IE-Index | H2 | Seed | /indices/dmx-edu |
| FI-015 | Índice DMX-ACC (Accesibilidad Universal) | IE-Index | H2 | Seed | /indices/dmx-acc |

### 9.2 Atlas + Explorador + Metodología (FI-016 a FI-025)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-016 | Atlas colonia página pública | Atlas | H1 | Full | /atlas/[colonia] |
| FI-017 | Atlas timeline histórico zona | Atlas | H1 | Full | /atlas/[colonia]/timeline |
| FI-018 | Página /metodologia transparente | Methodology | H1 | Full | /metodologia, /metodologia/[indice] |
| FI-019 | Hub /indices landing | Discovery | H1 | Full | /indices |
| FI-020 | Explorador zonas interactivo | Discovery | H1 | Full | /explorar-zonas |
| FI-021 | Top Movers Daily tabla | Discovery | H1 | Full | /indices/movers, /api/v1/movers/daily |
| FI-022 | Explorar redes conexiones zonas | Discovery | H2 | MVP | /explorar-redes |
| FI-023 | Constelaciones zonas similares | Discovery | H2 | MVP | /indices/constelaciones |
| FI-024 | Historia colonia narrativa | Atlas | H1 | Full | /historia/[colonia] |
| FI-025 | Scorecard Nacional página anual | Report | H1 | Full | /scorecard-nacional, /scorecard-nacional/[year] |

### 9.3 Pro Terminal + Backtest + Alpha + Flujos (FI-026 a FI-035)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-026 | Terminal Pro Bloomberg-style UI | Pro | H1 | MVP | /indices/pro |
| FI-027 | Backtest engine índices | Pro | H1 | MVP | /indices/backtest, /api/v1/backtest |
| FI-028 | Alpha signal detector | Pro | H1 | MVP | /indices/alpha, /api/v1/alpha |
| FI-029 | Flujos migración dashboard | Flow | H1 | MVP | /indices/flujos |
| FI-030 | Constelaciones mapa vector | Pro | H2 | Seed | /indices/constelaciones |
| FI-031 | Ghost zones report inversor | Pro | H1 | MVP | /indices/ghost, /api/v1/ghost-zones |
| FI-032 | Pro Terminal charts 50+ tipos | Pro | H1 | MVP | /indices/pro/charts |
| FI-033 | Pro Terminal custom alerts engine | Pro | H1 | MVP | /indices/pro/alerts |
| FI-034 | Pro Terminal watchlist multi-zona | Pro | H1 | Full | /indices/pro/watchlist |
| FI-035 | Pro Terminal export Excel/PDF | Pro | H1 | Full | /indices/pro/export |

### 9.4 Preview Previews por Persona (FI-036 a FI-040)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-036 | Preview Comprador lead-magnet | Preview | H1 | Full | /preview/comprador |
| FI-037 | Preview Asesor lead-magnet | Preview | H1 | Full | /preview/asesor |
| FI-038 | Preview Developer lead-magnet | Preview | H1 | Full | /preview/developer |
| FI-039 | Preview Master Broker lead-magnet | Preview | H1 | Full | /preview/masterbroker |
| FI-040 | Preview Inversor Institucional | Preview | H1 | MVP | /preview/inversor-institucional |

### 9.5 API v1 Productos Licenciables (FI-041 a FI-055)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-041 | API v1 Momentum Index licensable | API | H1 | Full | /api/v1/indices/momentum |
| FI-042 | API v1 Livability endpoint | API | H1 | Full | /api/v1/indices/livability |
| FI-043 | API v1 Risk Score (aseguradoras) | API | H1 | MVP | /api/v1/risk/score |
| FI-044 | API v1 Time Machine histórico | API | H1 | MVP | /api/v1/time-machine |
| FI-045 | API v1 Genome Similarity búsqueda vibe | API | H1 | MVP | /api/v1/genome/similar |
| FI-046 | API v1 Ghost Zones detection | API | H1 | MVP | /api/v1/ghost-zones |
| FI-047 | API v1 Pulse Score B2B | API | H1 | MVP | /api/v1/pulse |
| FI-048 | API v1 Migration Flow dataset | API | H1 | MVP | /api/v1/flows |
| FI-049 | API v1 Climate Twin Report | API | H2 | Seed | /api/v1/climate-twin |
| FI-050 | API v1 Scorecard Nacional data | API | H1 | Full | /api/v1/scorecard |
| FI-051 | API v1 Causal Explanation endpoint | API | H1 | MVP | /api/v1/causal/explain |
| FI-052 | API v1 Trend Genome Alerts stream | API | H1 | MVP | /api/v1/alerts/trend-genome |
| FI-053 | API v1 webhooks score change | API | H1 | Full | /api/v1/webhooks |
| FI-054 | API v1 OAuth + rate limits + SLA | API | H1 | Full | /api/v1/auth, /api/v1/limits |
| FI-055 | API v1 SDK TypeScript npm | API | H2 | Seed | npm @dmx/sdk |

### 9.6 Widget Embebible + Badges + Stickers (FI-056 a FI-063)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-056 | Widget embebible score por colonia | Widget | H1 | Full | /embed/score/[colonia] |
| FI-057 | Widget config generator | Widget | H1 | Full | /embed/generator |
| FI-058 | Widget Pro sin branding (paid) | Widget | H1 | MVP | /embed/pro/[colonia] |
| FI-059 | Badges galería pública | Marketing | H1 | Full | /badges |
| FI-060 | Sticker DMX-MOM descargable | Marketing | H1 | Full | /badges/momentum |
| FI-061 | Sticker LifeMatch | Marketing | H1 | Full | /badges/lifematch |
| FI-062 | Badge colonia certificada | Marketing | H1 | Full | /badges/certified/[colonia] |
| FI-063 | Sticker API embed code copy-paste | Marketing | H1 | Full | /badges/embed |

### 9.7 LifePath + Climate Twin + Causal Engine (FI-064 a FI-070)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-064 | LifePath Match comprador freemium | LifePath | H1 | Full | /lifepath, /lifepath/match |
| FI-065 | LifePath wizard onboarding vida | LifePath | H1 | Full | /lifepath/wizard |
| FI-066 | LifePath etapas vida transiciones | LifePath | H2 | MVP | /lifepath/stages |
| FI-067 | Climate Twin report aseguradoras | Causal | H1 | MVP | /reports/climate-twin/[colonia] |
| FI-068 | Causal engine explicativo por zona | Causal | H1 | MVP | /indices/[id]/causal, /api/v1/causal |
| FI-069 | Genoma búsqueda vector por vibe | Genome | H1 | MVP | /explorar-zonas/genome, /api/v1/genome |
| FI-070 | Trend Genome Alerts premium B2B | Genome | H1 | MVP | /alertas/trend-genome, /api/v1/alerts |

### 9.8 Alert Radar + Wrapped + Newsletter + Press Kit (FI-071 a FI-075)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-071 | Alert Radar WhatsApp push alerts | Alert | H1 | Full | /alertas, integración WhatsApp Business |
| FI-072 | DMX Wrapped anual personalizado | Marketing | H1 | Full | /wrapped/[year], /wrapped/[user] |
| FI-073 | Newsletter mensual DMX-MOM auto | Content | H1 | Full | /newsletter/mensual, suscripción |
| FI-074 | Newsletter trimestral Scorecard | Content | H1 | Full | /newsletter/trimestral |
| FI-075 | Press Kit Auto suscripción medios | Content | H1 | MVP | /press-kit, /press-kit/subscribe, /api/v1/press-kit |

---

## 10. Totales actualizados post FASE 11 XL

| Categoría | Shipped | Planificado | Propuesto | Reference | **Total** |
|---|---|---|---|---|---|
| Scores IE | 48 | 66 | 0 | 0 | 114 |
| Productos IE | 1 | 5 | 0 | 0 | 6 |
| Índices DMX | 0 | 15 | 0 | 0 | 15 |
| Upgrades U-* | 16 | 0 | 0 | 0 | 16 |
| Upgrades D-* | 11 | 7 | 10 | 0 | 28 |
| UI Components | 5 | 0 | 0 | 0 | 5 |
| Infra Features | 16 | 0 | 0 | 0 | 16 |
| Laterales L-* | 0 | 0 | 72 | 0 | 72 |
| Cross-Functions | 0 | 0 | 16 | 0 | 16 |
| Global Benchmarks | 0 | 0 | 0 | 65 | 65 |
| **FASE 11 XL (FI-*)** | 0 | 75 | 0 | 0 | **75** |
| **TOTAL** | **97** | **168** | **98** | **65** | **428** |

**DMX universo total catalogado: 428 capabilities/features únicos (+83 vs cierre 2026-04-20).**

**Autor FASE 11 XL append:** PM Sr (Opus 4.7) | **Fecha:** 2026-04-21 | **Status:** Planificado H1

---

## 11. Append BLOQUES 11.M + 11.N (2026-04-23)

### 11.1 Genoma Colonias SEED (FI-076 a FI-079)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-076 | Genoma embedding builder 64-dim (H1 determinístico) | Genome | H1 | Full | shared/lib/intelligence-engine/genome/embedding-builder.ts |
| FI-077 | Similarity engine pgvector cosine (reuso colonia_dna_vectors) | Genome | H1 | Full | shared/lib/intelligence-engine/genome/similarity-engine.ts |
| FI-078 | Vibe tags H1 heurística (10 canónicos, reemplazable LLM v1 ADR-022) | Genome | H1 | Full | shared/lib/intelligence-engine/genome/vibe-tags-heuristic.ts |
| FI-079 | UI /indices/[code]/similares + chips DMX + vibe compartidos | Genome | H1 | Full | /indices/[indexCode]/similares |

### 11.2 Futures Curve + Pulse Pronóstico 30d (FI-080 a FI-084)

| ID | Nombre | Dimensión IE | Nivel | Status | Rutas asociadas |
|---|---|---|---|---|---|
| FI-080 | Forward curve calculator 3/6/12/24m con banda CI 95% | Futures | H1 | Full | shared/lib/intelligence-engine/futures/curve-calculator.ts |
| FI-081 | Pulse Pronóstico 30d daily (L93) + banda sombreada | Futures | H1 | Full | pulse_forecasts + projectPulseForecast30d |
| FI-082 | UI /indices/[code]/futuros Recharts + export CSV (Blob nativo) | Futures | H1 | Full | /indices/[indexCode]/futuros |
| FI-083 | VitalSigns forecast prop (mini-sparkline SVG + banda, 11.F cross) | Futures | H1 | Full | features/pulse-score/components/VitalSigns.tsx |
| FI-084 | Newsletter futures_section (11.J cross) | Futures | H1 | Full | features/newsletter/lib/futures-section-builder.ts |

### 11.3 Totales actualizados post BLOQUES 11.M + 11.N

| Categoría | Cambio |
|---|---|
| **FASE 11 XL (FI-*)** | 75 → **84** (+9) |
| **TOTAL** | 428 → **437** (+9) |

**Autor BLOQUES 11.M+11.N append:** Manu Acosta + Claude Opus 4.7 | **Fecha:** 2026-04-23 | **Status:** Shipped H1 (migrations aplicadas remote + 2 commits atómicos locales)
