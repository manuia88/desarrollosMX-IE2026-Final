# BIBLIA DMX v5 — FRONTEND COMPLETO
## PART 2 de 2: Portales Dev + Admin + Comprador + Público + Features Transversales
## Contenido ÍNTEGRO de FRONTEND_DMX_v4_PART2
## Fase: Sesiones 14-19 (Portales)
---
# BIBLIA FRONTEND — DesarrollosMX v4
## Portales Dev · Admin · Comprador · Público · Features Transversales
## PART 2 de 2 (Módulos 5–6)
## Fecha: 8 abril 2026

---

# MÓDULO 5: PORTAL DESARROLLADOR + ADMIN + COMPRADOR + PÚBLICO

## 5.1 Portal Desarrollador (conservado v3 + IE expandido)

### Páginas

```
/desarrollador/dashboard         → RPC get_developer_dashboard + demand widget + trust score
/desarrollador/inventario        → Spreadsheet editable + unit_change_log + useRealtimeUnits
/desarrollador/inventario/[id]   → Detalle proyecto: 5 tabs (General, Unidades, Analytics, Docs, Canal)
/desarrollador/asesores          → BrokerPerformancePanel + register/release inhouse
/desarrollador/leads             → Leads del proyecto + assignment routing
/desarrollador/analytics         → 7 tabs IE: Absorción, Competencia, Costos, Demand, Pricing, Buyer Persona, Market Cycle
/desarrollador/documentos        → DocumentJobsList + DriveMonitorWidget + ExtractionReview
/desarrollador/perfil            → Trust Score editable + PROFECO + entregas + tiempo respuesta
/desarrollador/configuracion     → Webhooks + notificaciones + onboarding
/desarrollador/suscripcion       → Plan + Stripe portal
```

### IE Scores en Dashboard Dev

```
Dashboard layout:
  ┌───────────────────────────────────────────────────┐
  │ 6 KPI Cards: Revenue, Absorción, Quality, Leads,  │
  │              Trust Score, Margin Pressure          │
  ├───────────────────────────────────────────────────┤
  │ Demand Widget: "47 compradores buscan lo que       │
  │ vendes en tu zona" (B01 Demand Heatmap)           │
  ├───────────────────────────────────────────────────┤
  │ Absorption Forecast: gráfica 3 escenarios (B08)   │
  │ Competitive Matrix: mi proyecto vs top 3 (B07)    │
  ├───────────────────────────────────────────────────┤
  │ Cost Tracker: INPP sparkline + alerta (B12)       │
  │ Market Cycle: reloj 4 fases (B05)                 │
  └───────────────────────────────────────────────────┘
```

### Analytics Tabs (/desarrollador/analytics)

```
Tab Absorción:     B08 gráfica 3 escenarios, velocidad actual, meses para vender
Tab Competencia:   B07 tabla mi proyecto vs 5 competidores, 8 dimensiones
Tab Costos:        B12 INPP tracking, B02 margin pressure, alerta si margen decrece
Tab Demand:        B01 heatmap Mapbox, B04 PMF score + gap analysis
Tab Pricing:       B03 Pricing Autopilot por unidad, sugerencias + impacto
Tab Buyer Persona: B14/H14 perfil comprador típico, ingreso, financiamiento
Tab Market Cycle:  B05 fase actual + recomendación + B15 launch timing
```

### Sidebar Desarrollador (6 + 8 en "Más")

```
Principales: Dashboard, Inventario, Asesores, Leads, Analytics, Documentos
Más: Competitive Intel, Costos INPP, Perfil, Config (webhooks), Suscripción, Ayuda, Drive Monitor, Onboarding
Bottom nav mobile: Dashboard, Inventario, Asesores, Analytics, Más
```

## 5.2 Portal Admin (conservado v3 + observatory expandido)

### Páginas

