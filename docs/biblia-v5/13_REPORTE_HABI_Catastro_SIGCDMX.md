# BIBLIA DMX v5 — ANÁLISIS COMPETENCIA
## Reporte Habi/propiedades.com: Catastro + SIGCDMX + Oportunidades
## Contenido ÍNTEGRO de REPORTE_COMPLETO_SESION_ANALISIS_HABI_DMX
## Fase: Sesión 07 (Ingesta Catastro)
---
# REPORTE COMPLETO DE SESIÓN — Análisis Competitivo Habi/Propiedades.com + Upgrades IE DMX
## Chat del 9 de abril de 2026
## DesarrollosMX v8 — Intelligence Engine

---

# ÍNDICE

```
1. CONTEXTO INICIAL — Documentos analizados
2. ANÁLISIS DEL SITIO WEB — propiedades.com/explorar/mapa
3. PROMPT INICIAL PARA CHROME — Versión 1
4. UPGRADES AL PROMPT — Basados en las Biblias DMX
5. PROMPT FINAL CONSOLIDADO — 12 secciones
6. REPORTE DE CHROME — Análisis técnico exhaustivo de Habi
7. ANÁLISIS CRUZADO — Habi vs DMX (7 puntos)
8. API KEY EXPUESTA — Qué es, qué se puede hacer, riesgos
9. UPGRADES NUCLEARES — Qué crear con la data descubierta
10. MÓDULO DE CARGA INTELIGENTE — Idea de upload universal con IA
11. TIMING — Cuándo incorporar los hallazgos (Sesión 07 vs R5a-2)
12. MAPA DE SESIONES — Estructura de 20 sesiones del proyecto
13. DOCUMENTO FINAL — Ingestores Geo: Estado Actual + Upgrades
```

---
---

# 1. CONTEXTO INICIAL — DOCUMENTOS ANALIZADOS

Al inicio del chat se subieron 11 documentos de la Biblia DesarrollosMX v8:

```
BACKEND:
  BACKEND_DMX_v4_PART1.md    (107 Tablas + Security)
  BACKEND_DMX_v4_PART2.md    (Functions + tRPC + API + 27 Crons)
  BACKEND_DMX_v4_PART3.md    (Integraciones + Stripe + Sprints R0-R10)

FRONTEND:
  FRONTEND_DMX_v4_PART1.md   (Design System + Hooks + Portal Asesor)
  FRONTEND_DMX_v4_PART2.md   (Dev/Admin/Comprador/Público + Features)

INTELLIGENCE ENGINE:
  IE_DMX_v4_PART1.md         (Visión + Arquitectura + Fuentes + SCIAN)
  IE_DMX_v4_PART2.md         (37 Scores Nivel 0+1)
  IE_DMX_v4_PART3.md         (33 Scores Nivel 2+3+4+5)
  IE_DMX_v4_PART4.md         (11 Scores Nuevos + 7 Índices + Snapshots)
  IE_DMX_v4_PART5.md         (Cascadas + Productos + Competencia + Fases)

ESTRATEGIA:
  DMX_IE_Cross_Industry_Strategy.md  (Estrategia cross-industry del IE)
```

Se analizaron todos los documentos completos sin generar reporte — solo lectura y contexto.

---
---

# 2. ANÁLISIS DEL SITIO WEB — propiedades.com/explorar/mapa

## Capturas subidas (5 imágenes)

Manu subió 5 capturas de pantalla de propiedades.com mostrando:

### Captura 1 — Vista de mapa con precios por m²
- Mapa de la colonia San Rafael, Cuauhtémoc
- Panel izquierdo con: Precio promedio de venta ($4,040,644 / $54,382 m²)
- Características típicas: 2 recámaras, 2 baños, 1 estacionamiento
- Gráfica de plusvalía: Alcaldía vs Colonia (2020→2023)
  - Alcaldía: $34.3K → $40.2K (+17%) → $43.9K (+9%) → $49.4K (+13%)
  - Colonia: $26.0K → $25.7K (+1%) → $34.1K (+32%) → $43.9K (+29%)
- Mapa con polígonos de predios y labels de precio por m² ($23.1K, $43.8K, $45.9K, etc.)
- Botón "Expandir mapa"

### Captura 2 — Ficha de predio (tab Estimados)
- Dirección: Gabino Barreda 31, San Rafael, Cuauhtémoc
- Breadcrumb: Cuauhtémoc / San Rafael / Manzana #009
- Tipo: Casa
- Tabs: Estimados, Valorización, Lugares de interés, Zonas, Similares cercanos
- Banner verde: "Obtén el precio de avalúo y precio de venta de este o cualquier departamento ¡gratis!"
- Predicción de precios: 12,777,000 MXN (APROXIMADO)
- Predicción de precios del m²: 23,000 MXN (APROXIMADO)
- Antigüedad estimada: 48 años

### Captura 3 — Tab Valorización
- Evolución precio m² en Gabino Barreda 31
- Dos líneas: Cuauhtémoc (Alcaldía) vs Este Inmueble (Alcaldía)
- Alcaldía: $34.3K → $40.2K (+17%) → $43.9K (+9%) → $49.4K (+13%)
- Este inmueble: $13.7K → $13.5K (+1%) → $17.5K (+29%) → $23.1K (+32%)
- Nota: "En los últimos 4 años esta vivienda aumentó más de un 50%, mientras que en la alcaldía Cuauhtémoc aumentó un 44%"
- "Procesamos 4197 inmuebles para obtener estos resultados"

### Captura 4 — Lugares cercanos + Info de zona
- Lugares cercanos a Gabino Barreda 31
- Categorías con 6 resultados cada una:
  - Colegios/Universidades (6): Nueva Era San Rafael (2 min), Kinder Pipiolo (1 min), Escuela Secundaria Anexa A La Norma... (2 min), Cendi Mascarones Unam (3 min), Edificio De Los Mascarones (3 min), Universidad Del Distrito Federal Ca... (3 min)
  - Parques (6), Hospitales/Centros médicos (6), Transporte (6), Centros comerciales (truncado)
- Información de San Rafael: Cuenta catastral 01100705, Uso de suelo Habitacional, Superficie 779 m²

### Captura 5 — Tab Otros departamentos
- Lista de unidades dentro del edificio:
  - Depto 1: 97m², $6,185,000 → botón "Avalúo"
  - Depto 3: 90m², $5,550,000 → botón "Avalúo"
  - Depto 4: 97m², $6,185,000 → botón "Avalúo"
  - Depto 6: 97m², $6,185,000 → botón "Avalúo"
  - Dpto 2: 109m², $5,696,000 → botón "Avalúo"
  - Dpto 5: 97m², $6,185,000 → botón "Avalúo"
  - Loc 1 Y 2: 112m², $5,853,000 → botón "Avalúo"
- Buscador: "Busca tu departamento"
- Botón "Ver menos"

## Pregunta de Manu

Manu pidió:
1. Un prompt para analizar el sitio web de propiedades.com con la extensión de Chrome
2. Saber de dónde sacan la data que muestran
3. Identificar stack, APIs, hooks, endpoints, lógica, flujos
4. Confirmar si la data es de algún lugar público

---
---

# 3. INVESTIGACIÓN INICIAL — FUENTES DE DATOS

## Web searches realizadas

### Search 1: "propiedades.com explorar mapa API datos catastrales CDMX"
Resultados relevantes:
- propiedades.com dice en su propia página: "Los datos se obtienen del Sistema abierto de información geográfica"
- sig.cdmx.gob.mx permite descargar datos del catastro en CSV y Shapefile por alcaldía
- Un predio puede tener varias cuentas catastrales, relacionadas por columna FID
- Datos disponibles: superficie terreno, superficie construcción, uso construcción, valor unitario suelo, rango niveles, año construcción, instalaciones especiales, monto subsidio, valor suelo
- SEDUVI administra registro de uso de suelo por predio
- Datos descargables en CSV y Shapefile

