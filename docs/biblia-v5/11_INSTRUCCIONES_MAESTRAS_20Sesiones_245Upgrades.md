# BIBLIA DMX v5 — ROADMAP COMPLETO
## Instrucciones Maestras: 20 Sesiones + Etapa 0 + 245 Upgrades
## Contenido ÍNTEGRO de INSTRUCCIONES_MAESTRAS_DMX_v3
## Fase: Referencia permanente para todas las fases
---
# INSTRUCCIONES MAESTRAS — DesarrollosMX v8
## 20 Sesiones + Etapa 0 Arquitectura + 245 Upgrades
## Documento Unificado v3 — Abril 2026

---

# CONTEXTO GLOBAL (copiar al inicio de CADA sesión)

```
Soy Manu, founder de DesarrollosMX v8. No estamos construyendo un marketplace.
Estamos construyendo el SISTEMA OPERATIVO DE INTELIGENCIA URBANA DE MÉXICO.

El marketplace es el canal de distribución. El IE es el producto.
Los datos temporales acumulados son el moat.
Cada persona que interactúa genera inteligencia.

Repo:       git@github.com:manuia88/desarrollosmx-v8final.git
Branch:     main
Supabase:   kcxnjdzichxixukfnenm
Ubicación:  /Users/manuelacosta/Desktop/desarrollosmx-v8final
Stack:      Next.js 16, TypeScript strict, Tailwind v4, tRPC 11, Supabase, Mapbox GL JS
            React 19, Zod 4, Sharp, Recharts, PostHog, OpenAI SDK, Anthropic SDK, cmdk

REGLAS:
1. Verificar repo primero: pwd + git remote -v + git log --oneline -5 + git status
2. Verificar columnas reales con information_schema antes de escribir SQL
3. UNA instrucción a la vez. NO dar 2 si la segunda depende de la primera
4. Si algo no coincide → PARAR y diagnosticar
5. SQL en Supabase SQL Editor. Passwords solo en terminal directa
6. Si success → avanzar. POST-SPRINT valida todo
7. Reportes extensos. Feedback honesto. Nunca sugerir que pare
8. Backups: git tag antes de cada sprint
9. Archivos protegidos: middleware.ts, lib/supabase/*.ts
10. ETAPA 0 es obligatoria antes de cualquier nueva construcción masiva
```

---

# MAPA COMPLETO — 20 SESIONES + ETAPA 0

```
SESIÓN │ SPRINT     │ CONTENIDO                                        │ STATUS
───────┼────────────┼──────────────────────────────────────────────────┼──────────
  01   │ R0-v4      │ DB + Security + Bugs + 8 Tablas nuevas          │ ✅ DONE
  02   │ R1a        │ Dashboard Asesor + Contactos + Gamification     │ ✅ DONE
  03   │ R1b        │ Pipeline Búsquedas Kanban 6+1                   │ ✅ DONE
  04   │ R1c        │ Captaciones + Props Secundarias + ACM           │ ✅ DONE
  05   │ R1d        │ Tareas + Operaciones + Cierres + Métricas       │ ✅ DONE
  06   │ IE-1       │ IE Arquitectura + 77 Upgrades + Auditoría E2E  │ ✅ DONE
───────┼────────────┼──────────────────────────────────────────────────┼──────────
  E0   │ ETAPA 0    │ Auditoría Profunda + Mapa Arquitectura 245     │ ← SIGUIENTE
───────┼────────────┼──────────────────────────────────────────────────┼──────────
  07   │ IE-2       │ Ingesta Real + Catastro + Mapa Inteligente     │ pendiente
  08   │ IE-3       │ Scores Nivel 0 (21) + AVM MVP                  │ pendiente
  09   │ IE-4       │ Scores Nivel 1 (16) + Intelligence Cards       │ pendiente
  10   │ IE-5       │ 11 Scores Nuevos N01-N11 + Cross-References    │ pendiente
  11   │ IE-6       │ Scores Nivel 2 (14) + Cascadas Live            │ pendiente
  12   │ IE-7       │ Scores Nivel 3-4 (19) + 7 Índices DMX         │ pendiente
  13   │ IE-8       │ Nivel 5 AI (26) + Productos Licenciables      │ pendiente
  14   │ R2         │ Dev Core + Analytics IE                        │ pendiente
  15   │ R3         │ Document Intelligence Pipeline                 │ pendiente
  16   │ R4         │ Legal + Pagos + Inbox + Calendario             │ pendiente
  17   │ R6-R7      │ Marketing + WhatsApp + Notificaciones          │ pendiente
  18   │ R8         │ Portal Comprador + Features Transversales      │ pendiente
  19   │ R9         │ Admin + Stripe + API Externa + Productos       │ pendiente
  20   │ R10+POST   │ Crons + Mobile + DR + Tests + Verificación     │ pendiente
```

