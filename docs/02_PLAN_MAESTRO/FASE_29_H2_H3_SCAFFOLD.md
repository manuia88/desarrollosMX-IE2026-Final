# FASE 29 — H2/H3 Scaffold (pins + decisiones roadmap post-launch)

> **Duración estimada:** 1 sesión Claude Code (~3 horas). Es solo documentación; cero implementación.
> **Dependencias:** Todas fases 00-28 completadas y tag `launch-v1.0.0` publicado.
> **Bloqueantes externos:** Ninguno.
> **Resultado esperado:** Documento roadmap H2 (3-6 meses post-launch) + H3 (6-12+ meses) con pins por item, decisiones arquitectónicas diferidas, ADRs requeridos antes de cada construcción, referencias a sub-etapas UPG 7.13-7.19 (135 upgrades). CERO código escrito. CERO implementación. Tag `fase-29-complete`.
> **Priority:** [H2/H3 scaffold]

> ⚠️ **DISCLAIMER EXPLÍCITO**: Este documento es **SOLO ROADMAP**. **CERO implementación**. Cada item listado aquí **REQUIERE UN ADR PROPIO** antes de construirse. Las prioridades pueden cambiar según métricas post-launch (AARRR, NPS, revenue signals). Esta fase no entrega código; entrega decisiones anotadas y pins para discusión.

## Contexto y objetivo

Tras el Launch Soft (Fase 28), DMX entra en ciclo iterativo basado en datos reales (retention, NPS, revenue, feedback). Este documento **pausa y registra** las cosas que **sabemos que queremos pero NO hicimos H1** — para que no se pierdan y para que cada una tenga un pin con enough context que permita retomar inteligentemente.

Principios:
- **No implementar aquí nada**. Solo pins + referencias.
- **Cada item → requiere ADR propio** antes de construir. ADR documentará alternativas, trade-offs, cost, decisión final.
- **Prioridades fluidas**: lo que hoy parece H2 puede promoverse a H1.5 si métricas lo justifican; o diferirse si no hay señal.
- **Referenciar concretamente**: decir "UPG 7.17 IDENTITY 5 items" vs "gente intelligence vague".
- **Visible trade-offs**: engineering cost + data cost + time-to-value declared.

Cross-references:
- Briefing §2 decisiones founder.
- Contexto §23 245 upgrades 19 sub-etapas.
- Contexto §24 fases H1/H2/H3 IE5-§13.3.
- ADRs existentes 001-010 (base para ADRs futuros).

## Bloques

### BLOQUE 29.A — H2 Scaffold (3-6 meses post-launch)

#### MÓDULO 29.A.1 — SAML/OIDC enterprise auth

**Pins:**
- `[29.A.1.1]` **Feature**: SAML 2.0 + OIDC para login enterprise (Okta, Azure AD, Auth0, Google Workspace, Ping Identity).
- `[29.A.1.2]` **Rationale**: enterprise API plans requieren SSO corporate. Bloqueador cierre deals >$50K ARR.
- `[29.A.1.3]` **Deps**: ADR-003 ya dejó H2 el tema. Supabase Auth soporta SAML + OIDC vía GoTrue.
- `[29.A.1.4]` **ADR requerido**: ADR-011 "Enterprise SSO Strategy". Alternativas: self-host (GoTrue custom) vs BoxyHQ Jackson vs Auth0 extras.
- `[29.A.1.5]` **Effort**: ~2-3 sesiones (3-5 días).
- `[29.A.1.6]` **Trigger**: primer lead enterprise que lo pida.

**Criterio de done del módulo:**
- [ ] Pin registrado. ADR-011 pendiente.

#### MÓDULO 29.A.2 — App nativa iOS/Android (solo asesores) vía Expo

**Pins:**
- `[29.A.2.1]` **Feature**: app móvil Expo/React Native para **asesores únicamente** (ADR-008 + decisión founder §2 ítem 8).
- `[29.A.2.2]` **Rationale**: asesor usa 80% mobile; PWA H1 funciona pero app nativa permite push estable, acceso contactos, cámara, geolocation precisa, deep linking.
- `[29.A.2.3]` **Arquitectura**: monorepo Turborepo con `apps/web` (existente) + `apps/mobile` (Expo) + `packages/shared` (lib + features reusados via TS paths).
- `[29.A.2.4]` **Stack**: Expo SDK 52+, React Native 0.80+, React Query + tRPC client compartido. Si migración tRPC v11 continúa compatible.
- `[29.A.2.5]` **Scope MVP app**: Dashboard (7 KPIs + alertas), Contactos (CRUD + call + WA deep), Visitas (con check-in geo), Notificaciones push nativas, Inbox unificado.
- `[29.A.2.6]` **Deps**: compartir `shared/lib/*` requiere exportar paquete npm privado o pnpm workspace.
- `[29.A.2.7]` **ADR requerido**: ADR-012 "Mobile Native Strategy". Alternativas: PWA stays only, Capacitor wrapper, Expo, React Native bare, full native (Swift + Kotlin — reject).
- `[29.A.2.8]` **Effort**: ~8-12 sesiones (3-5 semanas).
- `[29.A.2.9]` **Apple Developer account** + Google Play Developer account compradas.