### Search 2: "propiedades.com explorar mapa stack tecnologia API endpoints"
- No se encontró información específica del stack de propiedades.com
- Resultados genéricos sobre Google Maps API, endpoints REST, etc.

### Search 3: "sig.cdmx.gob.mx descarga datos catastro shapefile API"
Resultados relevantes:
- sig.cdmx.gob.mx/datos/descarga — descarga de datos del catastro
- Formatos: CSV (archivo plano) y Shapefile (geográfico) por alcaldía
- Diccionario de datos del catastro disponible
- Datos de SEDUVI también disponibles en CSV y Shapefile
- ovica.finanzas.cdmx.gob.mx — Oficina Virtual del Catastro
- datos.cdmx.gob.mx — Portal de Datos Abiertos con datasets catastrales
- CEDRUS UNAM confirma que SIG CDMX ofrece capas shapefile de valor del suelo

### Search 4: 'propiedades.com "prediccion de precios" modelo machine learning inmobiliario Mexico'
- No se encontró información específica del modelo de propiedades.com
- Resultados genéricos sobre AVM/ML en real estate (Zillow, Idealista, Redfin)
- Tesis académicas sobre modelos de predicción con XGBoost, Random Forest, etc.

## Conclusión de la investigación

La fuente primaria de datos de propiedades.com es pública y gratuita: el SIGCDMX (sig.cdmx.gob.mx). Lo que propiedades.com agrega encima:

1. **Polígonos de predios** → Shapefile del SIGCDMX (gratis)
2. **Cuentas catastrales por predio** → CSV del catastro, relacionadas por FID
3. **Precio por m²** → Valor catastral unitario del suelo (dato público), NO precio de mercado real
4. **Plusvalía/valorización** → Calculada comparando valores catastrales año con año
5. **Predicción de precios** → Modelo propio de ML (entrenado con catastro + listings + comparables)
6. **Antigüedad estimada** → Directo del catastro (año de construcción)
7. **Lugares cercanos** → Google Places API o similar
8. **Uso de suelo** → Datos de SEDUVI, disponibles en CSV y Shapefile

---
---

# 4. PROMPT INICIAL PARA CHROME — VERSIÓN 1

Se generó un prompt de 7 secciones para la extensión de Chrome:

```
## 1. STACK TECNOLÓGICO
- Framework frontend, bundler, librerías de mapas, CSS framework, state management
- HTML <head> meta tags, scripts, __NEXT_DATA__

## 2. API ENDPOINTS & NETWORK CALLS
- DevTools → Network → XHR/Fetch
- Navegar mapa, zoom, click predios, cambiar colonia
- Para cada request: URL, método, params, response structure, headers
- Buscar endpoints de: polígonos, datos catastrales, unidades, predicción, plusvalía, POI, tiles

## 3. FUENTES DE DATOS
- APIs externas vs datos propios
- Referencias a sig.cdmx.gob.mx, SIGCDMX, catastro, SEDUVI, INEGI, Google Places
- Service worker, cache, código fuente con strings relevantes

## 4. LÓGICA DE MAPA
- Rendering de predios (vectores, raster, GeoJSON)
- Zoom levels, cálculo client-side vs server
- Clustering, lazy loading

## 5. FLUJO DE DATOS DE UN PREDIO
- Endpoints al hacer click
- ID de identificación (cuenta catastral, ID interno, coordenadas)
- Obtención de unidades, predicción, valorización, lugares cercanos

## 6. MODELO DE DATOS
- Estructura de BD inferida
- Mapeo cuenta catastral → predio → unidades

## 7. OPORTUNIDADES
- Endpoints sin autenticación
- Rate limiting, documentación pública
- Datos replicables con SIGCDMX
```

---
---

# 5. UPGRADES AL PROMPT — BASADOS EN LAS BIBLIAS DMX

Manu preguntó si el prompt necesitaba upgrades basados en las Biblias. Se analizaron los documentos del IE buscando:

- Términos de fuentes de datos: SIGCDMX, catastro, DENUE, geo_sources, macro_series, scores, predio, manzana, valor_unitario, absorption, plusvalia, walkability, momentum, livability
- Modelo AVM: automated_valuation, price_prediction, comparable, hedonic, regression
- Rendering de mapas: Mapbox, heatmap, marker, cluster, GeoJSON, vector tile, viewport, bounds
- Relación predio-unidades: polygon, geo_polygon, FID

Se identificaron 6 upgrades necesarios:

### Upgrade 1: Sección 8 — Comparación con modelo DMX — Fuentes catastrales
- ¿Consumen Shapefile o WFS/WMS propio?
- ¿CSV plano con FID?
- ¿Calls a sig.cdmx.gob.mx, ovica.finanzas.cdmx.gob.mx?
- ¿SEDUVI separado o integrado?
- ¿INEGI, DENUE, Registro Público?
- Buscar strings: "DENUE", "INEGI", "SCIAN", "FGJ", "GTFS", "Atlas", "SACMEX", "RAMA", "PAOT", "SEDEMA"

Cruza con: F-GEO-09 (Uso de Suelo SEDUVI) y F-GEO-10 (Catastro CDMX) de la Biblia IE

### Upgrade 2: Sección 9 — Modelo AVM
- Endpoint tipo /api/estimate, /api/valuation, /api/predict
- Campos: confidence, comparables_count, adjustment_factors
- Modelos: regresión, gradient boosting, random forest en JS
- ¿Client-side o server-side?
- Buscar: "hedonic", "regression", "xgboost", "lightgbm", "model", "predict", "estimate", "valuation", "avm"

Cruza con: I01 DMX Estimate (AVM mexicano) de la Biblia IE — plan H2 regression → H3 ML calibrado

### Upgrade 3: Sección 10 — Valorización temporal (plusvalía)
- Endpoint de series temporales por predio o colonia
- ¿Valor catastral año a año o modelo propio?
- ¿% calculados client-side o server?
- ¿Data post-2023?
- Buscar: "time_series", "historical", "trend", "yoy", "appreciation", "plusvalia", "valorizacion"

Cruza con: DMX-MOM (Momentum Index) de la Biblia IE

### Upgrade 4: Sección 11 — Mapeo predio → unidades
- ¿Cuentas catastrales distintas por FID?
- Endpoint tipo /api/predio/{id}/units
- ¿m² y precios del catastro o de listings?
- ¿Cómo diferencian edificio vs casa?

### Upgrade 5: Sección 12 — Stack de mapas detalle técnico
- Google Maps, Mapbox GL, Leaflet
- Vector tiles (MVT/PBF) vs GeoJSON raw
- Performance con miles de predios
- Zoom levels, LOD, clustering, viewport-based loading
- Buscar: "mapboxgl", "google.maps", "L.map", "leaflet", "vectorSource"

Cruza con: Stack DMX usa Mapbox GL JS

### Upgrade 6: Secciones 13-14 — POI y monetización
- Google Places, Foursquare, OSM/Overpass
- Distancias: routing API vs straight-line
- Login gates, rate limiting, paywalls

Cruza con: Plan de tiers DMX (Free: 5 estimaciones/mes → Pro: $2,999 MXN/mes)

---
---

# 6. PROMPT FINAL CONSOLIDADO — 12 SECCIONES

Se generó el prompt final como archivo descargable: `prompt_analisis_propiedades_com.md`

