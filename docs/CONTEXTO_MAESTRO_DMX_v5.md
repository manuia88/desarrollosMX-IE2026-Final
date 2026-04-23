# CONTEXTO MAESTRO — DesarrollosMX v5 Dopamine Edition

**Generado:** 2026-04-17 | Abril 2026
**Autor de la síntesis:** Claude (Opus 4.7 · 1M context)
**Branch:** `main` | **Commits v5.1:** 5 (9471e90 → 49b3bb5)
**Documento:** Síntesis consolidada fiel de las 28 fuentes primarias en `docs/biblia-v5/` + el estado real del repo.

Convenciones de citas:
- `BIBLIA-§N` → Biblia 17_BIBLIA_DMX_v5, sección N
- `BE1/BE2/BE3` → 01/02/03_BACKEND_PART{1,2,3}.md
- `FE1/FE2` → 04/05_FRONTEND_PART{1,2}.md
- `IE1..IE5` → 06..10_IE_PART{1..5}.md
- `INS` → 11_INSTRUCCIONES_MAESTRAS
- `XIND` → 12_CROSS_INDUSTRY
- `HABI` → 13_REPORTE_HABI
- `SEC` → 14_AUDITORIA_SEGURIDAD
- `E2E` → 15_CONEXIONES_E2E
- `P01..P09` → 01..09 DOCX Pulppo (tras conversión pandoc)
- `JSX` → dmx-dopamine-v2.jsx

> **Nota de método.** Todo dato de BD, tRPC, API, crons, scores está citado. Donde la biblia MD y el CLAUDE.md del repo difieren en conteos, se toma el conteo de la biblia 17 (la fuente más reciente, post-auditoría Etapa 0). Toda ejecución futura debe verificar contra `information_schema` antes de emitir SQL.

---

## 1. IDENTIDAD Y VISIÓN

- **Nombre**: DesarrollosMX v5 Dopamine Edition (BIBLIA-§1)
- **Categoría**: **Spatial Decision Intelligence** (IE1-§1.3, BIBLIA-§1)
- **Misión**: *"Construir la representación digital más precisa de las ciudades de México, y hacer que cada decisión que involucre una ubicación sea fundamentalmente mejor."* (IE1-§1.1, BIBLIA-§1)
- **Principio rector**: *"El marketplace es el canal de distribución. El IE es el producto. Los datos temporales acumulados son el moat."* (IE1-§1.2, BIBLIA-§1, XIND-§Flywheel)
- **Regla de 5 preguntas para cada línea de código** (IE1-§1.2, BIBLIA-§1): (1) ¿Genera datos que otro módulo consume? (2) ¿Consume datos que otro módulo genera? (3) ¿Reduce fricción para que un usuario genere más datos? (4) ¿Hace que un usuario tome una mejor decisión? (5) ¿Mide algo que nos ayuda a mejorar la plataforma (AARRR)? → Si NO a las cinco, no se construye.
- **Los 3 shifts fundamentales** (IE1-§1.4):
  1. De datos a decisiones (Palantir)
  2. De scores estáticos a digital twin temporal (Tesla)
  3. De plataforma a sistema operativo (iOS)
- **Flywheel** (IE1-§1.6, XIND-§PARTE 4): Contenido → atrae Desarrolladores + Compradores → Marketplace genera datos → IE (108 scores) → DMX API → Terceros (bancos/aseguradoras/portales/fintechs/gobierno/valuadores/academia) → validan + credibilidad → más usuarios.
- **Stack (v5.1 confirmado)**: Next.js 16.2.1, React 19.2.4, TypeScript 5, Tailwind v4, tRPC 11, Supabase (SSR+Admin), Mapbox GL JS 3.20, Recharts 3.8.1, PostHog, OpenAI, Anthropic, Sharp 0.34.5, Zod 4.3.6, cmdk (BIBLIA-§1).
- **Repo**: `git@github.com:manuia88/desarrollosmx-v8final.git` branch `main`; Supabase project `kcxnjdzichxixukfnenm`.

---

## 2. INVENTARIO BD — 110 TABLAS

**Fuente primaria:** BIBLIA-§3.1, BE1 completo. **Requiere verificación** con `information_schema.tables` antes de cualquier SQL — puede haber migrations aplicadas entre la biblia y hoy (v5.1-S1 aplicó `profiles_security`, v5.1-S3 aplicó `marketing_portales`, v5.1-S5 aplicó `streaks_function`).

### Números verificados en Etapa 0 (BIBLIA-§3.1)
```
Tablas:                    110 (107 originales + 3 permisos v5)
Funciones SQL:             64 (documento BE2 decía ~25 — desactualizado)
Triggers:                  36 en 10 tablas (BE2 decía ~10 — desactualizado)
RLS policies:              ~207 (BE1 decía ~160 — desactualizado)
Foreign keys:              ~150
Performance indices:       ~165
CHECK constraints:         ~90
100% tablas con RLS:       ✅
0 tablas sin policies:     ✅
```

**Discrepancia detectada**: el `CLAUDE.md` del repo dice "107 tablas, 207 RLS policies, ~12 triggers, ~25 functions" — **desactualizado**. La biblia 17 y la auditoría v5.1 registran 110/207/36/64. Actualizar CLAUDE.md.

### Tablas con datos reales (25/110 según BIBLIA-§3.3)
```
macro_series(104), unidades(47), actividad_timeline(24), historial_precios(16),
zones(16), prototipos(16), avance_obra(13), projects(10), supported_cities(10),
external_data(10), visitas_programadas(8), admin_actions(6), project_views(6),
tareas(6), busqueda_proyectos(6), contactos(5), automation_rules(5),
interaction_feedback(5), operaciones(4), ai_prompt_versions(4), notificaciones(4),
plans(3), profiles(3), desarrolladoras(3), busquedas(3)
```

### Tablas IE vacías (críticas para Sesión 07+)
```
geo_data_points(0), zone_scores(0), project_scores(0), user_scores(0),
dmx_indices(0), geo_snapshots(0), score_history(0), score_recalculation_queue(0),
score_subscriptions(0), market_anomalies(0), market_prices_secondary(0),
search_trends(0), market_pulse(0), zone_price_index(0), zona_snapshots(0)
```

### Categorías principales (de BE1 — catálogo)
- **Multi-tenant**: profiles, desarrolladoras, broker_companies, agencies
- **Proyectos**: projects, prototipos, unidades, esquemas_pago, precios_unidad, unidad_esquema_desglose, fotos, avance_obra, avance_obra_log, project_competitors, project_landing_pages, project_brokers, project_broker_cache
- **CRM asesor**: contactos, busquedas, busqueda_contactos, busqueda_proyectos, busqueda_propiedades, busqueda_historial_precio, visitas_programadas, visitas, captaciones, propiedades_secundarias, propiedades_secundarias_fotos, acm_valuaciones, tareas, operaciones, operation_documents, operation_timeline, commission_payments, comisiones, actividad_timeline, interaction_feedback, client_folders, client_folder_projects
- **Gamification**: asesor_gamification (user_id, xp_total, current_streak, level, badges[], monthly_rank) — triggers XP en acciones (BIBLIA-§3.3)
- **Marketing**: fotos, whatsapp_templates, project_landing_pages, qr_codes, marketing_portales (NUEVA v5.1-S3)
- **IE core**: zone_scores, project_scores, user_scores, score_history, score_recalculation_queue, score_subscriptions, market_anomalies, dmx_indices
- **IE data**: geo_data_points, geo_snapshots (v4 nueva), macro_series, market_prices_secondary, str_market_data, search_trends, market_pulse, zone_price_index, zona_snapshots, external_data
- **Tracking/Growth**: events, search_logs, project_views, wishlist, unit_change_log, inventory_snapshots, demand_queries, ai_generated_content, ai_usage_tracking, ai_prompt_versions, ai_coaching_log, automation_rules, workflow_executions
- **Sistema**: audit_log, admin_actions, api_keys, api_request_logs, api_rate_limits, webhooks, webhook_logs, notificaciones, notificaciones_config, plans, subscriptions, supported_cities, metricas_kpi, asesor_outcomes, asesor_status, disc_profiles
- **Permisos v5 (v5-S0 Tarea 1)**: `feature_registry`, `role_features`, `profile_feature_overrides`; función `resolve_features()` con cascada override > role > global default (BIBLIA-§2-Decisión4).

### Schemas críticos (de E2E por módulo)
Principalmente relevantes para el cableado frontend-backend Dopamine:
- `profiles`: first_name + last_name (NO `nombre`); phone text; estado CHECK (disponible/no_disponible/en_visita); rol; is_active; is_approved; employer_id/employer_type (DISC-08, DISC-09).
- `contactos`: phones jsonb[], emails jsonb[] (NO text); first_name + last_name; temperatura CHECK (frio/tibio/caliente/cliente); tags text[]; search_vector GIN; 5 RLS policies; triggers anti-duplicados + FTS + XP (DISC-06, DISC-07, E2E-M3).
- `busquedas`: etapa CHECK 7 valores español (pendiente/buscando/visitando/ofertando/cerrando/ganada/perdida); 22+ columnas (E2E-M4).
- `captaciones`: etapa CHECK 7 valores español con mismo patrón (E2E-M5).
- `operaciones`: status CHECK español (propuesta/oferta_aceptada/escritura/cerrada/pagando/cancelada) y columna `side` CHECK (ambos/comprador/vendedor). Columna `lado` **duplicada** pendiente de DROP (DISC-01, DISC-03).
- `tareas`: status CHECK (pending/in_progress/done/expired); type CHECK (propiedades/clientes/prospectos/general) — DIVERGENTE del frontend Dopamine que usa property/capture/search/client/lead (DISC-02).
- `dmx_indices`: index_code CHECK con 5 valores actuales — necesita ALTER para agregar DMX-MOM y DMX-LIV (DISC-04).

---

## 3. FUNCIONES SQL — 64 TOTAL

**Fuente primaria:** BE2 completo + BIBLIA-§3.1. Catalogación por propósito (algunas funciones con contraparte en tRPC/API; otras usadas solo por triggers).

### 3.1 Helpers RLS (SECURITY DEFINER)
- `get_user_role()` — determina rol del usuario actual
- `is_superadmin()` — bool
- `get_visible_asesor_ids(p_asesor uuid)` — multi-tenant
- `is_authorized_broker(p_project_id uuid)` — broker authorization
- `is_project_owner(p_project_id uuid)` — FK con desarrolladoras

### 3.2 Dashboards y aggregations (SECURITY DEFINER — **8 de ellas con SEC-04**)
Requieren fix crítico para validar `auth.uid()`:
- `get_asesor_dashboard(uuid)`
- `get_asesor_performance(uuid)`
- `get_developer_dashboard(uuid)`
- `get_master_broker_dashboard(uuid)`
- `get_morning_briefing(uuid)`
- `add_asesor_xp(uuid, int, text)` — **manipula gamification si no se valida**
- `calculate_commission_forecast(uuid)`
- `match_busqueda_inventario(uuid)`

### 3.3 Funciones de negocio conocidas
- `calculate_acm(...)` — Análisis Comparativo de Mercado (propiedades secundarias)
- `generate_operation_code()` — código único por operación
- `generate_operation_documents(operation_id)` — auto-docs
- `generate_auto_tasks(asesor_id)` — tareas automáticas por eventos
- `create_auto_task(...)` — deduplicación incluida (P06-§A6)
- `calculate_commission(valor_cierre, comision_pct, split_ratio)` — fórmula con IVA 16%
- `normalize_phone(phone)` — para unique anti-duplicados
- `resolve_features(profile_id)` — sistema permisos v5
- `check_rate_limit_db(user_id, endpoint, limit)` — rate limiting (existe, uso parcial)
- `expire_overdue_tasks()` — cron diario

### 3.4 Funciones IE core
- `enqueue_score_recalc(score_type, entity_type, entity_id, triggered_by, priority)` — con deduplicación contra pending + processing (IE1-§2.5)
- `archive_score_before_update()` — trigger que inserta en score_history antes del UPDATE

### 3.5 Funciones streaks/gamification (v5.1-S3)
- Migration `streaks_function` ya aplicada (no detalles en biblia; verificar en BD).

> **Nota**: el registry de 64 funciones no está enumerado en la biblia. Para auditoría completa usar:
> ```sql
> SELECT routine_name, routine_schema, routine_type
> FROM information_schema.routines
> WHERE routine_schema = 'public'
> ORDER BY routine_name;
> ```

---

## 4. TRIGGERS — 36 EN 10 TABLAS

**Fuente primaria:** BE2-§ Triggers + BIBLIA-§3.1. Requiere verificación con `information_schema.triggers`.

### Conocidos por nombre/función
- `contactos`: check_duplicate_phone, update_contactos_search_vector (FTS), xp_contacto_creado (+10 XP)
- `profiles`: audit_sensitive_changes (solo REGISTRA, **NO bloquea** — SEC-02 raíz), falta `prevent_role_escalation` (fix SEC-02 pendiente)
- `operaciones`: `calculate_commission` BEFORE INSERT/UPDATE, `generate_operation_code`, `generate_operation_documents`, `webhooks_operaciones`, `xp_operacion_cerrada`
- `unidades`: `log_unit_changes` → `unit_change_log` INSERT (trigger de cascada `price_changed`)
- `tareas`: `trg_feedback_cascade` BEFORE INSERT on `interaction_feedback` → cascade feedback_registered
- `avance_obra`: trigger → avance_obra_log INSERT
- `score_*`: archive_score_before_update
- Otros en: projects, visitas_programadas, busquedas

---

## 5. RLS POLICIES — ~207 TOTAL

**Fuente primaria:** BIBLIA-§5 completo + SEC-01..23.

Modelo general (BIBLIA-§5.4, BE1-§RLS):
- 110/110 tablas con RLS habilitado ✅
- 0 tablas sin policies ✅
- Patrón owner: `asesor_id = auth.uid()` (INSERT/SELECT/UPDATE)
- Multi-tenancy: `get_visible_asesor_ids()` para managers
- Broker authorization: `is_authorized_broker(project_id)` para autorizado
- Admin override: `is_superadmin()`

### Hallazgos críticos (SEC-01..23, ver §14)
- 4 policies CRÍTICAS (SEC-01, SEC-02, SEC-03, SEC-04) — ver §14 detalle.
- 24 tablas con policy ALL incluyendo DELETE (SEC-14) — asesor puede borrar historial.
- Policies `true` (sin WHERE): `desarrolladoras_select_public` (SEC-03), `qr_codes_read` (SEC-09), `demand_queries_insert_any` (SEC-20), `admin_actions_insert_trigger` (SEC-21), `project_views_insert_any` (SEC-22), `avance_obra_read` (SEC-23).

### Verificadas OK (BIBLIA-§5.4, SEC final)
```
✅ contactos INSERT valida asesor_id=auth.uid()
✅ operaciones INSERT valida asesor=auth.uid()
✅ operaciones DELETE solo superadmin
✅ busquedas/leads INSERT valida asesor_id
✅ captaciones policies (own + employer SELECT + admin)
✅ gamification SOLO SELECT para owner
✅ conversations/subscriptions/notificaciones owner-restricted
✅ API keys guardadas como hash (key_hash)
✅ Storage project-photos INSERT solo dev + admin
✅ Storage documents INSERT solo dev + admin
✅ rate_limits policy false (solo service_role)
```

---

## 6. tRPC ROUTERS — 15 TOTAL

**Fuente primaria:** BE2-§ tRPC + BIBLIA-§3.2 + v5.1-S3 commits.

### 6.1 Routers funcionales
La biblia 17 reporta **9 funcionales + 6 stubs**. Post v5.1-S3, se agregaron 6 routers nuevos:
- `contactos`, `busquedas`, `tareas`, `operaciones`, `estadisticas`, `marketing`
- Se extendió `asesorCRM`.

**Divergencia arquitectural**: E2E-§Resumen pedía UN nuevo router (`marketing.ts`) + extensiones a `asesorCRM`. v5.1-S3 fragmentó en 6 routers temáticos. Ambos enfoques son válidos — discutir con Manu si consolidar o mantener fragmentación.

