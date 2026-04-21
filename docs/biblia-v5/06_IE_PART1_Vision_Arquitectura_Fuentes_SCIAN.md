# BIBLIA DMX v5 — INTELLIGENCE ENGINE COMPLETO
## PART 1 de 5: Vision_Arquitectura_Fuentes_SCIAN
## Contenido ÍNTEGRO de IE_DMX_v4_PART1
## Fase: Sesiones 07-13 (IE)
---
# BIBLIA IE — DesarrollosMX v4
## Intelligence Engine: Visión · Arquitectura · Fuentes de Datos
## PART 1 de 5 (Módulos 1–3)
## Fecha: 8 abril 2026
## Supabase: `kcxnjdzichxixukfnenm`
## Repo: `git@github.com:manuia88/desarrollosmx-v8final.git` branch main
## Stack: Next.js 16, TypeScript strict, Tailwind v4, tRPC 11, Supabase, Mapbox GL JS

---

# ÍNDICE GENERAL (5 ARCHIVOS)

```
PART 1 (este archivo):
  MÓDULO 1: Visión Estratégica + Posicionamiento
  MÓDULO 2: Arquitectura 5 Capas + Queue/Worker
  MÓDULO 3: Fuentes de Datos (50+) + Mapeo SCIAN

PART 2 (BIBLIA_IE_DMX_v4_PART2.md):
  MÓDULO 4: Scores Nivel 0 (21 scores end-to-end)
  MÓDULO 5: Scores Nivel 1 (16 scores end-to-end)

PART 3 (BIBLIA_IE_DMX_v4_PART3.md):
  MÓDULO 6: Scores Nivel 2 (14 scores)
  MÓDULO 7: Scores Nivel 3 (12 scores)
  MÓDULO 8: Scores Nivel 4 (7 scores) + Nivel 5 (26 AI/content)

PART 4 (BIBLIA_IE_DMX_v4_PART4.md):
  MÓDULO 9: 11 Scores NUEVOS + Sistema de Snapshots Temporales
  MÓDULO 10: 7 Índices Propietarios DMX

PART 5 (BIBLIA_IE_DMX_v4_PART5.md):
  MÓDULO 11: 6 Cascadas + Tier System + Pre-carga
  MÓDULO 12: Productos Licenciables + DMX Estimate + API
  MÓDULO 13: Competencia Detallada + Fases H1/H2/H3
```

---

# MÓDULO 1: VISIÓN ESTRATÉGICA + POSICIONAMIENTO

## 1.1 Misión

**Construir la representación digital más precisa de las ciudades de México, y hacer que cada decisión que involucre una ubicación sea fundamentalmente mejor.**

DesarrollosMX no es un marketplace. No es un CRM. Es una plataforma de **Spatial Decision Intelligence** — el sistema operativo de inteligencia urbana que convierte cada metro cuadrado de México en información financieramente accionable.

## 1.2 Principio rector

**El marketplace es el canal de distribución del Intelligence Engine. El IE es el core business. Los datos temporales acumulados son el moat.**

Cada línea de código responde SÍ a al menos una:
1. ¿Genera datos que otro módulo consume?
2. ¿Consume datos que otro módulo genera?
3. ¿Reduce fricción para que un usuario genere más datos?
4. ¿Hace que un usuario tome una mejor decisión?
5. ¿Mide algo que nos ayuda a mejorar la plataforma? (AARRR)

Si la respuesta es NO a las cinco → no se construye.

## 1.3 La nueva categoría: Spatial Decision Intelligence

Antes de DMX, no existía una plataforma que combinara:
- Marketplace con transacciones reales (datos de demanda + oferta + conversión)
- Location intelligence con scores temporales (no estáticos — con momentum y dirección)
- Risk intelligence multi-fuente (sísmico + hídrico + legal + financiero + criminal)
- Ecosystem económico cuantificado (Shannon-Wiener sobre SCIAN)
- Calibración con datos propios de transacciones (cada venta confirma o ajusta el modelo)

CoStar ($35B) tiene transacciones pero no location intelligence. Local Logic tiene scores pero no temporalidad ni transacciones. Cherre conecta datos pero no genera insights. Walk Score tiene 3 scores estáticos desde 2007. First Street tiene riesgo climático pero no riesgo urbano integral. Ninguna plataforma en LATAM ni en el mundo cierra este loop completo para residential real estate.

**DMX IE es la primera plataforma que cierra este loop para un mercado de 130M de personas donde NADIE está haciendo esto.**

## 1.4 Los 3 shifts fundamentales

```
SHIFT 1: De datos a decisiones (Palantir)
  Antes: "Aquí hay datos del mercado, haz lo que quieras"
  Después: "Basado en 47 variables cruzadas, esta unidad está 12% subvaluada 
            respecto a su zona y el momentum de la colonia es +0.8σ. 
            Recomendación: comprar antes de Q3"

SHIFT 2: De scores estáticos a digital twin temporal (Tesla)
  Antes: "Walk Score 72" (mismo número desde 2018)
  Después: "DMX Score 78 (+3.2 vs hace 6 meses). La colonia está en fase 
            de sofisticación económica: +14% negocios premium, -8% básicos, 
            Crime Trajectory descendente. Momentum: positivo acelerado"

SHIFT 3: De plataforma a sistema operativo (iOS)
  Antes: "Un sitio web donde se listan propiedades"
  Después: "El iOS del espacio urbano: precios que se ajustan automáticamente 
            cuando un score cambia, marketing que se activa cuando hay 
            oportunidad, alertas que llegan antes de que el mercado se mueva"
```

## 1.5 Los 14 patterns cross-industry aplicados al IE

### Pattern 1: Data Flywheel (Amazon + Tesla + Netflix)

**Qué es:** Un ciclo donde más usuarios generan más datos, que mejoran el producto, que atraen más usuarios. Cada revolución hace el producto más difícil de replicar.

**Amazon:** Más compradores → más sellers → más selección → mejores precios → más compradores. Bezos lo dibujó en una servilleta en 2001. El flywheel genera $700B+/año.

**Tesla:** Cada Tesla es un sensor. 4B+ millas recorridas alimentan Full Self-Driving. Un competidor necesita años para acumular esos datos. Los clientes financian la flota de recolección.

**Netflix:** 80%+ del contenido visto viene de recomendaciones algorítmicas. El sistema ahorra $1B+/año en retención. Cada play, pause, skip entrena el modelo.

**Aplicación DMX IE:**
```
Nuestro flywheel:
  Más desarrollos listados → más búsquedas de compradores → más datos de demanda
  Más datos de demanda → mejores scores y predicciones → más valor para el usuario
  Más valor → más usuarios → más transacciones → calibración de modelos con resultados reales
  Modelos calibrados → predicciones más precisas → más confianza → más usuarios

Implementación concreta:
  - Cada búsqueda del comprador → search_logs → alimenta B01 Demand Heatmap
  - Cada filtro aplicado → PostHog event → señal de preferencia
  - Cada favorito → wishlist → señal de interés
  - Cada visita agendada → visitas_programadas → señal de intención
  - Cada venta cerrada → operaciones → calibración de modelos
  - Nada se pierde. Todo alimenta el flywheel.
```

### Pattern 2: Personalización como Producto (Netflix + Spotify)

**Netflix:** No solo recomienda películas. Personaliza el artwork — el mismo show muestra diferente poster a diferentes usuarios. CTR sube 20-30%. El orden de filas es único por usuario.

**Spotify Discover Weekly:** Cada lunes, 30 canciones que no has escuchado pero probablemente te gustan. Combina collaborative filtering + content-based filtering. Feature más amada de Spotify.

**Aplicación DMX IE:**
```
"Discover Weekly" inmobiliario:
  - Email/notificación semanal: "3 desarrollos que coinciden con tu perfil"
  - Lógica: C03 matching × búsquedas activas × historial de visitas × perfil financiero
  - Cron: weekly_buyer_matches (lunes 8am)
  - Tabla: ai_generated_content.type='discover_weekly'

Homepage personalizado por perfil de comprador:
  - Inversor: muestra ROI, rental yield, plusvalía primero
  - Familia: muestra school quality, safety, commute primero
  - Primer compra: muestra affordability, crédito, TCO primero
  - Lógica: user_scores.buyer_persona → determina orden de secciones
  - Componente: PersonalizedHomepage con props de perfil

Artwork personalizado:
  - El mismo desarrollo muestra la amenidad más relevante:
    · Gym para el joven
    · Jardín para la familia
    · Vista para el inversor
  - Lógica: fotos.ai_classification × buyer_persona → imagen hero
  - Componente: ProjectCard con prop heroImageSelector

"DMX Wrapped" anual:
  - Reporte viral del mercado inmobiliario estilo Spotify Wrapped
  - "Las 10 colonias con mayor Momentum este año"
  - "Tu zona subió 14% en Livability desde que compraste"
  - Cron: annual_wrapped (1 enero)
  - Componente: DMXWrappedPage con animaciones y share buttons
```

### Pattern 3: De Herramienta a Infraestructura (AWS + Stripe + Anthropic)

**AWS:** Amazon necesitaba servidores. Construyó infraestructura tan buena que la vendió como servicio. AWS genera $132B/año. La tienda fue el canal; la infraestructura fue el producto real.

**Stripe:** Empezó como "pagos fáciles". Hoy es la infraestructura financiera del internet. No compites con Stripe porque tu stack ya depende de ellos.

**Anthropic/OpenAI:** Los modelos son el producto. Pero el verdadero negocio es la API. Claude/ChatGPT son escaparates; la API es el revenue.

**Aplicación DMX IE:**
```
El marketplace = nuestro "Amazon store" → canal que genera datos y valida producto
El IE = nuestro "AWS" → infraestructura de inteligencia territorial vendible como API

Desde día 1:
  - IE como módulo independiente: /lib/intelligence-engine/ con API propia
  - DMX Livability API: cualquier portal, fintech, app puede consultar scores
  - El marketplace es el PRIMER cliente del IE, pero no el único
  - Pricing: freemium (100 queries/mes gratis) → paid ($5K-$50K/mes)

Endpoints API externos (R9c):
  GET /api/v1/scores/livability?lat=19.3756&lon=-99.1625
  GET /api/v1/scores/momentum?zone_id=benito_juarez_napoles
  GET /api/v1/scores/risk?lat=19.3756&lon=-99.1625
  GET /api/v1/estimate?lat=19.3756&lon=-99.1625&type=departamento&m2=80
  Auth: API key en header X-DMX-API-Key
  Rate limit: por plan (100/day free, 10K/day starter, unlimited enterprise)
  Tabla: api_keys (user_id, key_hash, plan, requests_today, created_at)
```