### Estructura del prompt final:

```
## 1.  STACK TECNOLÓGICO
## 2.  API ENDPOINTS & NETWORK CALLS
## 3.  FUENTES DE DATOS — ORIGEN DE LA INFORMACIÓN
## 4.  MODELO AVM — "PREDICCIÓN DE PRECIOS"
## 5.  VALORIZACIÓN TEMPORAL (PLUSVALÍA)
## 6.  MAPEO PREDIO → UNIDADES (DEPARTAMENTOS)
## 7.  STACK DE MAPAS — DETALLE TÉCNICO DE RENDERING
## 8.  DATOS DE LUGARES CERCANOS (POI)
## 9.  INFORMACIÓN DE LA ZONA / COLONIA
## 10. MONETIZACIÓN Y ACCESS GATES
## 11. SEO & RENDERING
## 12. RESUMEN EJECUTIVO (tabla consolidada + listas de endpoints, APIs, datos públicos/privados)
```

Cada sección incluye:
- Qué buscar específicamente
- Qué strings buscar en Sources
- Qué endpoints interceptar en Network
- Qué comparar contra la arquitectura de DMX

---
---

# 7. REPORTE DE CHROME — ANÁLISIS TÉCNICO EXHAUSTIVO DE HABI

Manu ejecutó el prompt en Claude in Chrome y subió el reporte completo. Hallazgos:

## 7.1 HALLAZGO PRINCIPAL: propiedades.com es un white-label de Habi (Colombia)

propiedades.com **no es una plataforma independiente** — es una implementación de **Habimetro**, producto de valuación de Habi (habi.co), startup colombiana con operaciones en México.

Backend real: `apiv2.habi.co/habimetro-global-capabilities/`

## 7.2 STACK TECNOLÓGICO CONFIRMADO

```
Framework:        Next.js 14 — App Router (RSC)
                  buildId: "F1Qa1eOnso11SE7uLRauL"
                  Rutas: /explorar/mapa/[ciudad]/[alcaldia]/[colonia]

Bundler:          Webpack (webpackChunk_N_E, chunk webpack-00178395f9d6b955.js)

React:            Server Components + Client Components
                  Full SSR — datos del predio, polígonos y gráficas de valorización
                  llegan en inline scripts del HTML inicial

State:            Redux Toolkit (RTK)
                  Slices: map, sidePanel, dataLots, dataMzns, dataSuburn,
                  dataTooltipMap, filters, dataHashesMzns, routes, swipe

CSS:              Styled-Components (componentId:"sc-1dac6mg-0")
                  + clases propias .container-habi, .grid-habi

Mapas:            Google Maps JavaScript API v3 (versión 64.8b)
                  API Key: AIzaSyDDrTPCZ4VxYOCRQQTT8k52U01YqygGoC8
                  Scripts: geometry.js, main.js, common.js, map.js, overlay.js,
                  controls.js, marker.js, infowindow.js
                  NO Mapbox, NO Leaflet

Service Workers:  NINGUNO. No hay Cache Storage.
                  IndexedDB localforage v2 (no para datos inmobiliarios)
```

### Scripts externos detectados

```
Google Tag Manager:     GTM-3NTPFD2
Google Analytics 4:     G-G9RXEV9M1M
Meta Pixel (Facebook):  1737663850510885
Google Ads Remarketing: pagead (835264867)
Tipografías:            Roboto + Google Sans
Bot detection:          Script ofuscado /sdnGJHWrJb0Pl17Q3gt_T911/
```

### Redux Slices identificados

```
SLICE            │ ESTADO ALMACENADO
─────────────────┼──────────────────────────────────────────────────
map              │ zoom, view (ficha/lote/mzn/colonia/alcaldia),
                 │ centerCurrent, polygons activos
sidePanel        │ price, pricePerM2, bedrooms, graph
dataLots         │ lotes[], manzana, zona
dataMzns         │ blocks_info[], centroid
dataSuburn       │ nbhd_id, worthmt2_avg, average_price
dataTooltipMap   │ labels de markers hover
filters          │ offMarket, typeOffer, typeProperty, bedrooms, price, area
dataHashesMzns   │ hashes de propiedades en manzana
routes           │ urlInmueblePage, skeletonInmueblePage
swipe            │ topSwipe, activeCapas
```

## 7.3 API ENDPOINTS CONFIRMADOS

### API Key hardcodeada (pública/expuesta en JS bundle)

```
x-api-key: GwtjF2RJVpatSk4HH8Otj2JuDDhz4cUE9NPaokQq
consumer: habimetro
BASE URL: https://apiv2.habi.co/habimetro-global-capabilities/
Cache: revalidate: 86400 (24h en Next.js cache)
```

### Endpoint 1: GET /neighborhood/info — Datos de la colonia

```
URL: https://apiv2.habi.co/habimetro-global-capabilities/neighborhood/info
     ?country=MX&nbhd_id={nbhd_id}    (ej: 090150767)

RESPONSE (real, Hipódromo):
{
  "nbhd_id": "090150767",
  "name": "Hipodromo",
  "state": "Df / Cdmx",
  "worthmt2_avg": 67286.87,        ← precio/m² promedio venta
  "average_price": 8885444.02,     ← precio promedio total
  "average_bathroom": 2.09,
  "average_parking": 1.43,
  "average_rooms": 2.28
}
```

### Endpoint 2: GET /neighborhood/graph — Serie histórica de precios colonia

```
URL: https://apiv2.habi.co/habimetro-global-capabilities/neighborhood/graph
     ?country=MX&nbhd_id={nbhd_id}

RESPONSE (real, Hipódromo):
{
  "info": { "countProperties": 5042 },     ← sample size del modelo
  "lines": [
    {
      "layer": "colonia",
      "name": "CUAUHTEMOC",
      "data": [
        {"year": 2023, "price": 58526.33, "valorization": 0.1091},
        {"year": 2022, "price": 52770.22, "valorization": 0.1237},
        {"year": 2021, "price": 46959.47, "valorization": 0.2512},
        {"year": 2020, "price": 37533.01, "valorization": -0.1321},
        {"year": 2019, "price": 43244.91, "valorization": null}
      ]
    },
    {
      "layer": "alcaldia",
      "name": "CUAUHTEMOC",
      "data": [ ... misma estructura ... ]
    }
  ]
}

NOTAS:
- % de valorización vienen PRE-CALCULADOS del API, no client-side
- Datos van de 2019 a 2023. No hay data más reciente
- Valores con muchos decimales (58526.33360984324) sugieren promedio
  simple o regresión, no valor catastral oficial
```

### Endpoint 3: GET /neighborhood/polygons — Manzanas de una colonia

```
URL: https://apiv2.habi.co/habimetro-global-capabilities/neighborhood/polygons
     ?country=MX&url_explorar=true&nbhd_id={nbhd_id}

RESPONSE:
{
  "centroid": {"lat": 19.409..., "lng": -99.171...},
  "url": "explorar/mapa/ciudad-de-mexico/cuauhtemoc/hipodromo",
  "blocks_info": [
    {
      "id_mz": "0901500011341016",    ← 16 dígitos: estado+municipio+colonia+manzana
      "geometry": [{"lat":..., "lng":...}, ...],
      "centroid": {"lat":..., "lng":...},
      "price_mean": 9318570,
      "worthmt2_avg": 39516.5
    },
    ...
  ]
}
```

### Endpoint 4: GET /get_polygons — Polígonos de colonias por viewport

