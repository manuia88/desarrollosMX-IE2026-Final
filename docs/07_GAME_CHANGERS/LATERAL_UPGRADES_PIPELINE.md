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