### 6.2 Routers originales documentados (antes v5.1)
1. `asesorCRM` — CRM operations del asesor (contactos, búsquedas, captaciones, etc.)
2. `gamification` — 3 procedures: getGamification, getLevel, getStreak
3. `intelligence` — 7 procedures: getZoneScores + related
4. `scores` — getProjectScores, getProjectList, etc.
5. `developer` — 13 procedures (728 LOC): getProjectById, getProjectUnits, getPrototipos, getEsquemasPago, getAvanceObra, getCompetitors, etc.
6. `photos` — uploadPhoto, classifyPhoto, getProjectPhotos, uploadPropSec
7. Otros: stripe/payments, admin, público

### 6.3 Procedures nuevas creadas en v5.1-S3 (según commits)
```
asesorCRM (extensión):
  createTimelineEntry (mutation) — acción rápida "registrar llamada"
  scheduleVisit (mutation)
  toggleAvailability (mutation)
  getUnreadNotifCount (query)
  globalSearch (query) — command palette ⌘K
  getPipelineMetrics (query)
  getPipelineFunnel (query)
  getRevenueByMonth (query)

marketing (router nuevo):
  createLanding / getLandings / updateLanding
  createQR / getQRs
  getTemplates / createTemplate / updateTemplate
  createFolder / getFolders / addProjectToFolder
```
Total **~16 procedures nuevas** según E2E.

### 6.4 Archivos protegidos (CLAUDE.md)
`server/trpc/context.ts` y `server/trpc/middleware.ts` son **archivos protegidos**: no modificar sin autorización. Igual aplica a `middleware.ts` y `lib/supabase/*.ts`.

---

## 7. API ROUTES — 51 TOTAL

**Fuente primaria:** BIBLIA-§3.2 + BE2 + BE3.

**Distribución** (BIBLIA-§3.2):
- **19 crons** (vercel.json funcionales)
- **5 AI**: Claude/GPT generation, prompts
- **4 IE**: /api/scores/request-recalc, /api/match, ingest endpoints, score-worker
- **3 photos**: upload, classify, transform (con Sharp WebP 3 variantes)
- **18 otros**: auth, payments webhook, admin ingest-upload, etc.

### 7.1 API rutas externas v1 (pendientes — R9c / Sesión 19)
```
GET /api/v1/scores/livability?lat=X&lon=Y    → DMX Livability API
GET /api/v1/scores/momentum?zone_id=X        → DMX Momentum Index
GET /api/v1/scores/risk?lat=X&lon=Y          → DMX Risk Score
GET /api/v1/scores/project?project_id=X      → DMX Score de proyecto
GET /api/v1/scores/[scoreType]               → Genérico
POST /api/v1/estimate                        → DMX Estimate (AVM)
POST /api/v1/site-selection                  → Site Selection Tool
GET /api/v1/reports/market?zone_id=X         → Market Intelligence Reports
GET /api/v1/rankings                         → Zone Rankings
GET /api/v1/neighborhood-report              → Neighborhood Report
POST /api/v1/compass                         → Predicción cierre (H3)
POST /api/v1/knowledge-graph/query           → Knowledge Graph (H3)
```
Todas requieren middleware `validateApiKey + checkRateLimit + logRequest` (IE5-§12.3).

### 7.2 API internas observadas
- `/api/cron/score-worker` — worker queue (IE1-§2.3)
- `/api/cron/*` — 19 crons existentes (ver §8)
- `/api/photos/upload` (170 LOC), `/api/photos/classify` (149 LOC)
- `/api/admin/ingest-upload` — admin upload XLSX/CSV/PDF para SHF/BBVA/CNBV
- `/api/payments/webhook` — Stripe webhook handler (BE3-§6.1)
- `/api/auth/*` — flow auth
- `/api/health` — SystemHealthWidget

---

## 8. CRONS — 31 TOTAL (19 ACTIVOS + 12 STUBS)

**Fuente primaria:** BIBLIA-§3.2, BE2, BE3, IE5-§R10.

### 8.1 Activos (19 según BIBLIA-§3.2, listados en vercel.json)
- `score_recalculation_worker` — cada 1 min
- `ingest_banxico_daily` — 8am diario
- `ingest_inegi_monthly` — día 15
- `refresh_fgj_monthly` — mensual
- `gamification-daily` (NUEVA v5.1-S5) — streak check + monthly reset
- Otros conocidos: `expire_overdue_tasks`, `weekly_briefing_generate` (lunes 7am), `discover_weekly_generate` (lunes 8am), `trust_score_monthly`, `platform_metrics_daily`, `payment_reminders`, `market_anomaly_detector`, `asesor_status_offline_check`, `inventory_snapshot_daily`, `metricas_kpi_weekly`, `days_on_market_update`, `storage_usage_update`, `cleanup_old_jobs`, `props_sec_days_on_market`.

### 8.2 Stubs / pendientes (IE5-§R10, BIBLIA-§roadmap)
- `snapshot_denue_monthly` — crítico para N03/N11
- `ingest_shf_quarterly`
- `dmx_indices_monthly`
- `score_subscriptions_notify`
- `gamification_monthly_reset` (si no está cubierto por `gamification-daily`)
- `zone_scores_weekly_refresh`
- `sync_props_to_market` (mensual — alimenta market_prices_secondary)
- `annual_wrapped` (1 enero — DMX Wrapped)
- `monthly_index_newsletter` (día 5)
- Ingestores geo: denue, fgj, gtfs, atlas-riesgos, siged, dgis, sacmex — orchestrator y schedules por fuente
- `quarterly_market_report`

---

## 9. SCORES IE — 108 + 7 ÍNDICES

**Fuente primaria:** IE2, IE3, IE4, IE5-§CONTEO FINAL, registry.ts (107 scores registrados confirmados por auditoría v5.1).

**Contradicción interna**: BIBLIA-§3.2 y registry dicen 107; IE4-§CONTEO dice 108 (21+16+14+12+7+26+11); IE5-§CONTEO FINAL dice 107 (21+16+14+12+7+26 = 96 + 11 nuevos). **Resolución pragmática**: 107 en registry, 11 nuevos N01-N11, **total 118 únicos** (o 115 si 3 nuevos solapan con originales). **Verificar en `lib/intelligence-engine/registry.ts`**.

### 9.1 Nivel 0 — 21 scores originales + 11 nuevos = 32 (IE2-§4)
**Zona**: F01 Safety, F02 Transit, F03 Ecosystem DENUE, F04 Air Quality, F05 Water, F06 Land Use, F07 Predial (7)
**Calidad vida**: H01 School Quality, H02 Health Access, H03 Seismic Risk, H04 Credit Demand, H06 City Services, H08 Heritage Zone, H09 Commute Time (on-demand Mapbox), H10 Water Crisis, H11 Infonavit Calc (9)
**Comprador**: A01 Affordability, A03 Migration, A04 Arbitrage (3)
**Dev**: B12 Cost Tracker (IMPLEMENTADO) (1)
**Mercado**: D07 STR/LTR (1)
**NUEVOS N01-N11** (IE4-§9): N01 Ecosystem Diversity (Shannon-Wiener), N02 Employment Accessibility, N03 Gentrification Velocity (requiere ≥2 snapshots), N04 Crime Trajectory, N05 Infrastructure Resilience, N06 School Premium, N07 Water Security, N08 Walkability MX, N09 Nightlife Economy, N10 Senior Livability, N11 DMX Momentum Index (el más valioso).

### 9.2 Nivel 1 — 16 scores (IE2-§5)
F08 Life Quality Index (LQI), F12 Risk Map, H07 Environmental, A02 Investment Simulation (4 escenarios), A05 TCO (Total Cost of Ownership 10y), A06 Neighborhood, A12 Price Fairness, B01 Demand Heatmap, **B02 Margin Pressure (IMPLEMENTADO con BUG — usa precio_total/superficie_m2 en vez de precio/m2_totales, fix requerido en register-all.ts:82)**, B04 PMF, B07 Competitive Intel, **B08 Absorption Forecast (IMPLEMENTADO)**, D05 Gentrification, D06 Affordability Crisis, **H05 Trust Score (IMPLEMENTADO)**, H14 Buyer Persona.

### 9.3 Nivel 2 — 14 scores (IE3-§6)
F09 Value Score, F10 Gentrification 2.0, B03 Pricing Autopilot, B05 Market Cycle, B09 Cash Flow, B10 Unit Revenue Opt, B13 Amenity ROI, B14 Buyer Persona (Proyecto), B15 Launch Timing, C01 Lead Score, C03 Matching Engine, D03 Supply Pipeline, H12 Zona Oportunidad, H16 Neighborhood Evolution.

### 9.4 Nivel 3 — 12 scores (IE3-§7)
A07 Timing Optimizer, A08 Comparador Multi-Dimensional, A09 Risk Score Comprador, A10 Lifestyle Match (6 perfiles: quiet/nightlife/family/fitness/remote_worker/investor), A11 Patrimonio 20y, B06 Project Genesis, **B11 Channel Performance (IMPLEMENTADO)**, C04 Objection Killer (AI), C06 Commission Forecast, D04 Cross Correlation, H13 Site Selection AI, H15 Due Diligence.

### 9.5 Nivel 4 — 7 scores (IE3-§8.1)
E01 Full Project Score ("DMX Score interno"), G01 Full Score 2.0 ("DMX Score público"), E02 Portfolio Optimizer, E03 Predictive Close, E04 Anomaly Detector, D09 Ecosystem Health, D02 Zona Ranking.

### 9.6 Nivel 5 — 26 scores AI (IE3-§8.2)
Se almacenan en `ai_generated_content`, se generan on-demand o por cron:
- **ASESOR**: C02 Argumentario, C05 Weekly Briefing, C08 Dossier Inversión
- **AGREGADOS**: E05 Market Narrative, E06 Developer Benchmark, E07 Scenario Planning, E08 Auto Report
- **FULL SCORE**: G02 Narrative 2.0, G03 Due Diligence Report, G04 Zone Comparison, G05 Impact Predictor
- **MERCADO**: D01 Market Pulse, D08 Foreign Investment, D10 API Gateway Score
- **ZONA**: F11 Supply Pipeline Zone, F13 Commute isócronas, F14 Neighborhood Change, F16 Hipotecas Comparador, F17 Site Selection
- **PRODUCTOS (I01-I06)**: I01 DMX Estimate (AVM mexicano), I02 Market Intelligence Report, I03 Feasibility Report, I04 Índices Licenciables, I05 Insurance Risk API, I06 Valuador Automático

### 9.7 Scores IMPLEMENTADOS (solo 5 de 107-118)
- B02 Margin Pressure (CON BUG)
- B08 Absorption Forecast
- B11 Channel Performance
- B12 Cost Tracker
- H05 Trust Score

### 9.8 Patrón E2E por score (IE2 documenta los 13 pasos para cada uno)
Cada calculator formal se documenta en 13 pasos: **Fuente → Ingesta → Almacenamiento → Procesamiento → Persistencia → API/tRPC → Hook → Componente → Page → Interacción → Feedback loop → Notificación → API externa.**

### 9.9 Confidence cascade (IE5-§11.1b)
4 niveles: `high` / `medium` / `low` / `insufficient_data`. UI: high (sin indicador), medium (badge amarillo "Datos limitados"), low (badge naranja "Calculado con pocos datos"), insufficient (placeholder "Score disponible pronto").

Umbrales por fuente:
- DENUE: high ≥100 establecimientos, medium ≥20, low ≥1
- FGJ: high ≥50 carpetas/año, medium ≥10, low ≥1
- GTFS: high ≥3 estaciones en 1km, medium ≥1
- SACMEX: high ≥6 meses datos, medium ≥3 meses
- macro_series: high <7 días, medium <30 días, low <90 días

### 9.10 Tier system (IE5-§11.3) — cuándo funciona cada score
- **Tier 1 (día 1, sólo fuentes externas)**: F01, F02, F03, F04, F05, F06, F07, H01, H02, H03, H08, H09, H10, F08, N01, N02, N05, N06, N07, N08, N09, N10, series macro. Índices parciales: IDS, IRE, LIV.
- **Tier 2 (10+ proyectos)**: A01, A04, A12, F09, B07, H05, B12. Índices: IPV, IAB.
- **Tier 3 (50+ proyectos, 6+ meses)**: B01, B08, B03, D05, D02, E01, G01, I02, N03, N04, N11, DMX-MOM, DMX-ICO.
- **Tier 4 (100+ ventas cerradas)**: C01 calibrado, C03 calibrado, B14 calibrado, E03, E04, I01 AVM.

---

## 10. ÍNDICES DMX — 7 PROPIETARIOS

**Fuente primaria:** IE4-§10.

| Código | Nombre | Fórmula (pesos) | Producto B2B |
|--------|--------|-----------------|--------------|
| DMX-IPV | Índice Precio-Valor | F08×0.30 + F09×0.25 + N11×0.20 + A12×0.15 + N01×0.10 | Gran reporte trimestral |
| DMX-IAB | Índice Absorción Benchmark | B08_zona_avg / benchmark_cdmx × 50 | — |
| DMX-IDS | Índice Desarrollo Social Integrado | F08×0.25 + H01×0.15 + H02×0.10 + N01×0.15 + N02×0.15 + F01×0.10 + F02×0.10 | — |
| DMX-IRE | Índice Riesgo Estructural | 100 − suma ponderada (H03, N07, F01, F06, N05) | **DMX Risk Score** (aseguradoras) |
| DMX-ICO | Índice Costo Oportunidad | (yieldInmobiliario − yieldCetes)/yieldCetes × 50 + 50 | — |
| **DMX-MOM** (NUEVO v4) | Momentum Index | = N11 elevado a índice mensual | **DMX Momentum Index** (fondos, bancos) |
| **DMX-LIV** (NUEVO v4) | Livability Index | F08×0.30 + N08×0.15 + N01×0.10 + N10×0.05 + N07×0.10 + H01×0.10 + H02×0.05 + N02×0.10 + N04×0.05 | **DMX Livability API** (portales, fintechs) |

**Calendario publicación** (IE4-§10.8):
- **Mensual**: DMX-MOM en /indices + newsletter día 5.
- **Trimestral**: los 7 índices con reporte completo "DMX Índice de Colonias CDMX — Q#".
- **Anual**: DMX Wrapped (1 enero).

**Metodología abierta** en `/metodologia` (pública, sin auth). Inspiración S&P.

---

## 11. CASCADAS — 6 (según IE5-§11) / 9 (según BIBLIA-§10.2)

**Discrepancia de conteo**: BIBLIA-§10.2 lista 9 cascadas; IE5-§11.1 formaliza 6. La diferencia: BIBLIA cuenta triggers de ingesta individuales (denue_ingested, fgj_ingested, own_data_ingested, snapshot_completed) como cascadas separadas, mientras IE5 los agrupa dentro de `geo_data_updated`.

### Las 6 cascadas formales (IE5-§11.1)
1. **unit_sold** (trigger BD, priority 3, individual) → B08 → E01 → D02 → B03 → B09
2. **price_changed** (trigger BD, priority 3) → A12 → A01 → A04 → A02 → B02 → B03 → E01
3. **macro_updated** (batch, priority 8) → 4-6 jobs batch (affordability, migration, absorption_macro_factor, infonavit) + D01 individual + C05 deferred
4. **geo_data_updated** (batch, priority 8) → 5-11 jobs por fuente (detalle por source: denue/fgj/sacmex/gtfs/siged/dgis)
5. **feedback_registered** (trigger, priority 5) → B04 → B03 → C04
6. **search_behavior** (NUEVA v4, priority 10, batch cada 1 hora) → B01, B04, H14

**Todas 9/9 wired** según auditoría v4 (BIBLIA-§3.2) pero **0 ejecuciones reales** porque `score_recalculation_queue` está vacía (tablas IE sin datos).

### Implementación en /lib/intelligence-engine/cascades/
```
unit-sold.ts, price-changed.ts, macro-updated.ts, geo-data-updated.ts,
feedback-registered.ts, search-behavior.ts (NUEVO v4)
```
Orquestador en `cascade.ts` con `getCascadeJobs()` y `enqueueCascade()`. Tabla `score_recalculation_queue` con priorización 1-10 y batch_mode (IE1-§2.3).

---

## 12. FUENTES DE DATOS — 50+

**Fuente primaria:** IE1-§3.