```
URL: https://apiv2.habi.co/habimetro-global-capabilities/get_polygons
     ?country=MX&url_explorar=true
     &p0={lat_ne},{lng_ne}     ← esquina noreste del viewport
     &p1={lat_sw},{lng_sw}     ← esquina suroeste del viewport
     &type=3                   ← tipo (3 = colonia/suburb)

RESPONSE:
{
  "polygons": [
    {
      "id_suburb": "090160626",
      "name": "Tacubaya",
      "alcaldia": "Miguel Hidalgo",
      "url_pcom": "explorar/mapa/ciudad-de-mexico/miguel-hidalgo/tacubaya",
      "geometry": [[{"lat":..., "lng":...}, ...]],
      "latitude": 19.400...,
      "longitude": -99.187...,
      "price_mean": 2856926.55,
      "worthmt2_avg": 36804.58
    },
    ...
  ]
}

NOTAS:
- type=3 = colonias
- Radio de búsqueda: ±20km / 111km por grado
```

### Endpoint 5: GET /get_lots — Todos los lotes de una manzana

```
URL: https://apiv2.habi.co/habimetro-global-capabilities/get_lots
     ?country=MX&url_explorar=true
     &id_mz={id_mz}                    ← ej: 0901500011341016
     [&id_lote={lote_id}]              ← opcional
     [&id_catastro={catastro_id}]      ← opcional
     [&cadastral_account={cuenta}]     ← opcional

RESPONSE:
{
  "zona": {
    "suburb_name": "Hipodromo",
    "id_colonia": "090150767",
    "url_pcom": "explorar/mapa/...",
    "alcaldia": "Cuauhtémoc",
    "bounds_antiquity_zone": {"min": 0, "max": 96},
    "bounds_area_zone": {"min": 36.08, "max": 1400},
    "bounds_price_zone": {"min": 2000000, "max": 14550000},
    "mt2_by": [
      {"property_type_id": "1", "mt2_zone_median": 64838.71},  ← casa
      {"property_type_id": "2", "mt2_zone_median": 46388.89},  ← depto
    ],
    "hidden": false
  },
  "manzana": {
    "id_mz": "0901500011341016",
    "url_pcom": "explorar/mapa/ciudad-de-mexico/cuauhtemoc/hipodromo/1341016",
    "worthmt2": {
      "house":      {"min": 21290.8, "mean": 21937, "median": 21950.9, "max": 22788.3},
      "department": {"min": 38299.4, "mean": 48175.1, "median": 41861.8, "max": 71827.9}
    },
    "prices_avg": {
      "house": 11082322.52,
      "department": 8876192.92
    },
    "info_labels": [ ... listings activos en la manzana ... ]
  },
  "lotes": [
    {
      "fid": "315896",                  ← ID interno del lote (Habi)
      "lot_price_min": 4417656.01,
      "lot_price_max": 4417656.01,
      "lot_price_median": 4417656.01,
      "lot_worthmt2_min": 22311.39,
      "lot_worthmt2_median": 22311.39,
      "lot_worthmt2_max": 22311.39,
      "direccion": "amsterdam 161",
      "num_properties": 1,
      "hidden": false,
      "url_pcom": "https://propiedades.com/explorar/amsterdam-161-hipodromo-c02713502-196933",
      "geometry": [[{"lat":..., "lng":...}, ...]],
      "info_labels": [ ... listings activos en este lote ... ]
    },
    ... (31 lotes en esta manzana)
  ]
}
```

### Endpoint 6: GET /get_lot — Detalle completo de un lote individual

```
URL: https://apiv2.habi.co/habimetro-global-capabilities/get_lot
     ?country=MX
     &lote_id={fid}                     ← ej: 315896
     [&cadastral_account={cuenta}]      ← ej: 02713502
     [&catastro_id={catastro_id}]       ← ID sistema OVICA

RESPONSE (real):
{
  "id_lot": "315896",
  "id_colonia": "090150767",
  "median_zone_id": 336,
  "lot_address": "amsterdam 161",
  "description": "Hipodromo, Ciudad de México, CDMX",
  "longitude": -99.1720278805854,
  "latitude": 19.4101773993302,
  "lot_area_land": 113,               ← m² de terreno
  "lot_construction_use": "Habitacional",
  "cadastral_account": "02713502",     ← cuenta catastral CDMX
  "bounds_antiquity_lot": {"min": 54, "max": 54},
  "bounds_area_lot": {"min": 198, "max": 198},
  "bounds_price_lot": {"min": 4417656.01, "max": 4417656.01},
  "lot_worthmt2_min": 22311.39,
  "lot_worthmt2_median": 22311.39,
  "lot_worthmt2_max": 22311.39,
  "median_price_m2_house": 16958.39,
  "median_price_m2_department": 67085.83,
  "last_month_change": 0.030038,       ← cambio precio/m² último mes
  "last_month_lot_worthmt2": 650.65,
  "percentage_house": 4.6,
  "percentage_department": 95.4,
  "percentage_0_4_years": 41.2,
  "percentage_5_9_years": 11.9,
  "percentage_10_19_years": 20.3,
  "percentage_more_20_years": 26.6,
  "lot_properties": [
    {
      "address": "Amsterdam 161",
      "antiquity": 54,
      "area_land": 113,
      "area": 198,
      "construction_use": "Habitacional",
      "catastro_id": "1395118",         ← ID catastro CDMX (OVICA)
      "last_ask_price": 4417656.01,
      "propert_type": "casa",
      "property_number": "161",
      "num_cadastre": "amsterdam 161",
      "type_front": "casa",
      "hidden": false,
      "last_month_change": 0.030038,
      "last_month_worthmt2": 21660.75,
      "worthmt2_property": 22311.39
    }
  ]
}
```

### Endpoints 7-9: Municipality level

```
GET /municipality/info      ?country=MX&municipality_id={id}     → Stats alcaldía
GET /municipality/graph     ?country=MX&municipality_id={id}     → Serie histórica
GET /municipality/polygons  ?country=MX&url_explorar=true        → Polígonos viewport
                            &p0={lat,lng}&p1={lat,lng}

NOTA: municipality/info y /graph devuelven 204 (No Content) para Cuauhtémoc
— solo operativo donde Habi tiene volumen suficiente
```

### Tiles de mapa base

```
URL: https://maps.googleapis.com/maps/api/staticmap
     ?center={lat},{lng}&zoom=15&size=1366x400
     &style=feature:all|element:all|saturation:-100
     &style=feature:poi.business|visibility:off
     &key=AIzaSyDDrTPCZ4VxYOCRQQTT8k52U01YqygGoC8

Google Maps Static API con estilo en escala de grises, POI ocultos
```

## 7.4 FUENTES DE DATOS — HALLAZGO DEFINITIVO

**NO hay llamadas directas a sig.cdmx.gob.mx, ovica.finanzas.cdmx.gob.mx, INEGI, ni ninguna fuente gubernamental.**

El claim de "Sistema Abierto de Información Geográfica" en el UI es marketing.

