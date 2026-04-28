# BIBLIA DMX v5 — DOPAMINE EDITION
## Documento Maestro — Decisiones + Hallazgos + Arquitectura + Plan
## Generado en Etapa 0 (Abril 2026)
## Este documento NO reemplaza los 13 documentos fuente — los COMPLEMENTA
## con todo lo que se decidió, descubrió y diseñó en la sesión de auditoría.

---

# SECCIÓN 1: IDENTIDAD Y PRINCIPIOS

```
Nombre:        DesarrollosMX v5 Dopamine Edition
Misión:        Construir la representación digital más precisa de las ciudades
               de México, y hacer que cada decisión que involucre una ubicación
               sea fundamentalmente mejor.
Categoría:     Spatial Decision Intelligence
Principio:     El marketplace es el canal. El IE es el producto.
               Los datos temporales acumulados son el moat.
Repo:          git@github.com:manuia88/desarrollosmx-v8final.git  branch: main
Supabase:      kcxnjdzichxixukfnenm
Ubicación:     /Users/manuelacosta/Desktop/desarrollosmx-v8final
Stack:         Next.js 16.2.1, React 19.2.4, TypeScript 5, Tailwind v4,
               tRPC 11, Supabase (SSR+Admin), Mapbox GL JS 3.20, Recharts 3.8.1,
               PostHog, OpenAI, Anthropic, Sharp 0.34.5, Zod 4.3.6
Último commit: 22fa5f1 — Audit complete: 9/9 cascades connected
```

### Regla de diseño IE (5 preguntas — cada línea de código pasa esta prueba)

```
1. ¿Genera datos que otro módulo consume?
2. ¿Consume datos que otro módulo genera?
3. ¿Reduce fricción para que un usuario genere más datos?
4. ¿Hace que un usuario tome una mejor decisión?
5. ¿Mide algo que nos ayuda a mejorar la plataforma? (AARRR)
Si NO a las cinco → no se construye.
```

---

# SECCIÓN 2: DECISIONES TOMADAS EN ESTE CHAT

### DECISIÓN 1: Frontend Dopamine es INTOCABLE

> **2026-04-25 ACTUALIZACIÓN — SUPERSEDED por ADR-048:** DECISIÓN 1 modificada — frontend canon ahora es **prototype JSX puro** (`tmp/product_audit_input/DMX-prototype/`), formalizado en ADR-048, NO Dopamine.
> Texto original mantiene historia. Para canon vigente ver:
> - `docs/01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md`
> - `docs/08_PRODUCT_AUDIT/07_FRONTEND_PROTOTYPE_CANONICAL.md`
> - `docs/08_PRODUCT_AUDIT/08_PROTOTYPE_TO_MODULES_MAPPING.md`

El diseño de los 10 módulos JSX + 9 DOCX es la fuente de verdad del frontend.
No se le quita nada. No se modifica nada del diseño. Solo se le agrega.
Si el backend necesita adaptarse al frontend → se adapta.
Si hay conflicto → STATUS_MAP traduce, la BD NO se cambia.
Antes de cualquier cambio estructural → se pide autorización a Manu.

### DECISIÓN 2: Backend existente se PRESERVA
Las 110 tablas, 64 funciones, 36 triggers, 9 tRPC routers funcionales,
62 archivos IE, 18 growth, 4 tracking, 24 IE components, 19 crons,
9 cascadas — TODO se preserva. No se borra nada.
Si algo ya no se necesita, se deja (no se borra).
Las 77 pages actuales se borran SOLO cuando su reemplazo Dopamine funcione,
esté verificado visualmente, y commiteado con build limpio.

### DECISIÓN 3: Módulo 7 "Inventario" renombrado a "Desarrollos"

### DECISIÓN 4: Sistema de permisos Super Admin
Todas las features viven en admin. Se asignan a roles via checklist.
3 tablas: feature_registry → role_features → profile_feature_overrides
Función: resolve_features() con cascade: override > role > global default.
STATUS: ✅ YA MIGRADO A SUPABASE (Sprint v5-S0 Tarea 1 completada)

### DECISIÓN 5: Seguridad ANTES de frontend
23 vulnerabilidades identificadas. 4 críticas. Se cierran en Sprint v5-S0
ANTES de construir cualquier módulo Dopamine.

### DECISIÓN 6: Documentos alineados por fase
No saturar contexto. Cada fase/sprint sube solo los documentos que necesita.
Los 16 documentos generados cubren todo pero se usan selectivamente.

---

# SECCIÓN 3: INVENTARIO REAL VERIFICADO (Auditoría Supabase)

## 3.1 Base de datos

```
Tablas:                    110 (107 originales + 3 permisos v5)
Funciones SQL:             64 (documento BE2 decía ~25)
Triggers:                  36 en 10 tablas (BE2 decía ~10)
RLS policies:              ~207 (BE1 decía ~160)
Foreign keys:              ~150
Performance indices:       ~165
CHECK constraints:         ~90
100% tablas con RLS:       ✅ Verificado
0 tablas sin policies:     ✅ Verificado
```

## 3.2 Código

```
Archivos TS/TSX:           454
LOC total:                 58,166
Pages:                     77 (30 asesor, 20 admin, 13 dev, 10 public, 3 auth, 1 extra)
API routes:                51 (19 crons, 5 AI, 4 IE, 3 photos, 18 otros)
tRPC routers:              15 (9 funcionales, 6 stubs)
IE lib:                    62 archivos (~8K LOC)
Growth lib:                18 archivos (~1.2K LOC)
Tracking lib:              4 archivos (~238 LOC)
IE components:             24 (23 montados, 1 huérfano: ZoneImprovementSuggestions)
Hooks:                     12 (~645 LOC)
Supabase clients:          3 (browser, server, admin)
Cascadas:                  9/9 conectadas
Scores registrados:        107 en registry.ts
Cron jobs:                 19 funcionales en vercel.json
```

## 3.3 Datos reales

```
Tablas con datos (25/110):
  macro_series(104), unidades(47), actividad_timeline(24), historial_precios(16),
  zones(16), prototipos(16), avance_obra(13), projects(10), supported_cities(10),
  external_data(10), visitas_programadas(8), admin_actions(6), project_views(6),
  tareas(6), busqueda_proyectos(6), contactos(5), automation_rules(5),
  interaction_feedback(5), operaciones(4), ai_prompt_versions(4), notificaciones(4),
  plans(3), profiles(3), desarrolladoras(3), busquedas(3)

IE completamente vacío:
  geo_data_points(0), zone_scores(0), project_scores(0), user_scores(0),
  dmx_indices(0), geo_snapshots(0), score_history(0), score_recalculation_queue(0),
  score_subscriptions(0), market_anomalies(0), market_prices_secondary(0),
  search_trends(0), market_pulse(0), zone_price_index(0), zona_snapshots(0)

CONCLUSIÓN: Infraestructura sólida (58K LOC, 110 tablas, 64 funciones, 9 cascadas),
datos vacíos. El IE tiene pipeline E2E completo pero 0 ejecuciones reales.
```

## 3.4 Flujos de datos verificados

```
FLUJO                    INFRAESTRUCTURA    DATOS REALES    STATUS
Ingesta Macro            ✅ Pipeline E2E    104 rows        PARCIAL (scores no calculados)
Ingesta Geo              ✅ 14 ingestors    0 rows          SIN DATOS (Sesión 07)
Score Calculation        ✅ Queue→Worker    0 ejecuciones   PIPELINE LISTO
Tracking/PostHog         ✅ 12 helpers      ~25 rows        MÍNIMO
Cascadas                 ✅ 9/9 wired       0 ejecuciones   CONECTADAS, 0 EJECUTADAS
Growth Engine            ✅ 18 archivos     1 event         SIN DATOS
CRM Asesor               ✅ 8 tRPC procs    ~80 rows test   DATOS PRUEBA
Dev Portal               ✅ 13 tRPC procs   ~60 rows test   DATOS PRUEBA
```

---

# SECCIÓN 4: DISCREPANCIAS BD↔FRONTEND — REGISTRO OFICIAL

```
ID       TABLA            CAMPO        BD REAL                              FRONTEND DOPAMINE         RESOLUCIÓN
DISC-01  operaciones      status       propuesta/oferta_aceptada/           offer/offer_blocked/      STATUS_MAP
                                       escritura/cerrada/pagando/cancelada  contract/closed/paying/cancelled
DISC-02  tareas           type         propiedades/clientes/prospectos/gen  property/capture/         STATUS_MAP
                                                                            search/client/lead
DISC-03  operaciones      lado         EXISTS (duplicate of side)           Solo usa side             DROP lado (autorización)
DISC-04  dmx_indices      index_code   5 valores                           7 (need MOM,LIV)          ALTER CHECK
DISC-05  env vars         —            CLAUDE_API_KEY, MAPBOX_TOKEN         ANTHROPIC_API_KEY,        Normalizar
                                                                            MAPBOX_ACCESS_TOKEN
DISC-06  contactos        phones       jsonb array                          Frontend maneja jsonb     Adaptar UI
DISC-07  contactos        emails       jsonb array                          Frontend maneja jsonb     Adaptar UI
DISC-08  contactos        name         first_name + last_name               Algunos DOCX dicen nombre Usar BD real
DISC-09  profiles         phone        text column                          Algunos DOCX dicen telefono Usar BD real

REGLA: BD real SIEMPRE gana. Si hay conflicto, se ajusta frontend o doc, NUNCA la BD.
```