```
/admin/dashboard                      → Platform metrics AARRR + alertas + revenue + API metrics
/admin/proyectos                      → Aprobación + lista global + preview
/admin/participantes                  → Profiles global + enforcement exclusividad
/admin/revenue                        → Revenue projection + Stripe dashboard link
/admin/inteligencia                   → Market Observatory (módulo más grande)
/admin/inteligencia/observatory       → 7 índices DMX en mapa Mapbox heatmap por zona
/admin/inteligencia/macro             → Macro series temporal: Banxico, INEGI, SHF, BBVA
/admin/inteligencia/zonas             → Zone ranking table + zone details drill-down
/admin/inteligencia/precios           → market_prices_secondary trends por zona
/admin/inteligencia/absorcion         → Absorción aggregate por zona
/admin/inteligencia/demanda           → Demand heatmap + supply-demand gap
/admin/inteligencia/tipologia         → Qué se busca vs qué se vende (gap analysis)
/admin/inteligencia/predicciones      → Anomalies + trends + momentum map
/admin/anomalias                      → AnomalyDetector feed con severity
/admin/cohorts                        → Cohort analysis por semana registro
/admin/config                         → SLA config + notification templates
/admin/api-metrics                    → API externa: requests/day, top consumers, revenue, errors (NUEVO v4)
/admin/api-keys                       → CRUD de api_keys para clientes B2B (NUEVO v4)
```

### Market Observatory (/admin/inteligencia/observatory)

```
Layout:
  ┌──────────────────────────────────────────────────────────────┐
  │ CitySelector dropdown: [CDMX ▼]                              │
  ├──────────────────────────────────────────────────────────────┤
  │ Mapa Mapbox full width con 7 layers toggleables:             │
  │   □ DMX-IPV (Precio-Valor)    □ DMX-IAB (Absorción)         │
  │   □ DMX-IDS (Desarrollo Social) □ DMX-IRE (Riesgo)          │
  │   □ DMX-ICO (Costo Oportunidad) □ DMX-MOM (Momentum) ✅     │
  │   □ DMX-LIV (Livability)                                     │
  │                                                               │
  │   [Mapa con heatmap por colonia del índice seleccionado]     │
  │   Hover en colonia → tooltip con score + trend + rank        │
  │   Click en colonia → drill-down con todos los scores         │
  ├──────────────────────────────────────────────────────────────┤
  │ Zone Ranking Table (sorteable por cualquier índice)          │
  │ #  | Zona        | IPV | IAB | IDS | IRE | ICO | MOM | LIV │
  │ 1  | Nápoles     | 78  | 72  | 81  | 85  | 65  | 67  | 82  │
  │ 2  | Del Valle C | 75  | 68  | 79  | 82  | 62  | 71  | 78  │
  │ ...                                                          │
  └──────────────────────────────────────────────────────────────┘
```

### Sidebar Admin (6 + 12 en "Más")

```
Principales: Dashboard, Proyectos, Participantes, Revenue, Inteligencia, Config
Más: Observatory, Macro, Zonas, Precios, Absorción, Demanda, Tipología,
     Predicciones, Anomalías, Cohorts, API Metrics, API Keys
Bottom nav mobile: Dashboard, Proyectos, Revenue, Inteligencia, Más
```

## 5.3 Portal Comprador (NUEVO en R8)

### Páginas

```
/comprador/dashboard        → Wishlist resumen + operaciones activas + Discover Weekly
/comprador/guardados        → Watchlist con score alerts + price change notifications
/comprador/operaciones      → Timeline visual tipo Amazon + document tracker
/comprador/pagos            → Payment plans + recordatorios
/comprador/documentos       → Document checklist de su operación
/comprador/simulador        → Investment Simulator 4 escenarios (A02)
/comprador/alcanza          → Affordability Calculator (A01) + Infonavit (H11)
/comprador/comparador       → Comparador multi-dimensional 2-5 proyectos (A08)
/comprador/hipotecas        → Hipotecas Comparador con datos Banxico reales (F16)
/comprador/perfil           → Datos personales + lifestyle preference + merge contacto
```