```
DATO MOSTRADO                   │ FUENTE REAL                    │ ORIGEN PROBABLE
────────────────────────────────┼────────────────────────────────┼──────────────────────
Polígonos de colonias           │ apiv2.habi.co/get_polygons     │ Catastro CDMX + SIG
                                │                                │ procesado por Habi
Polígonos de manzanas           │ apiv2.habi.co/neighborhood/    │ Idem
                                │ polygons                       │
Polígonos de predios (lotes)    │ apiv2.habi.co/get_lots         │ Geometrías nivel predio
Cuenta catastral (02713502)     │ campo cadastral_account        │ Catastro CDMX (copia)
ID catastro (1395118)           │ campo catastro_id              │ Sistema OVICA (copia)
Uso de suelo (Habitacional)     │ campo lot_construction_use     │ SEDUVI/Catastro CDMX
Antigüedad (54 años)            │ campo antiquity                │ Catastro CDMX
m² terreno y construcción       │ campos area_land, area         │ Catastro CDMX
Precio/m² estimado              │ campo worthmt2_property        │ Modelo AVM de Habi
Precio total estimado           │ campo last_ask_price           │ Modelo AVM de Habi
Serie histórica plusvalía       │ neighborhood/graph             │ Agregado propio de Habi
Listings de propiedades         │ hashesData (SSR inline)        │ BD propiedades.com
Fotos                           │ propiedadescom.s3.amazonaws.com│ AWS S3
Mapa base                       │ maps.googleapis.com/maps/vt    │ Google Maps
```

### Strings NO encontrados en el código fuente

El código fuente **no menciona**: INEGI, DENUE, SEDUVI, CONAPO, sig.cdmx, ovica, inmuebles24, Mapbox, Foursquare, TensorFlow, XGBoost, LightGBM, ni ningún término de ML/modelo explícito.

### Strings SÍ encontrados

- `google.maps` (Maps JS API)
- `localforage` (IndexedDB genérico)
- `axios` (wrapper de fetch)

## 7.5 MODELO AVM — PREDICCIÓN DE PRECIOS

### Arquitectura

**100% server-side.** No hay fórmulas visibles en JavaScript del cliente. La valuación llega como campo `worthmt2_property` y `last_ask_price`.

### Metodología oficial (texto en HTML de la ficha)

> "Analizamos el precio promedio de las viviendas que están a la venta en tu zona. Se tienen en cuenta datos básicos como su antigüedad y el área en metros cuadrados. Estas características son las que permiten comparar tu casa o Departamentos con otros similares."

**Modelo de valoración hedónica simplificado por comparables de mercado.**

### Inputs confirmados

```
- Latitud / Longitud del predio
- lot_area_land (m² de terreno, fuente: catastro)
- area (m² de construcción)
- antiquity (antigüedad, fuente: catastro)
- property_type (casa / departamento)
- id_colonia (colonia)
- listings activos en la zona (hashesData del portal)
```

### Outputs

```
- worthmt2_property: precio estimado por m² del predio individual
- last_ask_price: precio total estimado
- last_month_change: variación mes a mes (%)
- last_month_lot_worthmt2: variación mes a mes (MXN/m²)
- lot_worthmt2_min/median/max: rango de incertidumbre
```

### Lo que NO expone

```
- Intervalo de confianza
- R² del modelo
- Número de comparables usados
- Feature importance
- Variables de calidad de vida (POI, transporte, seguridad)
- Temporal momentum
- Ajuste por riesgo
```

### Nombre interno del producto: "Habimetro"

Referencias en URLs: `/habimetro/explorar/mapa` y header `consumer: "habimetro"`

## 7.6 JERARQUÍA DE IDs CONFIRMADA

```
ALCALDÍA (municipio)
  ↓ municipality_id: "cuauhtemoc" (slug)
COLONIA (neighborhood)
  ↓ id_suburb/nbhd_id: "090150767" (9 dígitos: estado+municipio+colonia AGEB)
MANZANA (block)
  ↓ id_mz: "0901500011341016" (16 dígitos: extiende id_suburb con manzana)
  ↓ URL param: /1341016 (últimos 7 dígitos)
LOTE (predio/lot)
  ↓ fid: "315896" (ID interno Habi)
  ↓ cadastral_account: "02713502" (cuenta catastral CDMX 8 dígitos)
  ↓ catastro_id: "1395118" (ID sistema OVICA)
  ↓ URL: /explorar/amsterdam-161-hipodromo-c02713502-196933
PROPIEDAD/UNIDAD (dentro del lote)
  ↓ lot_properties[]: propiedades catastrales individuales
  ↓ info_labels[]: listings activos asociados
```

**Relación lote → unidades:** Un lote con múltiples unidades tiene varios objetos en lot_properties[], cada uno con su propio catastro_id.

**Diferenciación edificio vs casa:** Campo type_front: "casa" + percentage_department vs percentage_house + num_properties > 1.

## 7.7 STACK DE MAPAS — RENDERING

```
Motor:            Google Maps JS API v3
Vector tiles:     NO (ni MVT, ni PBF, ni Mapbox)
Polígonos:        google.maps.Polygon creados en cliente desde geometry arrays
Hit testing:      google.maps.geometry.poly.containsLocation()
Labels precio:    Markers HTML overlay (AdvancedMarkerElement o InfoWindow)
Mapa base:        Google Maps tiles estándar (sin customización)
```

### Zoom levels y Level of Detail (LOD)

```
zoom ≤ 14    → Vista Alcaldía  (municipality/polygons)
zoom 15–17   → Vista Colonia   (get_polygons type=3)
zoom > 17    → Vista Manzana   (neighborhood/polygons)
zoom ≥ 18    → Vista Lote      (get_lots)
zoom 19+     → Vista Ficha     (get_lot)

Código confirmado:
  validateViewZoom: a => a <= 14    // alcaldía
  validateViewZoom: a => a >= 15    // colonia
  validateViewZoom: a => a >= 17    // manzana
  validateViewZoom: a => a >= 18    // lote
```

### Performance

Viewport como bounding box (p0, p1) para cargar solo polígonos visibles. Radio: 10km de margen en zoom manzana, 20km en zoom colonia. Cache 86400s desde Next.js.

## 7.8 LUGARES CERCANOS (POI)

### Arquitectura: Next.js Streaming SSR

Los POI se renderizan 100% en servidor vía streaming SSR. Mecanismo:
1. HTML envía Suspense boundary vacío (`<template id="B:1">`)
2. Servidor calcula POI mientras cliente recibe el resto
3. Servidor hace streaming del fragment con `$RC("B:1","S:1")` y `self.__next_f.push()`

### Estructura de datos POI (real, extraída del stream SSR)

```json
{
  "address": "Amsterdam 161",
  "categories": {
    "education": [
      {"sitio": "instituto aberdeen", "tiempo": 1},
      {"sitio": "neillparkschool", "tiempo": 3},
      {"sitio": "kent nursery school", "tiempo": 1},
      ... 10 resultados
    ],
    "health": [
      {"sitio": "fleimo", "tiempo": 2},
      {"sitio": "rehabilitacion bucal", "tiempo": 2},
      ... 10 resultados
    ],
    "historical_culture": [
      {"sitio": "l galleria arte y diseño", "tiempo": 2},
      {"sitio": "museo nacional de historia castillo de chapultepec", "tiempo": 5},
      ... 10 resultados
    ],
    "transport": [
      {"sitio": "linea 9-chilpancingo", "tiempo": 2},
      {"sitio": "linea 9-patriotismo", "tiempo": 5},
      {"sitio": "linea 1-juanacatlan", "tiempo": 3},
      ... 6 resultados
    ],
    "comercial_center": null
  }
}
```

### Hallazgos críticos

- **Solo 2 campos por POI:** `sitio` (nombre) y `tiempo` (minutos caminando)
- No hay coordenadas, no hay rating, no hay dirección, no hay ID externo
- UI muestra 6 por categoría (cap duro), API devuelve hasta 10
- `tiempo` es entero — probablemente straight-line con velocidad peatonal (~80m/min)
- **Fuente probable:** BD propia de Habi construida sobre OSM/Overpass API
- Los nombres como "linea 9-chilpancingo" son nomenclatura de Metro CDMX, no Google Places
- Data **pre-computada** y cacheada en backend, no en tiempo real
- NO se detectaron calls a Google Places, Foursquare, HERE, ni Overpass

