# FASE 11 — Índices DMX Propietarios (7 índices)

> **Duración estimada:** 3 sesiones Claude Code (~12 horas con agentes paralelos)
> **Dependencias:** FASE 08 (N0 + N01-N11), FASE 09 (N1: F08, F09, A12), FASE 10 (N2: F09 Value Score)
> **Bloqueantes externos:**
> - Todos los scores que entran en cada índice deben existir en `zone_scores` para al menos 1 zona CDMX.
> - `dmx_indices.index_code` CHECK debe incluir los 7 códigos: `IPV, IAB, IDS, IRE, ICO, MOM, LIV` (ya migrated FASE 01; validar).
> - `supported_cities` con al menos CDMX seed (para agrupación por ciudad).
> - Resend API key activa (newsletter mensual + trimestral).
> **Resultado esperado:** Los 7 índices DMX (IPV, IAB, IDS, IRE, ICO, MOM, LIV) calculándose con pesos exactos del CONTEXTO §10, persistiendo en `dmx_indices`, con rutas públicas `/indices` (rankings) y `/metodologia` (explicación abierta estilo S&P). Cron `dmx_indices_monthly` + `monthly_index_newsletter` + `annual_wrapped`. Tag `fase-11-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Los 7 índices DMX son la capa agregada y licenciable del IE. No son scores atómicos sino combinaciones propietarias con pesos fijos y metodología abierta (diferenciador DMX vs competidores closed). Son el producto que se publicita externamente ("DMX Momentum Index Q1 2026: Narvarte lidera"), lo que termina en medios, y la puerta de entrada a 3 productos B2B (Livability API, Momentum Index, Risk Score).

Esta fase construye:
1. Los 7 calculators con pesos exactos.
2. Schema CHECK correcto en `dmx_indices`.
3. Calendario de publicación: DMX-MOM mensual, los 7 trimestral, DMX Wrapped anual.
4. Rutas públicas `/indices` y `/metodologia` (sin auth, SEO-friendly, shareable).
5. Cron + newsletter.

## Bloques

### BLOQUE 11.A — Schema y fundación

#### MÓDULO 11.A.1 — Migration `dmx_indices` schema

**Pasos:**
- `[11.A.1.1]` Crear migration `supabase/migrations/xxxx_dmx_indices_schema.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS dmx_indices (
    id uuid primary key default gen_random_uuid(),
    index_code text not null check (index_code in ('IPV','IAB','IDS','IRE','ICO','MOM','LIV')),
    scope_type text not null check (scope_type in ('zone','colonia','alcaldia','city','country')),
    scope_id text not null,
    country_code text not null default 'MX',
    period_date date not null,
    period_type text not null check (period_type in ('monthly','quarterly','annual')),
    value numeric(6,2) not null,
    components jsonb not null,
    inputs_used jsonb not null,
    confidence text not null check (confidence in ('high','medium','low','insufficient_data')),
    ranking_in_scope int,
    percentile numeric(5,2),
    trend_vs_previous numeric(6,2),
    trend_direction text,
    calculated_at timestamptz not null default now(),
    UNIQUE(index_code, scope_type, scope_id, country_code, period_date, period_type)
  );
  CREATE INDEX idx_dmx_indices_scope ON dmx_indices(country_code, scope_type, scope_id, period_date DESC);
  CREATE INDEX idx_dmx_indices_ranking ON dmx_indices(index_code, country_code, period_date DESC, ranking_in_scope);
  ALTER TABLE dmx_indices ENABLE ROW LEVEL SECURITY;
  CREATE POLICY indices_public_read ON dmx_indices FOR SELECT USING (true);
  CREATE POLICY indices_service_write ON dmx_indices FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```
- `[11.A.1.2]` Verificar con `supabase db diff` que CHECK permite los 7 códigos.

**Criterio de done del módulo:**
- [ ] `INSERT INTO dmx_indices (index_code, …) VALUES ('MOM', …)` pasa check.
- [ ] RLS permite SELECT a anon (rutas públicas funcionarán).

#### MÓDULO 11.A.2 — Registry entries

**Pasos:**
- `[11.A.2.1]` Agregar en `SCORE_REGISTRY` los 7 índices como entries `level: 'index'` (extender interface con `IndexRegistryEntry`).
- `[11.A.2.2]` Exponer helper `getIndexById('DMX-MOM')`.

**Criterio de done del módulo:**
- [ ] 7 entries nuevos en registry con paths correctos.

### BLOQUE 11.B — Calculators de los 7 índices

#### MÓDULO 11.B.1 — DMX-IPV (Índice Precio-Valor)

**Pasos:**
- `[11.B.1.1]` Crear `shared/lib/intelligence-engine/indices/ipv.ts`. Fórmula exacta:
  ```
  IPV = F08 × 0.30 + F09 × 0.25 + N11 × 0.20 + A12 × 0.15 + N01 × 0.10
  ```
- `[11.B.1.2]` Input: `{ scope: 'colonia', scopeId, periodDate }`. Queries `zone_scores` con scope_id + period actual. Si falta algún score → usar último disponible ≤90 días y marcar `confidence='medium'`.
- `[11.B.1.3]` Calcula ranking y percentil contra todas las colonias CDMX.
- `[11.B.1.4]` Dependencias cascade: al recalcularse F08/F09/N11/A12/N01 → enqueue IPV.

**Criterio de done del módulo:**
- [ ] Del Valle IPV ≈82 con confidence=high.
- [ ] Ranking retornado consistente (same inputs → same ranking).

#### MÓDULO 11.B.2 — DMX-IAB (Absorción Benchmark)

**Pasos:**
- `[11.B.2.1]` `indices/iab.ts`. Fórmula:
  ```
  IAB = B08_absorcion_zona_avg / benchmark_cdmx_absorcion × 50
  ```
  (clamp 0-100 vía `Math.min(100, Math.max(0, val))`).
- `[11.B.2.2]` `benchmark_cdmx_absorcion` se calcula como media de B08 de todos los proyectos activos CDMX último trimestre.
- `[11.B.2.3]` Tier 3 (requiere B08 en ≥50 proyectos).

**Criterio de done del módulo:**
- [ ] CDMX media IAB ≈50; zonas calientes >70.

#### MÓDULO 11.B.3 — DMX-IDS (Desarrollo Social Integrado)

**Pasos:**
- `[11.B.3.1]` `indices/ids.ts`. Fórmula:
  ```
  IDS = F08×0.25 + H01×0.15 + H02×0.10 + N01×0.15 + N02×0.15 + F01×0.10 + F02×0.10
  ```
- `[11.B.3.2]` Componente ponderado para identificar zonas con mayor "tejido social".

**Criterio de done del módulo:**
- [ ] Coyoacán centro IDS ≥80.

#### MÓDULO 11.B.4 — DMX-IRE (Riesgo Estructural)

**Pasos:**
- `[11.B.4.1]` `indices/ire.ts`. Fórmula inversa (mayor = menos riesgo):
  ```
  IRE = 100 − (H03×0.30 + N07×0.20 + F01_inv×0.20 + F06_inv×0.15 + N05_inv×0.15)
  ```
  Donde `_inv = 100 − score`. H03/N07 ya son riesgo directo (mayor=peor) — ajustar signos.
- `[11.B.4.2]` Componente del producto B2B "DMX Risk Score" (aseguradoras).
- `[11.B.4.3]` Components: `riesgos_componente: [{ sismico, hidrico, social, uso_suelo, infraestructura }]`.

**Criterio de done del módulo:**
- [ ] Tlalpan laderas IRE <35.

#### MÓDULO 11.B.5 — DMX-ICO (Costo Oportunidad)

**Pasos:**
- `[11.B.5.1]` `indices/ico.ts`. Fórmula:
  ```
  yieldInmobiliario = renta_mensual_avg × 12 / precio_m2 × 100   // % anual
  yieldCetes        = macro_series[cetes_28d].value
  ICO = (yieldInmobiliario − yieldCetes) / yieldCetes × 50 + 50
  ```
  Clamp 0-100.
- `[11.B.5.2]` Requiere `market_prices_secondary` con rentas + compras.

**Criterio de done del módulo:**
- [ ] Zonas con yield 8% vs Cetes 10% → ICO <50 (inmueble peor que Cetes); zonas con yield 12% → ICO ≥75.

#### MÓDULO 11.B.6 — DMX-MOM (Momentum Index)

**Pasos:**
- `[11.B.6.1]` `indices/mom.ts`. Fórmula:
  ```
  MOM = N11_dmx_momentum_index (índice mensual agregado)
  ```
  Es la elevación a índice mensual publicable de N11. Normaliza 0-100 vs universo CDMX.
- `[11.B.6.2]` Publicación mensual día 5 (cron).
- `[11.B.6.3]` Producto B2B "DMX Momentum Index" (fondos, bancos).

**Criterio de done del módulo:**
- [ ] Top 10 colonias Momentum CDMX mostradas en /indices.

#### MÓDULO 11.B.7 — DMX-LIV (Livability Index)

**Pasos:**
- `[11.B.7.1]` `indices/liv.ts`. Fórmula:
  ```
  LIV = F08×0.30 + N08×0.15 + N01×0.10 + N10×0.05 + N07×0.10 + H01×0.10 + H02×0.05 + N02×0.10 + N04×0.05
  ```
- `[11.B.7.2]` Producto B2B "DMX Livability API" (portales, fintechs).

**Criterio de done del módulo:**
- [ ] Del Valle LIV ≈85; Iztapalapa Sur LIV <50.

### BLOQUE 11.C — Orquestador cálculo masivo + triggers

#### MÓDULO 11.C.1 — Orchestrator `calculateAllIndices()`

**Pasos:**
- `[11.C.1.1]` Crear `shared/lib/intelligence-engine/indices/orchestrator.ts` con `calculateAllIndicesForScope({ countryCode, scopeType, scopeId, periodDate, periodType })` que corre los 7 índices en paralelo (Promise.all) y persiste.
- `[11.C.1.2]` Calcula ranking + percentil en segundo paso (requiere todos los scope_ids calculados primero).
- `[11.C.1.3]` Batch: `calculateAllIndicesForCDMXColonias(periodDate)` corre para ~200 colonias CDMX.

**Criterio de done del módulo:**
- [ ] Ejecutar para CDMX 200 colonias × 7 índices = 1400 filas `dmx_indices` en <60s.

#### MÓDULO 11.C.2 — Cron `dmx_indices_monthly`

**Pasos:**
- `[11.C.2.1]` Crear `app/api/cron/dmx-indices-monthly/route.ts`. Ejecuta día 5 de cada mes a las 06:00 CDMX → corre DMX-MOM para todas las colonias + calcula rankings.
- `[11.C.2.2]` Cron `dmx_indices_quarterly` día 5 post-trimestre: corre los 7 índices completos.
- `[11.C.2.3]` Registrar en `vercel.json`:
  ```json
  { "path": "/api/cron/dmx-indices-monthly",   "schedule": "0 12 5 * *" },
  { "path": "/api/cron/dmx-indices-quarterly", "schedule": "0 12 5 1,4,7,10 *" },
  { "path": "/api/cron/annual-wrapped",        "schedule": "0 12 1 1 *" }
  ```

**Criterio de done del módulo:**
- [ ] Correr manualmente el cron → filas escritas en `dmx_indices` con period_type='monthly'.

#### MÓDULO 11.C.3 — Trigger recalc en cambios N11

**Pasos:**
- `[11.C.3.1]` Cuando `zone_scores` UPDATE con score_type='n11_dmx_momentum_index' → cascade `enqueue_score_recalc('DMX-MOM', 'colonia', colonia_id)`. Idem para los otros índices cuando sus componentes cambian.

**Criterio de done del módulo:**
- [ ] Update N11 en Nápoles → MOM de Nápoles aparece en queue.

### BLOQUE 11.D — Rutas públicas `/indices` y `/metodologia`

#### MÓDULO 11.D.1 — Ruta `/indices` (rankings públicos)

**Pasos:**
- `[11.D.1.1]` Crear `app/(public)/indices/page.tsx` (server component, ISR revalidate 3600s). Tabs para los 7 índices. Por tab:
  - Hero: nombre índice, período vigente, descripción corta.
  - Tabla top 20 colonias con `{ ranking, colonia, value, trend_vs_previous, confidence }`.
  - Mapa coropleto CDMX con coloración por valor.
  - Selector periodo (últimos 12 meses).
- `[11.D.1.2]` SEO: meta tags per tab, OpenGraph con imagen pre-generada (auto-share), JSON-LD `Dataset` schema.
- `[11.D.1.3]` Social share buttons WhatsApp + Twitter + LinkedIn con auto-texto "Del Valle lidera DMX-MOM Marzo 2026 (+8%)".

**Criterio de done del módulo:**
- [ ] `/indices/dmx-mom` carga en <500ms (ISR cache).
- [ ] Mapa interactivo con Mapbox.
- [ ] Compartir en WhatsApp genera preview imagen.

#### MÓDULO 11.D.2 — Ruta `/metodologia` (descripción abierta S&P style)

**Pasos:**
- `[11.D.2.1]` Crear `app/(public)/metodologia/page.tsx` y subrutas `/metodologia/[indexCode]`.
- `[11.D.2.2]` Por índice incluye:
  - Descripción qué mide.
  - Fórmula con pesos (mostrar tabla visual de ponderaciones).
  - Fuentes de datos usadas (lista con links oficiales: SIGED, FGJ, SACMEX, etc.).
  - Ejemplo cálculo paso a paso para una colonia específica (Narvarte).
  - Frecuencia de publicación.
  - Disclaimer: "DMX Indices no sustituyen asesoría profesional inmobiliaria/financiera".
  - Changelog de metodología (si pesos cambian en v2).
- `[11.D.2.3]` Descarga PDF metodología completa (gen on-demand con React-PDF).
- `[11.D.2.4]` SEO: schema.org `ScholarlyArticle` para cada índice.

**Criterio de done del módulo:**
- [ ] `/metodologia/dmx-mom` muestra fórmula con pesos visuales.
- [ ] PDF download funcional.
- [ ] Lighthouse SEO score ≥95.

#### MÓDULO 11.D.3 — Reporte trimestral "DMX Índice de Colonias CDMX Q#"

**Pasos:**
- `[11.D.3.1]` Generador cron `quarterly_market_report` que genera PDF con:
  - Portada, resumen ejecutivo (auto IA).
  - Top 10 colonias en cada índice.
  - Movilidad (entradas/salidas top 10).
  - Gráficas evolución 12m de los 7 índices.
  - Metodología resumida.
- `[11.D.3.2]` Published en `/reports/trimestral-Q1-2026.pdf` + email a newsletter list.

**Criterio de done del módulo:**
- [ ] PDF generado en <2 min.

### BLOQUE 11.E — Newsletter + Wrapped

#### MÓDULO 11.E.1 — Newsletter mensual día 5

**Pasos:**
- `[11.E.1.1]` Cron `monthly_index_newsletter` día 5 a las 09:00 CDMX. Usa Resend `broadcasts` → subject "DMX Momentum Marzo 2026 — Narvarte lidera (+8%)".
- `[11.E.1.2]` Template MJML en `emails/monthly-mom.mjml`: hero con top 5, mini mapa, 2 párrafos AI commentary.
- `[11.E.1.3]` Subscribers: tabla `newsletter_subscribers` (public sign-up form en `/indices` footer).

**Criterio de done del módulo:**
- [ ] Envío real a lista seed (al menos Manu).

#### MÓDULO 11.E.2 — DMX Wrapped anual

**Pasos:**
- `[11.E.2.1]` Cron `annual_wrapped` 1 enero 09:00. Genera reportes viralizables estilo Spotify Wrapped:
  - "Top 10 colonias Momentum 2026".
  - "Tu zona subió X% en Livability desde que compraste" (personalizado si user logged).
  - "La colonia sorpresa 2026: [nombre]".
- `[11.E.2.2]` Compartible: página `/wrapped/2026` + stickers imagen auto-gen.

**Criterio de done del módulo:**
- [ ] `/wrapped/2026` renderiza personalizado con 10+ cards.

## Criterio de done de la FASE

- [ ] 7 índices DMX calculándose para CDMX (mínimo 1 zona por tipo de scope).
- [ ] `dmx_indices` poblada con al menos 1 período vigente para los 7 códigos.
- [ ] Rutas `/indices` y `/metodologia` deployadas y accesibles sin auth.
- [ ] Reporte trimestral PDF generador funcional.
- [ ] Newsletter mensual Resend con ≥1 envío de prueba.
- [ ] DMX Wrapped endpoint `/wrapped/2026` renderiza correctamente.
- [ ] Crons `dmx_indices_monthly`, `dmx_indices_quarterly`, `annual_wrapped` activos en `vercel.json`.
- [ ] SEO: meta + JSON-LD + OpenGraph en `/indices` y `/metodologia`.
- [ ] Tag git: `fase-11-complete`.
- [ ] Documentación: `docs/03_CATALOGOS/03.11_CATALOGO_PRODUCTOS_B2B.md` refleja Momentum Index / Livability API / Risk Score como "powered by" cada índice.

## Próxima fase

[FASE 12 — IE AI Scores N5 + Intelligence Cards + Mapa 7 Capas](./FASE_12_IE_AI_SCORES_N5.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17