---

# SESIONES COMPLETADAS (1-6) — RESUMEN

## SESIÓN 01 — R0-v4: DB + Security ✅
```
Tag: restructure-r0-v4
Resultado: 3 bugs fixed, 8 tablas nuevas, 160 RLS policies, build limpio
Cubre: BE1 §1-2, BE2 §3
```

## SESIÓN 02 — R1a: Dashboard + Contactos ✅
```
Tag: restructure-r1a-v4
Resultado: Dashboard asesor, contactos CRM, gamification, tRPC asesorCRM + gamification
Cubre: FE1 §4.1-4.2, BE2 §4.3-4.4
```

## SESIÓN 03 — R1b: Pipeline Búsquedas ✅
```
Tag: restructure-r1b-v4
Resultado: Kanban 6+1, validaciones por etapa, lead score badges
Cubre: FE1 §4.3
```

## SESIÓN 04 — R1c: Captaciones + ACM ✅
```
Tag: restructure-r1c-v4
Resultado: Captaciones kanban, props secundarias, ACM, inventario 4 tabs
Cubre: FE1 §4.4-4.5, BE1 §2.2
```

## SESIÓN 05 — R1d: Tareas + Operaciones + Métricas ✅
```
Tag: restructure-r1d-v4 / restructure-r1d-final
Commit: 8ae00d4
Resultado: 8 archivos nuevos, 20 modificados, 9 funciones SQL, 7 bugs fixeados
  Morning Briefing, matching búsqueda↔inventario, auto-tasks, pipeline health,
  payment tracker, document checklist, command palette, asesor scorecard público
Cubre: FE1 §4.6-4.10
```

## SESIÓN 06 — IE-1: Arquitectura + 77 Upgrades + Auditoría ✅
```
Tags: ie-sprint-1-v4, ie-sprint-1-v4-final, ie-sprint-1-complete, 
      ie-sprint-1-audit-complete, ie-sprint-1-final
Commit final: 1af3048
Resultado: ~140 archivos, ~15,000+ LOC
  Intelligence Engine: 69 archivos, 9,126 LOC
  Quality Module: 11 archivos, 654 LOC  
  Growth Engine: 18 archivos, 1,329 LOC
  Tracking Module: 4 archivos, 238 LOC
  Portal IE Components: 14 montados (100%)
  Public IE Components: 10 montados (100%)
  API routes: ~25 endpoints
  Crons: 19 funcionales + 4 stubs
  tRPC intelligence router: 7 procedures
  Tracking events: 14/14 (100%)
  Cascades: 9/9 (100%)
  3 DB triggers (unit_sold, price_changed, feedback)
  Schema validator integrado en geo-loader
  Confidence degrader integrado en runner
Cubre: IE1 §1-3, IE5 §11, + 77 upgrades adicionales
```

---

# ETAPA 0: AUDITORÍA PROFUNDA + MAPA DE ARQUITECTURA