### 12.1 Macro (7)
| # | Fuente | Token | Frecuencia | Estado | Scores consumidores |
|---|--------|-------|------------|--------|---------------------|
| F-MACRO-01 | Banxico SieAPI (tasa_referencia, TIIE28, tipo_cambio_fix, tasa_hipotecaria_avg) | BANXICO_TOKEN | Diaria | ✅ IMPLEMENTADO, 48 rows | A01-A05, B05, B08, H11, D01, F16 |
| F-MACRO-02 | INEGI (INPC general, INPP construcción; pendientes: materiales/mano_obra/PIB trimestral/vivienda) | INEGI_TOKEN | Mensual | ✅ IMPLEMENTADO parcial, 24 rows | B02, B12, A05, B05, D06, A12 |
| F-MACRO-03 | SHF (IPV nacional + 32 estados) | N/A (admin upload) | Trimestral | ⚠️ STUB, 8 rows seed | A04, A02, A05, A11, B05, D03 |
| F-MACRO-04 | BBVA Research (sobrecosto_vivienda, oferta_vivienda, credito_hipotecario) | N/A (PDF extract GPT-4o-mini) | Trimestral | ❌ No implementado | D06, B01, H04 |
| F-MACRO-05 | CNBV (créditos_hipotecarios_municipio, cartera_vencida, tasa_por_banco) | N/A | Mensual | ❌ No | H04, F16, A01 |
| F-MACRO-06 | Infonavit (créditos, monto, VSM, tablas) | N/A | Mensual | ❌ No | H11, H04, H14 |
| F-MACRO-07 | FOVISSSTE (créditos, monto por estado) | N/A | Trimestral | ❌ No | H04, H14 |

### 12.2 Geo (17)
Detallados en IE1-§3.2. Todos con schema en `geo_data_points`, mantienen `period_date` y `is_active`:

| # | Fuente | Volumen CDMX | Estado | Scores |
|---|--------|-------------|--------|--------|
| F-GEO-01 | **DENUE (INEGI)** — mapeo SCIAN propietario | ~200K establecimientos | ⚠️ INGESTOR NUEVO, 0 rows | F03, N01-N11, D05, F10, D09, A06 |
| F-GEO-02 | **FGJ CDMX** (datos.cdmx.gob.mx) | ~100K carpetas/año | ⚠️ NUEVO, 0 rows | F01, N04, F12, N09, N11, F10, H16 |
| F-GEO-03 | **GTFS** (Metro/Metrobús/Tren/Cablebús/EcoBici) | ~300 estaciones + ~5K paradas | ⚠️ NUEVO | F02, N02, N05, N08, H09, F15, A06 |
| F-GEO-04 | **Atlas Riesgos** (shapefiles) | ~500 AGEBs | ⚠️ NUEVO | H03, F12, N05, N07, H10, A09, H15 |
| F-GEO-05 | **SIGED (SEP)** | ~15K escuelas | ⚠️ NUEVO | H01, N06, N10, A06, H14 |
| F-GEO-06 | **DGIS/CLUES** | ~5K salud | ⚠️ NUEVO | H02, N10, A06 |
| F-GEO-07 | **SACMEX** (cortes agua) | ~2K registros/mes | ⚠️ NUEVO | F05, N07, H10, N05, N11, F12 |
| F-GEO-08 | **RAMA** (SINAICA, calidad aire) | 34 est × 24h = 816/día | ❌ H2 (datos pesados) | F04, H07, N10 |
| F-GEO-09 | Uso Suelo SEDUVI | ~3K manzanas | ❌ H2 | F06, H13, D03, H15 |
| F-GEO-10 | **Catastro CDMX** | ~2.5M cuentas | ❌ H2 | F07, A05, H15, I01 |
| F-GEO-11 | PAOT | ~15K denuncias/año | ❌ No | H07, H16 |
| F-GEO-12 | SEDEMA (parques, áreas protegidas) | ~1.2K | ❌ No | H07, F04, N08, A06 |
| F-GEO-13 | CONAGUA | ~5 acuíferos + 20 est | ❌ No | H10, N07, N05 |
| F-GEO-14 | INAH | ~30 museos + 5 zonas arqueológicas | ❌ No | H08, A06, N08 |
| F-GEO-15 | PROFECO | ~50K quejas/año | ❌ No | H05 |
| F-GEO-16 | **0311 Locatel** | ~500K reportes/año | ❌ No | H06, H12, H16, N05, N11 |
| F-GEO-17 | Mapbox Traffic | On-demand | ✅ Token OK | H09, F02, F13 |

### 12.3 Mercado (4)
- F-MKT-01 Inmuebles24/Mudafy (scraping) — ~5K/sem → `market_prices_secondary` — scores A04, A12, D05, D06, I01
- F-MKT-02 AirDNA (API, key en .env) — ADR, occupancy → `str_market_data` — scores D07, A02
- F-MKT-03 Google Trends (scraping) → `search_trends` — scores B08, D05, B15
- F-MKT-04 Cushman & Wakefield / CBRE (reportes trimestrales manuales) → `office_market_data` — score D04

### 12.4 Propias (12)
`projects`, `unidades`, `busquedas`, `operaciones`, `contactos`, `visitas_programadas`, `interaction_feedback`, `search_logs`, `project_views`, `wishlist`, `unit_change_log`, `inventory_snapshots`. Más `captaciones`, `propiedades_secundarias`, `acm_valuaciones`, `asesor_gamification` en v4.

### 12.5 Futuras H2 (10+)
SEDUVI permisos construcción, EcoBici trip data, Waze/Traffic, Google Street View (computer vision), SNIIV/RUV oferta futura, Catastro dinámico, Social media sentiment (Twitter/Google Reviews), Weather API, Census INEGI 2030, Satellite imagery (NDVI).

### 12.6 Mapeo SCIAN (IP propietaria, IE1-§3.18)
Clasifica los códigos SCIAN 6 dígitos del DENUE en:
- **3 tiers**: premium (33 códigos), standard (~80), basic (~30)
- **12 macro_categories**: ALIMENTACION, SALUD, EDUCACION, SERVICIOS_PROF, COMERCIO_RETAIL, GASTRONOMIA, ENTRETENIMIENTO, BELLEZA_PERSONAL, TECNOLOGIA, TRANSPORTE, MANUFACTURA, GOBIERNO.
- **Staff estimate** punto medio: 0_5→3, 6_10→8, 11_30→20, 31_50→40, 51_100→75, 101_250→175, 251_plus→350.
- **Fórmulas derivadas**:
  - Ratio Premium/Basic: >2 premium consolidada, 1-2 transición, <1 popular
  - Shannon-Wiener (H): >2 diverso, 1.5-2 moderado, <1.5 poco diverso
  - Gentrification Velocity: Δ(ratio_PB) / Δ(meses) — requiere ≥2 snapshots separados ≥3 meses

---

## 13. PRODUCTOS LICENCIABLES — 7

**Fuente primaria:** IE5-§12.1 + BE3-§6.1 (planes API).

| # | Producto | Endpoint | Target clientes | Pricing MXN/mes | Fase |
|---|----------|----------|-----------------|-----------------|------|
| 1 | **DMX Livability API** | GET /api/v1/scores/livability | Portales (Inmuebles24, Vivanuncios), Fintechs (Creditas, Coru, Yotepresto), apps movilidad, gobierno, aseguradoras | Free 100/día → Starter $5K (10K/día) → Pro $25K (100K/día) → Enterprise custom | H2 |
| 2 | **DMX Momentum Index** | GET /api/v1/scores/momentum | Fondos de inversión inmobiliaria, bancos (colateral), desarrolladores (site selection) | Starter $10K (5K/día), Pro $50K (50K/día + historical + bulk), Enterprise custom | H2 |
| 3 | **DMX Risk Score** | GET /api/v1/scores/risk | Aseguradoras (pricing pólizas), bancos (riesgo colateral), valuadores | $15K–$75K según volumen | H2 |
| 4 | **DMX Site Selection** | POST /api/v1/site-selection | Desarrolladores, fondos, consultoras | $25K–$100K/mes o $5K por reporte | H3 |
| 5 | **DMX Market Intelligence Reports** | GET /api/v1/reports/market (PDF) | Gobierno (SEDUVI, INVI, alcaldías), academia, medios (Forbes MX, Expansión), consultoras | $5K–$20K por reporte o suscripción | H2 |
| 6 | **DMX COMPASS** (predicción cierre) | POST /api/v1/compass | Inmobiliarias grandes, MBs | Incluido Enterprise marketplace | H3 |
| 7 | **DMX Knowledge Graph** | POST /api/v1/knowledge-graph/query | Empresas data analytics, consultoras, gobierno | $50K+ /mes | H3 |

### Producto estrella: **DMX Estimate (I01)** — AVM Mexicano
- Inspirado en Zillow Zestimate + HouseCanary Value by Conditions
- Inputs (47 variables, 12 fuentes): market_prices_secondary, project_scores, zone_scores, macro_series, geo_data_points, operaciones (calibración), características propiedad, condiciones específicas
- 3 fases: H1 Regression lineal → H2 Gradient boosting → H3 Deep learning calibrado con transacciones
- Response incluye estimate + range_low/high + confidence (0-1) + comparables + adjustments + market_context
- Pricing: Free 5/mes, Pro $2,999, API $15K-$50K

### Middleware compartido
`validateApiKey → checkRateLimit → logRequest → formatResponse(plan)`. Tablas: `api_keys` (user_id, key_hash, plan, requests_today, requests_month), `api_request_logs`, `api_rate_limits`.

---

## 14. SEGURIDAD — 23 HALLAZGOS (4 CRÍTICOS, 6 ALTOS, 13 MEDIOS)

**Fuente primaria:** SEC completo + BIBLIA-§5. Estado actualizado al 2026-04-17 post v5.1.

### 14.1 Críticos (4)
| ID | Descripción | Estado v5.1 |
|----|-------------|-------------|
| **SEC-01** | `profiles_select_public_slug` expone email, phone, rfc, razon_social, regimen_fiscal, docs_verificacion_urls a todo autenticado | **🟡 PARCIAL** — v5.1-S5 creó VIEW `public_profiles` y SocialProofCounter la usa. Falta confirmar que NINGÚN consumo use la tabla directa. |
| **SEC-02** | `profiles_update_own` sin restricción de columnas → un asesor hace `UPDATE profiles SET rol='superadmin'`. Trigger `audit_sensitive_changes` solo REGISTRA | **🔴 ABIERTO** — fix requiere trigger `prevent_role_escalation` BEFORE UPDATE. **Es el hallazgo más urgente.** |
| **SEC-03** | `desarrolladoras_select_public` con `qual=true` expone rfc, email_contacto, telefono_oficina, whatsapp, oficina_direccion, oficina_lat/lng | **🔴 ABIERTO** |
| **SEC-04** | 8 funciones SECURITY DEFINER sin validar `auth.uid()`: `get_asesor_dashboard`, `get_developer_dashboard`, `get_asesor_performance`, `get_master_broker_dashboard`, `get_morning_briefing`, `add_asesor_xp` (manipula gamification), `calculate_commission_forecast`, `match_busqueda_inventario` | **🔴 ABIERTO** |

### 14.2 Altos (6)
| ID | Descripción | Estado v5.1 |
|----|-------------|-------------|
| SEC-05 | `projects_select_public` expone broker_commission_pct/notes/pago/bono_pct, broker_contact_value, verificacion_notas a compradores | 🔴 ABIERTO |
| SEC-06 | Storage `profile-avatars`: public=true, file_size_limit=null, allowed_mime_types=null → subida ilimitada | 🔴 ABIERTO |
| SEC-07 | Storage buckets `dossier-exports`, `commission-invoices`, `operation-files` con INSERT abierto solo `auth.uid() IS NOT NULL` — compradores pueden subir a estos buckets | 🔴 ABIERTO |
| SEC-14 | 24 tablas con policy ALL incluyendo DELETE — asesor puede borrar `actividad_timeline`, `captaciones`, `acm_valuaciones`, `visitas_programadas`, `tareas`, `commission_payments`, etc. **Operaciones sí está protegida** ✅ | 🔴 ABIERTO |
| SEC-15 | `score_subscriptions` sin validar plan premium en WITH CHECK | 🔴 ABIERTO |
| SEC-16 | `project_landing_pages` INSERT solo valida `created_by=auth.uid()`, no autorización broker sobre proyecto | 🔴 ABIERTO |

### 14.3 Medios (13)
SEC-08 webhook_secrets plaintext · SEC-09 qr_codes_read public · SEC-10 rate_limit sin verificar en tRPC · SEC-11 RFC sin encriptar · SEC-12 CORS sin verificar · SEC-13 sin 2FA/MFA · SEC-17 pgsodium no habilitado · SEC-18 vault vacío · SEC-19 sin audit lecturas sensibles · SEC-20 demand_queries INSERT abierto · SEC-21 admin_actions INSERT abierto · SEC-22 project_views inflable · SEC-23 avance_obra_log visible a todos.

### 14.4 v5.1 cerró parcialmente
- v5.1-S1: middleware `is_active` enforcement, CSP/HSTS headers, STATUS_MAPs completos, migration `profiles_security` (mejoras sobre profiles pero no cerró SEC-02).
- v5.1-S5: VIEW `public_profiles` + SocialProofCounter migrado a VIEW → avanza SEC-01.

**Estado global**: ~2-3 de 23 cerrados; 20+ abiertos. **Prioridad inmediata**: SEC-02 (trigger), SEC-04 (8 funciones), SEC-01 (validar uso de VIEW).

---

## 15. MÓDULOS DOPAMINE ASESOR — 10 MÓDULOS

**Fuentes primarias:** BIBLIA-§6 (tabla oficial), FE1, E2E (mapa por botón), P01-P09 DOCX Pulppo (specs tropicalizadas), JSX-landing (design system), commits v5.1-S4 (cableado).

### 15.1 Tabla maestra (BIBLIA-§6)

| # | Nombre | JSX LOC | DOCX | Sidebar | Tint color | tRPC backend |
|---|--------|---------|------|---------|-----------|--------------|
| M1 | Dashboard | ~900 | ✅ | Command Center | bgLavender #F0EEFF | asesorCRM + gamification + intelligence |
| M2 | Desarrollos (antes "Inventario") | 423 | ✅ | Desarrollos | bgSlate #F0F2F7 | developer + scores + photos |
| M3 | Contactos | 576 | ✅ | Contactos | bgLavender | asesorCRM |
| M4 | Búsquedas | 1059 | ✅ | Búsquedas | bgLavender | asesorCRM |
| M5 | Captaciones | 757 | ✅ | Captaciones | bgPeach #FFF3ED | asesorCRM |
| M6 | Tareas | 549 | ✅ | Tareas | bgSlate | asesorCRM |
| M8 | Operaciones | 873 | ✅ | Operaciones | bgMint #EDFAF5 | asesorCRM |
| M9 | Marketing | 711 | ✅ | Marketing | bgSlate | photos + asesorCRM |
| M10 | Estadísticas | 636 | ✅ | Estadísticas | bgLavender | asesorCRM + gamification |
| — | Design System | 940 | — | (layout global) | — | — |

Total: **~7424 LOC** en frontend Dopamine. No hay "M7" — convención decidida (Desarrollos = M2).

### 15.2 Design System Dopamine (BIBLIA-§6 + JSX completo)
- **Typography**: Outfit 400/500/600/700/800/900 (headings), DM Sans 300-700 (body)
- **Background**: #F5F3F0 (warm cream), #FAF8F5 (cream)
- **Gradients**: gradP `linear-gradient(135deg, #6366F1, #EC4899)`, gradWarm `#F97316 → #EC4899`, gradCool `#6366F1 → #0EA5E9`, gradFresh `#10B981 → #0EA5E9`, gradSunset `#F97316 → #EAB308`
- **Tints**: bgLavender #F0EEFF, bgMint #EDFAF5, bgPeach #FFF3ED, bgSlate #F0F2F7, bgRose #FFF1F2
- **Semantic**: indigo #6366F1, violet #8B5CF6, pink #E946A8, coral #F97316, emerald #10B981, sky #0EA5E9, amber #EAB308, rose #F43F5E
- **Card3D**: perspective 800, rotateX/Y ±12°, translateZ 12px
- **Sidebar**: 60px collapsed → 240px hover, bg #111118
- **Header**: 54px glass morphism, sticky, backdrop-filter blur(20)
- **Content**: max-width 1100px centered
- **Animaciones**: floatSlow/Med/Fast, spin/spinReverse, pulse, scoreBar, barGrow, slideIn, ticker, gradShift, shimmer, popIn, cardFloat, glowPulse, carousel, orbit, morphBlob, breathe, staggerUp, gridPulse