---

# SECCIÓN 5: SEGURIDAD — 23 HALLAZGOS

## 5.1 Críticos (4)

```
SEC-01: profiles_select_public_slug expone email, phone, RFC, razon_social, regimen_fiscal,
        docs_verificacion_urls de TODOS los usuarios activos a cualquier autenticado.
        FIX: VIEW pública o policy que filtre columnas sensibles.

SEC-02: profiles_update_own permite UPDATE sin restricción de columnas.
        Un asesor puede hacer SET rol='superadmin' y escalar privilegios.
        El trigger audit_sensitive_changes solo REGISTRA, no BLOQUEA (hace RETURN NEW).
        FIX: Trigger prevent_role_escalation que bloquee cambio de rol/is_approved/employer.

SEC-03: desarrolladoras_select_public con qual=true expone rfc, email_contacto,
        telefono_oficina, whatsapp_contacto, oficina_direccion, oficina_lat/lng.
        FIX: VIEW pública sin datos sensibles.

SEC-04: 8 funciones SECURITY DEFINER aceptan uuid como parámetro sin validar auth.uid():
        get_asesor_dashboard, get_asesor_performance, get_developer_dashboard,
        get_master_broker_dashboard, get_morning_briefing, add_asesor_xp,
        calculate_commission_forecast, match_busqueda_inventario.
        Cualquiera puede ver datos de cualquier usuario pasando su ID.
        FIX: IF p_id != auth.uid() AND NOT is_superadmin() THEN RAISE EXCEPTION.
```

## 5.2 Altos (6)

```
SEC-05: projects_select_public (publicado=true) expone broker_commission_pct,
        broker_commission_notes, broker_pago_comision, broker_bono_pct a compradores.
        FIX: VIEW pública sin columnas broker_*.

SEC-06: Storage bucket profile-avatars: public=true, file_size_limit=null,
        allowed_mime_types=null. Cualquiera sube cualquier archivo sin límite.
        FIX: file_size_limit=5MB, allowed_mime_types=['image/jpeg','image/png','image/webp','image/gif'].

SEC-07: Storage buckets dossier-exports, commission-invoices, operation-files
        tienen INSERT con solo auth.uid() IS NOT NULL. Un comprador puede subir.
        FIX: Agregar get_user_role() IN ('asesor','desarrollador','superadmin').

SEC-14: 24 tablas con policy ALL (incluyendo DELETE) para owner. Un asesor puede
        borrar TODO su historial: actividad_timeline, captaciones, acm_valuaciones,
        visitas_programadas, tareas, comisiones, etc.
        FIX: Separar ALL → SELECT+INSERT+UPDATE (sin DELETE) en 5 tablas históricas.

SEC-15: score_subscriptions policy ALL sin validar plan premium. Usuario free puede
        suscribirse a alertas de scores premium.
        FIX: WITH CHECK que cruce feature_registry.is_premium + subscriptions.status.

SEC-16: project_landing_pages policy solo valida created_by=auth.uid() en INSERT.
        No valida que el asesor tenga autorización sobre el proyecto.
        FIX: Agregar is_authorized_broker(project_id) OR is_project_owner(project_id).
```

## 5.3 Medios (13)

```
SEC-08:  Webhook secrets en plaintext (webhooks.secret)
SEC-09:  QR codes analytics visibles para todos (qr_codes_read qual=true)
SEC-10:  Rate limiting sin verificar en tRPC endpoints
SEC-11:  RFC sin encriptar en reposo (profiles.rfc, desarrolladoras.rfc)
SEC-12:  CORS sin verificar en API routes
SEC-13:  Sin 2FA/MFA para superadmin
SEC-17:  pgsodium no habilitado (disponible pero no instalado)
SEC-18:  Supabase Vault vacío (API keys en .env, no en vault)
SEC-19:  Sin audit log de lecturas de datos sensibles
SEC-20:  demand_queries INSERT con with_check=true (spam posible)
SEC-21:  admin_actions INSERT abierto (pollution de log)
SEC-22:  project_views INSERT inflable (fake views sin dedup)
SEC-23:  avance_obra_log visible para todos incluido proyectos no publicados
```

## 5.4 Verificados OK

```
✅ 110/110 tablas con RLS
✅ 0 tablas sin policies
✅ contactos INSERT valida asesor_id=auth.uid()
✅ operaciones INSERT valida asesor=auth.uid()
✅ operaciones DELETE solo superadmin
✅ gamification SOLO SELECT para owner (no puede manipular XP via BD)
✅ API keys guardadas como hash (key_hash)
✅ Security headers en Next.js (CSP, HSTS, X-Frame, etc.)
✅ Anti-duplicados normalize_phone() + unique index
✅ Audit triggers en profiles, operaciones, projects
✅ Multi-tenancy con get_visible_asesor_ids()
✅ Broker authorization con is_authorized_broker()
✅ pgcrypto instalado, supabase_vault disponible
```

---

# SECCIÓN 6: FRONTEND DOPAMINE — 10 MÓDULOS

```
#   NOMBRE         JSX LOC   DOCX    SIDEBAR          COLOR TINT    tRPC BACKEND
M1  Dashboard      ~900      ✅      Command Center   bgLavender    asesorCRM+gamification+intelligence
M2  Desarrollos    423       ✅      Desarrollos      bgSlate       developer+scores+photos
M3  Contactos      576       ✅      Contactos        bgLavender    asesorCRM
M4  Búsquedas      1059      ✅      Búsquedas        bgLavender    asesorCRM
M5  Captaciones    757       ✅      Captaciones      bgPeach       asesorCRM
M6  Tareas         549       ✅      Tareas           bgSlate       asesorCRM
M8  Operaciones    873       ✅      Operaciones      bgMint        asesorCRM
M9  Marketing      711       ✅      Marketing        bgSlate       photos+asesorCRM
M10 Estadísticas   636       ✅      Estadísticas     bgLavender    asesorCRM+gamification
—   Design System  940       —       (layout global)  —             —

Design System Dopamine:
  Typography:    Outfit 700-900 (headings), DM Sans 300-700 (body)
  Background:    #F5F3F0 (warm cream)
  Gradient:      #6366F1→#EC4899
  Tints:         bgLavender #F0EEFF, bgMint #EDFAF5, bgPeach #FFF3ED,
                 bgSlate #F0F2F7, bgRose #FFF1F2
  Semantic:      Indigo #6366F1, Coral #F97316, Emerald #10B981,
                 Violet #8B5CF6, Rose #F43F5E, Cyan #06B6D4
  Cards:         Card3D (perspective 800, rotateX/Y ±12°, translateZ 12px)
  Sidebar:       60px collapsed → 240px hover, bg #111118
  Header:        54px glass morphism, sticky, backdrop-filter blur(20)
  Content:       max-width 1100px centered
```

---

# SECCIÓN 7: GAPS — BACKEND NUEVO NECESARIO PARA DOPAMINE

## 7.1 tRPC procedures a CREAR (~16)

```
ROUTER asesorCRM (extender — 8 nuevos):
  createTimelineEntry (mutation) — acción rápida "registrar llamada"
  scheduleVisit (mutation) — acción rápida "programar visita"
  toggleAvailability (mutation) — toggle disponibilidad en header
  getUnreadNotifCount (query) — badge notificaciones
  globalSearch (query) — command palette ⌘K
  getPipelineMetrics (query) — métricas superiores Kanban
  getPipelineFunnel (query) — embudo estadísticas
  getRevenueByMonth (query) — chart revenue

ROUTER marketing.ts (NUEVO — 8 procedures):
  createLanding / getLandings / updateLanding
  createQR / getQRs
  getTemplates / createTemplate
  createFolder / getFolders
```

## 7.2 STATUS_MAP a crear

```
Archivo: lib/constants/status-maps.ts

OP_STATUS_MAP (operaciones):
  offer ↔ propuesta
  offer_blocked ↔ oferta_aceptada
  contract ↔ escritura
  closed ↔ cerrada
  paying ↔ pagando
  cancelled ↔ cancelada

TASK_TYPE_MAP (tareas):
  property ↔ propiedades
  capture ↔ prospectos (o captaciones)
  search ↔ busquedas
  client ↔ clientes
  lead ↔ leads
```

## 7.3 Backend que SE PRESERVA sin cambios

```
✅ 110 tablas, 64 funciones, 36 triggers — no se toca nada
✅ 9 tRPC routers funcionales — se EXTIENDEN, no se reescriben
✅ 9 cascadas, 107 scores, 19 crons — siguen corriendo
✅ 62 archivos IE + 18 growth + 4 tracking — se mantienen
✅ 24 IE components — se remontan en layout Dopamine
✅ 12 hooks existentes — se reusan
```

## 7.4 Las 77 pages actuales

```
Se REEMPLAZAN por los 10 módulos Dopamine.
NO se borran hasta que el reemplazo funcione y esté commiteado.
app/(asesor)/ — 30 pages → reemplazadas por Dopamine S1-S5
app/(desarrollador)/ — 13 pages → se mantienen hasta Sesión 14
app/(admin)/ — 20 pages → se mantienen hasta Sesión 19
app/(public)/ — 10 pages → se mantienen hasta Sesión 18
```

---

# SECCIÓN 8: ROADMAP — 20 SESIONES + SPRINTS v5