## 7.9 MONETIZACIÓN Y ACCESS GATES

```
FUNCIÓN                              │ SIN LOGIN │ CON REGISTRO
─────────────────────────────────────┼───────────┼─────────────
Ver mapa + precios de zona           │ ✅ Libre  │ -
Ver precios/m² por manzana           │ ✅ Libre  │ -
Ver precio estimado del predio       │ ✅ Libre  │ -
Ver cuenta catastral                 │ ✅ Libre  │ -
Ver m² terreno y construcción        │ ✅ Libre  │ -
Serie histórica plusvalía            │ ✅ Libre  │ -
Listings activos                     │ ✅ Libre  │ -
POI / Lugares cercanos               │ ✅ Libre  │ -
"Generar reporte"                    │ 🔒 Lead   │ Requiere datos
Banner avalúo                        │ 🔒 Lead   │ CTA formulario
```

**Rate limiting:** Sin headers X-RateLimit. API key en bundle público sin ofuscación. Solo bloqueado por CORS.

**Modelo de negocio:** Lead generation — banners capturan email/teléfono. Datos abiertos para atraer tráfico SEO.

## 7.10 SEO

```
Renderizado:       Full SSR con Next.js 14 App Router — todo indexable
JSON-LD:           NO EXISTE (oportunidad perdida)
Meta robots:       Default (index, follow)
Canonical:         https://propiedades.com/explorar/mapa/.../
Sitemap:           Existe (/sitemap.xml status 200)
URLs semánticas:   Sí hasta nivel manzana, luego -c{cuenta}-{id} (opaco)
Open Graph:        og:title, og:description, og:url pero SIN og:image
robots.txt:        Permite todo excepto /properties/*, login, registro, admin
```

**Puntos débiles SEO:**
- Sin JSON-LD/Schema.org para RealEstateListing o Place
- Sin og:image
- Título genérico sin precio
- URLs de lotes con estructura no-semántica

## 7.11 ANALYTICS & TRACKING

```
HERRAMIENTA                │ ID / CONFIG           │ EVENTOS
───────────────────────────┼───────────────────────┼──────────────────────
Google Tag Manager         │ GTM-3NTPFD2           │ Contenedor principal
Google Analytics 4         │ G-G9RXEV9M1M          │ page_view, load_time
Meta Pixel (Facebook)      │ 1737663850510885      │ SubscribedButtonClick
Google Ads Remarketing     │ 835264867             │ Pixel conversión
GTM data-gtm attributes   │ Inline en HTML        │ banner_avaluo_mapa,
                           │                       │ generar-reporte,
                           │                       │ site_of_interest_education,
                           │                       │ render-casa-sola,
                           │                       │ mapa-catastro
```

## 7.12 TABLA RESUMEN EJECUTIVO FINAL

```
ASPECTO                 │ QUÉ USA                        │ FUENTE          │ REPLICABLE?
────────────────────────┼────────────────────────────────┼─────────────────┼────────────
Polígonos colonias      │ get_polygons?type=3 (GeoJSON)  │ Catastro vía    │ Parcial:
                        │                                │ Habi (privado)  │ AGEB INEGI
Polígonos manzanas      │ neighborhood/polygons          │ Idem            │ Marco geo INEGI
Polígonos predios       │ get_lots + get_lot             │ OVICA vía Habi  │ Sí: OVICA pública
Datos catastrales       │ Campos en get_lot              │ Catastro CDMX   │ Sí: OVICA, SIG
Unidades por edificio   │ lot_properties[] en get_lot    │ Catastro CDMX   │ Sí: OVICA
Predicción precios AVM  │ Modelo Habimetro server-side   │ 100% Privado    │ No directamente
Plusvalía histórica     │ neighborhood/graph 2019-2023   │ Agregado Habi   │ Parcial: OVICA
Lugares cercanos POI    │ Streaming SSR {sitio,tiempo}   │ BD Habi (OSM?)  │ Sí: Overpass+OSRM
Uso de suelo            │ lot_construction_use           │ SEDUVI vía Habi │ Sí: SEDUVI/SIG
Mapa base               │ Google Maps JS API v3 tiles    │ Google (pago)   │ Sí: Mapbox/OSM
Listings de mercado     │ hashesData en SSR              │ 100% Privado    │ No: requiere portal
```

## 7.13 DATOS 100% PÚBLICOS Y DESCARGABLES

```
1. Polígonos de colonias CDMX — sig.cdmx.gob.mx/datos-abiertos/
2. Polígonos de manzanas — Marco Geoestadístico INEGI
3. Datos catastrales por cuenta — ovica.finanzas.cdmx.gob.mx
4. Uso de suelo — SEDUVI / SIG CDMX
5. Polígonos de predios (lotes) — Catastro CDMX SHP/GeoJSON
6. Estaciones metro/metrobús — Datos abiertos CDMX
7. POI (escuelas, hospitales) — OpenStreetMap / Overpass API
```

## 7.14 DATOS PROPIETARIOS DE HABI

```
1. Modelo AVM Habimetro (precio/m² estimado, black box server-side)
2. Series temporales valorización 2019-2023
3. Base de listings activos (hashesData)
4. ID interno fid (clave maestra Habi)
5. Scoring de zona (median_zone_id: 336)
6. Tiempos de caminata POI (pre-computados)
```

## 7.15 LIMITACIONES TÉCNICAS OBSERVADAS

```
1. Datos históricos truncados en 2023
2. Sin confianza del AVM (no R², no comparables count)
3. Sin coordenadas en POI (solo nombre + tiempo)
4. Sin datos de renta
5. municipality/ devuelve 204 para muchas alcaldías
6. Caché agresivo 86400s (precios desactualizados hasta 24h)
7. Sin paginación de lotes
8. API key expuesta sin autenticación por usuario
9. No hay WebSockets ni SSE
10. Cobertura débil en colonias con pocos listings
```

---
---

# 8. ANÁLISIS CRUZADO — HABI VS DMX (7 PUNTOS)

Se realizó un análisis punto por punto comparando Habi con la arquitectura de DMX:

### Punto 1: Su AVM vs I01 DMX Estimate
Habi usa modelo hedónico simplificado: antigüedad + m² + tipo + colonia. Sin variables de accesibilidad, sin POI, sin temporal momentum. DMX plan para I01: regression lineal (H2) → ML calibrado con 200+ data points (H3). DMX supera en diseño antes de implementar.

### Punto 2: Su plusvalía vs DMX-MOM
Habi tiene 5 puntos anuales (2019-2023), truncados, basados en medianas de listings. DMX Momentum Index combina temporal derivatives de DENUE, FGJ, GTFS, catastro, SACMEX — multivariable con dirección + velocidad. No hay comparación.

### Punto 3: Sus POI vs 17 geo sources de DMX
Habi solo tiene nombre + minutos caminando, sin coordenadas, sin ratings, sin categorización SCIAN. DMX plan R5a-2 con DENUE tier mapping, SIGED, DGIS, Atlas Riesgos, RAMA, PAOT es ordenes de magnitud más profundo.

### Punto 4: Su stack de mapas vs DMX
Habi: Google Maps JS API con google.maps.Polygon — pesado, sin vector tiles, hit-testing por containsLocation(). DMX: Mapbox GL JS con vector tiles nativos, WebGL rendering, heatmaps por score. Ventaja técnica clara para DMX.