**Criterio de done del módulo:**
- [ ] Pin + ADR-012 pendiente.

#### MÓDULO 29.A.3 — Comunidad (foros + reviews comprador públicos)

**Pins:**
- `[29.A.3.1]` **Feature**: foros por zona/colonia (vecinos pregunta-responde) + reviews comprador post-compra (Trustpilot-like).
- `[29.A.3.2]` **Rationale**: social proof + moat (acumulación reviews imposible de copiar). Briefing §2 ítem 5 lo marca H2/H3.
- `[29.A.3.3]` **Opciones técnicas**: Discourse embed (self-host Docker) vs custom Supabase tables + UI. Discourse facilita + modar + email digest + trust levels.
- `[29.A.3.4]` **Moderation**: AI primary (Claude Haiku) para spam/insults; human secondary (community manager contratar).
- `[29.A.3.5]` **ADR requerido**: ADR-013 "Community Architecture".
- `[29.A.3.6]` **Legal**: T&Cs nueva sección "User-generated content" — DMX no responsable por content users.
- `[29.A.3.7]` **Effort**: 5-7 sesiones.

**Criterio de done del módulo:**
- [ ] Pin + ADR-013 pendiente.

#### MÓDULO 29.A.4 — DMX Estimate v2 (gradient boosting)

**Pins:**
- `[29.A.4.1]` **Feature**: upgrade del AVM de regression lineal (H1) a gradient boosting (XGBoost/LightGBM) con calibración sobre transacciones reales.
- `[29.A.4.2]` **Rationale**: error target H1 <20%, H2 target <15%, H3 target <10%.
- `[29.A.4.3]` **Deps**: mínimo 50+ transacciones reales cerradas H1 (soft launch cohort) para calibrar.
- `[29.A.4.4]` **Stack**: Python notebook entrena offline → export coeficientes JSON → inference TS. O bien Python edge function (Modal/Replicate).
- `[29.A.4.5]` **ADR requerido**: ADR-014 "IE Model Training Pipeline".
- `[29.A.4.6]` **Effort**: 4-6 sesiones + data engineering.

**Criterio de done del módulo:**
- [ ] Pin + ADR-014 pendiente.

#### MÓDULO 29.A.5 — Ingestors H2 críticos (RAMA, SEDUVI, Catastro dinámico)

**Pins:**
- `[29.A.5.1]` **RAMA** (Red Automática Monitoreo Atmosférico CDMX): calidad aire real-time + histórico 2 años → feeds F06 Air Quality Score + H14 Environmental Risk.
- `[29.A.5.2]` **SEDUVI** uso suelo dinámico + permisos construcción: feeds F11 Supply Pipeline + Risk Score urbanización.
- `[29.A.5.3]` **Catastro CDMX dinámico**: updates trimestrales vs snapshots H1 estáticos. Posible licencia pagada o scraping público.
- `[29.A.5.4]` **Deps**: cada uno ingestor stand-alone → backfill 2 años + cron semanal.
- `[29.A.5.5]` **ADR requerido**: no individual; patrón ingestores ya establecido Fase 07.

**Criterio de done del módulo:**
- [ ] Pins registrados.

#### MÓDULO 29.A.6 — API Live con 5+ clientes pagando

**Pins:**
- `[29.A.6.1]` **Objetivo**: después de infra H1 (Fase 23), aterrizar go-to-market:
  - Sales outreach a portales (Inmuebles24, Vivanuncios), fintechs (Creditas, Coru, Yotepresto), aseguradoras (GNP, Qualitas).
  - Contratos enterprise + onboarding técnico.
  - Meta H2: 5 clientes pagando suscripción API.
- `[29.A.6.2]` **Effort comercial**: no dev; sales + support + case studies. Dev puede tener tickets accidentally (features específicos pedidos clientes enterprise).
- `[29.A.6.3]` **Dashboard clientes**: usage, invoices, support tickets.

**Criterio de done del módulo:**
- [ ] Pin commercial tracked.

#### MÓDULO 29.A.7 — Academia completa

