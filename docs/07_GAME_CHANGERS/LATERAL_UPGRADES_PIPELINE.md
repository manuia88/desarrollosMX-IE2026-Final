# Lateral Upgrades Pipeline — Vista única

> **Propósito:** Registro vivo de upgrades de producto detectados durante ejecución de fases que NO caben en el bloque actual pero deben capitalizarse en fases futuras. Inspirados en empresas que crearon nuevas categorías (Spotify Wrapped, Strava Segments, Robinhood, Zillow Zestimate, Substack, etc.).
> **Filosofía:** DMX no es portal más — es categoría nueva (Spatial Decision Intelligence). Estos laterales convierten datos crudos del IE en features que generan engagement, viralidad, retención y posicionamiento de marca.
> **Maintenance:** cada lateral tiene status (proposed/approved/scheduled/in_progress/done). Cuando se ejecuta la fase target, el lateral pasa a "done" y se mueve a histórico.

---

## Status legend
- 🟢 **proposed** — detectado, esperando aprobación founder
- 🟡 **approved** — aprobado, agendado para fase target
- 🔵 **in_progress** — siendo construido en fase actual
- ✅ **done** — entregado, mover a histórico

---

## Pipeline activo

### L1 — Zona Wrapped anual (Spotify Wrapped pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** cada zona genera un resumen anual visual compartible con sus scores destacados ("Roma Norte 2026: subió +18% caminabilidad, top 3 vida nocturna, agua mejoró +25 puntos").
- **Para qué sirve:** marketing orgánico viral + lock-in narrativo. La gente comparte su colonia como comparte su Spotify Wrapped.
- **Beneficio concreto:** tráfico orgánico anual masivo + brand awareness sin gastar en ads. Diciembre/enero = explosión de shares en redes.
- **Fase target:** FASE 11 (índices DMX) + FASE 23 (growth/monetización)
- **Dependencia data:** ≥12 meses de score history acumulada (BLOQUE 8.A score_history particionada cubre)
- **Inspiración:** Spotify Wrapped (2016+), Strava Year in Sport, Apple Music Replay
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` §Laterals pipeline

### L4 — Watchlist + Alertas de zonas (Robinhood pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** usuario sigue 5-10 zonas como sigue acciones. Recibe push notification cuando algún score cambia >10% (mejora o empeora).
- **Para qué sirve:** transforma la decisión de compra "una vez en la vida" en relación continua con la app.
- **Beneficio concreto:** usuario vuelve diariamente, no solo cuando va a comprar. Construye email/push list activa para monetizar después (B2B + B2C).
- **Fase target:** FASE 20 (portal comprador)
- **Dependencia data:** N0-N11 calculators + delta tracking D2 (incluido BLOQUE 8.C)
- **Inspiración:** Robinhood watchlist + alerts, eToro, TradingView
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

### L6 — "DMX Vibe Score™" como categoría propia (Zillow Zestimate pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** combinar momentum (N11) + nightlife (N09) + walkability (N08) + diversity (N01) en UNA métrica con marca propia ("DMX Vibe Score™ de Roma Norte: 92/100").
- **Para qué sirve:** misma estrategia que Zillow con Zestimate — crear categoría propia que la competencia tenga que copiar y citar (legitimando DMX como autoridad).
- **Beneficio concreto:** posicionamiento de categoría nueva ("vibe inmobiliario"), no portal más. Brand asset registrable. Diferenciador permanente vs Habi/Inmuebles24.
- **Fase target:** FASE 11 (definir como índice DMX-VIBE) + FASE 21 (publicar metodología pública)
- **Dependencia data:** N01 + N08 + N09 + N11 implementados (BLOQUE 8.C entrega)
- **Inspiración:** Zillow Zestimate, AirDNA Score, Walk Score
- **Pendiente decisión founder:** registro marca "DMX Vibe Score™" (legal + brand)
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` §Laterals pipeline

### L8 — "Today's Top Movers" público (Robinhood market dashboard pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** dashboard público con las 10 zonas que más subieron/bajaron en momentum (N11) esta semana/mes.
- **Para qué sirve:** genera FOMO + tráfico orgánico ("mira lo que está pasando en CDMX esta semana"). Atrae prensa, agentes inmobiliarios, inversores.
- **Beneficio concreto:** posicionamiento como "el Bloomberg del real estate MX". Press coverage recurring + SEO orgánico zonas.
- **Fase target:** FASE 11 (índices DMX, route /indices/movers)
- **Dependencia data:** N11 DMX Momentum Index funcionando ≥3 meses (BLOQUE 8.C N11 + tier 3 gating)
- **Inspiración:** Robinhood Top Movers, Yahoo Finance Trending, CoinMarketCap
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` §Laterals pipeline

### L9 — Suscripción a zonas con newsletter mensual (Substack pattern)
- **Status:** 🟡 approved (founder OK 2026-04-19, BLOQUE 8.C lateral session)
- **Qué es:** usuario suscribe a zonas + recibe newsletter mensual con cambios scores + nuevas propiedades + opportunities.
- **Para qué sirve:** email recurring + canal owned (no dependes de Google/Meta ads). Construye lista email valiosa.
- **Beneficio concreto:** lista email valuable para B2B (vender insights a desarrolladores) + canal directo monetizable (premium tiers, sponsored content).
- **Fase target:** FASE 20 (portal comprador) + FASE 23 (growth)
- **Dependencia data:** scores con delta tracking + Resend SMTP (stub hasta FASE 22)
- **Inspiración:** Substack, Morning Brew, The Hustle, Zillow Premier Agent newsletters
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

### L10 — DMX Property Fax (Carfax pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.D lateral session)
- **Qué es:** historial completo propiedad (ventas pasadas, avalúos, gravámenes, cambios uso suelo, propietarios anonymized) en reporte único firmado DMX.
- **Para qué sirve:** Carfax dominó automotriz con esto. Real estate MX no tiene equivalente.
- **Beneficio concreto:** producto B2C vendible $50-200/reporte + diferencial brutal vs portales. Reduce miedo del comprador.
- **Fase target:** FASE 17 (Document Intel pipeline + extracción legal/registral)
- **Dependencia data:** Document Intel pipeline (extracción PDF/registros públicos) + AVM MVP (BLOQUE 8.D) + score history
- **Inspiración:** Carfax, AutoCheck, Vinaudit
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_17_DOCUMENT_INTEL.md` §Laterals pipeline