### Punto 5: Data pública que DMX puede ingestar
Todo lo que Habi tiene de catastro viene de OVICA + SIG CDMX — exactamente lo mapeado como F-GEO-09 (Uso de Suelo) y F-GEO-10 (Catastro) en la Biblia IE. Ingestores catastro.ts y uso-suelo.ts están como stubs H2. Cuando se implementen: paridad en data base y superioridad en scores.

### Punto 6: API key expuesta (oportunidad)
API key hardcodeada: `GwtjF2RJVpatSk4HH8Otj2JuDDhz4cUE9NPaokQq`, sin rate limiting, solo CORS. Desde server se puede consultar para benchmark de calibración. NOTA: Se recomendó NO hacer esto (ver sección 9).

### Punto 7: Debilidades que son oportunidad DMX
Sin JSON-LD/Schema.org, datos truncados en 2023, sin intervalo de confianza en AVM, sin datos de renta, cobertura incompleta por alcaldía, sin WebSockets. Todo contemplado en las Biblias de DMX.

---
---

# 9. API KEY EXPUESTA — QUÉ ES, QUÉ SE PUEDE HACER, RIESGOS

Manu preguntó específicamente sobre la API key expuesta.

### Qué es
Llave de autenticación que el frontend de propiedades.com usa para hablar con el backend de Habi. Hardcodeada en el JavaScript público. Visible para cualquiera con DevTools.

### Qué se puede hacer técnicamente
Desde cualquier servidor (no browser por CORS), se puede hacer requests como:
```
GET https://apiv2.habi.co/habimetro-global-capabilities/get_lot?country=MX&lote_id=315896
Header: x-api-key: GwtjF2RJVpatSk4HH8Otj2JuDDhz4cUE9NPaokQq
```
Y devuelve datos completos del predio.

### ¿Se pueden dar cuenta?
Sí, potencialmente. Habi puede tener logging del lado del servidor que registre IPs, volumen de requests, user-agents, y patrones de consumo. Si se hacen miles de requests desde IP que no es propiedades.com, pueden detectarlo. No sabrían quién específicamente, pero sí que alguien consume su API sin autorización.

### Recomendación
**No hacerlo.** Razones:
1. Zona gris legal (posible violación de ToS + equivalente mexicano de Computer Fraud and Abuse Act)
2. No se necesita — los datos catastrales base son públicos y gratuitos en OVICA y SIG CDMX
3. Lo único propietario de Habi es el AVM (precio estimado), y DMX va a construir el I01 propio

**Ruta limpia:** Descargar shapefiles y CSVs de sig.cdmx.gob.mx, implementar ingestores F-GEO-09 y F-GEO-10, entrenar modelo propio con datos públicos + listings.

---
---

# 10. UPGRADES NUCLEARES — QUÉ CREAR CON LA DATA DESCUBIERTA

Manu preguntó: "con este análisis, qué puedo crear, no para competir con ellos, pero sí para dar un upgrade nuclear a la data que estamos consiguiendo"

### Nivel 1 — Paridad inmediata (lo que Habi tiene, DMX no)
Ingestores F-GEO-09 (Uso de Suelo) y F-GEO-10 (Catastro CDMX) están como stubs. Implementarlos da: polígonos de predios, cuentas catastrales, m² terreno/construcción, uso de suelo, antigüedad, relación predio→unidades. Todo gratis desde OVICA + SIG CDMX.

### Nivel 2 — Superioridad por profundidad (lo que DMX diseñó, Habi no tiene)
Habi: 2 campos por POI (nombre + minutos). DMX: 17 geo sources con DENUE tier mapping SCIAN, FGJ con crime trajectory, GTFS con frecuencias, Atlas Riesgos, SIGED, DGIS, SACMEX, RAMA, PAOT. Cada uno alimenta scores compuestos.

### Nivel 3 — El upgrade nuclear real (5 conceptos)

**A) Temporal Intelligence sobre catastro**
Descargar catastro cada trimestre. Calcular deltas: qué predios cambiaron uso de suelo, qué manzanas subieron de valor catastral, dónde hay construcción nueva. Alimenta N03 Gentrification Velocity y N11 DMX Momentum Index. Habi no tiene esto.

**B) Cross-reference catastro × DENUE = Ecosystem Economics**
Catastro = qué hay construido. DENUE = qué actividad opera ahí. Cruzarlos a nivel manzana: densidad económica por m² construido, ratio comercial/habitacional real (no normativo), sofisticación económica por tier SCIAN. N01 Ecosystem Diversity Score sale de este cruce. Nadie en México hace esto.

**C) AVM calibrado con catastro + listings + scores**
Habi: antigüedad + m² + tipo + colonia. DMX I01: mismas variables base + Walkability MX score, Crime Trajectory score, Ecosystem Diversity score, School Premium score, Infrastructure Resilience score como features adicionales. Modelo de precio que incorpora calidad de vida como variable predictora. PriceHubble hace esto en Europa, nadie en LATAM.

**D) Predio-level Intelligence Card**
Habi: ficha con datos planos. DMX: intelligence card por predio con score compuesto DMX (0-100), momentum de la manzana (subiendo/bajando + velocidad), risk score (sísmico + inundación + crimen), comparativa vs colonias similares, proyección 12 meses. Producto licenciable que ningún portal mexicano ofrece.

**E) Demand signal (la capa que nadie tiene)**
Habi solo ve supply (listings). DMX con PostHog integrado captura demand signals: zonas buscadas, filtros usados, proyectos favoriteados, scores consultados. Demand × supply × location intelligence = data flywheel que Habi no puede replicar porque no tiene marketplace con usuarios navegando.

### Orden concreto propuesto

```
1. Descargar datos OVICA/SIG CDMX (shapefiles + CSV catastral)
2. Implementar ingestor F-GEO-10 (catastro.ts) → poblar geo_data_points
3. Implementar F-GEO-09 (uso de suelo)
4. Cruzar con DENUE (F-GEO-01, parcialmente existente) a nivel manzana
5. Con 3 datasets cruzados → calcular N01 Ecosystem Diversity como primer score real
```

---
---

# 11. MÓDULO DE CARGA INTELIGENTE — IDEA DE UPLOAD UNIVERSAL CON IA

Manu preguntó si se podía crear un módulo donde se suba el archivo (CSV, Shapefile, PDF) y la IA lo parsee, clasifique, mapee al schema, y deje listo en geo_data_points — similar al módulo de carga del portal de desarrolladores.

### Preguntas de contexto realizadas (sin respuesta aún)

1. ¿Qué hace exactamente hoy el módulo de carga del portal desarrollador? ¿PDFs de brochures/inventario? ¿CSVs?
2. ¿Dónde estamos con el repo? ¿Ingestores F-GEO-09 y F-GEO-10 siguen como stubs?
3. ¿La visión es solo data gubernamental o también uploads de asesores/admins?
4. ¿Volumen y frecuencia? ¿Carga manual trimestral o cron automático?

### Recomendación
Este módulo es para sesión 14+ (R2) o sesión dedicada posterior. No mezclar con ingestores geo de sesión 07.

---
---

# 12. TIMING — CUÁNDO INCORPORAR LOS HALLAZGOS

## Discusión sobre sesiones

Manu indicó que acaba de terminar sesión 06 (IE1) y va a comenzar IE2 (sesión 07).

### Mapa de sesiones relevantes

```
Sesión 06 (IE1) ✅ COMPLETADA
  → IE1 §1-3: Visión + Arquitectura + Fuentes + SCIAN
  → IE5 §11: Cascadas

Sesión 07 (IE2) → SIGUIENTE
  → IE1 §3.1-3.4: Ingestores geo (DENUE, FGJ, GTFS, Atlas, SIGED, DGIS, SACMEX)
  → IE4 §9.12: Sistema de snapshots temporales + scores nuevos
  → BE2 §5.2b: Crons de ingesta

Documentos a subir en sesión 07:
  1. IE1 (IE_DMX_v4_PART1_v2.md)
  2. IE4 (IE_DMX_v4_PART4.md)
  3. BE2 (BACKEND_DMX_v4_PART2.md)
  4. SESION_07_IE2 (instrucciones acumulativas)
```