```
SESIÓN │ SPRINT     │ CONTENIDO                                        │ STATUS
───────┼────────────┼──────────────────────────────────────────────────┼────────
  01   │ R0-v4      │ DB + Security + Bugs + 8 Tablas nuevas          │ ✅ DONE
  02   │ R1a        │ Dashboard Asesor + Contactos + Gamification     │ ✅ DONE
  03   │ R1b        │ Pipeline Búsquedas Kanban 6+1                   │ ✅ DONE
  04   │ R1c        │ Captaciones + Props Secundarias + ACM           │ ✅ DONE
  05   │ R1d        │ Tareas + Operaciones + Cierres + Métricas       │ ✅ DONE
  06   │ IE-1       │ IE Arquitectura + 77 Upgrades + Auditoría E2E  │ ✅ DONE
───────┼────────────┼──────────────────────────────────────────────────┼────────
  E0   │ ETAPA 0    │ Auditoría Profunda + Biblia v5 + Seguridad     │ ✅ DONE
───────┼────────────┼──────────────────────────────────────────────────┼────────
  E0+  │ v5-S0      │ Seguridad (23 fixes) + Fundación BD            │ ← EN CURSO
       │ v5-S1      │ Dashboard + Sidebar + Header Dopamine           │ PENDIENTE
       │ v5-S2      │ Contactos + Tareas                              │ PENDIENTE
       │ v5-S3      │ Búsquedas + Captaciones                         │ PENDIENTE
       │ v5-S4      │ Operaciones + Estadísticas                      │ PENDIENTE
       │ v5-S5      │ Desarrollos + Marketing                         │ PENDIENTE
       │ v5-S6      │ Implementar 6 tRPC stubs                        │ PENDIENTE
───────┼────────────┼──────────────────────────────────────────────────┼────────
  07   │ IE-2       │ Ingesta Real + Catastro + Mapa Inteligente     │ PENDIENTE
  08   │ IE-3       │ Scores Nivel 0 (21) + AVM MVP                  │ PENDIENTE
  09   │ IE-4       │ Scores Nivel 1 (16) + Intelligence Cards       │ PENDIENTE
  10   │ IE-5       │ 11 Scores Nuevos N01-N11 + Cross-References    │ PENDIENTE
  11   │ IE-6       │ Scores Nivel 2 (14) + Cascadas Live            │ PENDIENTE
  12   │ IE-7       │ Scores Nivel 3-4 (19) + 7 Índices DMX         │ PENDIENTE
  13   │ IE-8       │ Nivel 5 AI (26) + Productos Licenciables      │ PENDIENTE
  14   │ R2         │ Dev Core + Analytics IE                        │ PENDIENTE
  15   │ R3         │ Document Intelligence Pipeline                 │ PENDIENTE
  16   │ R4         │ Legal + Pagos + Inbox + Calendario             │ PENDIENTE
  17   │ R6-R7      │ Marketing + WhatsApp + Notificaciones          │ PENDIENTE
  18   │ R8         │ Portal Comprador + Features Transversales      │ PENDIENTE
  19   │ R9         │ Admin + Stripe + API Externa + Productos       │ PENDIENTE
  20   │ R10+POST   │ Crons + Mobile + DR + Tests + Verificación     │ PENDIENTE
```

## Sprint v5-S0 Detallado (estado actual)

```
BLOQUE 1 — SEGURIDAD CRÍTICA:
  □ SEC-02: Trigger prevent_role_escalation
  □ SEC-01: Fix profiles_select_public_slug
  □ SEC-03: Fix desarrolladoras_select_public
  □ SEC-04: Auth validation en 8 funciones SECURITY DEFINER

BLOQUE 2 — SEGURIDAD ALTA:
  □ SEC-06: Restringir profile-avatars bucket
  □ SEC-07: Restringir storage INSERT por rol
  □ SEC-05: VIEW pública projects sin broker_*
  □ SEC-14: Quitar DELETE en 5 tablas históricas
  □ SEC-15: WITH CHECK en score_subscriptions
  □ SEC-16: Validar autorización en landing_pages
  □ SEC-22: Deduplicar project_views
  □ SEC-23: Restringir avance_obra_log
  □ SEC-09: Restringir qr_codes a owner
  □ SEC-20: Rate limit en demand_queries

BLOQUE 3 — FUNDACIÓN:
  ✅ Tarea 1: 3 tablas permisos creadas
  □ Tarea 2: ALTER dmx_indices CHECK (+DMX-MOM, DMX-LIV)
  □ Tarea 3: ALTER tareas.type CHECK (ampliar)
  □ Tarea 4: DROP operaciones.lado
  □ Tarea 5: Seed ~120 feature_registry rows
  □ Tarea 6: Seed role_features defaults
  □ Tarea 7: Crear lib/constants/status-maps.ts
  □ Tarea 8: Crear lib/constants/feature-keys.ts
  □ Tarea 9: Normalizar env vars
  □ Tarea 10: tRPC permisos router
```

---

# SECCIÓN 9: 245 UPGRADES — 19 SUB-ETAPAS

```
SUB-ETAPA   UPG #     CONTENIDO                              DEPS         DOCS FUENTE
7.1         1-6       DENUE + FGJ real                       Ninguna      IE1, IE4
7.2         7-13      Catastro + Uso Suelo                   Ninguna      IE1, HABI
7.3         14-20     GTFS,SIGED,DGIS,Atlas,SACMEX           7.1          IE1
7.4         21-29     Cross-references 8 fuentes              7.1-7.3      IE1, IE4
7.5         30-38     Pre-calculators datos reales            7.4          IE2, IE4
7.6         39-46     AVM Mexicano MVP (I01)                  7.5          IE2, IE3
7.7         47-55     Intelligence Cards                      7.5-7.6      IE3, IE4
7.8         56-68     Mapa Inteligente 7 capas Mapbox         7.2-7.5      IE1, FE1
7.9         69-80     Herramientas Asesor datos reales        7.5-7.6      IE2, IE3
7.10        81-89     Developer Intelligence datos            7.5          IE3, FE2
7.11        90-98     Buyer Experience datos reales           7.5-7.6      IE3, FE2
7.12        99-110    API & B2B endpoints                     7.5-7.7      IE5, BE3
7.13        111-122   Gobierno & Notarías                     7.6-7.12     IE5
7.14        123-132   Movilidad & Retail                      7.5-7.8      IE5
7.15        133-150   Growth & Contenido viralizable          7.5-7.12     IE5, XIND
7.16        151-165   Fintech & Proptech                      7.6-7.12     IE5
7.17        166-225   People Intelligence (55 upg!)           7.5-7.16     IE3, IE5
7.18        226-235   Interacción Activa (NLP, coaching)      7.17         IE5
7.19        236-245   Market Memory + DMX Agente              7.17-7.18    IE5
```

---

# SECCIÓN 10: IE COMPLETO — SCORES, CASCADAS, PRODUCTOS

## 10.1 Scores: 107 registrados + 11 nuevos = 118 total

```
Layer 0 (21): F01-F07, H01-H04, H06, H08-H11, A01, A03-A04, B12, D07
Layer 1 (16): F08, F12, H07, A02, A05-A06, A12, B01-B02, B04, B07-B08, D05-D06, H05, H14
Layer 2 (14): F09-F10, B03, B05, B09-B10, B13-B15, C01, C03, D03, H12, H16
Layer 3 (12): A07-A11, B06, B11, C04, C06, D04, H13, H15
Layer 4 (7):  DMX-IPV, DMX-IAB, DMX-IDS, DMX-IRE, DMX-ICO, DMX-MOM, DMX-LIV
Layer 5 (26): C02, C05, C08, E05-E08, G02-G05, D01, D08, D10, F11, F13-F17, I01-I06
Nuevos (11):  N01-N11 (Ecosystem Diversity, Employment, Gentrification Velocity,
              Crime Trajectory, Infrastructure Resilience, School Premium,
              Water Security, Walkability MX, Nightlife Economy, Senior Livability,
              Momentum Index)

DETALLE COMPLETO de cada score: ver docs 07_IE_PART2 y 08_IE_PART3
(lógica E2E de 13 pasos: fuente→ingesta→almacenamiento→procesamiento→
persistencia→API→hook→componente→page→interacción→feedback→notificación→API externa)
```

## 10.2 Cascadas: 9 implementadas

```
unit_sold        → B08, E01, D02, B03, B09        (trigger BD)
price_changed    → A12, A01, A04, A02, B02, B03, E01 (trigger BD)
macro_updated    → A01, A03, B08, H11, D01         (batch)
geo_data_updated → variable por source              (batch)
feedback_registered → B03, C04                      (trigger BD)
denue_ingested   → F03, D05, D09
fgj_ingested     → F01, F12
own_data_ingested → A12, D06
snapshot_completed → F03, F01
+ search_behavior (planificada v4) → B01, B04, H14  (batch, cada hora)
```

## 10.3 Productos licenciables

```
1. DMX Livability API    — scores por lat/lon
2. DMX Momentum Index    — índice mensual por colonia
3. DMX Risk Score        — riesgo compuesto
4. DMX Site Selection    — herramienta developers
5. DMX Market Reports    — reportes automáticos
6. DMX Estimate (I01)    — AVM mexicano
7. API externa           — /api/v1/scores/, /estimate/, /rankings/
```

## 10.4 Competencia

