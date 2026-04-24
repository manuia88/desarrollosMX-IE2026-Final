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

### L59 — WhatsApp-Native IE Copilot (Metric ValueChat upgrade)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** extender Copilot ⌘J DMX accesible directo via WhatsApp Business Bot con acceso al IE completo (no solo valuación como Metric ValueChat).
- **Para qué sirve:** WhatsApp es canal #1 MX real estate (brokers + compradores). ValueChat de Metric solo hace valuación; DMX expone 118 scores + AVM + recomendaciones conversacionales.
- **Beneficio concreto:** acceso masivo audiencia sin friction app/registro + diferencial vs Metric (50x más features por mismo canal).
- **Fase target:** FASE 22 (Marketing+Comms + WhatsApp Business)
- **Dependencia data:** Copilot ⌘J (FASE 03) + Claude API + WhatsApp Business API provider
- **Inspiración:** Metric ValueChat (solo valuación) → DMX upgrade (IE completo)
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_22_MARKETING_COMMS.md`

### L60 — LandAnalyzer Wizard standalone (Brandata vocación predio upgrade)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** empaquetar B06 Project Genesis + H13 Site Selection + AVM + scores zona + Monte Carlo en wizard UI "Tengo terreno → qué construir".
- **Para qué sirve:** Brandata cobra consulting manual por vocación predio. DMX automatiza con data + IA.
- **Beneficio concreto:** producto B2B standalone vendible $5K-15K/análisis. Diferencial: automated + IE scores vs Brandata manual research.
- **Fase target:** FASE 23 (Monetización — producto B2B developer tier)
- **Dependencia data:** B06 + H13 (FASE 10) + AVM I01 + scores zona + Monte Carlo econometría
- **Inspiración:** Brandata estudio vocación predio (consultoría humana) → DMX automatizado
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_23_MONETIZACION.md`

### L61 — Property Features CV Extraction (Phiqus visión artificial upgrade)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** Claude Vision sobre fotos listings propiedad → extract amenities + condition + calidad terminaciones automáticamente.
- **Para qué sirve:** alimenta AVM accuracy + data enrichment sin labor manual. Phiqus tiene CV genérico, DMX aplica específico real estate.
- **Beneficio concreto:** mejora AVM accuracy 15-25% + data sobre calidad única vs portales sin CV.
- **Fase target:** FASE 17 (Document Intelligence Pipeline)
- **Dependencia data:** Claude Vision API + fotos listings (Chrome ext + admin upload) + AVM I01 integration
- **Inspiración:** Phiqus visión artificial retail → DMX visión artificial real estate
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_17_DOCUMENT_INTEL.md`

### L62 — Zone Environmental Report PDF (Datlas LAUR.AI upgrade)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** PDF auto-generado con 50+ variables en 1/3/5km radius combinando scores DMX (F08 LQI + F12 Risk Map + H07 Environmental + N07 Water Security + más).
- **Para qué sirve:** Datlas cobra por LAUR.AI reports. DMX produce report más rico con 118 scores vs Datlas 50 variables planos.
- **Beneficio concreto:** producto B2C/B2B $50-200/reporte + diferencial "DMX Environmental Report" con IE jerárquico.
- **Fase target:** FASE 21 (Portal Público — generar PDF on-demand) + FASE 23 (pricing B2B)
- **Dependencia data:** scores F08/F12/H07/N07/N05/etc + React-PDF template + admin branding options
- **Inspiración:** Datlas LAUR.AI Environmental Reports
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md`

### L63 — ExpansionEngine Multi-Location B2B (Datlas DOR.AI upgrade)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** multi-location analysis producto para retailers/franquicias (Oxxo, 7-Eleven, bancos, restaurantes) usando N02 Employment + H13 Site Selection + Placer-like foot traffic.
- **Para qué sirve:** Datlas DOR.AI vende a retailers. DMX enfoque residencial pero puede expandir vertical retail/franchise.
- **Beneficio concreto:** nuevo vertical B2B high-ticket (franchises pagan $10K-50K/análisis + SaaS recurring).
- **Fase target:** FASE 23 (Monetización — producto B2B franchise/retail tier)
- **Dependencia data:** N02 (FASE 08) + H13 (FASE 10) + foot traffic data (Placer-like futuro o CV street view)
- **Inspiración:** Datlas DOR.AI + Placer.ai site selection
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_23_MONETIZACION.md`

### L64 — DMX Commercial Tier (industrial + oficinas + retail) — Datoz/Tinsa pattern
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session) — H2
- **Qué es:** expandir DMX de residencial-only a commercial real estate (industrial/oficinas/retail) — match Datoz cobertura (44 mercados) y Tinsa all-asset-types.
- **Para qué sirve:** Datoz FIBRAs + fondos (Barclays, Prologis, Waltons, Macquarie, Vesta) son clientes high-ticket. Tinsa 25 años cobertura full. DMX residencial-first pero expandable.
- **Beneficio concreto:** abrir canal ventas institucional (tickets $50K-500K/año) + posicionamiento LATAM-native vs Datoz/Tinsa.
- **Fase target:** H2 post consolidación residencial (FASE 27+ nueva o extender FASE 26)
- **Dependencia data:** scores adaptados comercial + ingesta data FIBRAs (mercados industriales/oficinas/retail) + partnerships
- **Inspiración:** Datoz (44 mercados comerciales MX) + Tinsa (all asset types) + CoStar (commercial global líder)
- **Cross-ref:** ADR nuevo H2 "DMX Commercial Vertical"

### L65 — Pricing público transparente tiered (DatAlpine pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** publicar pricing tiers en landing DMX como DatAlpine ($899-$1,199 USD/mes + Free tier + Enterprise $395K-$750K MXN/año).
- **Para qué sirve:** elimina fricción lead gen vs "request demo" opaco (Datoz/Tinsa/Brandata/Phiqus todos opacos). DatAlpine demuestra que funciona.
- **Beneficio concreto:** conversion rate 3-5x mayor + sales cycle shorter + self-serve tier viable.
- **Fase target:** FASE 23 (Monetización — estrategia pricing completa)
- **Dependencia data:** decisión founder tiers + landing pricing page + Stripe Checkout integration
- **Inspiración:** DatAlpine Panorama/Horizon/Vision + ATTOM 30-day free trial + Apify $5 free credits
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_23_MONETIZACION.md`

### L66 — Gender-disaggregated Credit Analytics (DatAlpine + ESG lens)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** análisis créditos otorgados disaggregated por género (Infonavit + CNBV data ya ingestada FASE 07).
- **Para qué sirve:** DatAlpine lo tiene como feature. Diferencial ESG + inclusion analytics.
- **Beneficio concreto:** alimenta DMX-IDS Desarrollo Social (FASE 11) + producto B2B para bancos ESG-focused + impact investors.
- **Fase target:** FASE 11 (DMX-IDS Índice Desarrollo Social)
- **Dependencia data:** H04 Credit Demand + H11 Infonavit (FASE 08) + INEGI Census gender breakdown
- **Inspiración:** DatAlpine gender credits + MSCI ESG
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md`

### L67 — Time on Market público FREE tier (DatAlpine Panorama hook)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** exponer subset B08 Absorption Forecast en ruta pública `/zona/[slug]/market` sin auth — hook SEO/growth.
- **Para qué sirve:** DatAlpine Panorama FREE tier valida que "Time on Market" es killer hook. DMX tiene data (B08 FASE 09).
- **Beneficio concreto:** tráfico SEO orgánico + lead gen + hook de conversión a tier Pro.
- **Fase target:** FASE 21 (Portal Público — nuevas rutas market)
- **Dependencia data:** B08 Absorption Forecast (FASE 09) ya implementado
- **Inspiración:** DatAlpine Panorama FREE
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md`

### L68 — Projected Credits forward-looking 12-24 meses (DatAlpine Horizon upgrade)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** proyección créditos hipotecarios forward 12-24 meses por zona combinando macro Banxico + pipeline demanda + inventory.
- **Para qué sirve:** DatAlpine tiene Projected Credits. DMX tiene H04 Credit Demand actual, upgrade a forward.
- **Beneficio concreto:** producto B2B para bancos/Infonavit + scoring oportunidades + alimenta H04 next gen.
- **Fase target:** FASE 10 extensión H04 (agregar forecasting) o FASE 18 (Legal+Pagos) como producto
- **Dependencia data:** H04 (FASE 08) + macro_series + time series regression
- **Inspiración:** DatAlpine Horizon "Projected Credits Distributed (Amount/Value)"
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md` extensión + `FASE_18_LEGAL_PAGOS_ESCROW.md`

### L69 — Demand+Salary+Professions profiling per zona (DatAlpine + Phiqus)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session) — candidato integrar a FASE 10
- **Qué es:** nuevo score N13 "Zone Demographics Profile" usando INEGI Census + ENIGH (ingestada FASE 07): quién vive aquí (profesiones/edades/géneros/salarios) + match con H14 Buyer Persona.
- **Para qué sirve:** DatAlpine Horizon tiene "Demand & Salary + Professions & Trades". DMX tiene data INEGI pero no profiling activado.
- **Beneficio concreto:** enriquece H14 Buyer Persona match + producto B2B marketing geotargeted + ESG insights.
- **Fase target:** FASE 10 extensión H14 (N3) + FASE 23 (producto B2B marketing tier)
- **Dependencia data:** INEGI Census + ENIGH (FASE 07 ingestado) + H14 Buyer Persona (FASE 09)
- **Inspiración:** DatAlpine Demand+Salary+Professions + Phiqus segmentación audiencia
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md` H14 upgrade

### L70 — Space Optimization layout producto (DatAlpine Vision tier)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** recomendaciones uso espacios internos proyectos nuevos (qué mix unidades, qué amenidades premium según zona + buyer persona).
- **Para qué sirve:** DatAlpine Vision tier incluye Space Optimization. DMX tiene B10 Unit Revenue + B13 Amenity ROI (FASE 10) como backend.
- **Beneficio concreto:** producto B2B developer tier Vision-equivalent. Recomendaciones accionables layout vs DatAlpine estático.
- **Fase target:** FASE 10 extensión B10/B13 + FASE 23 (producto B2B developer tier)
- **Dependencia data:** B10 Unit Revenue + B13 Amenity ROI (FASE 10) + H14 Buyer Persona
- **Inspiración:** DatAlpine Vision Space Optimization
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md` B10+B13 extension

### L71 — Customizable Branded PDF Reports (DatAlpine + Tinsa pattern)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session)
- **Qué es:** generador PDFs auto-gen con logo cliente para presentar — Financial Feasibility + Market Analysis + Risk Assessment branded.
- **Para qué sirve:** DatAlpine Premium Services ofrece "Customizable Reports for Effective Presentations". Tinsa Pulso Inmobiliario es report equivalente.
- **Beneficio concreto:** producto value-add B2B (devs, brokers presentan a inversores) + complementa L62 + L32 Zone Certified.
- **Fase target:** FASE 23 (Monetización — feature addon todos los tiers B2B)
- **Dependencia data:** scores + methodology + React-PDF o Puppeteer PDF gen + admin branding config
- **Inspiración:** DatAlpine Premium Reports + Tinsa Pulso Inmobiliario
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_23_MONETIZACION.md`

### L72 — Heat maps by colonies standalone producto (DatAlpine + Trulia)
- **Status:** 🟡 approved (founder OK 2026-04-20, research competitivo MX session) — cruza L14 DMX Living Map
- **Qué es:** visualización standalone de heat maps por dimensión (precio/m², demand, momentum, safety, etc) — ya planeado en L14 pero enfocar como feature core + posible producto separado.
- **Para qué sirve:** DatAlpine incluye "Heat maps by colonies highlighting key areas" como feature clave. Trulia Crime Map fue killer feature $3.5B acquisition.
- **Beneficio concreto:** feature visual core FASE 12 + posible tier público FREE (growth hook SEO) + complementa L29 Trending + L14 Living Map.
- **Fase target:** FASE 12 (Mapa 7 Capas) integración con L14 DMX Living Map
- **Dependencia data:** scores por zona + Mapbox heatmap layers + UI toggle dimensiones
- **Inspiración:** DatAlpine Heat maps + Trulia Crime Map (adquirido Zillow $3.5B)
- **Cross-ref:** `docs/02_PLAN_MAESTRO/FASE_12_IE_AI_SCORES_N5.md` (ya L14/L15 anotados)

---

## Cross-Functions LOCALES MX (CF-L1 a CF-L8)

Combinaciones de features de las 6 empresas MX (Metric, Brandata, DatAlpine, Phiqus, Datoz, Tinsa) con capacidades DMX existentes — generan productos únicos que ninguna empresa MX tiene en solitario.

### CF-L1 — "DMX Pulso Inmobiliario" trimestral
- **Qué es:** reporte trimestral PDF branded que combina N11 DMX Momentum + DMX-IPV + DMX-LIV + N03 Gentrification Velocity en publicación periódica — **match Tinsa Pulso Inmobiliario pero automated + live data**.
- **Inputs DMX:** N11 + DMX-IPV + DMX-LIV + N03 + PDF generator + dist newsletter.
- **Diferencial:** Tinsa es consultoría manual lenta, DMX es auto-gen desde data live.
- **Fase target:** FASE 11 (Índices DMX) + FASE 22 (distribución newsletter)

### CF-L2 — "WhatsApp IE Copilot completo"
- **Qué es:** TODO el IE conversacional via WhatsApp (no solo valuación como Metric ValueChat).
- **Inputs DMX:** Copilot ⌘J (FASE 03) + 118 scores + AVM + WhatsApp Business API.
- **Diferencial:** Metric solo valuación; DMX 50x más features mismo canal.
- **Fase target:** FASE 22 (Marketing+Comms).

### CF-L3 — "LandAnalyzer Enterprise"
- **Qué es:** "tengo terreno → qué construir" con scores IE + Monte Carlo scenarios + AVM — match Brandata vocación predio + DatAlpine econometría combined.
- **Inputs DMX:** B06 Project Genesis + H13 Site Selection + AVM I01 + Monte Carlo.
- **Diferencial:** Brandata research manual + DatAlpine econometría separados; DMX unifica ambas.
- **Fase target:** FASE 23 (Monetización — producto B2B developer).

### CF-L4 — "Property Explorer vector-based"
- **Qué es:** 8 propiedades similares usando pgvector embeddings semánticos (más sofisticado que DatAlpine algoritmo básico).
- **Inputs DMX:** pgvector (FASE 01) + embeddings de propiedades + distance search.
- **Diferencial:** DatAlpine usa similarity por features numéricos; DMX usa semantic embeddings.
- **Fase target:** FASE 10 extension + FASE 20 (Portal Comprador).

### CF-L5 — "Zone Demographics Profile N13"
- **Qué es:** nuevo score N13 usando INEGI Census + ENIGH profiling (DatAlpine Demand+Salary+Phiqus segmentación combined).
- **Inputs DMX:** INEGI (FASE 07) + H14 Buyer Persona (FASE 09) + PPD behavioral.
- **Diferencial:** DatAlpine profiling estático; DMX profiling + PPD behavioral + 118 scores context.
- **Fase target:** FASE 10 (candidato inclusión scope N3/N4).

### CF-L6 — "Financial Feasibility Pro"
- **Qué es:** producto B2B dev grande: viabilidad financiera + scenarios + AVM + cost tracker (DatAlpine Financial + Phiqus simulator + DMX B02/B09/B12).
- **Inputs DMX:** B02 Margin Pressure + B09 Cash Flow + B12 Cost Tracker + AVM.
- **Diferencial:** DMX B12 usa INEGI INPP real live vs DatAlpine static.
- **Fase target:** FASE 23 (producto B2B developer tier).

### CF-L7 — "DMX Enterprise Dashboard"
- **Qué es:** dashboard B2B unificado clientes institucionales (FIBRAs, fondos, devs grandes) — match Alpine Dashboard + Datoz Analytics 2.0.
- **Inputs DMX:** 118 scores + cascadas tiempo real + L20 Data Quality + L56 Zone Signal Dashboard.
- **Diferencial:** Alpine/Datoz estáticos; DMX real-time con cascadas.
- **Fase target:** FASE 19 (Portal Admin Market Observatory) + FASE 23 (tier Enterprise).

### CF-L8 — "DMX Comprehensive Appraisal"
- **Qué es:** AVM multi-metodología (hedonic + comparable + income-based) con 118 scores como inputs adicionales — match Tinsa Stima EAA-endorsed.
- **Inputs DMX:** AVM I01 + hedonic model + 118 scores feature vector + pgvector similarity.
- **Diferencial:** Tinsa Stima es modelo clásico europeo; DMX combina ML + scores IE únicos.
- **Fase target:** FASE 12 (AVM H2 gradient boosting) — pursue EAA o equivalente MX certification H2.

---

## Cross-Functions GLOBALES (CF-G1 a CF-G8)

Combinaciones con benchmarks globales (CoStar + Big 4 brokers) y features DMX — documentan cómo DMX puede competir/superar con lo que tenemos.