**Pins:**
- `[29.A.7.1]` **Feature**: cursos progresivos con videos, lecciones, certificación. Integrado `/academia/[id]`.
- `[29.A.7.2]` **Contenido inicial**: 5 cursos: "Onboarding asesor", "Dominio IE scores", "Captaciones pro", "Objection killer AI", "DMX OS completo".
- `[29.A.7.3]` **Stack**: Mux para video hosting + adaptive streaming, Supabase tables `courses`, `lessons`, `user_progress`, `certifications`.
- `[29.A.7.4]` **Gamification**: integrado con XP + badges (Fase 13).
- `[29.A.7.5]` **ADR requerido**: ADR-015 "Academy Content Pipeline".
- `[29.A.7.6]` **Effort**: 4-6 sesiones.

**Criterio de done del módulo:**
- [ ] Pin + ADR-015 pendiente.

#### MÓDULO 29.A.8 — Inbox unificado mejorado

**Pins:**
- `[29.A.8.1]` **Feature**: de "Inbox MVP H1" (emails + WA + eventos CRM) a inbox pro con threading, labels, snooze, AI triage, bulk actions.
- `[29.A.8.2]` **Inspiration**: Superhuman/Hey.com pattern.
- `[29.A.8.3]` **AI triage**: Claude Haiku clasifica entrante en "urgente / hoy / puede esperar / AI puede responder autonomously". Asesor review responses antes enviar.
- `[29.A.8.4]` **Gmail/Outlook integrations**: OAuth + sync bidireccional.
- `[29.A.8.5]` **ADR requerido**: ADR-016 "Inbox Architecture + AI Triage".
- `[29.A.8.6]` **Effort**: 5-7 sesiones.

**Criterio de done del módulo:**
- [ ] Pin + ADR-016 pendiente.

#### MÓDULO 29.A.9 — UPG 7.13 Gobierno & Notarías (upgrades 111-122)

**Pins:**
- `[29.A.9.1]` **Alcance**: 12 upgrades:
  - 111: Observatorio gobierno (dashboard alcaldías con métricas públicas DMX).
  - 112: Predicción servicios (demanda metro, agua, saneamiento).
  - 113: Construcción informal (detección vía satelital H3 + denuncias + discrepancias).
  - 114: Policy impact simulator.
  - 115: Atlas dinámico CDMX (mapa interactivo scores públicos).
  - 116: Credit scoring geo (banks).
  - 117: Insurance geo (aseguradoras).
  - 118: Due diligence automatizado.
  - 119: Valor escrituración (notarías).
  - 120: Certificado libertad + gravamen (integración RPP).
  - 121: Microcréditos geo (fintechs).
  - 122: Token urbano (exploración stablecoin real estate — H3 deep).
- `[29.A.9.2]` **Deps**: 7.6 AVM H2 + 7.12 API H1.
- `[29.A.9.3]` **ADR requerido**: ADR-017 "Government & Notary Integration Strategy".

**Criterio de done del módulo:**
- [ ] Pin 12 upgrades + ADR-017 pendiente.

#### MÓDULO 29.A.10 — UPG 7.14 Movilidad & Retail (upgrades 123-132)

**Pins:**
- `[29.A.10.1]` **Alcance**: 10 upgrades:
  - 123: Delivery demand score (para Rappi/UberEats site-selection).
  - 124: Route seguridad (rutas óptimas minimum crime).
  - 125: Site Selection CRE retail (SCIAN gaps).
  - 126: Competitive SCIAN (densidad por sub-sector).
  - 127: Trade area analysis (radius demand).
  - 128: Yield renta (para REITs / airbnb operators).
  - 129: Feasibility auto (dev pre-compra land).
  - 130: Predictive maintenance infra (muni + portadores).
  - 131: Digital twin básico (H3 Matterport).
  - 132: (placeholder cross-module).
- `[29.A.10.2]` **Deps**: 7.5 pre-calculators + 7.8 mapa 7 capas.
- `[29.A.10.3]` **ADR requerido**: ADR-018 "Mobility & Retail Vertical Products".

**Criterio de done del módulo:**
- [ ] Pin + ADR-018 pendiente.

#### MÓDULO 29.A.11 — UPG 7.15 Growth & Contenido viralizable (upgrades 133-150)

**Pins:**
- `[29.A.11.1]` **Alcance**: 18 upgrades:
  - 133: Mapa público mejorado (H3 en H1 limitada).
  - 134: Rankings públicos virales (top 10 colonias por cada índice).
  - 135: Estado mercado newsletter (mensual).
  - 136: Alertas públicas.
  - 137: API playground (ya H1).
  - 138: Índice DMX consolidado (agregado presentable).
  - 139: API academia (para partners embed).
  - 140: Data journalism (con Forbes/Expansion).
  - 141: Wallet patrimonio user.
  - 142: Self-optimizing scores (ML continuous).
  - 143: Predictive zoning.
  - 144: Urban genome (DNA colonia).
  - 145: DMX OS.
  - 146: Shareable cards.
  - 147: Weekly wins.
  - 148: Achievements extend.
  - 149: NPS continuous.
  - 150: (placeholder).