```
OBLIGATORIA ANTES DE SESIÓN 07.
Produce: DMX_DATA_ARCHITECTURE_245.md
Sin este documento, NO se construyen los 245 upgrades.
```

## Instrucciones Etapa 0

### PARTE A: Auditoría completa del repo

```
A1. TODAS las tablas BD con columnas, tipos, FKs, conteos
A2. TODAS las funciones SQL con lógica
A3. TODOS los triggers
A4. TODOS los índices
A5. TODAS las RLS policies
A6. TODO el código IE (funciones exportadas, LOC, estructura)
A7. TODAS las API routes (path, método, LOC)
A8. TODOS los tRPC routers con procedures
A9. FLUJOS DE DATOS: para cada tabla IE, quién escribe y quién lee
```

### PARTE B: Mapa de conexiones 245 upgrades

```
B1. Tablas NUEVAS necesarias (con CREATE TABLE propuesto)
B2. Columnas NUEVAS en tablas existentes (con ALTER propuesto)
B3. FLUJOS DE DATOS nuevos (fuente → proceso → destino → UI)
B4. Tablas COMPARTIDAS vs EXCLUSIVAS (con contratos de datos)
B5. CASCADAS de actualización (cuando X cambia → qué se recalcula)
B6. CONTRATOS DE DATOS por tabla compartida
B7. API CONTRACTS por endpoint
```

### PARTE C: Documento de arquitectura

```
Producir DMX_DATA_ARCHITECTURE_245.md con:
1. Inventario completo de tablas actuales
2. Tablas nuevas propuestas
3. ALTERs a tablas existentes
4. Mapa visual de flujos (ASCII)
5. Tabla de cascadas
6. Contratos de datos
7. API contracts
8. Dependencias entre upgrades
9. Riesgos identificados
10. Recomendaciones de índices
```

---

# SESIÓN 07 — IE-2: Ingesta Real + Catastro + Mapa Inteligente

```
Tag anterior: ie-sprint-1-audit-complete
Tag objetivo: ie-sprint-2-complete
Subir: SESION_07 instrucciones + Análisis Habi + IE1 + IE4 + BE2
Prerequisito: ETAPA 0 completada (DMX_DATA_ARCHITECTURE_245.md producido)
```

### 245 UPGRADES DISTRIBUIDOS EN 19 SUB-ETAPAS:

#### SUB-ETAPA 7.1: Ingesta Real DENUE + FGJ [6 upgrades]
```
UPG 1-6: Test DENUE → Ingesta 16 alcaldías → Validar calidad
         Test FGJ → Ingesta 12 meses → Validar calidad
Resultado: geo_data_points ~200K DENUE + ~50K FGJ
```

#### SUB-ETAPA 7.2: Catastro + Uso de Suelo [7 upgrades]
```
UPG 7-13: Descargar catastro sig.cdmx.gob.mx → catastro.ts funcional
          uso-suelo.ts funcional → Jerarquía INEGI id_mz 16 dígitos
          Relación predio→unidades → OVICA on-demand → Snapshots trimestrales
Resultado: ~500K cuentas catastrales (5 alcaldías MVP)
```

#### SUB-ETAPA 7.3: 5 Stubs Geo → Funcionales [7 upgrades]
```
UPG 14-20: GTFS (Metro+Metrobús), SIGED (escuelas), DGIS (salud),
           Atlas Riesgos (sísmica), SACMEX (agua)
           Polígonos colonias + manzanas INEGI → GeoJSON
Resultado: 7/7 fuentes geo con datos reales
```

#### SUB-ETAPA 7.4: Cross-References [9 upgrades]
```
UPG 21-29: Catastro × DENUE × FGJ × SIGED × DGIS × GTFS × SACMEX × Atlas
           Temporal cross: Δ(catastro) × Δ(DENUE) × Δ(FGJ)
Resultado: IP propietaria — cruces que nadie más tiene
```