### Dashboard Comprador

```
Layout:
  ┌───────────────────────────────────────────────────┐
  │ "Hola [Nombre]" + Lifestyle badge [🏡 Familia]    │
  ├───────────────────────────────────────────────────┤
  │ Discover Weekly (si hay matches):                 │
  │ "3 proyectos que coinciden con tu búsqueda"       │
  │ ┌─────┐ ┌─────┐ ┌─────┐                          │
  │ │Proj1│ │Proj2│ │Proj3│  → cada uno con match %   │
  │ │ 89% │ │ 82% │ │ 76% │  + DMX Score + precio    │
  │ └─────┘ └─────┘ └─────┘                          │
  ├───────────────────────────────────────────────────┤
  │ Mis Guardados (3 cards):                          │
  │ [Proyecto A] Score 78 · $3.2M · ⚡ Precio bajó 3%│
  │ [Proyecto B] Score 82 · $4.1M · ● Sin cambios    │
  ├───────────────────────────────────────────────────┤
  │ Mi Proceso (si tiene operación activa):           │
  │ Timeline: ● Apartado → ● Enganche → ○ Contrato → │
  │ Próximo pago: $45,000 el 15/05/2026               │
  └───────────────────────────────────────────────────┘
```

### Ficha Proyecto vista Comprador (/proyectos/[id])

```
La ficha pública se personaliza por perfil del comprador (Netflix pattern):

Si lifestyle_preference = 'investor':
  Hero: ROI estimado prominente + 4 escenarios inversión
  Tab orden: Inversión → Zona → Unidades → Desarrolladora

Si lifestyle_preference = 'family':
  Hero: School Quality + Safety prominentes
  Tab orden: Zona (escuelas, seguridad) → Unidades → Inversión → Desarrolladora

Si lifestyle_preference = 'quiet':
  Hero: Walkability + Air Quality prominentes
  Tab orden: Zona (tranquilidad, aire, verde) → Unidades → Inversión

Default (sin perfil):
  Hero: DMX Score + Trust Score + Precio desde
  Tab orden: Unidades → Zona → Inversión → Desarrolladora

Todos ven:
  - LifestyleMatchSelector: "¿Qué te importa más?" → 6 botones → radar chart
  - Calculadora "¿Me Alcanza?" (A01)
  - Riesgos (H03 + F12 + N07)
  - TimingOptimizer (A07): "¿Comprar ahora o esperar?"
```

### Bottom nav Comprador (5 items)

```
Explorar, Guardados, Mi Proceso, Simulador, Perfil
```

## 5.4 Portal Público (expandido v4)

### Páginas

```
/                        → Homepage 12 secciones (conservado v3)
/explorar                → Marketplace con filtros + Mapbox + scores visibles
/proyectos/[id]          → Ficha proyecto 7 tabs (personalizada por perfil)
/precios                 → Tabla precios público (get_public_unit_summary)
/proyecto/[slug]         → Landing page dinámica (template + datos reales)
/asesores/[slug]         → Microsite asesor
/indices                 → Rankings públicos de zonas + metodología (NUEVO v4)
/metodologia             → Metodología abierta de índices DMX (NUEVO v4)
/auth/login              → Login
/auth/registro           → Registro multi-step
/auth/reset-password     → Reset password
/ayuda                   → FAQ por rol + búsqueda
```

### Homepage personalizada (Netflix pattern — NUEVO v4)

```
Si comprador autenticado con lifestyle_preference:
  Sección "Lo más buscado" → filtrado por perfil
  Sección "Explora por categoría" → categoría del perfil primero
  Sección "Zonas" → ordenadas por score relevante al perfil
  
  investor: zonas por ROI, "Para invertir" primero
  family: zonas por School Quality, "Zonas familiares" primero
  quiet: zonas por Air Quality, "Zonas tranquilas" primero

Si no autenticado: homepage default con orden genérico
```

### /explorar con scores IE (expandido v4)