- `[29.A.11.2]` **ADR requerido**: ADR-019 "Growth & Viral Content Strategy".

**Criterio de done del módulo:**
- [ ] Pin + ADR-019 pendiente.

#### MÓDULO 29.A.12 — UPG 7.16 Fintech & Proptech (upgrades 151-165)

**Pins:**
- `[29.A.12.1]` **Alcance**: 15 upgrades:
  - 151: Property verification.
  - 152: Developer trust deep.
  - 153: Asesor verification.
  - 154: Buyer fraud detection.
  - 155: AML flag avanzado (vs H1 básico).
  - 156: Property enrichment APIs.
  - 157: Contact enrichment.
  - 158: Developer enrichment.
  - 159: Zone batch enrichment.
  - 160: Broker enrichment.
  - 161: Sentiment analysis.
  - 162: Reputation scoring.
  - 163: Buzz detection (social).
  - 164: News monitoring.
  - 165: Competitor tracking.
- `[29.A.12.2]` **ADR requerido**: ADR-020 "Fintech & Proptech Enrichment Stack".

**Criterio de done del módulo:**
- [ ] Pin + ADR-020 pendiente.

### BLOQUE 29.B — H3 Scaffold (6-12+ meses)

#### MÓDULO 29.B.1 — DMX Knowledge Graph ($50K+/mes)