#### SUB-ETAPA 7.5: Pre-Calculators con Datos Reales [9 upgrades]
```
UPG 30-38: Ecosystem, Crime, Supply-Demand, Price Intel, Completeness,
           Gentrification, Own-data pipeline, Market Pulse, Rankings
Resultado: zone_scores llenos con datos reales para 16 zonas
```

#### SUB-ETAPA 7.6: AVM Mexicano MVP [8 upgrades]
```
UPG 39-46: Regression base → +ecosystem → +crime → +transit → +schools
           Confidence interval → Calibración → Valorización histórica
Resultado: I01 DMX Estimate funcional
```

#### SUB-ETAPA 7.7: Intelligence Cards [9 upgrades]
```
UPG 47-55: Cards por predio/manzana/colonia/alcaldía
           Comparador predios, Risk report, Investment report
           Frontend component
Resultado: GET /api/v1/intelligence-card funcional
```

#### SUB-ETAPA 7.8: Mapa Inteligente [13 upgrades]
```
UPG 56-68: 7 capas Mapbox (catastro, DENUE, FGJ, GTFS, scores, desarrollos, demanda)
           Toggle capas, LOD por zoom, click→Intelligence Card
           Sidebar stats, street-level intelligence
Resultado: El mapa que nadie tiene — catastro + desarrollos + IE
```

#### SUB-ETAPA 7.9: Herramientas Asesor con Datos Reales [12 upgrades]
```
UPG 69-80: Búsqueda catastral, valuación instantánea, comparables reales,
           plusvalía DMX, dossier predio, alert catastral, argumentario real,
           objeción killer real, urgency real, post-visita real, lead priority, ACM real
Resultado: El asesor ve inteligencia REAL en cada acción
```

#### SUB-ETAPA 7.10: Developer Intelligence con Datos Reales [9 upgrades]
```
UPG 81-89: Demand heatmap real, pricing advisor real, competitive real,
           benchmark real, feasibility real, buscador terrenos,
           análisis manzana, detector oportunidades, proyección absorción
Resultado: El desarrollador toma decisiones con datos verificados
```

#### SUB-ETAPA 7.11: Buyer Experience con Datos Reales [9 upgrades]
```
UPG 90-98: Ficha con scores reales, AVM vs precio, momentum real,
           risk real, nearby real, buy vs rent, comparador real,
           affordability real, mapa público IE
Resultado: El comprador decide con información real
```

#### SUB-ETAPA 7.12: API & B2B [12 upgrades]
```
UPG 99-110: API completa, bulk, valuación bancos, risk aseguradoras,
            site selection retailers, rate limiting, docs, dashboard,
            sandbox, webhooks, batch processing, widget embeddable
Resultado: Productos licenciables B2B funcionales
```

#### SUB-ETAPA 7.13: Gobierno & Notarías [12 upgrades]
```
UPG 111-122: Observatorio urbano, predicción servicios, construcción informal,
             policy impact simulator, atlas dinámico, credit scoring geo,
             insurance score, due diligence, valor escrituración,
             certificado zona, microcréditos, token valuation
Resultado: Nuevos mercados abiertos
```

#### SUB-ETAPA 7.14: Movilidad & Retail [10 upgrades]
```
UPG 123-132: Demand prediction delivery, route seguridad, site selection,
             competitive SCIAN, trade area, yield renta, feasibility auto,
             predictive maintenance, digital twin
Resultado: Productos para ecosistema indirecto
```

#### SUB-ETAPA 7.15: Growth & Contenido [18 upgrades]
```
UPG 133-150: Mapa público, rankings, estado mercado, alertas,
             API playground, índice DMX, API academia, data journalism,
             wallet patrimonio, self-optimizing, predictive zoning,
             urban genome, DMX OS, shareable, weekly wins, achievements, NPS
Resultado: Growth engine + contenido viralizable
```