```
CoStar ($35B): CRE, no residential, no LATAM
Cherre: Knowledge graph, no scores
Reonomy: CRE property, no residential
Local Logic: 18 scores US/CA, no temporal
Walk Score: 3 scores estáticos desde 2007
DD360 (México): Valuaciones MX, sin location intel
Habi/propiedades.com: Catastro + listings, sin IE

DMX ÚNICO: Marketplace + location intelligence temporal + risk + ecosystem +
  calibración transaccional. Zero competencia LATAM.
```

---

# SECCIÓN 11: PORTALES POR ROL

```
ASESOR:        10 módulos Dopamine (Dashboard, Desarrollos, Contactos, Búsquedas,
               Captaciones, Tareas, Operaciones, Marketing, Estadísticas)
DESARROLLADOR: Dashboard, inventario, asesores, leads, analytics 7 tabs IE,
               documentos, perfil, config, suscripción (Sesión 14)
ADMIN:         Dashboard AARRR, proyectos, participantes, revenue,
               observatory 7 índices, macro, zonas, anomalías, API metrics (Sesión 19)
COMPRADOR:     Dashboard, guardados, operaciones, simulador, comparador,
               hipotecas, Discover Weekly, DMX Wrapped (Sesión 18)
PÚBLICO:       Homepage, explorar con IE, ficha proyecto, índices,
               metodología, asesores microsites (Sesiones 18-19)
```

---

# SECCIÓN 12: MONETIZACIÓN

```
FASE 1: Todo gratis — validar producto
FASE 2: Suscripciones (Free→Starter→Pro→Enterprise) + fee 0.5% por venta
FASE 3: API IE (Free 100/día → $5K/$25K/Enterprise) + productos B2B
```

---

# SECCIÓN 13: FEATURES TRANSVERSALES

```
Gamification:     XP, levels, streaks, badges, leaderboard (Duolingo+Strava)
Notificaciones:   20 tipos × 3 canales (in_app, email, whatsapp)
Webhooks:         12 event types
Soft Delete:      Patterns para proyecto/asesor/operación/desarrolladora/captación
Cross-Portal:     Documento→venta, Captación→venta_secundaria, Gamification→datos
Personalización:  Homepage por buyer_persona (Netflix pattern)
Discover Weekly:  3 matches semanales (Spotify pattern)
DMX Wrapped:      Reporte anual viral (Spotify Wrapped)
Marketing auto:   Post + story + datos IE (inspirado Pulppo)
```

---

# SECCIÓN 14: REGLAS DE TRABAJO

## Heredadas de v4

```
1.  BD real > Biblia — verificar information_schema antes de SQL
2.  SQL a Supabase SQL Editor directo, nunca Claude Code
3.  Passwords solo en terminal directa
4.  export const dynamic = 'force-dynamic' para tRPC API routes
5.  Supabase joins retornan arrays → Array.isArray()
6.  normalize_phone() + unique index para anti-duplicados
7.  SECURITY DEFINER para helpers RLS (evitar recursión)
8.  UNA instrucción a la vez → verificar → siguiente
9.  git tag antes de cambios grandes
10. Visual verification en localhost antes de commit
```

## Nuevas v5

```
11. Frontend Dopamine JSX es FINAL — no remover, solo agregar
12. STATUS_MAP para traducir frontend↔BD, nunca hardcodear
13. Card3D es el componente estándar de cards
14. Cada módulo tiene su tint color — respetar
15. Todo feature nuevo → agregar a feature_registry primero
16. Cada módulo = sprint independiente
17. build limpio obligatorio antes de commit
18. Módulo 7 = "Desarrollos" (no "Inventario")
19. Cada botón/acción en frontend DEBE tener endpoint backend mapeado
20. pwd + git remote + git log + git status ANTES de cualquier instrucción
```

---

# SECCIÓN 15: DOCUMENTOS DEL PROYECTO — ÍNDICE MAESTRO

```
#   ARCHIVO                                    LÍNEAS   CONTENIDO                           FASE
01  BACKEND_PART1_Tablas_Seguridad              904     Tablas + seguridad + multi-tenancy   S0
02  BACKEND_PART2_Functions_tRPC_Crons         1,211    Funciones + triggers + RLS + routers S0
03  BACKEND_PART3_Integraciones_Sprints          654    Stripe + notifs + sprints R0-R10     Todas
04  FRONTEND_PART1_DesignSystem_Hooks            782    Design system + hooks + componentes  S1-S5
05  FRONTEND_PART2_Portales_Features             614    Dev/Admin/Comprador/Público          S14-19
06  IE_PART1_Vision_Arquitectura                2,002   Visión + 5 capas + fuentes + SCIAN   S07
07  IE_PART2_Scores_N0_N1                       1,445   37 scores lógica E2E completa        S08-09
08  IE_PART3_Scores_N2_3_4_5                      934   59 scores niveles 2-5                S11-13
09  IE_PART4_11Nuevos_Indices                   1,233   11 scores nuevos + 7 índices DMX     S10,12
10  IE_PART5_Cascadas_Productos                 1,269   Cascadas + productos + competencia   S11-13
11  INSTRUCCIONES_MAESTRAS                        583   20 sesiones + 245 upgrades           Todas
12  CROSS_INDUSTRY_Strategy                       290   7 patterns $1B+ + flywheel           Ref
13  REPORTE_HABI_Catastro                       1,220   Habi + catastro + SIGCDMX            S07
14  AUDITORIA_SEGURIDAD                           628   23 hallazgos + fixes                 S0
15  CONEXIONES_E2E_Dopamine                       634   Cada botón → backend → tabla         S1-S5
16  INSTRUCCION_NUEVO_CHAT                         81   Prompt para nuevo chat               S0
17  BIBLIA_DMX_v5 (este archivo)                  ___   Decisiones + hallazgos + plan        Todas

QUÉ SUBIR POR FASE:
  Fase 1 (S0 seguridad+BD):    01, 02, 03, 11, 14, 15, 16, 17
  Fase 2 (S1-S5 frontend):     04, 15, 17 + módulos JSX/DOCX del sprint
  Fase 3 (S07-13 IE):          06, 07, 08, 09, 10, 12, 13, 17
  Fase 4 (S14-19 portales):    03, 05, 17
  Fase 5 (S20 cierre):         Todos como referencia
```

---

# FIN DE BIBLIA DMX v5
# Este documento + los 16 archivos fuente = TODO el contexto del proyecto
# Nada resumido. Nada omitido. Todo verificado contra BD real y código real.


---

## Append 07.7.A.3 — Data Reality Audit (2026-04-25)

> **Audit canónico:** [`docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md`](../08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md)

### DECISIÓN 1 (Frontend) — yA SUPERSEDED por ADR-048 (frontend prototype canonical)

Frontend canon DMX = **prototype JSX** en `tmp/product_audit_input/DMX-prototype/` (per `CLAUDE.md` + ADR-048). Esta DECISIÓN 1 original (Frontend Dopamine INTOCABLE) está cerrada. Mantenida en histórico para trazabilidad de la evolución de criterios.

### DECISIÓN 2 (Backend preserva) — REAFIRMADA + amplificada con A.3 reality

**Original:** Backend existente (Supabase + tRPC + IE engines + ingest drivers) se PRESERVA. NO se borran archivos sin justificación.

**A.3 amplifica:** los 4 archivos `shared/lib/ingest/geo/{dgis,fgj,gtfs,sacmex}.ts` aparentaban ser stubs (10 baseline `unmarked_stub_error` entries) pero auditoría reveló que son drivers completos (495-606 LOC cada uno con parsers, dedup, quality gates, lineage, UPSERT idempotente a `geo_data_points`). A.3 NO los borra ni reescribe — solo agrega STUB markers ADR-018 referenciando L-NEW IDs canónicos para HTTP fetch agendado FASE 11.E. **Refactor in-place sin pérdida.**

### Hallazgo crítico A.3 — synthetic data layer mucho mayor de lo documentado

| Capa | Reality | Self-flag honesto en código |
|---|---|---|
| Demographics (210+210) | SYNTHETIC fallback v1 | ✅ `not_ground_truth=true` en lineage |
| GeoJSON colonias (210) | SYNTHETIC bbox-500m IDÉNTICO | ✅ `boundary_source=fallback` |
| Climate (43,776) | SYNTHETIC SEED heuristic_v1 | ✅ check constraint + check label |

**El sistema YA marca synthetic en lineage**, pero **disclosure UI bugs P0 detectados**:

- **S5 high severity:** Atlas Wiki Haiku narrative cita synthetic como "INEGI" en `facts_cited` jsonb. Si Atlas Wiki entries están exposed en preview/UI, narrative reads "según INEGI..." citando datos sintéticos. Fix bloquea launch público.
- **A3-DEMO-01 M01 blocker:** UI ficha colonia (en construcción FASE 14+) consumirá `zone_demographics_cache` MV sin badge "Estimación H1". Pre-requisito proactivo M01.

Ambos agendados L-NEW M01 implementation (FASE 14+) como **P0 pre-launch**.

### Plan reality state — H1 launch readiness

