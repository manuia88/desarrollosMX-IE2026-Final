# FASE 07b — STR Intelligence Complete (H1+H2 colapsado)

> **Duración estimada:** 8-10 sesiones Claude Code (~3-4 semanas calendario con agentes paralelos)
> **Dependencias:** [FASE 07 — Ingesta Datos](./FASE_07_INGESTA_DATOS.md) (provee `macro_series`, SCIAN mapping, `geo_data_points`, orchestrator), [FASE 06 — Seguridad Baseline](./FASE_06_SEGURIDAD_BASELINE.md)
> **Bloqueantes externos:**
> - `AIRROI_API_KEY` — AirROI API pay-as-you-go (~$0.01 USD/call, sin suscripción mínima; alta en https://airroi.com/developers — verificar endpoint definitivo al implementar)
> - Anthropic API key ya existe (FASE 03) — usar Claude Haiku / GPT-4o-mini para NLP sentiment + extracciones
> - `MAPBOX_ACCESS_TOKEN` ya disponible (FASE 07) — geocoding + commute overlays
> - Computer Vision: usar Anthropic Vision o Replicate (CLIP + custom) — decidir en 7b.H
> - Founder debe firmar **cost cap AirROI <$500 USD/mo** durante pre-revenue; sampler=1% dev/staging, 100% prod con alerta cap al 80%
> - Sub-agente de telemetría (FASE 24) debe tener activo el alert `airroi_budget_cap` antes de encender crons 7b.A.2
> **Resultado esperado:** Módulo STR Intelligence completo — ingestor AirROI operativo (`str_listings`, `str_monthly_snapshots`, `str_reviews`, `str_photos_metadata`), 14 bloques funcionales (7b.A → 7b.O) cubriendo scoring básico, viability de inversión, cross-LTR, NLP sentiment + Zone Investment Score (ZIS), detección de hoteles invisibles, mapeo acústico/AQI, super-host tracker, análisis CV de fotos, nomad flow analytics, host migration pipeline, dynamic pricing advisor, breakeven, portfolio optimizer, producto B2B STR Intelligence Reports (4 tiers) y corpus de training H3. Tag `fase-07b-complete`.
> **Priority:** [H1+H2 colapsado — ver ADR-019]

## Contexto y objetivo

El horizonte original de STR Intelligence preveía un stub AirDNA en H1 (plan Enterprise $399+/mes) y un módulo completo STR en H2 alimentado por modelos propietarios. El descubrimiento de AirROI como proveedor pay-as-you-go ($0.01/call, sin suscripción mínima) con cobertura equivalente en ciudades MX principales permite **colapsar H1+H2 en una sola fase (FASE 07b)**. Ver [ADR-019](../01_DECISIONES_ARQUITECTONICAS/ADR-019_STR_MODULE_COMPLETE.md) para rationale completo.

La fase entrega un módulo STR **end-to-end** desde ingesta pay-as-you-go hasta 12 capacidades analíticas + producto B2B empaquetado + corpus de training que habilita H3 (reemplazo progresivo de AirROI por modelos propietarios).

**H3 se mantiene separado y NO se ejecuta aquí**: FASE 07b.O solo **prepara** el corpus de training (snapshots estructurados + feature store inicial). El training real de modelos propietarios que reemplacen AirROI se mantiene fuera de H1/H2 y depende de acumular ≥ 12 meses de datos temporales + presupuesto de compute (>$50K) + señal de revenue que justifique la internalización.

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-7 | Constitutional AI (never hallucinate) | NLP sentiment + review extraction con source_span + confidence threshold + manual review queue | 7b.D, 7b.I |
| GC-27 | Chrome Extension (Lusha pattern) | Captura client-side de listings Airbnb/VRBO como input complementario a AirROI (fallback + audit) | 7b.A (opcional módulo 7b.A.3) |
| GC-18 | Knowledge Graph B2B | STR entities (host, listing, zone, neighborhood) se unen al grafo comercial + zonal | 7b.G, 7b.J |

## Bloques

### BLOQUE 7b.A — STR Score Enhanced (upgrade A)

**Propósito:** Ingestar datos AirROI pay-as-you-go y producir el primer score STR baseline por listing y por zona (occupancy, ADR, RevPAR, listing_score). Sustituye el stub AirDNA original conservando interfaz `market_pulse` para no romper FASE 07.

#### MÓDULO 7b.A.1 — Schema STR + migrations

**Pasos:**
- `[7b.A.1.1]` Migration `str_schema.sql`:
  - `str_listings (listing_id TEXT PK, country_code, platform TEXT CHECK IN ('airbnb','vrbo','booking'), host_id TEXT, zone_id UUID, geom GEOMETRY(Point,4326), bedrooms, bathrooms, capacity, property_type, listing_url, first_seen_at, last_seen_at, status TEXT, meta JSONB, fetched_at TIMESTAMPTZ)`
  - `str_monthly_snapshots (id BIGSERIAL, listing_id, period DATE, occupancy_rate NUMERIC(5,4), adr_minor BIGINT, revpar_minor BIGINT, currency CHAR(3), nights_available INT, nights_booked INT, revenue_minor BIGINT, fetched_at TIMESTAMPTZ, PRIMARY KEY (id, period)) PARTITION BY RANGE (period)` + pg_partman yearly.
  - `str_reviews (id BIGSERIAL, listing_id, reviewer_id TEXT, rating NUMERIC(2,1), text TEXT, language CHAR(2), posted_at DATE, sentiment_score NUMERIC(4,3), source_span TEXT, fetched_at TIMESTAMPTZ, PRIMARY KEY (id, posted_at)) PARTITION BY RANGE (posted_at)` + pg_partman monthly.
  - `str_photos_metadata (id BIGSERIAL, listing_id, photo_url TEXT, order_index SMALLINT, width INT, height INT, cv_labels JSONB, cv_quality_score NUMERIC(4,3), fetched_at TIMESTAMPTZ)`.
- `[7b.A.1.2]` RLS: SELECT público para `str_monthly_snapshots` agregado por zona (view `v_str_zone_monthly`). `str_listings`/`str_reviews` restringido a asesores+; `str_photos_metadata` restringido a dev+ (uso interno scoring).
- `[7b.A.1.3]` Índices: `(zone_id, period DESC)`, `(host_id)`, `(country_code, platform)`.

**E2E Checklist (§6.bis CONTRATO, desde FASE 07+):**
- [ ] audit-dead-ui no aplica (sólo schema); validación en tRPC `strScores.getZoneStats` smoke test.
- [ ] Migration idempotente (re-run seguro).
- [ ] RLS policies testeadas para rol `anon`, `asesor`, `dev`, `superadmin`.

**Dependencias:** FASE 07 (pg_partman activo, `countries`, `zones`).
**Duración estimada:** 0.5 sesión.
**Riesgos:** pgsodium key rotation si reviews contienen PII → usar masked view.

#### MÓDULO 7b.A.2 — Ingestor AirROI + budget cap

**Pasos:**
- `[7b.A.2.1]` Crear `shared/lib/ingest/str/airroi.ts` siguiendo patrón orchestrator FASE 07 (`runIngest(job)`, retry, dedup).
- `[7b.A.2.2]` Endpoints (asumir REST estándar hasta confirmar doc oficial — ver ADR-019 alternativas):
  - `GET /v1/listings?city={city}&page={n}` → listings por ciudad.
  - `GET /v1/listings/{id}/monthly?from={YYYY-MM}&to={YYYY-MM}` → snapshots mensuales.
  - `GET /v1/listings/{id}/reviews` → reviews.
- `[7b.A.2.3]` Auth: header `X-API-Key: $AIRROI_API_KEY`. Rate limit conservador 2 req/s.
- `[7b.A.2.4]` **Budget cap** en `shared/lib/ingest/str/budget-guard.ts`:
  - Tabla `airroi_spend_ledger (date DATE, calls INT, cost_usd NUMERIC(10,4))`.
  - Cada call incrementa ledger. Job rechaza llamadas si `SUM(cost_usd) WHERE month(date)=current_month ≥ $500`.
  - Sampler en dev/staging: `if process.env.NODE_ENV !== 'production' && Math.random() > 0.01 return mock`.
- `[7b.A.2.5]` Trigger.dev cron `airroi_daily` cron `"0 6 * * *"` (6:00 UTC) — refresh delta por ciudad top (CDMX, Monterrey, Guadalajara, Playa del Carmen, Puerto Vallarta, Tulum, Mérida, Querétaro).

**E2E Checklist:**
- [ ] Smoke test: `runIngest({ source: 'airroi', country: 'MX' })` inserta ≥1 row en `str_listings`.
- [ ] Budget guard: test inyecta spend=$499 y verifica siguiente call lanza `airroi_budget_exceeded`.
- [ ] Sentry captura failure con `source=airroi`.

**Dependencias:** 7b.A.1, FASE 07 orchestrator + `ingest_runs`.
**Duración estimada:** 1 sesión.
**Riesgos:** AirROI SLA no enterprise — documentar en ADR-019 consequences; fallback manual admin upload si API down >24h.

#### MÓDULO 7b.A.3 — STR Score baseline

**Pasos:**
- `[7b.A.3.1]` Calculator `features/str-intelligence/lib/scores/str-baseline.ts` produce `str_zone_score` (0-100) ponderando: occupancy_rate (40%), RevPAR vs. benchmark ciudad (30%), revenue volatility 12m (15%), sample_size (15% — confidence).
- `[7b.A.3.2]` Persistir en `zone_scores` (FASE 10) con `score_code='STR-BASELINE'`.
- `[7b.A.3.3]` Exponer tRPC `strScores.getBaseline({ zone_id })` + `strScores.getZoneStats({ zone_id, period })`.

**E2E Checklist:**
- [ ] Test unitario con mock data 3 zonas retorna scores en rango 0-100.
- [ ] UI smoke en `/asesor/zonas/<id>` muestra badge STR baseline.

**Dependencias:** 7b.A.1, 7b.A.2.
**Duración estimada:** 0.5 sesión.
**Riesgos:** confidence bajo en zonas con <10 listings — aplicar confidence cascade FASE 07 (thresholds seed).

---

### BLOQUE 7b.B — STR Investment Viability (upgrade B)

**Propósito:** Calcular ROI anual estimado, cap rate, y breakeven months para un listing o una zona agregada, usando precios secundarios (FASE 07 `market_prices_secondary`) × STR revenue (7b.A) × costos operativos típicos por país.

#### MÓDULO 7b.B.1 — Tabla costos regionales + fórmulas

**Pasos:**
- `[7b.B.1.1]` Tabla seed `str_cost_assumptions (country_code, zone_tier, cleaning_pct NUMERIC, platform_fee_pct NUMERIC, property_mgmt_pct NUMERIC, utilities_monthly_minor BIGINT, property_tax_annual_pct NUMERIC, vacancy_buffer_pct NUMERIC, notes TEXT, PRIMARY KEY (country_code, zone_tier))`.
- `[7b.B.1.2]` Seed valores iniciales MX (valores indicativos, founder a refinar):
  - Tier 1 CDMX Premium: cleaning 12%, platform 15%, pm 20%, utilities $3,500 MXN, property_tax 0.3%, vacancy 8%.
  - Tier 2 CDMX Standard: cleaning 10%, platform 15%, pm 18%, utilities $2,500 MXN, property_tax 0.25%, vacancy 12%.
  - Tier 3 playa (Tulum/PV/Cancún): cleaning 15%, platform 15%, pm 25%, utilities $4,500 MXN, property_tax 0.2%, vacancy 15%.
- `[7b.B.1.3]` Calculator `str-viability.ts`:
  - `gross_revenue_annual = adr × occupancy_rate × 365`
  - `net_revenue = gross × (1 - cleaning - platform - pm - vacancy)` - utilities×12 - tax
  - `cap_rate = net_revenue / property_price`
  - `breakeven_months = property_price / (net_revenue / 12)`

#### MÓDULO 7b.B.2 — tRPC + UI surface

**Pasos:**
- `[7b.B.2.1]` `strViability.getForProperty({ lat, lon, price_minor, bedrooms, baths })` — busca comparables STR en radio 500m, aplica costos del tier, retorna `{ cap_rate, breakeven_months, net_revenue_annual, confidence }`.
- `[7b.B.2.2]` UI Component `<StrViabilityCard />` en `features/str-intelligence/components/` consumido desde ficha proyecto (M02) y Copilot.

**E2E Checklist:**
- [ ] Test: propiedad $4.5M MXN Tulum retorna cap_rate en rango 0.06-0.12.
- [ ] audit-dead-ui: botón "Ver viabilidad STR" mapeado en 03.13.
- [ ] A11y: card navegable keyboard, aria-labels.

**Dependencias:** 7b.A.
**Duración estimada:** 0.75 sesión.
**Riesgos:** cost_assumptions desactualizados → cron trimestral que alerta admin a revisar.

---

### BLOQUE 7b.C — LTR-STR Connection (upgrade V)

**Propósito:** Cross-analizar mercado de renta larga (LTR) vs. renta corta (STR) por zona. Detectar zonas donde STR supera LTR por margen significativo (oportunidad) o donde está saturado/regulado (riesgo).

#### MÓDULO 7b.C.1 — View cross-market

**Pasos:**
- `[7b.C.1.1]` View `v_ltr_str_connection`:
  ```sql
  CREATE VIEW public.v_ltr_str_connection AS
  SELECT zone_id, country_code,
    ltr_monthly_rent_median,              -- desde market_prices_secondary operation='renta'
    str_monthly_revenue_median,           -- desde str_monthly_snapshots agregado
    (str_monthly_revenue_median / NULLIF(ltr_monthly_rent_median,0)) AS str_ltr_ratio,
    CASE
      WHEN str_ltr_ratio >= 2.0 THEN 'str_strongly_outperforms'
      WHEN str_ltr_ratio BETWEEN 1.3 AND 2.0 THEN 'str_outperforms'
      WHEN str_ltr_ratio BETWEEN 0.8 AND 1.3 THEN 'parity'
      ELSE 'ltr_outperforms'
    END AS regime
  FROM ...;
  ```
- `[7b.C.1.2]` Score `str-opportunity-vs-ltr.ts` (0-100) que premia regimes `str_strongly_outperforms` con sample_size alto.
- `[7b.C.1.3]` Alerta regulatoria: tabla `str_zone_regulations (zone_id, country_code, restriction_type TEXT, source_url, effective_date, notes, captured_at)` seeded por admin para CDMX (reglamento alojamiento temporal, próxima entrada en vigor).

**E2E Checklist:**
- [ ] View retorna resultados para CDMX Roma Norte.
- [ ] UI badge "STR supera LTR 1.8x" visible en `/asesor/zonas/<id>`.

**Dependencias:** 7b.A, FASE 07 `market_prices_secondary`.
**Duración estimada:** 0.5 sesión.
**Riesgos:** muestras LTR escasas (Chrome Ext GC-27) → confidence `low` → UI badge "datos limitados".

---

### BLOQUE 7b.D — NLP Sentiment + Zone Investment Score (upgrade W)

**Propósito:** Analizar reviews STR vía NLP (sentiment + tópicos) y componer un Zone Investment Score (ZIS) agregado que mezcla STR performance + sentiment + fundamentals macro/geo.

#### MÓDULO 7b.D.1 — Sentiment pipeline

**Pasos:**
- `[7b.D.1.1]` Worker `shared/lib/str/sentiment-worker.ts` lee batches de `str_reviews WHERE sentiment_score IS NULL`, llama Anthropic Haiku con prompt constitutional AI (GC-7): nunca inventar, extraer `{ sentiment: -1..1, topics: string[], source_span: string, confidence: 0..1 }`, rechaza si `confidence<0.75`.
- `[7b.D.1.2]` Update `str_reviews.sentiment_score` + `meta.topics` JSONB.
- `[7b.D.1.3]` Trigger.dev job `str_sentiment_hourly` procesa 500 reviews/hora (rate limit Anthropic + costo).

#### MÓDULO 7b.D.2 — ZIS composite

**Pasos:**
- `[7b.D.2.1]` Calculator `zone-investment-score.ts` combina:
  - STR Baseline (7b.A) — 30%
  - STR Viability cap_rate (7b.B) — 25%
  - LTR-STR regime (7b.C) — 15%
  - Sentiment agregado zona (promedio ponderado por recency, decaimiento 90d) — 15%
  - Momentum price_per_m2 12m (FASE 10) — 15%
- `[7b.D.2.2]` Persistir en `zone_scores` con `score_code='ZIS'`.
- `[7b.D.2.3]` tRPC `zoneInvestment.get({ zone_id })` + UI `<ZisHeatmap />` en `/asesor/zonas` + `/admin/ingest/str`.

**E2E Checklist:**
- [ ] Test: 100 reviews mock inyectadas → sentiment ≠ NULL tras worker run.
- [ ] UI ZIS heatmap renderiza sin errores para MX.
- [ ] Sentry captura rechazos por confidence<0.75.

**Dependencias:** 7b.A, 7b.B, 7b.C.
**Duración estimada:** 1 sesión.
**Riesgos:** costo Anthropic — cap por día ($20 dev, $100 prod), fallback cola priorizada por volumen reviews.

---

### BLOQUE 7b.E — Invisible Hotel Detection (upgrade X)

**Propósito:** Detectar clusters de listings STR operados por un mismo host (o grupo de hosts relacionados) que funcionan como hoteles no registrados. Input para compliance + señal regulatoria gobierno (producto B2B).

#### MÓDULO 7b.E.1 — Clustering algorithm

**Pasos:**
- `[7b.E.1.1]` Worker `invisible-hotel-detector.ts` corre nightly:
  - Agrupa listings por `host_id`.
  - Busca clusters con ≥5 listings en radio 200m (ST_DWithin geom).
  - Marca `str_invisible_hotels (cluster_id UUID, host_id, zone_id, listing_count INT, center_geom GEOMETRY, detection_method TEXT, confidence NUMERIC, first_detected_at, last_verified_at)`.
- `[7b.E.1.2]` Heurísticas adicionales: nombres de listing con prefijo común (regex), mismo phone número en reviews, mismas photos metadata patterns.
- `[7b.E.1.3]` Dashboard admin `/admin/str/invisible-hotels` con map + list, export CSV para gobierno.

**E2E Checklist:**
- [ ] Cluster test 7 listings mismo host en Condesa → row en `str_invisible_hotels`.
- [ ] audit-dead-ui: botón "Export CSV" conectado a tRPC `adminStr.exportInvisibleHotels`.

**Dependencias:** 7b.A.
**Duración estimada:** 0.75 sesión.
**Riesgos:** falsos positivos (property managers legítimos) → manual review queue admin.

---

### BLOQUE 7b.F — Acoustic Mapping / AQI (upgrade Y)

**Propósito:** Overlay de calidad de aire (AQI desde SINAICA/RAMA FASE 07) y ruido (inferido de reviews STR + 0311 Locatel) por zona — input para livability + warning comprador.

#### MÓDULO 7b.F.1 — Noise signal from reviews

**Pasos:**
- `[7b.F.1.1]` NLP extractor `noise-topic-detector.ts` (Constitutional AI GC-7) clasifica reviews por tópico "ruido/noise" y nivel (alto/medio/bajo). Persistir en `str_reviews.meta.noise_signal`.
- `[7b.F.1.2]` Aggregate `zone_noise_index` mensual: `% reviews mencionan ruido × severidad`.
- `[7b.F.1.3]` Combinar con AQI diario de SINAICA (FASE 07 stub RAMA ahora activado).
- `[7b.F.1.4]` Score `zone-environmental-score.ts` (AQI 50% + noise 50%) → `zone_scores` `score_code='ENV'`.

**E2E Checklist:**
- [ ] UI overlay `<EnvLayer />` en mapa asesor + comprador muestra heatmap.
- [ ] RAMA ingestor stub FASE 07 activado (feature flag `ingest.rama.enabled=true` en prod).

**Dependencias:** 7b.A, 7b.D (pipeline sentiment reutilizable), FASE 07 RAMA/Locatel.
**Duración estimada:** 0.75 sesión.
**Riesgos:** cobertura RAMA limitada a CDMX ZMVM — documentar.

---

### BLOQUE 7b.G — Super-Host Tracker (upgrade Z)

**Propósito:** Ranking de hosts por performance (occupancy, rating, reviews count, portfolio size) + detección de señales de churn (listings que bajan de precio agresivo o desaparecen). Input para producto B2B y para Knowledge Graph (GC-18).

#### MÓDULO 7b.G.1 — Host scoring + churn

**Pasos:**
- `[7b.G.1.1]` Calculator `super-host-score.ts` compone por host: occupancy_rate_avg (40%), avg_rating (25%), reviews_count_normalized (15%), portfolio_size (10%), retention_12m (10%).
- `[7b.G.1.2]` Persistir en `str_hosts (host_id PK, country_code, display_name, listings_count, super_host_score NUMERIC, tier TEXT CHECK ('diamond','gold','silver','bronze'), churn_risk NUMERIC, first_seen_at, last_updated_at, meta JSONB)`.
- `[7b.G.1.3]` Churn signals: listing_count drop 20% en 30d, avg_price drop 15%, status transitions a `inactive`.
- `[7b.G.1.4]` tRPC `strHosts.top({ country_code, zone_id?, limit })` + `strHosts.atRisk({ country_code })`.

**E2E Checklist:**
- [ ] `/admin/str/hosts` lista top 100 hosts con tier + churn badge.
- [ ] Export JSON disponible para producto B2B API.

**Dependencias:** 7b.A.
**Duración estimada:** 0.5 sesión.
**Riesgos:** host_id puede ser anónimo en AirROI — documentar limitaciones.

---

### BLOQUE 7b.H — Photo CV Analysis (upgrade AA)

**Propósito:** Computer vision sobre fotos de listings STR para calcular un quality_score visual (iluminación, composición, amenidades detectables) e insertar features como señal secundaria del scoring baseline.

#### MÓDULO 7b.H.1 — CV pipeline

**Pasos:**
- `[7b.H.1.1]` Worker `photo-cv-worker.ts` descarga batch fotos (`str_photos_metadata WHERE cv_labels IS NULL`), llama Anthropic Vision (o Replicate CLIP) con prompt: extraer labels `{ amenities: string[], room_type: string, quality_dimensions: {lighting:0-1, composition:0-1, resolution_ok:bool}, overall_quality_score: 0-1 }`.
- `[7b.H.1.2]` Constitutional AI (GC-7): nunca inventar amenity no visible; si confidence<0.7 → skip.
- `[7b.H.1.3]` Update `str_photos_metadata.cv_labels` + `cv_quality_score`.
- `[7b.H.1.4]` Aggregate por listing: `str_listings.meta.photo_quality_avg`. Feed al scoring baseline como factor secundario (+/-5%).

**E2E Checklist:**
- [ ] Test 20 fotos mock: cv_quality_score presente en todas, outliers flagged manual review.
- [ ] Cost dashboard admin muestra CV spend mensual.

**Dependencias:** 7b.A.
**Duración estimada:** 1 sesión.
**Riesgos:** costo Vision API escala con fotos — cap mensual $100 dev / $400 prod, sampler aleatorio 20% de fotos por listing.

---

### BLOQUE 7b.I — Nomad Flow Analytics (upgrade BB)

**Propósito:** Inferir demanda de nómadas digitales por zona cruzando Google Trends (search queries nómada relevantes), lenguaje de reviews (multi-idioma + tópicos wifi/coworking/long-stay), y length_of_stay distribution.

#### MÓDULO 7b.I.1 — Nomad demand index

**Pasos:**
- `[7b.I.1.1]` Keywords seed Google Trends (FASE 07 ya ingesta trends): `"nomad <city>"`, `"coworking <city>"`, `"monthly rental <city>"`, `"wifi apartment <city>"`. Cron extiende al conjunto keywords.
- `[7b.I.1.2]` NLP topic detector `nomad-signal.ts` sobre `str_reviews` detecta menciones: wifi, coworking, long_stay, remote_work, fast_internet, digital_nomad. Constitutional AI GC-7.
- `[7b.I.1.3]` Composite `nomad_demand_index` (0-100) por zona: trends 50% + review signals 30% + length_of_stay median 20%.
- `[7b.I.1.4]` Persistir en `zone_scores` `score_code='NOMAD'`.

**E2E Checklist:**
- [ ] Zonas piloto (Condesa, Roma, Tulum, Playa del Carmen, Polanco) retornan scores ≥ 60.
- [ ] UI chip `nomad-friendly` en `/buscar` comprador.

**Dependencias:** 7b.A, 7b.D, FASE 07 Google Trends.
**Duración estimada:** 0.75 sesión.
**Riesgos:** sesgo lenguaje (reviews en inglés sobre-representan nómadas) → weighted por share_of_english.

---

### BLOQUE 7b.J — Host Migration Pipeline (upgrade I)

**Propósito:** Detectar hosts que migran propiedades entre plataformas (Airbnb → VRBO / Booking) — señal de cambio estratégico o de regulación adversa. Feed al Knowledge Graph (GC-18).

#### MÓDULO 7b.J.1 — Cross-platform matcher

**Pasos:**
- `[7b.J.1.1]` Matcher `host-migration.ts` por firma: `hash(geom 10m granularity + bedrooms + bathrooms + capacity + title_tokens)` agrupa candidatos cross-platform.
- `[7b.J.1.2]` Tabla `str_host_migrations (id UUID, from_platform, to_platform, listing_match_from, listing_match_to, first_detected_at, confidence NUMERIC, meta JSONB)`.
- `[7b.J.1.3]` Alerta admin si >10% de hosts de una zona migran en 30d (señal reg).
- `[7b.J.1.4]` Integra al KG B2B GC-18 con edge `host → migrated_to → platform`.

**E2E Checklist:**
- [ ] Match test manual 3 listings cross-platform con confianza ≥0.8.
- [ ] Dashboard admin `/admin/str/migrations` con filtros.

**Dependencias:** 7b.A (requiere AirROI exponer VRBO/Booking además de Airbnb — verificar cobertura en ADR-019; si solo Airbnb, documentar stub para H2 real).
**Duración estimada:** 0.75 sesión.
**Riesgos:** cobertura AirROI multi-plataforma incompleta → fallback Chrome Ext GC-27 en H2.

---

### BLOQUE 7b.K — Dynamic Pricing Advisor (upgrade J)

**Propósito:** Recomendaciones de pricing dinámico estilo Airbnb/PriceLabs para hosts que publican en la plataforma DMX o que son clientes B2B. Output: calendario pricing sugerido 90 días adelante.

#### MÓDULO 7b.K.1 — Demand model + recommender

**Pasos:**
- `[7b.K.1.1]` Tabla `str_events_calendar (zone_id, date, event_name, impact_multiplier NUMERIC, source TEXT)` con eventos seed (F1 CDMX, Semana Santa, Día de Muertos, NFL MX, vacaciones escolares, feriados nacionales).
- `[7b.K.1.2]` Demand model regresión lineal features: day_of_week, month, events × distance, occupancy_zone_trend, lead_time_bucket. Training inicial con últimos 24m de `str_monthly_snapshots` (agregado diario si disponible; si no, interpolar).
- `[7b.K.1.3]` Calculator `dynamic-pricing-advisor.ts` retorna `{ date, suggested_price_minor, confidence, rationale }` para 90 días.
- `[7b.K.1.4]` tRPC `strPricing.suggest({ listing_id | { lat, lon, bedrooms, ... } })`.
- `[7b.K.1.5]` UI `/asesor/str/pricing` con calendar + edit override.

**E2E Checklist:**
- [ ] Calendar retorna 90 días con prices no-null.
- [ ] Manual override salva en `str_pricing_overrides`.

**Dependencias:** 7b.A, 7b.D.
**Duración estimada:** 1 sesión.
**Riesgos:** modelo H1 simple (lineal) — documentar como baseline reemplazable en H3 por XGBoost/LSTM.

---

### BLOQUE 7b.L — Breakeven Calculator (upgrade K)

**Propósito:** Calculadora detallada de breakeven que combina supuestos de financiamiento (enganche, tasa hipotecaria Banxico FASE 07, plazo), costos STR (7b.B), ingresos proyectados (7b.K), y sensibilidad a +/-10% ocupación / ADR.

#### MÓDULO 7b.L.1 — Engine + UI

**Pasos:**
- `[7b.L.1.1]` Calculator `breakeven-detailed.ts` usa:
  - Financiamiento: downpayment_pct, loan_rate (from `macro_series` Banxico SF43878), loan_term_years.
  - Costos: desde 7b.B.
  - Ingresos: desde 7b.K advisor (avg 12m).
  - Output: `breakeven_months`, `cash_on_cash_return_y1..y5`, `stress_test_scenarios (occupancy -10%, adr -10%, rate +200bps)`.
- `[7b.L.1.2]` UI `/asesor/str/breakeven` con 3 sliders + waterfall chart.
- `[7b.L.1.3]` PDF export (usar motor de 7b.N).

**E2E Checklist:**
- [ ] Scenario stress test: breakeven_months aumenta ≥ 10% cuando ocupancy -10%.
- [ ] PDF export 3 páginas con disclaimer metodología.

**Dependencias:** 7b.B, 7b.K, FASE 07 Banxico.
**Duración estimada:** 0.5 sesión.
**Riesgos:** assumptions financieras deben refrescarse mensual — job `breakeven_refresh_params` cron mensual.

---

### BLOQUE 7b.M — Portfolio Optimizer (upgrade M)

**Propósito:** Optimizador multi-listing: dado un presupuesto y criterios (ciudades, tipos), sugiere asignación portfolio (listings a comprar) que maximiza cap_rate con restricciones de diversificación geo.

#### MÓDULO 7b.M.1 — Solver

**Pasos:**
- `[7b.M.1.1]` Solver `portfolio-optimizer.ts` (inicial linear programming — usar `javascript-lp-solver` o equivalente aprobado en stack; si no, heurística greedy con constraints).
- `[7b.M.1.2]` Constraints: budget_total, max_listings_per_zone (diversificación), min_cap_rate, max_risk.
- `[7b.M.1.3]` Output: `{ portfolio: [{listing_id, weight, expected_cap_rate}], total_expected_cap_rate, diversification_score, efficient_frontier_points: [...] }`.
- `[7b.M.1.4]` UI `/asesor/str/portfolio-optimizer` + export PDF.

**E2E Checklist:**
- [ ] Budget $10M MXN retorna portfolio ≥5 listings, cap_rate > zone_avg.
- [ ] Export PDF incluye efficient frontier chart.

**Dependencias:** 7b.B, 7b.K, 7b.L.
**Duración estimada:** 1 sesión.
**Riesgos:** listings individuales AirROI no siempre son comprables — output sugiere "zonas" + "tipos" en vez de listings concretos cuando confidence<0.7.

---

### BLOQUE 7b.N — STR Intelligence Reports (producto B2B nuevo)

**Propósito:** Motor de generación de reportes PDF/dashboard interactivo para los 4 tiers de cliente B2B (individual owner, alcaldía, gobierno CDMX, API broker). Habilita revenue-at-launch producto.

#### MÓDULO 7b.N.1 — Report engine + templates

**Pasos:**
- `[7b.N.1.1]` Engine `features/str-intelligence/reports/engine.ts` con templates HTML → PDF (Puppeteer headless en Vercel function; alternativa: `@react-pdf/renderer`).
- `[7b.N.1.2]` 4 templates:
  - `tier1-individual-owner.tsx`: 1 listing o 1 dirección, 8-12 páginas, foco viability + pricing advisor + comparables.
  - `tier2-alcaldia.tsx`: 1 alcaldía/municipio, 20-30 páginas, foco ZIS + invisible hotels + nomad flow + trends.
  - `tier3-gov-cdmx.tsx`: ciudad completa, 60-90 páginas, anual con quarterly addenda, compliance-ready.
  - `tier4-api-access.tsx`: no PDF — OpenAPI schema `/v1/str/*` endpoints.
- `[7b.N.1.3]` Tabla `str_reports (id UUID, tier SMALLINT, customer_id, scope JSONB, status, generated_at, pdf_url, invoice_ref, meta)`.
- `[7b.N.1.4]` tRPC `strReports.request({ tier, scope })` + `strReports.list({ customer_id })`.
- `[7b.N.1.5]` Dashboard interactivo en FASE 19 Portal Admin (reuso de componentes 7b.A-7b.M).

#### MÓDULO 7b.N.2 — Pricing + compliance

**Pasos:**
- `[7b.N.2.1]` Registrar producto en `feature_registry` con pricing tiers — cross-ref [03.11](../03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md):
  - Tier 1: $500-$2,000 USD/report.
  - Tier 2: $5,000-$15,000 USD/report.
  - Tier 3: $50,000-$150,000 USD/año suscripción.
  - Tier 4: $10,000-$50,000 USD/mes API flat.
- `[7b.N.2.2]` LFPDPPP compliance: data subject rights para property owners — endpoint `strReports.dataSubjectRequest` (access/rectify/delete).
- `[7b.N.2.3]` Disclaimer metodología obligatorio en cada PDF (link `/metodologia/str`).

**E2E Checklist:**
- [ ] Tier 1 mock request genera PDF <60s.
- [ ] audit-dead-ui: botones "Solicitar Report" mapeados para cada tier.
- [ ] RLS: customer Tier 1 no accede reports de otro customer.

**Dependencias:** 7b.A a 7b.M.
**Duración estimada:** 1.5 sesiones.
**Riesgos:** PDF generation cost (Puppeteer memory) — mover a background queue + email notification.

---

### BLOQUE 7b.O — Training Corpus Preparation (H3 setup)

**Propósito:** Preparar el dataset estructurado (features + labels) que servirá para entrenar modelos propietarios en H3 que reemplacen progresivamente a AirROI (y a GPT-4o-mini en BBVA PDF extract). **NO entrena aquí** — solo exporta corpus versionado + feature store baseline.

#### MÓDULO 7b.O.1 — Feature store + export

**Pasos:**
- `[7b.O.1.1]` Tabla `ml_training_snapshots (id UUID, corpus_name TEXT, version TEXT, schema_hash TEXT, row_count BIGINT, s3_path TEXT, created_at, meta JSONB)`.
- `[7b.O.1.2]` Job `training-corpus-export` (cron mensual) materializa snapshots desde `str_listings + str_monthly_snapshots + str_reviews + str_photos_metadata + zone_scores` en formato Parquet con partición mensual.
- `[7b.O.1.3]` Upload a bucket privado Supabase Storage `ml-corpus/` con retención 5 años.
- `[7b.O.1.4]` Documentar en `docs/05_OPERACIONAL/05.6_DATA_RETENTION_POLICY.md` que `ml-corpus` es data interna DMX (no compartible sin ADR nuevo).

#### MÓDULO 7b.O.2 — Ground truth labels

**Pasos:**
- `[7b.O.2.1]` Para modelos de pricing: label = `adr_actual` × `occupancy_actual` del mes siguiente (serve as train target).
- `[7b.O.2.2]` Para sentiment: label = human-verified sentiment en muestra 5% reviews (admin UI `/admin/str/labeling`).
- `[7b.O.2.3]` Split train/val/test 70/15/15 determinista por hash(listing_id).

**E2E Checklist:**
- [ ] Primer snapshot exportado >10GB con metadata completa.
- [ ] UI labeling operativa con ≥100 reviews labeled para seed.

**Dependencias:** 7b.A, 7b.D.
**Duración estimada:** 0.75 sesión.
**Riesgos:** storage cost → cron de archival a cold storage a >12 meses.

---

## Criterios de aceptación FASE 07b

- [ ] **F-07b-01** Schema STR completo (`str_listings`, `str_monthly_snapshots`, `str_reviews`, `str_photos_metadata`, `str_hosts`, `str_host_migrations`, `str_invisible_hotels`, `str_cost_assumptions`, `str_events_calendar`, `str_reports`, `ml_training_snapshots`) + RLS.
- [ ] **F-07b-02** Ingestor AirROI operativo con budget guard $500/mo + ledger `airroi_spend_ledger`.
- [ ] **F-07b-03** STR Baseline score calculable por zona + listing.
- [ ] **F-07b-04** STR Viability (cap_rate, breakeven) funcional en UI asesor.
- [ ] **F-07b-05** LTR-STR connection view + score operativo.
- [ ] **F-07b-06** NLP sentiment + ZIS score persisted.
- [ ] **F-07b-07** Invisible hotel detector con dashboard admin.
- [ ] **F-07b-08** Acoustic/AQI overlay + RAMA stub FASE 07 activado.
- [ ] **F-07b-09** Super-host tracker con tiers + churn.
- [ ] **F-07b-10** Photo CV worker con quality_score integrado al baseline.
- [ ] **F-07b-11** Nomad flow analytics operativo.
- [ ] **F-07b-12** Host migration pipeline con dashboard.
- [ ] **F-07b-13** Dynamic pricing advisor con calendario 90d.
- [ ] **F-07b-14** Breakeven calculator detallado + stress test.
- [ ] **F-07b-15** Portfolio optimizer con eficient frontier.
- [ ] **F-07b-16** STR Intelligence Reports — 4 tiers (Tier1/Tier2/Tier3/Tier4 API) funcionales con pricing gated.
- [ ] **F-07b-17** Training corpus export mensual + UI labeling admin.
- [ ] **F-07b-18** Cost cap AirROI enforced + alert sub-agente telemetría.
- [ ] **F-07b-19** Documentación `/metodologia/str` pública.
- [ ] **F-07b-20** Tag git `fase-07b-complete`.

## E2E Verification Checklist

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-07b-complete`.

- [ ] Todos los botones UI (StrViabilityCard, ZisHeatmap, EnvLayer, Pricing Calendar, Breakeven sliders, Portfolio Optimizer, Report Request) mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md).
- [ ] Todos los tRPC procedures (`strScores.*`, `strViability.*`, `strHosts.*`, `strPricing.*`, `strReports.*`, `zoneInvestment.*`) implementados sin stubs.
- [ ] Todas las migrations aplicadas + idempotentes.
- [ ] Triggers cascade STR → FASE 10 IE Scores testeados.
- [ ] Permission enforcement validado: anon (solo agregados view), asesor (listings + viability), dev (+ CV), superadmin (+ invisible hotels + migrations).
- [ ] Loading + error + empty states implementados en todos los components.
- [ ] Mobile responsive verificado en dashboards STR.
- [ ] Accessibility WCAG 2.1 AA (contraste heatmaps, keyboard nav calendar).
- [ ] `audit-dead-ui.mjs` 0 violations.
- [ ] Playwright smoke: request Tier 1 report end-to-end (request → PDF URL).
- [ ] PostHog eventos `str_report_requested`, `str_pricing_viewed`, `zis_heatmap_interaction`.
- [ ] Sentry captura errors con tag `feature=str-intelligence`.
- [ ] STUBs marcados con `// STUB — activar FASE 07b.X` si quedan.
- [ ] Sub-agente telemetría (FASE 24) expone panel `airroi_budget` con alerta 80%.

## Features implementadas en esta fase (≈ 20)

1. **F-07b-01** Schema STR + particionamiento pg_partman + RLS tiered
2. **F-07b-02** Ingestor AirROI pay-as-you-go + budget guard $500/mo
3. **F-07b-03** STR Baseline score (occupancy + RevPAR + volatility)
4. **F-07b-04** STR Investment Viability (cap_rate + breakeven) + seed costos MX
5. **F-07b-05** LTR-STR Connection view + regime classifier
6. **F-07b-06** NLP Sentiment worker (Constitutional AI GC-7) + ZIS composite
7. **F-07b-07** Invisible Hotel Detection + admin dashboard + CSV export
8. **F-07b-08** Acoustic Mapping + AQI overlay (RAMA activación)
9. **F-07b-09** Super-Host Tracker + tier + churn
10. **F-07b-10** Photo CV Analysis + quality_score feed scoring baseline
11. **F-07b-11** Nomad Flow Analytics (Trends + reviews NLP + length_of_stay)
12. **F-07b-12** Host Migration Pipeline cross-platform + alertas
13. **F-07b-13** Dynamic Pricing Advisor 90d + events calendar
14. **F-07b-14** Breakeven Calculator detallado + stress test
15. **F-07b-15** Portfolio Optimizer (LP solver) + efficient frontier
16. **F-07b-16** STR Intelligence Reports — Tier 1 (Individual Owner PDF)
17. **F-07b-17** STR Intelligence Reports — Tier 2 (Alcaldía PDF)
18. **F-07b-18** STR Intelligence Reports — Tier 3 (Gobierno CDMX anual + quarterly)
19. **F-07b-19** STR Intelligence Reports — Tier 4 (API Broker flat)
20. **F-07b-20** Training Corpus export + feature store + labeling UI (H3 seed)

## Próxima fase

[FASE 08 — IE Scores Nivel 0](./FASE_08_IE_SCORES_N0.md) — STR inputs completos ahora disponibles desde `zone_scores` score_codes `STR-BASELINE`, `ZIS`, `NOMAD`, `ENV`.

---

**Autor:** Claude Opus 4.7 (biblia v2.1 pivot AirROI) | **Fecha:** 2026-04-18
**ADR referencia:** [ADR-019 STR Module Complete](../01_DECISIONES_ARQUITECTONICAS/ADR-019_STR_MODULE_COMPLETE.md)
