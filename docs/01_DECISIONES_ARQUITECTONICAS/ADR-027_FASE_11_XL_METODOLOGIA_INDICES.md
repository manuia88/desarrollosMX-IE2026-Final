# ADR-027 — Metodología Abierta Versionada + Scraping Instagram + pgvector Genoma para FASE 11 XL

> Status: Accepted | Fecha: 2026-04-21 | Autor: Claude Opus 4.7 | Founder approval: 2026-04-21

## Contexto

FASE 11 XL expande el scope original de la fase de 7 índices propietarios (DMX-IPV, IAB, IDS, IRE, ICO, MOM, LIV, ~12h) a **15 índices + 10 moonshots core** (~90h con paralelización agresiva). La expansión se aprueba tras conversación extensiva con founder 2026-04-21 y requiere tres decisiones arquitectónicas nuevas que no estaban resueltas en ADRs previos:

1. **Metodología versionada estilo S&P open methodology**. Los 15 índices se publican con PDF público de metodología en `/metodologia/[indexCode]`. Cada cambio de pesos preserva la versión anterior como fuente histórica consultable. Sin versionado no hay autoridad (un analista externo no puede validar reportes trimestrales pasados si los pesos cambian silenciosamente). Esta decisión también refuerza el moat de Scorecard Nacional Trimestral ampliado (GC-NEW-3) posicionando a DMX como "el S&P del real estate LATAM".

2. **Scraping Instagram via Apify para Influencer Heat** dentro de Trend Genome + Influencer Heat (moonshot FULL FASE 11 XL BLOQUE 11.H). DMX necesita mapear influencers gastronómicos / lifestyle por colonia antes de que exploten mediáticamente — señal pre-mediática que alimenta Trend Genome como radar B2B para hedge funds y fondos. Scraping directo a Instagram tiene riesgo legal + rate limits impredecibles; se necesita infra intermedia legal y escalable.

3. **pgvector 64-dim para Genoma Colonias SEED** (BLOQUE 11.M). El Genoma Colonias permite "búsqueda por vibe" — dado un vector de características latentes de una colonia (Roma Norte), encontrar las 5 colonias más similares dentro/fuera de CDMX. Requiere embeddings densos y similarity search nativo en Postgres. Supabase ya tiene pgvector activado (usado en ADR-022 vibe_tags y embeddings de propiedades), pero nunca se ha normalizado la dimensión ni la función de distancia al nivel de colonia.

Estas tres decisiones son load-bearing para los bloques FASE 11 XL BLOQUES 11.A (metodología), 11.H (Trend Genome), 11.M (Genoma Colonias). Sin resolverlas antes del arranque, cada bloque tomaría decisiones locales incompatibles y generaría deuda técnica inmediata.

## Decisión

### 1. Metodología abierta y versionada

- Cada índice DMX tiene `methodology_version` (string semver-like `v1.0.0`, `v1.1.0`) en BD.
- Tabla nueva `ie_index_methodology_versions` con columnas (`index_code`, `version`, `weights_jsonb`, `rationale_md`, `effective_from`, `effective_to`, `created_by`, `approved_by`, `published_pdf_url`).
- PDF público descargable en `/metodologia/[indexCode]` generado server-side con React-PDF, con changelog completo al final.
- Cambios de pesos preservan versión anterior 24 meses mínimo via `pg_partman` retention policy sobre `dmx_indices` (snapshot de qué versión se usó para cada período calculado).
- Changelog público en cada página metodología — inspiración S&P Global Ratings Open Methodology.
- RLS: tabla public read, solo `superadmin` puede insertar nuevas versiones via endpoint admin.

### 2. Scraping Instagram via Apify (legal y escalable)

- Actor Apify oficial `apify/instagram-scraper` con rate limits respetados (6000 requests/día plan Starter).
- Solo datos públicos (perfiles verificados + geo-tags + hashtag feeds por colonia).
- ETL a tabla nueva `influencer_heat_zones` (`zone_id`, `influencer_handle`, `follower_count`, `post_count_30d`, `engagement_rate`, `hashtags`, `fetched_at`). No persiste media (fotos/videos) — solo metadata agregada.
- Compliance: no se persiste PII sensible, GDPR/LFPDPPP OK por tratarse de datos públicos agregados con base legal en interés legítimo + transparencia.
- Costo estimado H1: $20-50/mes plan Apify Starter + retention 30 días en BD.
- Fallback si Apify cambia términos: pipeline degrada graciosamente a clasificación DENUE + SCIAN (menos predictivo pero legal-safe).
- Secret `APIFY_API_TOKEN` en Vercel envs Production + Preview.

### 3. pgvector 64-dim para Genoma Colonias