### Pattern 4: Crear la Unidad de Medida (Walk Score + Google PageRank + FICO)

**Walk Score:** Antes no existía forma de decir "esta ubicación es caminable". Walk Score creó escala 0-100. Hoy en Redfin, Zillow, Apartments.com. Cada punto = +$3,250 USD en valor.

**FICO:** Antes cada banco tenía su criterio. FICO estandarizó en 300-850. 90%+ de decisiones en USA usan FICO. Infraestructura invisible.

**Google PageRank:** Creó el algoritmo que ordenó internet. Se convirtió en cómo el mundo organiza información.

**Aplicación DMX IE:**
```
México no tiene un "Walk Score". No hay estándar para decir 
"Nápoles es 8.7 y Del Valle es 7.2" de forma verificable.

Si DMX crea ese estándar y los medios lo citan, los valuadores lo 
referencien, los asesores lo usen como argumento → nos convertimos 
en la unidad de medida del mercado inmobiliario mexicano.

"DMX Score" = número de 0-100 por ubicación:
  - Metodología pública y transparente (como S&P publica cómo calcula índices)
  - Reporte trimestral "DMX Índice de Colonias CDMX" para medios
  - Meta: en 2 años, "DMX Score 85" aparece en listings y presentaciones

Implementación:
  - G01 Full Score 2.0 = el "DMX Score" público
  - Publicar en /indices con metodología abierta
  - API gratuita para consultas básicas (gancho para API paid)
  - Newsletter mensual con rankings actualizados
```

### Pattern 5: Network Effects Multi-Sided (Nu Bank + Airbnb)

**Nu Bank:** 100M+ clientes. Cada cliente genera datos financieros → mejor modelo de riesgo → mejores tasas → más clientes. Nu no compite con bancos — compite con la falta de data.

**Airbnb:** Más hosts → más opciones → más viajeros → más ingresos para hosts → más hosts. El review system es infraestructura social irreplicable.

**Aplicación DMX IE:**
```
4 lados del network effect:
  1. COMPRADORES buscan → generan datos de demanda → mejoran scores
  2. ASESORES venden → generan datos de transacción → calibran modelos
  3. DESARROLLADORES listan → generan datos de oferta → alimentan competitive intel
  4. TERCEROS (bancos, aseguradoras) consumen API → validan el producto → credibilidad

Cada rol es un sensor:
  - El asesor genera datos de transacción invaluables
  - El desarrollador alimenta competitive intelligence de toda la zona
  - El banco que usa la API valida modelos con sus datos de default/performance
  - El comprador con cada búsqueda dice qué le importa del mercado
```

### Pattern 6: Contenido como Moat (Platzi + HubSpot)

**Platzi:** No vende cursos — vende transformación. Contenido gratuito atrae millones. Comunidad de 5M+ es el moat.

**HubSpot:** Blog genera millones de visitas. Se convierten en leads para CRM. CRM genera datos para más contenido. "Inbound marketing" se convirtió en categoría.

**Aplicación DMX IE:**
```
Los reportes del IE son contenido de altísimo valor:
  - "Las 10 colonias con mayor Momentum Index este trimestre" → Forbes México
  - "Cómo la crisis hídrica afecta precios por m²" → universidades citarían
  - "Mapa de gentrificación de CDMX 2026" → viralizable en redes

Implementación:
  - Reporte trimestral automático (cron: quarterly_market_report)
  - Blog con insights del IE (integrar con contenido de marca personal de Manu)
  - Newsletter semanal con 3 datos del IE + 1 oportunidad
  - "DMX Wrapped" anual viral
  - Posicionar a Manu como "el Freddy Vega del real estate inteligente"
```

### Pattern 7: OTA Updates (Tesla)

**Tesla:** Cada vehículo mejora sin ir al taller. Un día te despiertas y tu coche tiene nueva funcionalidad.

**Aplicación DMX IE:**
```
"Self-driving real estate":
  - Precios que se ajustan automáticamente cuando un score cambia
    → B03 Pricing Autopilot → notificación al dev: "Sugerimos bajar 3%"
  - Marketing que se activa cuando hay oportunidad
    → Momentum sube → email a compradores interesados en la zona
  - Alertas que llegan antes de que el mercado se mueva
    → Crime Trajectory mejora → "La zona se está volviendo más segura"

Cada vez que actualizamos un ingestor o mejoramos un calculator,
TODOS los scores se recalculan automáticamente para TODOS los usuarios.
No hay update manual. El producto mejora solo.
```

### Pattern 8: Gamification (Duolingo + Strava)

**Duolingo:** Streaks, XP, ligas, badges. Retención 3x superior.

**Strava:** Red social sobre datos de actividad. Segmentos, leaderboards, KOMs.

**Aplicación DMX IE:**
```
Gamification del asesor:
  - Streaks: "7 días consecutivos respondiendo leads en <60min" → badge
  - XP: puntos por cada acción (contacto creado: 10XP, visita: 25XP, venta: 500XP)
  - Ligas: ranking mensual entre asesores de la misma zona
  - Badges por zona: "Experto Nápoles" (>10 ventas en la colonia)
  - Leaderboard visible para MBs y entre asesores del mismo equipo

Implementación:
  - Tabla: asesor_gamification (user_id, xp_total, current_streak, badges[])
  - Cron: daily_streak_check → marcar streak roto si no hubo actividad
  - Componente: GamificationWidget en dashboard asesor
  - Notificación: "¡Felicidades! Desbloqueaste badge Experto Del Valle"
```

### Pattern 9: Feedback Loop Implícito (Cursor)

**Cursor:** Cada accept/reject del usuario entrena el modelo. El feedback loop más rápido posible.

**Aplicación DMX IE:**
```
Cada interacción del usuario es una señal de entrenamiento:
  - Accept de sugerencia de precio → valida B03 Pricing Autopilot
  - Reject de proyecto sugerido → C03 Matching aprende qué NO funciona
  - Búsqueda modificada → el filtro que agrega dice qué le importa
  - Tiempo en ficha de proyecto → engagement signal
  - Scroll depth en scores → qué datos le importan
  - Comparador: qué proyectos compara → revela preferencias

Todo se trackea via PostHog + search_logs + interaction_feedback.
El IE mejora con cada click sin que el usuario haga nada explícito.
```

### Pattern 10: Ontología (Palantir)

**Palantir ($400B+):** Objetos + relaciones, no tablas y filas. AIP bootcamps. 78 AI agents.

**Aplicación DMX IE:**
```
Ontología inmobiliaria DMX:
  OBJETOS: Proyecto, Unidad, Zona, Asesor, Comprador, Desarrolladora, Score
  RELACIONES: 
    Proyecto ←ESTÁ_EN→ Zona
    Unidad ←PERTENECE_A→ Proyecto
    Asesor ←AUTORIZADO_EN→ Proyecto
    Comprador ←BUSCA→ Criterios
    Criterios ←MATCH→ Unidad
    Score ←CALCULA→ Zona/Proyecto/Unidad
    Score ←DEPENDE_DE→ Score (cascade)
    Transacción ←CALIBRA→ Score

Pensar en OBJETOS y RELACIONES, no en tablas:
  - Un objeto Zona tiene N scores, M proyectos, K transacciones
  - Un score tiene inputs, outputs, dependencias, suscriptores
  - Una transacción calibra múltiples scores simultáneamente
  - El Knowledge Graph DMX conecta todo

Futuro (H3): DMX Knowledge Graph como producto licenciable
  - Consulta: "¿Qué zonas tienen DMX-MOM positivo Y DMX-IRE bajo Y school_premium alto?"
  - La ontología permite consultas que cruzan dominios
```

### Pattern 11: Simplicidad (Nu Bank)

**Nu Bank:** Simplificó decisiones de crédito. Datos → mejor riesgo → mejores tasas → más clientes.

**Aplicación DMX IE:**
```
Simplificar la decisión de compra:
  - "¿Me alcanza?" → A01 Affordability en 1 click
  - "¿Es buen precio?" → A12 Price Fairness badge verde/amarillo/rojo
  - "¿Es buena zona?" → F08 Life Quality Index en escala simple
  - "¿Cuánto voy a ganar?" → A02 Investment Sim con 4 escenarios

El comprador no necesita entender 97 scores.
Necesita 4 respuestas simples con datos reales detrás.
```

### Pattern 12: API como Producto (Anthropic/OpenAI)

**Aplicación DMX IE:**
```
IE como API consumible por terceros:
  - Cada consulta al API es un dato que mejora el modelo
  - Pricing por uso (como tokens de API)
  - Terceros que integran DMX scores en sus plataformas
    no pueden dejar de usarlo sin degradar su producto
  
Endpoints:
  /v1/scores/livability    → score 0-100 + components
  /v1/scores/momentum      → dirección + velocidad de cambio
  /v1/scores/risk          → riesgo compuesto por lat/lon
  /v1/estimate             → AVM con confidence + Value by Conditions
  /v1/neighborhood-report  → reporte completo de zona
  /v1/compare              → comparación multi-zona
```

### Pattern 13: Hardware que Financia Software (Tesla)

**Aplicación DMX IE:**
```
El marketplace (hardware) financia el IE (software):
  - Ingresos por suscripción de asesores y desarrolladores
  - Fee por transacción
  - Estos ingresos financian el desarrollo del IE
  - Cuando el IE se monetiza solo (API + productos), el marketplace
    se convierte en canal de distribución, no en revenue principal
  
Timeline:
  H1: Marketplace genera 100% del revenue
  H2: Marketplace 70% + IE API 30%
  H3: Marketplace 40% + IE API + Productos 60%
```

### Pattern 14: Crear el Estándar del Mercado (Google)

**Aplicación DMX IE:**
```
"DMX Score" = el "PageRank" del real estate mexicano
  - Organizar TODA la información inmobiliaria de México en un solo lugar
  - Ser la respuesta por defecto a "¿cómo está esta zona?"
  - Que los medios citen "según el DMX Score"
  - Que los valuadores referencien los índices DMX
  - Que los bancos usen DMX Risk Score para decisiones de crédito
```

## 1.6 El Flywheel Completo