### L11 — Closing-as-a-Service (Stripe Atlas pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.D lateral session)
- **Qué es:** AVM + escrow + CFDI + due diligence + contratos = cierre inmobiliario end-to-end.
- **Para qué sirve:** Stripe Atlas creó "incorporación-as-a-service". DMX puede ser "el Stripe del cierre inmobiliario MX".
- **Beneficio concreto:** revenue por transacción (1-2% del valor) en lugar de suscripciones. Lock-in fuerte por integración.
- **Fase target:** FASE 18 (escrow + pre-aprobación) + FASE 23 (monetización producto B2C/B2B)
- **Dependencia data:** AVM I01 (BLOQUE 8.D), escrow nativo, CFDI 4.0 automático, Mifiel firma digital
- **Inspiración:** Stripe Atlas, Carta (cap tables), Pilot (accounting), Mercury (banking-as-a-service)
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md` §Laterals pipeline + `FASE_23_MONETIZACION.md` §Laterals pipeline

### L12 — DMX Pro Terminal para profesionales (Bloomberg Terminal pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.D lateral session)
- **Qué es:** interface premium con AVM + portfolio analytics + market alerts + comparables avanzados, suscripción $299-999/mes.
- **Para qué sirve:** Bloomberg cobró $2K/mes por terminal con menos data que la que DMX tendrá. Mercado pro LATAM completamente underserved.
- **Beneficio concreto:** ARR predecible + ticket alto + clientes high-value (asesores top, fondos, family offices, corporate real estate).
- **Fase target:** FASE 23 (monetización — producto B2B premium)
- **Dependencia data:** todos los scores N0-N5, AVM I01, índices DMX, market_anomalies
- **Inspiración:** Bloomberg Terminal, Refinitiv Eikon, Capital IQ, FactSet
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_23_MONETIZACION.md` §Laterals pipeline

### L13 — DMX Property API como infraestructura B2B (Plaid pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.D lateral session)
- **Qué es:** TODA la intelligence (scores, índices, comparables, AVM, risk) expuesta como API unificada con SDK + docs.
- **Para qué sirve:** Plaid se volvió infraestructura financiera (bancos, fintech construyen sobre Plaid). DMX puede ser infraestructura inmobiliaria de LATAM.
- **Beneficio concreto:** revenue B2B masivo (Stripe-like pricing $0.01-1.00/call) + moat arquitectónico (todos construyen sobre ti).
- **Fase target:** FASE 23 (monetización — API as Product, ADR-013)
- **Dependencia data:** todos los productos IE consolidados + autenticación API key + rate limiting + observabilidad SDK
- **Inspiración:** Plaid, Stripe, Twilio, SendGrid, MapBox API
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_23_MONETIZACION.md` §Laterals pipeline

### L14 — DMX Living Map (Trulia Crime Map pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.D lateral session)
- **Qué es:** capa visual unificada de TODOS los scores DMX en mapa interactivo (heatmaps superponibles para safety, walkability, water, momentum, etc.).
- **Para qué sirve:** Trulia Crime Map fue su killer feature → adquirido Zillow $3.5B. DMX puede tener 10x más datos.
- **Beneficio concreto:** killer feature visible + viral en redes + diferencial inmediato visual + SEO orgánico zonas.
- **Fase target:** FASE 12 (Mapa 7 Capas Mapbox — encaja perfecto)
- **Dependencia data:** scores N0-N5 + tRPC scores router (FASE 09) + Mapbox heatmap layers
- **Inspiración:** Trulia Crime Map, Zillow Heat Maps, NYC Mortgage Map, Strava Global Heatmap
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_12_IE_AI_SCORES_N5.md` §Laterals pipeline