```
Filtros expandidos:
  + "Zonas seguras" (F01 Safety >= 70)
  + "Buen valor" (F09 Value >= 60)
  + "Momentum positivo" (N11 >= 55)
  + "Walkable" (N08 >= 70)
  + "Para familias" (H01 >= 70 AND F01 >= 70)
  + DMX Score range slider (G01 min-max)

Cada ProjectCard en explorar muestra:
  - Foto + precio + ubicación + tipo (existente)
  - DMX Score badge (G01) — NUEVO v4
  - PriceFairness badge (A12) — NUEVO v4
  - Momentum micro-indicator si zona tiene momentum (N11) — NUEVO v4
```

### /indices — Rankings Públicos (NUEVO v4)

```
Página pública sin auth. Contenido que medios pueden citar.

Layout:
  Header: "DMX Índices — El estándar del mercado inmobiliario mexicano"
  CitySelector: [CDMX]
  
  7 secciones (una por índice):
  DMX-LIV Livability: Top 10 colonias + mapa
  DMX-MOM Momentum: Top 10 + trending arrows
  DMX-IPV Precio-Valor: Top 10 oportunidades
  DMX-IRE Riesgo: Top 10 menor riesgo
  DMX-IAB Absorción: Top 10 más rápidas
  DMX-IDS Desarrollo Social: Top 10
  DMX-ICO Costo Oportunidad: Top 10

  Cada sección: tabla ranking + mini heatmap + link "Ver metodología"
  
  Footer: "Datos actualizados al [fecha]. Metodología en /metodologia"
  CTA: "¿Quieres acceder a estos datos por API? Conoce DMX API"
```

---

# MÓDULO 6: FEATURES TRANSVERSALES

## 6.1 Personalización Homepage por Perfil (Netflix Pattern)

```
Implementación:
  1. profiles.lifestyle_preference almacena el perfil (set en onboarding o /perfil)
  2. Homepage server component lee el perfil del usuario autenticado
  3. Secciones se reordenan y filtran según perfil
  4. ProjectCard muestra la foto de amenidad más relevante al perfil
  5. Sin perfil → orden default

Componente: PersonalizedHomepage
  Props: { userProfile: { lifestyle_preference, buyer_persona_type } }
  Lógica: reorder sections + filter featured projects

Tracking: PostHog event 'homepage_personalized' con perfil → medir CTR por perfil
```

## 6.2 Discover Weekly Inmobiliario (Spotify Pattern)

```
Cron: discover_weekly_generate (lunes 8am)
Lógica:
  1. Para cada comprador con búsqueda activa:
  2. Ejecutar C03 Matching con sus criterios
  3. Filtrar: solo proyectos NO vistos antes y publicados últimos 30 días
  4. Top 3 matches → INSERT ai_generated_content(type='discover_weekly')
  5. Notificación email + in_app: "3 proyectos que coinciden con tu búsqueda"

Componente: DiscoverWeeklyCard
  Location: /comprador/dashboard (prominente) + email template
  Shows: 3 ProjectCards con match % + razón del match + CTA "Ver proyecto"

Tracking: 
  Click en proyecto sugerido → PostHog 'discover_weekly_clicked'
  → Si visita → 'discover_weekly_visited'
  → Si guarda → 'discover_weekly_saved'
  → Estas señales alimentan C03 para mejorar matching
```

## 6.3 DMX Wrapped Anual (Spotify Pattern)

```
Cron: annual_wrapped (1 enero)
Lógica:
  1. Agregar datos del año por zona y por usuario
  2. Generar narrativa AI con highlights del mercado

Contenido:
  Para el mercado:
    "Las 10 colonias con mayor apreciación del año"
    "La zona más buscada de CDMX fue [X] con [N] búsquedas"
    "DMX Score promedio subió de [X] a [Y]"
    "Se vendieron [N] unidades por $[X] millones"
  
  Para el asesor (si autenticado):
    "Tu zona más exitosa fue [X]: [N] operaciones"
    "Generaste $[X] en comisiones"
    "Tu streak más largo fue [N] días"
    "Desbloqueaste [N] badges"

Componente: DMXWrappedPage
  Route: /wrapped/2026 (pública, shareable)
  Animaciones: scroll-triggered reveals, counters animados, confetti en highlights
  Share buttons: WhatsApp, Twitter, Instagram story format
  
Objetivo: Contenido viral que posiciona DMX como referencia del mercado
```