```
                    ┌─────────────────────────────┐
                    │   CONTENIDO (reportes,       │
                    │   blog, newsletter, PR,      │
                    │   DMX Wrapped, academia)     │
                    └──────────┬──────────────────┘
                               │ atrae
                               ▼
┌──────────────┐    ┌─────────────────────────────┐    ┌──────────────┐
│DESARROLLADORES│──→│     MARKETPLACE DMX          │←──│  COMPRADORES │
│ (listan      │    │  (búsquedas, visitas,        │    │ (buscan,     │
│  proyectos)  │    │   ventas, interacciones,     │    │  comparan,   │
└──────┬───────┘    │   feedback, captaciones)     │    │  compran)    │
       │            └──────────┬──────────────────┘    └──────┬───────┘
       │                       │ genera datos                  │
       │                       ▼                               │
       │            ┌─────────────────────────────┐            │
       │            │   INTELLIGENCE ENGINE        │            │
       │            │  (108+ scores, momentum,     │            │
       │            │   risk, livability, AVM,     │            │
       │            │   predicciones, Knowledge    │            │
       │            │   Graph)                     │            │
       │            └──────────┬──────────────────┘            │
       │                       │                               │
       │            ┌──────────┴──────────────────┐            │
       │            │        DMX API               │            │
       │            │  (scores por lat/lon,        │            │
       │            │   AVM, reports, risk)        │            │
       │            └──────────┬──────────────────┘            │
       │                       │ consume                       │
       │                       ▼                               │
       │            ┌─────────────────────────────┐            │
       └────────────│   TERCEROS (bancos,         │────────────┘
                    │   aseguradoras, portales,    │
                    │   fintechs, gobierno,        │
                    │   valuadores, academia)      │
                    └──────────┬──────────────────┘
                               │ valida + credibilidad
                               ▼
                    ┌─────────────────────────────┐
                    │   MÁS USUARIOS EN            │
                    │   EL MARKETPLACE             │
                    └─────────────────────────────┘
```

**Cada revolución del flywheel:**
- Genera más datos → mejores modelos
- Acumula más historial temporal → mayor moat
- Calibra predicciones con resultados reales → más precisión
- Posiciona la marca como autoridad → más usuarios
- Atrae terceros que validan el producto → más credibilidad

---

# MÓDULO 2: ARQUITECTURA 5 CAPAS + QUEUE/WORKER

## 2.1 Arquitectura del Intelligence Engine — 5 capas

```
CAPA 1: FUENTES EXTERNAS (50+ fuentes)
  ├── Macro (7): Banxico, INEGI, SHF, BBVA Research, CNBV, Infonavit, FOVISSSTE
  ├── Geo (17): DENUE, FGJ, GTFS, Atlas Riesgos, SIGED, DGIS, SACMEX, PAOT, 
  │             SEDEMA, CONAGUA, INAH, *0311 Locatel, Uso Suelo, Catastro, 
  │             RAMA, PROFECO, Mapbox Traffic
  ├── Mercado (4): Inmuebles24/Mudafy, AirDNA, Google Trends, Cushman & Wakefield
  ├── Propias (12): projects, unidades, busquedas, operaciones, contactos, 
  │                 visitas_programadas, interaction_feedback, search_logs, 
  │                 project_views, wishlist, unit_change_log, inventory_snapshots
  └── Futuras H2 (10+): SEDUVI, EcoBici, Waze, Google Street View, 
                         Permisos construcción, Catastro dinámico, 
                         Social media sentiment, Weather API

  Almacenamiento: macro_series, geo_data_points, market_prices_secondary, 
                  str_market_data, search_trends, office_market_data
  Frecuencia: diaria → anual según fuente
  Ingesta: cron jobs + API calls + admin upload + scraping

CAPA 2: DATOS PROPIOS DE LA PLATAFORMA
  └── Tiempo real — cada interacción genera datos
  └── Tablas: projects, unidades, busquedas, operaciones, contactos, 
              visitas_programadas, interaction_feedback, search_logs, 
              project_views, wishlist, unit_change_log, inventory_snapshots,
              captaciones, propiedades_secundarias (NUEVO CRM integrado)
  └── PostHog events: page_view, search_performed, filter_applied, 
                      project_favorited, score_viewed, calculator_used

CAPA 3: SCORES CALCULADOS (108+ funciones)
  ├── Comprador (A01-A12): affordability, investment, migration, arbitrage, etc.
  ├── Desarrollador (B01-B15): demand, margin, pricing, absorption, etc.
  ├── Asesor (C01-C08): lead score, argumentario, matching, etc.
  ├── Mercado (D01-D10): market pulse, ranking, supply, gentrification, etc.
  ├── Agregados (E01-E08): full score, portfolio, predictive, anomaly, etc.
  ├── Zona (F01-F17): safety, transit, ecosystem, quality, risk, etc.
  ├── Full Score (G01-G05): score global, narrative, due diligence, etc.
  ├── Calidad Vida (H01-H16): schools, health, seismic, credit, trust, etc.
  ├── Productos (I01-I06): AVM, reports, feasibility, benchmark, etc.
  └── NUEVOS (N01-N11): ecosystem diversity, employment, gentrification velocity, etc.
  
  Almacenamiento: zone_scores, project_scores, user_scores
  Cada score: valor, fecha, inputs, confianza, trend, components

CAPA 4: ÍNDICES PROPIETARIOS (7 DMX indices)
  ├── DMX-IPV: Índice Precio-Valor (precio vs valor fundamental)
  ├── DMX-IAB: Índice Absorción Benchmark (velocidad venta vs benchmark)
  ├── DMX-IDS: Índice Desarrollo Social Integrado (calidad vida multidimensional)
  ├── DMX-IRE: Índice Riesgo Estructural (riesgo compuesto)
  ├── DMX-ICO: Índice Costo Oportunidad (inmobiliario vs alternativas)
  ├── DMX-MOM: Momentum Index (dirección + velocidad transformación urbana) — NUEVO
  └── DMX-LIV: Livability Index (calidad vida compuesta con $ impact) — NUEVO
  
  Almacenamiento: dmx_indices
  Publicación: trimestral, con metodología abierta

CAPA 5: CONSUMO (UI por rol + API externa)
  ├── Portal Asesor: scores como herramientas de venta + gamification
  ├── Portal Desarrollador: scores como inteligencia de negocio
  ├── Portal Comprador: scores como información de decisión
  ├── Portal Admin: scores como observatorio de mercado
  ├── Portal Público: scores como diferenciador del marketplace
  ├── API Externa: scores como producto licenciable B2B
  └── Contenido: scores como materia prima de reportes y newsletter
```

## 2.2 Estructura de carpetas del IE

```
/lib/intelligence-engine/
  ├── calculators/              ← funciones PURAS que calculan cada score
  │   ├── comprador/            ← A01-A12
  │   │   ├── affordability.ts
  │   │   ├── investment-sim.ts
  │   │   ├── price-fairness.ts
  │   │   ├── migration.ts
  │   │   ├── arbitrage.ts
  │   │   ├── tco.ts
  │   │   ├── neighborhood.ts
  │   │   ├── timing-optimizer.ts
  │   │   ├── comparador.ts
  │   │   ├── risk-score.ts
  │   │   ├── lifestyle-match.ts
  │   │   └── patrimonio.ts
  │   ├── desarrollador/        ← B01-B15
  │   │   ├── demand-heatmap.ts
  │   │   ├── margin-pressure.ts
  │   │   ├── pricing-autopilot.ts
  │   │   ├── product-market-fit.ts
  │   │   ├── market-cycle.ts
  │   │   ├── project-genesis.ts
  │   │   ├── competitive-intel.ts
  │   │   ├── absorption-forecast.ts    ← IMPLEMENTADO
  │   │   ├── cash-flow.ts
  │   │   ├── unit-revenue-opt.ts
  │   │   ├── channel-performance.ts    ← IMPLEMENTADO
  │   │   ├── cost-tracker.ts           ← IMPLEMENTADO
  │   │   ├── amenity-roi.ts
  │   │   ├── buyer-persona.ts
  │   │   └── launch-timing.ts
  │   ├── asesor/               ← C01-C08
  │   │   ├── lead-score.ts
  │   │   ├── argumentario.ts
  │   │   ├── matching.ts
  │   │   ├── objection-killer.ts
  │   │   ├── weekly-briefing.ts
  │   │   ├── commission-forecast.ts
  │   │   ├── activity-score.ts
  │   │   └── dossier.ts
  │   ├── mercado/              ← D01-D10
  │   │   ├── market-pulse.ts
  │   │   ├── zona-ranking.ts
  │   │   ├── supply-pipeline.ts
  │   │   ├── cross-correlation.ts
  │   │   ├── gentrification.ts
  │   │   ├── affordability-crisis.ts
  │   │   ├── str-ltr.ts
  │   │   ├── foreign-investment.ts
  │   │   ├── ecosystem-health.ts
  │   │   └── api-gateway.ts
  │   ├── agregados/            ← E01-E08
  │   │   ├── full-project-score.ts
  │   │   ├── portfolio-optimizer.ts
  │   │   ├── predictive-close.ts
  │   │   ├── anomaly-detector.ts
  │   │   ├── market-narrative.ts
  │   │   ├── developer-benchmark.ts
  │   │   ├── scenario-planning.ts
  │   │   └── auto-report.ts
  │   ├── zona/                 ← F01-F17
  │   │   ├── safety.ts
  │   │   ├── transit.ts
  │   │   ├── ecosystem-denue.ts
  │   │   ├── air-quality.ts
  │   │   ├── water.ts
  │   │   ├── land-use.ts
  │   │   ├── predial.ts
  │   │   ├── life-quality-index.ts
  │   │   ├── value-score.ts
  │   │   ├── gentrification-2.ts
  │   │   ├── supply-pipeline-zone.ts
  │   │   ├── risk-map.ts
  │   │   ├── commute.ts
  │   │   ├── neighborhood-change.ts
  │   │   ├── transit-redundancy.ts
  │   │   ├── hipotecas-comparador.ts
  │   │   └── site-selection.ts
  │   ├── full-score/           ← G01-G05
  │   │   ├── full-score-2.ts
  │   │   ├── narrative-2.ts
  │   │   ├── due-diligence.ts
  │   │   ├── zone-comparison.ts
  │   │   └── impact-predictor.ts
  │   ├── calidad-vida/         ← H01-H16
  │   │   ├── school-quality.ts
  │   │   ├── health-access.ts
  │   │   ├── seismic-risk.ts
  │   │   ├── credit-demand.ts
  │   │   ├── trust-score.ts            ← IMPLEMENTADO
  │   │   ├── city-services.ts
  │   │   ├── environmental.ts
  │   │   ├── heritage-zone.ts
  │   │   ├── commute-time.ts
  │   │   ├── water-crisis.ts
  │   │   ├── infonavit-calc.ts
  │   │   ├── zona-oportunidad.ts
  │   │   ├── site-selection-ai.ts
  │   │   ├── buyer-persona.ts
  │   │   ├── due-diligence.ts
  │   │   └── neighborhood-evolution.ts
  │   ├── productos/            ← I01-I06
  │   │   ├── dmx-estimate.ts
  │   │   ├── market-report.ts
  │   │   ├── feasibility-report.ts
  │   │   ├── benchmark-report.ts
  │   │   ├── insurance-risk.ts
  │   │   └── valuador.ts
  │   └── nuevos/               ← N01-N11 (NUEVOS v4)
  │       ├── ecosystem-diversity.ts
  │       ├── employment-accessibility.ts
  │       ├── gentrification-velocity.ts
  │       ├── crime-trajectory.ts
  │       ├── infrastructure-resilience.ts
  │       ├── school-premium.ts
  │       ├── water-security.ts
  │       ├── walkability-mx.ts
  │       ├── nightlife-economy.ts
  │       ├── senior-livability.ts
  │       └── momentum-index.ts
  ├── cascades/                 ← lógica de qué recalcular cuando algo cambia
  │   ├── unit-sold.ts
  │   ├── price-changed.ts
  │   ├── macro-updated.ts
  │   ├── geo-data-updated.ts
  │   ├── feedback-registered.ts
  │   └── search-behavior.ts       ← NUEVO v4
  ├── queue/                    ← procesador de la cola
  │   ├── worker.ts             ← loop: fetch pending → process → mark done
  │   ├── batch-processor.ts    ← recálculos masivos
  │   └── priority.ts           ← lógica de priorización
  ├── ingest/                   ← funciones de ingesta
  │   ├── index.ts              ← ingestAllMacro() barrel
  │   ├── banxico.ts            ← IMPLEMENTADO (4 series)
  │   ├── inegi.ts              ← IMPLEMENTADO (2 series)
  │   ├── shf.ts                ← STUB
  │   ├── imss.ts               ← STUB
  │   ├── geo-loader.ts         ← batch upsert idempotente (NUEVO v4)
  │   ├── denue.ts              ← NUEVO v4
  │   ├── fgj.ts                ← NUEVO v4
  │   ├── gtfs.ts               ← NUEVO v4
  │   ├── atlas-riesgos.ts      ← NUEVO v4
  │   ├── siged.ts              ← NUEVO v4
  │   ├── dgis.ts               ← NUEVO v4
  │   └── sacmex.ts             ← NUEVO v4
  ├── snapshots/                ← NUEVO v4: sistema de snapshots temporales
  │   ├── snapshot-manager.ts   ← crear/comparar snapshots
  │   └── delta-calculator.ts   ← calcular deltas entre ediciones
  ├── types.ts                  ← tipos compartidos
  ├── registry.ts               ← 108+ score definitions + CASCADE_DEFINITIONS
  ├── runner.ts                 ← registerCalculator() + runScore()
  ├── cascade.ts                ← getCascadeJobs() + enqueueCascade()
  └── index.ts                  ← exports públicos (ÚNICA interfaz con el resto del app)
```