### L15 — Score Layers Toggle (Strava Heatmaps pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.E lateral session)
- **Qué es:** usuario activa/desactiva visualización de scores específicos como capas overlay (safety, walkability, water, momentum) sobre mapa o card.
- **Para qué sirve:** Strava reinventó el descubrimiento ("muéstrame solo lo que me interesa hoy"). Filter visual en lugar de listado.
- **Beneficio concreto:** UX personalizado + revisita constante (cambia capa, descubre algo nuevo) + permite usar mismo mapa para audiencias distintas (familia vs inversor).
- **Fase target:** FASE 12 (Mapa 7 Capas) + FASE 21 (Portal Público /explorar)
- **Dependencia data:** scores N0-N5 disponibles + UI Mapbox heatmap layers
- **Inspiración:** Strava Heatmaps (running/biking/winter), Google Maps "Layers", Waze "Reports"
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_12_IE_AI_SCORES_N5.md` y `FASE_21_PORTAL_PUBLICO.md` §Laterals pipeline

### L16 — Insight Cards auto-generadas (Apple Health Trends pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.E lateral session)
- **Qué es:** tarjetas pequeñas auto-generadas con observaciones personalizadas ("Tu zona favorita Roma Norte mejoró +15 en walkability este mes").
- **Para qué sirve:** Apple Health domina engagement con esto sin spam invasivo. Notificación contextual valiosa.
- **Beneficio concreto:** sensación de app que "le habla a usted" personalizado + revisita orgánica + diferencia vs portales que solo muestran listings.
- **Fase target:** FASE 20 (portal comprador — sección "Para ti" o "Tu DNA")
- **Dependencia data:** delta tracking D2 + watchlist L4 + behavioral inference engine PPD Capa 3
- **Inspiración:** Apple Health Trends, Google Activity Insights, Strava "Suffer Score" insights
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

### L17 — Score Story formato vertical inmersivo (Snapchat Stories pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.E lateral session)
- **Qué es:** experiencia móvil-first inmersiva tipo Story: tap por tap muestra cada dimensión de la zona (walkability → safety → schools → momentum → recommendations).
- **Para qué sirve:** Snapchat reinventó cómo consumimos info en móvil. Formato vertical full-screen con storytelling guiado.
- **Beneficio concreto:** posicionamiento mobile-native + tiempo en app aumenta drásticamente + perfecto para compartir captura/screen-record.
- **Fase target:** FASE 20 (portal comprador — modo "explorar zona inmersivo")
- **Dependencia data:** scores N0-N5 + reasoning_template U12 + score_label_key U14
- **Inspiración:** Snapchat Stories, Instagram Stories, TikTok For You feed, NYTimes "Snow Fall"
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

### L18 — Score Reactions con emoji (Discord Reactions pattern) — DUAL PURPOSE
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.E lateral session)
- **Qué es:** usuarios reaccionan a un score con emoji (👍🔥😱❤️) en 1 click.
- **Para qué sirve dual:**
  - **Engagement:** Discord democratizó feedback social ligero sin reviews complejos. Frictionless data point + viralidad ligera.
  - **PPD Signal source (CRÍTICO):** cada reacción es signal behavioral para Capa 3 inference engine de ADR-021. 👍=neutral_positive, 🔥=strong_positive (esta dimensión me importa mucho), 😱=strong_negative (deal-breaker), ❤️=emotional_match. Mapea a confidence deltas por dimensión 6D del DNA del comprador.
- **Beneficio concreto:** doble valor por mismo feature — engagement social + alimento al match engine personalizado sin necesidad de micro-questions explícitas. 1 reacción = 1 signal de confianza alta para PPD.
- **Fase target:** FASE 20 (portal comprador — UI score detail + integración inference engine PPD)
- **Dependencia data:** scores N0-N5 + behavioral inference engine PPD Capa 3 (ADR-021)
- **Inspiración:** Discord Reactions, Slack Emoji Reactions, Linear Issue Reactions, GitHub PR Reactions
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline + `docs/01_DECISIONES_ARQUITECTONICAS/ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md` §Capa 3 (Score Reactions agregado como signal source 2026-04-20)

### L19 — Comparison Gallery drag-and-drop (Notion Galleries pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.E lateral session)
- **Qué es:** usuario arrastra hasta 5 zonas/propiedades a un canvas compartible para comparar visualmente side-by-side.
- **Para qué sirve:** Notion creó la categoría "free-form workspace". DMX puede ser el "Notion del real estate decision-making".
- **Beneficio concreto:** comparador real (no tabla aburrida) + viralidad cuando se comparte canvas + perfecto para decisiones en pareja/familia.
- **Fase target:** FASE 20 (portal comprador — "Comparador Multidimensional" ya en innovations #26)
- **Dependencia data:** scores N0-N5 + comparable_zones U13 + ranking D3 + screenshot/share kit
- **Inspiración:** Notion Galleries, Miro Boards, Figma FigJam, Pinterest Boards
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline (cruza con innovation #26 ya aprobada)

### L20 — DMX Data Quality Dashboard (Datadog pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.F lateral session)
- **Qué es:** observability pública del IE — cuántos scores se actualizan/min, qué cascades fallaron, latencia worker, freshness por fuente, queue depth.
- **Para qué sirve:** Datadog dominó observability haciéndola visible y bonita. Trust factor B2B brutal — clients ven cómo procesa data en tiempo real.
- **Beneficio concreto:** transparency operacional como brand asset. Diferencial vs portales que esconden internals. Material onboarding clients enterprise.
- **Fase target:** FASE 19 (Portal Admin Market Observatory) + FASE 24 (Observabilidad SRE)
- **Dependencia data:** PostHog ie.score.calculated events (U7) + cascade execution logs + queue metrics endpoint (BLOQUE 8.A) + cost tracker integration (U3)
- **Inspiración:** Datadog dashboards, Honeycomb, Grafana, Stripe Status Page, Vercel Status
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_19_PORTAL_ADMIN.md` §Laterals pipeline + `FASE_24_OBSERVABILIDAD_SRE.md` §Laterals pipeline

### L21 — DMX Pipeline Audit Trail (Vercel Functions Logs pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.F lateral session)
- **Qué es:** cada score persistido tiene log explorable: cascade trigger → queue position → worker pickup → calc duration → persist time → downstream cascades.
- **Para qué sirve:** Vercel hizo logs accessibles UI vs grep en stack traces. Debugging granular + auditoría B2B.
- **Beneficio concreto:** "muéstrame cómo se computó este score histórico exacto" — vital para aseguradoras/bancos que requieren auditabilidad. Trust producto B2B.
- **Fase target:** FASE 19 (Portal Admin) + FASE 24 (Observabilidad SRE)
- **Dependencia data:** score_history (BLOQUE 8.A) + cascade execution logs + provenance U4 + worker tick events
- **Inspiración:** Vercel Functions Logs, Datadog APM Traces, AWS X-Ray, Honeycomb Traces
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_19_PORTAL_ADMIN.md` §Laterals pipeline + `FASE_24_OBSERVABILIDAD_SRE.md` §Laterals pipeline

### L22 — DMX Score Time Travel (Snowflake Time Travel pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.F lateral session)
- **Qué es:** consultar "¿cuál era el F01 de Roma Norte hace 6 meses?" desde score_history en una sola query API.
- **Para qué sirve:** Snowflake creó la categoría time-travel SQL — analytics retroactivo nativo sin armar pipelines.
- **Beneficio concreto:** comparativos temporales killer feature ("zona X mejoró 35% en walkability vs hace 1 año"). Material para reportes B2B + marketing + DMX Wrapped (L1).
- **Fase target:** FASE 11 (Índices DMX — exponer time-travel API público en /api/v1/scores/history)
- **Dependencia data:** score_history particionada (BLOQUE 8.A pg_partman) + tRPC scores router (FASE 09) + provenance U4
- **Inspiración:** Snowflake Time Travel, BigQuery Time Travel, Datomic, Git
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` §Laterals pipeline