## 6.4 Gamification Completa (Duolingo + Strava Pattern)

```
XP por acción:
  contacto_creado: 10       visita_agendada: 20      dossier_generado: 10
  busqueda_creada: 15       visita_realizada: 25      captacion_creada: 15
  feedback_registrado: 15   operacion_creada: 50      encuentro_registrado: 25
  respuesta_15min: 30       operacion_cerrada: 500    acm_solicitado: 10
  respuesta_60min: 15       tarea_completada: 10

Niveles: level = floor(log2(xp_total) + 1)
  Level 1: 0 XP, Level 5: ~16 XP, Level 10: ~512 XP, Level 20: ~524K XP

Streaks:
  Día de actividad = cualquier acción que genera XP
  Streak se rompe si no hay actividad en un día calendario
  Streak freeze: premium feature (1 uso/mes en plan Pro)

Badges:
  🔥 Streak 7      — 7 días consecutivos
  🔥 Streak 30     — 30 días consecutivos
  🏆 Experto [Zona] — 10+ operaciones en una colonia
  ⚡ Speed Demon   — 10 respuestas en <15 min
  💰 Closer        — 5 operaciones cerradas
  📊 Data Lover    — 50 scores consultados
  🎯 Matcher       — 10 matches confirmados (cliente compró sugerencia)
  🏅 Top Monthly   — #1 en leaderboard mensual

Leaderboard:
  Ranking mensual por XP entre asesores del mismo equipo/zona
  Visible en /asesor/leaderboard
  Reset mensual (xp_this_month → 0, monthly_rank recalculado)
  
Componentes:
  GamificationWidget    — dashboard: XP bar + level + streak + badge reciente
  LeaderboardTable      — tabla ranking con avatar + nombre + XP + level
  BadgeGrid             — grid de badges earned (color) / locked (gris)
  StreakCounter          — flame icon animado + número
  XPNotification         — toast animado "+10 XP — Contacto creado"
  LevelUpModal          — modal celebración al subir de nivel
```

## 6.5 Auto-generación Piezas Marketing (inspirado Pulppo)

```
Pulppo genera automáticamente: Post Largo, Post Cuadrado, Story, Video Story

DMX v4 agrega datos IE a las piezas:

Componente: MarketingPieceGenerator
  Route: /asesor/inventario/[projectId] → Tab Marketing
  
  Tipos de pieza:
  1. Post Largo (1080×1350): foto hero + datos + DMX Score badge + precio
  2. Post Cuadrado (1080×1080): foto + 3 highlights IE (LQI, Safety, Investment)
  3. Story (1080×1920): foto full + overlay de scores + CTA
  4. Ficha PDF: resumen ejecutivo con scores IE + datos del proyecto
  5. Comparativa PDF: proyecto vs promedio zona (usando IE data)

  Generación: 
  - Templates HTML/CSS renderizados con datos reales
  - Scores IE embebidos como badges visuales
  - Download como imagen (html2canvas) o PDF (@react-pdf/renderer)

Datos IE incluidos en piezas:
  DMX Score, Trust Score, Price Fairness badge, Zone LQI,
  Safety score, Walkability, Investment yield, Momentum indicator
```

## 6.6 Conversaciones / Mensajería (inspirado Pulppo sidebar)

