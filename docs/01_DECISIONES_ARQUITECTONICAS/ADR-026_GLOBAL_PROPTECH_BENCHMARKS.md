# ADR-026 — Global PropTech Benchmarks Research (reference-only)

**Status:** Reference (founder session 2026-04-20)
**Deciders:** Manu Acosta (founder), PM Sr Dev session
**Purpose:** conservar research competitivo global de la sesión 2026-04-20 para referencia estratégica H2/H3 sin contaminar scope MX actual.

## Context

Durante sesiones FASE 10 pre-flight se investigaron a profundidad empresas globales top-tier PropTech (out-of-scope de petición founder inicial pero conservadas como referencia estratégica). Manu clarificó que la petición original era análisis empresas MX; la research global se preserva aquí sin bloquear roadmap.

Este ADR NO prescribe implementación. Es **referencia de benchmarks globales** para informar decisiones futuras (H2+).

## Benchmarks investigados

### 1. Reonomy (US — 54M parcels commercial)
**Moat único:**
- **ReonomyID** sistema de ID universal que mapea y estandariza data disparada (AI entity resolution)
- **Pierce corporate veil** (ownership unlock) — AI identifica individuos detrás de entidades, devuelve nombre/teléfono/email/dirección
- **Likelihood to Sell** predictive indicator
- **Debt tab con maturity dates** — busca propiedades con deuda venciendo (candidatos venta)
- Cobertura 3,100 counties + 385 MSAs
- CMBS loans detail: interest rate, loan terms, signatories, financials 2 años

### 2. HouseCanary (US — 114M properties + 19K ZIP codes)
**Moat único:**
- **AVM testing pre-list vs purchase** cada 2 días (elimina bias listing prices)
- **Image recognition** property condition en 6 niveles
- **Renovation scenarios** simulator ("si renuevas X, vale Y")
- Property Explorer + Data Explorer API con 75+ data points
- Instant API access + monthly model refreshes

### 3. Placer.ai (Foot traffic analytics)
**Moat único:**
- **Panel tens of millions of devices** — data foot traffic real anonymous
- **Void Analysis** report: identifica prospective tenants faltantes en una zona
- **Trade area comparison** + visitation trends
- Site selection combinando demographic + psychographic + foot traffic
- Near real-time data

### 4. ATTOM Data (US — 158M properties)
**Moat único:**
- API productiva self-service multi-format (JSON/XML REST)
- Cloud delivery via Snowflake
- 30-day free trial as acquisition
- Powering: underwriting, AVMs, risk modeling, insurance workflows, proptech apps, govt analyses, AI systems

### 5. CoStar Group ($40+ años, global líder CRE)
**Moat único:**
- **6M+ properties + 11M+ lease/sale comps**
- **3D digital twin technology**
- Sub-brands: CoStar Market Analytics, CoStar COMPS, Real Estate Manager, PPR, Resolve Tech, Virtual Premise
- **LoopNet** marketplace (1M+ listings/día)
- Pricing: $3K-$23K/año (avg $15K)

### 6. Cherre (Real estate data platform + AI)
**Moat único:**
- **Property knowledge graph** — world's largest real estate data graph
- **Entity resolution 97%** accuracy
- **Agent.STUDIO** — platform para agentic AI workflows custom
- 100+ data sources integrated
- Connects: Yardi, MRI, Argus, CoStar, MSCI/RCA, Trepp, Green Street, CBRE-EA, Moody's CRE

### 7. CompStak (Crowdsourced lease/sale comps)
**Moat único:**
- **Crowdsourced 20K+ verified brokers** aportan data → desbloquean acceso
- **1.5M properties** data
- **CompStak AI**: Rent Predictor + AI Market Summary
- Users: Tishman Speyer, Wells Fargo, MetLife, every major brokerage

### 8. Opendoor (iBuyer + 2026 AI-Native)
**Moat único:**
- **AI Video Inspections** (smartphone → identifica structural flaws, paint quality, appliance age)
- **Cash Plus** hybrid listing (cash offer backup si no vende)
- **Integrated title/escrow** close en 3 días
- Mortgage in-house (beta)

### 9. Zillow AI Mode (2026)
**Moat único:**
- Descubrimiento propiedades **conversacional**
- Summarize property policies + schedule tours + connect agents
- Explica Zestimate + analiza competitividad ofertas
- Integrated ChatGPT (experimental)

### 10. Redfin (AI features)
**Moat único:**
- **Ask Redfin chatbot**
- **Redfin Redesign AI** — image modification ("ve cómo quedaría renovada")

### 11-14. Big 4 Brokers Global (CBRE/JLL/Colliers/Newmark)
**Moat combinado:**
- CBRE $40.55B revenue, líder data analytics + data centers focus
- Big 4 consulting + research reports commodity trimestral
- Newmark: tech collaborative + valuation services

## 65 Features/Cross-functions/Laterales catalogados

### 25 Features Directos (FD1-FD25)
Extraídos homepage/research pages de las empresas arriba. Ejemplos representativos:
- FD1 ValueChat WhatsApp (Metric)
- FD4 Pierce Corporate Veil (Reonomy)
- FD5 Likelihood to Sell predictive (Reonomy)
- FD6 Debt Tab Maturity (Reonomy)
- FD7 Image Recognition Condition 6 niveles (HouseCanary)
- FD8 Renovation Scenarios (HouseCanary)
- FD9 Foot Traffic Panel (Placer.ai)
- FD11 Crowdsourced Broker Data (CompStak)
- FD12 Rent Predictor + Concessions (CompStak AI)
- FD14 AI Video Inspection smartphone (Opendoor)
- FD17 AI Mode Conversational Discovery (Zillow)
- FD19 Agent.STUDIO Custom Agents (Cherre)
- FD20 Property Knowledge Graph (Cherre)
- FD21 Entity Resolution 97% (Cherre)
- [lista completa en chat session transcript 2026-04-20]