### CF-G1 — "DMX Mexico Deep Data" (vs CoStar geographic moat)
- **Qué es:** foco MX deep data + scores IE únicos posicionamiento LATAM-native — CoStar no tiene presencia MX fuerte.
- **Inputs DMX:** FASE 07 ingesta 50+ fuentes MX + L58 Listing Intelligence + marketplace propio.
- **Diferencial:** CoStar cobertura US/Europa; DMX moat geográfico MX + expansion LATAM.
- **Fase target:** continuo (FASE 07 ingesta + FASE 26 L58).

### CF-G2 — "DMX Marketplace IE-embedded" (vs LoopNet)
- **Qué es:** DMX marketplace propio donde cada listing trae contexto IE completo (scores + deltas + ranking + comparables).
- **Inputs DMX:** marketplace core + 118 scores + cascades + UI IntelligenceCard.
- **Diferencial:** LoopNet marketplace sin IE; DMX marketplace + IE embedded.
- **Fase target:** FASE 20 (Portal Comprador) + FASE 21 (Portal Público /explorar).

### CF-G3 — "DMX Digital Twin 3D" (vs CoStar 3D)
- **Qué es:** upgrade Mapbox 7 capas a 3D digital twin zones con score overlays — L2 pipeline.
- **Inputs DMX:** Mapbox (FASE 12) + 3D layer (Mapbox 3D o Cesium) + scores overlays.
- **Diferencial:** CoStar tiene 3D limitado a property level; DMX 3D con heatmaps IE overlaid.
- **Fase target:** H2 extensión FASE 12.

### CF-G4 — "DMX Quarterly Market Intelligence" (vs CBRE/JLL research manual)
- **Qué es:** reporte trimestral LATAM competing con CBRE/JLL reports pero automated + regional focus.
- **Inputs DMX:** 118 scores + índices DMX + L34 Newsletter + PDF generator.
- **Diferencial:** CBRE/JLL reports consultoría manual cara; DMX auto-gen con IE data.
- **Fase target:** FASE 22 (Marketing+Comms) + FASE 23 (producto B2B research subscription).

### CF-G5 — "DMX AI Consulting-as-a-Service" (vs Big 4 consulting)
- **Qué es:** Agentic AI consulting automatizado competing con Big 4 (CBRE/JLL/Colliers/Newmark) consulting tradicional.
- **Inputs DMX:** Copilot Deep Analysis L35 + Cherre-style Agent.STUDIO + DMX API.
- **Diferencial:** Big 4 consulting humano $$$; DMX AI consulting $$ scalable.
- **Fase target:** H2 producto estrella "DMX Consulting AI" post consolidación core.

### CF-G6 — "DMX Conversational Discovery" (vs Zillow AI Mode MX)
- **Qué es:** descubrimiento propiedades conversacional + PPD behavioral inference — Zillow tiene en US, nadie en MX.
- **Inputs DMX:** Copilot ⌘J + PPD Capa 3 + matching engine.
- **Diferencial:** Zillow AI Mode US; DMX primer AI Mode MX con PPD personalization.
- **Fase target:** FASE 20 (Portal Comprador — ya planeado Copilot).

### CF-G7 — "DMX Broker Aggregator MX" (vs CompStak global)
- **Qué es:** crowdsourced broker data network MX match CompStak modelo pero WhatsApp-native.
- **Inputs DMX:** L57 WhatsApp Integration + L58 Listing Intelligence + broker incentives.
- **Diferencial:** CompStak US only; DMX primer crowdsourced broker network MX.
- **Fase target:** FASE 26 (Listing Intelligence Platform).

### CF-G8 — "DMX Collaborative RE Decisions" (vs Newmark tech collaborative)
- **Qué es:** multiplayer colaboración compra real estate + Copilot + PPD dual — Newmark tiene approach B2B, DMX consumer + pro.
- **Inputs DMX:** L31 Multiplayer Analysis + Copilot + PPD + Family Accounts.
- **Diferencial:** Newmark B2B tech; DMX consumer + pro unificados.
- **Fase target:** FASE 20 (Portal Comprador Family Accounts).

---

## Convenciones

- Cada lateral nuevo se registra aquí Y en su FASE target con sección `## Laterals pipeline` al final del archivo.
- Cuando founder aprueba lateral nuevo durante ejecución de fase, anotarlo aquí ANTES de continuar.
- Al cerrar una FASE, revisar laterals pipeline → ¿alguno aplicaba? Sí → status update.
- Categorías de inspiración válidas: empresas que crearon nuevas categorías (no copies de competidores directos).
- Cross-functions (CF-L/CF-G) son combinaciones derivadas de análisis competitivo — empaquetan features existentes en productos cohesivos.

---

**Autor:** PM Sr Dev (sesión BLOQUE 8.C lateral upgrades) | **Fecha inicio:** 2026-04-19
**Última actualización:** 2026-04-20 — L59-L72 + CF-L1-8 + CF-G1-8 pos análisis competitivo MX+global (6 empresas MX + CoStar + Big 4)

---

## Append 2026-04-21 — Laterales FASE 11 XL

Post founder approval FASE 11 XL (7→15 índices + 10 moonshots core, ~90h), se agregan 10 laterales nuevos al pipeline. Entradas existentes (L1 Wrapped, L8 Top Movers, L22 Time Travel/Time Machine) se actualizan a status "implementando en FASE 11 XL".

### Status updates en entradas existentes

- **L1 — Zona Wrapped anual (Spotify Wrapped pattern)** → status cambia de 🟡 approved a 🔵 **in_progress** (FASE 11 XL BLOQUE 11.V Stickers + Shareables seed).
- **L8 — "Today's Top Movers" público (Robinhood market dashboard pattern)** → status cambia de 🟡 approved a 🔵 **in_progress** (FASE 11 XL BLOQUE 11.G Pulse Score daily).
- **L22 Time Travel / Time Machine** (si existe en pipeline previo) → status cambia a 🔵 **in_progress** (FASE 11 XL BLOQUE 11.O Time Machine API).

### L73 — Top Movers Daily público (Robinhood pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.G)
- **Qué es:** dashboard público daily con top 10 colonias que más subieron/bajaron en Pulse Score CDMX las últimas 24h.
- **Para qué sirve:** FOMO diario + press coverage recurring (periodistas pueden citar DMX daily) + SEO orgánico zonas.
- **Beneficio concreto:** tráfico orgánico recurrente + posicionamiento "Bloomberg del real estate MX" daily cadence.
- **Fase target:** FASE 11 XL BLOQUE 11.G (Pulse Score + Top Movers endpoint)
- **Industria origen:** Robinhood Top Movers + Yahoo Finance Trending
- **Dependencia data:** Pulse Score daily + delta tracking 24h

### L74 — DMX Wrapped viral extendido (Spotify Wrapped pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.V-11.X)
- **Qué es:** extensión de L1 — wrapped anual + shareables visuales + stickers descargables WhatsApp/IG compartibles con brand DMX.
- **Para qué sirve:** Spotify Wrapped convierte a usuario en evangelista. DMX Wrapped hace lo mismo con colonia residencial.
- **Beneficio concreto:** explosión de shares diciembre/enero + brand awareness organic sin ads.
- **Fase target:** FASE 11 XL BLOQUES 11.V (Stickers), 11.W (Wrapped generator), 11.X (shareables social)
- **Industria origen:** Spotify Wrapped 2016+
- **Dependencia data:** ≥12 meses score history (cumplido post-FASE 10) + stickers PNG generator

### L75 — Widget Embebible DMX Score (WalkScore pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.N)
- **Qué es:** script JS `<script src="dmx.mx/widget.js" data-zone="roma-norte">` que cualquier portal/blog/medio inserta. Muestra score DMX zona + link DMX + branded.
- **Para qué sirve:** WalkScore dominó US con este pattern. DMX puede ser "el WalkScore de LATAM" con alcance multi-dimensión (15 índices).
- **Beneficio concreto:** distribución viral vía terceros + SEO backlinks + monetización paid tier (remove watermark + custom branding) en FASE 23.
- **Fase target:** FASE 11 XL BLOQUE 11.N (widget + auth) + FASE 23 (monetización)
- **Industria origen:** WalkScore widget pattern (saturó US antes que Zillow adquirió)
- **Dependencia data:** `widget_embed_tokens` + Upstash rate limit + 15 índices operativos

### L76 — Alert Radar WhatsApp opt-in (Waze pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.W)
- **Qué es:** usuarios suscriben colonias que siguen + reciben WhatsApp notif cuando score cambia >10% o evento significativo (nueva ghost zone, top mover, alerta crisis).
- **Para qué sirve:** Waze convirtió a drivers en sensores + notificadores. DMX convierte a interesados en colonias en network activo alertas.
- **Beneficio concreto:** retention diaria + email/WA list valiosa monetizable B2B + engagement metric alto.
- **Fase target:** FASE 11 XL BLOQUE 11.W (subscriptions + Twilio WA)
- **Industria origen:** Waze alerts community-driven pattern
- **Dependencia data:** `whatsapp_alert_subscriptions` + Twilio WA + event stream from scores

### L77 — Stickers Descargables zona (Yelp pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.V)
- **Qué es:** generador stickers PNG/WebP compartibles "Mi colonia DMX Score: 92 — Roma Norte" con brand DMX. Users comparten en WhatsApp status + Instagram stories.
- **Para qué sirve:** Yelp stickers físicos en restaurantes fueron viral pre-redes. DMX digitales en stories = viral growth marketing.
- **Beneficio concreto:** marketing orgánico gratis + brand awareness en circulos sociales + SEO menciones.
- **Fase target:** FASE 11 XL BLOQUE 11.V (sticker generator)
- **Industria origen:** Yelp stickers pattern
- **Dependencia data:** scores por zona + Puppeteer/Sharp PNG generator

### L78 — Press Kit Auto mensual (PR Newswire pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.K)
- **Qué es:** endpoint `/api/v1/press-kit/[period]` genera markdown + hero stats + top movers + quotes ready-to-publish para periodistas. Distribución mensual lista.
- **Para qué sirve:** PR Newswire facilitó distribución press releases. DMX lo automatiza con IA + data live = volume press coverage sin PR agency.
- **Beneficio concreto:** mentions prensa recurrentes + zero CAC press marketing + cita DMX como source autoritativa.
- **Fase target:** FASE 11 XL BLOQUE 11.K (press kit generator)
- **Industria origen:** PR Newswire distribution pattern
- **Dependencia data:** scores + deltas + Claude Haiku narrative generator

### L79 — Historical Forensics PDF educativo (True Crime podcast pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.Y)
- **Qué es:** PDFs narrativos case-study sobre ciclos pasados colonias ("Qué pasó en Cuauhtémoc 2015-2020: del auge al ghost"). Formato True Crime podcast pero educativo real estate.
- **Para qué sirve:** True Crime podcasts son #1 categoria streaming. Formato aplicado a real estate education = contenido viral + moat autoridad.
- **Beneficio concreto:** SEO orgánico long-form + brand autoridad educativa + potencial docuserie H2.
- **Fase target:** FASE 11 XL BLOQUE 11.Y (3-5 case studies seed) + H2 docuserie
- **Industria origen:** True Crime podcast format (Serial, Crime Junkie)
- **Dependencia data:** `historical_forensics_cases` + Time Machine API + Claude Opus narrative generator

### L80 — Trend Genome B2B (alpha-seeking hedge fund pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUES 11.H-11.I)
- **Qué es:** producto B2B suscripción mensual $2-5K/mes para hedge funds + fondos inmobiliarios + developers boutique con señales pre-mediáticas colonias en explosión.
- **Para qué sirve:** hedge funds pagan miles por data alpha-seeking. Real estate LATAM tiene 0 equivalente. DMX primer pre-mediática radar vertical.
- **Beneficio concreto:** ARR alto ticket con churn bajo (una vez integrado en workflow fund = sticky) + moat pre-mediática data.
- **Fase target:** FASE 11 XL BLOQUES 11.H (Apify ingest) + 11.I (Trend Genome UI)
- **Industria origen:** alpha-seeking hedge fund data providers pattern (Quandl, YipitData)
- **Dependencia data:** `influencer_heat_zones` + ADR-027 Apify compliance + Instagram public data
- **Compliance:** ADR-027 — datos públicos agregados, no PII, base legal interés legítimo

### L81 — Scorecard Nacional autoritative (S&P + Banxico pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.J)
- **Qué es:** ranking trimestral público 15 índices DMX + PDF branded + metodología versionada (ADR-027). Se convierte en "S&P del real estate LATAM".
- **Para qué sirve:** S&P Ratings y Banxico reportes trimestrales son autoridad incuestionable. DMX puede posicionarse como autoridad sector real estate LATAM.
- **Beneficio concreto:** brand autoridad citable + moat referenciabilidad prensa + regulatorios + analistas.
- **Fase target:** FASE 11 XL BLOQUE 11.J (Scorecard generator + PDF public) + FASE 38 multi-país
- **Industria origen:** S&P Global Ratings + Banxico reportes quarterly
- **Dependencia data:** 15 índices + metodología versionada (ADR-027) + PDF generator branded

### L82 — Genoma Colonias búsqueda por vibe (Spotify Discover Weekly pattern)

- **Status:** 🔵 in_progress (founder approval 2026-04-21, FASE 11 XL BLOQUE 11.M — SEED)
- **Qué es:** búsqueda vectorial "Encuéntrame el Roma Norte de Bogotá/Buenos Aires/CDMX sur". Respuesta: top 5 colonias similares via pgvector cosine similarity (ADR-027).
- **Para qué sirve:** Spotify Discover Weekly cambió discovery music. DMX puede cambiar discovery real estate. Critical para compradores relocating + nómadas digitales.
- **Beneficio concreto:** diferenciador UX brutal vs filtros "precio/m² + recámaras" tradicionales + moat vector embeddings data acumulada.
- **Fase target:** FASE 11 XL BLOQUE 11.M (SEED CDMX) + FASE 20 (UI consumer) + FASE 38 (multi-país expansion)
- **Industria origen:** Spotify Discover Weekly embeddings pattern
- **Dependencia data:** pgvector 64-dim (ADR-027) + 15+ scores feature vector + vibe_tags (ADR-022)

### L83 — LTTB downsample series temporales >250 puntos (upgrade directo 11.D)

- **Status:** ✅ implemented (FASE 11 XL BLOQUE 11.D.6.3.5 — BacktestChart recharts)
- **Qué es:** algoritmo Largest Triangle Three Buckets para reducir puntos sin perder shape visual de la serie.
- **Para qué sirve:** performance smooth en gráficas largas (backtest 3-5 años histórico) sin degradar UX.
- **Beneficio concreto:** first paint <300ms vs renderizado raw >2s con 1200+ puntos.
- **Fase target:** IMPLEMENTED 11.D.6 (BacktestChart)
- **Industria origen:** Grafana + TradingView pattern (time-series visualization at scale)
- **Dependencia data:** data points jsonb con timestamp+value

### L84 — Hash-based URL sharing backtests (upgrade directo 11.D → 11.L)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.L — APIs REST + Widget + sharing)
- **Qué es:** URL con hash que captura filtros backtest (índice + topN + periodo + colonias) → share deep link compartible por WhatsApp/Twitter que regenera vista exacta.
- **Para qué sirve:** viralidad + reproducibilidad de análisis. "Compartir esta simulación" en 1 click.
- **Beneficio concreto:** UGC sharing + inbound SEO para /indices/backtest páginas generadas.
- **Fase target:** FASE 11 XL BLOQUE 11.L (APIs públicas + Widget + Time Machine sharing)
- **Industria origen:** TradingView + CodePen URL-as-state pattern
- **Dependencia data:** encoder hash compact + cache server-side (optional)

### L85 — DMX Portfolio Builder Morningstar X-Ray (lateral → FASE 20)

- **Status:** ⚪ backlog (diferido FASE 20 Portal Comprador)
- **Qué es:** combinar 3-4 colonias con allocation weights y backtestear como índice virtual (portfolio simulado). UX estilo Morningstar X-Ray.
- **Para qué sirve:** inversionistas boutique que quieren diversificar entre colonias pueden simular antes de comprar. "Si compro 40% Narvarte + 30% Roma Sur + 30% Portales, histórico 3y = 18.3% ROI."
- **Beneficio concreto:** producto diferenciador para inversor retail sofisticado + upsell Pro tier.
- **Fase target:** FASE 20 Portal Comprador (módulo inversor pro)
- **Industria origen:** Morningstar Portfolio X-Ray
- **Dependencia data:** time series 15 índices × colonias + backtest engine existente (11.D.4)

### L86 — DMX Methodology Lab diff visual v1→v2 (lateral → FASE 12)

- **Status:** ⚪ backlog (diferido FASE 12 N5 AI + framework prompt versioning)
- **Qué es:** visualización diff bars superpuestas entre pesos v1 vs v2 de cualquier índice DMX. "Methodology Lab" posiciona DMX como "S&P + GitHub Blame" — transparencia radical del cambio de modelo.
- **Para qué sirve:** bancos + aseguradoras + regulatorios quieren auditar cambios metodológicos. Diff visual reduce barrera a entender evolución.
- **Beneficio concreto:** trust institucional + moat transparencia (nadie más lo hace en real estate LATAM).
- **Fase target:** FASE 12 (framework prompt versioning + UI methodology compare)
- **Industria origen:** S&P Global Methodology pages + GitHub blame/diff
- **Dependencia data:** `dmx_indices_methodology_versions` (ya existe) + componente diff UI