### L23 — DMX Concierge Onboarding B2B (Stripe Atlas pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, BLOQUE 8.F lateral session)
- **Qué es:** para clientes B2B (devs/asesores/aseguradoras), proceso onboarding asistido (1-on-1 + setup) en lugar de DIY self-service.
- **Para qué sirve:** Stripe Atlas vende setup, no producto. Ticket alto + retención mayor + clientes "pegados" desde día 1.
- **Beneficio concreto:** revenue $5K-15K por setup + LTV mucho mayor + casos de uso documentados que alimentan marketing.
- **Fase target:** FASE 23 (Monetización — producto B2B premium "Concierge Tier")
- **Dependencia data:** AVM I01 (BLOQUE 8.D) + DMX Pro Terminal L12 + DMX Property API L13 + onboarding playbook humano
- **Inspiración:** Stripe Atlas, Mercury Banking, Pilot, Brex, Carta enterprise onboarding
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_23_MONETIZACION.md` §Laterals pipeline

### L24 — DMX Cascade Marketplace (GitHub Actions pattern)
- **Status:** 🟢 proposed (founder OK 2026-04-20, BLOQUE 8.F lateral session — H2/H3 platform play)
- **Qué es:** terceros (asesores, partners, devs) definen sus propias cascades custom ("cuando F01 baja >10%, mandar WhatsApp a mi pipeline" / "cuando momentum N11 sube en zona X, alert mi CRM").
- **Para qué sirve:** GitHub Actions creó marketplace de automation — ecosistema explosivo de terceros construyendo valor sobre la plataforma.
- **Beneficio concreto:** plataforma con efecto red — terceros construyen sobre DMX. Categoría Platform Play (ADR-015). Moat arquitectónico permanente.
- **Fase target:** H2/H3 — requiere ADR nuevo "DMX Cascade Marketplace" + FASE futura post-monetización core (FASE 28+ no existe aún en plan maestro)
- **Dependencia data:** cascades formales (BLOQUE 8.F) + DMX Property API L13 + webhook infra (FASE 22) + sandbox seguro para terceros
- **Inspiración:** GitHub Actions Marketplace, Zapier, IFTTT, Make.com, n8n
- **Cross-ref:** ADR pendiente "Cascade Marketplace Platform" (H2 decision)

### L25 — Score Health Check periódico (Mint / Personal Capital pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 09 lateral session)
- **Qué es:** dashboard semanal/mensual personalizado "salud financiera de tu zona" — F08 + A05 + A12 + tendencias en 1 vista visual.
- **Para qué sirve:** Mint dominó personal finance haciéndolo visual y proactivo. Para real estate equivalente: el comprador entiende "salud de su decisión" sin tener que abrir 10 tabs.
- **Beneficio concreto:** retención mensual orgánica + canal email recurrente + posicionamiento "Mint del real estate". Notificaciones contextuales sin ser intrusivas.
- **Fase target:** FASE 20 (portal comprador — sección "Salud de tu zona/portfolio")
- **Dependencia data:** N1 scores F08 + A05 + A12 (FASE 09) + delta tracking D2 + watchlist L4 + Resend SMTP (FASE 22)
- **Inspiración:** Mint, Personal Capital, Empower, Apple Health summary
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

### L26 — Zone Discovery Swipe (Tinder pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 09 lateral session)
- **Qué es:** swipe deck móvil para pre-filtrar zonas rápido (basado en match N1) antes de ir a listings detallados.
- **Para qué sirve:** Tinder reinventó decision-making frictionless en móvil. Para real estate equivalente: descubrimiento mucho más rápido vs scroll infinito de listings.
- **Beneficio concreto:** discovery 10x más rápido + reduce decision fatigue + alimenta PPD Capa 3 inference engine (cada swipe es signal behavioral).
- **Fase target:** FASE 20 (portal comprador — alineado con innovation #5 Visual Preference Learning ya aprobada + #10 Swipe Mode)
- **Dependencia data:** N1 match scores + buyer_persona (H14 N1) + behavioral inference engine PPD Capa 3
- **Inspiración:** Tinder, Bumble, Hinge, Pinterest, Vinted (decisión rápida visual)
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline (cruza con innovations #5 + #10)

### L27 — DMX Sector Maps (CB Insights pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 09 lateral session)
- **Qué es:** visualizaciones segmentadas del mercado — "todas las zonas premium consolidadas vs emergentes", "devs por tier de calidad H05", "matriz competitive intel B07 vs market share".
- **Para qué sirve:** CB Insights creó la categoría "venture capital intelligence" con esto. DMX puede ser CB Insights del real estate LATAM.
- **Beneficio concreto:** producto B2B premium para fondos/asesores institucionales. ARR alto. Material para press + reportes trimestrales.
- **Fase target:** FASE 19 (Portal Admin Market Observatory) + FASE 23 (Monetización producto B2B)
- **Dependencia data:** N1 scores B07 (Competitive Intel) + H05 (Trust Score) + D05 (Gentrification) + D06 (Affordability Crisis) + visualization layer Mapbox
- **Inspiración:** CB Insights Market Maps, Pitchbook, Crunchbase Pro, Bloomberg Sector views
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_19_PORTAL_ADMIN.md` + `FASE_23_MONETIZACION.md` §Laterals pipeline

