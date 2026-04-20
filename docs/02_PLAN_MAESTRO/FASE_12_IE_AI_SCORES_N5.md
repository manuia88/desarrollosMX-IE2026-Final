# FASE 12 — IE AI Scores Nivel 5 + Intelligence Cards + Mapa 7 Capas

> **Duración estimada:** 6 sesiones Claude Code (~24 horas con agentes paralelos)
> **Dependencias:** FASE 08 (AVM MVP), FASE 09 (N1), FASE 10 (N2/N3), FASE 11 (índices DMX), FASE 03 (AI shell + Copilot), FASE 04 (Design System)
> **Bloqueantes externos:**
> - `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` activas con créditos.
> - Vercel AI Gateway configurado (FASE 03).
> - `ai_prompt_versions` con al menos 10 prompts versionados para N5.
> - `MAPBOX_ACCESS_TOKEN` con token público y privado.
> - `geo_data_points` con datos reales ingestados (FASE 07) para las 7 capas del mapa.
> - `ai_usage_tracking` y `ai_coaching_log` tablas creadas.
> **Resultado esperado:** 7 scores N4 (E01, G01, E02, E03, E04, D09, D02) + 26 scores N5 AI implementados (generados on-demand o por cron, persistidos en `ai_generated_content`). Intelligence Cards (4 niveles predio/manzana/colonia/alcaldía + Comparador + Risk + Investment) (UPG 7.7). Mapa Inteligente 7 capas Mapbox (UPG 7.8). Ruta `/mapa` (asesor/dev/admin) + `/explorar` (público simplificado). Coste AI monitoreado + fallbacks. Citations cascade obligatorias en N5. Tag `fase-12-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El Nivel 5 es la capa AI del IE: scores que usan LLM para generar contenido narrativo con fundamento cuantitativo. A diferencia de los niveles 0-3 que son deterministas, los N5 generan texto/imágenes/reportes pero SIEMPRE con citations verificables de fuentes y scores cuantitativos del propio IE (no alucinan valores).

Esta fase cubre tres componentes críticos:
1. **26 N5 scores AI**: ASESOR (C02/C05/C08), AGREGADOS (E05/E06/E07/E08), FULL SCORE (G02/G03/G04/G05), MERCADO (D01/D08/D10), ZONA (F11/F13/F14/F16/F17), PRODUCTOS (I01-I06). Más 7 N4 complementarios.
2. **Intelligence Cards** (UPG 7.7): UI en 4 niveles jerárquicos (predio/manzana/colonia/alcaldía) + 3 tipos especializados (Comparador, Risk, Investment).
3. **Mapa Inteligente 7 capas** (UPG 7.8): Mapbox GL con Catastro + DENUE + FGJ + GTFS + zone_scores + desarrollos + demanda.

## Bloques

### BLOQUE 12.A — N4 Full Scores + Agregados deterministas

Los N4 no son AI — son composiciones finales de N0-N3 que "cierran" la evaluación de un proyecto/zona. G01 "DMX Score 2.0" es el número público de 0-100 que DMX ostenta. Se hacen antes de N5 porque N5 los usa como inputs.

#### MÓDULO 12.A.1 — E01 Full Project Score (DMX Score interno)

**Pasos:**
- `[12.A.1.1]` Crear `shared/lib/intelligence-engine/calculators/n4/e01-full-project-score.ts`. Fórmula ponderada:
  ```
  E01 = 0.25×F08(zona LQI) + 0.15×H05(trust dev) + 0.15×F09(value) + 0.10×B08(absorption) + 0.10×B07_inv(competencia) + 0.10×A12(price fairness) + 0.10×N11(momentum) + 0.05×H15(due diligence)
  ```
- `[12.A.1.2]` Tier 3 (requiere trust score calibrado).
- `[12.A.1.3]` Trigger cascade: al cambiar cualquiera de los inputs → enqueue E01 recalc.

**Criterio de done del módulo:**
- [ ] Proyecto con todos los componentes → score coherente 60-95.

#### MÓDULO 12.A.2 — G01 Full Score 2.0 (DMX Score público)

**Pasos:**
- `[12.A.2.1]` `n4/g01-full-score-2.ts`: versión simplificada de E01 para render público en ficha proyecto. Redondea a entero + oculta components sensibles (ej. márgenes).
- `[12.A.2.2]` Output: `{ score_value: 0-100, label: 'Excelente|Muy Bueno|Bueno|Regular|Bajo', components_public: { zona, proyecto, inversion, comunidad } }`. 4 categorías públicas con 4 subscores.

**Criterio de done del módulo:**
- [ ] Ficha pública "/proyectos/[id]" muestra `DMX Score: 85/100`.

#### MÓDULO 12.A.3 — E02 Portfolio Optimizer

**Pasos:**
- `[12.A.3.1]` `n4/e02-portfolio-optimizer.ts` (para dev o inversor múltiples proyectos): optimiza mix proyectos bajo restricciones (presupuesto total, diversificación zonas, riesgo target). Output frontera eficiente.

**Criterio de done del módulo:**
- [ ] Dev con 5 proyectos → 3 recomendaciones rebalanceo.

#### MÓDULO 12.A.4 — E03 Predictive Close

**Pasos:**
- `[12.A.4.1]` `n4/e03-predictive-close.ts`: ML supervisado (heurística H1) que predice prob. cierre en 30/60/90 días de cada operación abierta. Features: estado operación, días pipeline, side, comisión acordada, trust partes, C01 lead score.
- `[12.A.4.2]` Tier 4 (requiere 100+ ops cerradas para calibración ML; H1 usa reglas bayesianas).

**Criterio de done del módulo:**
- [ ] Operación con propuesta firmada 60 días → P(cierre 30d) >50%.

#### MÓDULO 12.A.5 — E04 Anomaly Detector

**Pasos:**
- `[12.A.5.1]` `n4/e04-anomaly-detector.ts`: detecta anomalías globales (price spikes, ventas inusuales, fuga demanda). Publica en `market_anomalies` con severidad.
- `[12.A.5.2]` Cron `market_anomaly_detector` diario.

**Criterio de done del módulo:**
- [ ] Spike precio+20% en colonia detectado en ≤24h.

#### MÓDULO 12.A.6 — D09 Ecosystem Health + D02 Zona Ranking

**Pasos:**
- `[12.A.6.1]` `n4/d09-ecosystem-health.ts`: health CDMX (rollup all zones): `{ mercado: 'saludable|sobrecalentado|contraccion', indicadores_principales[] }`.
- `[12.A.6.2]` `n4/d02-zona-ranking.ts`: ranking 16 alcaldías CDMX por composite (E01 avg) + publica en admin observatorio.

**Criterio de done del módulo:**
- [ ] Ranking mensual disponible; CDMX dashboard D09 actualizado.

### BLOQUE 12.B — N5 AI Scores (26 scores)

Framework: cada N5 tiene (a) prompt versionado en `ai_prompt_versions`, (b) input struct determinista desde scores N0-N4, (c) call LLM con function-calling para garantizar output JSON válido, (d) response con citations obligatorias, (e) persistence en `ai_generated_content`, (f) cache TTL variable.

#### MÓDULO 12.B.1 — AI framework base

**Pasos:**
- `[12.B.1.1]` Crear `shared/lib/intelligence-engine/ai/llm-runner.ts` con:
  ```ts
  interface N5Input { scoreId: string; scopeType: string; scopeId: string; scores: Record<string, ScoreValue>; context: Record<string, any>; }
  interface N5Output { content: string | object; citations: Citation[]; tokens_used: number; model: string; prompt_version: string; cost_usd: number; }
  async function runAIScore(input: N5Input): Promise<N5Output>
  ```
  Usa Vercel AI SDK v6 + ai-gateway con fallback Sonnet 4 → GPT-4o-mini.
- `[12.B.1.2]` Structured output obligatorio: cada prompt define Zod schema para response (`parseStructuredOutput`).
- `[12.B.1.3]` Citations validator: si response incluye número sin `citation_ref: 'F01_zone_X'` → reject + retry (max 2).
- `[12.B.1.4]` Cost tracking: incrementa `ai_usage_tracking(user_id, score_id, tokens_in, tokens_out, cost, timestamp)`.
- `[12.B.1.5]` Fallback: si quota excedida o LLM error → retorna último cache no-stale + flag `degraded: true` (UI muestra "resultado cacheado").

**Criterio de done del módulo:**
- [ ] 1 llamada real Sonnet 4 + validación structured output.
- [ ] Simular quota excedida → fallback activa + log Sentry warning.

#### MÓDULO 12.B.2 — N5 ASESOR (C02, C05, C08)

**Pasos:**
- `[12.B.2.1]` `n5/c02-argumentario.ts`: para un contacto+proyecto, genera argumentario personalizado (3 párrafos: porqué_proyecto, porqué_zona, objeciones_prevent). Prompt v1 guardado en `ai_prompt_versions`. TTL cache 48h.
- `[12.B.2.2]` `n5/c05-weekly-briefing.ts`: cron `weekly_briefing_generate` lunes 7am. Para cada asesor activo, genera briefing semanal con: pipeline actualizado, 3 recomendaciones acción, 2 insights mercado. Persistido `ai_generated_content.type='weekly_briefing'`.
- `[12.B.2.3]` `n5/c08-dossier-inversion.ts`: dossier completo (PDF 10-15 pág) con datos comprador + proyecto + análisis escenarios A02 + citations IE. Para presentar a comprador. Incluye portada personalizada.

**Criterio de done del módulo:**
- [ ] Asesor recibe briefing lunes 7:05am.
- [ ] Dossier generable en <45s con citations ≥8.

#### MÓDULO 12.B.3 — N5 AGREGADOS (E05, E06, E07, E08)

**Pasos:**
- `[12.B.3.1]` `n5/e05-market-narrative.ts`: narrativa mercado CDMX mensual (auto-report ejecutivo).
- `[12.B.3.2]` `n5/e06-developer-benchmark.ts`: benchmark de un dev vs peers zona (8 KPIs + comentario AI).
- `[12.B.3.3]` `n5/e07-scenario-planning.ts`: 8 escenarios económicos (CoStar-inspired): macro estable, TIIE +200bps, inflación +5%, pesos +10% vs dólar, recesión leve/media/fuerte, boom migración, crisis hídrica. Por escenario: proyección 12m + recomendaciones.
- `[12.B.3.4]` `n5/e08-auto-report.ts`: reporte custom on-demand (asesor elige KPIs, AI redacta).

**Criterio de done del módulo:**
- [ ] E07 8 escenarios renderiza en tabla + narrativa 1 párrafo cada.

#### MÓDULO 12.B.4 — N5 FULL SCORE (G02, G03, G04, G05)

**Pasos:**
- `[12.B.4.1]` `n5/g02-narrative-2.ts`: narrativa del DMX Score público del proyecto en ficha (2-3 párrafos, tono editorial).
- `[12.B.4.2]` `n5/g03-due-diligence-report.ts`: reporte DD completo (20-30 pág PDF) para comprador con todos los scores zona/proyecto + H15 Due Diligence + 20 chekpoints.
- `[12.B.4.3]` `n5/g04-zone-comparison.ts`: comparativo AI entre 2-4 zonas con narrativa pros/cons.
- `[12.B.4.4]` `n5/g05-impact-predictor.ts`: "qué pasaría si": "si abren línea Metro 7 Extensión Nápoles, ¿qué cambia en la zona?". Simulación narrativa con ajuste N02, N08, B01.

**Criterio de done del módulo:**
- [ ] G03 DD report genera PDF 25 pág con ≥20 citations.

#### MÓDULO 12.B.5 — N5 MERCADO (D01, D08, D10)

**Pasos:**
- `[12.B.5.1]` `n5/d01-market-pulse.ts`: pulse diario mercado CDMX (narrativa + 3 indicadores clave).
- `[12.B.5.2]` `n5/d08-foreign-investment.ts`: tracker inversión extranjera detectada (empresas extranjeras, nómadas digitales).
- `[12.B.5.3]` `n5/d10-api-gateway-score.ts`: uptime + performance API externa, con alertas auto.

**Criterio de done del módulo:**
- [ ] D01 publicado cada 24h.

#### MÓDULO 12.B.6 — N5 ZONA (F11, F13, F14, F16, F17)

**Pasos:**
- `[12.B.6.1]` `n5/f11-supply-pipeline-zone.ts`: proyectos futuros detectados (permisos SEDUVI H2 + rumores noticias).
- `[12.B.6.2]` `n5/f13-commute-isocronas.ts`: isócronas 15/30/45 min desde punto con narrativa "puedes llegar a X empleos en Y min".
- `[12.B.6.3]` `n5/f14-neighborhood-change.ts`: narrativa "cómo cambió la colonia últimos 12m" usando N03+N04+precios.
- `[12.B.6.4]` `n5/f16-hipotecas-comparador.ts`: comparador hipotecas top 8 bancos MX dado salario/DP/monto.
- `[12.B.6.5]` `n5/f17-site-selection-report.ts`: PDF que complementa H13 Site Selection con narrativa + mapas.

**Criterio de done del módulo:**
- [ ] F13 isócronas renderiza polígono Mapbox + narrativa ≤5 líneas.

#### MÓDULO 12.B.7 — N5 PRODUCTOS (I01-I06)

**Pasos:**
- `[12.B.7.1]` `n5/i01-dmx-estimate-advanced.ts`: mejora del AVM de FASE 08 agregando narrativa explicativa (porqué este precio, qué ajustes se aplicaron).
- `[12.B.7.2]` `n5/i02-market-intelligence-report.ts`: reporte PDF full zona/ciudad (producto B2B licenciable $5K-$20K).
- `[12.B.7.3]` `n5/i03-feasibility-report.ts`: feasibility DEV inversión en zona (producto B2B).
- `[12.B.7.4]` `n5/i04-indices-licenciables.ts`: wrapper endpoint para API licenciables (ver FASE 23).
- `[12.B.7.5]` `n5/i05-insurance-risk-api.ts`: score para aseguradora con IRE + componentes desglosados.
- `[12.B.7.6]` `n5/i06-valuador-automatico.ts`: equivalente a valuador profesional MX con AVM + ajustes peritales.

**Criterio de done del módulo:**
- [ ] I02 Market Report genera PDF 15 pág en <90s con ≥30 citations.

#### MÓDULO 12.B.8 — Cache y versioning prompts

**Pasos:**
- `[12.B.8.1]` `ai_prompt_versions(prompt_id, version, model, system_prompt, user_template, response_schema, created_at, created_by, active)`. Toda llamada pasa `prompt_version` en tracking.
- `[12.B.8.2]` Rollback: si nuevo prompt reduce calidad (detectable por ai_coaching_log feedback), flag `active=false` del nuevo y vuelve al anterior.
- `[12.B.8.3]` TTL por tipo: briefing 7 días, dossier 30 días, market narrative 7 días, isócronas 30 días, market report 90 días.

**Criterio de done del módulo:**
- [ ] Publicar prompt v2 y rollback a v1 funcional desde admin.

#### MÓDULO 12.B.9 — Citations cascade

**Pasos:**
- `[12.B.9.1]` Todo output N5 incluye array `citations: [{ source_type, source_ref, value?, period?, url? }]`. Ejemplos:
  - `{ source_type: 'score', source_ref: 'F01', value: 82, period: '2026-04', zone_id: 'uuid' }`
  - `{ source_type: 'macro', source_ref: 'banxico.tasa_referencia', value: 8.75, period: '2026-04-15', url: 'https://…' }`
- `[12.B.9.2]` UI: cada N5 render expande "Ver fuentes" con lista clickable → abre drawer con detalle + link si aplica.

**Criterio de done del módulo:**
- [ ] 1 dossier C08 con ≥10 citations verificables.

### BLOQUE 12.C — Intelligence Cards (UPG 7.7)

#### MÓDULO 12.C.1 — Cards 4 niveles jerárquicos

**Pasos:**
- `[12.C.1.1]` Crear componentes:
  - `shared/ui/dopamine/cards/PredioCard.tsx` (nivel catastral: 1 cuenta catastral específica).
  - `shared/ui/dopamine/cards/ManzanaCard.tsx` (agrupa predios contiguos; muestra tipología dominante + Quality overlay).
  - `shared/ui/dopamine/cards/ColoniaCard.tsx` (scope más usado: scores completos + índices DMX).
  - `shared/ui/dopamine/cards/AlcaldiaCard.tsx` (rollup de colonias; comparativa 16 alcaldías).
- `[12.C.1.2]` Cada card muestra: nombre, top 3 scores principales, tendencia 12m, CTA "Explorar" (abre `/zona/[slug]`).
- `[12.C.1.3]` Card3D + tint según categoría.

**Criterio de done del módulo:**
- [ ] 4 tipos renderizan con data real Narvarte (colonia) + Benito Juárez (alcaldía).

#### MÓDULO 12.C.2 — Cards especializadas: Comparador, Risk, Investment

**Pasos:**
- `[12.C.2.1]` `ComparadorCard.tsx`: resumen 2-4 proyectos/zonas en 1 card con radar mini.
- `[12.C.2.2]` `RiskCard.tsx`: IRE + componentes principales riesgo (sísmico, hídrico, social, uso_suelo, infraestructura) con severidad visual semáforo.
- `[12.C.2.3]` `InvestmentCard.tsx`: ICO + A02 base IRR + N11 momentum en single view "¿Es buena inversión?".

**Criterio de done del módulo:**
- [ ] 3 cards cubren 90% de queries típicas comprador.

#### MÓDULO 12.C.3 — Drawer detalle IE

**Pasos:**
- `[12.C.3.1]` Click en cualquier card abre `IntelligenceDrawer` lado derecho con tabs:
  - Resumen (score + label + trend).
  - Componentes (subscores desagregados).
  - Metodología (link a `/metodologia/[scoreId]`).
  - Fuentes (citations list).
  - Historial (gráfica 12m trend Recharts).
- `[12.C.3.2]` Share button: copy link deep a este score + zona.

**Criterio de done del módulo:**
- [ ] Drawer abre en <200ms con data ya cargada.

### BLOQUE 12.D — Mapa Inteligente 7 capas Mapbox (UPG 7.8)

#### MÓDULO 12.D.1 — Ruta `/mapa` (asesor/dev/admin)

**Pasos:**
- `[12.D.1.1]` Crear `app/(asesor)/mapa/page.tsx` (client component con Mapbox GL JS).
- `[12.D.1.2]` Layout: mapa full-screen + sidebar 320px control capas + footer 40px stats período.
- `[12.D.1.3]` 7 capas toggleables (checkbox + opacity slider):
  1. **Catastro CDMX**: polígonos coloreados por valor catastral (H2 para render; H1 stub capa vacía con label "Próximamente").
  2. **DENUE heatmap**: densidad ecosistema + tier ratios (layer `heatmap-layer` Mapbox).
  3. **FGJ criminalidad**: heatmap delitos + filtro categorías.
  4. **GTFS rutas/estaciones**: línea + círculos Metro/Metrobús/Tren.
  5. **zone_scores composite**: coropleto DMX Score por colonia (verde→rojo).
  6. **Desarrollos pines**: cluster Mapbox; al zoom ≥14 desagrupan; tap → ficha proyecto.
  7. **Demanda heatmap**: wishlist + search_logs + project_views últimos 30d.
- `[12.D.1.4]` Filtros: rango precios, recámaras, scores mín, fecha delitos, tipo de transporte.
- `[12.D.1.5]` Click en colonia → IntelligenceDrawer con scores colonia.

**Criterio de done del módulo:**
- [ ] Mapa carga en <2s con 6 capas (capa 1 Catastro stub).
- [ ] Performance: 10K puntos DENUE render a 60fps con clustering.
- [ ] Comparable con Pulppo mapa — superior (Pulppo no tiene DENUE/FGJ).

#### MÓDULO 12.D.2 — Ruta `/explorar` (público simplificado)

**Pasos:**
- `[12.D.2.1]` Crear `app/(public)/explorar/page.tsx`. Versión pública con 3 capas: scores composite, desarrollos, demanda heatmap simplificada.
- `[12.D.2.2]` Sin necesidad de login. Filtros básicos (precio, recámaras).
- `[12.D.2.3]` SEO: meta tags + sitemap generado con 200 colonias CDMX.

**Criterio de done del módulo:**
- [ ] `/explorar` indexable Google.

#### MÓDULO 12.D.3 — Performance + fallbacks

**Pasos:**
- `[12.D.3.1]` Vector tiles en Supabase Storage pre-generados con tippecanoe para capas pesadas (DENUE, FGJ).
- `[12.D.3.2]` Graceful degradation: si Mapbox quota excedida → mostrar modal "Mapa temporalmente no disponible" + tabla alternativa.

**Criterio de done del módulo:**
- [ ] 100 usuarios concurrentes no exceden Mapbox quota free tier.

### BLOQUE 12.E — Coste AI tracking + PostHog

#### MÓDULO 12.E.1 — Tracking granular

**Pasos:**
- `[12.E.1.1]` Por cada `runAIScore`: PostHog event `ie.ai.generated` con props `{ score_id, user_id, tokens, cost_usd, cached, degraded, model, prompt_version }`.
- `[12.E.1.2]` Dashboard admin `/admin/ai-usage` con KPIs: cost/day, cost/user_plan, top expensive scores, cache hit rate.
- `[12.E.1.3]` Alertas: Sentry/Slack cuando cost/day > $50 USD o cache hit rate < 40%.

**Criterio de done del módulo:**
- [ ] Dashboard pobló con 1 día de eventos reales.

#### MÓDULO 12.E.2 — Quota por plan

**Pasos:**
- `[12.E.2.1]` `checkFeatureLimit(userId, 'ai_dossiers_month')` usa `subscriptions.plan` limites (Free 2/mes, Starter 10, Pro 30, Enterprise ilim).
- `[12.E.2.2]` Antes de ejecutar N5 costoso → check límite; si excedido → respuesta `{ gated: true, upgrade_url, remaining: 0 }`.

**Criterio de done del módulo:**
- [ ] Asesor free con 3 dossiers en mismo mes → bloqueo + CTA Starter.

### BLOQUE 12.F — Tests + integración

#### MÓDULO 12.F.1 — Tests AI

**Pasos:**
- `[12.F.1.1]` Mock LLM responses en tests (msw intercept fetch). Validate: schema pass, citations ≥1, cache reutilizado segunda llamada.
- `[12.F.1.2]` Playwright e2e: user solicita dossier → progress indicator → PDF descarga en <60s.

**Criterio de done del módulo:**
- [ ] 26 N5 con smoke test (mock LLM).

#### MÓDULO 12.F.2 — Feature flags

**Pasos:**
- `[12.F.2.1]` Cada N5 con feature flag en `feature_registry` (`ai_c08_dossier`, `ai_c05_briefing`, etc.). Admin puede deshabilitar si prompt misbehaves.

**Criterio de done del módulo:**
- [ ] Flag off → N5 oculto en UI + tRPC retorna `feature_disabled`.

## Criterio de done de la FASE

- [ ] 7 N4 + 26 N5 scores implementados con prompts versionados y citations.
- [ ] Intelligence Cards 4 niveles + 3 especializadas renderizan con data real.
- [ ] Mapa Inteligente `/mapa` 7 capas (capa Catastro stub ok) funcionando.
- [ ] `/explorar` público simplificado SEO-indexable.
- [ ] Coste AI tracking + dashboard admin activo.
- [ ] Quota gating por plan funcionando.
- [ ] Feature flags wired por N5.
- [ ] Tests unit + e2e ≥80% coverage en `shared/lib/intelligence-engine/ai/`.
- [ ] Tag git: `fase-12-complete`.
- [ ] Documentación: `docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md` refleja 33 nuevos scores implementados.

## Próxima fase

[FASE 13 — Portal Asesor M01-M05](./FASE_13_PORTAL_ASESOR_M1_M5.md)

---

## Laterals pipeline (proposed durante ejecución previa)

Ver registro maestro: `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`

Aplican en esta fase:
- **L14 DMX Living Map** (Trulia Crime Map pattern) — capa visual unificada de TODOS los scores DMX en mapa interactivo con heatmaps superponibles. Killer feature visual + viral. Bloque sugerido: integrar en BLOQUE Mapa 7 Capas Mapbox como capa "All Scores Heatmap" + UI toggle por dimensión (safety, walkability, water, momentum, etc.).
- **L15 Score Layers Toggle** (Strava Heatmaps pattern) — usuario activa/desactiva visualización de scores específicos como capas overlay. Complementa L14 con interactividad de filtrado. Bloque sugerido: integrar como controles UI del DMX Living Map (toggle layers panel).

Al ejecutar FASE 12, revisar status en pipeline maestro y confirmar incorporación al scope.

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17