### L87 — Columna cost_usd + tokens en causal_explanations (directo → 11.Z)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.Z verificación final — migration 1 línea)
- **Qué es:** agregar `cost_usd numeric(10,6)` + `tokens_in int` + `tokens_out int` a tabla `causal_explanations`. Reemplaza proxy row-count × $0.01 avg con tracking exacto.
- **Para qué sirve:** cost-guard preciso + dashboard de gasto LLM real + telemetría observabilidad.
- **Beneficio concreto:** control presupuesto AI H1 + telemetría limpia para FASE 12 framework completo.
- **Fase target:** FASE 11 XL BLOQUE 11.Z (migration pre-tag fase-11-complete)
- **Industria origen:** OpenAI usage dashboard + Anthropic console
- **Dependencia data:** causal-engine persist extender + migration allowlist

### L88 — Prompt v2 drivers estructurados (directo → FASE 12)

- **Status:** ⚪ backlog (diferido FASE 12 — framework AI prompt versioning + structured drivers)
- **Qué es:** prompt v2 Causal Engine forza modelo a devolver top-3 drivers como array separado además del markdown. Permite visualizaciones (sparkline por driver) sin parsing NL.
- **Para qué sirve:** UI puede mostrar bars/sparkline por driver en lugar de solo texto. Maximiza data-driven visualization vs prose.
- **Beneficio concreto:** UX más escaneable + analytics del driver más frecuente cross-colonias.
- **Fase target:** FASE 12 N5 AI framework + ai_prompt_versions table mature
- **Industria origen:** structured output LLM patterns (function calling / tool use)
- **Dependencia data:** ai_prompt_versions + Zod schema drivers array

### L89 — DMX Timeline Narrativo causal histórico (lateral → 11.I)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.I ampliado — Scorecard Nacional)
- **Qué es:** serie histórica de explicaciones causales por colonia leída como relato continuo. "Roma Norte subió IPV en marzo por movilidad → bajó en abril por seguridad → recuperó en mayo por nuevos cafés."
- **Para qué sirve:** convierte datos temporales en storytelling lineal citable por prensa + inversionistas. Nadie lo hace.
- **Beneficio concreto:** press-ready content + brand autoridad narrativa + SEO long-form.
- **Fase target:** FASE 11 XL BLOQUE 11.I (Scorecard Nacional — integrar narrative timeline)
- **Industria origen:** Bloomberg Businessweek narrative data journalism + Wikipedia timeline articles
- **Dependencia data:** causal_explanations acumulados 12m+ + causal-engine generator con timeline prompt

### L90 — Why-alerts push notificaciones causales (lateral → 11.T)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.T Alert Radar ampliado)
- **Qué es:** usuario sigue colonia X, recibe notificación push con explicación causal cada vez que índice cambia significativamente. "Narvarte DMX-IPV +4pts hoy — razón: 3 nuevos permisos construcción + metro línea 12 confirmado."
- **Para qué sirve:** convierte Causal Engine en canal de retención diario sin saturar (solo cambios significativos).
- **Beneficio concreto:** engagement D1/D7 altísimo + viralidad vía share de notifications + upsell Pro tier (causal detailed).
- **Fase target:** FASE 11 XL BLOQUE 11.T Alert Radar WhatsApp (ampliar scope: índice + causal + pulse)
- **Industria origen:** Robinhood Alerts (price change + reason) + Strava kudos push
- **Dependencia data:** Causal Engine (11.E) + Alert Radar infra (11.T) + push/WhatsApp channel

### L91 — Pulse Alertas anomalías >15pts delta (directo → 11.T)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.T Alert Radar multi-señal)
- **Qué es:** cuando Pulse Score cae >15pts mes-sobre-mes, notificación automática al usuario suscrito a esa zona.
- **Para qué sirve:** avisar cuando una zona "se enferma" antes de comprar o antes que vecinos se enteren. Early warning system.
- **Beneficio concreto:** dueños proactivos + vendedores pueden ajustar precio + compradores evitan timing malo.
- **Fase target:** FASE 11 XL BLOQUE 11.T Alert Radar (ampliar: índice + causal + pulse alertas)
- **Industria origen:** Fitbit/Apple Watch anomaly detection + seguros health proactive alerts
- **Dependencia data:** zone_pulse_scores histórico + Alert Radar infra (11.T)

### L92 — Pulse Comparador lado-a-lado 2 colonias (directo → 11.L)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.L Widget + Vital Signs)
- **Qué es:** mostrar Pulse Score de 2 colonias superpuestas en misma sparkline con colores distintos + leyenda. "Comparar Narvarte vs Roma Sur" en 1 vista.
- **Para qué sirve:** decisión informada entre opciones reemplaza "corazonada" con evidencia visual directa. Pattern Morningstar side-by-side.
- **Beneficio concreto:** reduce tiempo-a-decisión comprador + diferenciador vs portales que no tienen comparador nativo.
- **Fase target:** FASE 11 XL BLOQUE 11.L (Widget Vital Signs ampliado con modo comparador)
- **Industria origen:** Morningstar side-by-side fund compare + Kayak flights compare
- **Dependencia data:** zone_pulse_scores time series + Vital Signs component (11.F)

### L93 — Pulse Pronóstico 30 días forward (directo → 11.N)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.N Futures Curve ampliado)
- **Qué es:** mini-forecast del Pulse usando tendencia histórica + eventos próximos conocidos (permisos aprobados, metro inaugurándose, etc.). Pronóstico 30d con banda de confianza.
- **Para qué sirve:** anticipar hacia dónde va la zona los próximos 30 días — decisión de timing compra/venta.
- **Beneficio concreto:** convierte datos pasados en decisiones futuras accionables + diferenciador "tiempo real" vs competidores mensuales.
- **Fase target:** FASE 11 XL BLOQUE 11.N (Futures Curve extender a Pulse además de índices)
- **Industria origen:** yield curve forecast Bloomberg + weather 30d Accuweather
- **Dependencia data:** zone_pulse_scores 12m+ + futures_curve_projections infra (11.N)

### L94 — Strava Segments colonias streaks (lateral → 11.J)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.J DMX Wrapped ampliado)
- **Qué es:** "streaks" de zonas que llevan N meses con Pulse >80. Ranking social "las más vivas de CDMX este trimestre" — gamifica descubrimiento de barrios + crea comunidad.
- **Para qué sirve:** convertir datos fríos en competencia viral. Colonias quieren aparecer en top streaks. Vecinos comparten "mi zona lleva 6 meses top-5".
- **Beneficio concreto:** viralidad orgánica + SEO + inbound consultation "¿por qué mi colonia bajó de top?"
- **Fase target:** FASE 11 XL BLOQUE 11.J (DMX Wrapped annual + streaks mensuales)
- **Industria origen:** Strava Segments leaderboards + Duolingo streaks
- **Dependencia data:** zone_pulse_scores + dmx_indices histórico + tabla streaks computada mensual

### L95 — Zillow Zestimate "valor médico" press citeable (lateral → 11.I)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.I Scorecard Nacional ampliado)
- **Qué es:** el Pulse Score evolucionando como serie temporal pública citeable. Press releases, notarios, periodistas mencionan "el Pulse de Roma Norte subió a 87". Posiciona DMX como fuente autoritaria de "salud urbana".
- **Para qué sirve:** ocupar el espacio mental que Zestimate tiene para precio → DMX para "salud" de zona. Marca linguística y data oficial.
- **Beneficio concreto:** brand autoridad + menciones prensa orgánicas + moat marca "Pulse DMX" como sustantivo genérico eventual.
- **Fase target:** FASE 11 XL BLOQUE 11.I (Scorecard Nacional — Pulse Score como métrica hero oficial)
- **Industria origen:** Zillow Zestimate brand colonization + S&P Index ticker brand
- **Dependencia data:** zone_pulse_scores + Scorecard Nacional quarterly PDF branded

### L96 — Lookup centroides FlowMapbox (directo 11.G upgrade)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.G post-merge polish)
- **Qué es:** agregar query a `zona_snapshots.centroid` (o `zones.centroid`) en aggregator FlowMapbox → activa líneas curvas reales en el mapa en lugar de SVG fallback.
- **Para qué sirve:** UX mapa de flujos real vs grid ranked; base para visualización spectacular tipo deck.gl.
- **Beneficio concreto:** primera impresión del producto dramática — bowl de flows animados entre colonias.
- **Fase target:** FASE 11 XL BLOQUE 11.G (polish inmediato post-merge)
- **Industria origen:** Mapbox flow viz + deck.gl ArcLayer pattern
- **Dependencia data:** `zona_snapshots.centroid` o lookup geográfico en `zones` table

### L97 — Cache tags por period Migration Flow (directo 11.G performance)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.G performance tune)
- **Qué es:** implementar Vercel runtime-cache con tag `flows:${period}` → evita que cada visita haga query directo. Invalidar al correr aggregator mensual/trimestral.
- **Para qué sirve:** performance SEO + reducir load DB en rutas públicas `/indices/flujos` cuando tengamos tráfico real.
- **Beneficio concreto:** First Contentful Paint <200ms + ahorra queries a `zone_migration_flows` (~90% cache hit esperado).
- **Fase target:** FASE 11 XL BLOQUE 11.G performance o 11.Z polish final
- **Industria origen:** Next.js + Vercel runtime-cache tag-based invalidation
- **Dependencia data:** Vercel cache API + aggregator post-run invalidation hook

### L98 — Migration Wrapped anual (lateral → 11.J)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.J DMX Wrapped ampliado)
- **Qué es:** resumen anual personalizado por usuario estilo Spotify Wrapped: "Tu colonia recibió 5,234 nuevos vecinos del decil 7, top 3% CDMX este año". Shareable cards SEO-friendly.
- **Para qué sirve:** convierte data migration flows en contenido viral personalizado al cierre del año. Convierte DMX en ritual anual cultural.
- **Beneficio concreto:** viralidad orgánica masiva enero (comparable a Spotify Wrapped) + brand awareness + UGC sharing.
- **Fase target:** FASE 11 XL BLOQUE 11.J (DMX Wrapped annual + migration section)
- **Industria origen:** Spotify Wrapped annual personalization pattern
- **Dependencia data:** `zone_migration_flows` acumulados 12m + user's zona suscrita + shareable card generator (11.U stickers infra)

### L99 — Gentrification Alert suscripción por zona (lateral → 11.T)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.T Alert Radar ampliado)
- **Qué es:** suscripción push/email por zona: alerta cuando flows entrantes superan threshold de decil alto (>+2 vs baseline). Posiciona DMX como "Zillow con alma de urbanista".
- **Para qué sirve:** dueños actuales pueden anticipar gentrificación antes que suban precios/impuestos. Inversionistas detectan zonas en transición temprana.
- **Beneficio concreto:** producto premium diferenciado + brand "DMX defensor del urbanismo responsable" + engagement high-intent.
- **Fase target:** FASE 11 XL BLOQUE 11.T Alert Radar (ampliar: índice + causal + pulse + migration)
- **Industria origen:** Zillow home value tracker + urbanist watchdog pattern
- **Dependencia data:** `zone_migration_flows` time series + Alert Radar infra (11.T)

### L100 — Magnet vs Exodus Index ranking público (lateral → 11.I)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.I Scorecard Nacional sección migration)
- **Qué es:** ranking trimestral público top 10 zonas "magnet" (más inflow neto) vs top 10 "exodus" (más outflow neto) CDMX. Estilo Forbes lists.
- **Para qué sirve:** viralidad orgánica en medios — Forbes-style lists generan citas prensa + tráfico SEO. Pregunta fácil que prensa adora: "¿A qué colonia se muda toda la gente?"
- **Beneficio concreto:** press mentions trimestrales + SEO long-form + posiciona DMX como autoridad demografía urbana.
- **Fase target:** FASE 11 XL BLOQUE 11.I (Scorecard Nacional — sección Movilidad Urbana)
- **Industria origen:** Forbes best-of ranking lists + U-Haul Growth Index
- **Dependencia data:** `zone_migration_flows` quarterly aggregation + Scorecard Nacional PDF generator

### L101 — Flow Arbitrage alerta inversionistas (lateral → FASE 23)

- **Status:** ⚪ backlog (diferido FASE 23 Monetización — producto B2B premium)
- **Qué es:** alerta cuando zona B recibe flujos de decil mayor que zona A adyacente, PERO precios de A son mayores. Señal temprana de reajuste de precios.
- **Para qué sirve:** inversionistas tenen edge informacional para arbitrar — compran B barato antes que el mercado se dé cuenta. Producto exclusivo B2B.
- **Beneficio concreto:** ticket alto ($5-15K/mes B2B) + moat data arbitraje alpha-seeking + diferenciador vs todos competidores.
- **Fase target:** FASE 23 Monetización (producto B2B premium) con base en 11.G Migration Flow
- **Industria origen:** hedge fund arbitrage signals + real estate quant arbitrage
- **Dependencia data:** `zone_migration_flows` + `dmx_indices` price index + adjacency graph colonias

### L102 — Hover tooltips FlowTopTable preview (directo 11.G UX polish)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.G UX polish)
- **Qué es:** hover en rows de FlowTopTable muestra preview (zona name real, foto hero, mini-stats scores) en tooltip/popover.
- **Para qué sirve:** discovery accidental — user que miraba flows descubre que Narvarte le interesa + click profundo. Reduce paso intermedio.
- **Beneficio concreto:** +15-25% CTR estimado del flows table hacia detail page.
- **Fase target:** FASE 11 XL BLOQUE 11.G (UX polish o 11.Z polish final)
- **Industria origen:** GitHub PR/issue hover previews + Linkedin profile hover card
- **Dependencia data:** `zones` tabla metadata + IndexBadge component reuso

### L103 — Multi-language Instagram handle detection (directo 11.H diferido)

- **Status:** ⚪ backlog (FASE 38 International Expansion)
- **Qué es:** scraping IG Apify expandido a perfiles verificados CO/AR/BR/CL (actualmente H1 solo MX).
- **Para qué sirve:** habilitar Trend Genome multi-país cuando DMX expanda.
- **Beneficio concreto:** producto B2B LATAM-wide vs solo MX.
- **Fase target:** FASE 38 International Expansion
- **Industria origen:** Apify multi-region scraping patterns
- **Dependencia data:** APIFY_TOKEN + locale-aware filters

### L104 — Alpha zone lifecycle tracking (directo 11.H diferido)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.I — Scorecard Nacional sección lifecycle)
- **Qué es:** tracking de zonas por estado: `emerging → alpha → peaked → matured → declining`. Transición entre estados con fechas y causal automático.
- **Para qué sirve:** historias completas de vida de zonas (Condesa: alpha 2011, peak 2016, maturing 2020, stable 2024) — narrativa timeline educativa.
- **Beneficio concreto:** press-ready content + case studies + brand autoridad historia urbana.
- **Fase target:** FASE 11 XL BLOQUE 11.I Scorecard Nacional (módulo lifecycle complementa Timeline Narrativo L89)
- **Industria origen:** product lifecycle Bass model + startup stages framework
- **Dependencia data:** zone_alpha_alerts histórico + causal_explanations + Timeline Narrativo (11.I.6)

### L105 — Signal anomaly alerts súbitas (directo 11.H diferido)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.T — Alert Radar multi-señal ampliado)
- **Qué es:** detectar cuando una fuente específica (ej. IG influencer heat) emerge súbitamente en una zona previamente fría. Trigger alerta independiente antes de que alpha_score compuesto cruce threshold.
- **Para qué sirve:** early-early warning — capta señales débiles individuales antes de que converjan.
- **Beneficio concreto:** ventaja temporal adicional 1-3 meses vs detector compuesto.
- **Fase target:** FASE 11 XL BLOQUE 11.T Alert Radar (granularidad single-signal + composite)
- **Industria origen:** hedge fund single-signal alerts + Splunk anomaly detection
- **Dependencia data:** influencer_heat_zones + historical baseline por fuente

### L106 — Alpha alert digest semanal opt-in (directo 11.H diferido)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.T — Alert Radar granularidad frequency)
- **Qué es:** opt-in digest semanal que agrupa alertas alpha en un solo email/WhatsApp curado en lugar de notificación individual por alerta.
- **Para qué sirve:** usuarios que prefieren resumen batch vs stream. Reduce fatiga + aumenta apertura.
- **Beneficio concreto:** mejor retención para segmento que odia notificaciones frecuentes.
- **Fase target:** FASE 11 XL BLOQUE 11.T Alert Radar (user preference frequency: instant|daily|weekly)
- **Industria origen:** LinkedIn weekly digest + Substack weekly roundup
- **Dependencia data:** zone_alert_subscriptions + extender `frequency` enum

### L107 — Alpha Academy curso educativo lead magnet (lateral 11.H diferido)