### 15.3 M1 DASHBOARD — Command Center (E2E-M1 + P02 Dashboard)
**Layout** (P02): header 72px + sidebar izquierdo 64→285px (13 ítems) + main + sidebar derecho 55px (5 ítems). Pulppo usa altura fija 828px — DMX debe usar scroll flexible.

**17 acciones mapeadas a backend** (E2E-M1): saludo, estado disponibilidad toggle, 7 KPIs (pipeline/contactos/ops/revenue/visitas/comisión), morning briefing AI, 3 insights (mercado/personal con gamification), 5 quick actions (llamada/visita/compartir), búsqueda ⌘K global, notifs badge.

**Gaps backend** (E2E-M1): createTimelineEntry, scheduleVisit, toggleAvailability, getUnreadNotifCount, globalSearch (cubiertos en v5.1-S3).

**Umbrales KPI Pulppo extraídos del bundle** (P02/P09) — **reutilizables en DMX**:
```
Consultas pendientes: <15 verde, 15-59 amarillo, ≥60 rojo
T. primera respuesta: <15 min verde, 15-59 amarillo, ≥60 rojo (SLA 3600s=60min)
T. respuesta promedio: <15 min verde, 15-59 amarillo, ≥60 rojo (SLA 7200s=120min)
Volumen interacciones: ≥3 verde, <3 rojo (Muchas>10, Normal 4-10, Pocas<4)
Sugerencias promedio: >15 verde, 10-15 regular, <10 rojo
Tasa visita: ≥75% verde, 50-74% regular, <50% rojo
Tasa oferta: ≥70% verde, 50-69% regular, <50% rojo
% Inventario en venta: >30% verde, 20-30% regular, <20% rojo
Inventario total: ≥3 verde, <3 rojo
```
Horario hábil cómputo: 8am-8pm todos los días.

**Home alerts (tarjetas prioridad)** — patrón Pulppo (P02): `home_alerts` table con tipo, prioridad, referencia, CTA. 6 tipos: whatsapp_desvinculado, visita_sin_confirmar, captacion_pendiente, curso_pendiente, continua_refiriendo, (+ dmx-specific).

### 15.4 M2 DESARROLLOS (E2E-M2 + P03 Propiedades + P07 Inventario)
**14 acciones mapeadas, 0 gaps significativos** — el developer router (728 LOC, 13 procedures) cubre todo.

Tabs que DMX puede incorporar (P03): Propias, LIVOO (empresa), Exclusivas, DMX (toda plataforma), MLS (red completa).

**Sistema Exclusividad "X-Y-Z"** (P03-§A4): X meses exclusividad + Y meses contrato + Z% comisión. DMX puede usar el mismo formato.

**Quality Score 4 niveles** (P07): high/medium/low/notPublished con círculos visuales. **IMPORTANTE: DMX debe evitar la "semántica invertida" de Pulppo Valuation** (high=malo, low=bueno) — usar labels descriptivos directos: Competitivo / Moderado / Fuera de mercado / Sin ACM.

**Assets marketing** (P03-§A5): postCuadrado, postLargo, story, videoStory (hasta 24h), video (hasta 24h). Status `ready`/`generating`.

### 15.5 M3 CONTACTOS (E2E-M3 + P04 Contactos)
**12 acciones, 0 gaps** — `phones` jsonb[], `emails` jsonb[], `first_name`+`last_name` (no "nombre"), temperatura CHECK, search_vector GIN.

**Fricciones Pulppo que DMX YA resuelve** (P04-§A8): 
- ✅ Campo "Tipo" (DMX tiene `tipo` CHECK comprador/vendedor/propietario/broker/inversor/otro)
- ✅ Detección duplicados vía `normalize_phone()` + unique index
- ✅ Tags personalizables text[] (Pulppo es fijo a 9)
- ✅ FTS Postgres (Pulppo usa Algolia externo con key expuesta)

### 15.6 M4 BÚSQUEDAS (E2E-M4 + P_M4 Busquedas)
**Kanban 6+1 oculta** con validaciones HARD (Pulppo):
- Pendiente → Buscando → Visitando (req ≥1 visita) → Ofertando (req ≥1 op) → Cerrando (req ≥1 op) → Ganada (req ≥1 op) + Perdida oculta
- Drag & drop NO funciona en Pulppo — cambio por menú (4 taps). **DMX puede mejorarlo.**
- **Fuente de contacto** REQUERIDA con **17 opciones** (P_M4): Portal Online, WhatsApp, Metros Cúbicos, Pulppo, La Mudi, Portal Terreno, Broker Pulppo, Broker externo, Vivanuncios, ICasas, Inmuebles24, Easybroker, Facebook, Mercadolibre, Doomos, Propiedades.com, Lonas. **Adaptar a DMX** (mantener Inmuebles24, Facebook, WhatsApp, Mercadolibre + DMX marketplace + portales mexicanos).
- **Wizard Ofertar 6 pasos** (P_M4): Operación → Comprador → Vendedor (con "Pegar liga") → Estado (propuesta, reserva, fecha cierre +10 días auto) → Comisión 3% default → Notas.
- Matching engine `/search/{id}/suggested` devuelve 10 propiedades. Sort: operación > tipo > colonia > precio > recámaras.
- **Historial cross-agencia**: contactos a nivel plataforma — asesor ve historial de otras inmobiliarias. Relevante para DMX según rol.

**Notas con 3 niveles visibilidad** (P_M4-§A7): Privada / Compartida con inmobiliaria / Compartida con DMX (equipo plataforma).

**Gap E2E-M4**: `getPipelineMetrics` (cubierto v5.1-S3).

### 15.7 M5 CAPTACIONES (E2E-M5 + P_M5 Captaciones)
**Kanban 6 col**: Pendiente → Seguimiento → Encuentro → Valuación → Documentación → Captado.

**⚠️ Fricción crítica Pulppo**: captación se crea al **INSTANTE** al seleccionar contacto, genera "phantom drafts". **DMX debe exigir mínimo dirección + tipo operación + precio antes de crear.**

**Editor 6 secciones** (P_M5-§C2c): Ubicación (cascada País→Estado→Ciudad→Colonia), Características, Operación, Promoción (con IA para título/descripción), Info Interna, Galería.

**Catálogos Pulppo** (P_M5): 17 tipos propiedad, 47 amenidades, 42 espacios, 100+ adicionales (MEZCLA MX+AR). **DMX debe filtrar por tipo de propiedad y país** (solo CDMX ~15 amenidades relevantes).

**4 etapas de captación funcionales**:
1. **Seguimiento**: urgencia_venta (sin/baja/media/alta), motivo (comprar/compraron/inversión/sucesión), posibilidad (inmediata/en_construcción/doc_compleja), inicio_comercialización
2. **Encuentros**: motivo (primer/propuesta/fotografías/otra) + fecha + hora + notas
3. **Valuación**: precio solicitado vs sugerido vs salida + ACM automático (requiere datos mínimos completos)
4. **Acuerdo Comercial**: comisión desde 1% (% o MXN), exclusividad, duración 3/6/9/12 meses, estado pending/review/signed

**Menú ··· 8 acciones** (P_M5): Compartir Radar, Cambiar estado, Encuentros, Tareas, Notas, Publicar propiedad, Duplicar propiedad, Cerrar captación (irreversible).

### 15.8 M6 TAREAS (E2E-M6 + P_M6 Tareas)
**3 columnas visuales → 5 types internos** (P_M6-§A1):
- Propiedades (property + capture)
- Clientes (search + client)
- Prospectos (lead)

Estados `pending/expired/done`. **Tareas vencidas aparecen primero** (sort expired:0, pending:1, done:2).

**Form 2 pasos** (P_M6-§A2): Seleccionar entidad → Detalle (4 tipos fijos: Contactar propietario/Organizar visita/Organizar captación/Pedir devolución de visita).

**Fricciones Pulppo** (P_M6-§A7):
- ❌ Sólo períodos relativos (1/7/15/30 días) — **DMX debe tener date picker absoluto**.
- ❌ NO campo prioridad en creación (solo como filtro) — **DMX incluirlo**.
- ❌ Tareas NO aparecen en calendario — **DMX debe integrarlo**.
- ❌ Typo en código: `reddirectTo` (doble 'd') — DMX usa `redirect_to`.
- ❌ Sin widget en Dashboard — **DMX debe incluir "tareas del día"**.

**Control acceso**: asesores ven solo las propias; managers con `permissions.tasks.view=true` ven todo el equipo.

**Discrepancia BD↔FE** (DISC-02): BD tareas.type CHECK (propiedades/clientes/prospectos/general); frontend usa (property/capture/search/client/lead). **Resolver con STATUS_MAP** (Opción B recomendada, no tocar BD).

### 15.9 M8 OPERACIONES (E2E-M8 + P_M8 Operaciones)
**Wizard 6 pasos** (P_M8-§A2):
1. **Operación** — side (both/seller/buyer) con descripciones: AMBOS LADOS, LADO VENDEDOR (co-broke: otra inmobiliaria trae comprador), LADO COMPRADOR (co-broke: otra inmobiliaria tiene propiedad)
2. **Comprador** — Asesor (team picker) + Comprador/Inquilino (contactos picker)
3. **Vendedor** — Propiedad (browser completo) + Asesor Productor (auto) + Asesor Vendedor (auto) + Propietario (contactos picker). Permite **pegar liga de EasyBroker/Mercado Libre/Inmuebles 24** para importar datos.
4. **Estado** — CHECK 6 valores, inicial "Propuesta" + fecha cierre (auto +10 días) + valores reserva/promoción/cierre con moneda MXN/USD
5. **Comisión** — % default 4% configurable, IVA auto 16% (4→4.64%), monto recibido editable, adjuntar factura opcional, checkbox declaración jurada OBLIGATORIO
6. **Notas** — textarea + attachments (opcional)

**STATUS_MAP crítico** (DISC-01):
```
offer ↔ propuesta
offer_blocked ↔ oferta_aceptada
contract ↔ escritura (activado desde módulo Legal)
closed ↔ cerrada
paying ↔ pagando
cancelled ↔ cancelada
```

**IVA 16%** automático sobre comisión: 4% → 4.64%. **Split plataforma 20% invisible** en Pulppo (Pulppo retiene 20%, inmobiliaria ve 80% como "Comisión inmobiliaria"). **DMX debe explicitar esto claramente** — es fricción Pulppo conocida.

**Ciclo cobro `/close`** (P_M8-§A3): pending → paid (parcial) → closed (íntegro) → expired.

**Código único por operación**: formato `98A-ACOS-ACOS` (alfanumérico).

**Gap BD**: columna `operaciones.lado` duplicada de `side` (DISC-03). Requiere DROP con autorización de Manu.

**Legal module separado** `/legal` (no en wizard Operaciones): flow No subido → En revisión → Aprobado/Rechazado → Contrato enviado → Contrato firmado.

**NO hay en Pulppo**: RFC/CFDI, conversión FX USD/MXN, integración PAC, retención ISR. **DMX oportunidad de diferenciación** — integrar Mifiel (NOM-151).

### 15.10 M9 MARKETING (E2E-M9)
**7 acciones, 4 gaps principales** (cubiertos v5.1-S3 en router marketing):
- Landing pages (createLanding/getLandings/updateLanding)
- QR codes (createQR/getQRs)
- WhatsApp templates (getTemplates/createTemplate)
- Client folders (createFolder/getFolders/addProjectToFolder)

Photos existentes: `useProjectPhotos` hook (140 LOC), API routes `/api/photos/upload` + `/api/photos/classify`.

### 15.11 M10 ESTADÍSTICAS (E2E-M10 + P_M9 Metricas)
**2 superficies** (P_M9):
- **Página completa** `/stats`: Calidad Atención (T. 1ª respuesta, T. promedio con vs SLA) + Métricas Operaciones (9 KPIs: consultas totales/recibidas/atendidas, búsquedas activas, oportunidades interesado, ACMs, propiedades activas, oportunidades propietario, visitas agendadas). 4 gráficas Recharts.
- **Slide-over** `?metrics=true` con 11 KPIs tipo semáforo.

**Pedagogía integrada por KPI**: sub-drawer con 4 secciones: ¿Qué mide? / ¿Por qué importa? / Consejos / ¿Cómo evoluciona? DMX replicarlo.

**Limitaciones Pulppo** (P_M9-§A13): período fijo "semana anterior" (sin selector fechas), no filtros por colonia/producto, no comparativa vs equipo. **DMX oportunidades**.

**Gaps E2E-M10**: `getPipelineFunnel`, `getRevenueByMonth`, verificar `gamification.getLeaderboard` (cubiertos v5.1-S3).

---

## 16. PORTAL DESARROLLADOR — 7 TABS ANALYTICS IE

**Fuentes:** FE1 dev refs, FE2-§5, BIBLIA-§11, IE3.

### 16.1 Pages (Sesión 14, R2)
R2a Dashboard + Perfil + Trust Score (H05)
R2b Inventario + Historial + useRealtimeUnits
R2c Canal de Distribución + Lead Assignment
R2d Competitive Intelligence + Analytics IE

### 16.2 Analytics IE — 7 Tabs
1. **Demanda** — B01 Demand Heatmap + búsquedas activas que matchean tu inventario
2. **Pricing** — B03 Pricing Autopilot (por unidad: sugerencias vs competencia + días en mercado)
3. **Absorción** — B08 Absorption Forecast (3 escenarios optimista/base/pesimista)
4. **Competencia** — B07 Competitive Intel (tabla mi proyecto vs top 5, 8 dimensiones)
5. **Product Market Fit** — B04 PMF (gap analysis + demand count)
6. **Costos** — B12 Cost Tracker (INPP trend, alertLevel critical/warning/normal)
7. **Predicciones** — B05 Market Cycle fase + B15 Launch Timing + B09 Cash Flow 12 meses

### 16.3 Planes y límites (BE3-§6.1)
Free $0 (1 proyecto, 5 AI extractions, 1 Drive monitor, 2GB) → Starter $999/mes (5 proyectos, 20 extractions, 5 monitors, 10GB) → Pro $2,999 (ilimitado, 50 extractions, 50GB) → Enterprise custom (+ API).

---

## 17. PORTAL ADMIN — 17 PAGES + MARKET OBSERVATORY

**Fuentes:** FE2-§5.1-5.2, BE3-§R9.

### 17.1 Pages (Sesión 19)
1. Dashboard AARRR platform metrics
2. Projects management
3. Participantes (asesores/desarrolladores/MBs)
4. Revenue dashboard (Stripe)
5. **Market Observatory** (ver 17.2)
6. Macro dashboard
7. Zonas (con zone_scores + filtros)
8. Anomalías (E04 Anomaly Detector feed)
9. API Metrics (requests/day, top consumers, revenue, errors)
10. Cohort Analysis
11. Cohort Revenue
12. SystemHealthWidget (/api/health)
13. Feature Registry (sistema permisos v5)
14. Role Features assignment
15. Audit log reader
16. Stripe webhooks monitor
17. Config global / feature flags

### 17.2 Market Observatory — 7 Layers Mapbox (BIBLIA-§11 + IE1-§2.1)
1. Catastro CDMX (parcelas coloreadas por valor catastral)
2. DENUE (heatmap densidad económica + tier ratios)
3. FGJ (heatmap criminalidad con categorías)
4. GTFS (rutas Metro/Metrobús/Tren + estaciones)
5. zone_scores composite (DMX Score por zona)
6. Desarrollos (pines por status)
7. Demanda (heatmap busquedas + wishlist + search_logs)

---

## 18. PORTAL COMPRADOR — 10 PAGES + PERSONALIZACIÓN NETFLIX

**Fuentes:** FE2-§5.3+6.1-6.4, BE3-§R8.

### 18.1 Pages (Sesión 18)
1. Dashboard personalizado por buyer_persona
2. Lifestyle Match selector (A10, 6 perfiles)
3. ¿Me Alcanza? (A01 Affordability con calculadora)
4. Simulador Inversión (A02 4 escenarios)
5. TCO Calculator (A05)
6. Patrimonio 20y (A11)
7. Comparador (A08 multi-dimensional)
8. Timing Optimizer (A07)
9. Watchlist con score alerts (score_subscriptions)
10. Discover Weekly (Spotify pattern — 3 matches semanales)