### 20 Cross-Functions (CF1-CF20)
Combinaciones globales + DMX capacidades existentes. Ejemplos representativos:
- CF1 WhatsApp Copilot IE completo (Metric ValueChat + DMX 118 scores)
- CF4 Visit Density Score nuevo N12 (Placer + DENUE + F02 + N09)
- CF6 DMX Property Graph Cherre-tier (Cherre + DMX + pgvector)
- CF7 Custom Agent Studio B2B (Cherre Agent.STUDIO + Copilot + tRPC)
- CF8 Smartphone Property Scanner (Opendoor Video + AVM + scores)
- CF14 Conversation-Driven Discovery + PPD (Zillow AI Mode + Copilot + PPD behavioral)
- CF16 LandAnalyzer AI Producto (Brandata + H13 + B06 + AVM)
- [lista completa en chat session transcript 2026-04-20]

### 20 Laterales Revolucionarios (LR1-LR20)
Nuevas categorías que nadie hace hoy. Ejemplos representativos:
- LR1 DMX Time Machine slider temporal 2018→2030
- LR2 Digital Twin Zones 3D con score overlays
- LR3 DMX Agentic Broker AI autónomo
- LR4 Voice Call Inspection AI voz
- LR5 Street View Scorer AI imagen aérea/calle
- LR7 DMX Zone Futures ETF-like
- LR8 Intergenerational Wealth Planner 3 generaciones
- LR13 DMX Trust Graph real estate
- LR15 Climate Migration Predictor
- LR19 AR Zone Tour Mobile realidad aumentada
- LR20 Institutional Matchmaking FIBRA ↔ properties
- [lista completa en chat session transcript 2026-04-20]

## Decision

**NO implementar automáticamente.** Este ADR es referencia estratégica. Implementación requiere:

1. Decisión founder explícita sobre cuáles adoptar
2. Validación business case por feature
3. Alineación con roadmap IE core (FASEs 08-12) y Social+Listing Intelligence (FASE 26)

**Reglas:**
- Los 65 items quedan como **backlog estratégico H2+**
- Conforme DMX consolide core H1, revisar este ADR trimestralmente para pull opportunities
- NO contaminar roadmap actual (FASEs 10-25) con scope de este ADR sin approval explícito

## Rationale

1. **Research valuable no debe perderse** — 65 oportunidades identificadas con empresas probadas no deberían quedar solo en chat transcript
2. **Posicionamiento competitivo** — entender qué hace Reonomy/HouseCanary/CoStar informa decisiones largo plazo
3. **Evita scope creep** — separar referencia de ejecución previene distracción
4. **Benchmark trimestral** — este ADR se revisa para pull selective opportunities conforme core madura

## Consequences

### Positivas
- Research preservada sin perder insight
- Benchmark comparativo permanente para decisiones futuras
- Evita duplicar investigación si volvemos al tema
- Posicionamiento competitivo documentado

### Negativas
- ADR largo que require maintenance trimestral
- Riesgo FOMO ejecutar items prematuramente sin validación business case

### Neutrales
- No afecta roadmap H1 actual
- Complementa ADR-025 (Social+Listing MX focus) con vista global

## References

- `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` — pipeline vivo (incluye CF-G1-8 derivados de este research)
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-025_SOCIAL_LISTING_INTELLIGENCE.md` — pilar MX focus
- `docs/07_GAME_CHANGERS/07.4_MOAT_STRATEGY.md` — estrategia moat (referencia global)
- Chat session 2026-04-20 transcript (founder research request response)

## Sources web research 2026-04-20

- [Reonomy](https://www.reonomy.com/) + [Reonomy Machine Learning](https://www.reonomy.com/technology/machine-learning)
- [HouseCanary](https://www.housecanary.com/) + [Our AVM](https://www.housecanary.com/resources/our-avm)
- [Placer.ai](https://www.placer.ai/) + [CRE Foot Traffic](https://www.placer.ai/solutions/cre)
- [ATTOM Property Data API](https://www.attomdata.com/solutions/property-data-api/)
- [CoStar Products](https://www.costar.com/products) + [Market Analytics](https://www.costar.com/products/market-analytics)
- [Cherre](https://cherre.com/) + [Agent.STUDIO](https://cherre.com/products/platform/)
- [CompStak](https://compstak.com/) + [CompStak AI launch](https://compstak.com/blog/compstak-launches-compstak-ai)
- [Opendoor 2026 AI](https://www.inman.com/2026/02/20/why-opendoor-is-suddenly-lighting-up-real-estate-social-media/)
- [Zillow AI Mode 2026](https://www.rismedia.com/2026/03/25/zillow-debuts-ai-mode-delivering-guided-intelligence-to-the-housing-journey/)
- [Redfin vs Zillow 2026](https://www.realestateskills.com/blog/redfin-vs-zillow)
- [PropTech Trends 2026](https://commercialobserver.com/2025/12/2026-proptech-predictions-ai/)

---
**Autor:** PM Sr Dev (sesión research competitivo 2026-04-20) | **Fecha:** 2026-04-20
**Status:** Reference (conserva research out-of-scope petición founder original)