- ✅ **Banxico macro_series**: REAL fresh 1d (880 rows, 4 series alineadas IDOC + ICO).
- 🟡 **INEGI Census 2020 + ENIGH 2022**: SYNTHETIC self-flagged (M01 puede consumir + badge UI).
- 🔴 **5 sources macro (SHF/BBVA/CNBV/Infonavit/FOVISSSTE)**: drivers + tests, cero ejecuciones. Defer L-NEW FASE 11/12 (no bloquea M01, calcs degradan graceful).
- 🟡 **4 geo CDMX (DGIS/FGJ/GTFS/SACMEX)**: drivers completos, HTTP fetch missing. Defer L-NEW FASE 11.E.
- 🟡 **Climate heuristic_v1**: SEED H1 (twin engine produce narrativa funcional). Defer L-NEW NOAA FASE 12.

**M01 NOT BLOCKED** — disponibilidad data baseline + synthetic con disclosures permite Dashboard Asesor H1.

### Próxima sub-fase A.4

A.4 CRM Foundation schema (`deals`, `leads`, `buyer_twins`, `operaciones`, `family_units`, `referrals`). Independiente de A.3 reality (CRM no consume data layer auditada).

**Status A.3:** Shipped (tag `fase-07.7.A.3-complete`).

---

## Append 07.7.A.4 — CRM Foundation shipped (2026-04-25)

> **Audit canónico:** [`docs/02_PLAN_MAESTRO/FASE_07.7_CRM_FOUNDATION.md`](../02_PLAN_MAESTRO/FASE_07.7_CRM_FOUNDATION.md) §"Sub-bloque A.4 — SHIPPED".

### DECISIÓN N: CRM Foundation A.4 shipped — schema canonical entregado