### 18.2 Personalización Netflix (IE1-§1.5 Pattern 2, XIND-§Pattern2)
- Homepage por perfil: inversor ve ROI/yield primero, familia ve schools/safety primero, primera compra ve affordability/crédito primero
- Score presentation adaptado al perfil
- Artwork personalizado por amenidad más relevante
- Lógica: `user_scores.buyer_persona` → orden de secciones

---

## 19. PORTAL PÚBLICO — LANDING + /INDICES + /METODOLOGIA

**Fuentes:** JSX (landing v2) + BE3 + IE4-§10.8.

### 19.1 Landing pública (JSX completo analizado)
9 secciones SPA: Navbar → Hero → PhotoCarousel → Ticker → Pillars → ZoneExplorer → HowItWorks → Moat → CTA → Footer.

Componentes reusables: `Navbar`, `Btn` (primary/white/outline/outlineWhite con shimmer), `Card3D` (perspective 800), `Sec`, `Title`, `Label`, `FloatingShapes`, `ParticleField` (canvas 70 partículas + líneas dist<110px), `AnimNum` (counter animado con IntersectionObserver).

**Hero mock Dashboard**: 3 KPIs (DMX Score 8.4 ↑0.3, Absorción 2.1x ↑12%, Momentum +0.8σ Positivo), chart momentum por zona 12 barras (periods 6M/1A/3A), 4 zone scores (Del Valle 8.7, Roma 7.9, Nápoles 8.2, Condesa 7.6).

**Stats bar**: 108+ scores, 7 índices, 50+ fuentes, 16 alcaldías CDMX.

**ZoneExplorer** demo (5 zonas interactivas): Del Valle, Nápoles, Roma Norte, Condesa, Polanco — con 6 metrics cada una (Precio, Tendencia, Absorción, Riesgo, Ecosistema, Momentum).

**HowItWorks 4 pasos**: (1) Ingestamos ciudad — 50+ fuentes, (2) Cruzamos todo (Catastro×DENUE×FGJ×SIGED), (3) 108 Scores en 5 niveles, (4) Tú decides mejor.

**Moat table**: 4 competidores (CoStar $35B, Local Logic Series B, Walk Score Redfin, Habi LATAM) con qué tienen y qué les falta.

### 19.2 Rutas públicas adicionales
- `/explorar` — mapa público con 7 capas (simplificadas vs admin)
- `/proyectos/[id]` — ficha completa con Tab Zona (scores IE públicos) + Tab Inversión + Tab Riesgos
- `/indices` — rankings públicos (top colonias por cada índice DMX)
- `/metodologia` — pública sin auth, descripción de cada índice, fuentes, ejemplo cálculo, disclaimer
- `/asesores/[slug]` — microsites asesor (SEC-01 bloqueante: debe usar VIEW sin PII)
- Newsletter signup, DMX Wrapped anual viral (Spotify Wrapped pattern)

---

## 20. FEATURES TRANSVERSALES

**Fuentes:** BIBLIA-§13, BE3-§6, XIND-§Patterns, IE1-§1.5.

### 20.1 Gamification — Duolingo + Strava (IE1-§1.5 Pattern 8)
- Tabla `asesor_gamification`: xp_total, current_streak, level, badges[], monthly_rank
- XP: contacto creado +10, visita +25, venta cerrada +500
- Streaks: días consecutivos respondiendo leads <60min
- Ligas mensuales entre asesores de zona (Bronce→Plata→Oro→Diamante inspirado Duolingo)
- Badges: "Experto Nápoles" (>10 ventas colonia), "Respuesta Rayo" (SLA <15min 30 días)
- Crons: `gamification-daily` (v5.1-S5 NUEVO) + `gamification_monthly_reset`
- Componente `GamificationWidget` en Dashboard M1
- Notificación tipo 17 v4: "Badge desbloqueado"

### 20.2 Notificaciones — 20 tipos × 4 canales (BE3-§6.2)
15 originales v3 + 5 nuevos v4. Canales: in_app, email, whatsapp, push (Pulppo usa Novu como orquestador, DMX puede implementar propio o usar Novu).

**Tipos nuevos v4**:
16. Momentum cambió señal → compradores watchlist zona + asesores zona
17. Badge desbloqueado → asesor (in_app)
18. Discover Weekly listo → comprador con búsqueda activa (email + in_app, lunes 8am)
19. ACM generado → asesor que solicitó (in_app)
20. Captación avanzó etapa → asesor o MB (in_app)

Tabla `notificaciones_config` con toggle por tipo × canal.

### 20.3 Webhooks — 12 event types (BE3-§6.3)
Originales v3 (7): unit_sold, price_changed, lead_created, operation_created, operation_closed, document_processed, visit_scheduled
Nuevos v4 (5): score_changed (>5%), captacion_created, prop_sec_published, acm_generated, momentum_changed

Envío: trigger T6 INSERT webhook_logs, cron procesa → POST target_url con HMAC signature, retry con backoff exponencial hasta failure_count>10 → is_active=false.

### 20.4 Soft Delete Patterns (BE3-§6.5)
- Proyecto despublicado: scores marcan valid_until, workflow_executions cancelled, score_subscriptions inactive, project_brokers/unidades se mantienen, notificación
- Asesor dado de baja: is_active=false, busquedas → perdida (motivo='asesor_dado_de_baja'), tareas completar con nota, gamification mantenida histórica, captaciones → perdida, propiedades_secundarias → pausado
- Operación cancelada: timeline stages → skipped, payment_plans → cancelled, unidad → disponible, cascada B08+B09 recalcula
- Desarrolladora desactivada: cascada a todos sus projects → despublicados, inhouse asesores → is_active=false
- Captación cerrada NUEVO v4: etapa=perdida, closed_at, motivo_perdida obligatorio, **REVERSIBLE** vía updateCaptacionEtapa

### 20.5 Cross-Portal Flows (BE3-§6.6)
**Flow maestro** (preservado v3):
```
DEV sube PDF → document_job → AI extrae → Tabla verde/amarillo/rojo → DEV completa →
Quality Score → Proyecto publicado → Matching ejecuta → ASESOR recibe sugerencias →
ASESOR comparte con COMPRADOR → busqueda_proyectos → COMPRADOR interesado →
feedback (hot) → ASESOR agenda visita → feedback post-visita → ASESOR crea operación →
timeline → checklist docs → Apartado → Pagos → Escritura → 3 precios → IE calibra →
Trust Score → Review comprador
```

**Flujos NUEVOS v4**:
- Captación → venta secundaria (con ACM datos IE + sync propiedades_secundarias → market_prices_secondary)
- Propiedades secundarias como fuente IE (alimenta A12 Price Fairness + A04 Arbitrage)
- Gamification → Engagement → Datos (XP motiva acciones → más datos IE)

### 20.6 Personalización Netflix (ver §18.2)

### 20.7 Discover Weekly — Spotify pattern (XIND-§Pattern2)
Cron `discover_weekly_generate` lunes 8am. Lógica: C03 matching × búsquedas activas × historial visitas × perfil financiero. Genera `ai_generated_content.type='discover_weekly'` con 3 proyectos match. Email + in_app.

### 20.8 DMX Wrapped anual (XIND-§Pattern7)
Cron `annual_wrapped` (1 enero). Reporte viral personalizado del año inmobiliario. "Las 10 colonias con mayor Momentum este año", "Tu zona subió X% en Livability desde que compraste". Share buttons.

### 20.9 Marketing auto (BIBLIA-§13, BE3-§R6)
Landing pages + QR + kit ventas con datos IE. Auto-generación piezas: PostCuadrado, PostLargo, Story, VideoStory, Video.

### 20.10 Academia (INS-§R3)
Cursos con videos, lecciones progresivas, certificación. Desbloqueo gradual. Ruta `/academia/[id]`. Integrado con Pulppo Plus tier requirements.

### 20.11 Inbox (BE3-§R4c)
Inbox unificado MVP: emails + WhatsApp + eventos del CRM en una vista (Sesión 16).

---

## 21. MONETIZACIÓN — 3 FASES

**Fuente primaria:** BIBLIA-§12, BE3-§6.1.

### Fase 1 — Todo gratis (validación)
Lanzamiento. Sin paywalls. Objetivo: validar producto, atraer asesores+devs, acumular datos.

### Fase 2 — Suscripciones + Fee por venta (post-validación)
**Planes asesor**:
- Free $0: 50 contactos, 10 búsquedas, 2 AI dossiers/mes, 2 briefings
- Starter $499/mes: 200 contactos, 50 búsquedas, 10 AI dossiers, 4 briefings
- Pro $999: ilimitado + 30 AI dossiers, 8 briefings
- Enterprise $2,499: ilimitado+equipo, ilimitado

**Planes desarrollador**:
- Free $0: 1 proyecto, 5 AI extractions, 1 Drive monitor, 2GB
- Starter $999/mes: 5 proyectos, 20 extractions, 5 monitors, 10GB
- Pro $2,999: ilimitado, 50 extractions, 50GB
- Enterprise custom: ilimitado + API

**Fee por venta**: 0.5% del valor de cierre al desarrollador (BIBLIA-§12, BE3-§6.1).

### Fase 3 — IE monetizado (3 revenue streams)
**Planes API externa**:
- Free $0: 100 queries/día, solo score+label
- Starter $5,000/mes: 10K queries/día, components incluidos
- Pro $25,000/mes: 100K queries/día, historical+trends+bulk
- Enterprise custom: unlimited, SLA 99.9%, dedicated support, custom endpoints

**Target revenue split H3** (IE5-§13.3): Marketplace 40% / API 35% / Productos 25%.

### Feature gating (BE3-§6.1)
`checkFeatureLimit(userId, feature)` cruza `subscriptions.plans.features` con `countFeatureUsage`. Features gateados: max_contacts, max_searches, ai_dossiers_month, ai_briefings_month (asesor); max_projects, ai_extractions_month, drive_monitors, storage_gb (dev); max_asesores, max_projects_authorized (MB); NUEVO v4: max_captaciones, max_props_secundarias, acm_month, api_queries_day.

---

## 22. COMPETIDORES ANALIZADOS

**Fuente primaria:** IE5-§13.1-13.3, XIND-§PARTE2, HABI completo.

### 22.1 CoStar Group ($35B cap, $3B+/yr revenue)
**Fortalezas**: 6M+ propiedades CRE, 39 años acumulación, vertical integration (data+marketplaces+analytics+Matterport), COMPASS credit model 17 años, 163M monthly visitors, Oxford Economics forecasting, peer comparison, 8 economic scenarios, saved searches+alerts, 1000+ research analysts.
**Debilidades vs DMX**: Sólo US/UK/France — **ZERO LATAM**. Commercial-first, residencial secundario. NO neighborhood livability, NO urban intelligence (crime/transit/walkability/ecosystem), NO temporal momentum, NO open data integration. Pricing $300-500/user inaccesible LATAM.
**Lo que DMX copia**: peer comparison (A08), 8 economic scenarios (E07), saved searches+alerts, custom reports (I02+E08), COMPASS model (DMX COMPASS H3).

### 22.2 Cherre (~$300M private)
**Fortalezas**: Knowledge graph 500M nodos/1.5B edges, Data Fabric mapea ANY address, 100+ vendor integrations, Agent.STUDIO agentic workflows, powers $3T AUM.
**Debilidades vs DMX**: Infrastructure-only (no consumer), US-only, no proprietary scores/indices, no neighborhood analytics.
**Lo que DMX aprende**: Knowledge Graph (DMX Knowledge Graph H3), Data Fabric (el IE ya hace esto), Agent.STUDIO concept.

### 22.3 Local Logic (~$50M private)
**Fortalezas**: 18 location scores (walkability, transit, quiet, vibrant, groceries, parks, schools, nightlife, cafes), address-level, B2B API en Sotheby's/RE/MAX/Royal LePage, 10 años datos, sustainable metrics.
**Debilidades vs DMX**: US+Canada ONLY, scores **ESTÁTICOS** sin temporalidad/momentum, NO crime/safety, NO ecosystem económico, NO risk scoring (seismic/flooding/water), NO market/pricing, NO transaction data, B2B only.
**Ventaja DMX**: 108+ scores vs 18. Temporalidad. Crime/safety. Risk. Ecosystem económico (DENUE). Conectado a transacciones. México (130M personas, 0 competidores).

### 22.4 Walk Score (parte de Redfin ~$1B)
**Fortalezas**: Industry standard (+$3,250 por punto Walk Score), embedded Redfin/Zillow/Apartments, simple 0-100, consumer-friendly.
**Debilidades**: Grid-based no address-specific, solo 3 scores, ESTÁTICO sin temporal trends, US/Canada only, metodología sin evolución desde 2007.
**Lo que DMX copia**: simplicidad 0-100 (N08), Opportunity Score (H12), historical tracking (score_history), embeddability (API).

### 22.5 First Street Foundation
**Fortalezas**: Climate risk financiero por propiedad, integrado Zillow/Redfin, $50M levantados, modelo probabilístico flood/fire/heat.
**Debilidades**: Solo climate, US only, no crime/water infrastructure/seismic, no marketplace.
**Ventaja DMX**: Riesgo sísmico H03 (crítico MX), hídrico por infraestructura (N07, F05 — SACMEX no clima), criminal (F01, N04), integral (DMX-IRE).

### 22.6 DD360 + Monopolio + Wiggot + Compa (México)
**DD360**: AVM mexicano 200+ puntos data, $91M USD levantados, 120+ desarrollos, conecta SEDUVI, ciclo vida compra.
**Debilidades vs DMX**: sin location intelligence profunda, sin scores temporales, sin ecosystem económico, sin risk multi-fuente, **sin marketplace con transacciones reales para calibración**.
**Ventaja DMX**: IE 108+ scores vs valuación puntual, momentum temporal (snapshots DENUE), risk integral, marketplace calibrador, Ecosystem Score (SCIAN).

### 22.7 Pulppo (CRM competidor directo)
**Fortalezas** (P01-P09 análisis reverse engineering):
- CRM funcional 10 módulos completos
- MLS 813K propiedades
- ACM automático
- Pipeline captación 6 etapas
- Métricas pedagógicas + SLAs
- Multi-país (MX, CO, AR)
- Integración portales (Inmuebles24, ML, Zonaprop)
- Auto-generación piezas marketing

**Debilidades vs DMX**:
- **ZERO intelligence engine** — no scores zona, no momentum, no risk
- ACM solo datos internos Pulppo, no cruza fuentes externas
- No safety/transit/ecosystem/agua scores
- No temporal tracking zonas
- Sin API para terceros
- Bundle monolítico 10MB (performance)
- MongoDB + Firebase vs PostgreSQL/Supabase (escalabilidad + RLS limitados)
- No personalización homepage
- No gamification asesor
- **JWT en localStorage** (vulnerabilidad XSS)
- **Typesense API key expuesta cliente**

**Lo que DMX tropicaliza de Pulppo**: dashboard carrusel "¿Qué debo hacer hoy?", Kanban 6+1 con lead score badges, captaciones pipeline con ACM IE, métricas pedagógicas con SLAs + semáforos + IE asesor scores, wizard operaciones 6 pasos con IVA auto, inventario calidad+valuación con IE overlay, auto-generación marketing con datos IE.

**Lo que DMX agrega que Pulppo NO tiene**: IE scores en cada superficie CRM, Lead Score predictivo, Matching Engine con datos IE (no solo precio/tipo), Pricing Autopilot devs, Gamification (streaks/XP/leaderboards/badges), Personalización homepage por perfil, Discover Weekly, DMX Wrapped, API licenciable.

### 22.8 Duolingo (Gamification benchmark, $600M+/yr)
Streaks (3x retención), XP+ligas (Bronce→Diamante), badges coleccionables, leaderboards con loss aversion. DMX aplica: streaks respuesta leads <60min, XP por acciones, ligas mensuales zona, badges "Experto Nápoles".

### 22.9 Strava (Social fitness, ~$250M+/yr)
Segmentos + KOMs + leaderboards por segmento, heatmaps crowdsourced. DMX aplica: segmentos = colonias, "KOM" = "Rey de Nápoles Q2", heatmap visitas/ventas, social limitado a equipos.

### 22.10 Cursor (Feedback loop implícito)
Cada accept/reject entrena modelo. DMX aplica: accept B03 Pricing → calibra pricing, reject C03 Matching → aprende qué NO funciona, filtros modificados → search_logs revelan preferencias, PostHog engagement, comparador projects → preferencias ocultas.

