# FASE 11 XL — Índices DMX + Moonshots Core + Preview UX 4 Personas (15 índices + 10 moonshots)

> **Duración estimada:** 10-12 sesiones Claude Code (~90h con agentes paralelos)
> **Dependencias:** FASE 08 (N0), FASE 09 (N1), FASE 10 (N2/N3/N4), FASE 07 (ingesta DENUE/RPP/Instagram/INEGI), FASE 03 (AI shell), FASE 04 (Dopamine DS)
> **Resultado esperado:** 15 índices DMX calculándose en 4 niveles (ciudad/alcaldía/colonia/nivel futuro estado), Causal Engine + Pulse Score + Migration Flow + Trend Genome + Scorecard Nacional operativos, Preview UX 4 personas, Widget Embebible público, Time Machine API, Genoma/Futures Curve/LifePath/Climate Twin/Constellations/Living Atlas como SEEDs, Ghost Zones, Alert Radar WhatsApp, Stickers descargables, DNA Migration, Historical Forensics, Living Metropolitan Networks, Zone Certification integration. Tag `fase-11-complete`.
> **Priority:** [H1]

## Contexto y objetivo

FASE 11 XL es la **capa producto licenciable** del IE: el puente entre los scores atómicos N0-N4 (FASE 08-10) y la experiencia pública/B2B que convierte a DMX en categoría nueva. No es un portal más; es el **Urban OS moonshot** — un sistema de inteligencia espacial donde los 15 índices son el vocabulario público (lo que prensa cita, lo que fondos licencian, lo que el comprador entiende), y los módulos adyacentes (Causal Engine, Pulse Score, Migration Flow, Trend Genome, Genoma, Climate Twin, LifePath, Constellations) son las capacidades que ningún competidor MX/LATAM posee hoy.

La expansión de 7 a 15 índices responde a una decisión estratégica post-FASE 10: cubrir explícitamente los 4 perfiles de usuario (comprador/asesor/developer/masterbroker) + 4 ángulos de mercado (familiar/millennial/ESG/STR) + 3 ángulos institucionales (inversión/developer health/gentrificación) + 1 producto aseguradoras (estabilidad). Cada índice es una pieza narrativa autónoma (shareable en WhatsApp, citable en medios) y una puerta B2B (API licenciable por vertical).

El criterio de done de FASE 11 XL es **E2E connectedness end-to-end** (ADR-018): cada feature debe tener BD + RLS + audit allowlist + tRPC + Zod + frontend + tests + telemetría + i18n + permissions mapeados. Nada queda "half-wired". El tag `fase-11-complete` solo se emite cuando `audit-dead-ui.mjs` y `audit-rls.mjs` pasan en modo STRICT, Playwright ≥50 nuevos specs verdes, y Lighthouse SEO ≥95 en rutas públicas.

## Progreso de ejecución

**Status actualizado 2026-04-24 post-merge PR #30:** 18/27 bloques FASE 11 XL completados (67%).

| Bloque | Status | Merge SHA | PR |
|---|---|---|---|
| 11.A Cimientos ampliados | ✅ shipped | aee8a0a | #23 |
| 11.B 15 Calculators | ✅ shipped | aee8a0a | #23 |
| 11.C Orquestador + crons | ✅ shipped | aee8a0a | #23 |
| 11.D Rutas públicas + Terminal Pro | ✅ shipped | 8f23efe | #21 |
| 11.E Causal Engine | ✅ shipped | 7b6ab6e | #22 |
| 11.F Pulse Score | ✅ shipped | aee8a0a | #23 |
| 11.G Migration Flow v1 | ✅ shipped | aee8a0a | #23 |
| 11.H Trend Genome + Influencer Heat | ✅ shipped | aee8a0a | #23 |
| 11.I Scorecard Nacional Trimestral + 11.I.bis audit | ✅ shipped | aee8a0a | #23 |
| 11.J Newsletter + Wrapped | ✅ shipped | aee8a0a | #23 |
| 11.K Preview UX 4 Personas | ✅ shipped | e690842 | #24 |
| 11.L APIs públicas + Widget + Time Machine | ✅ shipped | ba913a1 | #25 |
| **11.M Genoma de Colonias SEED** | ✅ **shipped** | **aa0334b** | **#26** |
| **11.N Futures Curve SEED + Pulse Pronóstico 30d (L93)** | ✅ **shipped** | **aa0334b** | **#26** |
| **11.O LifePath SEED** | ✅ **shipped** | **9f6442f** | **#28** |
| **11.P Climate Twin SEED** | ✅ **shipped** | **9f6442f** | **#28** |
| **11.Q Ghost Zones Detector** | ✅ **shipped** | **acb7d16** | **#30** |
| **11.R Zone Constellations SEED** | ✅ **shipped** | **acb7d16** | **#30** |
| 11.S Living Atlas SEED | ⏳ pending | — | — |
| 11.T Alert Radar WhatsApp | ⏳ pending | — | — |
| 11.U Stickers Descargables | ⏳ pending | — | — |
| 11.V DNA Migration (XF-01) | ⏳ pending | — | — |
| 11.W Historical Forensics (XF-08) | ⏳ pending | — | — |
| 11.X Living Metropolitan Networks (XF-09) | ⏳ pending | — | — |
| 11.Y Zone Certification Integration | ⏳ pending | — | — |
| 11.Z E2E Verification + Tests + Tag | ⏳ pending | — | — |

### Notas de incidents resueltos