- **Status:** ⚪ backlog (FASE 23 Monetización — lead magnet B2B)
- **Qué es:** curso online (4-6 módulos) "Cómo identificar zonas emergentes antes que el mercado". Certificación opcional. Free gate para Pro+ tier upsell.
- **Para qué sirve:** lead magnet B2B brutal — reduce fricción en el funnel Pro+ enterprise. Posiciona DMX como Bloomberg Education.
- **Beneficio concreto:** ARR upsell path clara + brand educativo + content marketing evergreen.
- **Fase target:** FASE 23 Monetización (lead magnet + Pro+ upsell funnel)
- **Industria origen:** Bloomberg Terminal education + CFA Institute pattern
- **Dependencia data:** contenido original + platform LMS (Teachable, Podia o custom H2)

### L108 — Alpha Challenge tournament mensual B2B (lateral 11.H diferido)

- **Status:** ⚪ backlog (FASE 22 Marketing & Communications)
- **Qué es:** tournament mensual entre clientes B2B — quién identifica más zonas alpha antes que DMX. Leaderboard público. Premio: 1 mes gratis Pro+ + PR mention.
- **Para qué sirve:** engagement brutal + viralidad orgánica + data enrichment (las predicciones de humanos enriquecen modelo).
- **Beneficio concreto:** reduce churn Pro+ + content orgánico mensual + mejora modelo con human-in-the-loop.
- **Fase target:** FASE 22 Marketing (tournaments + community + gamification)
- **Industria origen:** Kaggle competitions + Numerai tournaments
- **Dependencia data:** zone_alpha_alerts + user predictions tabla nueva + leaderboard infra

### L109 — Alpha NFT collectibles predicciones acertadas (lateral 11.H diferido)

- **Status:** ⚪ backlog (FASE 34 Creator Economy)
- **Qué es:** NFT coleccionables para suscriptores Pro+ por cada alerta alpha que aciertan antes del mercado. Valor comunidad + coleccionismo gamificado.
- **Para qué sirve:** valor simbólico + fidelización community + potential secondary market (colectores).
- **Beneficio concreto:** diferenciador emocional B2B + long-term community moat.
- **Fase target:** FASE 34 Creator Economy (NFT + community assets)
- **Industria origen:** POAP + NFT collectibles achievement pattern
- **Dependencia data:** user achievements tabla + wallet integration + IPFS mint

### L110 — Alpha Social club exclusive Pro+ (lateral 11.H diferido)

- **Status:** ⚪ backlog (FASE 23 Monetización — community value-add Pro tier)
- **Qué es:** Discord/Slack comunidad exclusive Pro+ donde fondos + developers + investors networking + intercambio insights. Moderado por DMX.
- **Para qué sirve:** networking value-add justifica Pro+ pricing + crea community moat (switching cost alto).
- **Beneficio concreto:** churn Pro+ reducido dramáticamente + ecosystem lock-in.
- **Fase target:** FASE 23 Monetización (Pro+ tier benefits — community)
- **Industria origen:** Bloomberg Terminal chat + hedge fund slack communities
- **Dependencia data:** Discord/Slack integration + verification tier + moderation

### L111 — Alpha Podcast mensual análisis top zones (lateral 11.H diferido)

- **Status:** ⚪ backlog (FASE 22 Marketing & Communications)
- **Qué es:** podcast mensual 30-45 min: host DMX + expert invitado analizan top alpha zones del mes, contexto histórico, implicaciones.
- **Para qué sirve:** SEO audio long-form + brand autoridad + multiplicador de scorecard quarterly.
- **Beneficio concreto:** content evergreen + menciones cross-podcast + top-of-mind B2B.
- **Fase target:** FASE 22 Marketing (content strategy podcast)
- **Industria origen:** NPR The Daily + Masters of Scale + FT News Briefing
- **Dependencia data:** Scorecard Nacional quarterly + audio production pipeline

### L112 — Alpha Leaderboard B2B clientes (lateral 11.H diferido)

- **Status:** ⚪ backlog (FASE 22 Marketing & Communications — gamification)
- **Qué es:** leaderboard público ranked de clientes B2B por acierto de predicciones alpha. Opt-in para ser listado.
- **Para qué sirve:** gamificación + bragging rights + viralidad cuando fondos comparten "ranked #1 en Alpha Leaderboard DMX".
- **Beneficio concreto:** engagement + PR orgánico + diferenciador B2B competitivo.
- **Fase target:** FASE 22 Marketing (gamification + public leaderboards)
- **Industria origen:** Robinhood leaderboard + CFA Challenge + Kaggle rankings
- **Dependencia data:** L108 Alpha Challenge infra + subscribers tier metadata

### L113 — TG × Timeline Histórico Causal (cross-function 11.H × 11.I)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.I Scorecard Nacional)
- **Qué es:** combinar alpha zones con Timeline Narrativo (11.I.6): narrativa alpha zones evolución 12m — "cómo llegó Portales a fase alpha, qué señales aparecieron primero, quiénes fueron los early movers".
- **Para qué sirve:** storytelling poderoso para prensa + case studies educativos + validación retrocausal narrativa.
- **Beneficio concreto:** press content mensual + formato repetible + reduce duda metodológica.
- **Fase target:** FASE 11 XL BLOQUE 11.I (integración con 11.I.6 Timeline Narrativo + 11.H alpha histórico)
- **Industria origen:** Bloomberg narrative data journalism + S&P transition stories
- **Dependencia data:** zone_alpha_alerts histórico + causal_explanations + Timeline Narrativo

### L114 — TG × Causal Engine narrativa alerta (X1 diferido 11.H)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.I Scorecard Nacional — sección alpha con causal)
- **Qué es:** al generar una alerta alpha, llamar Causal Engine (11.E) para incluir narrativa "por qué {colonia} entró fase alpha" en el payload del alert + UI dashboard.
- **Para qué sirve:** contexto inmediato accionable en la alerta — no solo "alpha score 82" sino "alpha por 3 cafés especialidad nuevos + migración decil 8".
- **Beneficio concreto:** reduce tiempo-a-decisión del suscriptor B2B + brand "DMX explica, no solo alerta".
- **Fase target:** FASE 11 XL BLOQUE 11.I (integrar causal narrativa en alpha alerts + Scorecard Nacional)
- **Industria origen:** Bloomberg Terminal contextual alerts + hedge fund explainable signals
- **Dependencia data:** Causal Engine (11.E) + zone_alpha_alerts infra

### L115 — Alpha zones map overlay en /indices/flujos (D4 diferido 11.H)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.Z polish final)
- **Qué es:** nueva capa toggle "Alpha zones" en mapa existente /indices/flujos (11.G) con coropleto según alpha_score. Reusa MapboxChoropleth.
- **Para qué sirve:** cross-visualización flows migratorios + alpha detection en misma vista = insight combinado "zonas alpha con inflow alto = confirmed opportunity".
- **Beneficio concreto:** UX unificada + reduce toggle entre páginas + insight compuesto más potente.
- **Fase target:** FASE 11 XL BLOQUE 11.Z polish final (complementa 11.G)
- **Industria origen:** Mapbox layer toggling + Kepler.gl multi-layer
- **Dependencia data:** zone_alpha_alerts + MapboxChoropleth component (ya existe 11.G)

### L116 — Rate limit per-tier API Trend Genome (D5 diferido 11.H)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.L APIs REST + Widget + Time Machine)
- **Qué es:** implementar rate limiting granular per-tier (free 100/mes, Starter 500/mes, Pro 1K/mes, Enterprise unlimited) en endpoints Trend Genome. Integra con rate limit infra del BLOQUE 11.L (APIs REST).
- **Para qué sirve:** gating comercial sostenible que previene abuse free tier sin frenar growth.
- **Beneficio concreto:** funnel upsell claro Pro+ + control costos Apify + telemetría uso por tier.
- **Fase target:** FASE 11 XL BLOQUE 11.L APIs REST (natural fit con rate limit global)
- **Industria origen:** Stripe API rate limits + OpenAI API tier structure
- **Dependencia data:** subscriptions.plan + check_rate_limit + tier enforcement middleware

### L117 — TG × Índices DMX dominantes chips inline (X4 diferido 11.H)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.Z polish final)
- **Qué es:** en AlphaZoneCard mostrar mini-chips con los top 3 índices DMX dominantes en esa alpha zone (ej. DMX-GNT 87, DMX-YNG 82, DMX-MOM 75). Cross-reference visual inmediato.
- **Para qué sirve:** contexto inmediato sobre qué dimensiones IE explican la fase alpha — "alpha por gentrificación + momentum + millennial".
- **Beneficio concreto:** conexión visual con producto principal (índices DMX) + educación metodológica inline.
- **Fase target:** FASE 11 XL BLOQUE 11.Z polish final (UI enriquecido)
- **Industria origen:** Morningstar style-box + Bloomberg multi-metric cards
- **Dependencia data:** dmx_indices (11.A) + AlphaZoneCard component (ya existe 11.H.6)

### L118 — Scorecard executive 1-pager dense summary (lateral 11.I diferido)

- **Status:** ⚪ backlog (FASE 22 Marketing & Communications — press asset)
- **Qué es:** versión 1-pager del Scorecard Nacional con data densa visual estilo Bloomberg one-pager. Complementa el PDF 40-80 páginas completo.
- **Para qué sirve:** medios + fondos quieren skim rápido sin leer 40 páginas. One-pager = primer asset que share en Twitter/LinkedIn.
- **Beneficio concreto:** viralidad PR + clic-through al PDF completo desde one-pager.
- **Fase target:** FASE 22 Marketing (press asset kit ampliado)
- **Industria origen:** Bloomberg one-pager briefings + McKinsey exec summary format
- **Dependencia data:** Scorecard Nacional data quarterly ya existente + diseño Figma template

### L119 — Scorecard infografía redes sociales descargable (lateral 11.I diferido)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.U Stickers — generator infra reutilizable)
- **Qué es:** PNG shareable optimizados Twitter (1200×675) + LinkedIn (1200×627) + Instagram (1080×1080) con top 3 insights Scorecard. Reusa generator Sharp/SVG de 11.U.
- **Para qué sirve:** amplificación social orgánica masiva cuando se publica Scorecard trimestral.
- **Beneficio concreto:** shares redes sociales 10x vs solo PDF link.
- **Fase target:** FASE 11 XL BLOQUE 11.U Stickers (generator infra reusable)
- **Industria origen:** Axios Infographics + Visual Capitalist shareable cards
- **Dependencia data:** Scorecard quarterly + 11.U sticker generator + SVG templates brand

### L120 — Scorecard audio summary podcast auto-TTS (lateral 11.I diferido)

- **Status:** ⚪ backlog (FASE 22 Marketing — podcast strategy)
- **Qué es:** audio 5-7 min TTS auto-generado del executive summary del Scorecard trimestral. Publicado en Spotify/Apple Podcasts "DMX Pulse Trimestral".
- **Para qué sirve:** audiencia podcast durante commute + amplificación asincrónica del Scorecard.
- **Beneficio concreto:** content evergreen cross-platform + top-of-mind B2B commuters.
- **Fase target:** FASE 22 Marketing (podcast strategy integrada con Alpha Podcast L111)
- **Industria origen:** Bloomberg Surveillance podcast + FT News Briefing
- **Dependencia data:** executive narrative (11.I.3) + TTS pipeline (ElevenLabs/Lovo)

### L121 — Scorecard citation format academic crossref BibTeX (lateral 11.I diferido)

- **Status:** ⚪ backlog (FASE 23 Monetización — academia partnerships + citation system)
- **Qué es:** cada Scorecard quarterly tiene DOI + formato citation BibTeX/APA/MLA listo para academia. "DesarrollosMX (2026). Scorecard Nacional Q1 2026. https://doi.org/10.xxxxx"
- **Para qué sirve:** universidades (ITAM, Tec, UNAM economía urbana) pueden citar DMX como fuente académica formal. Amplifica autoridad.
- **Beneficio concreto:** referencias académicas orgánicas + partnerships universidades H2.
- **Fase target:** FASE 23 Monetización (academia partnerships + citation infra)
- **Industria origen:** S&P Global + NBER working papers citation format
- **Dependencia data:** CrossRef DOI registration + metadata formal + bibliography generator

### L122 — Scorecard × Living Atlas link colonia wiki (cross-function 11.I × 11.S)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.S Living Atlas)
- **Qué es:** en el PDF Scorecard y landing, cada colonia mencionada linkea a su página wiki `/atlas/[colonia]` (11.S). Navegación cruzada producto completo.
- **Para qué sirve:** discovery orgánico — lector Scorecard descubre contenido wiki profundo de cada colonia + reduce bounce.
- **Beneficio concreto:** time-on-site +30% + producto coherente brand.
- **Fase target:** FASE 11 XL BLOQUE 11.S Living Atlas (integración bidireccional)
- **Industria origen:** Wikipedia internal linking + Financial Times related articles
- **Dependencia data:** Living Atlas pages (11.S) + Scorecard generator (11.I) + URL resolver

### L123 — Scorecard × Widget embed sections (cross-function 11.I × 11.L)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.L APIs REST + Widget)
- **Qué es:** sections del Scorecard (ej. "Top 5 Magnet", "Executive Summary") embebibles como iframe en medios. Medios pueden integrar Scorecard sin republicar.
- **Para qué sirve:** El Economista puede embed "Scorecard DMX Q1 — sección Magnet/Exodus" directo en su artículo. Amplificación + backlinks masivos.
- **Beneficio concreto:** SEO backlinks + distribución nativa en medios + brand amplification.
- **Fase target:** FASE 11 XL BLOQUE 11.L APIs REST + Widget (nuevo widget type: Scorecard section)
- **Industria origen:** Bloomberg Embed + Twitter/X tweet embeds
- **Dependencia data:** Widget embed infra (11.L.1) + Scorecard sections modular (11.I.1)

### L124 — Scorecard × Newsletter mensual digest (cross-function 11.I × 11.J)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.J Newsletter)
- **Qué es:** newsletter mensual incluye preview del Scorecard quarterly (2 meses antes publish) + after-publish digest resumido con link al PDF completo.
- **Para qué sirve:** nurture audience newsletter antes + durante el push trimestral. Aumenta conversion a PDF download.
- **Beneficio concreto:** open rate newsletter +20% estimado + audience building pre-publish.
- **Fase target:** FASE 11 XL BLOQUE 11.J Newsletter (integración Scorecard hooks)
- **Industria origen:** Morning Brew pre-issue hooks + Axios AM preview cards
- **Dependencia data:** Newsletter infra (11.J) + Scorecard calendar publish + MJML template section

### L125 — Pulse signals limitation_code stubs H1 (post 11.I.bis audit)

- **Status:** ⚪ backlog (FASE 12 N5 AI framework — cuando entren sources reales)
- **Qué es:** stubs fetchFootTraffic/fetchEvents/fetchConstructionPermits de 11.F retornan actualmente limitation string clara. Reemplazar con API real Google Popular Times + Ticketmaster + SEDUVI permits cuando se firmen partnerships.
- **Para qué sirve:** Pulse Score con 5/5 sources = confidence high. H1 funciona 3/5 (graceful) pero no captura full signal.
- **Beneficio concreto:** pulse_score más preciso + confidence label correcto.
- **Fase target:** FASE 12 (framework AI maduro + partnerships firmadas)
- **Industria origen:** Foursquare + TicketMaster data partnerships
- **Dependencia data:** Google Places API key + Ticketmaster API + SEDUVI portal