**Regla arquitectónica:** Las API routes y los crons NUNCA contienen lógica de cálculo de scores. Solo importan de `@/lib/intelligence-engine`. El día que se necesite mover a un Edge Function worker o proceso separado, se mueve la carpeta y se cambia el entry point.

## 2.3 Queue/Worker Architecture

### Tabla: score_recalculation_queue

```sql
CREATE TABLE score_recalculation_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  score_type text NOT NULL,
  entity_type text NOT NULL,        -- 'zone' | 'project' | 'unit' | 'user'
  entity_id uuid NOT NULL,
  triggered_by text NOT NULL,       -- 'unit_sold' | 'price_changed' | 'macro_updated' | etc.
  priority integer DEFAULT 5,
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error_message text,
  attempts integer DEFAULT 0,
  last_error text,
  max_attempts integer DEFAULT 3,
  batch_mode boolean DEFAULT false,
  batch_filter jsonb,               -- {"score_type":"affordability","entity_type":"all_units"}
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_recalc_queue_pending 
  ON score_recalculation_queue(status, priority, created_at) 
  WHERE status = 'pending';
```

### Priorización

```
Priority 1: Score que el usuario está viendo AHORA (on-demand request)
  → useOnDemandScore hook → POST /api/scores/request-recalc → priority 1
  → Worker procesa inmediatamente → polling 3s hasta resultado

Priority 3: Cascada directa (unidad vendida → B08 del proyecto)
  → Trigger T6 o API route → enqueue_score_recalc() → priority 3

Priority 5: Cascada indirecta (B08 cambió → E01 del proyecto)
  → Runner detecta cambio > threshold → enqueue dependientes → priority 5

Priority 8: Batch masivo (Banxico → todos los A01)
  → Cron ingest_banxico → enqueueCascade('macro_updated') → priority 8
  → batch_mode=true → 1 SQL UPDATE masivo, no N jobs individuales

Priority 10: Refresh semanal programado
  → Cron zone_scores_weekly_refresh → todos los zone_scores → priority 10
```

### Batch Mode

```
En vez de encolar 15,000 jobs individuales cuando Banxico cambia tasa:
1. Encolar 1 job con batch_mode=true, batch_filter={"score_type":"affordability","entity_type":"all_units"}
2. Worker detecta batch_mode=true
3. Ejecuta: UPDATE project_scores SET ... FROM (SELECT calculation logic) WHERE score_type='affordability'
4. Un solo SQL statement que recalcula todos los affordability scores de golpe
5. Marca completado
```

### Worker (cron: score_recalculation_worker, cada 1 min)

```typescript
// app/api/cron/score-worker/route.ts
export async function GET(req: NextRequest) {
  // Auth: Bearer ${CRON_SECRET}
  
  // 1. Fetch pending jobs ordered by priority ASC, created_at ASC
  const { data: jobs } = await supabaseAdmin
    .from('score_recalculation_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(10);
  
  for (const job of jobs) {
    // 2. Mark as processing
    await supabaseAdmin.from('score_recalculation_queue')
      .update({ status: 'processing' }).eq('id', job.id);
    
    try {
      if (job.batch_mode) {
        // 3a. Batch processing
        await batchProcessor.process(job.batch_filter);
      } else {
        // 3b. Individual score calculation
        const result = await runScore(job.score_type, job.entity_type, job.entity_id);
        
        // 4. Check if score changed significantly → enqueue dependents
        if (result.changed && result.changePct > 5) {
          const cascadeJobs = getCascadeJobs(job.score_type, job.entity_id);
          for (const cj of cascadeJobs) {
            await enqueueScoreRecalc(cj.scoreType, cj.entityType, cj.entityId, 
              `cascade_from_${job.score_type}`, 5);
          }
        }
      }
      
      // 5. Mark completed
      await supabaseAdmin.from('score_recalculation_queue')
        .update({ status: 'completed', processed_at: new Date() }).eq('id', job.id);
    } catch (error) {
      // 6. Handle failure
      const attempts = job.attempts + 1;
      await supabaseAdmin.from('score_recalculation_queue')
        .update({ 
          status: attempts >= job.max_attempts ? 'failed' : 'pending',
          attempts,
          last_error: error.message
        }).eq('id', job.id);
    }
  }
}
```

## 2.4 Confidence Cascade

```
REGLA GENERAL:
  Si un score tiene confidence='insufficient_data', los scores dependientes
  heredan confidence='low' (no 'insufficient_data' — porque tienen ALGO de otros inputs).

EXCEPCIÓN:
  Si >50% de los inputs tienen confidence='insufficient_data',
  el score resultante también es 'insufficient_data'.

NIVELES DE CONFIANZA:
  high:              Todos los inputs disponibles, datos frescos (<7 días)
  medium:            Algunos inputs con datos >7 días o fuentes secundarias
  low:               Inputs limitados o datos >30 días
  insufficient_data: <50% de inputs mínimos disponibles

UI POR NIVEL:
  high:              Score normal, sin indicador especial
  medium:            Score + badge amarillo "Datos limitados"
  low:               Score + badge naranja "Calculado con pocos datos"
  insufficient_data: Placeholder "Score disponible pronto" + CTA mejorar datos
```

## 2.5 Deduplicación de Jobs

```sql
CREATE OR REPLACE FUNCTION enqueue_score_recalc(
  p_score_type text, p_entity_type text, p_entity_id uuid, 
  p_triggered_by text, p_priority integer DEFAULT 5
) RETURNS void AS $$
BEGIN
  -- Deduplicar contra pending Y processing (no solo pending)
  INSERT INTO score_recalculation_queue (score_type, entity_type, entity_id, triggered_by, priority)
  SELECT p_score_type, p_entity_type, p_entity_id, p_triggered_by, p_priority
  WHERE NOT EXISTS (
    SELECT 1 FROM score_recalculation_queue 
    WHERE score_type = p_score_type 
    AND entity_id = p_entity_id 
    AND status IN ('pending', 'processing')
  );
END; $$ LANGUAGE plpgsql;
```

---

# MÓDULO 3: FUENTES DE DATOS (50+) + MAPEO SCIAN

## 3.1 Fuentes Macro (7)

### F-MACRO-01: Banxico — Banco de México

```
Endpoint:       https://www.banxico.org.mx/SieAPIRest/service/v1/series/{idSerie}/datos/oportuno
Token:          BANXICO_TOKEN (se solicita gratis en banxico.org.mx/SieAPIRest)
Frecuencia:     Diaria (cron: ingest_banxico_daily, 8am)
Formato:        JSON { bmx: { series: [{ datos: [{ fecha, dato }] }] } }
Tabla destino:  macro_series
Ingestor:       /lib/intelligence-engine/ingest/banxico.ts (IMPLEMENTADO)

Series:
  SF43783  → tasa_referencia          (Tasa de fondeo gubernamental)
  SF283    → tiie_28                  (TIIE 28 días)
  SF63528  → tipo_cambio_fix          (Tipo de cambio FIX)
  SF44001  → tasa_hipotecaria_avg     (Tasa hipotecaria promedio)

Volumen: 4 series × 1 dato/día = 4 registros/día
Storage: ~1,500 registros/año
Estado actual: IMPLEMENTADO, 48 registros en BD (12 meses × 4 series)

Schema en macro_series:
  source: 'banxico'
  serie_key: 'tasa_referencia' | 'tiie_28' | 'tipo_cambio_fix' | 'tasa_hipotecaria_avg'
  value: numeric(14,4)
  unit: 'porcentaje' | 'pesos_por_dolar'
  period_type: 'daily'
  period_date: date del dato
  geography: 'nacional'

Scores que consumen:
  A01 Affordability, A02 Investment Sim, A03 Migration, A04 Arbitrage,
  A05 TCO, B05 Market Cycle, B08 Absorption Forecast, H11 Infonavit,
  D01 Market Pulse, F16 Hipotecas Comparador
```

