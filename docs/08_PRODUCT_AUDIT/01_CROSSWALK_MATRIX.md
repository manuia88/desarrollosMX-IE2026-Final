# 01 — Crosswalk Matrix DMX × Prototype Features (FASE 07.6.B)

> Mapping evidence-based 150 features prototype `DMX_Product_Architecture_Complete.md` vs estado shipped DMX hasta commit `7027801`.
> Generado: 2026-04-24 — sesión 07.6.B (paso 2/6 FASE 07.6 Product Audit)
> Input: `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md` (897 líneas, 8 secciones consolidadas)
> Prototype: `tmp/product_audit_input/DMX_Product_Architecture_Complete.md` (6 capas + 1 transversal · 27 productos · 149 bullets features)
> Método: 7 sub-agents paralelos (1 por capa C1-C6+T) + master consolidation cross-capa
> Output siguiente: `docs/08_PRODUCT_AUDIT/02_DESIGN_MIGRATION.md` (07.6.C) + `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` (07.6.D) + `docs/08_PRODUCT_AUDIT/04_ROADMAP_FASE_08_29.md` (07.6.E)

---

## Resumen ejecutivo

| Métrica | Count |
|---|---|
| **Total features mapped** | **150** |
| Decisión `mantener` (ya existe completo shipped) | 5 |
| Decisión `ampliar/extender` (existe parcial, completar) | 48 |
| Decisión `agregar` (no existe, new-build greenfield) | 97 |
| Decisión `restringir` | 0 |
| Decisión `refactor` | 0 |
| Decisión `skip` | 0 |
| Retrofit 🔄 (apalanca infra existing) | 58 |
| New-build 🆕 (greenfield) | 92 |
| Build-now 🟢 (FASE 07.5.F-15 actuales) | ~55 |
| Build-fase-específica 🟡 (FASE 16-29 roadmap) | ~80 |
| Build-H2+ 🔴 (FASE 30+ / H2/H3 visión) | ~15 |
| Cross-capa overlaps consolidados | 14 canonical resolutions |
| L-NEW candidates nuevos detectados (pre-07.6.F canonization) | 71 |
| L-NEW existentes alineados | ~25 |

### Distribución por capa

| Capa | Features | Status shipped | Retrofit | New-build | Fase target dominante |
|---|---|---|---|---|---|
| C1 CRM Transaccional (LivooCRM) | 30 | 4 parcial · 26 missing · 0 completo | 2 | 28 | FASE 13-14 Asesor Portal (18) |
| C2 Intelligence Engine (IE) | 30 | 21 parcial · 6 missing · 3 completo | 23 | 7 | FASE 11 XL extensions (22) |
| C3 Engagement Engine | 22 | 0 completo · 22 missing | 2 | 20 | FASE 22 WhatsApp+Marketing (8) |
| C4 Marketplace / Distribución | 16 | 2 shipped · 7 parcial · 7 missing | 10 | 6 | FASE 15/23/30 B2B (10) |
| C5 Revenue Intelligence | 28 | 1 shipped · 11 parcial · 16 missing | 12 | 16 | FASE 23 Inversionista (8) + FASE 15 Dev (8) |
| C6 Agente Autónomo | 12 | 0 shipped · 3 parcial · 9 missing | 4 | 8 | FASE 31 Agentic H2 (7) |
| T Transversal Buyer Experience | 12 | 0 shipped · 5 parcial · 7 missing | 5 | 7 | FASE 20 Comprador (11) |
| **TOTAL** | **150** | 3 shipped · 49 parcial · 98 missing | 58 | 92 | — |

### Convención formula RICE (heterogénea entre SAs — flag para 07.6.D)

> Cada SA eligió escala diferente. **Se preserva per-SA** en tablas, pero **sub-sesión 07.6.D canonizará una sola fórmula y re-normalizará todas las filas**.
>
> - **SA-C1 / SA-C2 / SA-C3:** `(R × I × C) / E_hours` donde R = {comprador=100000, asesor=10000, inversionista=5000, dev=1000, desarrollador=500, interno=10}, I = 1-10, C = 0.0-1.0, E = horas. Scores típicos 100-325k.
> - **SA-C4:** `(R × I × C) / E_days` con R,I = 1-5, C = 0-1. Scores típicos 0.09-25.
> - **SA-C5:** `(R × I × C / E)` con R,I,C,E todos 1-5. Scores típicos 3-36 (+ 100 para shipped).
> - **SA-C6:** `(R × I × C) / E_hours` con R = 40-400, I = 2-3, C = 0.3-0.6, E = 6-20 hours. Scores 1.6-52.5.
> - **SA-CT:** `(R × I × C) / E_sessions` con R = 100000, I = 2-3, C = 0.3-0.85, E = 2-5 sessions. Scores 200-850.
>
> **Top-20 critical path abajo** usa **tier normalization** (top-3 per capa + overall judgment) en lugar de ranking directo cross-SA.

---

## Capa C1 — CRM Transaccional (LivooCRM)

> Sub-agent: SA-C1 · Total features: 30 · Productos: 1.1 Asesor BO · 1.2 Lead Intelligence · 1.3 Gemelo Digital · 1.4 Deal Management · 1.5 Brand & Community
> Status: **GREENFIELD H1** — DMX priorizó IE H1 cerrado · CRM stack completo FASE 13-14 planificado · 2 referencias UI mock (`preview-ux`) como demos no producto · bucket `commission-invoices`/`operation-files` provisionados vacíos · RPC `is_operation_participant` existe sin tabla `operaciones` (**gap referencial detectado**)

### Tabla crosswalk C1

| # | Feature prototype | Capa | Status | Evidence | Sim % | Decisión | Retrofit | Scope | M1 BD | M2 Backend | M3 Frontend | M4 E2E | Fase target | Persona | RICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Revenue predictor — "este mes cierras 2 de 7" | C1.1 | 🔴 | NOT_FOUND (no leads/deals/contactos tables; no asesor pipeline tRPC) | 0% | agregar | 🆕 | ML model sobre pipeline_stages × behavioral signals → forecast mensual top-N deals | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×4×0.6)/60 = 400 |
| 2 | Morning briefing co-pilot | C1.1 | 🔴 | NOT_FOUND (ai-copilot genérico en `shared/ui/layout/ai-copilot/`, no asesor BO) | 0% | agregar | 🆕 | LLM agent + revenue_predictor scores → prioritized daily action queue | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×4×0.5)/32 = 625 |
| 3 | Day planner auto | C1.1 | 🔴 | NOT_FOUND (no calendar/agenda; no asesor schedule tables) | 0% | agregar | 🆕 | Auto-scheduler pipeline + Google Calendar OAuth | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×3×0.4)/40 = 300 |
| 4 | Asesor ROI calculator | C1.1 | 🔴 | NOT_FOUND (`commission-invoices` bucket vacío, sin tabla commissions) | 0% | agregar | 🆕 | Tabla commissions + before/after attribution + calc dashboard | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 23 Monetización | asesor | (10000×4×0.5)/24 = **833** |
| 5 | P&L personal | C1.1 | 🔴 | NOT_FOUND (no asesor financial tracking) | 0% | agregar | 🆕 | Tabla asesor_finances + CFDI + forecast curve | 🔴 | 🔴 | 🔴 | 🔴 | FASE 16-17 Contabilidad+DocIntel | asesor | (10000×3×0.3)/48 = 187 |
| 6 | Anti-churn prediction asesor | C1.1 | 🔴 | NOT_FOUND (no telemetry per-asesor; PostHog no wired ADR-007) | 0% | agregar | 🆕 | Behavioral churn ML model + alert pipeline | 🔴 | 🔴 | 🔴 | 🔴 | FASE 24 Observability + 23 | interno | (10×4×0.5)/32 = 0.6 |
| 7 | Commission optimizer | C1.1 | 🔴 | NOT_FOUND (bucket `commission-invoices` vacío) | 0% | agregar | 🆕 | Dynamic commission rules engine + behavioral signals | 🔴 | 🔴 | 🔴 | 🔴 | FASE 23 Monetización | asesor + interno | (10000×3×0.4)/56 = 214 |
| 8 | Lead quality score | C1.2 | 🔴 | NOT_FOUND (no leads table) | 0% | agregar | 🆕 | Tabla leads + behavioral scoring + IE integration | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×5×0.6)/40 = 750 |
| 9 | Waterfall enrichment cascade (7 fuentes IE auto) | C1.2 | 🟡 | dmx_indices 3192 + zone_pulse_scores 83220 + colonia_dna_vectors 210 + `ie/scores.ts` 5 procs (cascade IE existe; falta wiring lead→IE) | 25% | ampliar | 🔄 | Lead enrichment orchestrator consulta dmx_indices/pulse/dna/twin/wiki/forecasts/genome al INSERT | 🟡 | 🟡 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×4×0.7)/24 = **1166** |
| 10 | Buyer twin preloaded (lead llega con zona/rango/DISC/IE) | C1.2 | 🔴 | NOT_FOUND (no buyer_twin/contact_profile; lifepath_user_profiles scope diferente) | 0% | agregar | 🆕 | Tabla buyer_twins polymorphic + preload pipeline al lead INSERT | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 20 Comprador | asesor + comprador | (10000×5×0.6)/48 = 625 |
| 11 | Portal-to-CRM auto-capture | C1.2 | 🟡 | `register_view` RPC + `auth_sessions_log` + extension flow (`features/auth/components/onboarding-form.tsx`); falta CRM ingestion | 25% | ampliar | 🔄 | Anonymous→identified flow + browsing history + lead conversion trigger | 🟡 | 🟡 | 🔴 | 🔴 | FASE 13-14 + 21 Público | asesor + comprador | (10000×4×0.5)/32 = 625 |
| 12 | Lead filter (sólo intención verificada) | C1.2 | 🔴 | NOT_FOUND (no quality threshold gating) | 0% | agregar | 🆕 | Quality threshold gating sobre lead_quality_score + asesor preferences | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×4×0.4)/16 = **1000** |
| 13 | Micro-commitment tracker | C1.2 | 🔴 | NOT_FOUND (`audit_log` partitioned existe para audit no deal signals) | 0% | agregar | 🆕 | Tabla deal_signals event-log + scoring weights + prob update trigger | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×5×0.6)/40 = 750 |
| 14 | Modelo probabilístico contacto (prob 30/60/90 + zona/precio/objeción) | C1.3 | 🔴 | NOT_FOUND (pulse_forecasts zone-level no contact-level) | 0% | agregar | 🆕 | ML model contact-level prob + zona/precio/objeción inference | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 11.T+ ML | asesor + comprador | (10000×5×0.5)/80 = 312 |
| 15 | Recalibración automática cada interacción | C1.3 | 🔴 | NOT_FOUND (`score_recalculation_queue` 3206 es zone scores, no contact) | 0% | agregar | 🆕 | Trigger interaction → enqueue buyer_twin_recalc → ML re-inference | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 Asesor Portal | asesor | (10000×4×0.5)/24 = **833** |
| 16 | Family unit tracking (decisión unit: esposo ROI, esposa seguridad, suegra enganche) | C1.3 | 🔴 | NOT_FOUND (no household/family graph) | 0% | agregar | 🆕 | Tabla family_units + edges buyer_twins + decision_role enum + voice note tagging | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + H2 (FASE 31) | asesor + comprador | (10000×4×0.4)/56 = 285 |
| 17 | Emotion timeline | C1.3 | 🔴 | NOT_FOUND (no sentiment per-contact; ai_memory_store 0 rows) | 0% | agregar | 🆕 | Sentiment extraction por interaction + curve persistence + UI chart | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + H2 | asesor | (10000×3×0.3)/48 = 187 |
| 18 | Perfil DISC auto-detectado (comportamiento + voice notes) | C1.3 | 🔴 | NOT_FOUND (zero "disc" grep excepto disclaimer; no voice notes pipeline) | 0% | agregar | 🆕 | Voice→Whisper + LLM DISC classifier + persistence buyer_twin.disc_profile | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 31 Agentic | asesor | (10000×4×0.5)/56 = 357 |
| 19 | Relationship graph (red referidos trazable) | C1.3 | 🔴 | NOT_FOUND (zone_constellations_edges 21945 es zone-zone, no contact) | 0% | agregar | 🆕 | Tabla referrals + graph queries + UI visualizer | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 22 Marketing | asesor + comprador | (10000×3×0.4)/32 = 375 |
| 20 | Persistent lifecycle (gemelo evoluciona vida: hijo→3 recs) | C1.3 | 🔴 | NOT_FOUND (no lifecycle persistence) | 0% | agregar | 🆕 | Buyer twin lifecycle events + life-stage transitions + re-engagement | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 20 + H2 | asesor + comprador | (10000×4×0.4)/64 = 250 |
| 21 | Deal risk scoring | C1.4 | 🔴 | NOT_FOUND (`is_operation_participant` RPC existe sin tabla operaciones — gap referencial) | 0% | agregar | 🆕 | Tabla deals + risk model + suggested actions | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 18 Legal | asesor | (10000×5×0.5)/56 = 446 |
| 22 | Pipeline visual con contexto mercado (absorción por columna) | C1.4 | 🟡 | `preview-ux/masterbroker/AgentsTable.tsx` columna `pipeline` mock; zone_pulse_scores + dmx_indices absorption disponible | 25% | ampliar | 🆕 | Pipeline UI Kanban + zone absorption overlay desde dmx_indices + pulse | 🔴 | 🔴 | 🟡 | 🔴 | FASE 13-14 Asesor Portal | asesor + masterbroker | (10000×4×0.6)/40 = 600 |
| 23 | Transaction GPS (paso-a-paso cierre, cada doc explicado) | C1.4 | 🔴 | NOT_FOUND (`operation-files` bucket vacío) | 0% | agregar | 🆕 | Transaction stages canonical + cost transparency + doc explainer LLM | 🔴 | 🔴 | 🔴 | 🔴 | FASE 17 DocIntel + 18 | asesor + comprador | (10000×5×0.5)/64 = 390 |
| 24 | Due diligence automático (gravámenes/adeudos/legal) | C1.4 | 🔴 | NOT_FOUND (DocIntel FASE 17; L10 Property Fax planned) | 0% | agregar | 🆕 | OCR RPP + adeudos APIs + legal status report (cross-ref L10) | 🔴 | 🔴 | 🔴 | 🔴 | FASE 17 DocIntel | asesor + comprador | (10000×5×0.5)/80 = 312 |
| 25 | Post-close workflow (NPS + referidos automáticos) | C1.4 | 🔴 | NOT_FOUND (no post-close workflow engine) | 0% | agregar | 🆕 | NPS surveys + referral activation triggers + automated outreach | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13-14 + 22 Marketing | asesor + comprador | (10000×3×0.4)/24 = 500 |
| 26 | Personal brand builder (página pública + track record) | C1.5 | 🔴 | NOT_FOUND (profiles table sin public page; PitchBuilder mock interno) | 0% | agregar | 🆕 | Tabla asesor_public_profiles + reviews + verified track record + public route | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 + 21 Público | asesor + comprador | (10000×4×0.5)/40 = 500 |
| 27 | Asesor report card (score público visible) | C1.5 | 🔴 | NOT_FOUND (no asesor scoring engine público) | 0% | agregar | 🆕 | Asesor performance score + public visibility rules (analog `ie_score_visibility_rules` 7 rows) | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 + 21 Público | asesor + comprador | (10000×4×0.5)/32 = 625 |
| 28 | ELO rating ajustado por dificultad zona | C1.5 | 🔴 | NOT_FOUND (`tier_requirements` 4 rows es zonas IE no asesores) | 0% | agregar | 🆕 | ELO engine asesor × dificultad zona (saturación, pulse, AVM spread) | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 + 22 Marketing | asesor | (10000×3×0.4)/32 = 375 |
| 29 | Leaderboard gamificado (badges Rey/Speed/Sniper + streaks + niveles) | C1.5 | 🟡 | `preview-ux/masterbroker` tests `leaderboard` mock + `zone_streaks` 0 rows (zone-level) + `tier_requirements` 4 rows | 25% | ampliar | 🆕 | Asesor leaderboard table + badges engine + streaks + IE feature unlock | 🟡 | 🔴 | 🟡 | 🔴 | FASE 14 + 22 | asesor | (10000×4×0.5)/40 = 500 |
| 30 | Community asesores por zona | C1.5 | 🔴 | NOT_FOUND (no community tables) | 0% | agregar | 🆕 | Community module (threads/posts) + zone channels + moderation | 🔴 | 🔴 | 🔴 | 🔴 | FASE 22 + H2 (FASE 34 Creator) | asesor | (10000×3×0.3)/64 = 140 |