### L28 — AI Portfolio Recommender (Wealthfront / Betterment pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 09 lateral session)
- **Qué es:** comprador da presupuesto + preferencias → AI DMX recomienda portfolio inmobiliario óptimo (1 propiedad o múltiples para diversificación).
- **Para qué sirve:** Wealthfront/Betterment democratizaron portfolio management automatizado. Para real estate equivalente: democratizar "asesor inmobiliario" para masas sin requerir contratar uno.
- **Beneficio concreto:** automatiza función premium para masas + ticket bajo + volumen masivo + diferenciador brutal vs portales que solo muestran listings sueltos.
- **Fase target:** FASE 20 (portal comprador — usa N1 scores A02 + A05 + A06 + A12 para optimization engine)
- **Dependencia data:** N1 scores A02 + A05 + A06 + A12 (FASE 09) + AVM I01 (BLOQUE 8.D) + buyer_persona H14 (FASE 09) + behavioral inference engine PPD
- **Inspiración:** Wealthfront, Betterment, Vanguard Personal Advisor, M1 Finance, Robinhood Smart Portfolio
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md` §Laterals pipeline

### L29 — DMX Trending Zones público (GitHub Trending pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 09 lateral session)
- **Qué es:** página pública `/trending` con zonas más exploradas/buscadas/visualizadas por usuarios DMX en últimas 24h/semana/mes.
- **Para qué sirve:** GitHub Trending fue clave para developer discovery + viralidad. Página simple pero killer para discovery social.
- **Beneficio concreto:** discovery social + FOMO + viralidad orgánica + SEO orgánico ("zonas trending CDMX 2026") + tráfico recurring sin pagar ads.
- **Fase target:** FASE 21 (Portal Público — nueva ruta `/trending`)
- **Dependencia data:** N1 score B01 Demand Heatmap (FASE 09) + search_logs (FASE 07) + project_views + delta tracking
- **Inspiración:** GitHub Trending, Product Hunt Trending, Twitter Trends, Hacker News
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md` §Laterals pipeline

### L30 — DMX Personality Score (16Personalities pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** basado en A10 Lifestyle Match, crear tipos de comprador con narrativa rica y nombre memorable ("Tipo INVESTOR_EXPLORER: prefieres zonas emergentes con momentum alto").
- **Para qué sirve:** 16Personalities dominó testing con branding memorable. Gente comparte "soy tipo X".
- **Beneficio concreto:** tribalismo + viralidad orgánica + lock-in emocional.
- **Fase target:** FASE 20 (Portal Comprador — post N3 A10 Lifestyle Match FASE 10)
- **Dependencia data:** A10 Lifestyle Match (FASE 10) + H14 Buyer Persona (FASE 09)
- **Inspiración:** 16Personalities, Myers-Briggs, Enneagram, BuzzFeed quizzes

### L31 — Multiplayer collaborative analysis (Figma pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** 2+ usuarios (pareja, familia) colaboran en mismo análisis en tiempo real con live cursors + comentarios + votos.
- **Para qué sirve:** 70% decisiones de compra son en pareja. Figma democratizó colaboración en diseño.
- **Beneficio concreto:** producto verdaderamente útil para compra real vs portales single-user.
- **Fase target:** FASE 20 (Portal Comprador — Family Accounts integration)
- **Dependencia data:** RLS multi-user + Supabase Realtime + account linking
- **Inspiración:** Figma, Google Docs, Miro, Notion shared workspaces

### L32 — DMX Zone Certified (Airbnb Superhost pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** zonas con scores top consistentes 12+ meses reciben certificación "DMX Certified".
- **Para qué sirve:** Airbnb Superhost creó signal de calidad. DMX certification = marca de confianza.
- **Beneficio concreto:** incentiva devs/propietarios a mejorar scores + brand authority + SEO.
- **Fase target:** FASE 23 (Monetización — programa badges + premium tier)
- **Dependencia data:** score_history ≥12m + E01 Full Project Score (FASE 10)
- **Inspiración:** Airbnb Superhost, TripAdvisor Excellence, Michelin Stars

### L33 — Predictive Portfolio 20 años (Wealthfront pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** dashboard personal con proyección 20 años del patrimonio inmobiliario del usuario.
- **Para qué sirve:** Wealthfront creó categoría robo-advisor. DMX para real estate.
- **Beneficio concreto:** retention tool masivo + premium tier ticket alto.
- **Fase target:** FASE 20 (Portal Comprador) + FASE 23 (Monetización premium tier)
- **Dependencia data:** A11 Patrimonio 20y (FASE 10) + E02 Portfolio Optimizer (FASE 10) + AVM I01
- **Inspiración:** Wealthfront, Betterment, Personal Capital, M1 Finance

### L34 — DMX Weekly Newsletter auto-generated (The Hustle pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** newsletter semanal con insights IE auto-generado por AI: top zonas moviéndose, anomalías, trends.
- **Para qué sirve:** The Hustle vendido $27M. Morning Brew $75M. Canal distribución + brand asset.
- **Beneficio concreto:** lista email masiva + autoridad mercado + canal owned.
- **Fase target:** FASE 22 (Marketing/Comms) + activar post Resend SMTP FASE 22
- **Dependencia data:** delta tracking D2 + N11 Momentum + L50 Crisis Alerting + AI Claude
- **Inspiración:** The Hustle, Morning Brew, Axios, Stratechery