**Pins:**
- `[29.B.1.1]` **Feature**: Knowledge Graph DMX — 500M nodos / 1.5B edges (Cherre pattern, producto #7).
- `[29.B.1.2]` **Stack opciones**: Neo4j + Neosemantics (RDF), ArangoDB, Memgraph, o TypeDB. Postgres pgvector + pg_graph limited.
- `[29.B.1.3]` **Nodes**: Properties, People, Companies, Addresses, Developments, Zones, Transactions. Edges: owns, managed_by, located_in, sold_to, similar_to, competes_with.
- `[29.B.1.4]` **Endpoint**: `POST /api/v1/knowledge-graph/query` con Cypher/GQL wrapper.
- `[29.B.1.5]` **Pricing**: $50K+/mes enterprise only.
- `[29.B.1.6]` **ADR requerido**: ADR-021 "Knowledge Graph Architecture".

**Criterio de done del módulo:**
- [ ] Pin + ADR-021 pendiente.

#### MÓDULO 29.B.2 — DMX COMPASS (predicción cierre)

**Pins:**
- `[29.B.2.1]` **Feature**: modelo predictivo probabilidad cierre operación por opportunity en pipeline (CoStar COMPASS pattern).
- `[29.B.2.2]` **Data**: 17 años idealmente; H3 empezamos con 1-2 años data Pulppo-equiv + DMX acumulada.
- `[29.B.2.3]` **Model**: gradient boosting sobre features (lead temp, SLA response, price match, buyer profile, historical asesor close rate, zone momentum).
- `[29.B.2.4]` **UX**: score 0-100 en cada operación + explainability (top 3 features driving).
- `[29.B.2.5]` **Pricing**: Incluido Enterprise marketplace + licenciable brokers grandes.
- `[29.B.2.6]` **ADR requerido**: ADR-022 "COMPASS Predictive Model".

**Criterio de done del módulo:**
- [ ] Pin + ADR-022 pendiente.

#### MÓDULO 29.B.3 — Satellite imagery + computer vision fachadas

**Pins:**
- `[29.B.3.1]` **Feature**: satellite NDVI (vegetación zonas), detección construcción informal, CAPE-Analytics-pattern para condición fachadas (property.condition_score).
- `[29.B.3.2]` **Providers**: Planet Labs, Maxar, Sentinel-2 (gratis ESA). Street View via Google Maps API (pricey).
- `[29.B.3.3]` **Models**: Pre-trained vision models fine-tuned en MX building types (casona, condominio, torre).
- `[29.B.3.4]` **Integration**: ingestor ejecuta monthly → update `property_scores.condition_cv`.
- `[29.B.3.5]` **ADR requerido**: ADR-023 "Computer Vision & Satellite".

**Criterio de done del módulo:**
- [ ] Pin + ADR-023 pendiente.

#### MÓDULO 29.B.4 — Matterport 3D digital twins integration

**Pins:**
- `[29.B.4.1]` **Feature**: integración con Matterport para tours 3D de unidades + digital twins edificio.
- `[29.B.4.2]` **Target**: MRP (Matterport Referral Program) para leads → revenue-share DMX.
- `[29.B.4.3]` **Embed**: iframe en ficha proyecto + viewer móvil.
- `[29.B.4.4]` **Effort**: integración API Matterport (~2 semanas).

**Criterio de done del módulo:**
- [ ] Pin registrado.

#### MÓDULO 29.B.5 — Social sentiment (Twitter + Google Reviews + Instagram)

**Pins:**
- `[29.B.5.1]` **Feature**: sentiment score por zona + por desarrolladora desde menciones públicas sociales.
- `[29.B.5.2]` **APIs**: Twitter/X API v2 (pricey), Google My Business (free), Instagram Graph API (limited).
- `[29.B.5.3]` **NLP**: Claude Haiku para clasificar + sentiment. Palabras clave colonia/proyecto.
- `[29.B.5.4]` **Output**: `zone_sentiment_score`, `developer_sentiment_score`.

**Criterio de done del módulo:**
- [ ] Pin registrado.

#### MÓDULO 29.B.6 — Multi-city MX expansion

**Pins:**
- `[29.B.6.1]` **Cities priority**: Guadalajara (GDL) → Monterrey (MTY) → Puebla → Querétaro → Tijuana → Mérida → Cancún.
- `[29.B.6.2]` **Por city**: ingestors locales (catastro/DENUE scope expand), calibración scores, seeds asesores+devs.
- `[29.B.6.3]` **Effort**: ~2-3 semanas per city (Patrón replicable tras primera expansion GDL).
- `[29.B.6.4]` **Feature flag**: `region_gdl_enabled`, etc.

**Criterio de done del módulo:**
- [ ] Pins ciudades.

#### MÓDULO 29.B.7 — LATAM expansion (CO → AR → BR → CL)

**Pins:**
- `[29.B.7.1]` **Sequence**:
  - **CO primero** (Bogotá → Medellín). Data sources: DANE, DIAN, Certicámara firmas.
  - **AR**: Buenos Aires. INDEC, AFIP, legal Ley 25.326.
  - **BR**: São Paulo → Rio. IBGE, LGPD hard compliance.
  - **CL**: Santiago. INE, SII, Ley 19.628.
- `[29.B.7.2]` **Tax engines + payment processors** per country (Wompi CO, MercadoPago).
- `[29.B.7.3]` **Effort**: 6-8 semanas per country.
- `[29.B.7.4]` **ADR requerido**: ADR-024 "LATAM Expansion Playbook".

**Criterio de done del módulo:**
- [ ] Pin + ADR-024 pendiente.

#### MÓDULO 29.B.8 — DMX Estimate v3 deep learning

**Pins:**
- `[29.B.8.1]` **Feature**: modelo deep learning (transformer-based o GNN) calibrado con 500+ transacciones reales.
- `[29.B.8.2]` **Target error**: <10% MAPE.
- `[29.B.8.3]` **Stack**: PyTorch training, TorchServe inference, Modal/Replicate hosting.
- `[29.B.8.4]` **ADR requerido**: extensión ADR-014.

**Criterio de done del módulo:**
- [ ] Pin registrado.

#### MÓDULO 29.B.9 — UPG 7.17 People Intelligence (55 upgrades 166-225) — SUB-ETAPA MÁS GRANDE

**Pins:**
- `[29.B.9.1]` **Categorías** (según IE5 / contexto §23):
  - **IDENTITY (5)**: Buyer DNA, Asesor DNA, Developer DNA, Household intelligence, Life stage detection.
  - **MATCHING (5)**: Neural matching, Asesor-buyer matching, Dev-broker matching, Network intelligence, Influence score.
  - **BEHAVIORAL (5)**: Decision fatigue, FOMO, Loss aversion, Anchoring, Social proof.
  - **REPUTATION (5)**: Rating público, Timeline actividad, Verified badge, Reviews deep, Disputes mgmt.
  - **PREDICTIVE (5)**: Readiness to buy, Churn avanzado, Next move, Market timing, Career trajectory.
  - **PERSONALIZATION (5)**: Homepage por DNA, Notifs personalizadas, Email personalizado, Pricing display, Adaptive UX.
  - **COMMUNITY (5)**: Zona feed, Knowledge sharing, Social proof amplified, Co-investment, Team intelligence.
  - **DATA SERVICE (5)**: Enrichment API, Batch processing, Monitoring, Custom reports, White-label.
  - **WORKFLOW (5)**: Lead scoring auto, Auto-pricing, Smart notifs, Auto-captación, Auto-followup.
  - **ECOSISTEMA (5)**: Mudanzas partner, Servicios hogar, Recruiting, Benchmarking, Insurance integration.
  - **GLOBAL (5)**: Multi-city scaling, LATAM core, Cross-border, Academic partnerships, Government integration.
- `[29.B.9.2]` **Deps fuertes**: 7.5-7.16 todos.
- `[29.B.9.3]` **ADR requerido**: ADR-025 "People Intelligence Stack — 55 upgrades roadmap" (puede dividirse en 11 sub-ADRs por categoría).
- `[29.B.9.4]` **Effort**: 15-20 sesiones distribuidas 6-12 meses.

**Criterio de done del módulo:**
- [ ] Pin con 11 categorías + ADR-025 pendiente (probablemente splitea).

#### MÓDULO 29.B.10 — UPG 7.18 Interacción Activa (upgrades 226-235)

**Pins:**
- `[29.B.10.1]` **10 upgrades**:
  - 226: NLP WhatsApp avanzado (intents + slots + actions).
  - 227: Voice of customer (análisis masivo conversaciones).
  - 228: Question intelligence (detecta preguntas recurrentes → FAQ auto).
  - 229: Negotiation intelligence (Asiste asesor en oferta/contraoferta).
  - 230: Objection mapping zona (objeciones frecuentes por colonia).
  - 231: Preference revelation (descubre prefs no declaradas).
  - 232: Emotional journey (tracking emotional tone buyer).
  - 233: Coaching signals (asesor mejora via AI coach).
  - 234: Trust building (markers visibility trust).
  - 235: Decision acceleration (nudges inteligentes).
- `[29.B.10.2]` **Deps**: 7.17 People Intelligence.
- `[29.B.10.3]` **ADR requerido**: ADR-026 "Active Interaction AI Layer".

**Criterio de done del módulo:**
- [ ] Pin + ADR-026 pendiente.

#### MÓDULO 29.B.11 — UPG 7.19 Market Memory + DMX Agente (upgrades 236-245)

**Pins:**
- `[29.B.11.1]` **10 upgrades**:
  - 236: Market memory (historical pattern library).
  - 237: Pattern library.
  - 238: Collective intelligence (agregado cross-users insights).
  - 239: Urban narrative (AI cuenta historia evolución ciudad).
  - 240: Feedback loops closed.
  - 241: **DMX co-pilot asesor** (agente que actúa on-behalf-of).
  - 242: **DMX advisor comprador** (agente asiste decisión compra).
  - 243: **DMX strategist desarrollador** (agente recomienda strategy project).
  - 244: Proactive intelligence (alertas no solicitadas relevantes).
  - 245: Scenario simulator (what-if analysis con IE).
- `[29.B.11.2]` **Deps**: 7.17-7.18.
- `[29.B.11.3]` **ADR requerido**: ADR-027 "DMX Agent Architecture — long-running agents + tools + memory".
- `[29.B.11.4]` **Este es el final de la roadmap 245 upgrades.** Después de esto, el producto es "DMX Agente" — el sistema operativo completo.

**Criterio de done del módulo:**
- [ ] Pin + ADR-027 pendiente.

### BLOQUE 29.C — Decisiones arquitectónicas pre-H2

#### MÓDULO 29.C.1 — Consolidación tRPC routers

**Pins:**
- `[29.C.1.1]` **Observación**: H1 tiene ~15 routers tRPC. Si escalable bien, dejar. Si fricciones (imports circulares, acoplamiento features, performance), consolidar a 6 agregados (auth, asesor, dev, admin, comprador, public).
- `[29.C.1.2]` **Decisión diferida**: evaluar post-launch con métricas (build time, DX feedback).
- `[29.C.1.3]` **ADR requerido si consolidación**: ADR-028 "tRPC Router Refactor".

**Criterio de done del módulo:**
- [ ] Pin de evaluación.

#### MÓDULO 29.C.2 — Monorepo Turborepo eval

**Pins:**
- `[29.C.2.1]` **Trigger**: se dispara cuando llega decisión MÓDULO 29.A.2 (app nativa).
- `[29.C.2.2]` **Alternativas**: Turborepo (Vercel nativo), Nx (pythion-tsconfig-paths friendly), pnpm workspaces solo.
- `[29.C.2.3]` **Decisión diferida** hasta app nativa confirmada.
- `[29.C.2.4]` **ADR requerido**: ADR-029 "Monorepo Strategy".

**Criterio de done del módulo:**
- [ ] Pin.

#### MÓDULO 29.C.3 — Vercel Queues migración

**Pins:**
- `[29.C.3.1]` **Current H1**: Vercel Queues (si GA) o BullMQ/Trigger.dev.
- `[29.C.3.2]` **Migration plan**: cuando Vercel Queues GA, migrar from Trigger.dev para consolidar vendor.
- `[29.C.3.3]` **ADR requerido**: ADR-030 "Queue Provider Decision".

**Criterio de done del módulo:**
- [ ] Pin.

#### MÓDULO 29.C.4 — pnpm migration eval

**Pins:**
- `[29.C.4.1]` **Current H1**: npm (default briefing §4).
- `[29.C.4.2]` **Trigger**: monorepo confirmed → pnpm workspaces vale la pena.
- `[29.C.4.3]` **Decisión**: diferida.

**Criterio de done del módulo:**
- [ ] Pin.

#### MÓDULO 29.C.5 — SaaS marketplace estándar para productos B2B

**Pins:**
- `[29.C.5.1]` **Opciones**: Apphub / Vercel Marketplace / Salesforce AppExchange (H3 depth).
- `[29.C.5.2]` **Propósito**: distribute productos B2B (Livability API, Momentum Index) vía marketplaces existentes para reach.
- `[29.C.5.3]` **Decisión diferida**.

**Criterio de done del módulo:**
- [ ] Pin.

### BLOQUE 29.D — ADRs futuros (mapa)

#### MÓDULO 29.D.1 — Lista completa ADRs H2/H3 pendientes

**Pins:**
- `[29.D.1.1]` ADR-011 Enterprise SSO.
- `[29.D.1.2]` ADR-012 Mobile Native Strategy (Expo).
- `[29.D.1.3]` ADR-013 Community Architecture.
- `[29.D.1.4]` ADR-014 IE Model Training Pipeline.
- `[29.D.1.5]` ADR-015 Academy Content Pipeline.
- `[29.D.1.6]` ADR-016 Inbox Architecture + AI Triage.
- `[29.D.1.7]` ADR-017 Government & Notary Integration.
- `[29.D.1.8]` ADR-018 Mobility & Retail Vertical Products.
- `[29.D.1.9]` ADR-019 Growth & Viral Content.
- `[29.D.1.10]` ADR-020 Fintech & Proptech Enrichment.
- `[29.D.1.11]` ADR-021 Knowledge Graph.
- `[29.D.1.12]` ADR-022 COMPASS Predictive Model.
- `[29.D.1.13]` ADR-023 Computer Vision & Satellite.
- `[29.D.1.14]` ADR-024 LATAM Expansion.
- `[29.D.1.15]` ADR-025 People Intelligence (55 UPG).
- `[29.D.1.16]` ADR-026 Active Interaction AI.
- `[29.D.1.17]` ADR-027 DMX Agent Architecture.
- `[29.D.1.18]` ADR-028 tRPC Router Refactor.
- `[29.D.1.19]` ADR-029 Monorepo Strategy.
- `[29.D.1.20]` ADR-030 Queue Provider Decision.

**Criterio de done del módulo:**
- [ ] Lista documentada como backlog ADRs pendientes.

### BLOQUE 29.E — Triggers post-launch para promover items H2→H1.5

#### MÓDULO 29.E.1 — Señales

**Pins:**
- `[29.E.1.1]` **Retention D30 <30%** en un rol → priorizar UX mejoras de ese rol.
- `[29.E.1.2]` **NPS <30** → triage inmediato + focus groups.
- `[29.E.1.3]` **API revenue >$50K MRR** → invertir en 7.12 bulk + enterprise features.
- `[29.E.1.4]` **Enterprise lead que pide SSO** → promover ADR-011 inmediato.
- `[29.E.1.5]` **Más de 500 asesores activos** → mobile app se vuelve must.
- `[29.E.1.6]` **Competidor lanza feature crítica** → reevaluar priorities H2.

**Criterio de done del módulo:**
- [ ] Triggers documentados para decision framework.

## Criterio de done de la FASE

- [ ] Roadmap H2 con 12 módulos (SAML, mobile, comunidad, Estimate v2, ingestors, API Live commercial, Academia, Inbox, UPG 7.13-7.16) — 51 upgrades pins.
- [ ] Roadmap H3 con 11 módulos (Knowledge Graph, COMPASS, CV satellite, Matterport, Social sentiment, Multi-city, LATAM, Estimate v3, UPG 7.17-7.19) — 75 upgrades pins + 55 People Intelligence.
- [ ] 5 decisiones arquitectónicas pre-H2 pins documentadas.
- [ ] 20 ADRs futuros listados como backlog.
- [ ] 6 triggers post-launch para promoción H2→H1.5.
- [ ] Disclaimer "CERO implementación aquí" visible en encabezado.
- [ ] Cross-reference a ADRs existentes y contexto §20-23.
- [ ] Tag git `fase-29-complete`.

### BLOQUE 29.X — Pins adicionales post-FASE 11 XL

> **Contexto:** FASE 11 XL estableció seeds para múltiples moonshots (Genoma, LifePath, Climate Twin, Constellations, Living Atlas, Trend Genome, Scorecard). FASE 12 y FASE 20 los extienden a v1. Estos pins H2/H3 registran las evoluciones planeadas post-launch y referencian la visión unificadora.
> **Dependencias:** FASE 11 XL (seeds implementados) + FASE 12 (v1) + FASE 20 (v2 LifePath + DMX Habitat SEED).

#### MÓDULO 29.X.1 — DMX Urban OS (visión unificadora)

**Pins:**
- `[29.X.1.1]` **Feature**: "DMX Urban OS" como narrativa unificadora de H1+H2+H3 — sistema operativo de decisiones urbanas que integra: 15 índices DMX, Causal Engine, Trend Genome, Climate Twin, LifePath, DMX Habitat, Living Atlas, Constellations, Digital Twin 4D, Knowledge Graph, Agentic Marketplace.
- `[29.X.1.2]` **Rationale**: establecer "DMX Urban OS" como marca comercial que engloba todos los productos — permite positioning superior a competidores verticales (Cherre solo grafo; CoStar solo transacciones; Local Logic solo scores).
- `[29.X.1.3]` **Link a visión**: ver [ADR-011 Moonshot 3 Horizontes](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md) — DMX Urban OS es la culminación H3 de los 3 horizontes.
- `[29.X.1.4]` **Acciones H2**: landing `/urban-os` con narrativa + videos demos + lista productos integrados + pricing enterprise.
- `[29.X.1.5]` **ADR requerido**: ADR futuro "DMX Urban OS Brand & Architecture Unification" (post-launch).

**Criterio de done del módulo:**
- [ ] Pin registrado con link explícito a ADR-011.

#### MÓDULO 29.X.2 — DMX Habitat completo (H2 fase dedicada Colonia OS)

**Pins:**
- `[29.X.2.1]` **Feature**: extiende SEED DMX Habitat (FASE 20.Y.2) a producto completo H2 — "Colonia OS" con:
  - Comunidad verificada por colonia (residentes + vecinos + ecosistema servicios).
  - Signos vitales real-time (utilities status, crime feed, transit delays, air quality).
  - APIs apps locales (food delivery coverage, gym availability, co-working spots).
  - Governance layer (propuestas vecinales, decisiones con voto token-gated H3).
  - Social layer (eventos, intercambio de servicios, recomendaciones).
- `[29.X.2.2]` **Rationale**: convierte DMX en plataforma post-compra con recurrencia mensual — no solo "ayudé a comprar" sino "soy tu OS diario de colonia".
- `[29.X.2.3]` **Effort H2**: 8-12 sesiones, fase dedicada nueva "FASE 39 — DMX Habitat Colonia OS".
- `[29.X.2.4]` **ADR requerido**: ADR futuro "DMX Habitat Architecture + Governance + Token Economy".

**Criterio de done del módulo:**
- [ ] Pin con roadmap H2 explícito.

#### MÓDULO 29.X.3 — Mercado de predicciones Polymarket-style (SCAFFOLD H3)

**Pins:**
- `[29.X.3.1]` **Feature**: mercado de predicciones on-chain estilo Polymarket aplicado a real estate — usuarios apuestan (H3 tokens, H4 real USD regulated) sobre outcomes tipo "¿Roma Norte superará momentum 85 en Q3 2027?", "¿nuevo Metro 7 se inaugurará antes de 2028?", "¿precio promedio Condesa >$95K/m² antes de 2026-12-31?".
- `[29.X.3.2]` **Rationale**: crowd-sourcing de predictions genera señal valiosísima (wisdom of crowds) + engagement brutal + potential moat regulatorio si DMX captura el espacio primero.
- `[29.X.3.3]` **Status pins**: **founder pausó activamente este feature para roadmap 2026-2027** por complejidad regulatoria (CNBV, SEC-like scrutiny real estate predictions) + no-core al launch.
- `[29.X.3.4]` **Dejamos documentado como futuro**: pin explícito en scaffold H3 para no perder la idea. Re-evaluar T+12 meses post-launch.
- `[29.X.3.5]` **ADR requerido si reactiva**: ADR futuro "Prediction Market — Legal + Token Economy + Oracle Design".

**Criterio de done del módulo:**
- [ ] Pin registrado con status "pausado por founder 2026-04" y trigger "re-evaluar T+12m post-launch".

## Próxima fase

No hay siguiente fase inmediata. Plan maestro H1 cierra con Fase 28. Las fases post-launch son iterativas: cada ítem H2/H3 abrirá su propia "Fase 30+" cuando se construya, con su ADR propio antes.

Checkpoint recomendado: **retro T+4 semanas** (Fase 28 §28.J) decide primer item a construir post-launch.

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