#### SUB-ETAPA 7.16: Fintech & Proptech [15 upgrades]
```
UPG 151-165: Property verification, developer trust, asesor verification,
             buyer fraud, AML flag, property enrichment API,
             contact enrichment, developer enrichment, zone batch,
             broker enrichment, zone sentiment, dev reputation monitoring,
             market buzz, news monitor, competitor monitoring
Resultado: Verificación + enriquecimiento + escucha social
```

#### SUB-ETAPA 7.17: People Intelligence [55 upgrades]
```
UPG 166-225: 
  IDENTITY: Buyer DNA, Asesor DNA, Developer DNA, Household, Life stage
  MATCHING: Neural matching, Asesor-buyer, Dev-broker, Network, Influence
  BEHAVIORAL: Decision fatigue, FOMO real, Loss aversion, Anchoring, Social proof
  REPUTATION: Rating público, Timeline, Verified badge, Reviews, Disputes
  PREDICTIVE: Readiness, Churn avanzado, Next move, Market timing, Career
  PERSONALIZATION: Homepage, Notifs, Email, Pricing display, Adaptive UX
  COMMUNITY: Zona feed, Knowledge sharing, Social proof, Co-investment, Team intel
  DATA SERVICE: Enrichment API, Batch, Monitoring, Custom reports, White-label
  WORKFLOW: Lead scoring auto, Auto-pricing, Smart notifs, Auto-captación, Auto-followup
  ECOSISTEMA: Mudanzas, Servicios hogar, Recruiting, Benchmarking, Insurance
  GLOBAL: Multi-city, LATAM, Cross-border, Academic, Government contracts
Resultado: Cada persona mejora el sistema + el sistema mejora a cada persona
```

#### SUB-ETAPA 7.18: Interacción Activa [10 upgrades]
```
UPG 226-235: NLP WhatsApp, Voice of customer, Question intelligence,
             Negotiation intelligence, Objection mapping zona,
             Preference revelation, Emotional journey, Coaching signals,
             Trust building signals, Decision acceleration
Resultado: DMX extrae inteligencia de cada interacción humana
```

#### SUB-ETAPA 7.19: Market Memory & DMX Agente [10 upgrades]
```
UPG 236-245: Market memory, Pattern library, Collective intelligence,
             Urban narrative, Feedback loops realidad,
             DMX co-pilot asesor, DMX advisor comprador,
             DMX strategist desarrollador, Proactive intelligence,
             Scenario simulator
Resultado: DMX como agente inteligente que observa, aprende, predice, actúa
```

---

# SESIÓN 08 — IE-3: Scores Nivel 0 (21 calculators formales)
```
Tag: ie-scores-nivel0-v4
Subir: IE2
Prerequisito: Sesión 07 completada (datos reales en BD)

21 calculators formales con E2E completo:
  F01 Safety, F02 Transit, F03 Ecosystem, F04 Air, F05 Water, F06 Land Use, F07 Predial
  H01 Schools, H02 Health, H03 Seismic, H04 Credit, H06 City, H08 Heritage, H09 Commute
  H10 Water Crisis, H11 Infonavit, A01 Affordability, A03 Migration, A04 Arbitrage
  B12 Cost Tracker, D07 STR/LTR

Para cada uno: IE2 §4.x tiene lógica completa end-to-end (13 pasos)
Cubre: IE2 §4 completo
```

# SESIÓN 09 — IE-4: Scores Nivel 1 (16 calculators)
```
Tag: ie-scores-nivel1-v4
Subir: IE2

16 calculators que dependen de Nivel 0:
  F08 Life Quality, F12 Risk Map, H07 Environmental
  A02 Investment, A05 TCO, A06 Neighborhood, A12 Price Fairness
  B01 Demand, B02 Margin, B04 PMF, B07 Competitive
  B08 Absorption, D05 Gentrification, D06 Affordability Crisis
  H05 Trust, H14 Buyer Persona

Cubre: IE2 §5 completo
```