### F-MACRO-02: INEGI — Instituto Nacional de Estadística y Geografía

```
Endpoint:       https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/{id}/es/0700/false/BIE/2.0/{token}
Token:          INEGI_TOKEN (se solicita gratis en inegi.org.mx/app/desarrolladores/)
Frecuencia:     Mensual (cron: ingest_inegi_monthly, día 15)
Formato:        JSON { Series: [{ OBSERVATIONS: [{ TIME_PERIOD, OBS_VALUE }] }] }
Tabla destino:  macro_series
Ingestor:       /lib/intelligence-engine/ingest/inegi.ts (IMPLEMENTADO)

Series:
  628194  → inpc_general              (INPC General — inflación)
  628229  → inpp_construccion         (INPP Construcción residencial)
  
Series a agregar (v4):
  628230  → inpp_materiales           (INPP Materiales construcción)
  628231  → inpp_mano_obra            (INPP Mano de obra construcción)
  444612  → pib_trimestral            (PIB trimestral)
  444887  → construccion_pib          (PIB sector construcción)
  628195  → inpc_vivienda             (INPC subíndice vivienda)

Volumen: 7 series × 1 dato/mes = 7 registros/mes
Storage: ~840 registros/10 años
Estado actual: IMPLEMENTADO parcial (2 series), 24 registros en BD

Schema en macro_series:
  source: 'inegi'
  serie_key: 'inpc_general' | 'inpp_construccion' | etc.
  value: numeric(14,4)
  unit: 'indice_base_2018'
  period_type: 'monthly'
  period_date: primer día del mes
  geography: 'nacional'

Scores que consumen:
  B02 Margin Pressure, B12 Cost Tracker, A05 TCO, B05 Market Cycle,
  D06 Affordability Crisis, A12 Price Fairness
```

### F-MACRO-03: SHF — Sociedad Hipotecaria Federal

```
Endpoint:       Manual download desde shf.gob.mx/estadisticas
                O admin upload via /api/admin/ingest-upload (XLSX/CSV)
Token:          N/A (datos públicos descargables)
Frecuencia:     Trimestral (cron: ingest_shf_quarterly)
Formato:        XLSX con serie IPV (Índice de Precios de la Vivienda)
Tabla destino:  macro_series
Ingestor:       /lib/intelligence-engine/ingest/shf.ts (STUB → admin upload)

Series:
  ipv_nacional    → IPV Nacional
  ipv_cdmx        → IPV CDMX
  ipv_mty         → IPV Monterrey
  ipv_gdl         → IPV Guadalajara
  (32 estados × 4 trimestres/año)

Volumen: ~128 registros/año (32 estados × 4 trimestres)
Storage: ~1,280 registros/10 años
Estado actual: STUB, 8 registros seed (ipv_cdmx + ipv_nacional × 4Q)

Schema en macro_series:
  source: 'shf'
  serie_key: 'ipv_cdmx' | 'ipv_mty' | 'ipv_nacional' | etc.
  value: numeric(14,4)
  unit: 'indice'
  period_type: 'quarterly'
  geography: 'cdmx' | 'mty' | 'nacional' | etc.

Scores que consumen:
  A04 Arbitrage, A02 Investment Sim, A05 TCO, A11 Patrimonio,
  B05 Market Cycle, D03 Supply Pipeline
```

### F-MACRO-04: BBVA Research México

```
Endpoint:       Manual download desde bbvaresearch.com/publicaciones/
                O admin upload via /api/admin/ingest-upload (PDF/XLSX)
Token:          N/A (publicaciones gratuitas)
Frecuencia:     Trimestral
Formato:        PDF con tablas (extracción via GPT-4o-mini en admin upload)
Tabla destino:  macro_series

Series:
  sobrecosto_vivienda  → Sobrecosto de vivienda (% ingreso para pagar hipoteca)
  oferta_vivienda      → Inventario de vivienda nueva
  credito_hipotecario  → Créditos otorgados por tipo

Volumen: ~12 registros/año
Estado actual: No implementado

Scores que consumen:
  D06 Affordability Crisis, B01 Demand Heatmap, H04 Credit Demand
```

### F-MACRO-05: CNBV — Comisión Nacional Bancaria y de Valores

```
Endpoint:       https://www.cnbv.gob.mx/Paginas/PortafolioDeInformacion.aspx
                Datos descargables en XLSX
Token:          N/A
Frecuencia:     Mensual
Formato:        XLSX
Tabla destino:  macro_series

Series:
  creditos_hipotecarios_municipio  → Créditos hipotecarios por municipio
  cartera_vencida_municipio        → Cartera vencida por municipio
  tasa_promedio_hipotecaria_banco  → Tasa por institución bancaria

Volumen: ~500 registros/mes (municipios × bancos)
Estado actual: No implementado

Scores que consumen:
  H04 Credit Demand, F16 Hipotecas Comparador, A01 Affordability
```

### F-MACRO-06: Infonavit

```
Endpoint:       https://portalmx.infonavit.org.mx/wps/portal/infonavitmx/mx2/derechohabientes/
                Datos en portal de datos abiertos
Token:          N/A
Frecuencia:     Mensual
Formato:        XLSX/CSV
Tabla destino:  macro_series

Series:
  creditos_otorgados_municipio  → Créditos otorgados por municipio
  monto_promedio_municipio      → Monto promedio por municipio
  vsm_vigente                   → Valor salario mínimo vigente
  tablas_credito                → Tabla de crédito por edad/salario

Volumen: ~300 registros/mes
Estado actual: No implementado

Scores que consumen:
  H11 Infonavit Calculator, H04 Credit Demand, H14 Buyer Persona
```

### F-MACRO-07: FOVISSSTE

```
Endpoint:       fovissste.gob.mx/transparencia
Token:          N/A
Frecuencia:     Trimestral
Formato:        XLSX
Tabla destino:  macro_series

Series:
  creditos_otorgados    → Créditos otorgados por estado
  monto_promedio        → Monto promedio por estado

Volumen: ~64 registros/trimestre (32 estados × 2 series)
Estado actual: No implementado

Scores que consumen:
  H04 Credit Demand, H14 Buyer Persona
```

## 3.2 Fuentes Geo (17)

### F-GEO-01: DENUE — Directorio Estadístico Nacional de Unidades Económicas (INEGI)

```
Endpoint:       https://www.inegi.org.mx/app/api/denue/v1/consulta/buscar/{condicion}/{latitud}/{longitud}/{distancia}/{token}
                También: descarga masiva desde inegi.org.mx/app/descarga/ (CSV)
Token:          INEGI_DENUE_TOKEN (mismo que INEGI general, gratis)
Frecuencia:     Mensual (snapshots — nunca sobreescribir, siempre insertar con timestamp)
Formato:        JSON API o CSV descarga masiva
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/denue.ts (NUEVO v4)

Datos por establecimiento:
  - id (clave DENUE)
  - nom_estab (nombre)
  - raz_social (razón social)
  - codigo_act (SCIAN 6 dígitos)
  - per_ocu (rango personal ocupado: 0-5, 6-10, 11-30, 31-50, 51-100, 101-250, 251+)
  - tipo_vial, nom_vial, num_ext, num_int, colonia, cp, localidad, municipio, entidad
  - latitud, longitud
  - fecha_alta (fecha de alta en DENUE)

Volumen CDMX: ~200,000 establecimientos
Volumen Nacional: ~5,500,000 establecimientos
Volumen Top 10 ciudades: ~2,000,000 establecimientos

Schema en geo_data_points:
  source: 'denue'
  category: scian_macro_category (ver mapeo SCIAN 3.18)
  name: nom_estab
  latitude: numeric(10,7)
  longitude: numeric(10,7)
  zone_id: uuid (matched via lat/lon → zones)
  alcaldia: text
  colonia: text
  data: {
    external_id: text (clave DENUE),
    scian_6: text (código SCIAN 6 dígitos),
    scian_sector: text (primeros 2 dígitos),
    staff_range: text ('0_5' | '6_10' | '11_30' | '31_50' | '51_100' | '101_250' | '251_plus'),
    staff_estimate: integer (punto medio del rango),
    tier: text ('premium' | 'standard' | 'basic' — ver mapeo SCIAN),
    scian_macro: text (categoría macro — ver mapeo SCIAN),
    razon_social: text,
    fecha_alta: date
  }
  period_date: date del snapshot
  is_active: true

CRÍTICO: El mapeo SCIAN → tiers/macro_categories es IP propietaria de DMX.
Ver sección 3.18 para el mapeo completo.

SNAPSHOTS TEMPORALES:
  - NUNCA sobreescribir. Siempre insertar con period_date nuevo.
  - Mantener is_active=true para el snapshot actual, is_active=false para anteriores.
  - Delta calculator compara snapshots consecutivos para detectar:
    · Negocios nuevos (en snapshot N pero no en N-1)
    · Negocios cerrados (en snapshot N-1 pero no en N)
    · Cambios de categoría (mismo external_id, diferente scian_6)
  - El historial DE SNAPSHOTS es el activo temporal más valioso del IE.
  - Cada mes que pasa, la barrera de entrada sube.

Scores que consumen:
  F03 Ecosystem DENUE, N01 Ecosystem Diversity, N02 Employment Accessibility,
  N03 Gentrification Velocity, N08 Walkability MX, N09 Nightlife Economy,
  N10 Senior Livability, N11 DMX Momentum Index, D05 Gentrification,
  F10 Gentrification 2.0, D09 Ecosystem Health, A06 Neighborhood
```

### F-GEO-02: FGJ — Fiscalía General de Justicia de CDMX