### 22.11 Otros (IE5-§13.1)
Zillow/Zestimate (AVM 104M, DMX → I01), HouseCanary (Value by 6 Conditions, DMX → I01 with conditions), Placer.ai (foot traffic CRE, DMX → search_logs+PostHog), CAPE Analytics (computer vision aérea, H3 satellite), PriceHubble (AVM europeo+lifestyle, DMX → I01+A10), ZestyAI (climate risk, DMX → H03+N07+F12), CoreLogic (HPI AVM líder, DMX → I01 MX), Quantarium (deep learning AVM), ATTOM Data (158M propiedades US), Lofty/Chime (CRM AI 50K agentes), Opendoor (iBuyer), Matterport (3D digital twins H3).

### 22.12 Habi (reporte separado HABI completo 50KB)
Análisis detallado en 13_REPORTE_HABI_Catastro_SIGCDMX.md. Enfoque: iBuyer LATAM, integración catastro SIGCDMX. **Regla operativa (INS-§Precauciones)**: NUNCA consumir API de Habi — usar fuentes públicas directas.

### 22.13 Matriz competitiva — lo que DMX tiene y nadie más (IE5-§13.2)
DMX es el único con TODO lo siguiente junto:
```
✅ Marketplace integrated + Transaction data (calibration)
✅ Location scores (18+)  + Livability/lifestyle  + Crime/safety  + Safety TREND
✅ Economic ecosystem score (Shannon-Wiener sobre SCIAN — IP propietaria)
✅ Seismic/flood/water infrastructure risk  + School QUALITY  + Health access by level
✅ Temporal/momentum tracking  + Predictive gentrification  + Cross-source correlations
✅ Transaction-calibrated models  + Mexico / LATAM coverage  + Residential-first
✅ Risk-adjusted valuation  + Employment accessibility  + CRM integrado
✅ AI content generation  + Gamification  + Personalized homepage
🔶 Knowledge graph (H3)  + AVM (H3)
```

---

## 23. 245 UPGRADES — 19 SUB-ETAPAS

**Fuente primaria:** INS-§SESIÓN 07 + BIBLIA-§9.

Los 245 upgrades viven **principalmente en Sesión 07** pero benefician TODAS las sesiones. NO reemplazan el plan original S08-20 — lo **enriquecen**.

### 23.1 Distribución (BIBLIA-§9)
| Sub-etapa | UPG # | Contenido | Deps | Docs fuente |
|-----------|-------|-----------|------|-------------|
| 7.1 | 1-6 | DENUE + FGJ real | ninguna | IE1, IE4 |
| 7.2 | 7-13 | Catastro + Uso Suelo | ninguna | IE1, HABI |
| 7.3 | 14-20 | GTFS, SIGED, DGIS, Atlas, SACMEX | 7.1 | IE1 |
| 7.4 | 21-29 | Cross-references 8 fuentes (Catastro×DENUE×FGJ×SIGED×DGIS×GTFS×SACMEX×Atlas + Δ temporal) | 7.1-7.3 | IE1, IE4 |
| 7.5 | 30-38 | Pre-calculators datos reales (Ecosystem, Crime, Supply-Demand, Price Intel, Completeness, Gentrification, Own-data, Market Pulse, Rankings) | 7.4 | IE2, IE4 |
| 7.6 | 39-46 | AVM Mexicano MVP (I01) | 7.5 | IE2, IE3 |
| 7.7 | 47-55 | Intelligence Cards (predio/manzana/colonia/alcaldía + Comparador + Risk + Investment) | 7.5-7.6 | IE3, IE4 |
| 7.8 | 56-68 | Mapa Inteligente 7 capas Mapbox (catastro, DENUE, FGJ, GTFS, scores, desarrollos, demanda) | 7.2-7.5 | IE1, FE1 |
| 7.9 | 69-80 | Herramientas Asesor datos reales (valuación, comparables, plusvalía, dossier, alert catastral, argumentario, objeción killer, urgency, post-visita, lead priority, ACM) | 7.5-7.6 | IE2, IE3 |
| 7.10 | 81-89 | Developer Intelligence datos (demand heatmap, pricing advisor, competitive, benchmark, feasibility, terrenos, análisis manzana, oportunidades, proyección) | 7.5 | IE3, FE2 |
| 7.11 | 90-98 | Buyer Experience datos reales (ficha scores, AVM vs precio, momentum, risk, nearby, buy vs rent, comparador, affordability, mapa público IE) | 7.5-7.6 | IE3, FE2 |
| 7.12 | 99-110 | API & B2B endpoints (completa, bulk, bancos, aseguradoras, retailers, rate limiting, docs, dashboard, sandbox, webhooks, batch, widget) | 7.5-7.7 | IE5, BE3 |
| 7.13 | 111-122 | Gobierno & Notarías (observatorio, predicción servicios, construcción informal, policy impact, atlas dinámico, credit scoring geo, insurance, due diligence, valor escrituración, certificado, microcréditos, token) | 7.6-7.12 | IE5 |
| 7.14 | 123-132 | Movilidad & Retail (delivery demand, route seguridad, site selection, competitive SCIAN, trade area, yield renta, feasibility auto, predictive maintenance, digital twin) | 7.5-7.8 | IE5 |
| 7.15 | 133-150 | Growth & Contenido viralizable (mapa público, rankings, estado mercado, alertas, API playground, índice DMX, API academia, data journalism, wallet patrimonio, self-optimizing, predictive zoning, urban genome, DMX OS, shareable, weekly wins, achievements, NPS) | 7.5-7.12 | IE5, XIND |
| 7.16 | 151-165 | Fintech & Proptech (property verification, developer trust, asesor verification, buyer fraud, AML flag, property/contact/developer enrichment, zone batch, broker enrichment, sentiment, reputation, buzz, news, competitor) | 7.6-7.12 | IE5 |
| **7.17** | **166-225** | **People Intelligence (55 upgrades — la sub-etapa más grande)**: IDENTITY (Buyer/Asesor/Developer DNA, Household, Life stage), MATCHING (Neural, Asesor-buyer, Dev-broker, Network, Influence), BEHAVIORAL (Decision fatigue, FOMO, Loss aversion, Anchoring, Social proof), REPUTATION (Rating público, Timeline, Verified badge, Reviews, Disputes), PREDICTIVE (Readiness, Churn avanzado, Next move, Market timing, Career), PERSONALIZATION (Homepage, Notifs, Email, Pricing display, Adaptive UX), COMMUNITY (Zona feed, Knowledge sharing, Social proof, Co-investment, Team intel), DATA SERVICE (Enrichment API, Batch, Monitoring, Custom reports, White-label), WORKFLOW (Lead scoring auto, Auto-pricing, Smart notifs, Auto-captación, Auto-followup), ECOSISTEMA (Mudanzas, Servicios hogar, Recruiting, Benchmarking, Insurance), GLOBAL (Multi-city, LATAM, Cross-border, Academic, Government) | 7.5-7.16 | IE3, IE5 |
| 7.18 | 226-235 | Interacción Activa (NLP WhatsApp, Voice of customer, Question intelligence, Negotiation intelligence, Objection mapping zona, Preference revelation, Emotional journey, Coaching signals, Trust building, Decision acceleration) | 7.17 | IE5 |
| 7.19 | 236-245 | Market Memory + DMX Agente (Market memory, Pattern library, Collective intelligence, Urban narrative, Feedback loops, DMX co-pilot asesor, DMX advisor comprador, DMX strategist desarrollador, Proactive intelligence, Scenario simulator) | 7.17-7.18 | IE5 |

---

## 24. ROADMAP — 20 SESIONES + ETAPA 0 + 7 SPRINTS v5

**Fuente primaria:** BIBLIA-§8, INS-§MAPA COMPLETO, BE3-§7.

### 24.1 Estado al 2026-04-17
```
SESIÓN │ SPRINT    │ CONTENIDO                                        │ STATUS
───────┼───────────┼──────────────────────────────────────────────────┼────────
  01   │ R0-v4     │ DB + Security + Bugs + 8 tablas nuevas           │ ✅ DONE (tag: restructure-r0-v4)
  02   │ R1a       │ Dashboard Asesor + Contactos + Gamification      │ ✅ DONE (tag: restructure-r1a-v4)
  03   │ R1b       │ Pipeline Búsquedas Kanban 6+1                    │ ✅ DONE (tag: restructure-r1b-v4)
  04   │ R1c       │ Captaciones + Props Secundarias + ACM            │ ✅ DONE (tag: restructure-r1c-v4)
  05   │ R1d       │ Tareas + Operaciones + Cierres + Métricas        │ ✅ DONE (tag: restructure-r1d-final, commit 8ae00d4)
  06   │ IE-1      │ IE Arquitectura + 77 Upgrades + Auditoría E2E    │ ✅ DONE (commit 1af3048, ~15K LOC)
───────┼───────────┼──────────────────────────────────────────────────┼────────
  E0   │ ETAPA 0   │ Auditoría Profunda + Biblia v5 + Seguridad       │ ✅ DONE
───────┼───────────┼──────────────────────────────────────────────────┼────────
  E0+  │ v5-S0     │ Seguridad (23 fixes) + Fundación BD             │ 🟡 EN CURSO (v5.1 cubrió ~3/23 críticos)
       │ v5-S1     │ Dashboard + Sidebar + Header Dopamine            │ ✅ v5.1-S1 hardening + CSP
       │ v5-S2     │ Contactos + Tareas                               │ ✅ v5.1-S2 foundation
       │ v5-S3     │ Búsquedas + Captaciones                          │ ✅ v5.1-S3 backend tRPC 6 routers
       │ v5-S4     │ Operaciones + Estadísticas                       │ ✅ v5.1-S4 cableado 73 llamadas
       │ v5-S5     │ Desarrollos + Marketing                          │ ✅ v5.1-S5 SocialProofCounter fix
       │ v5-S6     │ Implementar 6 tRPC stubs                         │ PENDIENTE
───────┼───────────┼──────────────────────────────────────────────────┼────────
  07   │ IE-2      │ Ingesta Real + Catastro + Mapa Inteligente       │ PENDIENTE (contiene sub-etapas 7.1-7.19)
  08   │ IE-3      │ Scores Nivel 0 (21) + AVM MVP                    │ PENDIENTE
  09   │ IE-4      │ Scores Nivel 1 (16) + Intelligence Cards         │ PENDIENTE
  10   │ IE-5      │ 11 Scores Nuevos N01-N11 + Cross-References     │ PENDIENTE
  11   │ IE-6      │ Scores Nivel 2 (14) + Cascadas Live              │ PENDIENTE
  12   │ IE-7      │ Scores Nivel 3-4 (19) + 7 Índices DMX           │ PENDIENTE
  13   │ IE-8      │ Nivel 5 AI (26) + Productos Licenciables        │ PENDIENTE
  14   │ R2        │ Dev Core + Analytics IE                          │ PENDIENTE
  15   │ R3        │ Document Intelligence Pipeline                   │ PENDIENTE
  16   │ R4        │ Legal + Pagos + Inbox + Calendario               │ PENDIENTE
  17   │ R6-R7     │ Marketing + WhatsApp + Notificaciones            │ PENDIENTE
  18   │ R8        │ Portal Comprador + Features Transversales        │ PENDIENTE
  19   │ R9        │ Admin + Stripe + API Externa + Productos         │ PENDIENTE
  20   │ R10+POST  │ Crons + Mobile + DR + Tests + Verificación       │ PENDIENTE
```

### 24.2 Fases H1/H2/H3 (IE5-§13.3)
- **H1 (0-3 meses)**: R5a-2 + R2-R4 + R5 + R6-R7. Producir 30+ scores Tier 1 CDMX con datos reales. 2+ snapshots DENUE. Marketplace+CRM funcionales.
- **H2 (3-6 meses)**: R8-R9 + R10. API live, DMX Estimate v1, 50+ proyectos reales, primeras 5+ transacciones cerradas (calibración E03), Gamification v1, Discover Weekly v1, reporte trimestral para PR.
- **H3 (6-12+ meses)**: Productos con clientes pagando, 1500 desarrollos todo México, top 10 ciudades con datos geo, 500+ asesores, 100+ transacciones. Revenue split 40% marketplace / 35% API / 25% productos. Hitos validación: DMX Score citado 3+ medios, 5+ clientes API, DMX Estimate error <15%, Momentum predijo 3+ zonas apreciación, "DMX Score 85" en presentaciones venta.

### 24.3 Horas estimadas (BE3-§7)
Total 211-267 hrs base; +25% buffer → 264-334 hrs; ~33-42 días = 7-9 semanas dev full-time. Rompiendo por fase: R0 14-18, R1 25-30, R2 20-25, R3 24-30, R4 18-22, R5a-2 15-20, R5 16-20, R6 14-17, R7 16-20, R8 12-16, R9 16-20, R10 14-19, Post 4-5.

### 24.4 Reglas de trabajo (BIBLIA-§14)
Heredadas v4 (10):
1. BD real > Biblia — verificar information_schema antes de SQL
2. SQL a Supabase SQL Editor directo, nunca Claude Code
3. Passwords solo en terminal directa
4. `export const dynamic = 'force-dynamic'` para tRPC API routes
5. Supabase joins retornan arrays → Array.isArray()
6. normalize_phone() + unique index anti-duplicados
7. SECURITY DEFINER para helpers RLS (evitar recursión)
8. UNA instrucción a la vez → verificar → siguiente
9. git tag antes de cambios grandes
10. Visual verification en localhost antes de commit

Nuevas v5 (10):
11. Frontend Dopamine JSX es FINAL — no remover, solo agregar
12. STATUS_MAP traduce frontend↔BD, nunca hardcodear
13. Card3D es el componente estándar de cards
14. Cada módulo tiene su tint color — respetar
15. Todo feature nuevo → agregar a feature_registry primero
16. Cada módulo = sprint independiente
17. build limpio obligatorio antes de commit
18. Módulo 7 = "Desarrollos" (no "Inventario")
19. Cada botón/acción en frontend DEBE tener endpoint backend mapeado
20. pwd + git remote + git log + git status ANTES de cualquier instrucción

Regla extra (INS-§Precauciones): **NUNCA consumir API de Habi** — usar fuentes públicas directas.

---

## 25. GAPS, DISCREPANCIAS Y CONTRADICCIONES

### 25.1 Doc vs BD real (resolución pendiente)
Registradas oficialmente como **DISC-01..DISC-09** (BIBLIA-§4):

| ID | Tabla.Campo | BD real | Frontend Dopamine | Resolución |
|----|-------------|---------|--------------------|------------|
| DISC-01 | operaciones.status | propuesta/oferta_aceptada/escritura/cerrada/pagando/cancelada | offer/offer_blocked/contract/closed/paying/cancelled | STATUS_MAP (creado en v5.1-S1) |
| DISC-02 | tareas.type | propiedades/clientes/prospectos/general | property/capture/search/client/lead | STATUS_MAP (Opción B, no tocar BD) |
| DISC-03 | operaciones.lado | EXISTS (duplicate of side) | solo usa side | DROP lado (requiere autorización Manu) |
| DISC-04 | dmx_indices.index_code | 5 valores (CHECK) | necesita 7 (agregar MOM, LIV) | ALTER CHECK (v5-S0 Tarea 2) |
| DISC-05 | env vars | CLAUDE_API_KEY, MAPBOX_TOKEN | ANTHROPIC_API_KEY, MAPBOX_ACCESS_TOKEN | Normalizar (v5-S0 Tarea 9) |
| DISC-06 | contactos.phones | jsonb array | frontend maneja jsonb | Adaptar UI (no tocar BD) |
| DISC-07 | contactos.emails | jsonb array | frontend maneja jsonb | Adaptar UI |
| DISC-08 | contactos.name | first_name + last_name | algunos DOCX dicen "nombre" | Usar BD real |
| DISC-09 | profiles.phone | text column | algunos DOCX dicen "teléfono" | Usar BD real |