# SESIÓN 10 — IE-5: 11 Scores Nuevos N01-N11
```
Tag: ie-scores-nuevos-v4
Subir: IE4

Los 11 scores que son la ventaja competitiva central:
  N01 Ecosystem Diversity (Shannon-Wiener)
  N02 Employment Accessibility
  N03 Gentrification Velocity (requiere ≥2 snapshots)
  N04 Crime Trajectory
  N05 Infrastructure Resilience
  N06 School Premium
  N07 Water Security
  N08 Walkability MX
  N09 Nightlife Economy
  N10 Senior Livability
  N11 DMX Momentum Index

Cubre: IE4 §9.1-9.11 completo
```

# SESIÓN 11 — IE-6: Scores Nivel 2 (14) + Cascadas Live
```
Tag: ie-scores-nivel2-v4
Subir: IE3 + IE5

14 calculators Nivel 2 + verificar 9 cascadas live:
  F09 Value, F10 Gentrification 2.0, B03 Pricing Autopilot
  B05 Market Cycle, B09 Cash Flow, B10 Unit Revenue
  B13 Amenity ROI, B14 Buyer Persona Proyecto, B15 Launch Timing
  C01 Lead Score, C03 Matching, D03 Supply Pipeline
  H12 Zona Oportunidad, H16 Neighborhood Evolution

Cubre: IE3 §6, IE5 §11 cascadas
```

# SESIÓN 12 — IE-7: Scores Nivel 3-4 (19) + 7 Índices DMX
```
Tag: ie-scores-nivel3-4-indices-v4
Subir: IE3 + IE4§10

12 Nivel 3 + 7 Nivel 4 + 7 Índices DMX:
  Nivel 3: A07-A11, B06, B11, C04, C06, D04, H13, H15
  Nivel 4: E01 (DMX Score), G01, E02-E04, D09, D02
  Índices: DMX-IPV, DMX-IAB, DMX-IDS, DMX-IRE, DMX-ICO, DMX-MOM, DMX-LIV

Cubre: IE3 §7-8.1, IE4 §10
```

# SESIÓN 13 — IE-8: Nivel 5 AI (26) + Productos Licenciables
```
Tag: ie-ai-products-v4
Subir: IE3 + IE5

26 scores AI + DMX Estimate + 7 productos API:
  Asesor: C02, C05, C08
  Agregados: E05-E08
  Full Score: G02-G05
  Mercado: D01, D08, D10
  Zona: F11, F13-F17
  Productos: I01-I06

Cubre: IE3 §8.2, IE5 §12-13
```

# SESIÓN 14 — R2: Dev Core + Analytics IE
```
Tag: restructure-r2-v4
Subir: FE1 + BE3

R2a-R2d: Dashboard dev, inventario, canal distribución, competitive intel + analytics
Cubre: FE1 dev refs, BE3 §7.2 R2
```

# SESIÓN 15 — R3: Document Intelligence Pipeline
```
Tag: restructure-r3-v4
Subir: BE3

R3a-R3e: Pipeline AI, extracción listas, onboarding, drive monitor, photo classification
Cubre: BE3 §7.2 R3
```

# SESIÓN 16 — R4: Legal + Pagos + Inbox + Calendario
```
Tag: restructure-r4-v4
Subir: BE3

R4a-R4d: Checklist docs, apartado Stripe, inbox unificado, calendarios + feedback
Cubre: BE3 §7.2 R4
```

# SESIÓN 17 — R6-R7: Marketing + WhatsApp + Notificaciones
```
Tag: restructure-r7-v4
Subir: FE1 + FE2 + BE2 + BE3

R6: Landing pages + auto-generación piezas + kit ventas con IE
R7: 20 tipos notificación + webhooks + soft delete + cross-portal + Discover Weekly
Cubre: FE2 §6.2+6.5+6.6, BE3 §6.1-6.6
```