```
Endpoint:       https://datos.cdmx.gob.mx/api/3/action/datastore_search?resource_id={id}
                CKAN API — datos abiertos CDMX
Token:          N/A (API pública)
Frecuencia:     Mensual (cron: refresh_fgj_monthly)
Formato:        JSON CKAN (records con lat/lon)
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/fgj.ts (NUEVO v4)

Datos por carpeta:
  - ao_delito (año)
  - mes_hecho
  - fecha_hecho
  - ao_inicio (año inicio carpeta)
  - delito (tipo)
  - categoria_delito
  - colonia_hechos
  - alcaldia_hechos
  - latitud, longitud
  - hora_hecho (para análisis temporal)

Volumen CDMX: ~100,000 carpetas/año
Storage: ~50MB/año en geo_data_points

Schema en geo_data_points:
  source: 'fgj'
  category: categoria_delito
  name: delito
  latitude, longitude
  alcaldia: alcaldia_hechos
  colonia: colonia_hechos
  data: {
    external_id: text (folio carpeta),
    delito_tipo: text,
    categoria: text,
    fecha_hecho: date,
    hora_hecho: time,
    ano_inicio: integer
  }
  period_date: fecha_hecho (o primer día del mes)

NOTA: Solo disponible para CDMX. Otras ciudades tienen fuentes diferentes
de seguridad (o no tienen datos abiertos). Ver available_data_sources en
supported_cities.

Scores que consumen:
  F01 Safety, N04 Crime Trajectory, F12 Risk Map, N09 Nightlife Economy,
  N11 DMX Momentum Index, F10 Gentrification 2.0, H16 Neighborhood Evolution
```

### F-GEO-03: GTFS — General Transit Feed Specification

```
Endpoint:       Descarga estática desde:
                - Metro CDMX: metro.cdmx.gob.mx
                - Metrobús: metrobus.cdmx.gob.mx
                - Tren Suburbano: trensuburbano.com.mx
                - Cablebús: cablebus.cdmx.gob.mx
                También: transitfeeds.com/l/664-mexico-city
Token:          N/A (GTFS es estándar abierto)
Frecuencia:     Trimestral (las rutas cambian poco)
Formato:        GTFS (ZIP con CSVs: stops.txt, routes.txt, trips.txt, stop_times.txt)
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/gtfs.ts (NUEVO v4)

Datos por estación/parada:
  - stop_id, stop_name
  - stop_lat, stop_lon
  - route_type (0=tram, 1=metro, 2=rail, 3=bus)
  - route_id, route_short_name
  - Frecuencias calculadas de stop_times.txt

Volumen CDMX: ~300 estaciones principales (Metro 195 + Metrobús 60+ + Cablebús + Tren Ligero + EcoBici)
Con paradas de bus: ~5,000+

Schema en geo_data_points:
  source: 'gtfs'
  category: route_type_name ('metro' | 'metrobus' | 'cablebus' | 'tren_ligero' | 'bus' | 'ecobici')
  name: stop_name
  latitude, longitude
  data: {
    stop_id: text,
    route_type: integer,
    route_id: text,
    route_name: text,
    frequency_peak: integer (servicios/hora en hora pico),
    frequency_offpeak: integer,
    lines_count: integer (número de líneas que pasan por la estación),
    is_transfer: boolean (estación de transbordo)
  }
  period_date: fecha del GTFS feed

Scores que consumen:
  F02 Transit, N02 Employment Accessibility, N05 Infrastructure Resilience,
  N08 Walkability MX, H09 Commute, F15 Transit Redundancy, A06 Neighborhood
```

### F-GEO-04: Atlas Nacional de Riesgos

```
Endpoint:       http://www.atlasnacionalderiesgos.gob.mx/archivo/descargas.html
                Shapefiles descargables
Token:          N/A
Frecuencia:     Anual (datos estables)
Formato:        Shapefile → JSON vía ogr2ogr
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/atlas-riesgos.ts (NUEVO v4)

Datos por AGEB/zona:
  - Zona sísmica (A, B, C, D)
  - Riesgo de inundación (bajo, medio, alto, muy alto)
  - Riesgo de hundimiento
  - Riesgo de deslizamiento
  - Riesgo volcánico

Volumen CDMX: ~500 AGEBs con clasificación de riesgo
Storage: ~5MB

Schema en geo_data_points:
  source: 'atlas_riesgos'
  category: 'sismico' | 'inundacion' | 'hundimiento' | 'deslizamiento'
  name: nombre de la zona
  latitude, longitude (centroide del AGEB)
  data: {
    ageb_id: text,
    zona_sismica: text ('A'|'B'|'C'|'D'),
    riesgo_inundacion: text ('bajo'|'medio'|'alto'|'muy_alto'),
    riesgo_hundimiento: text,
    riesgo_deslizamiento: text,
    pga_estimado: numeric (Peak Ground Acceleration)
  }
  period_date: fecha de publicación del atlas

Scores que consumen:
  H03 Seismic Risk, F12 Risk Map, N05 Infrastructure Resilience,
  N07 Water Security, H10 Water Crisis, A09 Risk Score, H15 Due Diligence
```

### F-GEO-05: SIGED — Sistema de Información y Gestión Educativa (SEP)

```
Endpoint:       https://www.siged.sep.gob.mx/SIGED/escuelas.html
                Descarga por estado/municipio
Token:          N/A
Frecuencia:     Anual (ciclo escolar)
Formato:        CSV/XLSX
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/siged.ts (NUEVO v4)

Datos por escuela:
  - cct (Clave de Centro de Trabajo)
  - nombre
  - nivel (preescolar, primaria, secundaria, media_superior, superior)
  - sostenimiento (público, privado)
  - domicilio, colonia, municipio, entidad
  - latitud, longitud
  - alumnos (matrícula)
  - docentes
  - resultado_planea (si disponible)

Volumen CDMX: ~15,000 escuelas
Volumen Nacional: ~260,000 escuelas
Volumen Top 10 ciudades: ~80,000 escuelas

Schema en geo_data_points:
  source: 'siged'
  category: nivel ('preescolar'|'primaria'|'secundaria'|'media_superior'|'superior')
  name: nombre de la escuela
  latitude, longitude
  data: {
    cct: text,
    nivel: text,
    sostenimiento: text ('publico'|'privado'),
    alumnos: integer,
    docentes: integer,
    ratio_alumnos_docente: numeric,
    resultado_planea: numeric (si disponible),
    turno: text
  }
  period_date: fecha del ciclo escolar

Scores que consumen:
  H01 School Quality, N06 School Premium, N10 Senior Livability,
  A06 Neighborhood, H14 Buyer Persona
```

### F-GEO-06: DGIS/CLUES — Directorio de Establecimientos de Salud

```
Endpoint:       http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html
                Descarga masiva
Token:          N/A
Frecuencia:     Anual
Formato:        CSV
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/dgis.ts (NUEVO v4)

Datos por establecimiento:
  - CLUES (Clave Única de Establecimientos de Salud)
  - nombre
  - nivel_atencion (1er, 2do, 3er nivel)
  - institucion (IMSS, ISSSTE, SSA, privado)
  - tipo (consultorio, centro_salud, hospital_general, hospital_especialidad)
  - especialidades[]
  - domicilio, colonia, municipio, entidad
  - latitud, longitud

Volumen CDMX: ~5,000 establecimientos
Volumen Nacional: ~35,000 establecimientos

Schema en geo_data_points:
  source: 'dgis'
  category: nivel_atencion ('primer_nivel'|'segundo_nivel'|'tercer_nivel')
  name: nombre
  latitude, longitude
  data: {
    clues: text,
    nivel_atencion: integer (1,2,3),
    institucion: text,
    tipo: text,
    especialidades: text[],
    camas: integer (si hospital)
  }
  period_date: fecha de actualización

Scores que consumen:
  H02 Health Access, N10 Senior Livability, A06 Neighborhood
```

### F-GEO-07: SACMEX — Sistema de Aguas de la Ciudad de México

```
Endpoint:       https://datos.cdmx.gob.mx (CKAN API — cortes programados)
                sacmex.cdmx.gob.mx (reportes)
Token:          N/A
Frecuencia:     Mensual
Formato:        JSON/CSV
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/sacmex.ts (NUEVO v4)

Datos:
  - Cortes programados de agua por colonia
  - Duración promedio del corte (horas)
  - Frecuencia de cortes por zona
  - Tandeo (distribución por horario)
  - Calidad del agua (donde disponible)

Volumen CDMX: ~2,000 registros/mes (cortes por colonia)

Schema en geo_data_points:
  source: 'sacmex'
  category: 'corte_programado' | 'tandeo' | 'calidad_agua'
  name: descripción del corte
  latitude, longitude (centroide de la colonia afectada)
  alcaldia, colonia
  data: {
    tipo_corte: text,
    duracion_horas: numeric,
    fecha_inicio: timestamptz,
    fecha_fin: timestamptz,
    colonias_afectadas: text[],
    motivo: text
  }
  period_date: fecha del corte

NOTA: Solo CDMX. Otras ciudades tienen sus propios organismos de agua.

Scores que consumen:
  F05 Water, N07 Water Security, H10 Water Crisis, N05 Infrastructure Resilience,
  N11 DMX Momentum Index, F12 Risk Map
```

### F-GEO-08: RAMA — Red Automática de Monitoreo Atmosférico

```
Endpoint:       https://sinaica.inecc.gob.mx/pags/datGraf.php (scraping)
                API no oficial: sinaica.inecc.gob.mx/API/estaciones
Token:          N/A (datos públicos)
Frecuencia:     Horaria (cron: ingest_rama_daily, consolidado diario)
Formato:        JSON/HTML tables (scraping required)
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/rama.ts (STUB H2)

Datos por estación:
  - PM2.5, PM10, O3, NO2, SO2, CO (concentraciones)
  - estacion_id, nombre, latitud, longitud
  - fecha_hora, calidad_aire (buena/aceptable/mala/muy_mala/peligrosa)

Volumen CDMX: 34 estaciones × 24 hrs = ~816 registros/día, ~25K/mes
Storage: ~300K registros/año
Estado actual: No implementado (prioridad H2 — datos horarios son pesados)

Schema en geo_data_points:
  source: 'rama'
  category: 'calidad_aire'
  name: nombre estación
  latitude, longitude
  data: {
    estacion_id: text,
    pm25: numeric, pm10: numeric, o3: numeric,
    no2: numeric, so2: numeric, co: numeric,
    indice_calidad: text ('buena'|'aceptable'|'mala'|'muy_mala'|'peligrosa'),
    fecha_hora: timestamptz
  }
  period_date: date (consolidado diario)

Scores que consumen:
  F04 Air Quality, H07 Environmental, N10 Senior Livability
```