### 25.2 Contradicciones entre documentos
- **Conteo de scores**: IE4 dice 108, IE5 dice 107, registry.ts tiene 107 registrados. **11 nuevos N01-N11**. Total único probable: **118 scores + 7 índices = 125 entregables IE**. Verificar registry.ts.
- **Conteo de cascadas**: BIBLIA-§10.2 dice 9, IE5-§11.1 formaliza 6. Diferencia: BIBLIA cuenta triggers individuales (denue_ingested, fgj_ingested, own_data_ingested, snapshot_completed) como cascadas separadas. IE5 los agrupa en `geo_data_updated`.
- **BE3 vs BIBLIA (números BD)**: BE3 dice "107 tablas, ~150 RLS, ~22 helpers, ~8 triggers, 23 crons" — desactualizado (pre-Etapa 0). BIBLIA-§3.1 corrige a 110/207/64/36/31.
- **CLAUDE.md desactualizado**: dice "107 tablas, ~12 triggers, ~25 functions" — corregir a 110/36/64.
- **Pulppo vs DMX nomenclatura tareas**: Pulppo usa "Organizar captación" (tipo de tarea). DMX tiene tareas.type={property/capture/search/client/lead/general}. Cruce con STATUS_MAP.
- **v5.1-S3 vs E2E**: E2E pidió UN router nuevo (`marketing`) + extensiones a `asesorCRM`; v5.1-S3 creó 6 routers nuevos. Ambos son válidos — discutir consolidación con Manu.
- **Roadmap R5a-2**: doc 03 (BE3) lo trata como sprint independiente paralelo a R1/R2. Doc 11 (INS) lo mete en Sesión 07 sub-etapas 7.1-7.5. Mismo trabajo, diferente numeración.
- **Número de notificación tipos**: BIBLIA-§13 y BE3-§6.2 dicen 20 tipos (15 v3 + 5 v4). Pulppo tiene ~40 tipos en su panel Notificaciones (P02-§A1). DMX puede expandir hacia 40 si gana madurez.

### 25.3 Gaps estructurales (doc dice pero BD no tiene)
- **geo_snapshots table**: propuesta en IE4-§9.12 como nueva v4. Verificar si ya está creada en BD.
- **10 crons stubs**: aparecen en biblia pero no en vercel.json del repo — crear (§8.2).
- **Tablas que biblia menciona pero no verifiqué en BD**: `asesor_outcomes`, `calendario_eventos`, `disc_profiles`, `market_alerts`, `ai_coaching_log`, `comisiones`, `supported_cities`. Todas aparecen en lista BE1-§Categorías pero no confirmadas con `information_schema`.

### 25.4 BD tiene pero doc no describe
- **Sistema de permisos v5** (feature_registry, role_features, profile_feature_overrides + resolve_features): CREADAS en v5-S0 Tarea 1. Biblia 17 los menciona pero BE1 original no los tenía.
- **Tabla marketing_portales**: CREADA en v5.1-S3. No está en BE1 original.
- **Migración streaks_function**: aplicada en v5.1 (commit fixture). Falta documentar.

### 25.5 Docs Pulppo vs DMX (fricciones que DMX YA resuelve o debe resolver)
**YA RESUELTAS en DMX**:
- Detección duplicados (normalize_phone + unique index)
- Tags personalizables (text[])
- FTS interno Postgres
- JWT en cookies httpOnly (no localStorage)
- Stack PostgreSQL+RLS (vs MongoDB+Firebase)

**PENDIENTES DMX debe garantizar**:
- Evitar "phantom drafts" de captaciones (exigir mínimo dirección+tipo+precio antes de crear)
- Date picker absoluto en tareas (no solo relativos)
- Prioridad en creación de tareas (no solo filtro)
- Tareas integradas con calendario
- Widget "tareas del día" en Dashboard
- Labels Valuación descriptivos (no low=bueno/high=malo contraintuitivo)
- Mostrar criterios faltantes en QualityStatistics (no solo contadores)
- Filtrar amenidades/espacios/adicionales por país+tipo_propiedad (no lista unificada 100+ opciones)
- Mostrar claramente split de comisión plataforma (no invisible)
- RFC + CFDI + Mifiel NOM-151 para fiscalidad MX
- Historial precios visible en ficha propiedad (priceHistory[] existe pero Pulppo no renderiza)

### 25.6 Gaps IE (datos vacíos)
- 0 rows en: geo_data_points, zone_scores, project_scores, user_scores, dmx_indices, geo_snapshots, score_history, score_recalculation_queue, score_subscriptions, market_anomalies, market_prices_secondary, search_trends, market_pulse, zone_price_index, zona_snapshots.
- 5/107 calculators implementados (4.7%): B02 (con bug), B08, B11, B12, H05.
- 2/9 ingestores implementados (22%): Banxico 4 series, INEGI 2 series.
- **Sesión 07 (sub-etapas 7.1-7.5) es urgente para desbloquear scores Tier 1.**

---

## 26. ESTADO ACTUAL v5.1 VS FALTANTE

### 26.1 Lo que v5.1 (5 commits) resolvió
```
v5.1-S1 (9471e90): Hardening crítico
  - middleware.ts: enforcement is_active en todas las rutas auth
  - CSP + HSTS headers (responde parte de SEC-12 CORS)
  - lib/constants/status-maps.ts CREADO (OP_STATUS_MAP + TASK_TYPE_MAP)
  - migration profiles_security aplicada

v5.1-S2 (73c6bd0): Foundation Dopamine
  - components/ui/dopamine/* compartidos (Card3D, Btn, Label, Title, etc.)
  - asesor-nav ÚNICA (consolidada, eliminada duplicada)
  - 5 archivos Client.tsx legacy archivados

v5.1-S3 (27b7102): Backend tRPC
  - 6 routers nuevos (contactos/busquedas/tareas/operaciones/estadisticas/marketing)
  - asesorCRM extendido (~16 procedures nuevas según E2E)
  - tabla marketing_portales creada
  - cron gamification-daily configurado

v5.1-S4 (f2962a0): Cableado frontend
  - 9 módulos Dopamine conectados (M1-M9)
  - 73 llamadas tRPC activas (de 0 a 73)
  - navegación Dopamine integrada
  - ErrorBoundary implementado

v5.1-S5 (d407a6d): Fix preventivo SocialProofCounter
  - Migración SocialProofCounter a VIEW public_profiles
  - Avanza fix SEC-01 (sin PII en microsite asesor)

+ .gitignore (49b3bb5): ignore docs/biblia-v5/
```

### 26.2 Lo que queda del v5-S0 biblia
De los 14 hallazgos seguridad prioritarios + 10 tareas fundación (BIBLIA-§8, SEC Plan de Acción):

**BLOQUE 1 CRÍTICOS pendientes**:
- ❌ SEC-02: Trigger `prevent_role_escalation` (🔴 el más urgente)
- 🟡 SEC-01: Validar que NINGÚN consumo use tabla profiles directa — auditar código
- ❌ SEC-03: Fix desarrolladoras_select_public → VIEW
- ❌ SEC-04: Auth validation en 8 funciones SECURITY DEFINER

**BLOQUE 2 ALTOS pendientes**:
- ❌ SEC-06: Restringir profile-avatars bucket
- ❌ SEC-07: Restringir storage INSERT por rol
- ❌ SEC-05: VIEW pública projects sin broker_*
- ❌ SEC-14: Quitar DELETE en 5 tablas históricas
- ❌ SEC-15: WITH CHECK score_subscriptions premium
- ❌ SEC-16: Autorización landing_pages INSERT

**BLOQUE 3 MEDIOS pendientes**:
- ❌ SEC-22: Deduplicar project_views
- ❌ SEC-23: Restringir avance_obra_log
- ❌ SEC-09: qr_codes a owner
- ❌ SEC-20: Rate limit demand_queries

**FUNDACIÓN BD pendientes**:
- ✅ Tarea 1: 3 tablas permisos (DONE)
- ❌ Tarea 2: ALTER dmx_indices CHECK (+DMX-MOM, DMX-LIV) — DISC-04
- ❌ Tarea 3: ALTER tareas.type CHECK (ampliar) — o STATUS_MAP en FE
- ❌ Tarea 4: DROP operaciones.lado (requiere autorización Manu) — DISC-03
- ❌ Tarea 5: Seed ~120 feature_registry rows
- ❌ Tarea 6: Seed role_features defaults
- ✅ Tarea 7: lib/constants/status-maps.ts (DONE v5.1-S1)
- ❌ Tarea 8: lib/constants/feature-keys.ts
- ❌ Tarea 9: Normalizar env vars — DISC-05
- ❌ Tarea 10: tRPC permisos router

### 26.3 Lo que queda por construir (macro)
- **Sesión 07 completa**: 245 upgrades en 19 sub-etapas. Esfuerzo más grande del proyecto. Core: R5a-2 (ingesta geo), implementar ingestores DENUE/FGJ/GTFS/Atlas/SIGED/DGIS/SACMEX, sistema snapshots, calculators N01-N11, mapa inteligente 7 capas Mapbox, intelligence cards.
- **Sesiones 08-13**: implementación formal de los scores Nivel 0-5 (faltan ~103 de 108) + 7 índices (falta 7 de 7 operativos).
- **Sesiones 14-20**: Portal Dev completo, Document Intelligence, Legal+Pagos+Inbox+Calendario, Marketing+WhatsApp+Notifs+Workflows, Portal Comprador+features transversales, Admin+Stripe+API externa+productos, Crons restantes+Mobile+DR+Tests.

### 26.4 Estado en números
```
BACKEND                          ANTES v5.1 → DESPUÉS v5.1
Tablas                           107 → 110 (+3 permisos + marketing_portales = 111?)
tRPC routers funcionales         9 → 15
tRPC procedures                  ~70 → ~86
Crons                            19 → 20 (+ gamification-daily)
RLS policies                     ~207 → ~210 (+ profiles_security)
Migrations aplicadas v5.1        +3

FRONTEND DOPAMINE                ANTES → DESPUÉS v5.1
Módulos M1-M9 conectados         0/9 → 9/9
Llamadas tRPC activas            0 → 73
STATUS_MAP                       NO → SÍ
Nav asesor                       duplicada → única

SEGURIDAD                        ANTES → DESPUÉS v5.1
23 hallazgos cerrados            0 → ~3 (SEC-01 parcial, SEC-12 CSP, SEC-10 parcial)
SEC-02 (crítico prioritario)     ABIERTO → ABIERTO
SEC-04 (8 funciones)             ABIERTO → ABIERTO

IE                               ANTES → DESPUÉS v5.1
Calculators implementados        5/107 → 5/107 (sin cambio — v5.1 no tocó IE)
Ingestores                       2/9 → 2/9
Geo data rows                    0 → 0
Datos reales vs prueba           Prueba → Prueba
```

---

# CIERRE Y SIGUIENTES PASOS

## Fuentes primarias procesadas (28 archivos + código)
- ✅ 17 archivos .md de biblia v5 en `docs/biblia-v5/` (~560KB)
- ✅ 10 archivos .docx de Pulppo (convertidos con pandoc a /tmp/pulppo-md, leídos)
- ✅ 1 archivo .jsx dmx-dopamine-v2.jsx (landing pública, 939 líneas)
- ✅ CLAUDE.md del repo
- ✅ Git history (5 commits v5.1-S1 a v5.1-S5 + .gitignore)

## Verificaciones pendientes antes de ejecutar plan v2
1. `information_schema.tables` — confirmar 110 tablas + lista exacta
2. `information_schema.routines` — confirmar 64 funciones, extraer nombres
3. `information_schema.triggers` — confirmar 36 triggers
4. `pg_policies` — extraer las ~207 policies con usando/with_check
5. `lib/intelligence-engine/registry.ts` — confirmar 107 scores registrados
6. `vercel.json` — confirmar 19-20 crons activos
7. Uso de `profiles` directa en código (SEC-01 audit)

## Queda claro en este contexto
- DMX es Spatial Decision Intelligence, no marketplace.
- Los docx Pulppo son **tropicalización base** del CRM — DMX debe evolucionar más allá.
- El IE es el producto monetizable; el marketplace es el canal.
- El v5.1 cableó el frontend al backend, pero NO implementó scores, NO cerró SEC críticos, NO cargó datos reales.
- La Sesión 07 (sub-etapas 7.1-7.19, 245 upgrades) es el trabajo más voluminoso por delante.
- SEC-02 (trigger prevent_role_escalation) es el fix bloqueante más urgente.

## Decisión para plan v2 (Objetivo Secundario)
Queda pendiente:
1. Que Manu comparta el **plan v1** del chat anterior (15 fases).
2. Generar **plan v2** consolidado con este contexto, priorizando:
   - Cierre SEC críticos (SEC-02, SEC-04, SEC-01 audit)
   - Completar v5-S0 fundación (Tareas 2-10)
   - Auditar gap registry.ts vs 11 scores nuevos
   - Roadmap H1 (Sesión 07 sub-etapas 7.1-7.5 es el camino crítico)
   - DROP operaciones.lado con autorización
   - Actualizar CLAUDE.md (conteos BD)

---

**Fin del documento maestro.** 26 secciones, ~28 fuentes primarias consolidadas, sin inventar nada que no estuviera en biblia/docx/jsx/repo. Todo gap señalado explícitamente. BD real manda sobre cualquier mención en este doc.

---

## Addendum 2026-04-20 — Estado consolidado FASES 08+09+10 cerradas

**Tags creados:** `fase-08-complete` · `fase-09-complete` (mergeada main commit 6671aca) · `fase-10-complete` (branch fase-10/ie-scores-n2-n3-n4 sin push aún)

**Acumulado IE post FASE 10:**
- **81 calculators N0→N4** operativos (32+16+14+12+7) — cubre tier 1+2+3+4
- **AVM I01 MVP** "DMX Estimate" + endpoint /api/v1/estimate funcional con BotID
- **5 componentes UI Dopamine** (ConfidenceBadge, ScoreTransparencyPanel, ScoreRecommendationsCard, ScorePlaceholder, IntelligenceCard)
- **9+ migrations IE** acumuladas
- **14 crons** Vercel registrados (monitor Free plan limit al deploy)
- **18 endpoints nuevos** (admin + cron + v1 público)
- **Tests:** 1595 passing (vs 0 pre-FASE 08)
- **Cascadas formales:** 2 wire operativas (geo_data_updated × 9 sources + macro_updated)
- **D11+D33 wiring:** auto-recalc N1↔N0, N2↔N1, multi-tenant scoping enforcement

**ADRs nuevos post v5:**
- **ADR-019** STR Module Complete (FASE 07b)
- **ADR-020** MCP-First Integrations
- **ADR-021** Progressive Preference Discovery (PPD) + score_reactions L-18 dual purpose
- **ADR-022** Vibe Tags Híbrido AI+Data
- **ADR-023** Design System Refinement
- **ADR-025** Social + Listing Intelligence Layer (29 laterales L30-L58 + FASE 26 stub)
- **ADR-026** Global PropTech Benchmarks (65 items reference-only research)

**Pipeline laterales extendido:**
`docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` — 72 laterales L1-L72 + 16 cross-functions (CF-L1-8 local MX, CF-G1-8 global benchmarks).

**Empresas MX analizadas (web search 2026-04-20):**
- Metric Analysis (ValueChat WhatsApp IA — 2.7M appraisal records)
- Brandata (vocación predio + mapa interactivo demo gratis)
- DatAlpine (pricing tiered público $899-$1,199 USD/mes + econometría hedonic/Monte Carlo)
- Phiqus (multi-sector + visión artificial)
- Datoz (commercial RE 44 mercados + FIBRAs Barclays/Prologis/Vesta clientes)
- Tinsa México (25 años, Stima AVM EAA-endorsed, Pulso Inmobiliario trimestral)

**Empresas globales referenciadas (ADR-026):**
Reonomy · HouseCanary · Placer.ai · ATTOM · CoStar/LoopNet · Cherre · CompStak · Opendoor 2026 · Zillow AI Mode · Redfin · CBRE · JLL · Colliers · Newmark · Cushman & Wakefield

**Productos empaquetados** (`docs/08_PRODUCTOS/`):
- 22 productos catalogados por 9 personas (Developer, Broker, Comprador, Inversor, FIBRA/Fondo, Aseguradora, Banco, Gobierno, Valuador)
- 5 bundle strategies cross-product
- Pricing tiered: Free → Pro → Enterprise (positioning vs competidores documentado)

**Reglas operacionales nuevas (CLAUDE.md):**
- Lenguaje natural founder (no jerga técnica en upgrades)
- Upgrades directos + laterales pattern obligatorio
- Paralelización agresiva por defecto sin riesgo
- Hard stop contexto 92% único
- Git branch safety con worktree para PM paralelo (post-incident 2026-04-20)

---

## Addendum 2026-04-20 — AI Strategy (Constructor vs Runtime)

Distinción crítica para entender arquitectura DMX (post discusión founder Haiku vs Opus 2026-04-20):