# SESIÓN 18 — R8: Portal Comprador + Features Transversales
```
Tag: restructure-r8-v4
Subir: FE2 + IE3

Portal Comprador: Dashboard, Lifestyle Match, TCO, Investment Sim, Patrimonio,
  Comparador, Timing, Watchlist, Risk Score
Features: Homepage personalizada, Discover Weekly, DMX Wrapped, Gamification, Academia
Cubre: FE2 §5.3+6.1-6.4+6.7
```

# SESIÓN 19 — R9: Admin + Stripe + API Externa + Productos
```
Tag: restructure-r9-complete
Subir: BE1 + BE2 + BE3 + IE5 + FE2

R9a: Admin AARRR + Observatory + Anomaly + API Metrics
R9b: Stripe completo + planes API + feature gating
R9c: API externa live (/scores, /estimate, /rankings) + middleware + /metodologia + /indices
Cubre: FE2 §5.1-5.2, BE3 §6.1+R9, IE5 §12-13
```

# SESIÓN 20 — R10+POST: Crons + Mobile + DR + Tests + Verificación
```
Tag: restructure-complete-v4
Subir: BE2 + BE3 + FE1 + FE2 + AUDIT

R10a: 14+ crons restantes
R10b: Mobile responsive + PWA
R10c: DR runbook + tests + CI + Lighthouse

POST-SPRINT VERIFICACIÓN FINAL:
  □ Build limpio 0 errores
  □ RLS matrix 7 roles PASS
  □ PostHog 14+ event types
  □ Lighthouse >80 públicas
  □ 27+ crons ejecutan
  □ zone_scores con datos reales
  □ 245 upgrades verificados E2E
  □ Tag: restructure-complete-v4

Cubre: BE2 §5.2b, BE3 §R10, FE1 §1+3, FE2 §5.4+6.8-6.9
```

---

# LEYENDA DE DOCUMENTOS

```
IE1  = IE_DMX_v4_PART1.md       (Visión + Arquitectura + Fuentes + SCIAN)
IE2  = IE_DMX_v4_PART2.md       (37 Scores Nivel 0+1)
IE3  = IE_DMX_v4_PART3.md       (59 Scores Nivel 2+3+4+5)
IE4  = IE_DMX_v4_PART4.md       (11 Scores Nuevos + 7 Índices + Snapshots)
IE5  = IE_DMX_v4_PART5.md       (Cascadas + Productos + Competencia + Fases)
BE1  = BACKEND_DMX_v4_PART1.md  (107 Tablas + Security)
BE2  = BACKEND_DMX_v4_PART2.md  (Functions + tRPC + API + 27 Crons)
BE3  = BACKEND_DMX_v4_PART3.md  (Integraciones + Stripe + Sprints R0-R10)
FE1  = FRONTEND_DMX_v4_PART1.md (Design System + Hooks + Portal Asesor)
FE2  = FRONTEND_DMX_v4_PART2.md (Dev/Admin/Comprador/Público + Features)
HABI = REPORTE_COMPLETO_SESION_ANALISIS_HABI_DMX.md (Análisis Habi/propiedades.com)
ARCH = DMX_DATA_ARCHITECTURE_245.md (Producido en Etapa 0)
```

---

# PRECAUCIONES GLOBALES

```
1. ETAPA 0 antes de Sesión 07 — sin mapa de arquitectura no se toca código
2. Cada sesión es deployable independientemente
3. Build limpio en cada commit
4. Verificar localhost antes de commitear cambios visuales
5. NUNCA consumir API de Habi — usar fuentes públicas directas
6. Cada upgrade que toca tabla compartida respeta el contrato de datos
7. Los 245 upgrades viven principalmente en Sesión 07 pero benefician TODAS las sesiones
8. Las sesiones 08-20 del plan original NO se borran — se enriquecen con los 245 upgrades
9. Si Etapa 0 revela problemas estructurales, PARAR y resolver antes de avanzar
10. El resultado final: ~245 upgrades + 108 scores + 7 índices + mapa inteligente + growth engine
```