### F-GEO-09: Uso de Suelo — SEDUVI/SIG CDMX

```
Endpoint:       Descarga desde sig.cdmx.gob.mx (CSV/Shapefile)
                O: datos.cdmx.gob.mx con dataset "Programa General de Desarrollo Urbano"
Token:          N/A (datos públicos descargables)
Frecuencia:     Anual (actualizaciones de PGDU/PPDU)
Formato:        Shapefile → JSON vía ogr2ogr, o CSV directo
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/uso-suelo.ts (STUB H2)

Datos por cuenta catastral/manzana:
  - uso_suelo: H (habitacional), HO (hab oficinas), HM (hab mixto), CB (centro barrio), etc.
  - densidad_permitida: baja, media, alta
  - niveles_permitidos: integer (3, 5, 8, etc.)
  - area_libre_pct: porcentaje requerido
  - programa_parcial: nombre del PPDU vigente

Volumen CDMX: ~3,000 manzanas con clasificación de uso de suelo
Storage: ~5MB
Estado actual: No implementado (prioridad H2)

Schema en geo_data_points:
  source: 'uso_suelo'
  category: uso_suelo ('H'|'HO'|'HM'|'CB'|'E'|'I'|'EA')
  name: clave catastral o manzana
  latitude, longitude (centroide)
  data: {
    uso_suelo: text,
    densidad: text,
    niveles_permitidos: integer,
    area_libre_pct: numeric,
    programa_parcial: text,
    alcaldia: text,
    colonia: text
  }
  period_date: fecha de publicación del programa

Scores que consumen:
  F06 Land Use, H13 Site Selection AI, D03 Supply Pipeline, H15 Due Diligence
```

### F-GEO-10: Catastro CDMX

```
Endpoint:       Descarga desde datos.cdmx.gob.mx (dataset "Padrón Catastral")
Token:          N/A
Frecuencia:     Anual (actualización fiscal)
Formato:        CSV
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/catastro.ts (STUB H2)

Datos por cuenta catastral:
  - cuenta_catastral, clave_region, manzana, lote
  - valor_catastral: numeric (pesos)
  - superficie_terreno: numeric (m²)
  - superficie_construccion: numeric (m²)
  - año_construccion: integer
  - clasificacion: text (habitacional, comercial, industrial, mixto)
  - colonia, alcaldia

Volumen CDMX: ~2.5M cuentas catastrales
Storage: ~500MB raw, ~50MB processed (solo las relevantes por zona)
Estado actual: No implementado (prioridad H2)

Schema en geo_data_points:
  source: 'catastro'
  category: clasificacion
  name: cuenta_catastral
  latitude, longitude (centroide del lote)
  data: {
    cuenta_catastral: text,
    valor_catastral: numeric,
    superficie_terreno_m2: numeric,
    superficie_construccion_m2: numeric,
    ano_construccion: integer,
    clasificacion: text,
    valor_m2_catastral: numeric  // calculado: valor/superficie
  }
  period_date: año fiscal

Scores que consumen:
  F07 Predial, A05 TCO, H15 Due Diligence, I01 DMX Estimate
```

### F-GEO-11: PAOT — Procuraduría Ambiental y del Ordenamiento Territorial

```
Endpoint:       datos.cdmx.gob.mx (CKAN API, dataset "Denuncias Ambientales PAOT")
Token:          N/A
Frecuencia:     Mensual
Formato:        JSON/CSV
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/paot.ts (STUB H2)

Datos por denuncia:
  - tipo_denuncia: ruido, residuos, agua, suelo, fauna, construcción irregular
  - colonia, alcaldia
  - estado_resolucion: abierta, en_proceso, resuelta, archivada
  - fecha_denuncia

Volumen CDMX: ~15K denuncias/año
Storage: ~2MB/año
Estado actual: No implementado

Schema en geo_data_points:
  source: 'paot'
  category: tipo_denuncia
  name: descripción breve
  latitude, longitude (centroide colonia)
  alcaldia, colonia
  data: {
    tipo: text,
    estado: text,
    fecha_denuncia: date,
    resolucion_dias: integer
  }
  period_date: mes de la denuncia

Scores que consumen:
  H07 Environmental, H16 Neighborhood Evolution
```

### F-GEO-12: SEDEMA — Secretaría del Medio Ambiente CDMX

```
Endpoint:       datos.cdmx.gob.mx (datasets "Áreas Verdes", "Parques")
Token:          N/A
Frecuencia:     Anual (datos estables)
Formato:        CSV/Shapefile
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/sedema.ts (STUB H2)

Datos:
  - Parques públicos: nombre, superficie_ha, tipo (parque, jardín, bosque urbano)
  - Áreas naturales protegidas: nombre, superficie, decreto
  - Corredores verdes: nombre, extensión_km

Volumen CDMX: ~1,200 parques + ~50 áreas protegidas
Storage: ~2MB
Estado actual: No implementado

Schema en geo_data_points:
  source: 'sedema'
  category: 'parque' | 'area_protegida' | 'corredor_verde'
  name: nombre del espacio
  latitude, longitude
  data: {
    tipo: text,
    superficie_ha: numeric,
    decreto: text (si aplica),
    servicios: text[]
  }
  period_date: fecha del dataset

Scores que consumen:
  H07 Environmental, F04 Air Quality, N08 Walkability MX, A06 Neighborhood
```

### F-GEO-13: CONAGUA — Comisión Nacional del Agua

```
Endpoint:       conagua.gob.mx/datos-abiertos (Portal de datos)
                sina.conagua.gob.mx/sina/ (SINA)
Token:          N/A
Frecuencia:     Anual
Formato:        CSV/XLSX
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/conagua.ts (STUB H2)

Datos:
  - Acuíferos: nombre, nivel, disponibilidad_pct, deficit, sobreexplotado (bool)
  - Calidad agua subterránea: estación, parámetros fisicoquímicos
  - Precipitación media anual por estación

Volumen CDMX: ~5 acuíferos + ~20 estaciones monitoreo
Storage: ~1MB
Estado actual: No implementado

Schema en geo_data_points:
  source: 'conagua'
  category: 'acuifero' | 'calidad_agua' | 'precipitacion'
  name: nombre del acuífero/estación
  latitude, longitude
  data: {
    acuifero_id: text,
    disponibilidad_pct: numeric,
    sobreexplotado: boolean,
    deficit_hm3: numeric,
    calidad: text ('apta'|'condicionada'|'no_apta')
  }
  period_date: año del reporte

Scores que consumen:
  H10 Water Crisis, N07 Water Security, N05 Infrastructure Resilience
```

### F-GEO-14: INAH — Instituto Nacional de Antropología e Historia

```
Endpoint:       inah.gob.mx/red-de-museos (descarga manual)
                datos.gob.mx (dataset "Zonas Arqueológicas")
Token:          N/A
Frecuencia:     Anual (patrimonio es estable)
Formato:        CSV/JSON
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/inah.ts (STUB H2)

Datos:
  - Zonas arqueológicas: nombre, tipo, visitantes/año
  - Museos: nombre, tipo, especialidad
  - Monumentos históricos: nombre, decreto, tipo

Volumen CDMX: ~30 museos + ~5 zonas arqueológicas + ~200 monumentos
Storage: ~500KB
Estado actual: No implementado

Schema en geo_data_points:
  source: 'inah'
  category: 'museo' | 'zona_arqueologica' | 'monumento_historico'
  name: nombre
  latitude, longitude
  data: {
    tipo: text,
    especialidad: text,
    visitantes_anual: integer (si disponible),
    decreto: text (si monumento)
  }
  period_date: fecha del dataset

Scores que consumen:
  H08 Heritage Zone, A06 Neighborhood, N08 Walkability MX
```

### F-GEO-15: PROFECO — Procuraduría Federal del Consumidor

```
Endpoint:       datos.gob.mx (dataset "Quejas PROFECO")
Token:          N/A
Frecuencia:     Trimestral
Formato:        CSV
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/profeco.ts (STUB H2)

Datos por queja:
  - empresa/proveedor
  - sector/giro
  - tipo_queja
  - estado_resolucion
  - municipio, entidad

Volumen CDMX: ~50K quejas/año (filtrado por delegación)
Storage: ~5MB/año
Estado actual: No implementado

Schema en geo_data_points:
  source: 'profeco'
  category: sector
  name: empresa
  latitude, longitude (centroide colonia de la empresa)
  data: {
    empresa: text,
    sector: text,
    quejas_count: integer,
    resolucion_favorable_pct: numeric,
    periodo: text
  }
  period_date: trimestre

Scores que consumen:
  H05 Trust Score (factor: quejas de desarrolladoras/inmobiliarias en la zona)
```

### F-GEO-16: *0311 Locatel — Reportes Ciudadanos CDMX

```
Endpoint:       datos.cdmx.gob.mx (CKAN API, dataset "Reportes 311")
Token:          N/A
Frecuencia:     Mensual
Formato:        JSON/CSV
Tabla destino:  geo_data_points
Ingestor:       /lib/intelligence-engine/ingest/locatel.ts (STUB — admin upload)

Datos por reporte:
  - tipo_reporte: bache, alumbrado, agua, basura, seguridad, ruido, etc.
  - colonia, alcaldia
  - estado: abierto, en_proceso, resuelto
  - fecha_creacion, fecha_resolucion
  - tiempo_resolucion_dias

Volumen CDMX: ~500K reportes/año
Storage: ~50MB/año
Estado actual: No implementado

Schema en geo_data_points:
  source: '0311'
  category: tipo_reporte
  name: descripción breve
  latitude, longitude (centroide colonia)
  alcaldia, colonia
  data: {
    tipo: text,
    subtipo: text,
    estado: text,
    fecha_creacion: date,
    fecha_resolucion: date,
    tiempo_resolucion_dias: integer
  }
  period_date: mes del reporte

Scores que consumen:
  H06 City Services, H12 Zona Oportunidad, H16 Neighborhood Evolution,
  N05 Infrastructure Resilience, N11 DMX Momentum Index
```

### F-GEO-17: Mapbox Traffic API