### Conclusión sobre timing

**Sesión 07 ES el momento perfecto** para meter los hallazgos de Habi porque:
- Sesión 07 cubre IE1 §3.1-3.4 = ingestores de fuentes geo
- Sesión 07 cubre IE4 §9.12 = snapshots temporales + scores nuevos
- Los upgrades son exactamente sobre ingestores y snapshots

### Estado de R5a

Manu indicó que "R5a ya lo pasamos" pero no quedó claro si se refiere a R5a-2 (IE Geo Ingesta) implementado con data real, o a la sesión de diseño/documentación completada. Se subió el MAPA_DOCUMENTOS_POR_SESION.md para aclarar.

El mapa confirma que las sesiones son de **diseño/documentación**, no de implementación con Claude Code. Las 20 sesiones cubren todo el diseño de la Biblia.

---
---

# 13. MAPA DE DOCUMENTOS POR SESIÓN (transcripción completa)

```
SESIÓN │ DOCS BIBLIA              │ SECCIONES QUE CUBRE
───────┼──────────────────────────┼──────────────────────────────
  01   │ BE1 + BE2                │ BE1 §1-2, BE2 §3 ✅ COMPLETADA
  02   │ FE1 + BE2                │ FE1 §4.1-4.2, BE2 §4.3-4.4
  03   │ FE1                      │ FE1 §4.3
  04   │ FE1 + BE1                │ FE1 §4.4-4.5, BE1 §2.2
  05   │ FE1                      │ FE1 §4.6-4.10
  06   │ IE1 + IE5                │ IE1 §1-3, IE5 §11
  07   │ IE1 + IE4 + BE2          │ IE1 §3.1-3.4, IE4 §9.12, BE2 §5.2b
  08   │ IE2                      │ IE2 §4 completo (21 scores)
  09   │ IE2                      │ IE2 §5 completo (16 scores)
  10   │ IE4                      │ IE4 §9.1-9.11
  11   │ IE3 + IE5                │ IE3 §6, IE5 §11 cascadas
  12   │ IE3 + IE4                │ IE3 §7-8.1, IE4 §10
  13   │ IE3 + IE5                │ IE3 §8.2, IE5 §11.1b+12
  14   │ FE1 + BE3                │ FE1 dev refs, BE3 §7.2 R2
  15   │ BE3                      │ BE3 §7.2 R3
  16   │ BE3                      │ BE3 §7.2 R4
  17   │ FE1 + FE2 + BE2 + BE3   │ FE2 §6.5-6.6, BE3 §6.2-6.3
  18   │ FE2 + IE3                │ FE2 §5.3+6.1-6.4+6.7, IE3 §7.1-7.4
  19   │ BE1+BE2+BE3+IE5+FE2     │ FE2 §5.2, BE3 §6.1+R9, IE5 §12-13
  20   │ BE2 + BE3 + FE1 + FE2   │ BE2 §5.2b, BE3 §R10, FE1 §1+3, FE2 §6.8-6.9
```

### Regla importante
Nunca subir los 10 documentos a una sesión. El archivo de instrucciones acumulativo (SESION_XX) reemplaza la necesidad del historial completo.

---
---

# 14. DOCUMENTO FINAL GENERADO — INGESTORES GEO: ESTADO ACTUAL + UPGRADES

Se generó el archivo `INGESTORES_GEO_ESTADO_Y_UPGRADES_SESION07.md` con 4 partes:

### PARTE A: Estado actual de 17 fuentes geo
- Tabla completa de 17 ingestores con: fuente, archivo .ts, estado, volumen, prioridad
- URLs de descarga confirmadas para cada fuente
- Schema destino (geo_data_points)
- Sistema de snapshots (tabla geo_snapshots) con frecuencia por fuente
- Scores alimentados por tier (Tier 1-4)

### PARTE B: Hallazgos del análisis de Habi/propiedades.com
- Stack comparison (Habi vs DMX)
- 9 endpoints confirmados con URLs, payloads, responses
- Modelo de datos con jerarquía de IDs
- AVM: inputs, outputs, lo que NO tiene
- Fuentes de datos que Habi usa (todas públicas)

### PARTE C: 6 Upgrades para sesión 07

**Upgrade 1: Promover F-GEO-09 y F-GEO-10 de STUB H2 → R5a-2**
- Justificación: Habi construyó todo sobre catastro + uso de suelo
- Impacto: volumen R5a-2 pasa de ~820K a ~3.3M registros
- Consideración: filtrar a 5 alcaldías reduce catastro a ~500K cuentas

**Upgrade 2: Relación predio → unidades (padre-hijo)**
- Campo parent_catastral, manzana_id, lote_id, num_interior, is_parent, unit_count
- Key de agrupación: FID del shapefile
- Impacto en scores: I01, F07, A05, Intelligence Card

**Upgrade 3: Snapshot catastral trimestral**
- Agregar catastro y uso_suelo al SNAPSHOT_CONFIGS
- Habilita detección de: cambios de valor, cambios de uso, construcción nueva, subdivisión
- Alimenta: N03, N11, I01
- Ventaja: 2 snapshots en julio, 3 en octubre, tendencia anualizada en diciembre

**Upgrade 4: Cross catastro × DENUE a nivel manzana**
- Key de cruce: manzana_id (id_mz 16 dígitos INEGI)
- Output: densidad económica, ratio comercial/habitacional real, sofisticación SCIAN, empleos estimados, diversidad Shannon
- Potencia: N01, N02, N03, I01
- IP más difícil de replicar (mapeo SCIAN × catastro × snapshots)

**Upgrade 5: Intelligence Card a nivel predio**
- Endpoint GET /api/v1/intelligence-card?lat=X&lon=Y
- Agrega todos los scores por lat/lon de un predio
- Response: dmx_score compuesto, scores individuales con trends, momentum, estimate, comparables
- Se consume en: portal público, asesor, desarrollador, API externa, contenido
- Se enriquece automáticamente conforme se implementan más scores

**Upgrade 6: OVICA como fuente complementaria de F-GEO-10**
- Modo 1 (Batch): CSV/Shapefile trimestral de sig.cdmx.gob.mx
- Modo 2 (On-demand): consulta ovica.finanzas.cdmx.gob.mx por cuenta catastral
- catastro.ingestBatch(alcaldia) + catastro.enrichPredio(cuenta)
- Datos adicionales potenciales: ficha completa, historial cambios, estado pago predial

### PARTE D: Resumen para sesión 07
- 5 documentos a subir
- 6 upgrades con tabla de impacto y esfuerzo
- Lo que NO llevar: módulo upload IA (→ sesión 14+), implementación real (→ R5a-2), consumo API Habi (→ no), scraping (→ no)

---
---

# 15. ARCHIVOS GENERADOS EN ESTA SESIÓN

```
1. prompt_analisis_propiedades_com.md
   → Prompt de 12 secciones para Claude in Chrome
   → Ubicación: /mnt/user-data/outputs/

2. INGESTORES_GEO_ESTADO_Y_UPGRADES_SESION07.md
   → Estado actual de 17 ingestores + 6 upgrades post-Habi
   → Ubicación: /mnt/user-data/outputs/

3. Este reporte completo
   → Ubicación: /mnt/user-data/outputs/
```