### L35 — AI Co-pilot Deep Analysis mode (Cursor pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** extensión Copilot ⌘J con modo investigación profunda — pregunta compleja → AI investiga múltiples scores + genera reporte estructurado.
- **Para qué sirve:** Cursor creó paradigma developer tools. DMX para AI real estate advisor.
- **Beneficio concreto:** diferenciador brutal vs portales pasivos + killer feature B2B.
- **Fase target:** FASE 12 (IE AI Scores N5) extensión o FASE dedicada post-FASE 12
- **Dependencia data:** tRPC ieScores router (FASE 09) + Claude API + N5 AI scores (FASE 12)
- **Inspiración:** Cursor, GitHub Copilot Chat, Devin, Perplexity Pro

### L37 — Ready-to-Buy Score del comprador (Experian pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** score del usuario mismo (no la propiedad): bureau crediticio + comportamiento DMX + holdings = qué tan listo está para comprar.
- **Para qué sirve:** Experian dominó credit scoring. DMX crea "credit score inmobiliario".
- **Beneficio concreto:** dual revenue (vender a bancos + feature premium comprador).
- **Fase target:** FASE 18 (Legal+Pagos+Crediticio) + FASE 23 (producto B2B bancos)
- **Dependencia data:** pre-aprobación multi-banco FASE 18 + behavior DMX + holdings registrados
- **Inspiración:** Experian, Equifax, FICO, Credit Karma, Nubank Credit Score

### L38 — Zone ESG Rating (MSCI ESG pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** rating sostenibilidad ambiental + equidad social + gobernanza por zona.
- **Para qué sirve:** MSCI ESG dominó inversión institucional. Fondos ESG pagan premium.
- **Beneficio concreto:** canal ventas gestores activos institucionales (ticket alto) + impact investing.
- **Fase target:** FASE 23 (Monetización — producto B2B institucional)
- **Dependencia data:** H07 Environmental + N07 Water Security + F12 Risk Map + compliance ambiental data
- **Inspiración:** MSCI ESG, Sustainalytics, GRESB (real estate ESG), S&P ESG

### L40 — Insurance Bid Engine (Lemonade pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 lateral session)
- **Qué es:** propietario sube propiedad → DMX genera risk score → múltiples aseguradoras ofertan automáticamente.
- **Para qué sirve:** Lemonade revolucionó home insurance con AI+transparencia. DMX = "Kayak del seguro".
- **Beneficio concreto:** revenue por póliza intermediada + moat (aseguradoras construyen sobre DMX).
- **Fase target:** FASE 23 (Monetización — producto B2B2C marketplace aseguradoras)
- **Dependencia data:** DMX-IRE Risk Score (FASE 11) + AVM I01 + partnerships aseguradoras
- **Inspiración:** Lemonade, Hippo, Root Insurance, Metromile

### L42 — Zone News Radar (Bloomberg News pattern — merged into L43 Social Radar)
- **Status:** 🟢 proposed — merged conceptualmente con L43 (Social Radar Dashboard cubre news + social)
- **Qué es:** NLP sobre noticias + redes sociales mencionando zonas → early signals.
- **Decisión:** no implementar aislado; parte de L43 Social Radar Dashboard (same data pipeline).

### L43 — DMX Social Radar Dashboard (Brandwatch pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** dashboard tiempo real menciones zonas/desarrolladores/proyectos en redes sociales (X, IG, TikTok, Reddit, foros MX) con sentiment analysis agregado.
- **Para qué sirve:** Brandwatch dominó consumer intelligence. DMX equivalente real estate.
- **Beneficio concreto:** producto B2B premium ($500-2000/mes enterprise) + devs monitorean proyecto + compradores reality check vs marketing.
- **Fase target:** FASE 19 (Portal Admin Market Observatory) + FASE 23 (Monetización B2B) + cross-ADR-025 Social Intelligence
- **Dependencia data:** social listening APIs (Reddit + YouTube free, IG/X pay) + NLP Claude + news scrapers
- **Inspiración:** Brandwatch, Sprout Social, Meltwater, Talkwalker, Mention

### L44 — Real-Time Zone Feed (X/Twitter pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** feed cronológico inverso de TODO lo que pasa en zonas seguidas: score changes, nuevas propiedades, transacciones, anomalías, news.
- **Para qué sirve:** Twitter creó "real-time feed". DMX = "Twitter del real estate MX".
- **Beneficio concreto:** retention diaria masiva + addiction pattern + engagement orgánico.
- **Fase target:** FASE 20 (Portal Comprador) + FASE 21 (Portal Público)
- **Dependencia data:** L4 Watchlist + D21 webhooks score changes + L29 trending zones
- **Inspiración:** X/Twitter timeline, Bluesky, Threads

### L45 — Residente-Verified Reviews (Threads verified pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** SOLO residentes verificados (factura luz, contrato renta, escritura) pueden dejar reviews con fotos/videos/voice notes.
- **Para qué sirve:** Google Reviews lleno fakes. Threads limitó verified. DMX para zonas.
- **Beneficio concreto:** data moat brutal + trust factor + accountability + SEO autoridad.
- **Fase target:** FASE 20 + FASE 21 (Portal Público ficha zona) + ADR-025
- **Dependencia data:** verification pipeline (OCR facturas + contratos) + UGC moderation
- **Inspiración:** Threads verified, Nextdoor neighbors verified, LinkedIn verified

### L46 — DMX Spaces audio rooms (X Spaces pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** rooms audio en vivo sobre temas específicos ("¿Comprar Narvarte vs Del Valle?") con expertos + residentes. Grabación auto + transcripción AI + searchable.
- **Para qué sirve:** X Spaces reactivó conversaciones de calidad. DMX democratiza consejo inmobiliario.
- **Beneficio concreto:** community moat + content UGC + sponsor opportunities (devs pagan).
- **Fase target:** FASE 22 (Marketing/Comms + UGC engine)
- **Dependencia data:** infra audio streaming (WebRTC o LiveKit o Daily.co) + transcripción Claude/Whisper
- **Inspiración:** X Spaces, Clubhouse, Discord Stage channels