### AI Constructor (quien escribe el código DMX)
- **Claude Opus 4.7 1M context** via Claude Code agent (sesiones founder Manu)
- Build-time: análisis arquitectónico, generación calculators, tests, migrations, docs
- Costo: incluido en suscripción Claude Max founder

### AI Runtime (DMX en producción para features end-user)
- **Claude Haiku 4.5** (default narrativas cortas)
  - Use cases: D32 score explanations (C04 Objection Killer), N5 short-form (FASE 12), tooltips, micro-content
  - Costo: ~$0.001 por narrativa (500 tokens output)
  - Ejemplo escala: 10,000 narrativas/mes ≈ $20/mes
- **Claude Sonnet 4.6** (medium complexity)
  - Use cases: futuro reportes B2B trimestrales (CF-G4 DMX Quarterly Market Intelligence), dossier inversión personalizado (S-C08), market narratives medium-form (S-E05)
  - Costo: ~$0.01 por document (3K tokens output)
- **Claude Opus 4.7** (high complexity)
  - Use cases: solo high-stakes con costo justificado — análisis estratégico institucional, due diligence reports complejos
  - Costo: ~$0.04 por document (3K tokens output)
- **Modelo selection per feature** vía methodology.ai_model field cuando methodology.ai_narrative=true

### Tooling AI runtime
- Anthropic SDK directo (no Vercel AI Gateway H1 — evaluación AI Gateway diferida H2 si justifica multi-provider fallback)
- Cost tracking via shared/lib/ingest/cost-tracker.ts integrado en runScore (D32 wire)
- Cache 24h por (score_id, entity_id, components_hash) — solo regen si inputs cambian >10%

### Política costos AI runtime
- Budget mensual default `IE_MONTHLY_BUDGET_USD=$100` (TODO #20 CONTRATO §8)
- Hard cap pre-cascade: F4 cost guard rails (FASE 08) bloquea cascadas que excedan 10% budget remaining
- Alert PostHog: `ie.cascade.budget_exceeded` cuando >80% consumido

### Aclaración founder 2026-04-20
"Constructor" (CC sesiones) vs "Runtime" (DMX producción) son AI separados. Founder ve Opus en terminal porque está construyendo, pero el sistema construido (DMX) usa Haiku/Sonnet/Opus per feature según costo-beneficio.

### Correcciones menciones previas incorrectas
- Allegra / Hawah omitidas de ADR-025 — no aparecen como major players MX en web search 2026-04-20 (solo las 6 empresas MX listadas arriba son referencias válidas).

### Upgrades directos propuestos pendientes founder approval (TODO #24 CONTRATO §8)
D12, D15, D17, D20, D22, D23, D26, D27, D28 — 9 upgrades adicionales derivados de research competitivo. NO integrados a FASE 10 scope actual (session split 2026-04-20). Evaluación pendiente post FASE 11.

---

## Addendum 2026-04-21 — FASE 11 XL Moonshot Expansion

Tras conversación extensiva con founder 2026-04-21 se aprueba **FASE 11 XL**: expansión de FASE 11 de 7 índices (12h originales) a **15 índices + 10 moonshots core + preview UX 4 personas + 25 bloques + ~90h** con paralelización agresiva. E2E connectedness completo (BD + seguridad + UI + endpoints 100%). Esta expansión redefine posicionamiento DMX de "proptech LATAM" a **"DMX Urban OS — infraestructura de decisión de vida urbana LATAM"**.

### Resumen decisión founder

- **De:** 7 índices propietarios con publicación mensual DMX-MOM + trimestral (~12h, 3 sesiones CC).
- **A:** 15 índices + 10 moonshots FULL/SEED + preview UX 4 personas + Widget Embebible + Time Machine API + Scorecard Nacional ampliado + Press Kit Auto + Alert Radar WhatsApp + Stickers descargables (~90h, 10-12 sesiones CC con paralelización agresiva).
- **Rationale:** positioning DMX Urban OS valuation comp Stripe/Shopify/Cloudflare ($20-100B vs proptech comp $1-5B). El diferencial no es "índices inmobiliarios"; es **infraestructura de decisión de vida urbana** que otros portales/fintechs/apps consumen vía API + widget + WhatsApp bot.

### Los 15 índices DMX (expansión de 7)

| Código | Nombre | Status FASE 11 XL |
|--------|--------|-------------------|
| DMX-IPV | Índice Precio-Valor | Original (mantiene) |
| DMX-IAB | Índice Absorción Benchmark | Original (mantiene) |
| DMX-IDS | Índice Desarrollo Social Integrado | Original (mantiene) |
| DMX-IRE | Índice Riesgo Estructural | Original (mantiene) |
| DMX-ICO | Índice Costo Oportunidad | Original (mantiene) |
| DMX-MOM | Momentum Index | Original (mantiene) |
| DMX-LIV | Livability Index | Original (mantiene) |
| **DMX-FAM** | Índice Familia (schools + safety + parks + pediatric) | NUEVO v5.1 XL |
| **DMX-YNG** | Índice Jóvenes Profesionistas (nightlife + coworking + gym + commute) | NUEVO v5.1 XL |
| **DMX-GRN** | Índice Green / Sustainability (AQI + green_space + bikeability + solar) | NUEVO v5.1 XL |
| **DMX-STR** | Índice STR Viability (AirROI yield + regulación + demand) | NUEVO v5.1 XL |
| **DMX-INV** | Índice Investment Grade (yield + risk + liquidez) | NUEVO v5.1 XL |
| **DMX-DEV** | Índice Developer Feasibility (land + permits + absorción + TIR) | NUEVO v5.1 XL |
| **DMX-GNT** | Índice Gentrification Velocity (delta IPV 12m + displacement + new_businesses) | NUEVO v5.1 XL |
| **DMX-STA** | Índice Stability (volatility scores + tenure + occupancy) | NUEVO v5.1 XL |

**Pesos propuestos FAM/YNG/GRN/STR/INV/DEV/GNT/STA:** [CONFIRMAR FOUNDER POST-FASE 11.A] — pesos preliminares documentados en `FASE_11_IE_INDICES_DMX.md` BLOQUE 11.B expandido.

### Moonshots FULL / SEED / DIFERIDO

**FULL implementados FASE 11 XL:**
1. **Causal Engine** — base explicativa "por qué Narvarte subió +18%" (movido de FASE 12 → FASE 11).
2. **Pulse Score** — score compuesto diario de heat de ciudad.
3. **Migration Flow v1** — flujo migración inter-colonia (origen → destino) con historical_snapshots.
4. **Trend Genome + Influencer Heat** — pre-mediática radar con Instagram scraping vía Apify (ADR-027).
5. **Scorecard Nacional Trimestral ampliado** — 15 índices ranking nacional + PDF público branded.
6. **Widget Embebible** — script JS embeddable para portales inmobiliarios terceros con score zona + link DMX.
7. **Time Machine API** — `/api/v1/time-machine?zone_id=X&date=2022-03` retorna snapshot histórico.
8. **Ghost Zones** — detección colonias con caída sostenida >30% demand 6m+ (alerta B2B).
9. **Alert Radar WhatsApp** — usuarios suscriben colonias, WA notifies en eventos significativos.
10. **DNA Migration + Historical Forensics + Living Metropolitan Networks + Zone Certification Integration** — suite de moonshots dependientes (detallados en FASE_11_IE_INDICES_DMX.md BLOQUES 11.R-11.Y).

**SEED (estructura + subset funcional, se extiende en fases dedicadas):**
- Genoma Colonias SEED (pgvector 64-dim — ADR-027)
- Futures Curve SEED (proyección N11 a 12m)
- LifePath SEED (destino vital predictivo persona → zona fit)
- Climate Twin SEED (proyección 15y clima por zona, extensión FASE 32)
- Zone Constellations SEED (clusters dinámicos colonias)
- Living Atlas SEED (mapa 4D vivo, base para FASE 32 Digital Twin)
- Stickers Descargables (seed generación stickers sociales compartibles)

**DIFERIDOS a fases posteriores:**
- Digital Twin 3D completo → FASE 32
- Flux Capacitor (simulador what-if multi-dim) → FASE 32
- Habitat OS completo → FASE 20 + 29
- Urban OS visión completa → FASE 29
- API pública cobrable → FASE 23 (monetización + pricing tier)
- Índices × WhatsApp bot completo → FASE 22
- Índices × Listings badge en cards → FASE 21
- Índices × CRM Asesor → FASE 13
- Metaverso Colonias → FASE 32 + 20

### Quitados por decisión founder (2026-04-21)

- **Mood Index** — demasiado subjetivo, sin input data confiable H1.
- **Biorítmo** — jerga esotérica, no defiende moat.
- **Alpha Zone Hunter aislado** — se absorbe en Trend Genome (redundante como moonshot separado).
- **Zone Soul Profile** — solapa con Genoma Colonias, se reemplaza por pgvector embeddings.
- **Mercado Predicciones** (marketplace apuestas sobre zonas) — riesgo regulatorio CNBV + poca claridad valor.
- **ETF/Fondo** (producto financiero estructurado por índices DMX) — diferir H3 + requiere licencia CNBV (mismo perímetro GC-15 Fractional Investing).

### Nuevo posicionamiento: DMX Urban OS

**Narrativa:** "DMX Urban OS — infraestructura de decisión de vida urbana LATAM".

**Valuación comp:**
- **Sector comparables (infraestructura decisión vida urbana):** Stripe $95B, Shopify $100B, Cloudflare $30B (rango $20-100B TAM multi-sector).
- **Proptech LATAM comp actual:** Habi $1B, QuintoAndar $5B, Loft $2.4B (rango $1-5B TAM single-sector inmobiliario).
- **Delta valuation:** 10-20× si se ejecuta posicionamiento Urban OS vs proptech tradicional.

### Nuevas tablas BD creadas FASE 11 XL (16)

1. `dmx_indices` (ya existe FASE 01, CHECK expandido a 15 códigos)
2. `ie_index_methodology_versions` (ADR-027)
3. `influencer_heat_zones` (ADR-027 Apify)
4. `colonia_genome_embeddings` (ADR-027 pgvector)
5. `causal_engine_explanations` (rationale AI-generated por score change)
6. `pulse_score_daily` (heat compuesto ciudad)
7. `migration_flow_edges` (origen → destino colonias)
8. `time_machine_snapshots` (snapshots históricos particionados pg_partman)
9. `widget_embed_tokens` (auth tokens widget embebible)
10. `whatsapp_alert_subscriptions` (opt-in notifs WhatsApp)
11. `ghost_zones_alerts` (caída demand sostenida)
12. `dna_migration_journeys` (journeys comprador multi-zona)
13. `historical_forensics_cases` (PDF educativos ciclos pasados)
14. `zone_constellations_clusters` (clusters dinámicos semanales)
15. `lifepath_destiny_predictions` (predicciones vida → zona)
16. `climate_twin_projections_15y` (proyecciones clima SEED)

### Impacto en roadmap fases 12-38

Los **SEEDs en FASE 11 XL se extienden en fases dedicadas posteriores:**

| SEED FASE 11 XL | Extensión posterior | Fase target |
|------------------|---------------------|-------------|
| Genoma Colonias SEED | Full Genoma Multi-País + búsqueda por vibe completa | FASE 20 + 38 |
| Futures Curve SEED | Forecasting ML gradient boosting | FASE 12 + H2 |
| LifePath SEED | PPD integration + wizard 4 capas | FASE 20 PPD BLOQUE 20.L |
| Climate Twin SEED | Digital Twin 4D completo con clima | FASE 32 |
| Zone Constellations SEED | Clustering dinámico + UI interactiva | FASE 20 + 21 |
| Living Atlas SEED | Mapa 4D Mapbox + temporal slider | FASE 32 |
| Widget Embebible (FULL) | Monetización paid tier + pricing | FASE 23 |
| Alert Radar WhatsApp (FULL) | Pipeline completo WA bot conversacional | FASE 22 |
| Trend Genome + Influencer (FULL) | Corpus labeled ML feature engineering | FASE 12 |
| Scorecard Nacional (FULL) | Expansion multi-país LATAM + Latinx US | FASE 38 |

### Commits guideline FASE 11 XL

- **Convención commits:** `fase-11/bloque-XX.Y.Z: descripción` (ej. `fase-11/bloque-11.H.2: Apify ingestor influencer heat`).
- **Tag al cerrar:** `fase-11-complete` único tag al final de los 25 bloques.
- **Branch:** `fase-11/ie-indices-dmx-xl` (alineado con git branch safety post-incident 2026-04-20).
- **Verificación cierre:** 25 bloques + audit:rls STRICT + audit:e2e + Playwright smoke + tests ≥2000 passing + registry count +15 índices.

### Referencias cruzadas

- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-027_FASE_11_XL_METODOLOGIA_INDICES.md` (3 decisiones arquitectónicas)
- `docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md` (plan operativo 25 bloques)
- `docs/05_OPERACIONAL/CONTRATO_EJECUCION.md` §8 TODOs #27-#36
- `docs/07_GAME_CHANGERS/07.0_INDICE.md` GC-NEW-1 a GC-NEW-10
- `docs/07_GAME_CHANGERS/07.4_MOAT_STRATEGY.md` §Moats FASE 11 XL

---

## Addendum 2026-04-23 — BLOQUES 11.M+11.N shipped + fix incident migrations 11.J

**Shipped (main SHA aa0334b, PR #26):**

- **BLOQUE 11.M — Genoma de Colonias SEED.** Búsqueda vectorial pgvector 64-dim + 10 vibe tags H1 canónicos (reemplazables LLM v1 vía ADR-022). UI `/indices/[code]/similares` + API pública `/api/v1/similar/[coloniaId]` real (stub 11.L.4.4 reemplazado). REUSO `colonia_dna_vectors` (XL 11.A) — no se creó `colonia_embeddings` nueva (zero dual source of truth). 2 tablas nuevas: `vibe_tags` + `colonia_vibe_tags`.
- **BLOQUE 11.N — Futures Curve SEED + Pulse Pronóstico 30d (L93).** Forward curve 3/6/12/24m con banda CI 95% explícita (ALTER `futures_curve_projections` +8 columnas `_lower`/`_upper`). Nueva tabla `pulse_forecasts` con forecast daily 30d. UI `/indices/[code]/futuros` Recharts + export CSV nativo Blob. Cross-function: VitalSigns forecast prop (11.F) + Newsletter `futures_section` (11.J).

**Incident resuelto 2026-04-23 — migrations 11.J ausentes en Supabase cloud.** PR #23 (FASE 11 bloques F-J, mergeado ~2 semanas antes) incluyó migration files en repo pero GitHub Actions nunca ejecutó `supabase db push`. Las tablas `newsletter_subscribers`, `newsletter_deliveries`, `zone_streaks`, `newsletter_ab_tests`, `dmx_wrapped_snapshots` quedaron declaradas sin existir físicamente en prod. Resuelto en mismo PR #26 aplicando 9 migrations pendientes vía `supabase db push --linked` manual + reconcile history (repair 6 timestamps duplicados pre-existentes) + regen types. Regla canonizada: **tras cada merge con migrations, ejecutar `supabase db push --linked` manual desde terminal — GHA no lo hace.**

**Progreso FASE 11 XL:** 14/27 bloques completados (52%). Restantes: 11.O LifePath, 11.P Climate Twin, 11.Q Ghost Zones, 11.R Constellations, 11.S Living Atlas, 11.T Alert Radar WhatsApp, 11.U Stickers, 11.V DNA Migration, 11.W Historical Forensics, 11.X Living Metropolitan Networks, 11.Y Zone Certification, 11.Z E2E Verification + tag.

**Catálogos actualizados:** 03.1 §18 (3 tablas nuevas + ALTER) · 03.8 append (3 scores agregados: GENOME_SIMILARITY, FUTURES_CURVE, PULSE_FORECAST_30D) · 03.13 append (8 cross-functions CF-11.M/N) · 03.15 lineage diagrams · 08.1 FI-076..FI-084 (437 total) · 08.3 productos 10.16/10.17/10.18 (40 total).

**Laterales agendados (L131-L137):** Genoma multi-país → FASE 38 · Vibe tags LLM v1 → FASE 12 N5 · Genoma proyectos → FASE 15 · Derivatives-like futures → FASE 36 · ML regression LSTM/ARIMA → FASE 12 N5 · Bloomberg terminal UI premium → FASE 22 · Tabla zones canónica → FASE 13.

---