```
Pulppo tiene sidebar derecho con: calendario, conversaciones, anuncios, notificaciones, WhatsApp

DMX v4 implementa conversaciones en R4c (Inbox Unificado MVP):

Componente: InboxSidebar
  Location: sidebar derecho en portal asesor (55-60px collapsed, expandible)
  
  Items:
  📅 Calendario — próximas visitas/tareas del día
  💬 Conversaciones — threads con contactos (conversations + conversation_messages)
  📢 Anuncios — notificaciones del sistema
  🔔 Notificaciones — NotificationBell expandido
  
  Conversaciones thread:
  - Lista de contactos con último mensaje + unread count
  - Click → chat thread con mensajes
  - Tipos de mensaje: text, image, document, audio, cotización, ficha
  - WhatsApp link: wa.me/+52[telefono]?text=[pre-filled]
  
  Nota: NO es WhatsApp integrado (no Baileys, no Meta Cloud API en v4).
  Es mensajería interna de la plataforma + links a WhatsApp externo.
  WhatsApp integration real es R7a con Meta Cloud API.
```

## 6.7 Academia / Onboarding (inspirado Pulppo 3 niveles)

```
Pulppo tiene /academia con 3 niveles de cursos.

DMX v4 implementa:

Onboarding Asesor (3 pasos — conservado v3):
  Paso 1: Completa perfil (nombre, teléfono, foto, zona, lifestyle)
  Paso 2: Crea primer contacto
  Paso 3: Crea primera búsqueda → matching ejecuta → 3 sugerencias

Onboarding Desarrollador (3 pasos — conservado v3):
  Paso 0: Trial sin registro (demo extracción PDF)
  Paso 1: Upload PDF o link Drive
  Paso 2: Revisa tabla verde/amarillo/rojo
  Paso 3: Publicar

Academia (R10b):
  /asesor/academia — 3 niveles:
    Nivel 1 (Básico): "Cómo usar DMX" — Pipeline, Contactos, Tareas
    Nivel 2 (Intermedio): "Vende más con datos" — Scores IE, Dossier, Argumentario
    Nivel 3 (Avanzado): "Domina tu mercado" — Inteligencia, Comparador, Captaciones

  Formato: videos cortos (2-5 min) + quiz + XP reward por completar
  Gamification integrada: +50 XP por completar cada nivel
  Badge: 🎓 "Graduado DMX" al completar los 3 niveles

Tour guiado (react-joyride):
  Primera vez en cada sección: tooltips contextuales
  "Aquí ves tus prioridades del día"
  "Arrastra búsquedas entre columnas" (aunque DnD está validado)
  "Este score te dice si el precio es justo"
```

## 6.8 Navegación completa por portal

### Sidebar compartido (conservado v3)

```
Desktop: 240px expandido, dark navy #0F0F1A, Lucide icons
Tablet: 60px solo iconos
Mobile: hidden → bottom nav
Progressive disclosure: max 6 items principales + "Más"
```

### Items por portal (actualizado v4)

```
ASESOR (6 + 14):
  Principales: Dashboard, Pipeline, Contactos, Captaciones, Inventario, Operaciones
  Más: Tareas, Métricas, Calendario, Inteligencia, Comparador, Calculadora,
       Dossier IA, WhatsApp Kit, ACM, Leaderboard, Config, Perfil, Suscripción, Ayuda
  Bottom nav: Dashboard, Pipeline, Contactos, Captaciones, Más

DESARROLLADOR (6 + 8):
  Principales: Dashboard, Inventario, Asesores, Leads, Analytics, Documentos
  Más: Competitive Intel, Costos, Perfil, Config, Suscripción, Ayuda, Drive, Onboarding
  Bottom nav: Dashboard, Inventario, Asesores, Analytics, Más

MASTER BROKER (7 + 14):
  Principales: Dashboard, Pipeline, Contactos, Equipo, Captaciones, Inventario, Operaciones
  Más: (todo de asesor + Equipo/Registrar, Equipo/Pipeline, Equipo/Métricas)
  Bottom nav: Dashboard, Pipeline, Equipo, Contactos, Más

ADMIN (6 + 14):
  Principales: Dashboard, Proyectos, Participantes, Revenue, Inteligencia, Config
  Más: Observatory, Macro, Zonas, Precios, Absorción, Demanda, Tipología,
       Predicciones, Anomalías, Cohorts, API Metrics, API Keys, Usuarios, Leads Global
  Bottom nav: Dashboard, Proyectos, Revenue, Inteligencia, Más

COMPRADOR (5 bottom nav):
  Explorar, Guardados, Mi Proceso, Simulador, Perfil
```