```
Endpoint:       https://api.mapbox.com/directions/v5/mapbox/driving-traffic/{coords}
Token:          NEXT_PUBLIC_MAPBOX_TOKEN (restringido por dominio en Mapbox dashboard)
Frecuencia:     On-demand (calculado cuando usuario solicita H09 Commute)
Formato:        JSON GeoJSON (routes con duration_in_traffic)
Tabla destino:  NO persiste en geo_data_points — se calcula en tiempo real
Ingestor:       N/A (llamada directa desde calculator)

Datos por consulta:
  - origin: lat, lon (proyecto)
  - destination: lat, lon (punto de interés del usuario)
  - duration_typical: seconds (tráfico promedio)
  - duration_live: seconds (tráfico actual, solo útil en tiempo real)
  - distance_km: numeric
  - route_geometry: GeoJSON LineString

Volumen: ~50 queries/día estimado (on-demand por usuario)
Storage: N/A (no se persiste, se cachea 24hrs en Redis/memory)
Estado actual: Token configurado, endpoint disponible

Pricing Mapbox: 100K requests/mes gratis → suficiente para H1
  Free tier: 100K directions requests/month
  Pay: $0.50 per 1K requests after

Scores que consumen:
  H09 Commute Time, F02 Transit (como complemento),
  F13 Commute (isócronas on-demand)
```

## 3.3 Fuentes de Mercado (4)

```
F-MKT-01: Inmuebles24 / Mudafy (scraping)
  Endpoint: Apify/Puppeteer scraping de inmuebles24.com
  Datos: precio/m², tipo, colonia, operación (venta/renta), amenidades
  Frecuencia: Semanal
  Tabla destino: market_prices_secondary
  Volumen: ~5,000 registros/semana CDMX
  Scores: A04 Arbitrage, A12 Price Fairness, D05 Gentrification, 
          D06 Affordability Crisis, I01 DMX Estimate

F-MKT-02: AirDNA
  Endpoint: airdna.co/api (requiere suscripción)
  Token: AIRDNA_API_KEY (existente en .env.local)
  Datos: ADR, occupancy, revenue mensual por zona
  Frecuencia: Mensual
  Tabla destino: str_market_data
  Scores: D07 STR/LTR, A02 Investment Sim

F-MKT-03: Google Trends
  Endpoint: trends.google.com (scraping via pytrends o SerpAPI)
  Datos: interés de búsqueda por zona/término
  Frecuencia: Semanal
  Tabla destino: search_trends
  Scores: B08 Absorption Forecast, D05 Gentrification, B15 Launch Timing

F-MKT-04: Cushman & Wakefield / CBRE (oficinas)
  Endpoint: Manual (reportes trimestrales públicos)
  Datos: vacancy, absorción, renta promedio por submarket
  Frecuencia: Trimestral
  Tabla destino: office_market_data
  Scores: D04 Cross Correlation
```

## 3.4 Fuentes Propias (12)

```
F-OWN-01: projects          → datos de proyectos listados
F-OWN-02: unidades          → inventario por unidad (precio, m², status)
F-OWN-03: busquedas         → pipeline de compradores (demanda revelada)
F-OWN-04: operaciones       → transacciones cerradas (calibración)
F-OWN-05: contactos         → base de leads + compradores
F-OWN-06: visitas_programadas → intención de compra
F-OWN-07: interaction_feedback → objeciones, interés post-visita
F-OWN-08: search_logs       → búsquedas del marketplace (demanda implícita)
F-OWN-09: project_views     → vistas a fichas (engagement)
F-OWN-10: wishlist          → favoritos (interés declarado)
F-OWN-11: unit_change_log   → historial de cambios de precio/status
F-OWN-12: inventory_snapshots → fotos diarias del inventario
```

## 3.5 Fuentes Futuras H2 (10+)

```
F-FUT-01: SEDUVI — Permisos de construcción (dataset SIG CDMX)
F-FUT-02: EcoBici — Trip data (movilidad activa)
F-FUT-03: Waze/Traffic — Datos de tráfico en tiempo real
F-FUT-04: Google Street View — Computer vision de fachadas
F-FUT-05: SNIIV/RUV — Registro Único de Vivienda (oferta futura)
F-FUT-06: Catastro dinámico — Valores catastrales actualizados
F-FUT-07: Social Media Sentiment — Twitter/X + Google Reviews por zona
F-FUT-08: Weather API — Datos climáticos (relevancia para riesgo)
F-FUT-09: Census INEGI 2030 — Datos demográficos actualizados
F-FUT-10: Satellite imagery — NDVI (vegetación), expansión urbana
```

## 3.18 Mapeo SCIAN → Tiers / Macro Categories (IP PROPIETARIA)

Este mapeo es el corazón del Ecosystem Score y la ventaja competitiva más difícil de replicar. Clasifica los 6 dígitos SCIAN del DENUE en tiers económicos y macro categorías que permiten cuantificar la sofisticación económica de cada metro cuadrado.

### Tiers económicos (3 niveles)

```
TIER PREMIUM — Negocios que indican zona de alto poder adquisitivo:
  461110  Comercio al por menor en tiendas de autoservicio (cadenas premium)
  461213  Farmacias con mini super
  462111  Tiendas departamentales
  511111  Edición de periódicos (oficinas editoriales)
  512111  Producción de películas
  517111  Telecomunicaciones (oficinas corporativas)
  519130  Edición y difusión de contenido por internet
  521110  Banca múltiple
  522110  Banca de desarrollo
  523110  Casas de bolsa
  524110  Compañías de seguros
  531114  Inmobiliarias (oficinas)
  541110  Bufetes jurídicos
  541211  Servicios de contabilidad y auditoría
  541310  Servicios de arquitectura
  541330  Servicios de ingeniería
  541410  Diseño industrial
  541511  Servicios de consultoría en computación
  541610  Servicios de consultoría en administración
  541810  Agencias de publicidad
  541920  Servicios de fotografía
  611311  Escuelas de educación superior privadas
  621111  Consultorios médicos del sector privado
  621211  Consultorios dentales del sector privado
  621311  Consultorios de quiroprácticos
  621411  Centros de planificación familiar
  713111  Clubes deportivos del sector privado
  713120  Campos de golf
  713210  Casinos
  721111  Hoteles con otros servicios integrados (4-5 estrellas)
  722511  Restaurantes de comida internacional
  722512  Restaurantes de alta cocina
  722514  Cafeterías, fuentes de sodas (cadenas premium)
  812110  Salones de belleza
  812210  Lavanderías y tintorerías

TIER STANDARD — Negocios de clase media:
  461110-461190  Comercio menor general
  461211-461212  Farmacias, perfumerías
  462112  Tiendas de conveniencia
  463XXX  Venta de textiles, calzado, papelería
  464XXX  Artículos de salud, computo
  465XXX  Gasolineras, materiales construcción
  466XXX  Abarrotes, alimentos
  468XXX  Vehículos, refacciones
  469XXX  Comercio por internet
  484XXX  Autotransporte de carga
  485XXX  Transporte terrestre pasajeros
  561XXX  Servicios de apoyo a negocios
  611XXX  Servicios educativos
  621XXX  Servicios médicos general
  711XXX  Espectáculos artísticos
  722XXX  Restaurantes general
  811XXX  Reparación y mantenimiento
  812XXX  Servicios personales general

TIER BASIC — Negocios de bajo poder adquisitivo:
  431XXX  Comercio informal / ambulante
  461XXX  Abarrotes, misceláneas (tienditas)
  466110  Tiendas de abarrotes, ultramarinos
  466311  Carnicerías
  466312  Pollerías
  466313  Pescaderías
  466411  Fruterías y verdulerías
  466XXX  Recauderías, tortillerías
  467XXX  Ferretería, tlapalería
  485210  Transporte colectivo (combis, microbuses)
  561720  Servicios de limpieza (exterior)
  713941  Billares
  713943  Videojuegos (locales)
  722513  Restaurantes de antojitos (fondas, taquerías)
  722515  Cafeterías (no cadena)
  811111  Talleres mecánicos
  811121  Hojalatería y pintura
  811211  Reparación de aparatos eléctricos
  812310  Tintorería y planchado
```

### Macro Categories (12)

```
ALIMENTACION:     461110, 466XXX, 722XXX
SALUD:            621XXX, 461213
EDUCACION:        611XXX
SERVICIOS_PROF:   541XXX, 523XXX, 524XXX, 521XXX
COMERCIO_RETAIL:  462XXX, 463XXX, 464XXX, 465XXX
GASTRONOMIA:      722511-722515
ENTRETENIMIENTO:  711XXX, 713XXX
BELLEZA_PERSONAL: 812110, 812XXX
TECNOLOGIA:       517XXX, 519XXX, 541511
TRANSPORTE:       484XXX, 485XXX
MANUFACTURA:      311XXX-339XXX
GOBIERNO:         931XXX
```

### Fórmulas derivadas del mapeo

```
RATIO PREMIUM/BASIC = count(tier='premium') / count(tier='basic')
  - Ratio > 2.0 → zona premium consolidada
  - Ratio 1.0-2.0 → zona en transición/gentrificación
  - Ratio < 1.0 → zona popular/básica

DIVERSITY INDEX (Shannon-Wiener) = -Σ(pi × ln(pi))
  donde pi = proporción de la macro_category i en el radio
  - H > 2.0 → ecosistema diverso y saludable
  - H 1.5-2.0 → ecosistema moderado
  - H < 1.5 → ecosistema poco diverso (dominado por 1-2 categorías)

EMPLOYMENT DENSITY = Σ(staff_estimate) / area_km2
  staff_estimate = punto medio del rango:
    '0_5' → 3, '6_10' → 8, '11_30' → 20, '31_50' → 40,
    '51_100' → 75, '101_250' → 175, '251_plus' → 350

GENTRIFICATION VELOCITY = Δ(ratio_premium_basic) / Δ(meses)
  Requiere ≥2 snapshots separados por ≥3 meses
```

---

# CROSS-REFERENCES A OTROS ARCHIVOS

```
→ PART 2: Scores Nivel 0 y 1 que consumen estas fuentes
→ PART 3: Scores Nivel 2-5 que dependen de los scores del Part 2
→ PART 4: Los 11 scores NUEVOS que usan DENUE/FGJ/GTFS/SACMEX
→ PART 5: Cascadas que se activan cuando estas fuentes se actualizan
→ BIBLIA_BACKEND_DMX_v4: Tablas, ingestors, crons que implementan estas fuentes
→ BIBLIA_FRONTEND_DMX_v4: Componentes que visualizan estos datos
```

---

**FIN DE PART 1 — Continúa en BIBLIA_IE_DMX_v4_PART2.md (Scores Nivel 0 + Nivel 1)**