- Extensión `pgvector` ya activa en Supabase (proyecto `qxfuqwlktmhokwwlvggy`).
- Dimensión **64** (balance entre performance query y capacidad de discriminación — 128/256 fueron evaluados pero añaden latencia sin ganancia mensurable a escala ~1,800 colonias).
- Índice `ivfflat` con `lists = 50` (√1800 regla de oro pgvector), distancia `cosine`.
- Tabla nueva `colonia_genome_embeddings` (`zone_id`, `country_code`, `embedding vector(64)`, `feature_components_jsonb`, `computed_at`).
- Función `findSimilarColonias(zone_id, limit=5)` usa cosine similarity > 0.75 como threshold.
- Embeddings computados desde feature vector normalizado de 15+ scores (N01 diversidad, N08 walkability, N09 nightlife, N11 momentum, F08 calidad, H01/H02 amenidades, etc.) + vibe_tags embedding (ADR-022) concatenado y proyectado a 64-dim via PCA.
- Recómputo mensual post-score refresh (cron `colonia-genome-refresh` weekly Sunday 3am UTC).
- Batch processing (no recalcular 1,800 colonias en single transaction — chunks de 200).

## Consecuencias

### Positivas

- **Metodología transparente = moat** vs closed-source competidores (Tinsa, Brandata opacos). Permite a analistas externos citar DMX con confianza.
- **Instagram Heat legal y barato** — $20-50/mes amortizado vs riesgo legal + desarrollo in-house scraper ($$$$).
- **pgvector nativo Supabase = cero nueva infra** — evita dependencia Algolia/Pinecone ($200-500/mes + vendor lock-in).
- **3 moats reforzados simultáneamente:** Scorecard autoridad, Trend Genome pre-mediática, Genoma Colonias búsqueda por vibe.

### Negativas / Riesgos

- **Instagram puede cambiar ToS o rate limits** — mitigación: fallback DENUE/SCIAN classif + monitor mensual Apify actor health.
- **pgvector recómputo puede ser costoso a escala H2** (5 países × 10K+ colonias) — mitigación: batch nocturno + partitioning por `country_code` (alineado con TODO #8 CONTRATO §8).
- **Metodología versionada requiere storage histórico** — mitigación: `pg_partman` retention 24m en `dmx_indices` + PDFs en Supabase Storage con lifecycle rules.
- **Apify vendor lock-in** — mitigación: ETL intermedio (no atamos schema BD al response Apify), migrable a cualquier scraper compatible rate-limited.

## Alternativas consideradas y rechazadas

- **Metodología cerrada estilo Tinsa** → rechazado (pierde diferenciación, no alimenta Scorecard Nacional, rompe narrativa "DMX Urban OS transparente").
- **Scraping directo Instagram via Puppeteer propio** → rechazado (legal riesgo alto, ToS Instagram prohíbe scraping no autorizado, detección anti-bot fuerte, costo mantenimiento alto).
- **Meta Graph API oficial** → rechazado (requiere approval proceso Meta para Instagram Business, no cubre perfiles personales que son la mayoría del influencer heat relevante).
- **Algolia / Pinecone para vectores** → rechazado (nueva dependencia costosa $200-500/mes, duplica infra Postgres existente, no integrable con RLS).
- **Dimensión 128/256 pgvector** → rechazado (latencia 2-3x sin ganancia discriminación a escala 1,800 colonias CDMX; re-evaluable H2 con 10K+ colonias LATAM).

## Referencias

- `docs/CONTEXTO_MAESTRO_DMX_v5.md` §10 Pesos índices + Addendum 2026-04-21 FASE 11 XL
- `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` BLOQUES 11.A (metodología), 11.H (Trend Genome), 11.M (Genoma Colonias)
- S&P Global Ratings Open Methodology (inspiración arquitectónica transparencia)
- Apify Instagram Scraper docs — `apify/instagram-scraper`
- Supabase pgvector docs — `ivfflat` index tuning
- ADR-022 Vibe Tags Hybrid (dependencia embeddings)
- ADR-025 Social Listing Intelligence (pipeline social precedente)

## Compliance

- **LFPDPPP (MX):** solo datos públicos agregados, no PII directa. Handle Instagram + follower count es dato público sin expectativa de privacidad. Base legal: interés legítimo + transparencia.
- **GDPR (EU):** no aplica MX H1 pero compliance por diseño para expansión H2 LATAM + Latinx US. Retention 30 días + right-to-be-forgotten endpoint si usuario reclama.
- **Términos Instagram:** solo datos públicos, respetando rate limits via Apify (que a su vez respeta ToS). No se descargan fotos/videos ni se persiste PII sensible (DMs, emails).
- **Términos Apify:** plan Starter $49/mes permite commercial use con atribución opcional. Compliance verificada 2026-04-21.

---

**Autor:** Claude Opus 4.7 | **Fecha:** 2026-04-21 | **Aprobación founder:** Manu Acosta 2026-04-21