### L47 — Community Notes para Desarrolladores (X Community Notes pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** developers hacen claims en marketing → comunidad verificada agrega notas correctivas → top voted aparecen públicamente.
- **Para qué sirve:** X transparencia crowd-sourced destruyó misinformation. DMX destruye marketing inflado developers.
- **Beneficio concreto:** accountability + brand moral + trust diferencial BRUTAL vs portales.
- **Fase target:** FASE 21 (Portal Público ficha proyecto) + ADR-025
- **Dependencia data:** sistema verificación users (L45) + voting mechanism + moderation
- **Inspiración:** X Community Notes, Wikipedia citations, Stack Overflow community moderation

### L48 — Trending Topics Real Estate extended (X Trending + L29)
- **Status:** 🟡 approved — merged con L29
- **Qué es:** extensión L29 con hashtags + events + news trending + API pública para press.
- **Fase target:** FASE 21 (extensión ruta `/trending`)

### L49 — Influencer Map Real Estate MX (Brandwatch influencer ID)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** identificar top voices real estate MX social (brokers, content creators, journalists, inversores) con métrica "influence score" por zona.
- **Para qué sirve:** Brandwatch cobra premium. DMX para real estate.
- **Beneficio concreto:** producto B2B premium (agencias marketing, devs sponsorship).
- **Fase target:** FASE 19 (Admin analytics) + FASE 23 (Monetización B2B)
- **Dependencia data:** L43 Social Radar pipeline + graph analytics
- **Inspiración:** Brandwatch Influencer Marketing, Traackr, Klear, HypeAuditor

### L50 — Crisis Alerting Zones (Brandwatch crisis mode)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** detección automática eventos disruptivos combinando news + social + police reports + SACMEX outages. Alerta: "Roma Norte mención 300% 24h + sentiment -50pts → CRISIS POSIBLE".
- **Para qué sirve:** Brandwatch crisis dashboards salvan brands. DMX salva decisiones compra/inversión tiempo real.
- **Beneficio concreto:** "DMX te alertó 48h antes" + retention + B2B (aseguradoras).
- **Fase target:** FASE 19 (Admin Market Observatory) + FASE 24 (Observabilidad SRE)
- **Dependencia data:** L43 Social Radar + U11 anomaly detection (FASE 08) + L4 watchlist push
- **Inspiración:** Brandwatch Crisis Management, Dataminr, CrisisHub

### L51 — Voice Notes Residentes (Threads voice notes pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** residentes graban audio 30-60s "¿Cómo es vivir aquí?". Transcripción AI + sentiment + keywords + audio embebido ficha zona.
- **Para qué sirve:** Threads popularizó voice authentic. Más emocional que texto.
- **Beneficio concreto:** authentic content + diferencial vs scrapers Google Reviews + SEO long-tail.
- **Fase target:** FASE 20 (Portal Comprador UGC) + FASE 21 (Portal Público ficha zona)
- **Dependencia data:** L45 verificación residentes + audio storage + Whisper/Claude transcripción
- **Inspiración:** Threads voice notes, WhatsApp voice messages, SoundCloud

### L52 — "For You" Personalized Feed (TikTok/Threads algorithmic pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, FASE 10 social intelligence session)
- **Qué es:** algoritmo personalizado mostrando zonas + oportunidades + news + score changes según behavioral signals (PPD). Infinite scroll vertical mobile.
- **Para qué sirve:** TikTok/Threads dominan attention con algos personalizados.
- **Beneficio concreto:** retention killer + addiction pattern + nuevo paradigma discovery inmobiliario.
- **Fase target:** FASE 20 (Portal Comprador mobile-first)
- **Dependencia data:** PPD Capa 3 inference engine + embedding vectors + recommendation algo
- **Inspiración:** TikTok For You, Threads For You, Instagram Reels algo, Twitter For You

### L53 — DMX Project Intelligence Pipeline (Product Hunt + Brandwatch pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, project intelligence session) — scope free-tier
- **Qué es:** pipeline monitoreo curated cuentas oficiales developers/brokers MX en redes sociales para detectar nuevos proyectos/lanzamientos ANTES que lleguen a portales.
- **Para qué sirve:** 3-6 meses signal temprano vs Inmuebles24. Data sistemática de lanzamientos que nadie más captura.
- **Beneficio concreto:** early access alerts B2C + competitive intel B2B + alimenta B15 Launch Timing + market launch reports trimestrales.
- **Fase target:** FASE 26 (nueva — DMX Social + Listing Intelligence Platform) — ver ADR-025
- **Dependencia data:** Apify actors curated / Puppeteer self-hosted + Claude Haiku NLP + lista curada ~50 cuentas top MX + Reddit API + YouTube API
- **Arquitectura free-tier:** GitHub Actions cron + Claude API micro + Supabase incluido = $5-15 USD/mes total
- **Inspiración:** Product Hunt (discovery signals) + Brandwatch (social listening) + Pitchbook (deal intelligence)

### L54 — Developer Claim Cross-Check (accountability pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, project intelligence session)
- **Qué es:** cada claim developer en marketing (IG, LinkedIn, website) se compara con histórico DMX: "Dev X dice 'entrega Q4 2026' — históricamente retrasa 4m → probable Q1 2027".
- **Para qué sirve:** accountability brutal. Datos vs marketing inflado.
- **Beneficio concreto:** trust factor para compradores + presión mejora developers + diferencial brand.
- **Fase target:** FASE 21 (Portal Público ficha proyecto) + L47 Community Notes integration
- **Dependencia data:** L53 Project Intelligence + operaciones históricas DMX + H05 Trust Score
- **Inspiración:** Politifact fact-checking, Ground News bias meter, Retraction Watch