## 6.9 AARRR Metrics por Portal (conservado v3 + expandido)

```
DESARROLLADOR:
  Acquisition: devs registrados (10/mes target)
  Activation: publica 1er proyecto <7 días (>60%)
  Retention: actualiza inventario ≥1x/mes (>70%)
  Revenue: fee por venta cerrada
  Referral: 20% traen 1+ dev

ASESOR:
  Acquisition: asesores registrados (50/mes)
  Activation: 1er contacto + 1ª búsqueda <3 días (>50%)
  Retention: ≥1 visita/semana por 4+ semanas (>40%)
  Revenue: suscripción → upgrade
  Referral: código referido

COMPRADOR:
  Acquisition: registros desde marketplace
  Activation: guarda 1er proyecto <24h (>30%)
  Activation 2: usa calculadora <48h
  Retention: regresa ≥1x/semana (>25%)
  Revenue: indirect (genera leads)
  Referral: comparte proyecto con amigo

NUEVO v4 — API:
  Acquisition: clientes API registrados
  Activation: primera query <24h
  Retention: queries/mes consistente
  Revenue: tier upgrade (free→starter→pro)
  Referral: mención en docs/blog del cliente
```

---

# CONTEO FINAL FRONTEND v4

```
Métrica                        | v3        | v4
───────────────────────────────┼───────────┼──────────
Portales                       | 4         | 5 (+ comprador)
Páginas total estimadas        | 60+       | 85+
Componentes compartidos        | ~20       | ~35
Componentes nuevos v4          | 0         | ~25 (scores, gamification, CRM, marketing)
Hooks existentes               | 10        | 10
Hooks nuevos v4                | 0         | 9
Total hooks                    | 10        | 19
Sidebar items (asesor)         | 6+12      | 6+14
Design tokens nuevos           | 0         | 7 (gamification + momentum colors)
Features transversales         | 0         | 6 (personalización, discover, wrapped,
                               |           |    gamification, marketing, academia)
```

---

# CROSS-REFERENCES FINALES

```
BIBLIA_IE_DMX_v4 (5 partes):
  → 107 scores + 7 índices que los componentes renderizan
  → Cascadas que disparan actualizaciones de la UI
  → Productos API que /indices y /metodologia exponen

BIBLIA_BACKEND_DMX_v4 (3 partes):
  → 16 tRPC routers que los hooks consumen
  → 107 tablas que las queries leen/escriben
  → 31 crons que actualizan datos y scores
  → RLS que protege acceso por rol

BIBLIA_FRONTEND_DMX_v4 (2 partes, este documento):
  PART 1: Design System + 19 Hooks + ~60 Componentes + Portal Asesor completo
  PART 2: Portales Dev/Admin/Comprador/Público + 6 Features Transversales
```

---

**FIN DE BIBLIA_FRONTEND_DMX_v4 (2 PARTES COMPLETAS)**

---

# ══════════════════════════════════════════════════════
# FIN DE BIBLIA_DMX_v4 COMPLETA
# 3 documentos · 10 archivos · ~13,000 líneas
# ══════════════════════════════════════════════════════

```
BIBLIA_IE_DMX_v4:       5 partes, 6,253 líneas
BIBLIA_BACKEND_DMX_v4:  3 partes, 2,614 líneas
BIBLIA_FRONTEND_DMX_v4: 2 partes, ~2,100 líneas
TOTAL:                  10 archivos, ~11,000+ líneas
```