Sub-fase **07.7.A.4** resolvió **BLK_DEALS** (blocker #3 critical path top-30 RICE). 14 tablas dominio CRM + 1 audit particionada + 7 SECDEF helpers RLS + ~25 procedures tRPC `crm.*` shipped en 11 migrations atómicas.

**Tablas (14 dominio + 1 audit):** `persona_types` · `lead_sources` · `deal_stages` · `retention_policies` · `family_units` · `family_unit_members` · `leads` · `buyer_twins` · `buyer_twin_traits` · `deals` · `operaciones` (canonical ADR-049) · `referrals` (polymorphic ADR-034) · `referral_rewards` · `behavioral_signals` (pg_partman 24m) · `audit_crm_log` (pg_partman 84m = 7y CFDI-aware ADR-035).

**Migrations (11):**

```
supabase/migrations/
├── 20260425210000_crm_001_catalogs.sql
├── 20260425210100_crm_002_family_units.sql
├── 20260425210200_crm_003_leads.sql
├── 20260425210300_crm_004_buyer_twins.sql
├── 20260425210400_crm_005_deals_operaciones.sql
├── 20260425210500_crm_006_referrals.sql
├── 20260425210600_crm_007_behavioral_signals.sql
├── 20260425210700_crm_008_audit_crm_log.sql
├── 20260425210800_crm_009_rls_helpers_policies.sql
├── 20260425210900_crm_010_domain_triggers.sql
└── 20260425211000_audit_rls_allowlist_v28.sql
```

**SECDEF helpers RLS (7):** `rls_is_admin` · `rls_is_asesor` · `rls_is_master_broker` · `rls_is_developer` · `rls_owns_lead(lead_id)` · `rls_is_assigned_lead(lead_id)` STUB · `rls_is_brokerage_member(brokerage_id)` STUB.

**ADRs cerrados (3):**

- ADR-033 persona_types catalog extensible (no enum) — evolución sin migrations
- ADR-034 referrals polymorphic source/target — consolida cross-capa C5.5/T.2.4
- ADR-035 retention multi-país CFDI-aware — 5y MX · 10y CO · 7y AR/BR

**Tests:** +71 (3088 → 3159). audit-dead-ui baseline 25 mantenido. audit:rls clean v28. 0 violations audit:e2e/audit:selects.

### Cascadas CRM activas + STUBs

- ✅ ACTIVE: `INSERT/UPDATE leads/deals/operaciones/buyer_twins → tg_audit_crm_log → audit_crm_log INSERT`
- 🟡 STUB FASE 07.7.B: `UPDATE deals.stage (closed_won) → cascade_deal_won_to_operacion`
- 🟡 STUB FASE 07.7.B: `INSERT operaciones → cascade_operacion_commission_calc`
- 🟡 STUB FASE 13.B.7: `UPDATE buyer_twins.disc/big5 → recompute_buyer_twin_embedding`

### Handoff A.4 → A.5 → B.1 M01

- **A.5 next:** E2E tests retrofit (Playwright happy paths CRM lead→deal→operacion + referral) + audit-dead-ui CI extra para UIs `crm.*` consumer + tag `fase-07.7-complete`.
- **B.1 M01 next (FASE 14+):** UI Dashboard Asesor consume `crm.lead.list`, `crm.deal.list`, `crm.operacion.list`. **3 disclosure bugs P0 MUST-HAVE** heredados de A.3: S5 (Atlas Wiki cita synthetic como INEGI) + A3-DEMO-01 (ficha colonia sin badge) + CLIMATE-DISCLOSURE-01.
- **26 features RICE downstream** desbloqueadas. Top 5: C1.10 buyer twin preloaded · C1.11 portal-to-CRM auto-capture · C2.1 AVM spread · C5.5.3 streaks asesor · T.2.4 referral magic link.

**Status A.4:** Shipped (handoff a sub-bloque A.5 — E2E retrofit + tag `fase-07.7-complete`).

---

## Append 07.7.A.5 — E2E tests retrofit + CIERRE FASE 07.7 (2026-04-25)

### DECISIÓN N+1: FASE 07.7 CIERRE master shipped

Sub-fase **07.7.A.5** cierra **FASE 07.7 master** con tag dual `fase-07.7.A.5-complete` (sub-bloque) + `fase-07.7-complete` (CIERRE FASE).

**5 sub-bloques A.1-A.5 shipped:**
- A.1 — Audit M01-M20 + ADR-048 frontend prototype canonical replacement
- A.2 — Bloqueadores estructurales + audit-dead-ui (ADR-049 enforcement)
- A.3 — Data Reality Audit + scope pivot transparente + 4 STUB markers
- A.4 — CRM Foundation schema (BLK_DEALS resuelto, 14 tablas + 24 procedures)
- A.5 — E2E tests retrofit + docs cierre FASE master

### Outputs A.5

- **Integration tests** ampliados `features/crm/tests/integration/crm-router.test.ts`: 2 → 32 tests (+30 modo A mock-based via `createCaller` cubriendo Zod refines, enum guards, STUB markers, error paths, auth gate `UNAUTHORIZED`).
- **Playwright E2E** — 3 specs nuevos en `tests/e2e/`:
  - `zone-data-freshness.spec.ts` (5 tests `.skip()` + STUB ADR-018 4 señales)
  - `audit-dead-ui-meta.spec.ts` (3 tests sin browser, baseline 25 + workflow gate)
  - `crm-pipeline-flow.spec.ts` (3 tests API-direct via `createTRPCProxyClient<CrmRouter>`, conditional skip si no `PLAYWRIGHT_TEST_JWT`)

### Métricas A.5

- Tests: **+30** (3159 → 3189 pass + 2 skipped)
- E2E specs: **+11** (5 zone skipped + 3 meta + 3 crm conditional)
- audit-dead-ui:ci: **clean** (baseline 25 mantenido)
- audit:rls: **0 violations** (post v29)
- typecheck: **clean**
- Cero migrations + cero SECDEF nuevas (A.5 tests + docs only)

### Decisiones canon aplicadas

- BIBLIA DECISIÓN 2 respetada (no borrar) — solo append + STUB markers donde UI no shipped
- Memoria `feedback_audit_rls_strict_post_merge_gap` aplicada (zero SECDEF nuevas)
- Memoria `feedback_zsh_no_hash_comments_terminal_blocks` aplicada (bloques copy-paste sin `#` comments)
- Tag dual canónico: sub-bloque + master CIERRE FASE

### Handoff B.1 — M01 Dashboard Asesor (greenfield 0%)

3 disclosure bugs P0 must-have antes de wiring UI canónica (heredados A.3 → A.4 → A.5):

- **L-NEW-DEMO-DISCLOSURE-S5** Atlas Wiki narrative fix (~2h)
- **L-NEW-DEMO-DISCLOSURE-A3-01** UI ficha colonia badge "Estimación H1" (~1.5h)
- **L-NEW-CLIMATE-DISCLOSURE-01** Climate UI badge "Modelo SEED H1" (~1h)

CRM disponible para wiring UI M01:
- 14 tablas dominio + 1 audit particionada
- 24 procedures tRPC `crm.*` (lead 4 + deal 4 + operacion 3 + buyerTwin 3 + referral 3 + familyUnit 3 + catalogs 4)
- 7 SECDEF helpers RLS funcionales
- 26 features RICE downstream desbloqueadas

**Status A.5 + FASE 07.7 master:** Shipped (tag dual `fase-07.7.A.5-complete` + `fase-07.7-complete` pushed). FASE 07.7 CERRADA. Próximo: B.1 M01 Dashboard Asesor (FASE 14+).

### DECISIÓN N+2: Scope multi-país H1 Opción B — ADR-051 (2026-04-25)

Founder dictó scope multi-país H1 vs H2 post audit F0 (commit 49f773e SA-IE-Filter P40 detección complejidad multi-país desproporcionada para velocity H1):

- **Tier 1 H1 active** (testing/QA exhaustivo + enforcement + ingestion): `es-MX` + `en-US` (audience MX residential/comercial + US Latinx expat/inversionista comprando MX).
- **Tier 2 H2 prepared** (config + seeds preserved, NO testing/QA exhaustivo H1): `es-CO` + `es-AR` + `pt-BR` (activación FASE 38 H3 expansion ~6-9 meses post-launch H1).

### Compatibilidad ADRs anteriores (PRESERVED)

- **ADR-003 multi-country desde día 1** — vision intact, posterga ejecución testing/QA tier 2.
- **ADR-035 retention multi-país CFDI-aware** — 28 seeds (4 países × 7 entity_types) intactos. Enforcement cron `crm_retention_cleanup` activo MX H1, CO/AR/BR pasivo (rows preservados, no DELETE).
- **ADR-049 country_code char(2)** — schema multi-país BD intacto.
- **BIBLIA DECISIÓN 2 (5 locales)** — messages files preserved (`es-MX`, `es-CO`, `es-AR`, `pt-BR`, `en-US`), countries seeds intactos.

### Outputs F1.A scope multi-país

- ADR-051 nuevo (`docs/01_DECISIONES_ARQUITECTONICAS/ADR-051_MULTI_COUNTRY_SCOPE_H1_TIER.md`).
- 03.9 banner tier scope + tabla tier mapping + Reality Status F1.A scope multi-país (~80 LOC append).
- LATERAL_UPGRADES_PIPELINE +4 L-NEW expansion (CO + AR + BR + US Latinx) destinos canon FASE 38 / 22.A.
- 02.0_INDICE_MAESTRO tier marker per FASE.
- 11_IE_FILTER_AUDIT P40 status RESOLVED.
- Memoria `project_scope_multipais_h1_opcion_b` (28 entries MEMORY.md).

### Reglas de evolución

1. Si emerge feature H1 que requiere CO/AR/BR enforcement → FLAG founder ANTES de implementar (override H1 scope decision pending).
2. Si feature solo afecta MX → no requiere consult, build per canon.
3. Si feature solo afecta US Latinx → adapt usando es-MX patterns + en-US copy (mismo patrón asesor MX).
4. Sources US-specific defer L-NEW-US-LATINX-DATA-SOURCES (FASE 22.A o post-launch H1) hasta validation feedback usuarios H1.

**Status DECISIÓN N+2 + F1.A foundation:** Shipped (tag `fase-07.7-data-real-foundation`). Próximo F1.B Climate Real (NOAA + CONAGUA replace synthetic ~8-10h CC).


---

## DECISIÓN N+3 — FASE 07.7 Data Real shipped (2026-04-26)

**Status:** FASE 07.7 Data Real CIERRE master (`fase-07.7-data-real-shipped`). 16 sub-tags acumulados.

### Sub-bloques shipped F1.A → F1.G (cierre master 2026-04-26)

| Sub-bloque | Tag | Descripción |
|---|---|---|
| F1.A | `fase-07.7-data-real-foundation` | Multi-país scope H1 Opción B (es-MX + en-US active, CO/AR/BR defer H2) + ADR-051 |
| F1.B | `fase-07.7-data-real-climate` | NOAA NCEI + CONAGUA SMN replace heuristic_v1 sintético (43,776 rows reemplazados) |
| F1.C.A | `fase-07.7-data-real-climate-hybrid` | Climate hybrid separation: raw observations + cross-validation winner derivation |
| F1.D | `fase-07.7-data-real-geometry` | GeoJSON CDMX MGN replace synthetic bbox-500m uniform polygons (210 colonias real) |
| F1.C.B | `fase-07.7-data-real-demographics` | INEGI Censo 2020 Tier 1 municipal proxy (5 indicators × 16 alcaldías → 226 colonias) |
| F1.E.r | `fase-07.7-data-real-recompute` | Re-compute IE cascada (zone_scores 5267 + dmx_indices 3192 + pulse 83676 + dna 210 + forecasts 7296) |
| F1.C.C | `fase-07.7-data-real-tier2` | Tier 2 AGEB spatial overlay PostGIS (2,431 AGEBs CDMX + 208 colonias ENIGH downscale) |
| F1.G | `fase-07.7-data-real-shipped` | **MASTER CIERRE** — docs canon + handoff F2 Construction M01-M20 |

### Cobertura final Data Real (vs synthetic baseline pre-F1)

| Tabla | Pre-F1 | Post-F1 | Cobertura |
|---|---|---|---|
| `climate_source_observations` | 0 | 76,756 | NOAA + CONAGUA real ingestion |
| `climate_monthly_aggregates` | 43,776 sintético | 46,226 con cross_validation_status | Replacement + xval winner |
| `climate_zone_signatures` | 228 sintético | 228 recomputed sobre data real | Refresh sobre real |
| `zones.boundary` | 210 synthetic bbox-500m | 210 real MGN polygons | 100% colonias con boundary |
| `inegi_census_zone_stats` | 226 sintético | 226 Tier 1 + 208 Tier 2 AGEB overlay | 99% colonias granularity per-colonia |
| `inegi_ageb_staging` | — (no existía) | 2,431 AGEBs urbanos CDMX | New source-of-truth spatial |
| `enigh_zone_income` | 210 sintético | 208 downscaled rango realista | Tier 2 supersede synthetic |
| `colonia_wiki_entries` | 210 (2026-04-24) | 210 (defer cache fix combo F2) | L-NEW cache optimization |
| IE cascada (zone_scores + dmx + pulse + dna + forecasts) | computed sobre sintético | recomputed sobre data real | Refreshed F1.E.r |

### Handoff F2 Construction M01-M20

**Próximo:** FASE 13 Portal Asesor M1-M5 foundation visual (ADR-050 design tokens prototype-canon). Wireing UI consume Data Real shipped F1. M01 Dashboard Asesor ready para conectar con `inegi_census_zone_stats` (preferir `inegi_ageb_overlay` cuando exists, fallback `inegi_municipal_proxy`) + `enigh_zone_income` (preferir `enigh_2022_state_downscaled` con badge "Estimación H1") + `zones.boundary` real polygons + climate hybrid.

### L-NEW Pipeline F2 cohort

Defer a F2 Construction:
- **L-NEW-COMPUTE-ATLAS-WIKI-CACHE-FIX-01** (~3h) — expand WIKI_EXAMPLES_3 ≥2048 tokens + restart C13 con caching activo (~$0.30 vs $1.68 sin cache)
- **L-NEW-DEMO-TIER2-AGEB-OVERLAY-EXPAND-COLONIAS-H2** — 18 colonias remaining sin overlap AGEB (require F1.D L-NEW expand IECM completo first)
- **L-NEW-CRM-DEAL-WON-CASCADE-01** (FASE 07.7.B, ~3h) — auto-INSERT operacion on closed_won
- **L-NEW-DEMO-DISCLOSURE-S5** (~2h, M01 P0) — atlas wiki Haiku narrative cita synthetic sin badge
- **L-NEW-DEMO-DISCLOSURE-A3-01** (~1.5h, M01 P0) — UI ficha colonia consume Tier 2 sin badge "Estimación H1"
- **L-NEW-CLIMATE-DISCLOSURE-01** (~1h, M01 P0) — climate forecasts UI sin badge fuente

**Status DECISIÓN N+3 + F1.G master cierre:** Shipped (tag `fase-07.7-data-real-shipped`). Próximo F2 Construction M01-M20 / FASE 13.A foundation visual.

---

## DECISIÓN N+4 — FASE 13.A Foundation Visual Portal Asesor shipped (2026-04-26)

ADR-050 (`docs/01_DECISIONES_ARQUITECTONICAS/ADR-050_DESIGN_LANGUAGE_CANON_PROTOTYPE_ASESOR.md`) formaliza el design language canon del portal asesor como extensión aditiva sobre ADR-048 prototype canon. Founder approval 2026-04-26.

**Decisión:** Portal asesor adopta tokens prototype dark canon (navy + cream + indigo→rose + Outfit/DM Sans) + extensiones específicas:
- 3 accents operacionales: teal (Producto), violet (AI), gold (Performance)
- 3 surfaces compositivas: elevated, recessed, spotlight
- 4 score gradients narrativos: excellent (green→emerald), good (indigo→violet), warning (amber→orange), critical (red→rose)
- 1 AI gradient distintivo: violet+indigo+rose (135deg)
- 4 shadows narrativas: rest, hover, focus, spotlight
- 10 wayfinding colors per módulo: M01 indigo, M02 teal, M03 rose, M04 violet, M05 emerald, M06 amber, M07 blue, M08 orange, M09 gold, Academia purple

**Outputs FASE 13.A:**
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-050_DESIGN_LANGUAGE_CANON_PROTOTYPE_ASESOR.md` (~190 LOC)
- `styles/tokens.css` extendido con namespace `--canon-*` + asesor extensions (zero breaking Dopamine v5.1 OKLCH preservado co-existence)
- `shared/ui/motion/`: BlurText, FadeUp, StaggerContainer, Marquee + hooks useInView, use3DTilt + barrel index
- `shared/ui/primitives/canon/`: Card, Button (CVA 4 variants × 3 sizes), ScorePill (5 tiers), MomentumPill (3 directions), GlassOverlay, IconCircle (6 tones × 3 sizes), cn util + barrel index
- `app/fonts.ts` + `app/layout.tsx`: Outfit + DM Sans via `next/font/google` (zero CDN)
- `CLAUDE.md` Frontend canon section actualizado con ADR-050 + 12 reglas inviolables
- `docs/referencias-ui/M*.tsx`: deprecated header banners (BIBLIA DECISIÓN 2 — preservar layout structure como referencia, visual SUPERSEDED)

**12 reglas inviolables canon (ADR-050 §2.8):**
1. Buttons SIEMPRE pill 9999px. 2. Brand gradient SOLO indigo→rose 90deg. 3. Cero emoji UI. 4. Transforms SOLO Y axis. 5. Motion ≤ 850ms cap. 6. once:true viewport-triggered. 7. Hardcoded colors prohibido. 8. Numerical respect (Outfit 800 + tabular). 9. AI signal differentiation (violet glow). 10. Disclosure flag synthetic data. 11. Keyboard-first kbd. 12. prefers-reduced-motion respected.

**BIBLIA DECISIÓN 2 respetada** (no borrar): primitives Dopamine `shared/ui/primitives/{card,button,...}.tsx` consumidos por 20+ features preservados. Migration gradual feature-by-feature en F2 implementation. Banner deprecated en `docs/referencias-ui/M*.tsx` apunta a layout structure válido + visual SUPERSEDED ADR-050.

**Status DECISIÓN N+4:** Shipped (tag `fase-13.A-complete`). Próximo FASE 13.B M01 Dashboard Asesor "Command Center" (~8-10h CC) — Hero Pulse + KPI Strip + Pipeline Carousel + Daily Standup + Performance Today + 10 innovaciones visuales.

---

## DECISIÓN N+5 — DMX Studio Pricing canon + DMX IA Add-on separado (2026-04-28)

**Status:** FASE 14.F.12 cierre master. Tag esperado `fase-14-complete` post-merge (cierra FASE 14 entera Portal Asesor M06-M10 + M21 DMX Studio).

### Studio Pricing canon — 3 tiers MXN

| Tier | Precio MXN/mes | Audiencia | Cohort especial |
|---|---|---|---|
| **Studio Founder** | $997 | Asesor entry-level individual | Lifetime grandfathered primeros 100 |
| **Studio Pro** | $2,497 | Asesor activo profesional | Sin cohort especial |
| **Studio Agency** | $5,997 | Brokerage multi-user / multi-brand | DMX IA Add-on bundled por default |

Cada plan Studio incluye acceso completo a **DMX CRM basic** (M01 Captación + M02 Operaciones + M03 Leads + M04 Compradores + M05 Cartera + M06 Marketing + M07 Reportes + M08 Settings + M09 Onboarding asesor). Studio Founder + Pro **NO bundlean** features de IA predictiva — esa capa es Add-on separado opcional.

### DMX IA Add-on — decisión separada (canon ADR-058)

Catálogo IA propio DMX (denominado coloquialmente "DMX IA") es **paid tier add-on opcional**, NO incluido por default en Studio Founder/Pro. Features cubiertas:

- **Atlas predictive scoring** zona+desarrollo H1-H6 horizontes con benchmarks colonia.
- **Copilot semantic search** matchings inversionistas vía embeddings + reranking.
- **Smart Matching** auto recomendación búsqueda↔unidad disponible vía Claude tool-use.
- **AI Agents** portal asesor: agentes autónomos generación reportes + outreach personalizado + qualification leads.
- **Anomaly detection** mercado: alertas pricing zona + outliers comportamiento.

**Razones para tier separado** (rationale completo en [ADR-058 §Context](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md)):

1. **Margen sostenibilidad cohort grandfathered.** Cada call Claude Sonnet 4 cuesta ~$0.05-$0.20 USD reales (memoria canon `feedback_airroi_cost_empirical`); bundlear unlimited en Founder $997 MXN romperia márgenes.
2. **Adopción gradual razor+blades.** Solo subset asesores Studio (estimate 10-30%) consumirá IA features con regularidad para justificar premium pricing.
3. **Pricing tier futuro TBD.** Founder defer decisión post-launch Studio cuando exista signal real demanda + data costo real per-asesor activo.
4. **Modular subscription canon ADR-008.** Schema actual `subscriptions.feature_set` jsonb + futuro `subscription_addons` permite extension sin breaking.
5. **Decision separation evita scope creep.** Mantener pricing IA decision separado simplifica F14.F.12 cleanup; agendado FASE 15+ portal developer monetization.

### Implications operativas H1 cierre

- **Sin migrations BD F14.F.12.** Schema `subscriptions` + `studio_users_extension` ya soporta extension via `feature_set` jsonb.
- **Sin Stripe price IDs nuevos.** DMX IA price IDs Stripe se crearán cuando founder defina pricing tier (post-launch).
- **Sin feature flag runtime F14.F.12.** Flag `DMX_IA_ENABLED` per user defer H2 cuando feature shippee.
- **Doc canon shipped.** ADR-058 + cross-ref `docs/M21_STUDIO/STUDIO_DMX_IA_INTEGRATION.md` (explicación qué incluye Studio vs DMX IA para founder/asesores/sales).

### Roadmap activación DMX IA Add-on H2

1. Founder define pricing concreto Light / Standard / Pro post-launch Studio (sketch en ADR-058 §Decision orientativo, no commitment).
2. Stripe price IDs DMX IA hardcoded en `features/dmx-ia/lib/stripe-products.ts` (futuro, ADR-053 unified pattern).
3. Feature flag `DMX_IA_ENABLED` per user (default false; Agency plan auto-activa post-checkout webhook).
4. UI canon `PlanPaywallCanon` en features gated cuando Founder/Pro intentan acceder Atlas/Copilot/Smart Matching.
5. Disclosure flag canon ADR-018 visible en cada call que consume tokens Claude (cost transparency obligatoria).
6. Telemetría adoption Studio Founder → Pro → Agency + DMX IA Add-on para iterar pricing data-driven.

### Cross-refs canónicos

- **[ADR-058](../01_DECISIONES_ARQUITECTONICAS/ADR-058_DMX_IA_ADD_ON_PRICING_TIER.md)** — DMX IA Add-on canon decision (este registro es resumen ejecutivo).
- **[ADR-054](../01_DECISIONES_ARQUITECTONICAS/ADR-054_DMX_STUDIO_INTEGRATED_WITHIN_DMX.md)** — Studio dentro DMX único entorno.
- **[ADR-053](../01_DECISIONES_ARQUITECTONICAS/ADR-053_FEATURE_MODULE_PATTERN_UNIFIED.md)** — Feature module pattern unified (futuro `features/dmx-ia/`).
- **[ADR-018](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md)** — E2E connectedness + STUBs 4 señales canon.
- **[ADR-008](../01_DECISIONES_ARQUITECTONICAS/ADR-008_MONETIZATION_FEATURE_GATING.md)** — Monetization tiers canon.
- **`docs/M21_STUDIO/STUDIO_DMX_IA_INTEGRATION.md`** — Doc explicativo founder/asesores qué incluye cada tier.

**Status DECISIÓN N+5:** Shipped (cierre F14.F.12 master tag `fase-14-complete` post-merge). Próximo: FASE 15 Portal Desarrollador M11-M15 (multi-agent canon).

---

## DECISIÓN N+6 — FASE 15 v3 Onyx-Benchmarked + FASE 18 M21 After-Sales (2026-04-28)

### Contexto: Audit Onyx Technologies vs DMX

Audit competitivo Onyx Technologies (Montréal CA, $60B+ inventario, 135K unidades, 50+ devs activos, clientes Four Seasons + QuadReal + Parkbridge + DevMcGill, mercados CA/EUA/UAE/KSA/FR/GR, idiomas EN+FR únicamente — **NO ES → ventaja LATAM moat DMX**) realizado 2026-04-28 contra documento autoritativo founder y HTML feature map. Resultado: 50 features distribuidas en 10 módulos.

**Status DMX vs Onyx:**
- ✅ Shipped equivalente: 8 features
- 🟡 Canon FASE 15 planeado (no shipped): 11 features
- 🟠 Parcial shipped: 11 features
- 🔴 Gap real: 20 features

**Métricas anchor declaradas Onyx (priorización por business impact):**
+15% revenue/u dynamic pricing | +20% absorción IA pricing | -30% ciclo journeys | +30% eficiencia unit map | -25% ciclo brokers | 21x conversión <5min | +20% velocidad decisión analytics | +35% retención property mgmt

**DMX SUPERA estructuralmente Onyx en 10 áreas (NO catch-up):**
1. Intelligence Engine 15 índices DMX + 5 niveles N1-N5 AI scores
2. Atlas público + Constellations 43K edges
3. DMX Studio Director IA Video (único LATAM)
4. CFDI 4.0 + Facturapi + AML/UIF + ESG nativo MX
5. Multi-país día 1 (5 locales, 4 cities expansion shipped F14.1)
6. Open data LATAM masivo (76K climate + 226 INEGI + 208 ENIGH + 43K constellations)
7. B07 Competitive Intel 8 dimensiones
8. B08 Absorption Forecast 12-24m + 3 escenarios
9. B12 Cost Tracker INEGI INPP real-time
10. Trust Score H05 desarrolladora 5 categorías

### Cancelaciones founder lock-in 2026-04-28

❌ M1.1.4 Tours virtuales 360°/Matterport (no entra ni H1 ni H2 — defer indefinido)
❌ M4.4.4 Background checks biométricos identidad ventas (no H1)
❌ M4.4.5 Tenant screening rentas (no H1, alineado Gate-9)

### Decisiones canon aplicadas (memoria 19 zero preguntas)

**ADR-060 FASE 15 v3 onyx-benchmarked:** Integrar 7 upgrades onyx-inspired Bucket B + 4 cross-functions descubiertas en audit como scope adicional FASE 15 original.

- Bucket B 7 upgrades priorizados business impact:
  - 🥇 B.6 Lead scoring C01 IA shipped real (anchor 21x conv <5min) — 8-12h
  - 🥇 B.7 Journey builder visual básico (anchor -30% ciclo) — 16-20h
  - 🥇 B.4 Ad spend multi-touch + Claude IA pause (anchor optimiz directa) — 10-14h
  - 🥈 B.1 Worksheets brokers (anchor -25% ciclo brokers) — 8-10h
  - 🥈 B.2 Unit-level demand heatmap (anchor +30% eficiencia) — 6-8h
  - 🥈 B.3 Contracts e-sign Mifiel + smart pre-fill (anchor smart templates) — 12-16h
  - 🥉 B.5 Export BI Power BI/Tableau/Looker (anchor enterprise unlock) — 4-6h
- 4 cross-functions:
  - CF.1 Smart contract pre-fill ↔ M07 Operaciones (incluido B.3)
  - CF.2 DMX Studio video AI ↔ M14 Marketing Dev (3-5h, 15.D.4 nuevo, **diferenciador único LATAM**)
  - CF.3 Atlas + Constellations ↔ Site Selection AI (4-6h, extiende 15.A.4)
  - CF.4 Trust Score H05 + Lead score → Worksheet priority sort (1-2h, incluido B.1)

**ADR-061 FASE 18 M21 After-Sales dedicada:** Insertar FASE 18 nueva en slot vacío post FASE 17 (zero desplazamiento fases 19-28). Scope completo Onyx M7 8 features + cross-fn shipped (M03/M06/M09/M12/M14/M15).

- 8 bloques FASE 18:
  - 18.A Portal cliente branded + auth role
  - 18.B Selección acabados self-serve + CFDI auto-emit (único LATAM)
  - 18.C Inspecciones pre-entrega PWA offline
  - 18.D Solicitudes mantenimiento + work orders
  - 18.E Portal subcontratistas (invite-only H1)
  - 18.F AI chatbot post-venta 24/7 Claude RAG
  - 18.G AI task management subcontratistas
  - 18.H Insights data-driven cross-fn M09/M15
- Wall-clock estimado FASE 18: ~50-60h CC-A multi-agent canon paralelo.

### Decisiones producto founder lock-in (D.1-D.11)

| D | Decisión | Lock-in |
|---|---|---|
| D.1 | Buyer self-serve checkout | defer FASE 22 |
| D.2 | M21 After-Sales como FASE 18 nueva | SÍ (ADR-061) |
| D.3 | Bucket B 7 upgrades completo | SÍ COMPLETO |
| D.4 | Pricing dev tiers ↔ Studio canon | Opción C híbrida — Pro+ dev = Studio Pro bundled |
| D.5 | Property mgmt leasing | defer H2 (Gate-9 vigente) |
| D.6 | Managed marketing services | defer H2 (modelo negocio) |
| D.7 | Smart contract pre-fill engine integrado B.3 | SÍ (+4-6h ya contado) |
| D.8 | CF.2 Studio video auto en M14 | SÍ (3-5h, 15.D.4 nuevo) |
| D.9 | CF.3 Atlas constellations en Site Selection AI | SÍ (4-6h, extiende 15.A.4) |
| D.10 | CF.4 Worksheet priority sort Trust+Score | SÍ (1-2h, incluido B.1) |
| D.11 | 9 notif types nuevos (17-25) seed | SÍ |

### Multi-agent canon execution FASE 15 v3 (3 olas)

🌊 OLA 1 paralelo 3 ventanas branches independientes (~20h):
- CC-A 1 `feat/fase-15-m11-inventario`: M11 + B.2
- CC-A 2 `feat/fase-15-m13-crm`: M13 + B.6 + B.7
- CC-A 3 `feat/fase-15-m15-analytics`: M15 7 tabs + Dynamic Pricing + Competitor Radar

🌊 OLA 2 secuencial sobre ola 1 (~20h):
- 15.A Layout + Dashboard + Trust Score H05 real + Site Selection AI con CF.3
- 15.C Canal distribución + B.1 Worksheets + CF.4 priority sort
- 15.D.2 M14 Marketing + B.4 ad spend + CF.2 Studio video
- 15.G.3 B.3 Contracts e-sign Mifiel + smart pre-fill

🌊 OLA 3 final (~10h):
- 15.F UPG 7.10 9 herramientas
- 15.X Moonshots (Simulador + Radar + Reporte Comité + Pipeline Tracker + API Enterprise)
- 15.G Upload docs + Contabilidad pin stub Fase 16
- 15.H Plans seed + feature gating + B.5 BI export
- Seed 9 notif types nuevos
- Tag `fase-15-onyx-benchmarked`

### Wall-clock estimado FASE 15 v3 onyx-benchmarked

~50-60h CC-A multi-agent canon paralelo / ~140-180h secuencial / ~5-7 días calendario.

### Bucket C — 18 L-NEW H2 distribuidos por destino concreto

Documentados en `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` v3 append:
- FASE 18 (nueva): 5 L-NEW (sub-features after-sales)
- FASE 21 (M19): 1 (buyer self-serve checkout)
- FASE 22.A Banking: 1 (Stripe deposits + escrow)
- FASE 24 SRE: 1 (anomaly detection)
- H2 sin fase específica: 10 (property mgmt leasing + ML personalization + market studies + custom dashboards + managed services + multi-currency BI + ventas+leasing unified workflow + 3 sub more)

### Roadmap H1 launch impact

Estimación H1 launch restante pre-decisión N+6: 250-400h CC + 3-6 meses calendario.
Estimación H1 launch restante post-decisión N+6: **300-460h CC + 4-7 meses calendario** (+1 mes para FASE 18 nueva catch-up After-Sales).

ROI: cierra el diferenciador #1 Onyx + posiciona DMX como "Market.Sell.Manage" (Lease defer H2) + diferenciador único LATAM CFDI auto-emit en finishes selection que ningún competidor global tiene.

### Documentos actualizados/creados decisión N+6

**Creados:**
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-060_FASE_15_BUCKET_B_ONYX_BENCHMARKED_INTEGRATION.md`
- `docs/01_DECISIONES_ARQUITECTONICAS/ADR-061_FASE_18_M21_AFTER_SALES_DEDICATED.md`
- `docs/02_PLAN_MAESTRO/FASE_18_AFTER_SALES_M21.md`
- `docs/04_MODULOS/M21_AFTER_SALES.md`

**Updated (append v3):**
- `docs/02_PLAN_MAESTRO/FASE_15_PORTAL_DESARROLLADOR.md` (Bucket B + 4 CF + 3 olas)
- `docs/04_MODULOS/M11_INVENTARIO_DEV.md` (B.2 demand heatmap)
- `docs/04_MODULOS/M13_CRM_DEV.md` (B.6 lead scoring + B.7 journey builder)
- `docs/04_MODULOS/M14_MARKETING_DEV.md` (B.4 ad spend + CF.2 Studio video)
- `docs/03_CATALOGOS/03.1_CATALOGO_BD_TABLAS.md` (18 tablas nuevas H1 forward)
- `docs/03_CATALOGOS/03.4_CATALOGO_BD_RLS.md` (~70 RLS policies + 13 SECDEF helpers nuevos)
- `docs/03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md` (~55 procedures nuevas)
- `docs/03_CATALOGOS/03.7_CATALOGO_CRONS.md` (9 crons nuevos)
- `docs/03_CATALOGOS/03.10_CATALOGO_UI_FEATURE_FLAGS.md` (16 flags nuevos)
- `docs/03_CATALOGOS/03.12_CATALOGO_NOTIFS_Y_WEBHOOKS.md` (18 notif types 17-34)
- `docs/03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md` (27 flows E2E nuevos)
- `docs/03_CATALOGOS/03.14_CASCADE_GRAPH.md` (8 cascadas nuevas)
- `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md` (18 L-NEW H2 onyx-derivados)
- `docs/02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md` (FASE 18 inserta + 47 fases total)
- `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` (este append decisión N+6)

### Cumplimiento canon

- Memoria 19 (zero preguntas): D.1-D.11 + cancelaciones aplicadas sin preguntar
- Memoria 11 (upgrades destino concreto): 18 L-NEW H2 con fase target específica
- Memoria 8 (zero deuda): HOTFIX UX onboarding Studio resuelto pre-ola 1
- Memoria 13 (escalable desacoplada): M11/M13/M15 paralelo en 3 ventanas independientes
- Memoria 22 (audit_rls_strict): allowlist v29+v30 mismo PR con SECDEF nuevas
- Memoria 27 (MCP apply_migration acceptable): 18 tablas nuevas via MCP pre-merge + types regen
- Multi-agent canon (3 ventanas branches independientes): respetado lockfile manual root.ts/migrations/types

**Status DECISIÓN N+6:** Aprobada founder 2026-04-28. Próximo: ejecución 3 olas FASE 15 v3 onyx-benchmarked + FASE 18 M21 After-Sales post-FASE 17.