### L126 — Flow table decile "unclassified" i18n (post 11.I.bis audit)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.J polish)
- **Qué es:** cuando zona_snapshots.payload no incluye decil_ingreso (data gap H1), FlowTopTable muestra "Sin clasificar" fallback. Keys i18n hardcoded en ES, pendiente locales CO/AR/BR/EN.
- **Para qué sirve:** 5-locale i18n completo en toda UI pública.
- **Beneficio concreto:** compliance audit:i18n STRICT (requisito tag fase-11-complete).
- **Fase target:** FASE 11 XL BLOQUE 11.J (polish i18n junto con newsletter locales)
- **Industria origen:** i18n best practices fallback states
- **Dependencia data:** messages/*.json keys migrationFlow.table.decile_unclassified

### L127 — Causal Engine fallback stale cache si LLM down (post 11.I.bis audit)

- **Status:** ⚪ backlog (FASE 12 N5 AI framework)
- **Qué es:** si Anthropic LLM no responde (timeout/quota/500), retornar último causal_explanations cached aunque esté stale (>30d) con badge "cached date" en UI. Mejor stale que error.
- **Para qué sirve:** uptime producto ante outage LLM provider. Experience graceful en lugar de "error al generar".
- **Beneficio concreto:** 99.9% uptime UI + trust B2B.
- **Fase target:** FASE 12 N5 AI framework (circuit breaker + cache fallback maduro)
- **Industria origen:** Netflix Hystrix circuit breaker + service mesh fallback patterns
- **Dependencia data:** Causal Engine extensión runtime error handling

### L128 — trackCausalGeneration wire desde causal-engine (post 11.I.bis audit)

- **Status:** ⚪ backlog (FASE 12 N5 AI framework — observability)
- **Qué es:** función observability `trackCausalGeneration` existe pero no invocada desde causal-engine core. Requiere wire post-generation para telemetría completa tokens/cost/cache_hit.
- **Para qué sirve:** dashboard cost real LLM + analytics hit rate cache.
- **Beneficio concreto:** control costos AI preciso + decisiones optimización prompt.
- **Fase target:** FASE 12 N5 AI (observability framework completo)
- **Industria origen:** OpenAI usage dashboard + Anthropic console
- **Dependencia data:** PostHog + Sentry + ai_usage_tracking tabla (FASE 12)

### L129 — PNG rasterize @napi-rs/canvas approval (post 11.I.bis audit)

- **Status:** ⚪ backlog (FASE 22 Marketing — press asset production)
- **Qué es:** PNG chart generator actualmente usa SVG nativo (Twitter/LinkedIn/Instagram aceptan SVG y native). Para rasterización PNG real (algunos feeds embed no aceptan SVG) requiere @napi-rs/canvas o similar. Founder approval pendiente install.
- **Para qué sirve:** compatibility máxima redes sociales + embeds terceros.
- **Beneficio concreto:** 100% compatibility sharing (SVG es ~95%).
- **Fase target:** FASE 22 Marketing (press asset production avanzado)
- **Industria origen:** Sharp + node-canvas server-side rendering
- **Dependencia data:** @napi-rs/canvas install (~5MB bundle)

### L130 — Backtest console scope_id render (post 11.I.bis follow-up)

- **Status:** 🟡 queued (FASE 11 XL BLOQUE 11.L polish)
- **Qué es:** backtest-console.tsx:334 tiene un caso edge donde scope_id se renderiza sin resolve (contexto async callback). Zone label resolver integration pendiente en ese scope.
- **Para qué sirve:** consistencia UI — 0 UUIDs renderizados en ninguna parte de la app.
- **Beneficio concreto:** audit grep final zero UUIDs en UI.
- **Fase target:** FASE 11 XL BLOQUE 11.L (Hash URL backtests + polish UI)
- **Industria origen:** React async resolver patterns + Suspense fallback
- **Dependencia data:** resolveZoneLabel + async Context propagation backtest

### L131 — Genoma Multi-país cross-country similarity (FASE 11 BLOQUE 11.M agendado)

- **Status:** 🟢 queued (post-H1)
- **Qué es:** embeddings 64-dim actualmente bloqueados a un solo country_code en la búsqueda. Cross-country (MX ↔ CO ↔ AR) abriría "tu colonia parecida en otros países".
- **Para qué sirve:** descubrimiento LATAM — "tu Roma Norte en Medellín" o "tu Palermo Soho en Ciudad de México".
- **Beneficio concreto:** diferenciador único para perfiles nómada digital + inversión cross-border.
- **Fase target:** FASE 38 International Expansion
- **Dependencia data:** data MX+CO+AR con features_version compatibles

### L132 — Vibe Tags AI refinement híbrido ADR-022 (FASE 11 BLOQUE 11.M agendado)

- **Status:** 🟢 queued (ADR-022 approved)
- **Qué es:** reemplaza heuristic_v1 (10 reglas determinísticas) por llm_v1 (LLM + señales DENUE/Instagram/Google Maps reviews).
- **Para qué sirve:** precisión mayor en vibe tags subjetivos (foodie, bohemian) usando texto real.
- **Beneficio concreto:** calidad search "colonias foodie" pasa de correlación score a comprensión semántica.
- **Fase target:** FASE 12 N5 (LLM scores)
- **Dependencia data:** Apify Instagram ingestor + Google Maps reviews scraper

### L133 — Genoma para proyectos no solo colonias (FASE 11 BLOQUE 11.M agendado)

- **Status:** 🟢 queued
- **Qué es:** extiende colonia_dna_vectors a proyecto_dna_vectors — buscar proyectos con perfil similar (amenidades + ubicación + precio-calidad).
- **Para qué sirve:** comprador enamorado de un proyecto ya vendido encuentra los parecidos.
- **Beneficio concreto:** conversión portal developer — "te gustó Proyecto X, mira estos 5 similares".
- **Fase target:** FASE 15 Portal Developer
- **Dependencia data:** proyectos table con amenidades + embeddings propios

### L134 — Derivatives-like futures contracts real estate (FASE 11 BLOQUE 11.N agendado)

- **Status:** 🟢 queued
- **Qué es:** evolución de la curva forward hacia contratos derivados (CFDs/futures) sobre índices DMX. Producto financiero real.
- **Para qué sirve:** investors sofisticados pueden hedgear exposure a mercado inmobiliario sin tocar propiedad física.
- **Beneficio concreto:** nuevo vertical fintech high-revenue.
- **Fase target:** FASE 36 Fractional Investing
- **Dependencia data:** regulación CNBV + partners broker

### L135 — ML regression refinement LSTM/ARIMA vs heurística H1 (FASE 11 BLOQUE 11.N agendado)

- **Status:** 🟢 queued
- **Qué es:** reemplaza regression lineal H1 por modelo ARIMA o LSTM con seasonality multi-periodica + external features (macro, eventos).
- **Para qué sirve:** precisión forecast mayor + banda CI más realista (no simétrica).
- **Beneficio concreto:** accuracy mejora 20-40% según benchmark (Box-Jenkins vs naive trend).
- **Fase target:** FASE 12 N5 (LLM + ML scores)
- **Dependencia data:** feature store + training pipeline

### L136 — Bloomberg-style forward curve terminal UI premium (FASE 11 BLOQUE 11.N agendado)

- **Status:** 🟢 queued
- **Qué es:** dashboard profesional tipo Bloomberg terminal con curva + comparables + deltas + alertas en real-time.
- **Para qué sirve:** justificar tier enterprise pricing ($10K+/mes) con UX premium.
- **Beneficio concreto:** conversión enterprise +3x vs tier pro.
- **Fase target:** FASE 22 Marketing & Premium UX
- **Dependencia data:** WebSocket real-time + diseño UX terminal

### L137 — Tabla zones canónica con columnas lat/lng/area (H2 followup post 11.M)

- **Status:** 🟡 deuda técnica conocida
- **Qué es:** actualmente zone_id es UUID sin tabla formal con columnas standard. Geo features en embedding leen desde zona_snapshots.payload (JSON heterogéneo). H2 introducir tabla zones con columnas canónicas.
- **Para qué sirve:** consistencia geo queries + type safety + dedup zone_type/country_code.
- **Beneficio concreto:** geo features embedding dejan de ser neutros (0.5) cuando payload falta; search performance sube.
- **Fase target:** FASE 13 (consolidación E2E MX post FASE 12 N5)
- **Dependencia data:** migración zona_snapshots.payload → columnas canónicas zones

### L138 — LifePath AI refinement LLM (FASE 11 BLOQUE 11.O agendado)

- **Status:** 🟢 queued
- **Qué es:** swap `methodology='heuristic_v1'` por `llm_v1` en matching engine LifePath. LLM reescribe matching por afinidad contextual (conversación user) en vez de fórmula determinística de 7 componentes.
- **Para qué sirve:** matches más naturales ("familia con niños quiere cerca de escuela Y aire limpio") vs hoy "priority sliders 0-10 genéricos".
- **Beneficio concreto:** precisión matching percibida +30% user testing (LLM captura sutilezas que heurística pierde).
- **Fase target:** FASE 12 N5 (AI Content Engine)
- **Dependencia data:** ADR-022 abstract source toggle + LLM provider + prompt templates LifePath

### L139 — LifePath para inversionistas (perfil diferente) (FASE 11 BLOQUE 11.O agendado)

- **Status:** 🟢 queued
- **Qué es:** cuestionario LifePath complementario orientado a perfil inversionista (ROI target, horizonte, riesgo tolerado, tipo de activo STR/LTR/mixed).
- **Para qué sirve:** diferenciar user personas; hoy LifePath es buyer-first, falta inversionista-first.
- **Beneficio concreto:** monetización portal Developer + pro tier upgrade (inversores pagan por matching investment-grade).
- **Fase target:** FASE 15 Portal Developer
- **Dependencia data:** schema `lifepath_profile_type` enum + registry de nuevos componentes (rent_yield · cap_rate · gentrification_exposure)

### L140 — LifePath con AI copilot conversacional (FASE 11 BLOQUE 11.O agendado)

- **Status:** 🟢 queued
- **Qué es:** extensión del AI Shell (FASE 20) para permitir cuestionario conversacional en vez de 15 preguntas rígidas. "Cuéntame cómo te gusta vivir" → LLM extrae answers + confirma.
- **Para qué sirve:** UX friction lower; retention (user no abandona quiz).
- **Beneficio concreto:** conversion quiz → resultados +40% (estimado Stitch Fix benchmarks).
- **Fase target:** FASE 20 AI Shell expansion
- **Dependencia data:** AI Shell MCP integration + LifePath schema introspection

### L141 — NOAA GHCND real ingestion + station lookup lat/lng (FASE 11 BLOQUE 11.P agendado)

- **Status:** 🟢 queued
- **Qué es:** reemplazar `heuristicMonthlyAggregate` determinístico por `fetchNoaaGhcnd()` usando API pública `ncei.noaa.gov/cdo-web/api/v2/data`. Rate limit 5 req/s, 10K req/día free. Station lookup cache una-vez por lat/lng → station_id.
- **Para qué sirve:** data real (vs CDMX pattern sintético) para predicciones creíbles; soporta expansión fuera de CDMX (ciudades MX + LatAm).
- **Beneficio concreto:** credibilidad "Zillow del clima" ≠ "fake data"; precisión twin matching real vs heurística ±30% estimado.
- **Fase target:** FASE 12 N5 (swap `source='noaa'`)
- **Dependencia data:** `NOAA_API_TOKEN` env + `climate_stations` tabla (station_id, lat, lng, country_code)

### L142 — Climate × Insurance vertical (FASE 11 BLOQUE 11.P agendado)

- **Status:** 🟢 queued
- **Qué es:** nuevo módulo que cruza `climate_twin_matches` + `climate_future_projections` + extreme_events históricos con pricing de seguros (hogar, flood, earthquake). Partnership con insurtech o producto propio.
- **Para qué sirve:** monetizar data climática; categoría nueva "Climate Risk Score" adoptada por fintechs/aseguradoras.
- **Beneficio concreto:** recurring revenue tier enterprise + datos de riesgo agregados para el IE (cascada hacia DMX-STA estabilidad).
- **Fase target:** FASE 25 Insurance vertical
- **Dependencia data:** partnership insurtech + actuarial validation

### L143 — Daily climate 15y big data ingestion (S3 offload) (FASE 11 BLOQUE 11.P agendado)

- **Status:** 🟡 deuda escalabilidad conocida
- **Qué es:** hoy SEED persiste monthly aggregates (180 rows × 200 zonas = 36K rows). H2 data lake (Parquet S3) para daily granular 15y: 1.1M+ rows sin tocar Postgres 8GB.
- **Para qué sirve:** ML models sobre data granular sin degradar DB prod; queries históricas exportables.
- **Beneficio concreto:** precisión anomaly detection +50% vs monthly (daily captura ondas de calor 3-5d); análisis costo/beneficio vs Supabase tier upgrade.
- **Fase target:** H2 Data Lake (FASE 27+ observability + big data infra)
- **Dependencia data:** S3 + Parquet pipeline + DuckDB/Trino query layer

### Cross-references FASE 11 XL append

- `docs/CONTEXTO_MAESTRO_DMX_v5.md` Addendum 2026-04-21 FASE 11 XL
- `docs/07_GAME_CHANGERS/07.0_INDICE.md` §Addendum 2026-04-21 (GC-NEW-1..10)
- `docs/07_GAME_CHANGERS/07.3_PRIORIZACION_H1_H2_H3.md` §Addendum 2026-04-21
- `docs/07_GAME_CHANGERS/07.4_MOAT_STRATEGY.md` §Moats FASE 11 XL
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-027_FASE_11_XL_METODOLOGIA_INDICES.md`
- `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md` §8 TODOs #27-#36

### L-NEW1 — Climate pgvector nacional scale (FASE 11 FIX 11.O+P implementado)

- **Status:** 🟢 implementado (monitor cuando crezca scope)
- **Qué es:** refactor `climate_annual_summaries` de `numeric[]` → `vector(12)` + HNSW cosine index + nueva `climate_zone_signatures` (aggregate per-zone) + RPC `find_climate_twins` DB-side O(log N).
- **Para qué sirve:** twin matching escalable a nivel nacional (10K+ zonas) sin degradar performance — queries pgvector con HNSW son sub-lineales.
- **Beneficio concreto:** pasar de matching Node-side (O(N²) + memory pressure) a DB-side (O(log N) con índice). En H1 CDMX (200 zonas) apenas notable; en H2 nacional (10K+ zonas) diferencial de 100×.
- **Fase target:** FASE 13 (evaluación + tuning HNSW `m`/`ef_construction` a escala)
- **Dependencia data:** HNSW index ya creado; reindex si hace falta

### L-NEW2 — createAdminClient typed generic sweep (deuda parcial conocida)

- **Status:** 🟡 deuda parcial
- **Qué es:** `createAdminClient()` retorna `SupabaseClient<Database>` correctamente, pero algunos callers antiguos aún tienen casts `as unknown as ...` innecesarios. Refactor trivial pero disperso (LifePath routes ya limpios en FIX 11.O+P).
- **Para qué sirve:** type safety consistente; menos ruido en reviews de casts.
- **Beneficio concreto:** hallazgo temprano de errores de typing; lector menos confundido por patterns mixtos.
- **Fase target:** FASE 12 N5 — sweep limpieza types
- **Dependencia data:** ninguna

### L-NEW3 — Sentry wiring reemplaza console.error (tombstones actuales)

- **Status:** 🟡 deuda conocida
- **Qué es:** hoy `console.error('[BLOQUE 11.P] …', err)` es el tombstone que deja breadcrumbs en logs Vercel para debugging prod; cuando Sentry entre, reemplazar por `Sentry.captureException(err, { tags: { block: '11.P' } })` recupera contexto estructurado.
- **Para qué sirve:** observabilidad real en prod (agrupación errores + alertas + reproducción).
- **Beneficio concreto:** fix time incidents bajando de horas (grep logs Vercel) a minutos (Sentry dashboard).
- **Fase target:** FASE 24 Observabilidad
- **Dependencia data:** `@sentry/nextjs` integration

### L-NEW4 — U4 Alert Ghost transition (11.Q agendado)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** notificación WhatsApp/email cuando una colonia cruza threshold de `hype_level` (aligned → over_hyped → extreme_hype) — señal temprana de burbuja inflándose o corrigiéndose.
- **Para qué sirve:** inversionista ve alert antes de que prensa/redes saturen el hype; puede comprar antes del pico o vender en la transición extreme→over.
- **Beneficio concreto:** decisión accionable por evento, no por dashboard sweep. Competidores MX/LATAM solo ofrecen rankings estáticos.
- **Fase target:** FASE 11.T Alert Radar WhatsApp (integrar con `zone_alpha_alerts` de 11.H como canal compartido).
- **Dependencia data:** `ghost_zones_ranking` histórico ≥3 períodos para detectar transiciones reales.

### L-NEW5 — U9 Overrated/Underrated blog autogen (11.Q agendado)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** pipeline mensual que toma top-5 extreme_hype + top-5 sub_valued y genera artículos LLM-assisted con data real (DMX fundamentals + buzz metrics + top-3 DMX indices por colonia) + autor manual validation.
- **Para qué sirve:** SEO content engine + categoría nueva "overrated/underrated real estate MX" — narrativa citeable que posiciona DMX como fuente de verdad vs portales de listings.
- **Beneficio concreto:** orgánico compound recurring mensual (60 artículos/año sin burnout editorial) + backlinks medios + social shares "zona sobre-hypeada" viralidad.
- **Fase target:** FASE 22 Marketing (content gen pipeline + SEO optimizer).
- **Dependencia data:** Ghost Zones 3+ períodos históricos + LLM integration (Anthropic SDK) + editorial workflow.

### L-NEW6 — U10 Six Degrees viral game (11.R agendado)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** gamification pública del path finder BFS — "encuentra la ruta más corta entre Coyoacán y Polanco" — leaderboard + sharing social + "Six Degrees of Gentrification" meme.
- **Para qué sirve:** engagement hook categoría nueva + SEO zona-a-zona long-tail + brand awareness sin acquisition cost.
- **Beneficio concreto:** cada search genera share potencial (path compartido en WhatsApp/Twitter). Viral loop tipo Spotify Wrapped/Six Degrees of Bacon.
- **Fase target:** FASE 22 Marketing gamification (integrar con Wrapped anual + Streaks 11.J.4).
- **Dependencia data:** `zone_constellation_clusters` + path finder stable >=2 períodos.

### L-NEW7 — U11 Discover Weekly email (11.R agendado)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** newsletter semanal tipo Spotify Discover Weekly — "5 colonias nuevas que deberías conocer según tu LifePath + tus constellation neighbors". Personalizado por user profile existente + edge weights sliders guardados.
- **Para qué sirve:** retention semanal vs mensual (11.J newsletter actual), loop recomendación → click → perfil profundizado.
- **Beneficio concreto:** frequency engagement 4× (semanal vs mensual) sin tocar UI — email es canal pull existente. Cada email trae traffic a /constellations focalizado.
- **Fase target:** FASE 12 + extensión 11.J Newsletter (nuevo template + cron weekly + personalización LifePath profiles).
- **Dependencia data:** `lifepath_user_profiles` + `zone_constellations_edges` + plantilla email render server.

### L-NEW8 — Editor rico Tiptap/Lexical wiki colonias (11.S agendado)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** editor rico (Tiptap o Lexical) para `colonia_wiki_entries` — reemplaza H1 read-only por workflow editorial con moderación humana (`reviewed=true` gate reactivado). Reemplaza mutaciones directas a markdown por AST-based editor.
- **Para qué sirve:** habilitar edición colectiva tipo wikipedia en una interfaz moderna WYSIWYG; desbloquear contributions de expertos locales sin que toquen markdown crudo.
- **Beneficio concreto:** cada colonia puede ser enriquecida manualmente con experiencia de agentes/brokers/residentes; amplifica calidad del atlas sin costo LLM recurrente.
- **Fase target:** FASE 12 N5 (editor admin + moderation workflow).
- **Dependencia data:** `colonia_wiki_entries` ya existe; solo requiere UI editor + endpoints authenticated tRPC upsert draft + publish.

### L-NEW9 — Sections normalizadas per-row (11.S agendado)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** refactor del schema `colonia_wiki_entries.sections jsonb` a tabla normalizada `colonia_wiki_sections` (colonia_id, version, section_key, heading, content_md) con PK compuesta y constraint de 8 secciones canónicas.
- **Para qué sirve:** query by section nacional (ej. "traeme la sección de gastronomía de las top 50 colonias"), indexing GIN por sección, paginación server-side de secciones largas, soporte futuro de fragment-level review workflow (editorial aprueba una sola sección en vez del blob entero).
- **Beneficio concreto:** escala a nacional (20k+ colonias) sin payload jsonb gigante; habilita experiencias agregadas tipo "mejor gastronomía por ciudad"; baja latencia de queries H1 con jsonb access patterns.
- **Fase target:** FASE 13 si cobertura escala a nacional (CDMX colonias 1k, MTY/GDL/PUE/QRO siguientes 4k, long tail 15k+).
- **Dependencia data:** migration ALTER que normaliza — backfill desde jsonb existente es 1:1.

### L-NEW10 — Retirar cast transitional admin-ext tras db:types regen (11.S)

- **Status:** ✅ **SHIPPED** (mismo PR #32, post-merge cleanup commit `36ea5ea`)
- **Qué fue:** tras `npm run db:types` post-merge 11.S (regeneró `shared/types/database.ts` con la tabla `zone_slugs`), se eliminó `shared/lib/supabase/admin-ext.ts` y se retargetearon sus 5 callers (atlas router, slug-resolver lib, seed script, atlas landing page, atlas detail page) al `createAdminClient()` regular + `Database` native.
- **Resultado:** 0 `as unknown as` en código productivo del atlas feature (solo 2 restantes en test mocks — patrón existente de `constellations.router.test.ts`). Tests 2574 passed · typecheck clean · lint clean · build ✓.
- **Shipped:** main SHA `2071e9f` (PR #32, commit `36ea5ea` dentro del squash).

### Upgrades 11.S shipped (PR #32 SHA 2071e9f)

| # | Upgrade | Bloque | Status |
|---|---------|--------|--------|
| U16 | Living Atlas wiki renderer seguro (react-markdown + remark-gfm + rehype-sanitize) | 11.S | ✅ shipped 2071e9f |
| U17 | SEO slugs desacoplados multi-country + multi-scope (`zone_slugs` normalizada) | 11.S | ✅ shipped 2071e9f |
| U18 | Seed LLM Haiku 4.5 cost-capped (hard $3 USD pre-batch + running) | 11.S | ✅ shipped 2071e9f |
| U19 | Atlas × Genoma cross-function (sidebar link /indices/DMX-LIV/similares) | 11.S | ✅ shipped 2071e9f |
| U20 | Atlas × Climate Twin cross-function (sidebar link /indices/DMX-LIV/clima-gemelo) | 11.S | ✅ shipped 2071e9f |
| L-NEW10 | Transitional cast cleanup post db:types regen | 11.S | ✅ shipped 2071e9f |

### Upgrades 11.Q+11.R shipped (PR #30 SHA acb7d16)

| # | Upgrade | Bloque | Status |
|---|---------|--------|--------|
| U1 | Breakdown transparente Ghost (search/press/dmx_gap bars) | 11.Q | ✅ shipped acb7d16 |
| U2 | Hype halving warning badge | 11.Q | ✅ shipped acb7d16 |
| U3 | Timeline 12m ghost_score Recharts | 11.Q | ✅ shipped acb7d16 |
| U14 | Ghost×LifePath badge cross-function | 11.Q | ✅ shipped acb7d16 |
| U5 | Edge weight sliders customizables (client-side) | 11.R | ✅ shipped acb7d16 |
| U6 | Louvain cluster detection + coloring | 11.R | ✅ shipped acb7d16 |
| U7 | Path finder BFS widget | 11.R | ✅ shipped acb7d16 |
| U13 | Ghost × Constellations contagion paths | 11.R | ✅ shipped acb7d16 |
| U15 | Constellations × Futures correlation boost ±5% | 11.R | ✅ shipped acb7d16 |

15 upgrades shipped en main (9 de 11.Q+R + 5 de 11.S + L-NEW10 cleanup). 6 agendados L-NN (L-NEW4..L-NEW9). Zero items pendientes sin destino concreto.

**Última actualización:** 2026-04-24 muy tarde — L73-L143 + L-NEW1..L-NEW11 (L-NEW11 SHIPPED BATCH 5) + L-NEW12..L-NEW19 agendados pre-Opción D con destino concreto + 15 upgrades shipped 11.Q+R+S = **103 laterales FASE 11 XL + pre-Opción D** + 0 items sin destino.

---

## Refactors estructurales completados

### L-NEW11 [SHIPPED 2026-04-24] — Canonical catalog naming (ADR-029)
- Shipped BATCH 5 pre-Opción D
- Rename `registry.ts` → `score-registry.ts` + tabla `feature_registry` → `ui_feature_flags`
- Docs activos actualizados (catálogos 03.* + operacional 05.* + CONTEXTO_MAESTRO + FEATURE_INVENTORY footer)
- Históricos intactos (biblia-v5, ADRs 001-028, FASE_01-25 pre-completadas)
- ADR-029 canoniza fronteras semantic 3 catálogos (score calculators IE / UI feature flags / producto humano)
- Ref: `docs/01_DECISIONES_ARQUITECTONICAS/ADR-029_CANONICAL_CATALOG_NAMING.md`

---

## Laterales agendados pre-Opción D + derivados FASE 07.5 (L-NEW12 - L-NEW19)

Agendados durante auditoría integral 2026-04-24 + ritual pre-prompt Opción D + sesión 07.5.0 foundational (canonical zones polymorphic shipped PR #40). 8 entradas con destino concreto FASE específica. Formato founder-friendly (qué es / para qué sirve / beneficio concreto + fase target + estimado).

### L-NEW12 — Vercel Pro upgrade pre-launch público

- **Status:** 🟢 agendado checklist pre-launch público
- **Qué es:** Upgrade plan Vercel Hobby → Pro ($20/mes) + activar 14 crons automatizados + redeploy + smoke test `ingest_runs` post-primer disparo + monitor 24-48h primeras ejecuciones reales.
- **Para qué sirve:** activar ingesta automática real cuando ya tengamos users en producción. Hoy Hobby limita 2 crons/daily y 12/14 crons quedan silenciados, pero pre-launch los scripts CLI manuales son suficientes.
- **Beneficio concreto:** desbloquea data fresca automática 24/7 sin intervención manual. Ingesta continua = diferenciador vs portales con data snapshot viejo.
- **Fase target:** semana antes ship público (milestone trigger pre-launch).
- **Prerequisites completados 2026-04-24:**
  - `CRON_SECRET` agregada Production + Preview con Sensitive toggle ON (2 valores independientes).
  - Fix score-worker auth Bearer CRON_SECRET (BATCH 4 PR #38).
  - Orchestrator INSERT fail-fast hardening (BATCH 4 shipped).
- **Estimado:** 1 h (upgrade + redeploy + monitor).
- **Filosofía aplicada:** `feedback_verify_before_spend.md` amplificada 2026-04-24 — "opción más grande NO aplica a gastos recurrentes cuyo ROI es deferido hasta milestone futuro". $240/año sin users reales = zero ROI inmediato.

### L-NEW13 — FK enforcement zones master (post-Opción D)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** `ALTER TABLE ADD FOREIGN KEY` en 18+ tablas existentes con `zone_id` / `colonia_id` / `scope_id` → `public.zones(id)`. Validar consistency post-seed complete Opción D antes de aplicar constraint.
- **Para qué sirve:** integridad referencial real + zero `zone_id` huérfano. Durante H1 la consistency está enforced a nivel app (UUIDs v5 determinísticos), pero DB-level FK cierra el loop definitivamente.
- **Beneficio concreto:** imposibilita corrupt writes que apunten a zones inexistentes; migra deuda diferida ADR-030 a shipped.
- **Fase target:** FASE 08 post-Opción D merge completo.
- **Dependencia data:** seed zones canonical MX (mínimo CDMX H1) completo + audit `zone_id` huérfanos previo para remediar antes de ADD CONSTRAINT.
- **Estimado:** 2-3 h (migration cascade + data validation).
- **Ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md`
- **Filosofía aplicada:** "zero cascade breakage" — diferido de Opción D porque aplicar FK simultáneamente con ingesta masiva agrega cascade risk mid-pipeline.

### L-NEW14 — Seed expansión nacional MX (31 estados restantes)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** `content/zones/mx/estados/{jalisco,nuevo-leon,puebla,guanajuato,queretaro,...}/` con alcaldías / municipios + ~10K colonias / barrios representativos. Source data INEGI abierta + complementos manuales brokers locales.
- **Para qué sirve:** moat de datos Hispanoamérica — cobertura nacional MX antes de cualquier competidor portal. Habilita scoring IE a escala país completo.
- **Beneficio concreto:** pasar de 229 entries CDMX H1 a ~15K entries MX nacional; desbloqueo FASE 13 portal asesor expansión nacional con zones reales.
- **Fase target:** FASE 13 Portal Asesor expansión nacional.
- **Dependencia data:** INEGI boundaries abiertas + lib h3-js instalada si se quiere populate `h3_r8`.
- **Estimado:** 15-20 h (paralelizable con sub-agents por estado — cada estado es archivo independiente en `content/zones/mx/estados/`).
- **Ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md`

### L-NEW15 — Seed Colombia canonical (Bogotá / Medellín / Cali H2)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** `content/zones/co/` con departamentos / municipios / barrios. Data DANE pública + cross-check Google Maps Geocoding para boundaries.
- **Para qué sirve:** validación multi-país día 1 en producción — primer país post-MX; prueba de fuego del polimorfismo `scope_type` (municipio CO ≠ municipio MX semánticamente en algunos contextos).
- **Beneficio concreto:** desbloqueo mercado CO (3° economía hispanohablante); zero refactor schema requerido gracias a ADR-030.
- **Fase target:** FASE 38 International Expansion H2.
- **Dependencia data:** DANE dataset + taxonomy CO confirmada (`departamento > municipio > comuna > barrio`).
- **Estimado:** 10-12 h.
- **Ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md`

### L-NEW16 — Seed Argentina / Brasil / USA canonical

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** `content/zones/{ar,br,us}/` con taxonomy per-país:
  - AR: provincias / partidos / comunas / barrios.
  - BR: estados / municípios / bairros.
  - US: states / counties / census_tracts / zip_codes.
- **Para qué sirve:** cobertura LATAM completa + entry US market. Valida los 22 valores enum `scope_type` declarados en ADR-030 U1.
- **Beneficio concreto:** DMX primera plataforma LATAM con schema único multi-país sin branches per-country; ventaja competitiva vs portales locales (Zonaprop AR, ZAP BR, Zillow US) que están limitados a un país cada uno.
- **Fase target:** FASE 38+ International Expansion escalada.
- **Dependencia data:** datasets oficiales AR (INDEC) + BR (IBGE) + US (Census TIGER/Line).
- **Estimado:** 20-25 h (3 países paralelos — sub-agents independientes).
- **Ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md`

### L-NEW17 — OpenStreetMap bulk import automation

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** adaptador `scripts/ingest/lib/osm-loader.ts` que consume Overpass API. Import masivo boundaries reales (MultiPolygon geography 4326) + compute H3 r8 con lib `h3-js` oficial. Pipeline idempotente que respeta UUIDs v5 de zones ya seedeadas.
- **Para qué sirve:** poblar `boundary` + `h3_r8` NULL de H1 con data real global free. OSM ≈ INEGI-comparable en calidad para boundaries administrativas.
- **Beneficio concreto:** activar Mapbox GL rendering interactive + spatial queries reales `ST_Contains` — desbloquea visualizaciones tipo Zillow heatmap con zero costo licencias.
- **Fase target:** H2 Data Lake cuando escala >10K zones justifique el overhead de sync.
- **Dependencia data:** Overpass API rate limits + storage para MultiPolygons pesados + lib `h3-js`.
- **Estimado:** 8-10 h.
- **Ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md`

### L-NEW18 — APIs oficiales conectores (INEGI / DANE / IBGE / Census)

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** conectores real-time sync por país — webhook / cron pull que mantiene `zones` fresh (population updates, boundary re-delimitations, renames oficiales). 1 conector por país, shape común via ADR-030.
- **Para qué sirve:** data fresca sin manual updates PM-intensivos — el gobierno re-delimita colonias / census tracts cada ~5 años y DMX auto-sincroniza.
- **Beneficio concreto:** elimina deuda operativa PM; DMX queda always-current vs portales que rehacen seed manual anual.
- **Fase target:** H2+ post-launch.
- **Dependencia data:** credenciales API por país (varias son gratuitas con registro) + rate limits documentados.
- **Estimado:** 12-15 h (1 conector por país).
- **Ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md`

### L-NEW19 — Zones aliases + fuzzy search + Stripe/Google research

- **Status:** 🟢 agendado con destino concreto
- **Qué es:** tabla `zones_aliases (zone_id, alias text, alias_type text CHECK('historic'|'informal'|'official_alt'|'typo_common'), locale, source)` — "Roma Norte" ↔ "La Roma" ↔ "Colonia Roma" ↔ "Cuauhtémoc—Roma". Incluye research doc Stripe Connect country-state pattern + cross-check Google Maps Geocoding para validar boundaries.
- **Para qué sirve:** search UX emergente — usuarios escriben el nombre que conocen, no el canonical. Research valida que el patrón polimórfico DMX alinea con estándares industria payments (Stripe) + maps (Google).
- **Beneficio concreto:** search "roma" → matches correctos en autocomplete; reduce fricción onboarding signup marketing. Stripe research desbloquea integración billing multi-país sin reinventar taxonomies.
- **Fase target:** FASE 12 N5 (search UX) + FASE 22 (marketing signup).
- **Dependencia data:** fuzzy search infrastructure (pg_trgm ya habilitado) + acceso Google Maps Geocoding API free tier.
- **Estimado:** 6-8 h.
- **Ref:** `docs/01_DECISIONES_ARQUITECTONICAS/ADR-030_CANONICAL_ZONES_POLYMORPHIC.md`

---

## Sesión 07.5.A derivados (L-NEW20 - L-NEW22)

Detectados durante ejecución real 07.5.A — fallbacks usados que requieren ground truth + bug INEGI BIE descubierto en runtime. Formato founder-friendly (qué es / para qué sirve / beneficio concreto + fase target + estimado + ref sesión).

### L-NEW20 — Boundaries reales CDMX (GeoJSON oficiales)

- **Status:** 🟡 agendado con destino concreto, no bloqueante H1
- **Qué es:** Descargar GeoJSON oficiales de las 210 colonias CDMX desde fuentes públicas (datos.cdmx.gob.mx tiene catálogo oficial colonias 2020 con polygons reales) y depositarlos en `content/zones/boundaries/<scope_id>.geojson`. Re-run `scripts/ingest/01_ingest-geo-boundaries.ts` los promueve automáticamente sin tocar código.
- **Para qué sirve:** Reemplazar boundaries fallback bbox-500m (cuadrados aproximados ~500m × ~500m alrededor del centroide) con polígonos reales de cada colonia. Base sólida para análisis espacial preciso PostGIS.
- **Beneficio concreto:** Atlas / Living Atlas / mapas Mapbox GL muestran límites reales en lugar de cuadrados; queries `ST_Within` / `ST_Intersects` retornan resultados precisos en lugar de aproximados; spatial joins property↔colonia confiables.
- **Fase target:** FASE 13 expansión data layer, o L-NEW si bloquea UX antes (ej. mapa público landing).
- **Dependencia data:** acceso datos.cdmx.gob.mx (free, sin token) + script 01 ya preparado para detectar `.geojson` en `content/zones/boundaries/` automáticamente.
- **Estimado:** 4-6 h (descarga GeoJSON 210 colonias + parse + drop archivos + re-run script 01).
- **Ref:** SESIÓN 07.5.A T1 (transparencia 1).

### L-NEW21 — Demographics real AGEB-level (Censo 2020 + ENIGH 2022 microdatos)

- **Status:** 🟡 agendado con destino concreto, no bloqueante H1
- **Qué es:** Descargar microdatos INEGI Censo 2020 (CSV/dBase ~5GB) + ENIGH 2022 (~2GB) y procesarlos a nivel AGEB → agregar a colonia mediante mapeo geográfico (PostGIS spatial join AGEB polygon ↔ colonia polygon). Reemplaza el synthetic v1 determinístico actual de `scripts/ingest/03_ingest-demographics.ts`.
- **Para qué sirve:** Reemplazar distribuciones synthetic calibradas a CDMX promedio con datos reales censo y encuesta hogares por colonia. Base ground truth para Intelligence Engine N0-N4 scoring.
- **Beneficio concreto:** `profession_distribution`, `age_distribution`, `salary_range_distribution` reflejan realidad demográfica de cada colonia (no promedio CDMX); IE matching property↔buyer basado en datos verídicos vs proxies sintéticos; reduces sesgo en zone scoring.
- **Fase target:** FASE 13 expansión data layer, o post-launch público si IE H1 funciona bien con synthetic baseline.
- **Dependencia data:** descarga microdatos INEGI (free, requiere registro académico) + script Python procesamiento + mapping AGEB→colonia (puede aprovechar boundaries de L-NEW20 si shipped antes).
- **Estimado:** 8-12 h (descarga + procesamiento Python + agregación AGEB→colonia + reload tablas + tests).
- **Ref:** SESIÓN 07.5.A T2 (transparencia 2).

### L-NEW22 — Fix INEGI BIE API (token + indicator IDs 2026)

- **Status:** 🔴 bug runtime, requiere investigación 1-2 h
- **Qué es:** Investigar por qué INEGI BIE API retorna HTTP 400 con ErrorCode:100 "No se encontraron resultados" en TODOS los indicators probados (628194 INPC general, 736182 PIB trimestral, 910407, 6207067314, 1002000001) con áreas geográficas 0700/00000/01000 y ambos hosts BIE/BISE. Banxico SIE funcionó perfecto (880 rows ingested) → no es problema de red ni env vars genérico.
- **Para qué sirve:** Desbloquear ingesta macro INEGI (INPC mensual + PIB trimestral) que actualmente falla en `scripts/ingest/02_ingest-macro-banxico-inegi.ts` (Banxico OK, INEGI dlq=2). Estos series son secundarias al corpus core (Banxico FX/tasas/TIIE/cetes), pero necesarias para cálculos inflación-ajuste y comparativos macro.
- **Beneficio concreto:** Serie INPC mensual + PIB quarterly disponibles en `macro_series` para cálculos inflación-ajuste real (precios property normalizados a pesos constantes) + comparativos macroeconómicos en IE scorecards.
- **Fase target:** pre-FASE 11 (1-2 h investigación) — verificar token INEGI activo en portal, IDs vigentes 2026 (probablemente cambió ID schema), área geográfica correcta para nivel nacional.
- **Dependencia data:** acceso al portal desarrolladores INEGI (token actual en `.env.local` puede haber expirado) + documentación API actualizada 2026.
- **Estimado:** 1-2 h investigación + 0.5 h fix script 02 + re-run.
- **Ref:** SESIÓN 07.5.A DEUDA-2.

---

## Sesión 07.5.B derivados + upgrades 07.5.C (L-NEW23 - L-NEW29)

Deudas detectadas post-07.5.B + upgrades laterales/cross-functions 07.5.C agendados pre-scope principal. Formato founder-friendly (qué es / para qué sirve / beneficio concreto + fase target + estimado + ref).

### L-NEW23 — Fix registry gap N1-N4 calculators (pre-FASE 11 blocker)

- **Status:** 🔴 bug estructural, pre-FASE 11 obligatorio
- **Qué es:** SCORE_REGISTRY declara score_types N1/N2/N3/N4 (F15, H17, otros) pero archivos frozen `shared/lib/ie/n{1,2,3,4}/index.ts` NO registran calculators correspondientes. Runtime 07.5.B: compute_ie_n1 dlq=458 + compute_n2/n3/n4 skipped=458 cada → ningún zone_score populado L2-L4.
- **Para qué sirve:** desbloquear IE tier L2-L4 scoring real producción. Sin fix, IE entrega solo N0 + parcial N1 — gap crítico para monetization SaaS.
- **Beneficio concreto:** 458 zones × 4 niveles adicionales = 1832 zone_scores extra + DMX indices re-computables con input completo. IE tier premium funcional.
- **Fase target:** pre-FASE 11 (bloqueante).
- **Estimado:** 3-5 h (investigación + fix + tests + re-compute 07.5.B partial).
- **Ref:** SESIÓN 07.5.B DEUDA D-B-1.

### L-NEW24 — Cleanup Node loader hack scripts/compute

- **Status:** 🟡 deuda técnica, no bloqueante
- **Qué es:** sustituir custom Node loader (`scripts/compute/_ts-resolver.mjs` + `_register-ts-loader.mjs` ~55 LOC) por solución estándar (`tsx` devDep, `esbuild-register`, o refactor frozen code).
- **Para qué sirve:** scripts/compute/*.ts corren con 1 comando estándar, zero loader custom. Reduce superficie mantenimiento + mejor DX.
- **Beneficio concreto:** elimina código experimental Node.js no-convencional.
- **Fase target:** FASE 13 housekeeping post expansión data.
- **Estimado:** 1-2 h (instalar `tsx` devDep + remove `.mjs` + update npm scripts).
- **Ref:** SESIÓN 07.5.B DEUDA D-B-4.

### L-NEW25 — DNA similarity index pgvector (cosine top-k neighbors)

- **Status:** 🟢 lateral upgrade agendado (tipo Spotify "Similar Artists")
- **Qué es:** índice pgvector sobre `colonia_dna_vectors.vector` (HNSW cosine ya creado en schema) + RPC `get_similar_colonias(colonia_id, top_k)` retorna top-10 colonias más similares por cosine distance.
- **Para qué sirve:** feature UX "Zonas similares a Roma Norte" con matching basado en DNA multidimensional (no solo precio o ubicación).
- **Beneficio concreto:** user que busca "como Roma Norte pero más económica" obtiene 10 alternativas con ranking objetivo. Diferenciador vs portales tradicionales (solo filtros precio+zona).
- **Fase target:** FASE 11 N5 (similar zones discovery).
- **Dependencia:** colonia_dna_vectors populated (07.5.C shipped) + HNSW index existente.
- **Estimado:** 2-3 h (RPC + tests + integration UI callback).
- **Ref:** SESIÓN 07.5.C U-C-2.

### L-NEW26 — Pulse streaks detection (hot/cold momentum)

- **Status:** 🟢 lateral upgrade agendado (tipo Strava Segments)
- **Qué es:** función SQL `detect_pulse_streaks(scope_id, min_streak_days=7)` escanea zone_pulse_scores y retorna períodos donde pulse_score creció (hot streak) o decreció (cold streak) consecutivamente. Streak metadata: duration_days, magnitude_delta, start/end dates.
- **Para qué sirve:** alertas tempranas trending zones. UI puede mostrar "Roma Norte en hot streak 14 días" tipo emoji 🔥 Strava.
- **Beneficio concreto:** engagement diario app + storytelling marketing + diferenciador vs portales que solo muestran precio cerrado hoy.
- **Fase target:** FASE 11 pulse features.
- **Estimado:** 2 h (SQL function + tests + integration IE).
- **Ref:** SESIÓN 07.5.C U-C-4.

### L-NEW27 — Zone "Year in Review" Wrapped-style

- **Status:** 🟢 lateral upgrade agendado (tipo Spotify Wrapped)
- **Qué es:** generar highlights anuales per colonia desde zone_pulse_scores 365d: mejor día (peak pulse), peor día (trough), trends dominantes, comparativos vs año anterior. Template markdown/JSON via Haiku LLM (2026-12 anual).
- **Para qué sirve:** marketing storytelling fin-de-año + SEO content per colonia + user retention narrativa.
- **Beneficio concreto:** 210 artículos/stories únicos anuales auto-generados. Contenido orgánico sin esfuerzo manual. Momento PR anual (similar Spotify Wrapped diciembre).
- **Fase target:** FASE 22 marketing automation.
- **Dependencia:** zone_pulse_scores 12 meses acumulados (ship 07.5.C) + LLM Haiku autorizado.
- **Estimado:** 4 h (template + LLM wrapper + scheduler cron + UI landing).
- **Ref:** SESIÓN 07.5.C U-C-5.

### L-NEW28 — Pulse-triggered IE cascade webhook

- **Status:** 🟢 cross-function upgrade agendado
- **Qué es:** trigger postgres sobre zone_pulse_scores INSERT/UPDATE que si pulse_delta > threshold (ej. ±15% daily) encola job re-compute N-scores para esa zone en ie_score_queue. Reusa infra cascade_triggers existente (fase11_xl_cascade_triggers).
- **Para qué sirve:** IE scores always-fresh cuando pulse detecta movement significativo. Elimina cron diario blanket re-compute.
- **Beneficio concreto:** IE responsive a market events real-time (no espera daily batch). Ahorro compute (solo zones con momentum real re-compute).
- **Fase target:** FASE 11 intelligent cascade.
- **Dependencia:** zone_pulse_scores (ship 07.5.C) + registry gap L-NEW23 resuelto.
- **Estimado:** 2 h (trigger SQL + test + integration queue).
- **Ref:** SESIÓN 07.5.C U-C-8.

### L-NEW29 — DMX 15th index reconciliation

- **Status:** 🟡 gap docs vs schema, pre-FASE 11
- **Qué es:** bootstrap 07.5.A-B prometía 15 DMX indices. Schema real (fase11_xl_dmx_indices_schema) define 14 códigos (DEV/FAM/GNT/GRN/IAB/ICO/IDS/IPV/IRE/LIV/MOM/STA/STR/YNG). Investigar si falta 1 índice en schema (aggregate, missing design) o si docs están off-by-one.
- **Para qué sirve:** alinear docs + schema + código + bootstrap narrative para evitar confusion cross-reference futura.
- **Beneficio concreto:** fuente única verdad DMX indices = schema. Zero ambiguity docs vs código.
- **Fase target:** pre-FASE 11 (30 min investigación).
- **Estimado:** 0.5 h (grep schema + docs + decisión: deprecate prompt N=15 O add 15th index).
- **Ref:** SESIÓN 07.5.B DEUDA D-B-2.

---

## Sesión 07.5.D laterales + cross-functions (L-NEW30 - L-NEW37)

Upgrades laterales cross-industry + cross-function DMX modules agendados durante scope sesión 07.5.D (climate + constellations + ghost zones). 8 entradas con destino concreto y formato founder-friendly.

### L-NEW30 — Zone Transit Map interactive (Google Maps transit layer style)

- **Status:** 🟢 lateral upgrade agendado
- **Qué es:** UI interactive graph render usando zone_constellations_edges + clusters como layer sobre Mapbox GL. Nodes = zones, edges = weighted lines per tipo. Click node → panel detail zone. Tipo metro map Tokyo / NYC subway.
- **Para qué sirve:** visualización flujos inter-colonia intuitiva (económicos, demográficos, culturales, adyacencia). User entiende "cómo se conectan las zonas" sin leer data table.
- **Beneficio concreto:** diferenciador UX vs portales tradicionales que solo muestran listings aislados. Moat visual + SEO (mapa indexable).
- **Fase target:** FASE 12 Atlas UX.
- **Dependencia:** zone_constellations_edges populated (ship 07.5.D) + Mapbox GL ya integrado.
- **Estimado:** 6-8 h (component Mapbox layer + interactions + panel + tests).
- **Ref:** SESIÓN 07.5.D U-D-lateral-1.

### L-NEW31 — Ghost Zones Revival Engine (Detroit Renewal / Medellín Escalators style)

- **Status:** 🟢 lateral upgrade agendado — moonshot moat
- **Qué es:** engine que identifica ghost_zones con potential revival (score decreciente pero features latentes positivas) + propone "action playbook" per zona (infra, retail, cultural, fiscal incentives). Playbook basado en case studies reales: Detroit Midtown, Medellín Comuna 13 escalators, Barcelona Raval, Buenos Aires Palermo.
- **Para qué sirve:** proposition única LATAM proptech — DMX no solo reporta ghost zones, propone revivals con evidencia histórica.
- **Beneficio concreto:** unlock enterprise sales municipal/government (SEDATU MX, DNP Colombia) + narrativa PR "we turn ghost zones into opportunity". Moat categoría nueva.
- **Fase target:** FASE 11 R-type game-changer (research heavy).
- **Dependencia:** ghost_zones_ranking + pulse forecasts (07.5.C+D) + case studies research doc.
- **Estimado:** 10-15 h (case studies research + engine + UI module).
- **Ref:** SESIÓN 07.5.D U-D-lateral-2.

### L-NEW32 — Climate Twin Cities global cross-country

- **Status:** 🟢 lateral upgrade agendado — H2 expansion enabler
- **Qué es:** extender climate_twin_matches para cross-country: Roma Norte CDMX ↔ Palermo BA ↔ Chapinero Bogotá basado en climate signatures multidimensionales (temp, humidity, precipitation, seasonality pattern). Requiere climate_zone_signatures populated para colonias CO/AR/BR (H2).
- **Para qué sirve:** expansion story + cross-cultural comparisons para user internacional. "Looking for Palermo vibes but in Mexico? → Roma Norte is your climate twin."
- **Beneficio concreto:** hook marketing expansion H2 + differentiation vs competencia local cada país. Unique story LATAM.
- **Fase target:** FASE 38+ International Expansion H2 (post climate signatures CO/AR/BR).
- **Dependencia:** L-NEW15/16 (seed CO/AR/BR canonical zones) + climate ingest real NOAA/CLIMAT cross-country.
- **Estimado:** 4-6 h (cross-country matching algorithm + UI badge + storytelling).
- **Ref:** SESIÓN 07.5.D U-D-lateral-3.

### L-NEW33 — Constellation Sentiment Alerts (Bloomberg real estate style)

- **Status:** 🟢 lateral upgrade agendado
- **Qué es:** system que monitorea zone_constellations_edges diariamente. Cuando edge pattern cambia >threshold (ej. Roma Norte ↔ Condesa demographic_flow drops 15% semana vs semana), alerta push + email subscribers. Tipo Bloomberg Terminal market events.
- **Para qué sirve:** engagement premium users (brokers, inversionistas) quieren señales tempranas market shifts. Retention driver.
- **Beneficio concreto:** pricing tier justification ($49/mes alerts premium) + daily active usage.
- **Fase target:** FASE 22 marketing automation + FASE 11 alerts engine.
- **Dependencia:** zone_constellations_edges ship 07.5.D + alert infra (WhatsApp L-NEW pendiente/email Resend FASE 22).
- **Estimado:** 5-7 h (monitor job + threshold tuning + alerts delivery).
- **Ref:** SESIÓN 07.5.D U-D-lateral-4.

### L-NEW34 — Ghost Zone Index per alcaldía (policy-maker level)

- **Status:** 🟢 lateral upgrade agendado — B2G enabler
- **Qué es:** agregación ghost_zones_ranking a nivel alcaldía (weighted avg colonias child). Publicación quarterly report "State of Alcaldías CDMX 2026" — Cuauhtémoc 15% ghost, Álvaro Obregón 8%, etc. Tipo SEDATU urban indicators.
- **Para qué sirve:** unlock government/policy sales — alcaldes, SEDATU, INEGI quieren data agregada nivel macro para planning. B2G revenue stream.
- **Beneficio concreto:** contract ticket $50K-200K per alcaldía/año vs $50/mes consumer. Tier enterprise.
- **Fase target:** FASE 22+ enterprise.
- **Dependencia:** ghost_zones_ranking colonia-level ship 07.5.D + reporting template.
- **Estimado:** 3-4 h (aggregation SQL + report template + quarterly cron).
- **Ref:** SESIÓN 07.5.D U-D-lateral-5.

### L-NEW35 — Climate signatures feed IE N1 weather calculator

- **Status:** 🟢 cross-function upgrade agendado
- **Qué es:** IE N1 causal-engine incorporar climate_anomalies como weight adjustment. Ej: colonia en ola de calor (temp >2σ promedio) reduce demand_score proxy 5-10%; ola de frío afecta mobility. Reutiliza cascade_triggers infra existente.
- **Para qué sirve:** IE scoring weather-aware. User ve "Roma Norte score bajó 3pp esta semana por ola de calor" — transparencia causal.
- **Beneficio concreto:** IE más confiable + storytelling explicable + feature distintivo vs portales que ignoran clima.
- **Fase target:** FASE 11 IE N1 enhancement (post L-NEW23 registry gap fix).
- **Dependencia:** climate signatures ship 07.5.D + L-NEW23 registry gap resolved.
- **Estimado:** 3-4 h (calculator logic + cascade wire + tests).
- **Ref:** SESIÓN 07.5.D U-D-cross-1.

### L-NEW36 — Constellations edges power IE N3 zone comparables

- **Status:** 🟢 cross-function upgrade agendado
- **Qué es:** IE N3 property comparables algorithm usar zone_constellations_edges para expand comparable pool. Property en zone A comparable a props en zones conectadas vía cultural_affinity edge weight ≥0.6 (no solo spatial_adjacency). Enriquece pool comparables especialmente en zones recién seeded con pocas transacciones.
- **Para qué sirve:** comparables más robustos + coverage zones low-data. Mejora confiabilidad AVM estimates.
- **Beneficio concreto:** AVM accuracy +5-10% en zones con <50 transacciones histórico. Core IE quality.
- **Fase target:** FASE 11 IE N3 enhancement.
- **Dependencia:** zone_constellations_edges ship 07.5.D + N3 calculator fixed L-NEW23.
- **Estimado:** 4-5 h (algorithm update + A/B tests accuracy + rollout).
- **Ref:** SESIÓN 07.5.D U-D-cross-2.

### L-NEW37 — Ghost zones + climate feed Living Atlas narrative

- **Status:** 🟢 cross-function upgrade agendado
- **Qué es:** Living Atlas markdown stack (ADR-028) consume ghost_zones_ranking + climate_anomalies + transition_probability para narrative stories per zona. Auto-update daily. Formato: "Roma Norte: climate twin Palermo BA · ghost risk 3% · +2°C vs 2010 · constelación con Condesa/Narvarte · transition prob 4% próximos 12m".
- **Para qué sirve:** Living Atlas auto-updated (no manual editing) + SEO content 210 páginas per colonia.
- **Beneficio concreto:** organic traffic driver + 0 content ops cost. SEO moat.
- **Fase target:** FASE 11 Living Atlas dynamic content.
- **Dependencia:** ghost_zones_ranking + climate_signatures ship 07.5.D + Living Atlas UI ready (fase-11.S).
- **Estimado:** 3-4 h (template + markdown generator + scheduled updates).
- **Ref:** SESIÓN 07.5.D U-D-cross-3.

## Sesión 07.5.D carryover + 07.5.E laterales + cross-functions (L-NEW38 - L-NEW45)

Deuda carryover 07.5.D (climate real ingestion) + laterales 07.5.E LLM wiki ecosystem. 8 entradas con destino concreto y formato founder-friendly.

### L-NEW38 — Climate data real ingestion (NOAA/CONAGUA/CLIMAT APIs) — carryover 07.5.D

- **Status:** 🟡 deuda carryover 07.5.D — synthetic data limitations
- **Qué es:** reemplazar `scripts/compute/10_compute-climate-signatures.ts` synthetic-heuristic-v1 con APIs reales: NOAA (global/MX estaciones) + CONAGUA (MX nacional) + CLIMAT (WMO global). Ingest monthly historical 2011-2026 + daily near-realtime. Agregar nueva fuente `climate_noaa` + `climate_conagua` al ingest_allowed_sources.
- **Para qué sirve:** resolver 3 synthetic-data limitations 07.5.D detectadas:
    · Edges overcount +46% (climate component synthetic uniform pull composite arriba threshold)
    · Ghost zones 0>60 threshold (distribución 39-52 flat por calibración CDMX promedio)
    · Twin matches similarity=100 uniforme (signatures casi idénticas por synthetic seed + jitter)
  Real climate data diferencia zones → cada metric hace su trabajo properly.
- **Beneficio concreto:** climate signatures reales (temp anomalías 2011-2026 IPCC tier) + twin matches significativos (Roma Norte ↔ Palermo BA comparable) + ghost zones threshold calibrable a distribución real + anomaly detection accionable (heat waves detectadas).
- **Fase target:** FASE 13 expansión data layer.
- **Dependencia:** NOAA API token (free, requiere registro) + CONAGUA dataset descargas (free) + script extender patrón 02_ingest-macro-banxico-inegi.
- **Estimado:** 6-8 h (NOAA conector + CONAGUA loader + re-run 10_climate con real data + tests).
- **Ref:** SESIÓN 07.5.D deudas D-D-1/2/3.

### L-NEW39 — Wiki Infobox Wikipedia-style per colonia (structured metadata)

- **Status:** 🟢 lateral upgrade agendado
- **Qué es:** además de markdown sections, extraer infobox estructurado: {population, founded_year, elevation_m, climate_type, famous_for, notable_places_json, nearest_metro, area_km2, main_industries}. Render UI: sidebar tipo Wikipedia fichas Roma Norte/Condesa.
- **Para qué sirve:** SEO structured data (Schema.org Place) + users scan rápido datos clave + AI assistants (Bing/Google/Perplexity/ChatGPT) cite infobox autoritativa.
- **Beneficio concreto:** DMX entries aparecen como source en AI-generated answers + organic search + featured snippets Google.
- **Fase target:** FASE 12 Atlas UX + SEO phase.
- **Dependencia:** wiki_entries ship 07.5.E + UI component infobox.
- **Estimado:** 4-5 h (extraction logic + schema + UI component + tests).
- **Ref:** SESIÓN 07.5.E U-E-lateral-1.

### L-NEW40 — Wiki audio narration TTS (accessibility + podcast UX)

- **Status:** 🟢 lateral upgrade agendado
- **Qué es:** convertir wiki entries 8 sections a audio via Anthropic Claude TTS API (o OpenAI fallback). Generar MP3 per colonia × locale. Store Vercel Blob (ADR existente + L-NEW cleanup cubierto).
- **Para qué sirve:** accesibilidad + audio UX (coches, commute, mientras cocinan) + podcast distribution (Spotify/Apple).
- **Beneficio concreto:** nuevo canal distribución (podcasts) + accesibilidad WCAG 2.1 AAA + retention diario (audio daily brief).
- **Fase target:** FASE 22 multimedia content.
- **Dependencia:** wiki_entries ship 07.5.E + TTS API + Vercel Blob storage (L-NEW24 cleanup post).
- **Estimado:** 6-8 h (TTS wrapper + 5 locales × 210 entries = 1050 files · budget $20-30 first run).
- **Ref:** SESIÓN 07.5.E U-E-lateral-2.

### L-NEW41 — Wiki citizen editable with AI pre-review (Wikipedia community model)

- **Status:** 🟢 lateral upgrade agendado
- **Qué es:** UI permite users sugerir edits a wiki entries. AI agent (Haiku) pre-revisa diff vs fuentes DMX + cita evidence + approve/flag_for_review. Moderator approval → merge.
- **Para qué sirve:** moat contenido comunidad (vecinos conocen su colonia mejor que AI) + engagement + differentiator vs portales solo algoritmos.
- **Beneficio concreto:** wiki entries quality mejora 20-30% con context local + comunidad invested en plataforma (retention + UGC).
- **Fase target:** FASE 22+ community features.
- **Dependencia:** wiki_entries + auth users + moderation workflow.
- **Estimado:** 12-15 h (UI edit flow + AI reviewer + moderation queue + diffs).
- **Ref:** SESIÓN 07.5.E U-E-lateral-3.

### L-NEW42 — Wiki embeddings para semantic search "encuentra colonias con vibe X"

- **Status:** 🟢 lateral upgrade agendado
- **Qué es:** embed wiki entries con OpenAI text-embedding-3-large (o Voyage AI) + pgvector index. RPC `search_wiki_semantic(query_text, top_k)` retorna colonias más relevantes. Integrar en global search UI.
- **Para qué sirve:** natural language zone discovery — "colonia bohemia cerca metro con cafés de especialidad" → matches semánticos (no solo keyword).
- **Beneficio concreto:** UX conversacional + differentiator vs filtros tradicionales (rango precio + m²) + hooks AI chat.
- **Fase target:** FASE 11 N5 (similar zones discovery) — ya se menciona pgvector para DNA similarity en L-NEW25.
- **Dependencia:** wiki_entries ship 07.5.E + OpenAI embeddings API + pgvector extension.
- **Estimado:** 4-5 h (embeddings batch + index + RPC + UI integration).
- **Ref:** SESIÓN 07.5.E U-E-lateral-4.

### L-NEW43 — Wiki Q&A chat interface (RAG sobre wiki corpus)

- **Status:** 🟢 lateral upgrade agendado
- **Qué es:** chat UI conversacional sobre wiki corpus. RAG pipeline: user query → embed → retrieve top-5 wiki entries → pass to Haiku → synthesized answer con citations. Tipo Perplexity.
- **Para qué sirve:** natural language discovery — "¿cuál es la colonia más tranquila cerca de Roma Norte con buenos cafés?" respondido conversacional.
- **Beneficio concreto:** conversational UX diferenciador + session time 3-5x vs search tradicional + retention.
- **Fase target:** FASE 22+ chat features.
- **Dependencia:** L-NEW42 embeddings + chat UI infra + Haiku RAG wrapper.
- **Estimado:** 8-10 h (RAG pipeline + chat UI + citations + tests).
- **Ref:** SESIÓN 07.5.E U-E-lateral-5.

### L-NEW44 — Wiki → IE narrative explainer (cross-function IE explainable AI)

- **Status:** 🟢 cross-function upgrade agendado
- **Qué es:** cuando user ve score IE N1/N2/N3/N4 de colonia (ej. Roma Norte N1=78), UI tiene button "¿por qué?" → retrieve wiki entry sección relevante + generate narrative con Haiku explicando contribución factors. Tipo Zillow Zestimate "what affects this estimate".
- **Para qué sirve:** explainable AI sobre IE scoring — reduce fricción trust ("el número es arbitrario" → "estos 5 factores contribuyen Y%").
- **Beneficio concreto:** trust + conversion (users entienden scoring = más commit + share) + feature distintivo (pocos portales explican).
- **Fase target:** FASE 11 IE UX enhancement (post L-NEW23 registry gap fix).
- **Dependencia:** wiki_entries + IE scoring functional (L-NEW23 resolved) + Haiku wrapper.
- **Estimado:** 5-7 h (retrieval logic + narrative template + UI integration).
- **Ref:** SESIÓN 07.5.E U-E-cross-1.

### L-NEW45 — Wiki multi-locale translations sentiment-aware

- **Status:** 🟢 lateral upgrade agendado — H2 expansion enabler
- **Qué es:** generar wiki entries en 5 locales (es-MX base + en-US + pt-BR + es-AR + es-CO) con tono adaptado per region. No machine translation flat — prompt engineering per locale sentiment (formal PT-BR, coloquial AR, neutral MX, profesional EN-US, colombiano CO).
- **Para qué sirve:** local resonance H2 expansion. User en Buenos Aires lee entry Palermo con "che, el barrio" natural, no traducción rígida.
- **Beneficio concreto:** retention usuarios internacionales + diferenciador vs Google Translate portals.
- **Fase target:** FASE 38+ International Expansion H2.
- **Dependencia:** wiki_entries es-MX ship 07.5.E + locale-aware prompt templates + budget ×5 generations.
- **Estimado:** 6-8 h + $5-10 LLM cost per re-generation (5 locales × 210 entries con prompt caching).
- **Ref:** SESIÓN 07.5.E U-E-lateral-6.

### L-NEW46 — Fix Haiku prompt caching cache_control ephemeral TTL (carryover 07.5.E)

- **Status:** 🟡 deuda carryover 07.5.E — U-E-1 caching non-hit detectado post-ejecución
- **Qué es:** script `scripts/compute/13_compute-atlas-wiki-haiku.ts` envía `system` array con 2 bloques `cache_control: { type: 'ephemeral' }` (schema + examples ~1100 tokens), pero 210 requests reportaron `input_cached=0` + `cache_created=0` en TODAS las calls. Cache no activa. Diagnosticar: (a) posible que Anthropic SDK v0.90.0 requiera field explícito extra; (b) posible min-tokens-per-breakpoint regression (threshold ahora 2048 en vez de 1024); (c) order blocks en system array vs messages; (d) system prompts dinámicos invalidando cache key.
- **Para qué sirve:** reducir cost 70-80% en re-generaciones futuras (07.5.F multi-locale × 5 → $8 → $2).
- **Beneficio concreto:** $6 saved per full re-run. Cumulative con L-NEW40 (TTS multi-locale) + L-NEW45 (multi-locale sentiment) × múltiples regeneraciones = $20-50 saved lifetime fase H1.
- **Fase target:** FASE 22 antes Multimedia/Multi-locale.
- **Dependencia:** investigar Anthropic docs actuales cache_control + test mínimo 2-call (first+second) validar cache_creation_input_tokens>0 first y cache_read>0 second.
- **Estimado:** 2-3 h (diagnose + fix + re-run 10 zones validación).
- **Ref:** SESIÓN 07.5.E cache_hit_rate=0.0% post-execution (205/210 calls all input_cached=0).

## Sesión 07.5.F + FASE 07.6 preparación (L-NEW47 - L-NEW49)

### L-NEW47 — FASE 07.6 Product Audit Comprehensive (formal plan ADR-032)

- **Status:** 🔷 AGENDADA FASE formal post-07.5.F shipped — 40h PM wall-clock
- **Qué es:** Fase PM-heavy dedicada a auditoría producto exhaustiva + mapping 160+ features prototype vs DMX actual + crosswalk matrix + design migration plan + RICE priorities + critical path graph + roadmap integration fases 07.5.F→29 + 8 founder decision gates + canonización final. 6 sub-sesiones 07.6.A-F con tags granulares.
- **Para qué sirve:** evitar rework masivo al ejecutar FASE 11.T-Z sin plan integrado post-inputs prototype. Memoria feedback_arquitectura_escalable_desacoplada.md dice "opción más grande dado contexto moonshot".
- **Beneficio concreto:** roadmap formal 07.5.F→29 con features prototype asignadas a fases específicas, design system refreshed (ADR-031), 8 gates founder cerrados, L-NEW backlog consolidado. Unlock ejecución 11.T-Z con plan realista.
- **Fase target:** FASE 07.6 dedicada (entre 07.5 y 11.T-Z).
- **Dependencia:** tag `fase-07.5-ingesta-canonical-complete` shipped (trigger inicio).
- **Estimado:** 40h PM wall-clock (5-6 días) + founder review 3h.
- **Ref:** ADR-032, docs/02_PLAN_MAESTRO/FASE_07.6_PRODUCT_AUDIT.md.

### L-NEW48 — Smoke test E2E integrity canonical pattern per sesión

- **Status:** 🟢 pattern canonizable, agendar post-FASE 07.6
- **Qué es:** sistematizar patrón smoke test E2E implementado en 07.5.F (script e2e-fase-07.5-integration.ts) como pattern canonical reutilizable per sesión futura. Cada sesión ejecuta smoke test zone representativa cross-capas antes de merge.
- **Para qué sirve:** detectar gaps data layer mid-development antes de shipping a main. Zero-tolerance schema drift.
- **Beneficio concreto:** zero rollback post-merge por broken integrations. Confidence ship cada sesión.
- **Fase target:** FASE 24 Observability (infra testing automation).
- **Estimado:** 3-4 h (framework skeleton + integration en CI).
- **Ref:** SESIÓN 07.5.F pattern.

### L-NEW49 — Fix Haiku prompt caching ephemeral TTL (cross-ref L-NEW46)

- **Status:** 🔴 investigación priority, pre-FASE 22 blocker para LLM-heavy features
- **Qué es:** investigar raíz por qué Anthropic SDK 0.90.0 NO aplicó prompt caching en script 13 atlas wiki (U-E-1 feature agregada en 07.5.E tuvo 0% cache hit rate, cost real 3× proyección). Hipótesis a validar: (a) SDK threshold min 2048 tokens/breakpoint; (b) orden blocks system array; (c) system dinámico invalidando cache key; (d) TTL ephemeral incorrecto.
- **Para qué sirve:** reducir cost LLM operations futuras (L-NEW27 Wrapped annual + L-NEW41 audio TTS + L-NEW43 Q&A chat RAG + L-NEW45 multi-locale translations) en 70-80% via caching correcto. Aplicable a 200+ llamadas LLM proyectadas en fases 22-24.
- **Beneficio concreto:** ahorro proyectado $20-50 USD/mes cuando fases 22+ shipped. Feature LLM-heavy factibles económicamente.
- **Fase target:** pre-FASE 22 (1-2 h investigación + 0.5 h fix Anthropic SDK config).
- **Dependencia:** documentación Anthropic prompt caching updated 2026 + review SDK changelog.
- **Estimado:** 2-3 h.
- **Ref:** SESIÓN 07.5.E DEUDA D-E-1 + L-NEW46 tracker.

### L-NEW50 — [SHIPPED 2026-04-24] dmx_indices.scope_id canonical text backfill

- **Status:** ✅ SHIPPED post-07.5.F pre-07.6 — zero deuda
- **Qué es:** Fix schema drift detectado SESIÓN 07.5.F. Tabla `dmx_indices` usaba UUID `zones.id` en `scope_id`; migradas 3192 filas a canonical text `MX-XXX` format consistency con `zone_pulse_scores` / `climate_*` / `constellations` / `ghost`.
- **Para qué sirve:** query cross-tabla ergonómico + E2E integration consistency sin JOIN `zones` intermedio. Single source of truth para scope canonical.
- **Resultado:** Roma Norte by canonical retorna 14 dmx indices (antes 0). 100% filas migradas. Zero regresiones tests (3064 pass + 2 skip).
- **Fase shipped:** pre-FASE 07.6 cleanup.
- **Ref:** PR #48, commit `bf2d9ef`, tag `fix-dmx-canonical-scope`, migration `20260501000000_dmx_indices_canonical_scope_id_backfill`.

---