- **Incident 2026-04-23 — migrations 11.J no aplicadas en Supabase cloud.** PR #23 (FASE 11 bloques F-J) mergeó código + migration files al repo pero GitHub Actions NO ejecutó `supabase db push`. Las tablas `newsletter_subscribers`, `newsletter_deliveries`, `zone_streaks`, `newsletter_ab_tests`, `dmx_wrapped_snapshots` quedaron declaradas en migrations locales sin existir en prod durante ~2 semanas. **Resuelto en PR #26** (mismo merge que 11.M+N) aplicando 9 migrations pendientes vía `supabase db push --linked` manual + reconcile history (6 timestamps duplicados repair) + regen types. Regla canonizada: tras cada merge que incluya migrations, ejecutar `supabase db push --linked` manual desde terminal (ver feedback memory `feedback_supabase_migrations_manual_push`).
- **Fix 2026-04-23 tarde — schema conflict 11.O/11.P (Opción B refinada founder).** Pre-0 audit detectó que las tablas propuestas `lifepath_user_profiles` + `climate_twin_projections` YA existían en schema XL maestro (`20260421100000`). Decisión producto: ALTER in-place + rename → separar semánticamente "Clima Futuro" (projections) de "Clima Gemelo Histórico" (nuevas tablas). Fix commit adicional (mismo merge PR #28) refactorizó `climate_annual_summaries` de `numeric[]` → `vector(12)` + HNSW cosine + nueva `climate_zone_signatures` (aggregate per-zone) + RPC `find_climate_twins` O(log N) DB-side. Filosofía escalable canonizada (`feedback_arquitectura_escalable_desacoplada.md`). 6 migrations totales: `lifepath_alter` + `climate_twin_schema` + `audit_v22` + `climate_pgvector_refactor` + `climate_source_heuristic` + `audit_v23`.
- **2026-04-24 — 11.Q+R merged sin blockers (PR #30).** Ghost Zones detector (heurística H1 FNV-1a hash-based search/press stubs + DMX-LIV/INV/IAB fundamentals gap) + Zone Constellations grafo multi-edge (migration 0.30 + climate_twin 0.15 + genoma 0.30 + pulse 0.25) + Louvain clusters + BFS path finder + cross-functions Ghost×LifePath (U14) y Constellations×Futures (U15) + contagion paths (U13). **Zero deuda técnica post-merge** — filosofía escalable aplicada: GIN `jsonb_path_ops` sobre `edge_types` + BTree compuesto `(source_colonia_id, edge_weight DESC)` → queries O(log N) a escala nacional 10k+ edges; Louvain modularity JS puro sin dep externa. 3 migrations: GIN+BTree indexes, tabla `zone_constellation_clusters`, allowlist v24. Registry 135 → 137 entries. Tests 2479 → 2531 (+52). 9 upgrades shipped (U1/U2/U3/U5/U6/U7/U13/U14/U15), 4 agendados L-NN (U4 FASE 11.T · U9+U10 FASE 22 · U11 FASE 12+Newsletter). Dividendo de memorias canonizadas (ritual pre-prompt + guardrails CC + audit PM): zero fix commits, zero rework wall-clock.

## Bloques

### BLOQUE 11.A — Cimientos ampliados (~3h)

#### MÓDULO 11.A.1 — Migration `dmx_indices` schema ampliado 15 códigos

**Pasos:**
- `[11.A.1.1]` Crear migration `supabase/migrations/xxxx_dmx_indices_schema_v2.sql`:
  ```sql
  ALTER TABLE dmx_indices
    DROP CONSTRAINT IF EXISTS dmx_indices_index_code_check,
    ADD CONSTRAINT dmx_indices_index_code_check CHECK (index_code IN (
      'IPV','IAB','IDS','IRE','ICO','MOM','LIV',
      'FAM','YNG','GRN','STR','INV','DEV','GNT','STA'
    ));
  ALTER TABLE dmx_indices
    DROP CONSTRAINT IF EXISTS dmx_indices_scope_type_check,
    ADD CONSTRAINT dmx_indices_scope_type_check CHECK (scope_type IN (
      'zone','colonia','alcaldia','city','estado','country'
    ));
  ALTER TABLE dmx_indices
    ADD COLUMN IF NOT EXISTS methodology_version text NOT NULL DEFAULT 'v1',
    ADD COLUMN IF NOT EXISTS methodology_changelog jsonb;
  CREATE INDEX IF NOT EXISTS idx_dmx_indices_methodology
    ON dmx_indices(index_code, methodology_version, period_date DESC);
  ```

**Criterio de done:**
- [ ] INSERT con los 15 códigos pasa CHECK.
- [ ] `methodology_version` persistida; historial 24 meses preservado.

#### MÓDULO 11.A.2 — RLS policies + audit_rls_allowlist_v9

**Pasos:**
- `[11.A.2.1]` Revisar policies existentes `indices_public_read` (SELECT anon periodo cerrado) + `indices_service_write` (ALL service_role).
- `[11.A.2.2]` Agregar policy `indices_period_embargo`: SELECT bloqueado si `period_date > now()::date - interval '7 days'` salvo `auth.jwt() ->> 'role' IN ('admin','service_role')`. Embargo publicación para evitar leak pre-newsletter.
- `[11.A.2.3]` Crear `supabase/migrations/xxxx_audit_rls_allowlist_v9.sql` con entries para: `dmx_indices` (ampliada), `causal_explanations`, `zone_pulse_scores`, `zone_migration_flows`, `influencer_heat_zones`, `zone_alpha_alerts`, `colonia_wiki_entries`, `zone_alert_subscriptions`, `scorecard_nacional_reports`, `colonia_embeddings`, `futures_curve_projections`, `climate_twin_projections`, `ghost_zone_rankings`, `zone_constellations_edges`, `lifepath_user_profiles`, `dna_migration_matches`, `historical_forensics_reports`.

**Criterio de done:**
- [ ] `npm run audit:rls` modo STRICT pasa.
- [ ] Policy embargo probada con user anon vs admin (2 tests Vitest).

#### MÓDULO 11.A.3 — Schema versioning metodología

**Pasos:**
- `[11.A.3.1]` Crear tabla `dmx_indices_methodology_versions (index_code, version, weights jsonb, effective_from, effective_to, changelog text, published_pdf_url text)`.
- `[11.A.3.2]` Función `get_methodology_as_of(code, as_of_date)` retorna versión vigente en esa fecha.
- `[11.A.3.3]` Trigger BD: UPDATE de pesos en registry → INSERT nueva versión + `effective_to = now()` previa.

**Criterio de done:**
- [ ] Query histórico "DMX-MOM pesos Q1 2026" retorna v1; "Q3 2026" retorna v2 si hubo cambio.
- [ ] Historial 24 meses preservado (retention policy).

#### MÓDULO 11.A.4 — Registry entries 15 IndexRegistryEntry

**Pasos:**
- `[11.A.4.1]` Extender `shared/lib/intelligence-engine/registry.ts` interface `IndexRegistryEntry` con: `{ code, nameEs, nameEn, description, weights: Record<string, number>, componentScoreIds: string[], publicationCadence: 'monthly'|'quarterly'|'annual', b2bProduct?: string, dopamineToken: string, iconKey: string }`.
- `[11.A.4.2]` Agregar 8 entries nuevas (FAM/YNG/GRN/STR/INV/DEV/GNT/STA) + actualizar 7 existentes con campos ampliados.
- `[11.A.4.3]` Helper `getIndexByCode('DMX-FAM')`, `listIndicesByCadence('monthly')`.

**Criterio de done:**
- [ ] 15 entries en registry; test snapshot congelado.
- [ ] `npm run db:types` sin errores post-migration.

### BLOQUE 11.B — 15 Calculators (~12h, 3 sub-agents paralelos × 5 calc)

> **SUB-AGENTS PARALELOS:** Group A (IPV/IAB/IDS/IRE/ICO), Group B (MOM/LIV/FAM/YNG/GRN), Group C (STR/INV/DEV/GNT/STA). Cada group ejecuta en paralelo porque cada calculator es archivo independiente (`indices/<code>.ts`), sin dependencias cross-file entre calculators.

Para cada calculator el stack E2E es idéntico:
- **BD**: consume `zone_scores` + `dmx_indices` (read), escribe `dmx_indices` (write via service layer).
- **Backend**: `shared/lib/intelligence-engine/indices/<code>.ts` export `calculate<Code>(input: <Code>Input): Promise<<Code>Output>`. Zod schema en `schemas/<code>-io.ts`. Service layer `server/trpc/routers/indices/<code>.ts` con procedure `indices.<code>.calculateForScope` (authenticated admin).
- **API**: ruta pública REST `/api/v1/indices/<code>?scope=colonia&id=...&period=YYYY-MM` para developers B2B.
- **Frontend**: card component `features/indices/components/<Code>Card.tsx` con Dopamine tokens (`--dmx-gradient-*`, `--dmx-depth-*`) + tab `/indices/[code]`.
- **Tests**: `tests/unit/indices/<code>.test.ts` (≥6 casos: valid/missing-inputs/clamp/ranking/confidence-fallback/cascade-trigger) + `tests/e2e/indices/<code>.spec.ts` (navegación tab + mapa + compartir).
- **Telemetría**: PostHog events `index_calculated`, `index_viewed`, `index_shared`. Sentry captura fallos calc.
- **i18n**: keys `indices.<code>.*` en 5 locales.
- **Permissions**: anon read public, authenticated write via admin, Pro+ para alpha flags.

#### MÓDULO 11.B.1 — DMX-IPV (Índice Precio-Valor)

**Pasos:**
- `[11.B.1.1]` `indices/ipv.ts`. Fórmula: `IPV = F08×0.30 + F09×0.25 + N11×0.20 + A12×0.15 + N01×0.10`.
- `[11.B.1.2]` Fallback ≤90 días → confidence=medium.
- `[11.B.1.3]` Ranking + percentil contra universo colonias CDMX.
- `[11.B.1.4]` Cascade: UPDATE F08/F09/N11/A12/N01 → enqueue IPV.

**Criterio de done:** Del Valle IPV ≈82 confidence=high; tests unitarios pasan.

#### MÓDULO 11.B.2 — DMX-IAB (Absorción Benchmark)

**Pasos:**
- `[11.B.2.1]` `indices/iab.ts`. `IAB = clamp(B08_zona / benchmark_cdmx × 50, 0, 100)`.
- `[11.B.2.2]` `benchmark_cdmx` = media B08 proyectos activos último trimestre.
- `[11.B.2.3]` Tier 3 (requiere ≥50 proyectos con B08).

**Criterio de done:** CDMX media IAB ≈50; zonas calientes >70.

#### MÓDULO 11.B.3 — DMX-IDS (Desarrollo Social Integrado)

**Pasos:**
- `[11.B.3.1]` `indices/ids.ts`. `IDS = F08×0.25 + H01×0.15 + H02×0.10 + N01×0.15 + N02×0.15 + F01×0.10 + F02×0.10`.

**Criterio de done:** Coyoacán centro IDS ≥80.

#### MÓDULO 11.B.4 — DMX-IRE (Riesgo Estructural)

**Pasos:**
- `[11.B.4.1]` `indices/ire.ts`. `IRE = 100 − (H03×0.30 + N07×0.20 + F01_inv×0.20 + F06_inv×0.15 + N05_inv×0.15)`.
- `[11.B.4.2]` Componente producto B2B "DMX Risk Score" (aseguradoras).
- `[11.B.4.3]` Components: `riesgos_componente: { sismico, hidrico, social, uso_suelo, infraestructura }`.

**Criterio de done:** Tlalpan laderas IRE <35.

#### MÓDULO 11.B.5 — DMX-ICO (Costo Oportunidad)

**Pasos:**
- `[11.B.5.1]` `indices/ico.ts`. `yield = renta_mensual_avg × 12 / precio_m2 × 100`; `ICO = clamp((yield − cetes) / cetes × 50 + 50, 0, 100)`.
- `[11.B.5.2]` Requiere `market_prices_secondary` (compras + rentas) + `macro_series[cetes_28d]`.

**Criterio de done:** yield 8% vs Cetes 10% → ICO <50; yield 12% → ICO ≥75.

#### MÓDULO 11.B.6 — DMX-MOM (Momentum Index)

**Pasos:**
- `[11.B.6.1]` `indices/mom.ts`. `MOM = N11_dmx_momentum_index` elevado a índice mensual publicable.
- `[11.B.6.2]` Publicación mensual día 5 (cron consolidado 11.C.2).
- `[11.B.6.3]` Producto B2B "DMX Momentum Index" (fondos, bancos).

**Criterio de done:** Top 10 Momentum CDMX publicados en `/indices/dmx-mom`.

#### MÓDULO 11.B.7 — DMX-LIV (Livability Index)

**Pasos:**
- `[11.B.7.1]` `indices/liv.ts`. `LIV = F08×0.30 + N08×0.15 + N01×0.10 + N10×0.05 + N07×0.10 + H01×0.10 + H02×0.05 + N02×0.10 + N04×0.05`.
- `[11.B.7.2]` Producto B2B "DMX Livability API".

**Criterio de done:** Del Valle LIV ≈85; Iztapalapa Sur <50.

#### MÓDULO 11.B.8 — DMX-FAM (Zona Familiar)

**Pasos:**
- `[11.B.8.1]` `indices/fam.ts`. Fórmula: `FAM = N03_escuelas×0.30 + N02_parques×0.20 + N04_salud×0.15 + N07_seg_infantil×0.15 + F01_caminabilidad×0.10 + H01_comunidad×0.10`.
- `[11.B.8.2]` Sub-componente `escolar_publico_privado_mix` para diferenciar segmentos.

**Criterio de done:** Polanco/Del Valle/Coyoacán centro FAM ≥80; zonas industriales <40.

#### MÓDULO 11.B.9 — DMX-YNG (Millennial/Young Professional)

**Pasos:**
- `[11.B.9.1]` `indices/yng.ts`. Fórmula: `YNG = N09_vida_nocturna×0.25 + F01_caminabilidad×0.20 + F02_commute×0.20 + N10_coworking×0.15 + N11_momentum×0.10 + N05_aire×0.10`.
- `[11.B.9.2]` Señales alpha (cafés especialidad, galerías) boost hasta +5pts si `influencer_heat_zones.score > 70`.

**Criterio de done:** Roma Norte/Condesa YNG ≥85.

#### MÓDULO 11.B.10 — DMX-GRN (Sustentable/ESG)

**Pasos:**
- `[11.B.10.1]` `indices/grn.ts`. `GRN = N05_aire×0.25 + N06_agua_dispo×0.20 + N02_areas_verdes×0.20 + F03_infra_esg×0.15 + climate_twin_score×0.10 + N12_renovables×0.10`.
- `[11.B.10.2]` Integración Climate Twin (11.P) como componente directo.

**Criterio de done:** Xochimilco/Coyoacán sur GRN ≥75; Iztacalco industrial <45.

#### MÓDULO 11.B.11 — DMX-STR (Airbnb-Ready / Short-Term Rental)

**Pasos:**
- `[11.B.11.1]` `indices/str.ts`. `STR = turismo_score×0.30 + permisos_str_legales×0.20 + airroi_revpar_percentile×0.20 + N09_vida_nocturna×0.10 + F01_caminabilidad×0.10 + competencia_inversa×0.10`.
- `[11.B.11.2]` Data sources: AirROI empírico ($0.10/call, colonia-level nativas Roma Norte/Condesa), regulación municipal CDMX (SEDUVI alojamiento temporal).
- `[11.B.11.3]` Flag `str_regulation_risk` si ordenanza restrictiva detectada.

**Criterio de done:** Roma Norte/Condesa/Polanco STR ≥80 con warning regulación; colonias residenciales sin turismo <30.

#### MÓDULO 11.B.12 — DMX-INV (Proyecto Inversión Institucional)

**Pasos:**
- `[11.B.12.1]` `indices/inv.ts`. `INV = yield×0.30 + exit_liquidity×0.25 + ICO×0.15 + MOM×0.15 + STA×0.10 + IRE×0.05`.
- `[11.B.12.2]` Producto B2B fondos (FIBRAs, family offices).

**Criterio de done:** Corredor Reforma INV ≥80 confidence=high.

#### MÓDULO 11.B.13 — DMX-DEV (Salud Desarrolladora)

**Pasos:**
- `[11.B.13.1]` `indices/dev.ts`. `DEV = H05_trust×0.35 + trayectoria_proyectos_exitosos×0.20 + cumplimiento_normativo×0.20 + H15_due_diligence×0.15 + financial_health×0.10`.
- `[11.B.13.2]` Scope `developer_id` (no colonia). Requiere H05 calibrado FASE 10.

**Criterio de done:** Developers top-10 CDMX DEV ≥75; developers con demandas laudos <40.

#### MÓDULO 11.B.14 — DMX-GNT (Gentrificación Tracker)

**Pasos:**
- `[11.B.14.1]` `indices/gnt.ts`. `GNT = velocidad_cambio_precios×0.30 + desplazamiento_demografico×0.25 + densidad_cafes_galerias×0.20 + influencer_heat×0.15 + permisos_remodelacion×0.10`.
- `[11.B.14.2]` Output neutral (no bueno/malo): `stage: 'dormant'|'early'|'active'|'peaked'|'post-gentrification'`.
- `[11.B.14.3]` Alert social justice: si `stage=active` + displacement_rate >25%, flag prensa.

**Criterio de done:** Juárez/Obrera GNT stage=active; Pedregal stage=dormant.

#### MÓDULO 11.B.15 — DMX-STA (Estabilidad / Volatilidad Inversa)

**Pasos:**
- `[11.B.15.1]` `indices/sta.ts`. `STA = 100 − volatilidad_precios_24m`. Producto institucional aseguradoras + family offices conservadores.
- `[11.B.15.2]` Requiere histórico ≥24 meses `market_prices_secondary`.

**Criterio de done:** Polanco/Pedregal STA ≥80; zonas volátiles <50.

### BLOQUE 11.C — Orquestador + crons consolidados (~4h)

#### MÓDULO 11.C.1 — `calculateAllIndicesForScope()` 15 paralelo

**Pasos:**
- `[11.C.1.1]` `shared/lib/intelligence-engine/indices/orchestrator.ts`: `calculateAllIndicesForScope({ countryCode, scopeType, scopeId, periodDate, periodType })` corre los 15 en `Promise.all` + persiste.
- `[11.C.1.2]` Segundo paso ranking + percentil post-calc.
- `[11.C.1.3]` Batch: `calculateAllIndicesForCDMXColonias(periodDate)` ~200 colonias × 15 índices = 3000 filas.

**Criterio de done:** Batch CDMX 200 colonias en <180s; tests de carga pasan.

#### MÓDULO 11.C.2 — Cron maestro único `dmx_indices_master_cron`

**Pasos:**
- `[11.C.2.1]` Crear `app/api/cron/dmx-indices-master/route.ts`: un solo endpoint Vercel que internamente decide qué índices correr según `new Date()`:
  - Día 5 de cada mes → monthly (DMX-MOM, DMX-GNT, DMX-STR, DMX-INV).
  - Día 5 post-trimestre (1,4,7,10) → quarterly (los 15 completos).
  - 1 enero → annual Wrapped.
- `[11.C.2.2]` Registrar en `vercel.json` un solo cron entry: `{ "path": "/api/cron/dmx-indices-master", "schedule": "0 12 5 * *" }` + annual adicional `{ "path": "/api/cron/annual-wrapped", "schedule": "0 12 1 1 *" }`.
- `[11.C.2.3]` Cumple límite Vercel Free 20 crons (estado actual 14 → 16 con master + annual + trend genome pulse alpha).

**Criterio de done:** Cron master corre manualmente → escribe `dmx_indices` con lote adecuado por fecha.

#### MÓDULO 11.C.3 — Triggers BD cascada `enqueue_indices_affected`

**Pasos:**
- `[11.C.3.1]` Función BD `enqueue_indices_affected(score_type, scope_type, scope_id)`: dado un score recalculado, determina qué índices lo consumen (lookup en registry) y enqueue recalc.
- `[11.C.3.2]` Trigger `zone_scores_cascade_indices` AFTER UPDATE en `zone_scores` dispara la función.

**Criterio de done:** UPDATE N11 Nápoles → MOM/GNT/INV/YNG de Nápoles aparecen en queue; test BD pasa.

### BLOQUE 11.D — Rutas públicas + Terminal Pro (~6h)

#### MÓDULO 11.D.1 — `/indices` 15 tabs + SEO + OpenGraph + ISR

**Pasos:**
- `[11.D.1.1]` `app/(public)/indices/page.tsx` Server Component + 15 tabs dinámicos `/indices/[code]`.
- `[11.D.1.2]` Por tab: Hero + Top 20 colonias (tabla ordenable) + mapa coropleto Mapbox + selector periodo 12 meses.
- `[11.D.1.3]` ISR `revalidate: 3600`. SEO: meta per tab + OpenGraph auto-imagen gen (`@vercel/og`) + JSON-LD Dataset schema.
- `[11.D.1.4]` Social share WhatsApp/X/LinkedIn con auto-texto localizado 5 locales.

**Criterio de done:** Carga <500ms ISR cache; Lighthouse SEO ≥95; share WA genera preview.

#### MÓDULO 11.D.2 — `/metodologia` + `/metodologia/[code]` + PDF React-PDF

**Pasos:**
- `[11.D.2.1]` `app/(public)/metodologia/page.tsx` índice general + `/metodologia/[code]` por índice.
- `[11.D.2.2]` Por índice: descripción, fórmula visual tabla ponderaciones, fuentes con links oficiales (SIGED/FGJ/SACMEX/INEGI/DENUE), ejemplo paso-a-paso Narvarte, cadencia, disclaimer, changelog metodología (link a `dmx_indices_methodology_versions`).
- `[11.D.2.3]` PDF descargable on-demand con React-PDF (`/metodologia/[code]/pdf`).
- `[11.D.2.4]` SEO schema.org `ScholarlyArticle` per índice.

**Criterio de done:** PDF descargado funcional; Lighthouse SEO ≥95.

#### MÓDULO 11.D.3 — Reporte trimestral base

**Pasos:**
- `[11.D.3.1]` Endpoint cron `quarterly_market_report` genera PDF (cubierto en 11.I.1 ampliado).
- `[11.D.3.2]` Published en `/reports/trimestral-QN-YYYY.pdf` + email Resend broadcast.

**Criterio de done:** PDF generado <2 min; email enviado a lista seed.

#### MÓDULO 11.D.4 — `/indices/pro` Terminal Bloomberg-style

**Pasos:**
- `[11.D.4.1]` Ruta gated Pro+ `app/(app)/indices/pro/page.tsx`: tabla filtrable (país/ciudad/alcaldía/colonia × 15 índices × período) con ordenamiento multi-columna.
- `[11.D.4.2]` Comparador 2-4 índices lado a lado (radar chart Recharts).
- `[11.D.4.3]` Gráficas evolución 24 meses (línea + bandas confianza).
- `[11.D.4.4]` Export CSV/Excel.

**Criterio de done:** Tabla 3000 filas renderiza <300ms con virtual scroll; comparador funcional.

#### MÓDULO 11.D.5 — Backtest histórico `/indices/backtest`

**Pasos:**
- `[11.D.5.1]` Endpoint tRPC `indices.backtest.run({ indexCode, strategy: 'top10'|'top5'|'bottom10', periodStart, periodEnd, initialCapital })`.
- `[11.D.5.2]` Simulación retorno acumulado asumiendo compra proporcional + rotación trimestral.
- `[11.D.5.3]` UI gráfica retorno vs benchmark (ETF inmobiliario MX o CETES).
- `[11.D.5.4]` Disclaimer inversión claro + link regulación CNBV.

**Criterio de done:** Simulación "top-10 DMX-MOM 2023-2026" retorna dataset coherente; UI renderiza comparación.

#### MÓDULO 11.D.6 — `/indices/movers` Top Movers Daily (Robinhood pattern)

**Pasos:**
- `[11.D.6.1]` `app/(public)/indices/movers/page.tsx`: top 10 colonias que más subieron/bajaron en los últimos 30 días (delta índice compuesto).
- `[11.D.6.2]` Cards compartibles WhatsApp (imagen auto-gen via Sharp, stickers 11.U).
- `[11.D.6.3]` Filtro por índice (15 opciones).

**Criterio de done:** Ruta pública carga, shareable WhatsApp OG preview OK.

### BLOQUE 11.E — Causal Engine (~5h)

#### MÓDULO 11.E.1 — `causal-engine.ts` con LLM Sonnet + citations

**Pasos:**
- `[11.E.1.1]` `shared/lib/intelligence-engine/causal/causal-engine.ts`: `explainCausality(input: { indexCode, scopeId, period, delta }) → { explanation: string, drivers: Driver[], citations: Citation[], confidence }`.
- `[11.E.1.2]` Usa Anthropic Sonnet via Vercel AI Gateway. Prompt en `ai_prompt_versions` `causal_explanation_v1`.
- `[11.E.1.3]` Zod schema output obligatorio + citations ≥2 (source + URL + scoreId referenciado).
- `[11.E.1.4]` Tool calling: `getScoreHistory`, `getPeerColonias`, `getMacroSeries`.

**Criterio de done:** Delta MOM Nápoles +8% → explicación con 3 drivers + 2 citations verificables.

#### MÓDULO 11.E.2 — Componente `CausalExplanation` en cards

**Pasos:**
- `[11.E.2.1]` `features/indices/components/CausalExplanation.tsx` lazy-loaded, on-demand al expandir card.
- `[11.E.2.2]` Muestra narrativa + chips drivers (clicables → drill down scores atómicos) + citations footnote.

**Criterio de done:** Click "Por qué?" en card Nápoles MOM → explicación streamed con citations clicables.

#### MÓDULO 11.E.3 — Integración en Scorecard Nacional

**Pasos:**
- `[11.E.3.1]` Scorecard PDF (11.I) invoca `causal-engine` para cada sección "Top Mover" y embebe narrativa.

**Criterio de done:** PDF Q1 2026 incluye 10 explicaciones causales con citations.

#### MÓDULO 11.E.4 — Cache `causal_explanations` TTL 30 días

**Pasos:**
- `[11.E.4.1]` Tabla `causal_explanations (index_code, scope_id, period_date, explanation, drivers jsonb, citations jsonb, generated_at, expires_at)`. RLS public read, service write.
- `[11.E.4.2]` `getCausalExplanation()` consulta cache antes de LLM.

**Criterio de done:** Segunda llamada misma key retorna <50ms cache hit; cost LLM reducido 80%.

### BLOQUE 11.F — Pulse Score (~4h)

#### MÓDULO 11.F.1 — Calculator multi-source

**Pasos:**
- `[11.F.1.1]` `shared/lib/intelligence-engine/pulse/pulse-calculator.ts`. Inputs: DENUE (altas/bajas negocios 30d), permisos_construccion, Google Popular Times API (si disponible), 911 CDMX (incidentes), Ticketmaster (eventos).
- `[11.F.1.2]` Output: `{ pulso_economico, respiracion_comercial, temperatura_social, score_total, diagnostico: 'saludable'|'febril'|'decaido'|'critico' }`.

**Criterio de done:** Colonia con spike DENUE aperturas → pulso_economico ≥80.

#### MÓDULO 11.F.2 — Tabla `zone_pulse_scores`

**Pasos:**
- `[11.F.2.1]` Migration `zone_pulse_scores (id, scope_type, scope_id, period_month, pulso_economico, respiracion_comercial, temperatura_social, score_total, diagnostico, components jsonb, calculated_at)` + RLS public read.

**Criterio de done:** Histórico mensual 12 meses persistido.

#### MÓDULO 11.F.3 — UI "Signos Vitales" semáforo médico

**Pasos:**
- `[11.F.3.1]` Componente `features/indices/components/VitalSignsCard.tsx`: 3 métricas estilo monitor médico (línea ECG animada respeta `prefers-reduced-motion`).
- `[11.F.3.2]` Integrado en `/indices/[code]` cards + `/colonia/[id]`.

**Criterio de done:** UI accesible (aria-labels médicos), colores semántico `--dmx-semantic-success/warning/danger`.

#### MÓDULO 11.F.4 — Cron mensual (consolidado 11.C.2)

**Pasos:**
- `[11.F.4.1]` Master cron dispatch pulse calc día 5 mensual.

**Criterio de done:** Manual trigger escribe 200 colonias CDMX.

### BLOQUE 11.G — Migration Flow v1 (~4h)

#### MÓDULO 11.G.1 — ETL multi-source

**Pasos:**
- `[11.G.1.1]` `shared/lib/etl/migration-flow-etl.ts`: procesa INEGI ENADID (microdatos municipales) + Registro Público Propiedad (transferencias) + INE (cambios de domicilio agregados anónimos) + LinkedIn público (relocations). Todos sources agregados anonimizados.
- `[11.G.1.2]` RLS: raw data restricted a service_role; agregados públicos.

**Criterio de done:** ETL procesa ENADID 2020 + RPP 2023-2025 → `zone_migration_flows` poblada.

#### MÓDULO 11.G.2 — Tabla `zone_migration_flows`

**Pasos:**
- `[11.G.2.1]` Migration: `(id, origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id, volume, period_start, period_end, confidence, sources text[], anonymization_level)` + RLS.

**Criterio de done:** Policy anon SELECT agregados pasa; raw solo service_role.

#### MÓDULO 11.G.3 — Mapa `/indices/flujos` Mapbox flow lines

**Pasos:**
- `[11.G.3.1]` `app/(public)/indices/flujos/page.tsx`: mapa CDMX con flow lines animadas (grosor = volumen, color = dirección).
- `[11.G.3.2]` Filtros: período, alcaldía origen, alcaldía destino.
- `[11.G.3.3]` `prefers-reduced-motion` → flow lines estáticas.

**Criterio de done:** Mapa renderiza flujos top-50 CDMX; filtros interactivos.

#### MÓDULO 11.G.4 — RLS público agregado

**Pasos:**
- `[11.G.4.1]` Policy `migration_flows_public_read`: volumen bucketizado (<100, 100-500, 500-1k, 1k+) sin revelar exactos.

**Criterio de done:** Test RLS anon vs admin verifica bucketización.

### BLOQUE 11.H — Trend Genome + Influencer Heat (~6h)

#### MÓDULO 11.H.1 — Scraping Instagram Apify

**Pasos:**
- `[11.H.1.1]` Actor Apify `apify/instagram-profile-scraper` (o similar según `fetch-actor-details`) para perfiles verificados chefs/galeristas/creadores con ≥10k followers + geo-tags.
- `[11.H.1.2]` Seed list 200 perfiles CDMX culturales validados humano.
- `[11.H.1.3]` Run semanal via cron (consolidado 11.C.2).
- `[11.H.1.4]` Persist en `influencer_geo_signals (influencer_id, location_lat, location_lng, colonia_id, post_date, engagement)`.

**Criterio de done:** 200 perfiles × 4 semanas → `influencer_geo_signals` ≥5000 rows.

#### MÓDULO 11.H.2 — `influencer_heat_zones` + DENUE alpha signals

**Pasos:**
- `[11.H.2.1]` Migration `influencer_heat_zones (colonia_id, score, period_month, mentions_count, engagement_weighted, alpha_category)` + RLS.
- `[11.H.2.2]` Clasificador DENUE: regex/ML categorías "señales alpha" (cafés especialidad, galerías, fine dining, concept stores). Lista curada.

**Criterio de done:** Roma Norte/Juárez influencer_heat ≥80; alpha_signals DENUE clasificados.

#### MÓDULO 11.H.3 — Algoritmo Trend Genome

**Pasos:**
- `[11.H.3.1]` `shared/lib/intelligence-engine/trend-genome/genome-calculator.ts`: combina señales débiles (influencer_heat + alpha DENUE + permisos remodelación residencial↑ + GNT stage=early) → `alpha_score 0-100` + `time_to_mainstream_months`.

**Criterio de done:** Zona con señales tempranas alpha ≥75 + time_to_mainstream estimado 18-36m.

#### MÓDULO 11.H.4 — `zone_alpha_alerts` suscribibles

**Pasos:**
- `[11.H.4.1]` Migration `zone_alpha_alerts (user_id, colonia_id, threshold, notification_channels)` + RLS user-scoped.
- `[11.H.4.2]` Feature-gated Pro+ subscription.

**Criterio de done:** User Pro suscribe alerta; test dispara notif cuando alpha_score cruza threshold.

#### MÓDULO 11.H.5 — Dashboard `/indices/alpha` gated

**Pasos:**
- `[11.H.5.1]` `app/(app)/indices/alpha/page.tsx` ruta Pro+ only (middleware auth). Top 20 zonas alpha emergentes + señales detalladas.

**Criterio de done:** Anon redirect a paywall; Pro+ carga dashboard.

### BLOQUE 11.I — Scorecard Nacional Trimestral (~6h)

#### MÓDULO 11.I.1 — PDF generator completo React-PDF

**Pasos:**
- `[11.I.1.1]` `shared/lib/reports/scorecard-nacional.tsx` (React-PDF): portada branded + resumen ejecutivo AI + 15 rankings top-20 + movilidad (Migration Flow top-10) + metodología resumida + disclaimer CNBV/CONDUSEF.
- `[11.I.1.2]` Generación <2 min; output almacenado en Supabase Storage `reports/scorecard/YYYY-QN.pdf`.

**Criterio de done:** PDF Q1 2026 generado 40-80 páginas coherente.

#### MÓDULO 11.I.2 — Press Kit Auto

**Pasos:**
- `[11.I.2.1]` `shared/lib/reports/press-kit.ts`: genera comunicado prensa (1 página MD + PDF) + 3 quotes atribuibles ("Narvarte lidera Momentum Q1 2026 con +8%, impulsada por...") + 5 gráficas PNG high-res listas para medios.
- `[11.I.2.2]` Published en `/press/scorecard-Q1-2026` + email a `press_contacts`.

**Criterio de done:** Press kit Q1 2026 completo + revisión humana antes release.

#### MÓDULO 11.I.3 — Narrativa AI ejecutiva

**Pasos:**
- `[11.I.3.1]` Causal Engine (11.E) invocado para resumen ejecutivo + top 5 zone stories.

**Criterio de done:** Resumen ejecutivo 2 páginas AI-generated con citations.

#### MÓDULO 11.I.4 — Agregación nacional sostenibilidad

**Pasos:**
- `[11.I.4.1]` Sección "Sostenibilidad Nacional": combina IDS + IRE + IGV (N12) + GRN agregado nacional.

**Criterio de done:** Sección 4 páginas con rankings + narrative.

#### MÓDULO 11.I.5 — Landing `/scorecard-nacional` + archivo

**Pasos:**
- `[11.I.5.1]` `app/(public)/scorecard-nacional/page.tsx` hero + archivo histórico navegable (lista PDF Q-YYYY).
- `[11.I.5.2]` SEO OpenGraph + JSON-LD `Report`.

**Criterio de done:** Landing carga, PDFs descargables, archivo Q1-Q4 navegable.

#### MÓDULO 11.I.6 — Timeline Narrativo Causal histórico (L89)

**Pasos:**
- `[11.I.6.1]` Generador `shared/lib/reports/causal-timeline.ts` que consulta `causal_explanations` 12m+ por colonia, ordena cronológicamente y genera relato continuo vía Causal Engine (prompt timeline especial).
- `[11.I.6.2]` Output: párrafo markdown "Roma Norte subió IPV en marzo por movilidad → bajó en abril por seguridad → recuperó en mayo por nuevos cafés" con citations verificables.
- `[11.I.6.3]` Sección del Scorecard Nacional "Historias del Trimestre" top 5 colonias con timeline narrative.
- `[11.I.6.4]` Export público `/historia/[colonia]` individual para deep-linking prensa.

**Criterio de done:** 5 timelines narrativos Q1 2026 en PDF + páginas individuales SEO-indexables.

#### MÓDULO 11.I.7 — "Pulse DMX" como métrica hero (L95)

**Pasos:**
- `[11.I.7.1]` Elevar Pulse Score como sección hero del Scorecard ("Pulse Nacional 73/100 — salud urbana MX Q1 2026").
- `[11.I.7.2]` Serie temporal pública citeable "Pulse de Roma Norte: 87 (+4 vs Q4)".
- `[11.I.7.3]` Brand guidelines uso oficial "Pulse DMX" en press releases.

**Criterio de done:** Sección hero Scorecard + brand guidelines + citeable en press releases Q1.

### BLOQUE 11.J — Newsletter + Wrapped (~4h)

#### MÓDULO 11.J.1 — Newsletter mensual Resend MJML

**Pasos:**
- `[11.J.1.1]` Template `emails/monthly-mom.mjml`: hero top 5 + mini mapa (imagen gen) + 2 párrafos Causal.
- `[11.J.1.2]` Cron envío día 5 09:00 CDMX (consolidado 11.C.2).
- `[11.J.1.3]` Tabla `newsletter_subscribers` + double opt-in.

**Criterio de done:** Envío real lista seed (Manu + 5 early adopters).

#### MÓDULO 11.J.2 — DMX Wrapped anual 1 enero

**Pasos:**
- `[11.J.2.1]` Endpoint `/wrapped/YYYY` personalizado si user logged (usa colonia suscrita + histórico personal).
- `[11.J.2.2]` Genera 10+ cards estilo Spotify Wrapped.

**Criterio de done:** `/wrapped/2026` renderiza 10 cards personalizadas; anon ve versión genérica "Top colonias 2026".

#### MÓDULO 11.J.3 — Newsletter personalizado por colonia suscrita

**Pasos:**
- `[11.J.3.1]` Opt-in por colonia; email mensual customizado con updates de esa colonia (scores, alertas, Pulse).

**Criterio de done:** User suscrito a Roma Norte recibe email con data Roma Norte.

#### MÓDULO 11.J.4 — Strava Segments colonias (L94) — streaks mensuales

**Pasos:**
- `[11.J.4.1]` Job mensual `shared/lib/reports/streaks-calculator.ts` calcula "streaks" de colonias con Pulse >80 N meses consecutivos.
- `[11.J.4.2]` Tabla `zone_streaks` (scope_id, streak_length_months, current_pulse, rank_in_country).
- `[11.J.4.3]` Sección Newsletter mensual "🔥 Las más vivas este trimestre" top 10.
- `[11.J.4.4]` Endpoint público `/indices/streaks` leaderboard gamificado.
- `[11.J.4.5]` Integración DMX Wrapped anual: "Tu colonia estuvo top-10 durante 7 meses este año".

**Criterio de done:** Leaderboard mensual con top 10 streaks + sección newsletter + integración Wrapped anual.

### BLOQUE 11.K — Preview UX 4 Personas (~8h)

> **SUB-AGENTS PARALELOS:** 11.K.1/K.2/K.3/K.4 en 4 sub-agentes paralelos (rutas Next.js independientes, components aislados).

#### MÓDULO 11.K.1 — `/preview/comprador` onboarding 8 preguntas

**Pasos:**
- `[11.K.1.1]` Wizard react-hook-form + Zod: presupuesto, tamaño familia, commute, prioridades (ranking drag-drop), mascotas, pregunta lifestyle, urgencia, ciudad.
- `[11.K.1.2]` Endpoint `trpc.preview.comprador.match` → retorna 3 colonias match con scores LIV/FAM/IPV.
- `[11.K.1.3]` UI resultado cards con "Por qué te combina" (Causal Engine).

**Criterio de done:** 8 preguntas → 3 cards coherentes en <3s.

#### MÓDULO 11.K.2 — `/preview/asesor` pitch builder

**Pasos:**
- `[11.K.2.1]` UI: cliente dummy seleccionable (3 perfiles demo) + zona real → genera pitch deck PDF 8 slides con scores + comparables + forecast.
- `[11.K.2.2]` Dopamine tokens + React-PDF + QR hacia landing colonia.

**Criterio de done:** Pitch "Del Valle para family con kids" renderiza PDF shareable.

#### MÓDULO 11.K.3 — `/preview/developer` heatmap oportunidades

**Pasos:**
- `[11.K.3.1]` Mapa CDMX con heatmap togglable 15 índices (slider layer opacity).
- `[11.K.3.2]` Layers: demand pull + supply gap + IAB + MOM + STR.
- `[11.K.3.3]` Click zone → modal oportunidad detallada con proforma simplificada.

**Criterio de done:** Toggle 15 layers fluido; modal con proforma renderiza.

#### MÓDULO 11.K.4 — `/preview/masterbroker` comando central

**Pasos:**
- `[11.K.4.1]` Tabla agentes demo (10 rows) + territory map interactivo.
- `[11.K.4.2]` KPIs: pipeline, conversion, zonas asignadas, alertas.

**Criterio de done:** UI comando central demo funcional; territory map interactivo.

### BLOQUE 11.L — APIs públicas + Widget + Time Machine (~5h)

#### MÓDULO 11.L.1 — Widget embebible `/embed/score/[colonia]`

**Pasos:**
- `[11.L.1.1]` `app/(embed)/embed/score/[coloniaSlug]/page.tsx` minimal layout iframe-friendly (no header/footer app).
- `[11.L.1.2]` Snippet HTML copy-paste: `<iframe src="https://desarrollosmx.com/embed/score/roma-norte" width="400" height="500" frameborder="0"></iframe>`.
- `[11.L.1.3]` CORS + X-Frame-Options configurados allow-all embeds.

**Criterio de done:** Iframe embebido en CodePen renderiza score card Roma Norte.

#### MÓDULO 11.L.2 — Time Machine API `/api/v1/scores/history`

**Pasos:**
- `[11.L.2.1]` Endpoint REST paginado: `?scope=colonia&id=roma-norte&scoreId=F01&from=2023-01&to=2026-03&limit=100&cursor=...`.
- `[11.L.2.2]` Rate limit 1000 req/día anon; Pro+ 100k/día.
- `[11.L.2.3]` Docs Swagger en `/api/v1/docs`.

**Criterio de done:** Query "F01 Roma Norte 2023-2026" retorna 36 rows; rate limit funciona.

#### MÓDULO 11.L.3 — Vital Signs Widget (XF-05)

**Pasos:**
- `[11.L.3.1]` Variante embed `/embed/pulse/[colonia]` con monitor médico animado.

**Criterio de done:** Iframe renderiza Vital Signs independiente.

#### MÓDULO 11.L.4 — REST API endpoints v1

**Pasos:**
- `[11.L.4.1]` `/api/v1/indices/:code` (rankings), `/api/v1/indices/:code/:scope/:id` (valor específico).
- `/api/v1/colonias/:id` (perfil completo).
- `/api/v1/similar/:coloniaId` (Genoma match).
- `[11.L.4.2]` Auth: API key header `x-dmx-api-key`; tabla `api_keys` con scopes + rate limits.
- `[11.L.4.3]` OpenAPI spec generada auto.

**Criterio de done:** 4 endpoints funcionales; Postman collection published.

#### MÓDULO 11.L.5 — Hash-based URL sharing backtests (L84)

**Pasos:**
- `[11.L.5.1]` Encoder `features/indices-publicos/lib/backtest-hash.ts`: hash compact de `{ indexCode, topN, fromDate, toDate, coloniaIds[] }` → base64url URL-safe string <200 chars.
- `[11.L.5.2]` Route `/indices/backtest?h={hash}` decodifica y pre-rellena form.
- `[11.L.5.3]` Share button en `/indices/backtest` genera URL hash + copy-to-clipboard + previews OpenGraph auto.

**Criterio de done:** Crear backtest "Top-5 DMX-MOM CDMX 2023-2026" → compartir URL → abrir en otro browser → reproduce vista idéntica.

#### MÓDULO 11.L.6 — Pulse Comparador lado-a-lado (L92)

**Pasos:**
- `[11.L.6.1]` Ampliar `features/pulse-score/components/VitalSigns.tsx` con prop `compareWith?: coloniaId` que superpone 2 sparklines.
- `[11.L.6.2]` Embed `/embed/pulse/[colonia]/vs/[coloniaCompare]` iframe compare mode.
- `[11.L.6.3]` UI colonia detail: toggle "Comparar con otra colonia" + autocomplete selector.
- `[11.L.6.4]` Leyenda + colores distintos oklch por serie + hover sincronizado cross-series.

**Criterio de done:** Usuario compara Pulse Narvarte vs Roma Sur lado-a-lado con animaciones sincronizadas.

### BLOQUE 11.M — Genoma de Colonias SEED (~4h) ✅ shipped SHA aa0334b (PR #26)

#### MÓDULO 11.M.1 — Vectores 64-dim pgvector

**Pasos:**
- `[11.M.1.1]` Migration `colonia_embeddings (colonia_id, vector vector(64), version, generated_at)` con índice HNSW.
- `[11.M.1.2]` Builder `shared/lib/intelligence-engine/genome/embedding-builder.ts`: vector compuesto 64-dim = concat scores N0-N3 normalizados + top-15 índices + categóricos one-hot.

**Criterio de done:** 200 colonias CDMX embeddings persistidos v1.

#### MÓDULO 11.M.2 — `findSimilarColonias(id, topN)` cosine

**Pasos:**
- `[11.M.2.1]` Query pgvector cosine similarity `<=>` retorna topN más similares.
- `[11.M.2.2]` Cache Redis 24h.

**Criterio de done:** Similar a "Condesa" retorna Roma Norte/Juárez/Escandón top 3.

#### MÓDULO 11.M.3 — API `/api/v1/similar/[coloniaId]` público

**Pasos:**
- `[11.M.3.1]` REST endpoint público read.

**Criterio de done:** Curl retorna top-10 similares con similarity score.

### BLOQUE 11.N — Futures Curve SEED (~3h) ✅ shipped SHA aa0334b (PR #26)

#### MÓDULO 11.N.1 — Forward 6m MOM heurística H1

**Pasos:**
- `[11.N.1.1]` `shared/lib/intelligence-engine/futures/curve-calculator.ts`: proyección 6 meses usando momentum + seasonality (FFT decomposition simple).
- `[11.N.1.2]` Output: `[{ month_offset: 1..6, projected_value, confidence_interval }]`.
- `[11.N.1.3]` Disclaimer "proyección heurística, no recomendación".

**Criterio de done:** Curva 6m Nápoles con banda confianza coherente.

#### MÓDULO 11.N.2 — UI `/indices/[code]/futuros` yield-curve style

**Pasos:**
- `[11.N.2.1]` Recharts chart forward curve; comparar múltiples colonias.

**Criterio de done:** UI renderiza 3 colonias superpuestas forward curve.

#### MÓDULO 11.N.3 — Pulse Pronóstico 30 días forward (L93)

**Pasos:**
- `[11.N.3.1]` Extender `shared/lib/intelligence-engine/futures/curve-calculator.ts` con `calculatePulseForecast(zoneId, days=30)`.
- `[11.N.3.2]` Inputs: zone_pulse_scores 12m + eventos próximos conocidos (permisos aprobados futuro, metro inaugurándose) vía calendar ingestion stub.
- `[11.N.3.3]` Tabla `futures_curve_projections` extendida con kind='pulse' además de 'index'.
- `[11.N.3.4]` UI mini-forecast embebido en VitalSigns component (11.F) con banda de confianza sombreada.
- `[11.N.3.5]` Disclaimer "proyección heurística 30d, no garantía".

**Criterio de done:** VitalSigns muestra pronóstico 30d con banda sombreada + disclaimer visible.

### BLOQUE 11.O — LifePath SEED (~3h)

#### MÓDULO 11.O.1 — Formulario `/lifepath` perfil

**Pasos:**
- `[11.O.1.1]` Wizard completo react-hook-form + Zod: ingresos, familia, trabajo, preferencias lifestyle, horizonte 5/10/20 años.
- `[11.O.1.2]` Persist en `lifepath_user_profiles` con RLS user-scoped.

**Criterio de done:** Perfil guardado; retorno usuario pre-fill.

#### MÓDULO 11.O.2 — Endpoint matching contra Genoma

**Pasos:**
- `[11.O.2.1]` `trpc.lifepath.match` pondera perfil → embedding → cosine match Genoma.

**Criterio de done:** Perfil "family-kids" retorna Del Valle/Coyoacán/Polanco top-5.

#### MÓDULO 11.O.3 — Integración en `/preview/comprador`

**Pasos:**
- `[11.O.3.1]` Reutiliza endpoint LifePath match como motor backend del preview comprador.

**Criterio de done:** Comprador flow usa LifePath engine unificado.

### BLOQUE 11.P — Climate Twin SEED (~3h)

#### MÓDULO 11.P.1 — Proyección NOAA + CONAGUA 15 años

**Pasos:**
- `[11.P.1.1]` ETL `shared/lib/etl/climate-twin-etl.ts`: ingesta NOAA CMIP6 regional MX + CONAGUA anuarios (agua disponible) + WHO air quality projections.
- `[11.P.1.2]` Migration `climate_twin_projections (colonia_id, year, temp_projected, water_available_idx, air_quality_idx, climate_risk_score, confidence)`.

**Criterio de done:** 200 colonias × 15 años projected data persist.

#### MÓDULO 11.P.2 — Climate Causality (XF-02)

**Pasos:**
- `[11.P.2.1]` Extender Causal Engine (11.E) con dimensión climática: al explicar delta, considerar tendencias climáticas si relevantes.

**Criterio de done:** Explicación Xochimilco GRN incluye "proyección hídrica 2040".

#### MÓDULO 11.P.3 — Badge "Clima 2040" en cada colonia

**Pasos:**
- `[11.P.3.1]` Componente `ClimateBadge.tsx` visible en card colonia: "Clima 2040: Estable/Riesgo Moderado/Alto Riesgo".

**Criterio de done:** Badge renderiza en `/colonia/[id]` + tooltip explicativo.

### BLOQUE 11.Q — Ghost Zones Detector (~2h)

#### MÓDULO 11.Q.1 — Algoritmo detección

**Pasos:**
- `[11.Q.1.1]` Calculator `shared/lib/intelligence-engine/ghost/ghost-detector.ts`: filtro `score_total > 75 AND search_volume < p25 AND press_mentions < p25`.
- `[11.Q.1.2]` Requiere integración Google Trends (search_volume) + scraping prensa.
- `[11.Q.1.3]` Migration `ghost_zone_rankings (colonia_id, score_total, search_volume_pct, press_mentions_pct, ghost_score, period_month)`.

**Criterio de done:** ≥5 "ghost zones" detectadas CDMX Q1 2026.

#### MÓDULO 11.Q.2 — Ranking `/indices/ghost` gated Pro+

**Pasos:**
- `[11.Q.2.1]` UI gated middleware auth; top-20 ghost zones + rationale.

**Criterio de done:** Pro+ access OK; anon paywall.

### BLOQUE 11.R — Zone Constellations SEED (~3h)

#### MÓDULO 11.R.1 — Grafo pgraph edges

**Pasos:**
- `[11.R.1.1]` Migration `zone_constellations_edges (source_colonia_id, dest_colonia_id, edge_type: 'commute'|'referral'|'migration', weight, period)`.
- `[11.R.1.2]` ETL agregar edges desde Migration Flow + commute data (INEGI) + referrals (proyectos H05).

**Criterio de done:** ≥5000 edges persistidas CDMX.

#### MÓDULO 11.R.2 — Visualización D3 force-directed

**Pasos:**
- `[11.R.2.1]` `app/(public)/indices/constelaciones/page.tsx`: grafo interactivo D3.js (forzas + zoom + cluster).
- `[11.R.2.2]` Respeta `prefers-reduced-motion`: render estático snapshot SVG si reduced.

**Criterio de done:** Grafo 200 nodos + 5000 edges renderiza <1s.

### BLOQUE 11.S — Living Atlas SEED (~3h)

#### MÓDULO 11.S.1 — Wiki auto-gen `/atlas/[colonia]`

**Pasos:**
- `[11.S.1.1]` `app/(public)/atlas/[coloniaSlug]/page.tsx`: página wiki con secciones fotos + historia (AI-gen con citations) + scores live + canciones asociadas (Spotify API opcional) + mapa + residentes famosos (Wikipedia).
- `[11.S.1.2]` ISR revalidate 24h.

**Criterio de done:** `/atlas/roma-norte` 1500+ palabras + 5 secciones.

#### MÓDULO 11.S.2 — Schema `colonia_wiki_entries` versioning H2

**Pasos:**
- `[11.S.2.1]` Migration `colonia_wiki_entries (id, colonia_id, section, content, version, author_type: 'ai'|'resident'|'editor', approved_by, approved_at, previous_version_id)`.
- `[11.S.2.2]` RLS: public read approved only; INSERT/UPDATE residentes H2 con workflow aprobación.

**Criterio de done:** Versioning operativo; workflow seed preparado para H2.

#### MÓDULO 11.S.3 — Seed 200 colonias CDMX AI-gen + revisión

**Pasos:**
- `[11.S.3.1]` Batch gen con Sonnet + citations obligatorias Wikipedia/INAH/medios.
- `[11.S.3.2]` Cola `pending_human_review` para validar ≥50 colonias antes release público.

**Criterio de done:** 200 colonias seed generadas; 50 revisadas humano antes tag.

### BLOQUE 11.T — Alert Radar WhatsApp (~3h)

#### MÓDULO 11.T.1 — `zone_alert_subscriptions` tabla

**Pasos:**
- `[11.T.1.1]` Migration `zone_alert_subscriptions (user_id, colonia_id, threshold_pct, channel: 'whatsapp'|'email', active, created_at)` + RLS user-scoped.

**Criterio de done:** User suscribe desde UI; RLS correcta.

#### MÓDULO 11.T.2 — Trigger cambio score

**Pasos:**
- `[11.T.2.1]` Función BD `notify_zone_alerts(colonia_id, score_delta_pct)` ejecutada post-cron indices; filtra subscriptions match threshold → enqueue notificación.

**Criterio de done:** Score MOM Nápoles delta +8% → subscribers ≥5% threshold reciben trigger.

#### MÓDULO 11.T.3 — Template Meta WhatsApp aprobado

**Pasos:**
- `[11.T.3.1]` Template `zone_alert_v1` registrado Meta Business Manager (requiere aprobación Meta pre-launch).
- `[11.T.3.2]` Send via WhatsApp Cloud API (env `WHATSAPP_BUSINESS_TOKEN`).

**Criterio de done:** Template aprobado Meta; test send funcional a Manu.

#### MÓDULO 11.T.4 — Why-alerts causal push notifications (L90)

**Pasos:**
- `[11.T.4.1]` Extender `notify_zone_alerts` BD function: antes de enviar alerta, llamar Causal Engine (11.E) con forceRegenerate=false para obtener explicación cacheada.
- `[11.T.4.2]` Template WhatsApp `zone_alert_causal_v1`: "Narvarte DMX-IPV {{1}}pts hoy — razón: {{2}}. Ver más: {{3}}" con 3 variables dinámicas.
- `[11.T.4.3]` Feature flag `alert_with_causal`: Pro+ tier activa por default; free tier sin causal (solo número).
- `[11.T.4.4]` Rate limit independiente: max 1 causal push / colonia / 24h (evita spam).

**Criterio de done:** User Pro+ suscrito recibe WhatsApp con delta + explicación causal + link.

#### MÓDULO 11.T.5 — Pulse Alertas anomalías >15pts delta (L91)

**Pasos:**
- `[11.T.5.1]` Extender `notify_zone_alerts` para trigger también desde `zone_pulse_scores` (no solo `dmx_indices`).
- `[11.T.5.2]` Filtro: si Δ pulse_score mes-sobre-mes abs() > 15 → trigger alerta "salud urbana" con tono distinto al de índices.
- `[11.T.5.3]` Template `zone_pulse_anomaly_v1`: "🚨 Pulse {{colonia}}: {{direction}} {{delta}}pts ({{before}}→{{after}}). Causas detectadas: {{brief}}".
- `[11.T.5.4]` Integración con Causal Engine para campo brief (si aplica).

**Criterio de done:** Test manual inyecta pulse drop Nápoles -18 → 3 subscribers reciben alerta con explicación causal.

#### MÓDULO 11.T.6 — Multi-señal Alert Radar (índice + pulse + causal)

**Pasos:**
- `[11.T.6.1]` UI `/alerts` dashboard: user ve sus suscripciones activas + historial últimos 30 alertas recibidos.
- `[11.T.6.2]` Granularidad: suscribir a colonia para { indices: true, pulse: true, causal: false } por ejemplo.
- `[11.T.6.3]` Settings `frequency_cap`: max 3 alertas/día default (evita fatiga).

**Criterio de done:** Dashboard `/alerts` funciona; user configura granularidad + cap; historial 30d visible.

### BLOQUE 11.U — Stickers Descargables (~2h)

#### MÓDULO 11.U.1 — Generator Sharp + SVG template

**Pasos:**
- `[11.U.1.1]` `shared/lib/stickers/sticker-generator.ts`: SVG template Dopamine + data dinámica (colonia, score, rank) → PNG 1080×1080.
- `[11.U.1.2]` Endpoint `/api/stickers/[coloniaId]/[indexCode]` retorna PNG.

**Criterio de done:** Sticker "Roma Norte LIV 87 Top 3 CDMX 2026" 1080×1080 descarga OK.

#### MÓDULO 11.U.2 — Badges descargables gratis

**Pasos:**
- `[11.U.2.1]` Catálogo badges en `/badges`: embeddable sites terceros + compartible redes.

**Criterio de done:** Catálogo 15 badges × 200 colonias navegable.

#### MÓDULO 11.U.3 — Landing `/badges` catálogo

**Pasos:**
- `[11.U.3.1]` UI galería + download button + código embed HTML.

**Criterio de done:** Landing carga; descarga funcional.

### BLOQUE 11.V — DNA Migration (XF-01) (~2h)

#### MÓDULO 11.V.1 — Combinar Genoma + Migration Flow

**Pasos:**
- `[11.V.1.1]` `shared/lib/intelligence-engine/dna-migration/matcher.ts`: dado colonia origen, retorna colonias destino con (a) high genetic similarity (Genoma) + (b) existing migration flow >0 (Migration Flow).
- `[11.V.1.2]` Migration `dna_migration_matches (origin_colonia_id, dest_colonia_id, genetic_similarity, actual_flow, compound_score)`.

**Criterio de done:** Query "Roma Norte" retorna destinos compatibles + flow real.

#### MÓDULO 11.V.2 — Visualización flujo genético animado

**Pasos:**
- `[11.V.2.1]` Integrar en `/indices/flujos` layer "DNA compatible" toggleable.

**Criterio de done:** Layer DNA visible; animación respeta reduced-motion.

### BLOQUE 11.W — Historical Forensics (XF-08) (~3h)

#### MÓDULO 11.W.1 — Reportes "La historia de [colonia] 2014-2026"

**Pasos:**
- `[11.W.1.1]` `shared/lib/reports/historical-forensics.ts`: combina Time Machine (11.L.2) + Causal Engine (11.E) → reporte narrativo 12 años evolución.
- `[11.W.1.2]` Migration `historical_forensics_reports (colonia_id, period_from, period_to, content, citations, generated_at)`.

**Criterio de done:** Reporte "Narvarte 2014-2026" 10 páginas AI+citations.

#### MÓDULO 11.W.2 — PDF educativo prensa

**Pasos:**
- `[11.W.2.1]` React-PDF template editorial; published en `/press/historia/[colonia]`.

**Criterio de done:** PDF Narvarte listo para prensa.

#### MÓDULO 11.W.3 — Ruta `/historia/[colonia]` SEO

**Pasos:**
- `[11.W.3.1]` `app/(public)/historia/[coloniaSlug]/page.tsx` ISR 7d; JSON-LD `Article`.

**Criterio de done:** Lighthouse SEO ≥95.

### BLOQUE 11.X — Living Metropolitan Networks (XF-09) (~2h)

#### MÓDULO 11.X.1 — Combinar Constellations + Migration

**Pasos:**
- `[11.X.1.1]` Vista materializada `metropolitan_networks_view` que combina constellations edges + migration flows + commute patterns → red viva.

**Criterio de done:** View refresca diaria; queries <500ms.

#### MÓDULO 11.X.2 — Mapa `/explorar-redes`

**Pasos:**
- `[11.X.2.1]` `app/(public)/explorar-redes/page.tsx`: mapa CDMX con animación flows + constellations.
- `[11.X.2.2]` Filtros: tipo red (commute/migration/social).

**Criterio de done:** Mapa interactivo 3 capas toggleable.

### BLOQUE 11.Y — Zone Certification Integration (~2h)

#### MÓDULO 11.Y.1 — Badge oficial rankings

**Pasos:**
- `[11.Y.1.1]` Integrar `zone_certifications` (FASE 10) en `/indices/[code]`: badge visible en tabla rankings.
- `[11.Y.1.2]` Link modal certificación (issuer, fecha, validity).

**Criterio de done:** Certified colonias muestran badge en rankings.

#### MÓDULO 11.Y.2 — Filtro `certified_only`

**Pasos:**
- `[11.Y.2.1]` Toggle UI `/indices` para mostrar solo colonias certificadas.

**Criterio de done:** Filtro funcional; URL query param `?certified=1`.

### BLOQUE 11.Z — E2E Verification + Tests + Tag (~4h)

#### MÓDULO 11.Z.1 — E2E Playwright specs

**Pasos:**
- `[11.Z.1.1]` ≥50 specs nuevos cubriendo: rankings público, metodología, terminal pro, backtest, movers, scorecard nacional, newsletter, wrapped, preview comprador/asesor/developer/masterbroker, widget embed, time machine API, genoma similar, lifepath match, climate twin badge, ghost zones gated, constellations render, atlas wiki, alerts WhatsApp subscribe, stickers download, historical forensics, certification badge.

**Criterio de done:** 50 specs verde CI Playwright.

#### MÓDULO 11.Z.2 — Tests unit Vitest ≥400

**Pasos:**
- `[11.Z.2.1]` 15 calculators × ≥6 casos + orquestador + causal engine + pulse + migration + trend genome + genoma + futures + lifepath + climate twin + ghost + constellations + DNA + historical.

**Criterio de done:** ≥400 tests verde; coverage ≥80% nuevo código.

#### MÓDULO 11.Z.3 — `audit-dead-ui.mjs` STRICT

**Pasos:**
- `[11.Z.3.1]` Todos botones/links UI FASE 11 mapeados a endpoint real (no href="#" ni onClick vacíos).

**Criterio de done:** Script modo STRICT retorna 0 dead UI.

#### MÓDULO 11.Z.4 — `audit-rls.mjs` STRICT allowlist_v9

**Pasos:**
- `[11.Z.4.1]` Todas tablas nuevas + SECDEF functions FASE 11 en allowlist_v9 (ver 11.A.2.3).

**Criterio de done:** Script modo STRICT retorna 0 violations.

#### MÓDULO 11.Z.5 — Lighthouse SEO ≥95

**Pasos:**
- `[11.Z.5.1]` Probar `/indices`, `/metodologia`, `/atlas/*`, `/scorecard-nacional`, `/historia/*` con Lighthouse CI.

**Criterio de done:** SEO ≥95 todas las rutas públicas.

#### MÓDULO 11.Z.6 — ADR-018 E2E Connectedness compliance

**Pasos:**
- `[11.Z.6.1]` Actualizar `docs/03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md` con mapping completo features FASE 11: botón UI → tRPC procedure → service → BD table → RLS policy → trigger → cron.
- `[11.Z.6.2]` Verificar con script `audit:e2e-map` que 100% features mapeadas.

**Criterio de done:** Mapping 100% completo; script pasa.

#### MÓDULO 11.Z.7 — i18n 100% 5 locales

**Pasos:**
- `[11.Z.7.1]` Zero strings hardcoded; `useTranslations` / `getTranslations` en todos components.
- `[11.Z.7.2]` 5 locales: es-MX, es-CO, es-AR, pt-BR, en-US.

**Criterio de done:** Script `audit:i18n` STRICT pasa.

#### MÓDULO 11.Z.8 — A11y WCAG 2.1 AA + prefers-reduced-motion

**Pasos:**
- `[11.Z.8.1]` axe-playwright CI ≥95% pass; keyboard nav; contrast ≥4.5:1; focus visible; reduced-motion respeta animaciones Mapbox/D3/flow lines.

**Criterio de done:** axe CI verde.

#### MÓDULO 11.Z.9 — Commit ritual + tag

**Pasos:**
- `[11.Z.9.1]` Commits atómicos por bloque: `fase-11/bloque-11.A.1: migration dmx_indices v2 + 15 códigos`.
- `[11.Z.9.2]` Tag final `fase-11-complete` post merge squash PR.

**Criterio de done:** Tag pushed; PR `fase-11-xl` merged main.

#### MÓDULO 11.Z.10 — Migration causal_explanations cost_usd columns (L87)

**Pasos:**
- `[11.Z.10.1]` Migration `20260421_fase11_causal_cost_tracking.sql`: ALTER TABLE `causal_explanations` ADD COLUMN `cost_usd numeric(10,6)` + `tokens_in integer` + `tokens_out integer` (NULL para rows existentes).
- `[11.Z.10.2]` Actualizar `causal-engine.ts` para persistir cost/tokens exactos en vez de proxy row-count × $0.01.
- `[11.Z.10.3]` Actualizar `cost-guard.ts` para sum real de `cost_usd` día actual.
- `[11.Z.10.4]` Backfill script: para rows pre-existing, estimar cost por model + len(explanation_md) heurístico.
- `[11.Z.10.5]` audit_rls_allowlist bump version si hay cambios SECDEF (no esperados).

**Criterio de done:** Migration aplicada prod; cost-guard usa columna real; backfill ejecutado; 0 violations audit_rls.

## Criterio de done de la FASE

- [ ] 15 índices DMX calculándose en 4 scope_types (colonia/alcaldia/city/estado) para CDMX.
- [ ] `dmx_indices` poblada con ≥1 período vigente para los 15 códigos × ≥200 colonias CDMX.
- [ ] `methodology_version` persistida para los 15 índices; changelog navegable.
- [ ] RLS + audit_rls_allowlist_v9 aplicadas a todas tablas nuevas (17+ tablas).
- [ ] Registry 15 `IndexRegistryEntry` + helpers en `shared/lib/intelligence-engine/registry.ts`.
- [ ] Orquestador `calculateAllIndicesForScope` + batch 200 colonias <180s.
- [ ] Cron maestro único + annual Wrapped registrados en `vercel.json` (dentro límite 20 Free tier).
- [ ] Triggers cascade BD: UPDATE zone_scores → enqueue índices afectados automáticamente.
- [ ] Rutas públicas `/indices` (15 tabs), `/metodologia` (15 subrutas + PDF), `/indices/pro`, `/indices/backtest`, `/indices/movers`, `/indices/flujos`, `/indices/alpha` (gated), `/indices/ghost` (gated), `/indices/constelaciones`, `/explorar-redes`, `/scorecard-nacional`, `/atlas/[colonia]` (200 seeded), `/historia/[colonia]`, `/wrapped/2026`, `/lifepath`, `/badges`, `/preview/comprador`, `/preview/asesor`, `/preview/developer`, `/preview/masterbroker`.
- [ ] API REST v1: `/api/v1/indices/*`, `/api/v1/colonias/*`, `/api/v1/similar/*`, `/api/v1/scores/history` + auth API key + rate limits + Swagger docs.
- [ ] Widget embebible `/embed/score/[colonia]` + `/embed/pulse/[colonia]` CORS/X-Frame OK.
- [ ] Causal Engine operativo con cache `causal_explanations` TTL 30d.
- [ ] Pulse Score Signos Vitales UI + histórico 12m.
- [ ] Migration Flow v1 ETL + mapa flujos animado + RLS agregado anonimizado.
- [ ] Trend Genome + Influencer Heat scraping + alpha alerts suscribibles Pro+.
- [ ] Scorecard Nacional Q1 2026 PDF + Press Kit + Narrativa AI + Landing `/scorecard-nacional` con archivo histórico.
- [ ] Newsletter mensual Resend broadcast día 5 + DMX Wrapped 1 enero + newsletters personalizados por colonia suscrita.
- [ ] Genoma pgvector 64-dim × 200 colonias + `findSimilarColonias` funcional.
- [ ] Futures Curve 6m forward + UI yield-curve style.
- [ ] LifePath form + matching Genoma integrado en preview comprador.
- [ ] Climate Twin NOAA/CONAGUA 15a projections + badge "Clima 2040" + integración Causal.
- [ ] Ghost Zones detector operativo + ranking Pro+.
- [ ] Zone Constellations grafo D3 + `zone_constellations_edges` ≥5000.
- [ ] Living Atlas 200 colonias wiki seeded + workflow residentes H2 listo.
- [ ] Alert Radar WhatsApp template Meta aprobado + subscriptions user-scoped.
- [ ] Stickers generator + catálogo `/badges`.
- [ ] DNA Migration matcher + visualización flujo genético.
- [ ] Historical Forensics reportes "historia colonia 2014-2026" + PDF editorial.
- [ ] Living Metropolitan Networks mapa `/explorar-redes` 3 capas.
- [ ] Zone Certification integration badge en rankings + filtro `certified_only`.
- [ ] Preview UX 4 personas (comprador/asesor/developer/masterbroker) funcionales end-to-end.
- [ ] E2E Playwright ≥50 specs nuevos verde CI.
- [ ] Vitest unit ≥400 tests nuevos verde; coverage ≥80% nuevo código.
- [ ] `audit-dead-ui.mjs` STRICT pasa (0 dead UI).
- [ ] `audit-rls.mjs` STRICT pasa (allowlist_v9 completo).
- [ ] Lighthouse SEO ≥95 en `/indices`, `/metodologia`, `/atlas/*`, `/scorecard-nacional`, `/historia/*`.
- [ ] ADR-018 E2E Connections Map `03.13_E2E_CONNECTIONS_MAP.md` actualizado con mapping 100% features FASE 11.
- [ ] i18n 100% 5 locales (es-MX, es-CO, es-AR, pt-BR, en-US); zero strings hardcoded.
- [ ] A11y WCAG 2.1 AA + `prefers-reduced-motion` respeta Mapbox/D3/flow lines.
- [ ] Docs actualizadas: `03.11_CATALOGO_PRODUCTOS_B2B.md` (Momentum Index + Livability API + Risk Score + Developer Health + STR Radar); `07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` (laterales implementados marked done).
- [ ] Commits atómicos por bloque (`fase-11/bloque-11.X.Y: ...`).
- [ ] Tag git `fase-11-complete` pushed; PR `fase-11-xl` merged main.

## Próxima fase

[FASE 12 — IE AI Scores N5 + Intelligence Cards + Mapa 7 Capas](./FASE_12_IE_AI_SCORES_N5.md)

---

## Laterals pipeline (proposed durante ejecución previa)

Ver registro maestro: `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`

Aplican en esta fase (status actualizado post-expansión XL):

- **L1 Zona Wrapped anual** (Spotify Wrapped pattern) — capitalizar score history acumulado en resumen visual compartible. **Incorporado en BLOQUE 11.J.2** (DMX Wrapped anual 1 enero personalizado).
- **L6 DMX Vibe Score™** (Zillow Zestimate pattern) — **Superado por BLOQUE 11.H Trend Genome + Influencer Heat**, que combina señales culturales (Instagram + DENUE alpha) de forma más robusta que combinación simple N01+N08+N09+N11. Decisión legal registro marca diferida a H2.
- **L8 Today's Top Movers** (Robinhood pattern) — dashboard público top zonas subieron/bajaron. **Incorporado en BLOQUE 11.D.6** (`/indices/movers` con 15 índices filtrable + share WhatsApp stickers auto-gen).
- **L22 DMX Score Time Travel** (Snowflake Time Travel pattern) — API público consulta histórica scores. **Incorporado en BLOQUE 11.L.2** (`/api/v1/scores/history` paginado + rate limit + Swagger docs).

Laterales nuevas propuestas durante ejecución FASE 11 XL (para pipeline maestro):

- **L-XL1 Causal Narrative Engine cross-vertical** — generalizar Causal Engine (11.E) como servicio independiente licenciable a otros verticales (finanzas, retail, salud pública).
- **L-XL2 Pulse Score Urbano público tiempo real** — exponer Vital Signs (11.F) como dashboard público tipo "Bloomberg Terminal de Ciudades" con refresh minutos.
- **L-XL3 Living Atlas UGC residentes** — abrir H2 edición wiki colonias por residentes verificados con reputation system.
- **L-XL4 Climate Twin Municipal B2B** — licenciar Climate Twin (11.P) a municipios MX para planeación urbana 15a horizon.
- **L-XL5 Genoma de Ciudades cross-country** — expandir Genoma colonias a ciudades LATAM completas; match "CDMX-like" en Bogotá/Buenos Aires/São Paulo.
- **L-XL6 STR Regulatory Radar** — producto B2B para inversores Airbnb con alertas regulación municipal pre-cambios legales.

Al ejecutar FASE 11, revisar status en pipeline maestro y confirmar incorporación al scope.

---

**Autor:** Claude Opus 4.7 (1M context) | **Fecha:** 2026-04-21 | **Pivot:** FASE 11 XL moonshot founder-approved