### Notas C1

- **Decisión breakdown:** mantener 0 · ampliar 3 · agregar 27 · skip 0
- **Status:** 🔴 missing 26 · 🟡 parcial 4 · ✅ completo 0
- **Fase target distribution:** FASE 13-14 = 18 · FASE 16-17 = 4 · FASE 18 = 2 · FASE 21 = 3 · FASE 22 = 5 · FASE 23 = 3 · FASE 24 = 1 · H2 = 4
- **Retrofit 🔄 2 (#9, #11) · New-build 🆕 28**
- **Top 3 RICE C1:** #9 Waterfall enrichment (1166) · #12 Lead filter (1000) · #4 Asesor ROI + #15 Recalibración (833 tied)

---

## Capa C2 — Intelligence Engine (IE)

> Sub-agent: SA-C2 · Total features: 30 · Productos: 2.1 Price Intelligence · 2.2 Zone Intelligence · 2.3 Demand Intelligence · 2.4 Market Oracle · 2.5 Verification Layer
> Status: **MÁS SHIPPED DE TODAS LAS CAPAS** — Core IP DMX · 23 retrofit sobre infra existente · 21 `ampliar`/2 `mantener`/7 `agregar` · base sólida pulse_forecasts 6840 + zone_pulse 83220 + dmx_indices 3192 + colonia_dna 210 + constellations 21945

### Tabla crosswalk C2

| # | Feature prototype | Capa | Status | Evidence | Sim % | Decisión | Retrofit | Scope | M1 BD | M2 Backend | M3 Frontend | M4 E2E | Fase target | Persona | RICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | AVM con spread listado vs cierre (Waze-calibrado) | 2.1 | 🟡 | `shared/schemas/avm.ts`, `avm_estimates` 0 rows, `shared/lib/intelligence-engine/avm/{model-h1,coefficients-h1,comparables,adjustments}`; `a12-price-fairness.ts:45` `internal://ie/avm-i01` | 55% | ampliar | 🔄 | Spread listado-vs-cierre real + calibración Waze CRM. AVM motor v0 shipped | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 + 13/14 CRM cierres | asesor, comprador, inversionista | (10000+100000+5000)·8·0.6/4 = **172,500** |
| 2 | Price truth meter en listing (arriba/abajo/justo) | 2.1 | 🟡 | `shared/schemas/__tests__/avm.test.ts:34` `ie.avm.label.estimate_corroborated`; a12-price-fairness calculator · badge UI listing NOT_FOUND | 50% | ampliar | 🔄 | UI badge "arriba/abajo/justo" en listing card + detail | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 + 21 listings UI | asesor, comprador | (10000+100000)·9·0.5/3 = **165,000** |
| 3 | Comparable engine multidimensional | 2.1 | 🟡 | `avm/comparables.ts`; `property_comparables` 0 rows; `comparable_zones jsonb` en zone_scores; L-NEW36 agendado | 60% | ampliar | 🔄 | Multi-dim layer (buyer persona + momentum + close-vs-list) | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 N3 + L-NEW36 | asesor, comprador, inversionista | (10000+100000+5000)·8·0.5/4 = 115,000 |
| 4 | Oráculo precio futuro AGEB 6/12/24m CI | 2.1 | ✅ | pulse_forecasts 6840 rows + `features/futures-curve/` + `PULSE_FORECAST_DISCLAIMER_KEY` + `shared/lib/intelligence-engine/futures/curve-calculator.ts` + pages `/indices/futuros` shipped | 90% | mantener | 🔄 | Ampliar a 6/12/24m CI + AGEB-level (hoy colonia/alcaldia/city/estado) | ✅ | ✅ | ✅ | 🟡 | FASE 11 + 13 AGEB | inversionista, comprador, asesor, dev | (5000+100000+1000+10000)·8·0.7/2 = **324,800** |
| 5 | Price elasticity modeler | 2.1 | 🟡 | `b10-unit-revenue-opt.ts` (`elasticity_precio` B03 + `elasticityFactor()`); STR `dynamic-advisor.ts` seasonality | 45% | ampliar | 🔄 | Endpoint dedicado dev/asesor (delta%precio → delta%velocidad) | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 N2 expand + 15 dev portal | dev, asesor, inversionista | (500+10000+5000)·9·0.4/4 = 13,950 |
| 6 | Historial precio AGEB serie temporal | 2.1 | 🟡 | `score_history` 42 rows partitioned + `zone_price_index` 0 rows partitioned + `market_pulse` partitioned 2022-2030 shells | 40% | ampliar | 🔄 | Backfill histórico real + UI timeline AGEB | 🟡 | 🔴 | 🔴 | 🔴 | FASE 11 + 13 boundaries+demographics (L-NEW20/21) | asesor, comprador, inversionista | (10000+100000+5000)·7·0.5/5 = 80,500 |
| 7 | Seasonal pattern engine (Nápoles agosto, Del Valle enero) | 2.1 | 🟡 | `features/climate-twin/types/index.ts:37` `seasonality_index`; STR `dynamic-advisor.ts` month seasonality MX; `str_events_calendar` 7 rows | 35% | ampliar | 🔄 | Estacionalidad cross-mercado venta/renta tradicional | 🟡 | 🟡 | 🔴 | 🔴 | FASE 11 pulse extend + 22 newsletter | asesor, inversionista | (10000+5000)·6·0.4/4 = 9,000 |
| 8 | Micro-zone DNA profiling 50+ vars AGEB | 2.2 | ✅ | colonia_dna_vectors 210 rows + `features/genome/` reutiliza tabla + `score-registry.ts:1828`; compute `08_colonia-dna` succeeded; vibe_tags 10 rows | 95% | mantener | 🔄 | Escalar nacional (210 colonias → 31 estados L-NEW14) | ✅ | ✅ | ✅ | 🟡 | FASE 11 + L-NEW14 nacional | asesor, comprador, inversionista, dev | (10000+100000+5000+1000)·9·0.6/2 = **313,200** |
| 9 | Livability personalizado por perfil (familia/joven/inversionista) | 2.2 | 🟡 | `a06-neighborhood.ts` buyer_persona weights (family→H01 0.30, digital_nomad→N08 0.30, senior→N10 0.30); `lifepath_user_profiles` 0 rows; ADR-021 PPD | 70% | ampliar | 🔄 | UI livability score perfilable + más perfiles (inversor, joven) | ✅ | 🟡 | 🟡 | 🔴 | FASE 11 + 20 comprador | comprador, asesor | (100000+10000)·8·0.5/3 = **146,667** |
| 10 | Risk composite 0-100 (Atlas + FGJ + SACMEX + momentum) | 2.2 | 🟡 | `climate-twin/types/index.ts:35-36` flood/drought_risk_score; `find_climate_twins` RPC; `climate_zone_signatures` 228 rows; FGJ/SACMEX NOT_FOUND | 45% | ampliar | 🔄 | Ingesta FGJ criminalidad + SACMEX hídrico + composite 0-100 | 🟡 | 🟡 | 🔴 | 🔴 | FASE 11 + 13 ingesta riesgos | comprador, asesor, inversionista, dev | (100000+10000+5000+1000)·8·0.5/4 = 116,000 |
| 11 | Environmental quality index (ruido + AQI + tráfico) | 2.2 | 🟡 | `str-intelligence/__tests__/env-score.test.ts`: `computeEnvScore` ENV_WEIGHTS.aqi+noise=1; `aqi_avg_30d`, `noise_share`; `zone_aqi_summary` RPC | 50% | ampliar | 🔄 | Extender IE general + tráfico GTFS hourly + UI viewer | 🟡 | 🟡 | 🔴 | 🔴 | FASE 11 + L-NEW30 transit map | comprador, asesor, inversionista | (100000+10000+5000)·7·0.4/4 = 80,500 |
| 12 | Gentrification radar (18-24m señales antes spike) | 2.2 | 🟡 | `features/genome/types/index.ts:23` `'gentrifying'`; `trend-genome/types/index.ts:60`; `score-registry.ts:1768` calculator `alpha/trend-genome.ts`; rate-limit proTier | 65% | ampliar | 🔄 | Layer search-trends + permisos catastro + window 18-24m forecast | ✅ | 🟡 | 🟡 | 🔴 | FASE 11 + 13 catastro | inversionista, dev, asesor | (5000+1000+10000)·9·0.5/4 = 18,000 |
| 13 | Zone discovery engine (gemelas DNA similar) | 2.2 | ✅ | colonia_dna_vectors 210 + zone_constellations_edges 21945 + genoma_similarity edge type; climate_twin_matches 1140 + `find_climate_twins` RPC; pages `/indices/similares` + `clima-gemelo`; L-NEW25 pgvector agendado | 90% | mantener | 🔄 | L-NEW25 pgvector cosine optimización | ✅ | ✅ | ✅ | 🟡 | FASE 11 N5 + L-NEW25 | comprador, inversionista, asesor | (100000+5000+10000)·8·0.6/2 = **276,000** |
| 14 | Development pipeline tracker | 2.2 | 🔴 | `project_scores` 0 rows; NOT_FOUND tabla `development_pipeline`; cruza competitor radar 2.4 | 15% | agregar | 🆕 | Tabla pipeline projects + scraping permisos catastro + impacto absorción | 🔴 | 🔴 | 🔴 | 🔴 | FASE 11 + 15 dev portal | dev, inversionista, asesor | (500+5000+10000)·8·0.4/6 = 8,267 |
| 15 | Demand graph tiempo real (búsquedas = señales geo) | 2.3 | 🔴 | `search_trends` 0 rows partitioned shells; NOT_FOUND tracking real | 15% | agregar | 🆕 | Instrumentar portal-publico queries → search_trends + AGEB agg + heatmap | 🟡 | 🔴 | 🔴 | 🔴 | FASE 21 + 11 | asesor, dev, comprador | (10000+1000+100000)·8·0.5/5 = 88,800 |
| 16 | Demand capture waiting lists | 2.3 | 🔴 | NOT_FOUND tabla waiting_list | 0% | agregar | 🆕 | Tabla waiting_lists + UI subscribe + alerts dev cuando hit threshold | 🔴 | 🔴 | 🔴 | 🔴 | FASE 21 + 15 | comprador, dev, asesor | (100000+1000+10000)·7·0.5/5 = 77,700 |
| 17 | Supply-demand gap alerts | 2.3 | 🟡 | `market_anomalies` 0 rows + `str-intelligence/lib/watchdog/anomaly-detector.ts` (adr_drop/occupancy_drop/listings_drop) | 35% | ampliar | 🔄 | Detector demanda-oferta general + integración search_trends | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 post search_trends | asesor, dev, inversionista | (10000+1000+5000)·8·0.4/4 = 12,800 |
| 18 | Buyer persona generator por zona | 2.3 | 🟡 | `a06-neighborhood.ts:115,140` BuyerPersona types + persona explainer; `lifepath_user_profiles` 0 rows; `dna_migration_matches` 0 rows | 50% | ampliar | 🔄 | Engine que genere persona dominante POR zona basado en cierres reales (CRM dep) | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 + 13/14 CRM | asesor, dev | (10000+500)·8·0.5/4 = 10,500 |
| 19 | Demand pre-validation developers ("80 personas buscando") | 2.3 | 🔴 | NOT_FOUND. Depende de #15 + #16 | 5% | agregar | 🆕 | Endpoint dev portal: input proyecto → output demanda latente | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 post FASE 21 demand graph | dev | (500)·10·0.6/6 = 500 |
| 20 | Market anomaly detector (correlaciones ocultas) | 2.3 | 🟡 | `shared/lib/intelligence-engine/anomaly/detector.ts`; `market_anomalies` 0 rows; STR watchdog como ref | 40% | ampliar | 🔄 | Detector framework presente, falta poblar correlaciones multi-IE | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 + 22 publicación | asesor, inversionista, dev, interno | (10000+5000+500+10)·9·0.4/5 = 11,167 |
| 21 | Absorption forecasting por zona trimestre | 2.4 | 🟡 | `preview-ux/types/index.ts:104` absorptionMonths; `ingest/market/{cbre,jll}.ts` office_net_absorption; mock-only en preview-ux | 30% | ampliar | 🔄 | Engine real cross zona/trimestre. Cross-capa C5 5.1 | 🟡 | 🟡 | 🟡 | 🔴 | FASE 11 + 15 dev portal | dev, inversionista, asesor | (500+5000+10000)·9·0.4/4 = 13,950 |
| 22 | Market timing signals (comprar/esperar) | 2.4 | 🟡 | pulse_forecasts 6840 + futures-curve + dmx_indices 3192 methodology; pages `/indices/movers`, `/indices/streaks`; L-NEW26 agendado | 55% | ampliar | 🔄 | Capa "buy/wait" recomendación cuantitativa user-facing | ✅ | 🟡 | 🟡 | 🔴 | FASE 11 + L-NEW26 | comprador, inversionista, asesor | (100000+5000+10000)·8·0.5/3 = **153,333** |
| 23 | Competitor radar (pipeline proyectos competidores) | 2.4 | 🔴 | NOT_FOUND. Cruza #14 | 5% | agregar | 🆕 | Tabla competitor_projects + ingesta scraping permisos + dashboard dev | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 + 11 ingesta | dev, inversionista | (500+5000)·9·0.5/6 = 4,125 |
| 24 | Waze data crowdsourced (cierre real, objeciones desde CRM) | 2.4 | 🔴 | NOT_FOUND data captura natural CRM. Depende FASE 13/14 | 0% | agregar | 🆕 | Capturar al cerrar: precio cierre, días negociación, objeciones dentro flujo | 🔴 | 🔴 | 🔴 | 🔴 | FASE 13/14 CRM | asesor, interno | (10000+10)·10·0.7/4 = 17,517 |
| 25 | Self-improving loop (cada cierre recalibra) | 2.4 | 🟡 | `score_recalculation_queue` 3206 + `cascade_replay_log` + `ml_training_snapshots` 0 rows + `score_change_webhooks`; trigger `trg_zone_scores_webhook_emit` | 60% | ampliar | 🔄 | ML training loop activo (snapshots 0) + reentrenamiento periódico AVM/futures | ✅ | 🟡 | 🔴 | 🔴 | FASE 11 + 24 + 31 | interno, asesor | (10+10000)·9·0.5/5 = 9,009 |
| 26 | Score desarrollador verificado | 2.5 | 🟡 | `calculators/indices/dev.ts:58-63,199-202` developer_scores H05..H09,H15; `desarrolladoras_encrypt_tax` trigger; NOT_FOUND tabla quejas/entregas | 35% | ampliar | 🔄 | Capa real verificación entregas/quejas/calidad post-compra | 🟡 | 🟡 | 🔴 | 🔴 | FASE 15 + 26 compliance | comprador, dev, interno | (100000+500+10)·8·0.5/4 = 100,510 |
| 27 | Fotos/videos verificados timestamp + geo | 2.5 | 🟡 | `str-intelligence/lib/photos/photo-cv-worker.ts:17` str_photos_metadata.cv_processed_at; `str_photos_metadata` 0 rows; buckets project-photos, profile-avatars public | 40% | ampliar | 🔄 | Extender project-photos + EXIF geo+timestamp validation + UI badge "verified" | ✅ | 🟡 | 🔴 | 🔴 | FASE 15 + 21 | comprador, dev, asesor | (100000+500+10000)·8·0.4/4 = 88,400 |
| 28 | Reviews post-compra verificados | 2.5 | 🟡 | `str_reviews` partitioned + `str_reviews_labels` 0 rows. Compra-venta NOT_FOUND | 25% | ampliar | 🔄 | Tabla `verified_purchase_reviews` enlazada a operaciones + flow post-cierre | 🟡 | 🔴 | 🔴 | 🔴 | FASE 14 + 21 | comprador, asesor | (100000+10000)·7·0.4/4 = 77,000 |
| 29 | Transparency Index (absorción/inv/precios público) | 2.5 | 🟡 | `shared/ui/dopamine/score-transparency-panel.tsx`; `dmx_indices_methodology_versions` + `dmx_indices_audit_log`; `colonia_wiki_entries` 210 rows; ADR-028 Living Atlas | 55% | ampliar | 🔄 | Dataset público estructurado (CSV/API) absorción anonimizada | ✅ | 🟡 | 🟡 | 🔴 | FASE 22 + 30 API as Product (ADR-013) | comprador, interno, dev, inversionista | (100000+10+500+5000)·7·0.5/4 = 92,584 |
| 30 | Certificación asesor por track record real | 2.5 | 🔴 | `zone_certifications` 0 rows scope zonas; `certifications/zone-certified.ts` zona scope; NOT_FOUND `asesor_certifications` | 10% | agregar | 🆕 | Tabla asesor_track_record + métricas + UI badge cert + auto-cert flow | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 + 26 compliance | asesor, comprador, interno | (10000+100000+10)·8·0.5/5 = 88,008 |

### Notas C2

- **Decisión breakdown:** mantener 2 · ampliar 21 · agregar 7 · skip 0
- **Status:** ✅ completo 3 · 🟡 parcial 21 · 🔴 missing 6
- **Fase target:** FASE 11 en 22/30 · FASE 13-14 en 8 · FASE 15 en 8 · FASE 21 en 5 · FASE 22 en 4 · FASE 24/26/30 minor
- **Retrofit 🔄 23 · New-build 🆕 7** (capa MÁS shipped)
- **Top 3 RICE C2:** #4 Oráculo precio AGEB (324,800) · #8 DNA profiling (313,200) · #13 Zone discovery gemelas (276,000)

---

## Capa C3 — Engagement Engine

> Sub-agent: SA-C3 · Total features: 22 · Productos: 3.1 Conversation Intelligence · 3.2 Sequence Engine · 3.3 Smart Matching · 3.4 Value-First Outreach
> Status: **GREENFIELD CASI TOTAL** — 91% decisión "agregar", 91% new-build 🆕 · 100% status 🔴 · zero infra WhatsApp/Whisper/sequences/cadences/financing simulator/DISC · único matcher shipped: lifepath colonia↔buyer (pattern reusable)

### Tabla crosswalk C3

| # | Feature prototype | Capa | Status | Evidence | Sim % | Decisión | Retrofit | Scope | M1 BD | M2 Backend | M3 Frontend | M4 E2E | Fase target | Persona | RICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Agente WhatsApp con contexto IE | 3.1 | 🔴 | NOT_FOUND WhatsApp infra · L57+L59+CF-L2 agendados FASE 22 · channel='whatsapp' enum `trend-genome/schemas/alpha.ts:19` | 5% | agregar | 🆕 | WhatsApp Business API + Claude NLP + IE backend + asesor approval queue | 🔴 | 🔴 | 🔴 | 🔴 | 22 (L57/L59/CF-L2) | asesor | 10000·3·0.6/0.2 = 90,000 |
| 2 | Voice note intelligence (Whisper + DISC + sentiment) | 3.1 | 🔴 | NOT_FOUND whisper | 0% | agregar | 🆕 | Whisper + objection extractor + DISC classifier + sentiment | 🔴 | 🔴 | 🔴 | 🔴 | 22 post-L57 | asesor | 10000·3·0.7/0.3 = 64,286 |
| 3 | Objection playbook dinámico (zona × DISC × momento) | 3.1 | 🔴 | NOT_FOUND playbook · DISC NOT_FOUND | 0% | agregar | 🆕 | objection_playbook (zone × disc × market_phase) + Claude prompt + IE feed | 🔴 | 🔴 | 🔴 | 🔴 | 22 post-voice | asesor | 10000·3·0.5/0.4 = 75,000 |
| 4 | Argument builder (botón generar argumento precio) | 3.1 | 🔴 | NOT_FOUND | 0% | agregar | 🆕 | tRPC `argument.generate` + IE+AVM+plusvalía + Claude render | 🔴 | 🔴 | 🔴 | 🔴 | 13 Asesor portal | asesor | 10000·3·0.4/0.3 = 100,000 |
| 5 | Negotiation co-pilot (tácticas DISC + data + cierres) | 3.1 | 🔴 | NOT_FOUND negotiation · disc solo "disclaimer" | 0% | agregar | 🆕 | DISC per asesor+buyer + closes_history + realtime suggest engine | 🔴 | 🔴 | 🔴 | 🔴 | 22+H2 | asesor | 10000·3·0.7/0.4 = 42,857 |
| 6 | Family-aware messaging (ROI esposo, seguridad esposa, escuelas abuela) | 3.1 | 🔴 | NOT_FOUND family segmentation | 0% | agregar | 🆕 | family_member roles + persona-tagged content templates + i18n | 🔴 | 🔴 | 🔴 | 🔴 | H2 | asesor+comprador | 10000·3·0.6/0.3 = 50,000 |
| 7 | Winning cadence discovery (zona × DISC × precio auto-replicate) | 3.2 | 🔴 | NOT_FOUND cadence | 0% | agregar | 🆕 | sequences + sequence_runs + win_rate + auto-clone per cohort | 🔴 | 🔴 | 🔴 | 🔴 | H2 | asesor | 10000·3·0.7/0.5 = 34,286 |
| 8 | Behavioral trigger nurturing (visitó 3x→reporte, guardó→alerta, etc) | 3.2 | 🔴 | NOT_FOUND · L1 push notif FASE 11.T | 5% | agregar | 🆕 | events stream + trigger rules + content library + omnichannel | 🔴 | 🔴 | 🔴 | 🔴 | 13+22 | comprador | 100000·3·0.6/0.4 = **200,000** |
| 9 | Omnichannel orchestration (WA+portal+email+llamada escalamiento) | 3.2 | 🔴 | NOT_FOUND · email partial `features/newsletter/` | 5% | agregar | 🆕 | channel adapters + escalation rules + state machine | 🔴 | 🔴 | 🔴 | 🔴 | 22+H2 | asesor+comprador | 100000·3·0.8/0.4 = 150,000 |
| 10 | Emotion-triggered interventions (ansiedad post-crédito, silencio post-visita) | 3.2 | 🔴 | NOT_FOUND emotion | 0% | agregar | 🆕 | emotion classifier + intervention catalog + timing optimizer | 🔴 | 🔴 | 🔴 | 🔴 | H2 | comprador | 100000·3·0.8/0.3 = 112,500 |
| 11 | Post-close referral engine (cierre→7d→WA programa referidos) | 3.2 | 🔴 | NOT_FOUND referral | 0% | agregar | 🆕 | close_events trigger + 7d delay + referral_program + market_report | 🔴 | 🔴 | 🔴 | 🔴 | 22 | comprador post-close | 100000·2·0.5/0.4 = 100,000 |
| 12 | Drip condicional comportamiento | 3.2 | 🔴 | NOT_FOUND · cross-ref #8 | 0% | agregar | 🆕 | rules engine DSL + content variants + A/B per branch | 🔴 | 🔴 | 🔴 | 🔴 | 22+H2 | comprador | 100000·3·0.7/0.4 = 128,571 |
| 13 | Smart asesor-buyer matching (DISC + zona + cadencia + carga) | 3.3 | 🔴 | NOT_FOUND · lifepath matching `intelligence-engine/lifepath/matching-engine.ts` (colonia↔buyer NO asesor↔buyer) | 10% | agregar | 🆕 | asesor_profiles (DISC+zones) + buyer_profiles (DISC) + workload + match_score | 🔴 | 🔴 | 🔴 | 🔴 | 13 Asesor | asesor+admin | 10000·3·0.6/0.4 = 50,000 |
| 14 | Autonomous buyer-property matcher (nueva prop → cruce twins → 3 matches → tap) | 3.3 | 🔴 | NOT_FOUND · lifepath colonia matches parcial pattern `features/lifepath/routes/lifepath.ts:61` | 15% | agregar | 🆕 | buyer_twins (gemelo C1) + property listings + top-3 match + draft template + approval | 🔴 | 🔴 | 🔴 | 🔴 | 13+H2 | asesor+comprador | 100000·3·0.7/0.4 = 171,429 |
| 15 | "3 y listo" (comprador 3 props precalificadas por gemelo) | 3.3 | 🔴 | NOT_FOUND · depende gemelo C1 + properties C4 | 5% | agregar | 🆕 | top-3 ranker per buyer twin + delivery channel + feedback loop | 🔴 | 🔴 | 🔴 | 🔴 | 20+H2 | comprador | 100000·3·0.5/0.3 = **200,000** |
| 16 | Precision selling (asesor+táctica+timing asignados por data) | 3.3 | 🔴 | NOT_FOUND · cross-ref #7+#13 | 0% | agregar | 🆕 | cohort win-rate + recommendation engine + task assignment UI | 🔴 | 🔴 | 🔴 | 🔴 | H2 | asesor+admin | 10000·3·0.8/0.5 = 30,000 |
| 17 | Reporte personalizado primer contacto (PDF 1-pág instant vía WA 3-5x response) | 3.4 | 🔴 | NOT_FOUND · scorecard-nacional PDF partial (national, NO per-buyer); L1+L17 agendados | 10% | agregar | 🆕 | template PDF builder + IE pull + 3-prop selector + WA send | 🔴 | 🔴 | 🔴 | 🔴 | 13+22 | asesor+comprador | 100000·3·0.5/0.3 = **200,000** |
| 18 | Social proof engine ("5 personas vieron en 24h") | 3.4 | 🔴 | NOT_FOUND · `register_view` RPC atlas only no listing | 5% | agregar | 🆕 | listing_views + days_to_sell aggregation + display widget | 🔴 | 🔴 | 🔴 | 🔴 | 21+22 | comprador | 100000·2·0.3/0.3 = 222,222 |
| 19 | Financing simulator integrado (enganche+mensualidad antes de preguntar) | 3.4 | 🔴 | NOT_FOUND · grep "cost-calculator" causal-engine + "tax_rules" foundation | 0% | agregar | 🆕 | mortgage calc + INFONAVIT/FOVISSSTE + UI inline listing | 🔴 | 🔴 | 🔴 | 🔴 | 20+21 | comprador | 100000·3·0.4/0.2 = **375,000** |
| 20 | "Pregunta sin pena" (chat IA responde sin juicio) | 3.4 | 🔴 | NOT_FOUND chat público · ai-copilot ⌘J auth-gated `shared/ui/layout/ai-copilot` | 10% | agregar | 🆕 | public chat widget + RAG docs/glossary + zero-shame UX | 🔴 | 🔴 | 🔴 | 🔴 | 21+22 | comprador | 100000·2·0.3/0.2 = **333,333** |
| 21 | Comparador objetivo multidimensional | 3.4 | 🔴 | NOT_FOUND · `property_comparables` 0 rows + `score_comparison_matrix` 0 rows existe scaffolding | 20% | ampliar | 🔄 | UI compare 2-N props side-by-side usando score_comparison_matrix | 🟡 | 🔴 | 🔴 | 🔴 | 21+11 | comprador | 100000·2·0.4/0.3 = 166,667 |
| 22 | Decision engine ("compra esto, aquí está el por qué") | 3.4 | 🔴 | NOT_FOUND · `causal_explanations` 0 rows zona-level no buyer-decision | 15% | agregar | 🔄 | recommendation engine per buyer + top-5 IE proof points + causal narrative | 🔴 | 🔴 | 🔴 | 🔴 | H2 | comprador | 100000·3·0.7/0.4 = 107,143 |

### Notas C3

- **Decisión breakdown:** agregar 21 · ampliar 1 · skip 0
- **Status:** 🔴 missing 22 · 🟡 0 · ✅ 0
- **Fase target:** FASE 22 (8 features peak por dependencia WhatsApp+Claude) · FASE 13 (4) · FASE 20 (2) · FASE 21 (4) · H2 (7 ML/data maduro)
- **Retrofit 🔄 2 (#21, #22) · New-build 🆕 20**
- **Top 3 RICE C3:** #19 Financing simulator (375,000) · #20 "Pregunta sin pena" (333,333) · #15 "3 y listo" + #17 Reporte personalizado + #18 Social proof (~200,000 tied)
- **DISC framework NO existe** — pre-requisite bloqueante para 6 features (#1, #3, #5, #6, #13, #16)

---

## Capa C4 — Marketplace / Distribución

> Sub-agent: SA-C4 · Total features: 16 · Productos: 4.1 Intelligent Marketplace · 4.2 Content & Visual · 4.3 IE as API (B2B2C)
> Status: **MADURO B2B/distribución (4.3) · greenfield consumer marketplace (4.1)** — 2 features already-shipped (widget-embed 4.3.1 + api-v1 core 4.3.2 shipped BLOQUE 11.L) · brecha estructural: tabla `properties` inventory ausente bloquea 4 features (4.1.2/4.1.4/4.1.6/4.2.1)

### Tabla crosswalk C4

| # | Feature prototype | Capa | Status | Evidence | Sim % | Decisión | Retrofit | Scope | M1 BD | M2 Backend | M3 Frontend | M4 E2E | Fase target | Persona | RICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4.1.1 | Programmatic SEO AGEB (landing auto-gen + IE live + schema markup) | 4.1 | 🟡 | `zone_slugs` table (FASE 11.S.-1) + `app/[locale]/(public)/atlas/page.tsx` lista slugs + `colonia_wiki_entries` 210 rows shipped 07.5.E Haiku · NO ruta `/zona/[slug]` SSR data IE live, NO JSON-LD | 60% | ampliar | 🔄 | Conectar `zone_slugs` + `dmx_indices` + wiki en SSR `/zona/[slug]` + sitemap.xml + JSON-LD RealEstateListing/Place + revalidate diario | ✅ | 🟡 | 🔴 | 🔴 | FASE 21 | comprador SEO | (5×4×0.7)/3 = 4.7 |
| 4.1.2 | Discover Weekly (5 props collaborative filtering lunes) | 4.1 | 🔴 | `properties` table NO existe · L-NEW#7 U11 agendado FASE 12+11.J · sin tabla user_interactions/saved_zones | 5% | agregar | 🆕 | Listing inventory (gap H2) + matrix factorization zona × usuario + cron lunes 9am + Resend | 🔴 | 🔴 | 🔴 | 🔴 | FASE 22 post H2 listings | comprador | (3×3×0.4)/8 = 0.45 |
| 4.1.3 | Zone Discovery (collaborative perfil idéntico) | 4.1 | 🟡 | colonia_dna_vectors 210 rows shipped 07.5.C + dna_migration_matches + lifepath_user_profiles 0 rows · L-NEW#25 agendado FASE 11 N5 | 45% | ampliar | 🔄 | DNA cosine top-k zonas vs perfil lifepath; tRPC `discoverZones.similar` | ✅ | 🟡 | 🔴 | 🔴 | FASE 12 N5 | comprador | (4×4×0.7)/3 = 3.7 |
| 4.1.4 | Smart Visit Scheduling (ruta óptima + tráfico + luz natural + talking points) | 4.1 | 🔴 | grep `visit\|scheduler` solo `visits_count` en e03 (input feature) · NO tabla `visit_appointments` ni Mapbox | 0% | agregar | 🆕 | TSP Mapbox Optimization + Google Maps traffic + sun-position + LLM talking points | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 Asesor / 18 portal comprador | comprador + asesor | (4×3×0.5)/8 = 0.75 |
| 4.1.5 | Waiting List por zona | 4.1 | 🟡 | `zone_alert_subscriptions` 0 rows + 5 policies RLS ON · NO UI público · NO match→notif loop | 50% | ampliar | 🔄 | UI suscripción + cron diario match vs inventario (H2) + Resend dispatch | ✅ | 🔴 | 🔴 | 🔴 | FASE 15 + 22 | comprador | (4×4×0.8)/2 = **6.4** |
| 4.1.6 | AR Property Preview | 4.1 | 🔴 | Zero `AR\|augmented\|webxr` · sin geolocation reverse + camera overlay | 0% | agregar | 🆕 | WebXR / iOS AR Quick Look + reverse geocoding + HUD IE overlay | 🔴 | 🔴 | 🔴 | 🔴 | H2 (FASE 32 Digital Twin 4D) | comprador | (2×3×0.2)/13 = 0.09 |
| 4.2.1 | Video tour + data overlay | 4.2 | 🔴 | NO tabla `video_tours` · NO storage bucket video · FFmpeg pipeline ausente | 0% | agregar | 🆕 | Asesor upload MP4 → FFmpeg pipeline overlay datos IE timestamped | 🔴 | 🔴 | 🔴 | 🔴 | FASE 22 multimedia | comprador + asesor | (3×3×0.3)/13 = 0.21 |
| 4.2.2 | Community Reviews colonias verificados post-compra | 4.2 | 🔴 | `colonia_vibe_tags` 0 + `vibe_tags` 10 son tags NO reviews · L-NEW#41 Wiki citizen agendada 22+ | 10% | agregar | 🆕 | Reviews verificados (gated post-operación) + LLM moderation + display wiki | 🔴 | 🔴 | 🔴 | 🔴 | FASE 22 + 18 post-op | comprador writer+reader | (5×3×0.6)/3 = 3.0 |
| 4.2.3 | Fotos/videos verificados sello DMX | 4.2 | 🟡 | `str_photos_metadata` 0 rows schema · `project-photos` bucket público · `record_extension_capture` RPC · NO sistema sello visual | 35% | ampliar | 🔄 | Pipeline EXIF + GPS polígono + photographer_id + SHA256 + sello badge | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador + comprador | (4×4×0.5)/5 = 1.6 |
| 4.2.4 | Marketing Message Generator (copy que ataca dolor real) | 4.2 | 🔴 | grep zero `marketing_message` · `scorecard-nacional/lib/press-kit.ts` PR national NO marketing copy project | 5% | agregar | 🆕 | Anthropic LLM + buyer_persona H14 + zone N1 scores + project specs → 3 variantes | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Portal Dev | desarrollador | (4×4×0.6)/2 = 4.8 |
| 4.3.1 | Widget Embebible Desarrolladoras | 4.3 | ✅ | `features/widget-embed/` 4 components (WidgetPulseCard, WidgetPulseCompare, WidgetScoreCard, WidgetShell) + schemas Zod + tests · `app/embed/{layout,pulse/[coloniaSlug],pulse/vs,score/[coloniaSlug]}` shipped · `widget_embed_registry` 0 rows + 4 policies | 90% | mantener | 🔄 | Pendiente: embed analytics + monetization tier gating + variants (heatmap-mini, comparables-table) | ✅ | ✅ | ✅ | ✅ | FASE 15 + 23 tier gating | desarrollador | (5×5×1.0)/1 = **25** |
| 4.3.2 | API Comparables y Pricing brokerages | 4.3 | ✅ | `features/api-v1/` + `app/api/v1/{indices,colonias,similar,scores/history,docs,keys,estimate,heatmap}` shipped · `api_keys` + `verify_api_key` RPC + tiers free/starter/pro/enterprise · OpenAPI docs · AVM pendiente | 80% | mantener | 🔄 | AVM I01 productivo + endpoint `/api/v1/comparables` + SDK JS/Python | ✅ | 🟡 | ✅ | 🟡 | FASE 30 + 11 AVM | brokerage B2B | (4×5×0.8)/3 = 5.3 |
| 4.3.3 | Risk Composite API fintechs | 4.3 | 🟡 | `dmx_indices` 3192 rows N5 risk + `confidence_thresholds` 10 rows + `confidence_propagation.ts` · NO endpoint `/api/v1/risk` | 40% | ampliar | 🔄 | Endpoint `/api/v1/risk/{property\|zone}` combina F08+A05+D05+D06+climate → 1 score + confidence | ✅ | 🟡 | 🔴 | 🔴 | FASE 30 vertical fintech | fintech B2B | (3×5×0.6)/3 = 3.0 |
| 4.3.4 | Gentrification Radar API fondos | 4.3 | 🟡 | `n03-gentrification-velocity.ts` shipped + tests + `score_history` 42 rows partitioned · NO endpoint público dedicado | 50% | ampliar | 🔄 | Endpoint `/api/v1/gentrification?zone=&horizon=` + time-travel L22 + alpha alerts | ✅ | 🟡 | 🔴 | 🔴 | FASE 23 B2B fund | fondo B2B | (3×5×0.7)/3 = 3.5 |
| 4.3.5 | Data Marketplace B2B suscripción ($5-15K/mes) | 4.3 | 🟡 | Building blocks: colonia_dna 210 + pulse_forecasts 6840 + zone_pulse 83220 + dmx_indices 3192; `subscriptions` table 0 · NO catálogo bundles + Stripe · L-NEW#11 productizado | 35% | ampliar | 🔄 | Catálogo bundles (DemandGraph $5K · ZoneDNA $10K · Wrapped $15K) + Stripe + dashboard self-serve | 🔴 | 🔴 | 🔴 | 🔴 | FASE 23 Monetización | fondo+brokerage+analyst B2B | (3×5×0.4)/8 = 0.75 |
| 4.3.6 | Modelo Plaid/Stripe — DMX invisible infrastructure | 4.3 | 🟡 | L13 "DMX Property API" approved 2026-04-20 FASE 23 · api-v1 shipped + widget-embed + tiers · ADR-013 + ADR-015 Platform Play H2 · NO SDK públicos | 30% | ampliar | 🔄 | SDK npm `@dmx/sdk` + Python `pip dmx` + partner program + revenue share | 🔴 | 🔴 | 🔴 | 🔴 | H2 (FASE 30 Platform API + 33 Data Ecosystem) | dev+brokerage+fintech B2B2C | (5×5×0.5)/13 = 0.96 |

### Notas C4

- **Decisión breakdown:** mantener 2 · ampliar 7 · agregar 7 · skip 0
- **Status:** ✅ completo 2 (widget-embed 4.3.1, api-v1 core 4.3.2) · 🟡 parcial 7 · 🔴 missing 7
- **Fase target:** FASE 15 (3) · FASE 18 (1) · FASE 21 (1) · FASE 22 (3) · FASE 23/30 (5) · FASE 11/12 (1) · H2 (2)
- **Retrofit 🔄 10 (incl 2 shipped) · New-build 🆕 6**
- **Top 3 RICE C4:** 4.3.1 Widget Embebible (25) · 4.1.5 Waiting List (6.4) · 4.3.2 API Comparables (5.3)
- **Brecha estructural:** tabla `properties` ausente → bloquea 4.1.2 / 4.1.4 / 4.1.6 / 4.2.1 (escalar L-NEW PROPERTIES INVENTORY MIGRATION H2)

---

## Capa C5 — Revenue Intelligence

> Sub-agent: SA-C5 · Total features: 28 · Productos: 5.1 Revenue Forecasting · 5.2 Dynamic Pricing · 5.3 Dev Financial Intelligence · 5.4 Investor Platform · 5.5 Gamification & Retention
> Status: **retrofit ratio 43%** — AirROI shipped FASE 07b · AVM engine + E02 portfolio-optimizer + C04 objection killer + streaks-calculator pattern ya shipped · BUILD 57% concentrado en 5.3 Dev Financial (zero infra)

### Tabla crosswalk C5

| # | Feature prototype | Capa | Status | Evidence | Sim % | Decisión | Retrofit | Scope | M1 BD | M2 Backend | M3 Frontend | M4 E2E | Fase target | Persona | RICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C5.1.1 | Asesor revenue forecasting (deals/mes) | 5.1 | 🔴 | NOT_FOUND · `str-intelligence/lib/pricing/dynamic-advisor.ts` scope STR · sin tabla `asesor_revenue_forecasts` | 0% | agregar | 🆕 | Tabla asesor_revenue_forecasts + calc linear regression 12m + cron mensual | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 Asesor | asesor | R3×I3×C2/E2 = 9.0 |
| C5.1.2 | Absorption forecasting por zona (90d) | 5.1 | 🟡 | pulse_forecasts 6840 rows shipped 07.5.C · `features/futures-curve/types/index.ts` forecast_date · cubre price MOM no absorption rate | 55% | ampliar | 🔄 | Extender pulse_forecasts con `absorption_rate_predicted` + vista `zone_absorption_forecasts` | 🟡 | 🟡 | 🟡 | 🔴 | FASE 11.W / 14 | asesor + desarrollador | R4×I3×C2/E2 = 12.0 |
| C5.1.3 | Revenue attribution (canal/mensaje/momento → ROI) | 5.1 | 🔴 | NOT_FOUND · sin attribution_events · marketing analytics FASE 22 pendiente | 0% | agregar | 🆕 | Tabla attribution_events + multi-touch (linear/decay/Markov) + sankey dashboard | 🔴 | 🔴 | 🔴 | 🔴 | FASE 22 Marketing | asesor + masterbroker | R3×I4×C3/E1 = 4.0 |
| C5.1.4 | Cadence analytics (secuencia × zona × perfil) | 5.1 | 🔴 | NOT_FOUND · depende `deals` core ausente | 0% | agregar | 🆕 | outreach_cadences + cadence_steps + cadence_performance · cohort analysis | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 + 22 | asesor | R3×I3×C3/E1 = 3.0 |
| C5.2.1 | Dynamic pricing engine (sube 5%/baja 8%) | 5.2 | 🟡 | STR `dynamic-advisor.ts` shipped (forecast 90d) + `str_pricing_overrides` CRUD · NO para venta primary residencial | 60% | ampliar | 🔄 | Extender `dynamic-advisor.ts` flavor "primary_sale" + nueva tabla `primary_pricing_recommendations` | 🔴 | 🟡 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador + masterbroker | R4×I4×C3/E2 = 10.7 |
| C5.2.2 | Unit-level pricing (piso/orientación/vista) | 5.2 | 🔴 | NOT_FOUND · AVM property-level genérico sin granularidad floor/view/orientation | 15% | agregar | 🆕 | Tabla units + unit_price_estimates + coeffs por atributo (AVM extension) | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador | R3×I4×C4/E1 = 3.0 |
| C5.2.3 | Launch pricing engine (absorción + demanda + comps + momentum) | 5.2 | 🔴 | NOT_FOUND · `tinsa.ts` ingesta valuation_count pero sin calculator launch | 10% | agregar | 🆕 | Extender unit_price_estimates + tabla launch_pricing_runs + calculator | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador | R3×I4×C3/E2 = 8.0 |
| C5.2.4 | Preventa pricing con protección (cláusulas MOM) | 5.2 | 🔴 | NOT_FOUND · sin contracts engine · legal docs FASE 18 pendiente | 0% | agregar | 🆕 | preventa_contracts + preventa_price_adjustments + simulador | 🔴 | 🔴 | 🔴 | 🔴 | FASE 18 Legal+Pagos | desarrollador + comprador | R2×I4×C4/E1 = 2.0 |
| C5.2.5 | Auto-valuation updater semanal | 5.2 | 🟡 | AVM engine shipped `shared/lib/intelligence-engine/avm/model-h1.ts` + `avm_estimates` 0 rows · NO cron domingo recalc + notif | 50% | ampliar | 🔄 | Cron `avm_weekly_recompute` domingos + `notify_avm_drift` delta>3% + ingest_runs observability | 🟡 | 🔴 | 🔴 | 🔴 | FASE 11.X / 24 | comprador + desarrollador | R4×I3×C2/E1 = 6.0 |
| C5.3.1 | Price justification report PDF | 5.3 | 🔴 | NOT_FOUND · `dossier-exports` bucket existe pero sin generator pricing-justification | 5% | agregar | 🆕 | Reusa bucket + tabla price_justification_reports + generador react-pdf | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador | R3×I4×C2/E1 = 6.0 |
| C5.3.2 | Developer CFO virtual (Monte Carlo) | 5.3 | 🔴 | NOT_FOUND · sin financial modeling engine | 0% | agregar | 🆕 | project_financial_scenarios + Monte Carlo 1000 iters + macro_series | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 proTier | desarrollador | R3×I4×C4/E1 = 3.0 |
| C5.3.3 | Unit mix optimizer (60%2rec / 30%3rec / 10%studio) | 5.3 | 🔴 | NOT_FOUND · colonia_dna_vectors 210 tiene info zona no demand graph vs unit types | 10% | agregar | 🆕 | zone_unit_demand_curves + persona segmentation + linear programming | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador | R3×I4×C4/E1 = 3.0 |
| C5.3.4 | Amenity value ranker (estacionamiento 3x > gym) | 5.3 | 🔴 | NOT_FOUND · AVM `adjustments.ts` tiene `amenidades_count` flat 1 coef no individual | 20% | ampliar | 🔄 | Nueva tabla amenity_value_coefficients por zona×persona + regresión vs deals | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador | R3×I4×C3/E1 = 4.0 |
| C5.3.5 | Pre-sale intelligence (vende unidades X primero) | 5.3 | 🔴 | NOT_FOUND · depende C5.3.3 + persona matching | 5% | agregar | 🆕 | pre_sale_recommendations + calculator combina C5.3.3 + persona + cadence | 🔴 | 🔴 | 🔴 | 🔴 | FASE 15 Desarrollador | desarrollador | R3×I3×C3/E1 = 3.0 |
| C5.3.6 | Objection feedback loop (→ producto + marketing) | 5.3 | 🟡 | C04 calculator shipped `calculators/n3/c04-objection-killer.ts` detecta categoría + evidencia · NO loop dev-side | 50% | ampliar | 🔄 | Nueva tabla objections_aggregated_for_dev + agregador semanal + dashboard | 🔴 | 🟡 | 🔴 | 🔴 | FASE 15 Desarrollador cross C1 | desarrollador + asesor | R4×I4×C2/E2 = **16.0** |
| C5.4.1 | Portfolio dashboard inversor (ROI/riesgo/diversificación) | 5.4 | 🟡 | E02 Portfolio Optimizer shipped `n4/e02-portfolio-optimizer.ts` Sharpe + HHI · registry note `STUB FASE 33` · STR portfolio-optimizer separate | 65% | ampliar | 🔄 | Wire E02 stub completo → activar FASE 23 + investor_portfolios + portfolio_holdings | 🔴 | 🟡 | 🔴 | 🔴 | FASE 23 Inversionista | inversionista | R4×I4×C3/E2 = 10.7 |
| C5.4.2 | Market timing alerts (COMPRAR/ESPERAR tipo trading) | 5.4 | 🟡 | `zone_alpha_alerts` 0 rows defined not populated + pulse_forecasts 6840 · sin engine emisión signals | 35% | ampliar | 🔄 | Reusa zone_alpha_alerts + signal_type buy/wait/sell + justificación · cron diario | 🟡 | 🟡 | 🔴 | 🔴 | FASE 23 Inversionista | inversionista | R4×I4×C2/E2 = **16.0** |
| C5.4.3 | AirROI integrado yield STR | 5.4 | ✅ | AirROI fully shipped FASE 07b: airroi_spend_ledger + airroi_pricing.ts + str_markets + 26 mcp tools · STR-Intelligence completo | 100% | mantener | 🔄 | n/a (existe) — solo wire surface investor portal | ✅ | ✅ | ✅ | ✅ | FASE 23 surface | inversionista | R5×I4×C1/E5 = 100 shipped |
| C5.4.4 | Diversification advisor | 5.4 | 🟡 | E02 `diversification_index` HHI inversa · sin engine cross-zone recomendaciones | 40% | ampliar | 🔄 | Reusa investor_portfolios + constellations_edges 21945 low-correlation zones | 🔴 | 🔴 | 🔴 | 🔴 | FASE 23 Inversionista | inversionista | R3×I4×C3/E2 = 8.0 |
| C5.4.5 | Quarterly reporting automático | 5.4 | 🔴 | NOT_FOUND · `dossier-exports` bucket existe no usado investors | 10% | agregar | 🆕 | investor_quarterly_reports + generador PDF + cron quarterly + email | 🔴 | 🔴 | 🔴 | 🔴 | FASE 23 Inversionista | inversionista | R3×I3×C2/E2 = 9.0 |
| C5.4.6 | Optimal hold period calculator | 5.4 | 🔴 | NOT_FOUND · pulse_forecasts 90d-12m precio pero no optimal sell point | 25% | agregar | 🆕 | optimal_hold_recommendations + calculator IRR maximization + capital gains tax | 🔴 | 🔴 | 🔴 | 🔴 | FASE 23 Inversionista | inversionista | R3×I4×C3/E2 = 8.0 |
| C5.4.7 | Capital reallocation suggestions | 5.4 | 🔴 | NOT_FOUND · combinación C5.4.4 + C5.4.6 ausente | 5% | agregar | 🆕 | capital_reallocation_suggestions + calculator combina E02+signals+hold+costs | 🔴 | 🔴 | 🔴 | 🔴 | FASE 23 Inversionista | inversionista | R3×I4×C4/E1 = 3.0 |
| C5.4.8 | Investment calculator 5y | 5.4 | 🟡 | AVM + pulse_forecasts + AirROI yield STR · NO calculator unificado consumer-facing | 45% | ampliar | 🔄 | investment_calculator_runs + long-term-projector (AVM+MOM+AirROI+tax) + share | 🔴 | 🔴 | 🔴 | 🔴 | FASE 21 Público + 23 lead magnet | inversionista + comprador | R5×I3×C2/E3 = **22.5** |
| C5.5.1 | Leaderboard ELO ajustado por dificultad zona | 5.5 | 🔴 | NOT_FOUND · `preview-ux/mock/agentes-mock.ts` badges hardcoded · sin tabla asesor_elo_ratings | 10% | agregar | 🆕 | asesor_elo_ratings + history + zone_difficulty_coefficients + Glicko-2 | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 Asesor gamif | asesor | R3×I3×C2/E3 = 13.5 |
| C5.5.2 | Badges Rey/Speed/Sniper | 5.5 | 🟡 | preview-ux mocks badges (top_closer, streak_week, alpha_hunter, rising_star); badge_metadata json col · sin engine activo | 25% | ampliar | 🔄 | asesor_badges + badge_definitions + criteria DSL + awarder cron | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 + 22 | asesor | R4×I3×C2/E3 = **18.0** |
| C5.5.3 | Streaks actividad diaria | 5.5 | 🟡 | `zone_streaks` 0 rows schema ready + `features/newsletter/lib/streaks-calculator.ts` shipped (zone-level) · sin asesor-level streaks | 50% | ampliar | 🔄 | Reusa pattern → asesor_daily_activity_streaks + cron diario + milestones | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 Asesor | asesor | R4×I3×C1/E3 = **36.0** |
| C5.5.4 | Niveles desbloquean features IE progresivamente | 5.5 | 🟡 | `tier_requirements` 4 + tenant_scopes + ie_score_visibility_rules 7 + feature_registry 120 + role_features 432 — infra gating EXISTS · sin level/XP per usuario | 50% | ampliar | 🔄 | asesor_levels + level_unlocks + xp_events + wire ui_feature_flags | 🔴 | 🔴 | 🔴 | 🔴 | FASE 14 + 23 | asesor | R3×I4×C3/E2 = 8.0 |
| C5.5.5 | Developer project ratings (preventa) | 5.5 | 🔴 | NOT_FOUND · STR super-host-score scope hospedaje · `desarrolladoras` 0 rows sin rating | 15% | agregar | 🆕 | developer_ratings + developer_reviews + weighted avg + bayesian low-N + verified_buyer | 🔴 | 🔴 | 🔴 | 🔴 | FASE 23 + 24 Desarrollador | inversionista + comprador | R4×I4×C3/E1 = 5.3 |

### Notas C5

- **Decisión breakdown:** mantener 1 · ampliar 11 · agregar 16 · skip 0
- **Status:** ✅ completo 1 (AirROI) · 🟡 parcial 11 · 🔴 missing 16
- **Fase target:** FASE 23 Inversionista (8) + FASE 15 Desarrollador (8) + FASE 14 Asesor (5) · FASE 11.W/X (2) · FASE 18 (1) · FASE 21 (1) · FASE 22 (2) · FASE 24 (1)
- **Retrofit 🔄 12 · New-build 🆕 16**
- **Top 5 RICE C5:** C5.5.3 streaks asesor (36.0) · C5.4.8 investment calc 5y (22.5) · C5.5.2 badges asesor (18.0) · C5.3.6 objection feedback dev (16.0) · C5.4.2 market timing alerts (16.0)
- **Anomalías críticas:** `avm_estimates` 0 rows (bloquea C5.2.5) · `zone_streaks` 0 rows pese calculator shipped (cron failed) · `properties`/`deals` core ausente (bloquea C5.4.1/C5.4.6/C5.4.7/C5.5.5)

---

## Capa C6 — Agente Autónomo

> Sub-agent: SA-C6 · Total features: 12 · Productos: 6.1 Opportunity Engine · 6.2 Report Factory · 6.3 Full Cycle Agent
> Status: **H2/H3 confirmado** — 9 missing (75%) · 3 parcial (25%) · 0 shipped · 12/12 "agregar" · 7 features → FASE 31 Agentic (ADR-014)

### Tabla crosswalk C6

| # | Feature prototype | Capa | Status | Evidence | Sim % | Decisión | Retrofit | Scope | M1 BD | M2 Backend | M3 Frontend | M4 E2E | Fase target | Persona | RICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Opportunity hunter 24/7 SEDUVI/DENUE/catastro | 6.1 | 🟡 | `shared/lib/ingest/geo/seduvi.ts` STUB H2 OFF (throws `seduvi_not_implemented_h2`) · `denue.ts` ingest activo · cron-registry DENUE activo SEDUVI/catastro_cdmx allowlist · ZERO orchestrator loop ni surfacing UI | 12% | agregar | 🆕 | Loop continuo multi-source → enqueue oportunidades scoreables (señal uso suelo + DENUE aperturas + SEDUVI permisos) | 🔴 | 🔴 | 🔴 | 🔴 | FASE 31 Agentic post-H2 | asesor + desarrolladora | R=300 I=3 C=0.4 E=10 → **36** |
| 2 | Auto-captación legal (demand gap alto + argumentos IE) | 6.1 | 🔴 | NOT_FOUND `auto_captacion` · `ghost_zones_ranking` 210 rows cubre detección zonas NO genera propuesta | 5% | agregar | 🆕 | Agent compara demand vs inventario por zona → propone listado + script IE → notifica asesor | 🔴 | 🔴 | 🔴 | 🔴 | FASE 31 Agentic | asesor captador | R=180 I=3 C=0.5 E=8 → 13.5 |
| 3 | Proactive developer outreach (business case "40 unidades 22% ROI") | 6.1 | 🔴 | NOT_FOUND · pulse_forecasts 6840 absorción base + `str-intelligence/lib/scores/zone-investment-score.ts` ROI zona NO business case package | 8% | agregar | 🆕 | Generador PDF/email business case por zona target → absorción + ROI + competencia + demanda + envío CRM devs | 🔴 | 🔴 | 🔴 | 🔴 | FASE 31 + cross FASE 15 | desarrolladora | R=120 I=3 C=0.5 E=6 → 12 |
| 4 | Market anomaly discovery (correlaciones nuevas IE) | 6.1 | 🔴 | `market_anomalies` 0 rows 2 policies + STR `watchdog/anomaly-detector.ts` threshold-based NO discovery reglas nuevas · ZERO ML correlation-mining sobre IE 118 scores | 18% | agregar | 🔄 | Engine mina correlaciones nuevas entre N0-N5 + DMX + pulse + climate → propone reglas alpha | 🟡 | 🔴 | 🔴 | 🔴 | FASE 31+ H2/H3 | data team + IE owners | R=80 I=2 C=0.4 E=10 → 6.4 |
| 5 | Morning briefing diario asesores | 6.2 | 🔴 | NOT_FOUND · ZERO cron briefing · `auth_sessions_log` no usado activity · Asesor portal FASE 13-14 no shippeada | 3% | agregar | 🆕 | Cron 6am: por asesor → top 5 acciones priorizadas → email + WA + dashboard hero | 🔴 | 🔴 | 🟡 | 🔴 | FASE 14 stub + 26 polish + 31 self-improve | asesor primary | R=400 I=3 C=0.6 E=8 → **24** |
| 6 | Reporte semanal mercado por zona | 6.2 | 🟡 | `scorecard-nacional` shipped (PDF generator react-pdf, storage `reports/scorecard/`); cubre trimestral nacional NO weekly zona · zone_pulse 83220 + pulse_forecasts 6840 · ZERO weekly cron zone-scoped | 25% | agregar | 🔄 | Cron lunes 7am → por zona suscrita → PDF 2-4 páginas + hero infographic + delivery email/WA | 🔴 | 🟡 | 🟡 | 🔴 | FASE 22 + 26 | asesor + suscriptor zona | R=300 I=3 C=0.5 E=6 → **30** |
| 7 | Reporte mensual portfolio inversionistas | 6.2 | 🔴 | NOT_FOUND `portfolio_report` · `str-intelligence/routes/portfolio.ts` input no genera reports · `reports.ts` STR-only scope | 10% | agregar | 🆕 | Cron 1ro mes → por inversionista → PDF ROI realizado vs forecast + riesgo + diversificación + 3 recos | 🔴 | 🔴 | 🟡 | 🔴 | FASE 23 + 31 | inversionista Pro | R=150 I=3 C=0.5 E=8 → 8.4 |
| 8 | Reporte trimestral absorción desarrolladoras | 6.2 | 🟡 | `scorecard-nacional` shipped trimestral nacional · NO trimestral por desarrolladora con competidor-level · `desarrolladoras` 0 rows · ZERO competitor mapping | 22% | agregar | 🔄 | Cron quarterly → por desarrolladora cliente → PDF forecast 12m + competidores top5 + demand heatmap + reco pipeline | 🔴 | 🟡 | 🔴 | 🔴 | FASE 15 + 31 | desarrolladora B2B | R=80 I=3 C=0.5 E=8 → 5 |
| 9 | Auto-distribución WhatsApp + email reports | 6.2 | 🔴 | `trend-genome/schemas/alpha.ts:19` enum channels email/whatsapp/push schema-only · `alerts-engine.ts:124` filter channel · ZERO sender provider (Twilio/WA Business/Resend) · `newsletter_deliveries` 0 rows email-only | 8% | agregar | 🔄 | Provider WA Business + Resend → delivery service compartido reports 5/6/7/8 + tracking opens/clicks | 🟡 | 🔴 | 🟡 | 🔴 | FASE 22-23 + 31 | cross-persona | R=350 I=3 C=0.4 E=8 → **52.5** |
| 10 | Full Cycle Agent (detectar→matchear→reportar→responder→objeciones→agendar→propuesta) | 6.3 | 🔴 | NOT_FOUND `full_cycle` · ZERO orchestrator · `ai_memory_store` 0 rows + `match_ai_memory` RPC (memoria agente base) · `ia-generativa/routes/ai.ts` 1 mutation + `memory.ts` 3 procs base LLM-call no agent-loop | 5% | agregar | 🆕 | State machine 7 pasos + persistencia trace + retry/abort + handoff asesor + WA Business | 🔴 | 🔴 | 🔴 | 🔴 | FASE 31 Agentic (ADR-014) full | asesor + comprador | R=80 I=3 C=0.3 E=20 → 3.6 |
| 11 | Human-in-the-loop (asesor aprueba puntos críticos) | 6.3 | 🔴 | NOT_FOUND `hitl` · ZERO checkpoint table · `role_requests` workflow approve/reject existe como patrón aprobación scope auth no agent | 4% | agregar | 🆕 | Checkpoint table + required_approval por step crítico → notif push → approve/edit/reject → resume | 🔴 | 🔴 | 🔴 | 🔴 | FASE 31 Agentic | asesor primary | R=80 I=3 C=0.4 E=10 → 9.6 |
| 12 | Self-improving (cada ejecución mejora agente) | 6.3 | 🔴 | NOT_FOUND `self_improving` · `ml_training_snapshots` 0 rows base IE scope no agent · ZERO RLHF/eval pipeline | 6% | agregar | 🆕 | Eval harness por run + snapshot prompts/policies/thresholds + A/B + promote winning | 🟡 | 🔴 | 🔴 | 🔴 | FASE 31+ H3 | platform team | R=40 I=2 C=0.3 E=15 → 1.6 |

### Notas C6

- **Decisión breakdown:** mantener 0 · ampliar 0 · agregar 12 · skip 0
- **Status:** 🔴 missing 9 · 🟡 parcial 3 · ✅ 0
- **Fase target:** FASE 31 Agentic (ADR-014 H2) = 7 · FASE 14 stub = 1 · FASE 22-23 = 2 · FASE 15 = 1 · H3 = 1
- **Retrofit 🔄 4 (#1, #4, #6, #8 - sobre scorecard pdf-generator + market_anomalies + alpha alerts schemas + ml_training_snapshots) · New-build 🆕 8**
- **Top 3 RICE C6:** #9 Auto-distribución WA+email (52.5) · #1 Opportunity hunter (36) · #6 Reporte semanal zona (30)

---

## Capa T — Transversal Buyer Experience

> Sub-agent: SA-CT · Total features: 12 · Productos: T.1 Zero Fear Buying · T.2 Compañero de Vida Inmobiliario
> Status: **Greenfield comprador H1** — 22 calculators `category: 'comprador'` shipped infrautilizados · 11/12 features mapean FASE 20 Portal Comprador · cross-cuts C1-C6 · 6 overlaps explícitos flagged para master CC consolidation

### Tabla crosswalk T

| # | Feature prototype | Capa | Status | Evidence | Sim % | Decisión | Retrofit | Scope | M1 BD | M2 Backend | M3 Frontend | M4 E2E | Fase target | Persona | RICE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T.1.1 | Decision engine "compra esto, aquí está el por qué" IE datos duros | T.1 | 🟡 | 25+ scores comprador en `score-registry.ts` + `causal_explanations` 0 rows + `features/causal-engine/` + tRPC `causal` router (2 procs) + explainability LLM shipped 07.5.E. **OVERLAP C3.4** | 60% | ampliar | 🔄 | UI "veredicto" sobre 1 propiedad: top 3 razones IE + top 3 contras + GO/NO-GO confidence | 🔴 | 🟡 | 🔴 | 🔴 | FASE 20 (BLOQUE 20.B/E core) | comprador | R=100000 I=3 C=0.8 E=4 → **600** |
| T.1.2 | Financial clarity completa (affordability + gastos + crédito + enganche + mensualidad) | T.1 | 🟡 | A01 affordability + A05 TCO 10y + A02 investment (cashflow+IRR) shipped + FASE 20.B.3/C.2/D.6 planeados · NO vista unificada single-page | 70% | ampliar | 🔄 | Single-page 5 paneles orquesta A01+A05+A02 + mortgage sim + gastos breakdown + "Salud" gauge | 🔴 | 🟡 | 🔴 | 🔴 | FASE 20 BLOQUE 20.C | comprador | R=100000 I=3 C=0.85 E=3 → **850** |
| T.1.3 | Data 10K compradores (78% personas como tú compraron aquí) | T.1 | 🔴 | NOT_FOUND tabla `buyer_decisions_corpus` · colonia_dna_vectors 210 proxy · ENIGH/INEGI 210/210 NO decisiones reales · cold-start H1 cero compradores | 5% | agregar | 🆕 | Anonymized buyer outcomes corpus + k-NN vectors + cold-start synthetic seed 1000 ENIGH | 🔴 | 🔴 | 🔴 | 🔴 | FASE 22 Marketing + H2 | comprador | R=100000 I=3 C=0.4 E=5 → 240 (C bajo cold-start) |
| T.1.4 | Transaction safety net (DD + legal + costos + dev certified) | T.1 | 🟡 | H15 due diligence shipped `calculators/n3/h15-due-diligence.ts` + FASE 18 planeada + bucket `commission-invoices`/`dossier-exports` + `legal_documents_template` 0 · **OVERLAP C1.4 + C2.x** · NOT_FOUND UI checklist buyer-side | 45% | agregar | 🆕 | Safety Net widget 12 items checklist (RPP, escritura, IVA, ISAI, KYC, escrow, etc) + LLM check + evidence upload | 🔴 | 🔴 | 🔴 | 🔴 | FASE 18 + 20.H | comprador | R=100000 I=3 C=0.7 E=4 → **525** |
| T.1.5 | GPS financiero enganche ("$200K → $500K en 14m si haces X") | T.1 | 🔴 | A01 affordability "puede comprar X" NO plan ahorro forward-looking · FASE 20.H.1 pre-aprobación existe pero underwriting no GPS | 10% | agregar | 🆕 | Wizard plan ahorro + escenarios CETES/inversión + milestones gamificados + alertas WA mensuales | 🔴 | 🔴 | 🔴 | 🔴 | FASE 20 BLOQUE 20.B.3 + 22 | comprador | R=100000 I=3 C=0.8 E=3 → **800** |
| T.2.1 | Gemelo digital persistente evoluciona vida | T.2 | 🟡 | `lifepath_user_profiles` 5 policies RLS 0 rows + `features/lifepath/` + ADR-021 PPD accepted + 6D vector (familia/budget/movilidad/amenidades/seguridad/verde/vibe). **OVERLAP C1.3 Gemelo Digital lead** · Zero ML evolution loop H1 | 50% | ampliar | 🔄 | Versionado snapshots cada cambio significativo (delta>0.15) + UI timeline evolution + trigger_event inference | 🔴 | 🟡 | 🔴 | 🔴 | FASE 20 BLOQUE 20.A PPD Capa 3-4 | comprador | R=100000 I=3 C=0.8 E=4 → **600** |
| T.2.2 | Detecta siguiente necesidad anticipadamente (hijo nace → 3 recs) | T.2 | 🔴 | NOT_FOUND · lifepath engine one-shot quiz · ADR-021 PPD Capa 4 planeada FASE 20.A.4 pero no anticipa next-need | 5% | agregar | 🆕 | Life-event predictor (heurística + LLM sobre signals search+profile+edad+matrimonio) → predict 18-36m | 🔴 | 🔴 | 🔴 | 🔴 | FASE 20.E + 22 + H2 | comprador | R=100000 I=3 C=0.5 E=4 → 375 |
| T.2.3 | Multigeneracional (datos padre → recos hijo 15 años) | T.2 | 🔴 | NOT_FOUND · `family_accounts` planeada FASE 20.F pero NO inheritance vectors · Zero precedent industry | 0% | agregar | 🆕 | `family_dna_inheritance` (parent→heir grant) + bayesiano prior padre×0.5 + opt-in privacy-first | 🔴 | 🔴 | 🔴 | 🔴 | H2 (FASE 38+ 15y runtime) | comprador | R=100000 I=2 C=0.3 E=3 → 200 |
| T.2.4 | Referral automático perfil heredado | T.2 | 🔴 | NOT_FOUND · **OVERLAP C3.2 Post-close referral**. FASE 20.F family invites pattern share-link pero no perfil carry-over | 5% | agregar | 🆕 | Referral magic link + perfil pre-poblado 6D×0.3 + budget guess ENIGH + cold-start desaparece | 🔴 | 🔴 | 🔴 | 🔴 | FASE 20 BLOQUE 20.A onboarding + 22 growth | comprador | R=100000 I=2 C=0.7 E=2 → **700** |
| T.2.5 | Portfolio management personal (1+ propiedades) | T.2 | 🔴 | NOT_FOUND comprador final · `str-intelligence/portfolio.ts` STR-host no residencial · **OVERLAP C5.4 Investor** · L33 + L85 agendados FASE 20 | 25% | ampliar | 🔄 | `buyer_owned_properties` + agregado Net Worth 20y (A11) + alertas (renovar, predial, refinance, óptimo vender/rentar) | 🔴 | 🔴 | 🔴 | 🔴 | FASE 20 BLOQUE 20.C.3 + 20.D.3 | comprador | R=100000 I=2 C=0.85 E=4 → 425 |
| T.2.6 | Post-compra activo (alertas plusvalía/rent/sell) | T.2 | 🟡 | A11 patrimonio 20y + A02 simulation plusvalia_10y + zone_pulse 83K + pulse_forecasts 6.8K + futures_curve shipped. **OVERLAP T.2.5** · NOT_FOUND trigger alert engine post-compra continuo | 50% | ampliar | 🔄 | Cron mensual recalcula AVM + plusvalía YTD + benchmarks pulse → alerts (sell>15% YoY, rent yield>cap, predial change, refinance) WA+email | 🔴 | 🔴 | 🔴 | 🔴 | FASE 20 BLOQUE 20.D.3 + 22 notifs | comprador | R=100000 I=3 C=0.8 E=3 → **800** |

### Notas T

- **Decisión breakdown:** mantener 0 · ampliar 5 · agregar 7 · skip 0
- **Status:** 🟡 parcial 5 · 🔴 missing 7 · ✅ 0
- **Fase target:** FASE 20 Portal Comprador DOMINANTE (11/12 features) · FASE 18 (1) · FASE 22 (4 cross) · H2/H3 (2)
- **Retrofit 🔄 5 · New-build 🆕 7**
- **Top 3 RICE T:** T.1.2 Financial clarity (850) · T.1.5 GPS enganche + T.2.6 Post-compra alertas (800 tied) · T.2.4 Referral magic link (700)
- **6 overlaps explícitos cross-capa** (ver sección Cross-capa consolidation log abajo)
- **Cold-start brutal H1** — plan B: synthetic seeds + graceful degradation con disclaimer

---

## Cross-capa consolidation log

> Resoluciones Master CC sobre 14 features detectadas en >1 capa. Cada feature tiene capa canonical decidida + rationale.

| # | Feature | Capas afectadas | Resolución canonical | Rationale |
|---|---|---|---|---|
| 1 | Decision engine "compra esto aquí está el por qué" | C3.4 #22 + T.1.1 | **Mantener split** — C3.4 = engine anonymous público (marketplace); T.1.1 = authenticated personalized buyer view | Capas distintas misma feature — persona y scope divergen |
| 2 | Financing simulator integrado | C3.4 #19 + T.1.2 | **Mantener split** — C3 = simulator público shallow; T.1.2 = deep personalized con buyer profile | Scope depth diferente |
| 3 | Transaction safety net | C1.4 #23 (Transaction GPS) + T.1.4 | **Mantener split** — C1.4 = asesor manage operation workflow; T.1.4 = buyer checklist seguridad trust UI | Misma transacción dos personas distintas; comparten storage buckets + RPCs |
| 4 | Gemelo digital persistente | C1.3 (todo 1.3) + T.2.1 | **Mantener split** — C1.3 = gemelo del LEAD asesor-side CRM enrichment; T.2.1 = gemelo del COMPRADOR self-managed | Ambos leen `lifepath_user_profiles` con policies RLS distintas |
| 5 | Referral magic link / Post-close referral | C3.2 #11 + T.2.4 | **CONSOLIDAR en C3.2** — unified referral engine con dual entry points (asesor-initiated + buyer-initiated). Schema único `referrals` polymorphic `referrer_type` enum | T.2.4 migra a C3.2 canonical · evita duplicación engine |
| 6 | Portfolio management | C5.4 #1 (Portfolio dashboard inversor) + T.2.5 | **Mantener split por persona** — T.2.5 = residencial básico 1-3 props Mint-style; C5.4 = inversor avanzado 10+ props analytics | Mismo schema base con CHECK persona_type |
| 7 | Waterfall enrichment cascade | C1.2 #9 (lead IE) + C2 (IE base shipped) | **C1.2 consumes C2** — no duplica · lead enrichment orchestrator wire a dmx_indices/pulse/dna/twin/wiki/forecasts/genome shipped | Retrofit pure sobre IE shipped (ROI máximo) |
| 8 | Pipeline visual con contexto mercado | C1.4 #22 + C2 (pulse/dmx indices) | **C1.4 consumes C2** — UI Kanban asesor + overlay absorption desde C2 data | Cross-capa consumer no duplicate |
| 9 | Absorption forecasting | C2 #21 + C5.1.2 | **C2 canonical engine · C5.1.2 surfaces desarrolladora** — un único engine en C2, multiple consumers UI | Evitar doble cómputo; un model |
| 10 | Market timing signals | C2 #22 (movers/signals) + C5.4.2 (buy/wait alerts inversor) | **C2 canonical engine · C5.4.2 surfaces inversor** — signals calculator en C2, UI inbox tipo trading en C5 | Un model, múltiples UX |
| 11 | Competitor radar / Development pipeline tracker | C2 #14 + #23 | **Unificar en C2 único bloque** — "Pipeline Projects & Competitors" | L-NEW unificado L-C2-NEW-D |
| 12 | ELO + Leaderboard + Badges + Streaks asesor | C1.5 #28/#29 + C5.5.1/5.5.2/5.5.3 | **C5.5 canonical engine + UI surfacing en C1.5 portal asesor** — gamification vive en C5 (revenue/retention) surface brand en C1 | Engine + UI split |
| 13 | Certificación asesor / Asesor report card | C1.5 #27 + C2 #30 | **Unificar en C1.5** — asesor track record (performance) + cert (compliance). Esta es feature asesor, no IE | Migrar C2 #30 a C1.5 canonical |
| 14 | Market anomaly discovery / Market anomaly detector | C2 #20 (parcial framework) + C6 #4 (discovery engine H2+) | **C2 canonical watchdog · C6 H2 extension ML correlation-mining** — secuencial: C2 = threshold/rules-based; C6 = ML discovery new rules | Progresión roadmap |

---

## L-NEW candidates nuevos detectados (71 entries pendientes 07.6.F)

> Detectados durante crosswalk 160×15. Canonical L-NEW{N} nuevos a consolidar en sub-sesión 07.6.F (post-07.6.E Roadmap). NO se agendan en este PR — solo documentados.

### C1 (7 candidates)

- **L-NEW-C1-01** CRM Foundation Stack — tablas leads + buyer_twins + deals + family_units + referrals + asesor_public_profiles · FASE 13 (cubre #1/#8/#10/#14/#16/#19/#21/#26)
- **L-NEW-C1-02** Lead Enrichment Cascade Orchestrator — wire IE shipped al lead INSERT trigger · FASE 13-14 (top RICE 1166)
- **L-NEW-C1-03** DISC Voice Pipeline — Whisper + LLM classifier + buyer_twin.disc_profile · FASE 13-14 + 31
- **L-NEW-C1-04** Asesor Gamification Engine — elo + badges + streaks + IE unlock via feature_overrides · FASE 14 + 22
- **L-NEW-C1-05** Asesor Report Card público — analog ie_score_visibility_rules per-asesor · FASE 14 + 21
- **L-NEW-C1-06** Day Planner Agent — LLM + Google Calendar OAuth + revenue_predictor priorización · FASE 13-14
- **L-NEW-C1-07** Property Fax cross-link — explicitar dependencia #24 con L10 pipeline FASE 17

### C2 (7 candidates)

- **L-NEW-C2-A** Buyer persona generator por zona basado en cierres CRM · FASE 13/14
- **L-NEW-C2-B** Spread listado-vs-cierre AVM v1 (requiere data CRM) · FASE 13/14
- **L-NEW-C2-C** Asesor track record certification engine · FASE 14 + 26 (cross C1.5 canonical)
- **L-NEW-C2-D** Developer pipeline tracker + competitor radar unificado · FASE 15
- **L-NEW-C2-E** Demand graph instrumentation portal-publico · FASE 21 + L-NEW28 cascade webhook
- **L-NEW-C2-F** Verified purchase reviews flow post-cierre · FASE 14 asesor
- **L-NEW-C2-G** Project-photos EXIF geo+timestamp validation · FASE 15

### C3 (22 candidates — capa greenfield)

- **L-NEW-C3-01** Agente WhatsApp con contexto IE (extiende L59) · FASE 22
- **L-NEW-C3-02** Voice note intelligence Whisper + DISC + sentiment · FASE 22
- **L-NEW-C3-03** Objection playbook dinámico zona × DISC × momento · FASE 22
- **L-NEW-C3-04** Argument builder botón generar argumento precio · FASE 13
- **L-NEW-C3-05** Negotiation co-pilot DISC + history · H2
- **L-NEW-C3-06** Family-aware messaging persona-tagged · H2
- **L-NEW-C3-07** Winning cadence discovery auto-replicate · H2
- **L-NEW-C3-08** Behavioral trigger nurturing extends L1+L76+L90 · FASE 13+22
- **L-NEW-C3-09** Omnichannel orchestration WA+email+portal+phone escalation · FASE 22+H2
- **L-NEW-C3-10** Emotion-triggered interventions · H2
- **L-NEW-C3-11** Post-close referral engine 7d WA + market report · FASE 22 (**CONSOLIDA con T.2.4**)
- **L-NEW-C3-12** Drip condicional rules-engine DSL · FASE 22+H2
- **L-NEW-C3-13** Asesor-buyer matching DISC + workload · FASE 13
- **L-NEW-C3-14** Autonomous buyer-property matcher 3-tap approval · FASE 13+H2
- **L-NEW-C3-15** "3 y listo" top-3 propiedades por gemelo · FASE 20+H2
- **L-NEW-C3-16** Precision selling assignment · H2
- **L-NEW-C3-17** Reporte personalizado PDF primer contacto WA · FASE 13+22
- **L-NEW-C3-18** Social proof engine datos reales · FASE 21+22
- **L-NEW-C3-19** Financing simulator integrado (INFONAVIT/FOVISSSTE/banco) · FASE 20+21
- **L-NEW-C3-20** "Pregunta sin pena" RAG chat público · FASE 21+22
- **L-NEW-C3-21** Comparador objetivo multidimensional extends score_comparison_matrix · FASE 11+21
- **L-NEW-C3-22** Decision engine top-5 IE proof points extends causal_explanations · H2 (**splits con T.1.1**)

### C4 (9 candidates)

- **L-NEW-C4-1** Programmatic SEO Engine `/zona/[slug]` SSR+sitemap+JSON-LD · FASE 21
- **L-NEW-C4-2** Smart Visit Routing Engine TSP Mapbox + LLM talking points · FASE 14
- **L-NEW-C4-3** Waiting List Match Engine cron inventory×subscriptions · FASE 22 (depende H2 listings)
- **L-NEW-C4-4** DMX Verified Media Sello EXIF+GPS+SHA256+badge · FASE 15
- **L-NEW-C4-5** Marketing Pitch Generator (Anthropic) 3 variantes A/B · FASE 15
- **L-NEW-C4-6** Risk Composite API endpoint `/api/v1/risk` signed JWT · FASE 30
- **L-NEW-C4-7** Gentrification Radar API endpoint time-travel + alphas · FASE 23
- **L-NEW-C4-8** Data Marketplace Bundles + Stripe $5-15K/m + concierge · FASE 23
- **L-NEW-C4-9** DMX SDK npm + pip + Partner Program (L13 paraguas) · H2 FASE 30+33

### C5 (11 candidates)

- **L-NEW-C5-51** Wire E02 portfolio-optimizer stub → activate FASE 23 con investor_portfolios · FASE 23
- **L-NEW-C5-52** Asesor streaks reusa streaks-calculator pattern activity-level · FASE 14 **TOP RICE**
- **L-NEW-C5-53** Investment calculator 5y unificado AVM+pulse+AirROI (lead magnet) · FASE 21+23
- **L-NEW-C5-54** Objection feedback loop dev-side desde C04 calculator · FASE 15
- **L-NEW-C5-55** AVM weekly recompute cron + drift notif 3% threshold · FASE 11.X/24
- **L-NEW-C5-56** Asesor ELO Glicko-2 ajustado zone_tier difficulty · FASE 14
- **L-NEW-C5-57** Badges asesor engine + criteria DSL + awarder cron · FASE 14
- **L-NEW-C5-58** Levels/XP system asesor wire ui_feature_flags · FASE 14+23
- **L-NEW-C5-59** Developer ratings + reviews verified buyers DMX Verified Developer badge · FASE 23+24
- **L-NEW-C5-60** Dynamic pricing primary sale extends STR dynamic-advisor pattern · FASE 15
- **L-NEW-C5-61** Diversification advisor reusa constellations_edges 21,945 rows · FASE 23 moat

### C6 (12 candidates — capa futura)

- **L-NEW-C6-1** Opportunity Hunter cron SEDUVI/DENUE/catastro daily · FASE 31
- **L-NEW-C6-2** Auto-captación generator demand-gap × inventario · FASE 31
- **L-NEW-C6-3** Developer outreach business case engine · FASE 31+15
- **L-NEW-C6-4** Anomaly correlation discovery on IE 118 scores · FASE 31+
- **L-NEW-C6-5** Morning briefing daily cron asesor · FASE 14 stub + 26
- **L-NEW-C6-6** Weekly zone report generator + delivery (consolidable bajo L34 Newsletter expandido) · FASE 22
- **L-NEW-C6-7** Monthly portfolio report inversor · FASE 23 pro-tier upsell
- **L-NEW-C6-8** Quarterly developer absorption brief · FASE 15
- **L-NEW-C6-9** WhatsApp Business API + Resend delivery service compartido · FASE 22-23
- **L-NEW-C6-10** Full Cycle Agent state machine + tools registry (ADR-014 anchor) · FASE 31
- **L-NEW-C6-11** HITL approvals checkpoint engine · FASE 31
- **L-NEW-C6-12** Self-improving eval harness + policy versioning · FASE 31+ H3

### CT (9 candidates)

- **L-NEW-CT-1** Buyer decisions corpus + cohort k-NN match · FASE 22+H2 (T.1.3)
- **L-NEW-CT-2** Transaction Safety Net checklist 12 items + LLM contract analyzer · FASE 18+20.H (T.1.4)
- **L-NEW-CT-3** GPS Enganche savings plans + milestones gamificados · FASE 20.B.3+22 (T.1.5)
- **L-NEW-CT-4** Buyer twin snapshots versionados timeline · FASE 20.A PPD (T.2.1)
- **L-NEW-CT-5** Life-event predictor heurística+LLM signals · FASE 20.E+22 (T.2.2)
- **L-NEW-CT-6** Family DNA inheritance multi-gen · H2/H3 FASE 38+ (T.2.3)
- **L-NEW-CT-7** Buyer referral magic link (**CONSOLIDA con L-NEW-C3-11**) · FASE 20.A+22
- **L-NEW-CT-8** Buyer portfolio residencial Mint-style (cross-ref L33+L85) · FASE 20.C.3 (T.2.5)
- **L-NEW-CT-9** Post-purchase alert engine plusvalía/rent/sell signals · FASE 20.D.3+22 (T.2.6)

### Deduped total

> 71 nuevas propuestas - 2 consolidaciones (L-NEW-CT-7 ↔ L-NEW-C3-11 referral engine; T.2.4 ↔ C3.2 features) = **~69 L-NEW NEW candidates pendientes 07.6.F canonization**.

### Cross-ref L-NEW existentes alineados al crosswalk

- **L1** push notif zone follow → C3.8 behavioral nurturing
- **L10** Property Fax → C1.24 due diligence
- **L11** Closing-as-a-Service → C1.23 transaction GPS
- **L13** DMX Property API → C4.3.6 Plaid model
- **L14** Living Map → C4.1.1 programmatic SEO
- **L17** → C3.17 personalized report
- **L20** audit log → C4.3.5 data marketplace provenance
- **L21** JWT signed response → C4.3.3 risk API
- **L22** Time Travel → C4.3.4 gentrification API
- **L23** Concierge B2B onboarding → C4.3.5 data marketplace
- **L24** Cascade Marketplace GitHub Actions pattern → C4.3.6 partner program
- **L25** DNA pgvector cosine top-k → C2.13 zone discovery
- **L26** streaks detection → C2.22 market timing
- **L27** Sector Maps → C4.3.4 fondo API
- **L28** Anomaly cascade webhook → C2.17 supply-demand alerts
- **L30** transit map → C2.11 environmental quality
- **L31** indirecta → C2.14 dev pipeline
- **L33** Predictive Portfolio 20y → T.2.5 + T.2.6
- **L34** Newsletter auto-generated → C6.6 weekly zone report (consolidable)
- **L35** → C2.11 environmental
- **L36** constellations power comparables → C2.3 comparable engine multidim
- **L37** Ready-to-Buy Score → T.1.4 safety net
- **L57+L59+CF-L2** WhatsApp IE Copilot → C3.1 agente WA
- **L76** Alert Radar + **L90** Why-alerts → C3.8 behavioral
- **L85** Portfolio Builder Morningstar X-Ray → T.2.5 canonical
- **L122** weekly digest → C3.9 omnichannel

---

## Top 20 Critical Path features (normalized by tier + dependencies downstream)

> **Nota scale normalization:** RICE scores no son comparables cross-SA (formulas divergentes). Top 20 seleccionado por **tier (top-3 per capa)** + dependencies downstream (features que desbloquean otras) + shipped-leverage (retrofit alto). Ranking en 07.6.D con fórmula canónica unificada.

| Rank | Capa | Feature | Decisión | Fase target | Downstream unlocks | Justificación critical path |
|---|---|---|---|---|---|---|
| 1 | C2 | F4 Oráculo precio futuro AGEB | mantener 🔄 | FASE 11 + 13 | Alimenta C1.9, C2.22, C3.17, T.1.1, C5.4.8 | Shipped — expansión AGEB escalable · RICE 324,800 capa |
| 2 | C2 | F8 Micro-zone DNA profiling | mantener 🔄 | FASE 11 + L-NEW14 | Alimenta C2.13, C4.1.3, C5.3.3, C5.4.4 | Core IP DMX shipped — escalar nacional · 313,200 |
| 3 | C2 | F13 Zone discovery gemelas | mantener 🔄 | FASE 11 N5 + L-NEW25 | Alimenta C4.1.3, C5.4.4, T.2.1 | Moat shipped — optimizar pgvector · 276,000 |
| 4 | C1 | #9 Waterfall enrichment cascade | ampliar 🔄 | FASE 13-14 | Habilita C1.10/C1.14/C1.21/C3.14 | Top RICE capa 1166 — retrofit apalanca IE shipped |
| 5 | C1 | #12 Lead filter | agregar 🆕 | FASE 13-14 | Quality gating todas downstream asesor ops | Top RICE 1000 — simple + alto impact |
| 6 | C3 | F19 Financing simulator integrado | agregar 🆕 | FASE 20+21 | Elimina objeción #1 affordability | Top RICE C3 375k — bloqueante adopción comprador |
| 7 | C3 | F20 "Pregunta sin pena" RAG público | agregar 🆕 | FASE 21+22 | Viralización + indexación SEO | 333k — zero-shame UX diferenciador |
| 8 | C2 | F2 Price truth meter listing | ampliar 🔄 | FASE 11 + 21 | UX trust listings | 165k — low effort UI layer sobre AVM shipped |
| 9 | C2 | F1 AVM spread listado vs cierre | ampliar 🔄 | FASE 11 + 13/14 | Base pricing all features | 172,500 — requiere data CRM cierres |
| 10 | C3 | F8 Behavioral trigger nurturing | agregar 🆕 | FASE 13+22 | Activa C3 sequence engine | 200k — DMX "sistema nunca te suelta" |
| 11 | C3 | F17 Reporte personalizado PDF primer contacto | agregar 🆕 | FASE 13+22 | WA 3-5x response rate vs genérico | 200k — lead conversion dopamine |
| 12 | T | T.1.2 Financial clarity completa | ampliar 🔄 | FASE 20 BLOQUE 20.C | Orquestador A01+A05+A02 shipped | 850 — retrofit sobre infra calculators |
| 13 | T | T.2.6 Post-compra alertas plusvalía/rent/sell | ampliar 🔄 | FASE 20.D.3 + 22 | Retention killer post-compra | 800 — reusa pulse + forecasts shipped |
| 14 | T | T.1.5 GPS financiero enganche | agregar 🆕 | FASE 20.B.3 + 22 | Activa cold pipeline + gamificación | 800 — pattern Robinhood probado |
| 15 | C5 | C5.5.3 Streaks asesor diarios | ampliar 🔄 | FASE 14 | Retención asesor base | Top RICE C5 36 — reusa streaks-calculator shipped |
| 16 | C5 | C5.4.8 Investment calculator 5y | ampliar 🔄 | FASE 21+23 | Lead magnet masivo | 22.5 — unifica AVM+pulse+AirROI shipped |
| 17 | C4 | 4.3.1 Widget Embebible (ampliar) | mantener 🔄 | FASE 15+23 | B2B revenue + moat API | 25 shipped — expandir tier gating + variants |
| 18 | C5 | C5.3.6 Objection feedback loop dev | ampliar 🔄 | FASE 15 cross C1 | Cierra loop cross-persona (asesor→dev) | 16 — C04 calculator shipped + retrofit |
| 19 | C1 | #22 Pipeline visual con contexto mercado | ampliar 🆕 | FASE 13-14 | Dashboard asesor central | 600 — zone_pulse + absorption shipped |
| 20 | C6 | F9 Auto-distribución WhatsApp + email | agregar 🔄 | FASE 22-23 | Unlock C6.5/C6.6/C6.7/C6.8 reports delivery | 52.5 — multi-feature enabler + WA Business infra |

### Critical dependencies map (top-20 downstream)

```
C2 shipped base (#4, #8, #13) 
    ↓
C1 #9 Waterfall enrichment (consume IE) 
    ↓
C1 #12 Lead filter + #22 Pipeline visual (quality + UI asesor)
    ↓
C3 #8 Behavioral + #17 Reporte + #19 Financing (engagement)
    ↓
T.1.2 Financial clarity + T.1.5 GPS + T.2.6 Post-compra (buyer retention)
    ↓
C5.5.3 Streaks + C5.4.8 Calculator (monetización + retención)
    ↓
C4 4.3.1 Widget + C5.3.6 Objections (B2B + cross-persona feedback)
    ↓
C6 F9 WhatsApp distribution (multi-feature enabler)
```

---

## Build buckets distribution

> 150 features categorizadas por horizonte de construcción. **Informa 07.6.E Roadmap Integration + 07.6.C Design Migration.**

### 🟢 Build-now (FASE 07.5.F / 11.T-Z / 13-15) — ~55 features

**Apalanca infra shipped · retrofits ROI alto · desbloquean portal asesor/desarrollador/inversor FASE 13-15+23.**

- **C2 todas parciales (21):** F1-F7, F9-F13, F17, F20-F22, F25-F29 → ampliar sobre IE shipped
- **C1 parciales (3):** #9 Waterfall (1166), #11 Portal-to-CRM (625), #22 Pipeline visual (600) · + #4 ROI calculator + #12 Lead filter + #15 Recalibración (retrofit sobre lead base)
- **C4 shipped + parciales (9):** 4.3.1 widget, 4.3.2 api-v1 (extender), 4.1.1 SEO, 4.1.3 Zone Discovery DNA, 4.1.5 Waiting List, 4.2.3 Verified Photos, 4.3.3-4.3.5 APIs (FASE 23-30)
- **C5 parciales (12):** C5.1.2 absorption, C5.2.1 dynamic pricing STR extends, C5.2.5 AVM weekly, C5.3.4/C5.3.6/C5.4.1/C5.4.2/C5.4.4/C5.4.8 ampliar + C5.5.2/C5.5.3/C5.5.4 gamif retrofit
- **T parciales (5):** T.1.1/T.1.2/T.1.4/T.2.1/T.2.6 → reusa calculators shipped
- **C3 ampliar (1):** F21 Comparador multidim via score_comparison_matrix scaffolding

### 🟡 Build-fase-específica (FASE 16-29) — ~80 features

**New-builds específicos fase · requieren data core (properties/deals/leads) · marketing + monetization.**

- **C1 new-builds (25):** toda la suite CRM greenfield FASE 13-14 + 16-18
- **C3 new-builds (20):** WhatsApp/voice/playbook/cadences/matching/simulators FASE 13/20/21/22
- **C4 new-builds (6):** 4.1.2 Discover Weekly, 4.1.4 Visit Scheduling, 4.2.1 Video Tour, 4.2.2 Community Reviews, 4.2.4 Marketing Generator FASE 15/18/22
- **C5 new-builds (16):** C5.1.1/C5.1.3/C5.1.4 attribution + C5.2.2-C5.2.4 pricing + C5.3.1-C5.3.5 dev financial + C5.4.5-C5.4.7 investor + C5.5.1/C5.5.5 gamif
- **C6 partial new-builds (5):** F5 morning briefing (FASE 14 stub), F6 weekly zone (FASE 22), F7 monthly portfolio (FASE 23), F8 quarterly dev (FASE 15), F9 WA distribution (FASE 22-23)
- **T new-builds (5):** T.1.3 cohort corpus, T.1.5 GPS enganche, T.2.2 life-event predictor, T.2.4 referral magic link, T.2.5 portfolio personal

### 🔴 Build-H2+ (FASE 30+ / H2/H3 visión) — ~15 features

**Agentic + multigeneracional + platform play · ADR-014/015 canonical · requieren madurez data + partner ecosystem.**

- **C6 agentic core (7):** F1 Opportunity hunter, F2 Auto-captación, F3 Developer outreach, F4 Anomaly discovery, F10 Full Cycle Agent, F11 HITL, F12 Self-improving
- **C3 ML maduro (5):** F5 Negotiation co-pilot, F6 Family-aware, F7 Winning cadence, F10 Emotion-triggered, F16 Precision selling, F22 Decision engine
- **T multigen + growth (2):** T.2.3 Family DNA inheritance (15y runtime), T.1.3 escala corpus 10K (post-H2 user base)
- **C4 platform play (1):** 4.3.6 Plaid/Stripe model SDK + Partner Program
- **C1 community maduro (1):** #30 Community asesores zona (FASE 34 Creator H2)
- **C4 AR (1):** 4.1.6 AR Preview (FASE 32 Digital Twin 4D)

---

## Anomalías detectadas cross-SA

1. **Gap referencial C1:** RPC `is_operation_participant` existe sin tabla `operaciones` correspondiente. Detectado SA-C1.
2. **`zone_streaks` 0 rows pese a calculator shipped 07.5:** pipeline streaks no corre (cron ausente/failed). Detectado SA-C5. Bloquea C5.5.3 hereda bug.
3. **`avm_estimates` 0 rows:** AVM engine compilado no populated. Bloqueante C5.2.5 weekly recompute. Requiere seed inicial desde properties.
4. **Sin tabla `properties`/`deals` core:** bloquea C4.1.2/4.1.4/4.1.6/4.2.1 + C5.4.1/4.6/4.7/5.5 + C1 CRM completo. Escalar **L-NEW PROPERTIES INVENTORY MIGRATION** H2.
5. **DISC framework NO existe repo:** zero hits "disc" salvo disclaimer. Pre-requisite bloqueante 6 features C3 (#1/#3/#5/#6/#13/#16) + C1 #18.
6. **WhatsApp Business API NO integrado:** `channel='whatsapp'` enum existe en alpha alerts schema sin sender infra. Bloqueante ~10 features C3+C6.
7. **Score-registry STUB latent E02:** `STUB FASE 33 portfolio ingestor`. Al adelantar a FASE 23 sin update registry → drift docs.
8. **STR shipped no investor-surfaced:** AirROI + portfolio optimizer + super-host viven en `str-intelligence` pero portal investor FASE 23 NO los expone. C5.4.3 puede shippear wire-only.
9. **Mock `preview-ux/mock/agentes-mock.ts` badges hardcoded:** nomenclatura no matchea prototype C5.5.2 ("Rey Del Valle/Speed Closer/Sniper") vs mock ("alpha_hunter/top_closer/rising_star/streak_week"). Reconciliar FASE 14.
10. **22 calculators `category: 'comprador'` shipped infrautilizados:** base masiva N0-N4 sin UI buyer consumer (portal comprador FASE 20 no shippeada). Cold-start capa T.

---

## Referencias

- **Plan maestro FASE 07.6:** `docs/02_PLAN_MAESTRO/FASE_07.6_PRODUCT_AUDIT.md`
- **ADR-032 FASE 07.6 insertion:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR_032_fase_07.6_product_audit.md`
- **Input 07.6.A:** `docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md` (897 líneas, 8 secciones)
- **Prototype fuente:** `tmp/product_audit_input/DMX_Product_Architecture_Complete.md` (149 bullets, 27 productos, 7 capas)
- **L-NEW backlog:** `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` (51 entries + 9 SHIPPED)
- **Contrato ejecución:** `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md`
- **Sub-agent drafts:** `tmp/07.6.B-drafts/SA-{C1..C6,CT}.md` (gitignored, intermediarios)

---

> **Este crosswalk es INPUT directo para:**
> - **07.6.C** Design Migration (prototype HTML/CSS → DMX Dopamine tokens + tRPC scaffolding)
> - **07.6.D** RICE Priorities (re-normalización fórmula canónica unificada + ranking consolidado)
> - **07.6.E** Roadmap Integration (incorporación FASE 08-29 + L-NEW canonization)
> - **07.6.F** L-NEW Canonization (69 candidates nuevos → IDs oficiales pipeline)