### L55 — Broker Performance Leaderboard (gamification + transparency)
- **Status:** 🟡 approved (founder OK 2026-04-20, project intelligence session)
- **Qué es:** basado en posts + listings + cierres, ranking público top brokers MX por zona/tipo.
- **Para qué sirve:** transparencia compradores + presión positiva brokers + feature retention brokers (quieren subir en ranking).
- **Beneficio concreto:** engagement brokers + trust compradores + discovery tool + feature gated premium opcional.
- **Fase target:** FASE 19 (Admin analytics) + FASE 21 (Portal Público directorio brokers)
- **Dependencia data:** L53 posts brokers + operaciones cerradas DMX + reviews + response time métricas
- **Inspiración:** LinkedIn SSI, Strava leaderboards, GitHub contribution graph, Upwork top rated

### L56 — Zone Signal Dashboard / DMX Terminal (Bloomberg Terminal pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, project intelligence session) — cruza con L12 DMX Pro Terminal
- **Qué es:** dashboard real-time unificado: social mentions + news + score changes + listings + transacciones + anomalías + financial context (macro).
- **Para qué sirve:** Bloomberg Terminal creó categoría "financial intelligence platform". DMX para real estate.
- **Beneficio concreto:** producto B2B premium ARR alto + posicionamiento "Bloomberg del real estate MX".
- **Fase target:** FASE 23 (Monetización) — consolidado con L12 DMX Pro Terminal
- **Dependencia data:** L43 Social Radar + L53 Project Intelligence + todos los scores IE + macro_series
- **Inspiración:** Bloomberg Terminal, Refinitiv Eikon, Capital IQ, FactSet

### L57 — WhatsApp/Email Integration Monitoring for Brokers
- **Status:** 🟡 approved (founder OK 2026-04-20, project intelligence session) — scope free-tier
- **Qué es:** brokers forwardean listings/oportunidades a DMX bot (WhatsApp Business + email inbound). Bot auto-extract + enrich + guarda. Ellos ganan organización, DMX gana data.
- **Para qué sirve:** captura listings de corretaje exclusivos que NO llegan a portales.
- **Beneficio concreto:** data única + acquisition channel brokers + alimenta B07 Competitive Intel.
- **Fase target:** FASE 26 (DMX Listing Intelligence Platform)
- **Dependencia data:** WhatsApp Business API provider (Twilio/Gupshup/360Dialog) + email inbound parsing (SendGrid/Mailgun) + Claude NLP + Vision
- **Arquitectura free-tier:** WhatsApp Business tier 1000 conversaciones/mes gratis + email procesamiento self-hosted
- **Inspiración:** Superhuman email AI, Notion Mail, Intercom inbound

### L58 — DMX Listing Intelligence Layer (unified pipeline)
- **Status:** 🟡 approved (founder OK 2026-04-20, project intelligence session) — scope free-tier MVP
- **Qué es:** pipeline unificado que integra WhatsApp groups + Chrome extension expandida + páginas inmobiliarias MX (Re/Max, Century 21, Coldwell, Engel & Völkers, Houm, La Haus, Lamudi, Casas y Terrenos) + social listening L53 + opendata (RUV, Catastro) en tabla `external_listings` para analytics internos (NO expose público).
- **Para qué sirve:** agregar data que nadie más usa sistemáticamente. Alimenta scores agregados + competitive intel B2B.
- **Beneficio concreto:** **data más completa que cualquier portal MX** + listings de corretaje exclusivos 3-6 meses antes que portales + market benchmarks precios preventa reales.
- **Fase target:** FASE 26 (DMX Social + Listing Intelligence Platform) — hub consolidador
- **Dependencia data:** Chrome extension (FASE 07 GC-27) expandida + WhatsApp export pipeline + Puppeteer self-hosted GH Actions + partnerships inmobiliarias medianas
- **Arquitectura free-tier:** $5-15 USD/mes (solo Claude API usage para NLP) — detalles en ADR-025
- **NO expose público** — alimenta scores agregados + analytics interno + reports B2B solo
- **Respeta ADR-012** — NO scraping server-side Habi/Inmuebles24/ML; user-side Chrome ext + partnerships + opendata
- **Inmobiliarias reales MX verificadas:** RE/MAX, Century 21, Coldwell Banker, Engel & Völkers, Houm (digital MX-native), La Haus (regional), Lamudi (portal 1.2M visits/mes), Casas y Terrenos (GDL-based) — correcciones sobre menciones previas incorrectas (Allegra/Hawah no existen como major players)
- **Inspiración arquitectura:** Similar a Plaid (unified data layer) + Bright Data (multi-source scraping) + Brandwatch (social listening)
- **Cross-ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-025_SOCIAL_LISTING_INTELLIGENCE.md` (nuevo) + `docs/02_PLAN_MAESTRO/FASE_26_LISTING_INTELLIGENCE_PLATFORM.md` (nuevo stub)

---

## Histórico (ejecutados)

_Vacío hasta primer lateral entregado._

---

## Convenciones

- Cada lateral nuevo se registra aquí Y en su FASE target con sección `## Laterals pipeline` al final del archivo.
- Cuando founder aprueba lateral nuevo durante ejecución de fase, anotarlo aquí ANTES de continuar.
- Al cerrar una FASE, revisar laterals pipeline → ¿alguno aplicaba? Sí → status update.
- Categorías de inspiración válidas: empresas que crearon nuevas categorías (no copies de competidores directos).

---

**Autor:** PM Sr Dev (sesión BLOQUE 8.C lateral upgrades) | **Fecha inicio:** 2026-04-19
