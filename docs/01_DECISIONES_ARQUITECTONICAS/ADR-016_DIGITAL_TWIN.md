# ADR-016 — Digital Twin 4D de ciudades LATAM (FASE 32)

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

El **Shift 2** del documento de visión ([00.1 §5](../00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md#shift-2--de-scores-estáticos-a-digital-twin-temporal-tesla)) establece el tránsito **de scores estáticos → digital twin temporal**. En H1 DMX implementa la parte **temporal** (momentum, score_history, snapshots). En H2 (FASE 32) DMX extiende el shift al **digital twin completo — 3D + tiempo = 4D**.

### Referencias de digital twin fuera del vertical

| Empresa | Digital twin | Valor |
|---------|--------------|-------|
| **Tesla** | Vehicle digital twin (cada Tesla físico tiene gemelo digital con estado real-time) | OTA updates, predictive maintenance, AI training |
| **NVIDIA Omniverse** | Platform digital twin para factorías, ciudades, robots | Siemens, BMW, Mercedes usan para planning |
| **Unity / Unreal** | Real-time 3D engines usados en urbanismo | Singapore Virtual Singapore, Helsinki 3D |
| **Microsoft Flight Simulator** | Twin del planeta (Bing Maps + ML build up) | 2 Exabytes de data |
| **Cityzenith SmartWorldOS** | Urban digital twin platform | Amaravati, Las Vegas, LA |
| **Bentley iTwin** | Infrastructure digital twin (carreteras, puentes) | B2B engineering |
| **Hexagon / Autodesk** | BIM digital twin | Construction industry |

El patrón: **digital twins son plataformas de decisión** donde stakeholders exploran "qué si" antes de actuar en la realidad. Es *simulación sobre mundo real*.

### Por qué digital twin para DMX específicamente

1. **Diferenciación categórica extrema.** Ningún player LATAM tiene esto. CoStar tiene 3D viewers estáticos (building scans) pero NO temporal dinámico. Cherre tiene Knowledge Graph (edges) pero NO 3D. Local Logic/Walk Score/First Street son 2D.
2. **Uso real por stakeholders.**
   - Compradores: "muéstrame Roma Norte en 2023 vs 2026" — ven gentrificación visual.
   - Desarrolladores site selection: "si construyo torre 20 pisos en este lote, cómo impacta Walk/Sun/Transit scores vecinos?"
   - Gobierno/urbanismo: planificación uso de suelo con simulación.
   - Inversionistas: visualizar pipeline proyectos + momentum zonas.
3. **Multiplica valor del IE.** Scores abstractos sobre mapas 2D tienen X usuarios; sobre digital twin 4D interactivo tienen 10X usuarios.
4. **PR + branding.** "DMX mapea LATAM en 4D" es cobertura tech prensa garantizada.
5. **Natural extension del moat temporal.** Snapshots ya existen (score_history, zone_snapshots, geo_snapshots). Digital twin los superpone geométricamente.

### Estado del arte tech 2026

- **Mapbox Standard** — nuevo estilo 3D con OSM Buildings nativo, luz del sol dinámica, shadow casting. Released 2024-2025, stable 2026.
- **OSM Buildings (osmbuildings.org)** — dataset open source de ~200M edificios geo-ubicados + altura + uso estimados.
- **Three.js + react-three-fiber** — stack estándar para 3D en React.
- **deck.gl** (Uber) — WebGL rendering de capas geoespaciales sobre Mapbox.
- **NVIDIA Omniverse** — enterprise-grade platform digital twin. Evaluable H3 para casos Enterprise.
- **Unity + Unreal** — opciones futuras H3 para clientes que requieran fidelidad fotorrealista.
- **Cesium Ion** — alternative a Mapbox con 3D Tiles estándar.

### Fuerzas H2

- FASE 30 API as Product genera demanda de "give me more ways to consume scores" — digital twin es uno.
- FASE 31 Agentic Marketplace demanda superficies visuales para agents (un agent "Monitor Roma Norte" devuelve resultados mejor sobre twin 3D).
- Compute cost del 3D ha caído 10x (2022 → 2026) con WebGPU + Vercel Edge + Cloudflare R2 + Mapbox compute.

## Decision

**En FASE 32 (H2) se construye Digital Twin 4D de ciudades LATAM**, con implementación progresiva por ciudad y features.

### D1 — Stack técnico

| Capa | Tech | Rationale |
|------|------|-----------|
| Base map | Mapbox Standard style + OSM Buildings | Estándar industria + 3D nativo + mantenimiento abierto |
| 3D engine | react-three-fiber + drei + @react-three/postprocessing | Stack React maduro 2026 |
| Rendering layer | deck.gl (capas geoespaciales) | Uber-grade performance |
| Geometry data | OSM Buildings + Catastro CDMX + elevaciones SRTM | Capas públicas combinadas |
| Temporal slider | React + Framer Motion | UX slider smooth |
| Collab multiplayer | Liveblocks (Figma pattern) | SaaS de multiplayer collab |
| What-if simulator | Custom + Three.js + constraints físicos | Compute cliente + server assist |
| Export / share | PNG/WebM/GLTF export | Stakeholders compartir |
| VR/AR H3 | WebXR API + opciones Meta Quest | Preparado sin bloquear H2 |

### D2 — Features H2 (FASE 32)

**F1 — 3D buildings + streets**
- Rendering 3D de edificios con altura real (OSM + Catastro) + texturas procedurales.
- Calles con flujo de tráfico (Mapbox Traffic API).
- Landmarks 3D (edificios icónicos importados como GLTF curados).

**F2 — Temporal slider**
- Slider UI "2020 → 2022 → 2024 → 2026" (snapshots disponibles).
- Transición smooth entre estados (morphing buildings if nuevos proyectos aparecieron).
- Overlay scores cambiantes (color code edificios/zonas por momentum).
- Comparador split-screen "2022 vs 2026" lado a lado.

**F3 — What-if simulator**
- Usuario dibuja polígono (lote) en mapa.
- Ingresa parámetros: "torre residencial, 20 pisos, 80 units, target range $X-$Y".
- Simulador compute impacto en scores vecinos (walkability pierde o gana, ecosystem SCIAN cambia, density shift).
- Output: "Walk Score zona bajaría de 82 a 78; momentum podría cambiar de + a -. Ecosistema pierde diversidad −0.4 Shannon-Wiener."
- Útil para devs pre-compra terreno + gobierno para planificación.

**F4 — Collaborative multiplayer**
- Usuario 1 (asesor) + Usuario 2 (comprador) + Usuario 3 (arquitecto) editan twin simultáneamente (Figma pattern con Liveblocks).
- Presence awareness (cursors, nombres).
- Chat inline.
- Snapshots compartidos (URL con estado).
- Caso de uso: visita virtual Roma Norte con comprador que está en otra ciudad.

**F5 — Data layers toggle**
- Crime heatmap temporal (FGJ data) — toggle on/off.
- Transit coverage evolution (GTFS) — animación crecimiento red Metro/Metrobús.
- Amenity density delta (DENUE) — muestra apertura/cierre negocios por zona.
- Risk overlays (sismos, hídrico, atlas de riesgos).
- Momentum zonas (DMX-MOM color code).
- Gentrification velocity (N03).
- Water infrastructure (SACMEX).

**F6 — Export + embed**
- Export PNG/WebM (timelapse) / GLTF 3D.
- Embed widget `<iframe>` para portales terceros mostrando twin limitado (plan API-gated).
- Compartir link (Frame.io pattern).

### D3 — Ciudades roll-out H2

| Orden | Ciudad | Trigger |
|-------|--------|---------|
| 1 | CDMX (piloto) | ≥3 snapshots completos + catastro MX procesado |
| 2 | Bogotá | LATAM expansion FASE H2 + OSM coverage verificado |
| 3 | São Paulo | Brasil H2 + partnerships geo confirmados |
| 4 | Monterrey | Segunda ciudad pivote H1 |
| 5 | Buenos Aires | Argentina H2 |
| 6 | Santiago | Chile H2 |
| 7+ | Guadalajara, Medellín, Río, CABA extended... | On-demand |

### D4 — Compute architecture

- **Client-side first** para UX interactivo (pan, zoom, rotate). Assets 3D servidos desde Cloudflare R2 / Vercel Blob.
- **Server-side compute** para what-if simulator + snapshot rendering. Vercel Edge Functions + workers en Supabase Edge Functions.
- **Preload snapshots** por zona visible — hot cache Upstash Redis.
- **Progressive loading** — LOD (level of detail) en función de zoom.
- **H3 evaluación NVIDIA Omniverse** para clientes Enterprise que requieran fidelidad fotorrealista.

### D5 — API endpoints (expuestos via FASE 30)

- `GET /v1/digital-twin/buildings?bbox=...&period=2024-Q1` — geometry + metadata.
- `GET /v1/digital-twin/snapshots?zone_id=...&period_from=...&period_to=...`.
- `POST /v1/digital-twin/what-if` — simula cambio + retorna impact scores.
- `POST /v1/digital-twin/sessions` — crea sesión multiplayer.
- `GET /v1/digital-twin/layers` — disponibles (crime, transit, amenity, risk, etc.).

Rate limit Pro/Enterprise tiers (compute caro). Free tier: solo 2D mode + scores textuales.

## Rationale

### Por qué nadie más tiene esto en LATAM

- CoStar 3D es CRE commercial, US-centric, sin temporal.
- Cherre es graph-only.
- Local Logic es 2D.
- Google Earth tiene 3D pero no scores IE ni what-if.
- Ningún local (DD360, Pulppo, Wiggot) tiene base tech.

Ventana de exclusividad: 24-36 meses mínimo.

### Por qué temporal + 3D = 4D

3D solo es viewer. Temporal solo es dashboard. 4D (3D + tiempo) es *simulación*. Simulación es donde ocurren las decisiones (Tesla, NVIDIA Omniverse, Microsoft Flight Sim demuestran el valor).

### Por qué Mapbox Standard + OSM Buildings

- **Mapbox** ya es base map estándar industria (Uber, Strava, Figma, Foursquare usan).
- **Standard style** nativo 3D maduro 2026.
- **OSM Buildings** cobertura LATAM suficiente para H2 (~80% en capitales).
- **Catastro CDMX** llena gaps MX.
- Alternative Cesium Ion evaluada y descartada por costo + complexity; Mapbox suficiente.

### Por qué H2 (no H1)

- Compute cost 3D requiere scale para justificar infra.
- UX 3D requiere designers especializados (headcount H2).
- Priority H1 es scoring + marketplace.
- H1 entrega "2D temporal + momentum" que ya diferencia.
- Digital twin 4D amplifica valor pero no es crítico para launch.

### Por qué evaluación NVIDIA Omniverse H3

Omniverse es fotorrealista + physics simulation pero requires NVIDIA hardware clients + costo enterprise. DMX H2 queda en WebGL (universal access). H3 puede desplegar Omniverse para clientes Enterprise que lo requieran sin afectar core.

## Consequences

### Positivas

- **Moat 10x.** Feature que competidores requerirían 18-24 meses + equipo 3D dedicado para replicar.
- **PR guaranteed.** "DMX mapea LATAM en 4D" es tech press inevitable.
- **Enterprise upsell.** Bancos/aseguradoras/fondos pagan premium por what-if simulator.
- **Agents upgrade.** Agentes ADR-014 ganan superficie visual rica (reports con twin embebido).
- **Government/urbanism market.** Nuevo segmento B2G abierto (planificación urbana).
- **Education/academia.** Universidades + centros de investigación pueden licenciar twin.
- **Viral UX.** Compartir "timelapse 2020-2026 Roma Norte" en redes sociales = acquisition orgánica.

### Negativas / tradeoffs

- **Compute cost.** 3D rendering + physics simulation aunque WebGL es client-side, server compute para what-if + persist state + collab = $2K-$10K/mes infra H2. Escala con usage.
- **3D engineering team needed.** Requires hiring 1-2 engineers 3D / WebGL + 1 designer 3D. Costo ~$400K-$600K/año.
- **Mobile UX challenge.** 3D en mobile Chromium funciona pero performance variable. Mitigación: 2D fallback + progressive loading.
- **Dataset maintenance.** OSM Buildings + Catastro cambian. Pipeline de actualización continua (quarterly mínimo).
- **Accuracy expectations.** Users esperan fotorealism; twin procedural puede decepcionar. Mitigación: UI claramente identifica "representación esquemática" + disclaimer.
- **Privacy concerns.** Mostrar lotes específicos + edificios genera questions "¿se puede ver mi casa?". Mitigación: solo edificios públicos OSM, no PII; opt-out para owners que lo soliciten.

### Neutrales

- **Requires Catastro data licensing.** CDMX + Monterrey catastros tienen data pública; otras ciudades requieren gestión (H2 per-ciudad).
- **LATAM OSM coverage uneven.** CDMX ~95%, Bogotá ~85%, otras ~70%. Rolling update continuo.
- **Collab multiplayer Liveblocks.** Costo ~$0.10/user hour activo. Gated a Pro+.
- **VR/AR (Meta Quest, Vision Pro) H3** — queda fuera de H2 scope pero WebXR compatible por diseño.

## Alternatives considered

### Alt 1: "Just keep 2D maps" (sin 3D)
**Rechazada.** Detallado en Rationale. Competidores están 2D; nos quedamos igual.

### Alt 2: "AR-first no 3D desktop"
**Rechazada.** AR/VR penetration LATAM baja 2026 (<5% asesores con Quest). Desktop/mobile web es donde viven users. AR/VR es H3 optional.

### Alt 3: "Fotorrealistic Unity/Unreal desktop app"
**Rechazada.** Requires app download + install + friction. Pierde accesibilidad web. Costo licensing Unity/Unreal no justificado H2.

### Alt 4: "Cesium Ion en lugar de Mapbox"
**Rechazada.** Cesium es excellent pero pricing enterprise-only. Mapbox tiene pricing dev-friendly + comunidad más amplia en React stack.

### Alt 5: "NVIDIA Omniverse desde H2"
**Rechazada.** Enterprise only, complex setup, requires NVIDIA hardware clients. H3 evaluable cuando scale justifique.

### Alt 6: "Digital twin H1 (parallel a scoring)"
**Rechazada.** Budget H1 no alcanza + priority scoring. Prematuro.

### Alt 7: "Solo temporal slider, no 3D"
**Rechazada.** Half-measure que no logra moat 10x. Mejor hacerlo bien en H2 que a medias H1.

## Success metrics

- **Adoption:** ≥30% usuarios Pro+ abren twin ≥1 vez/semana.
- **Engagement:** Session duration en twin ≥5 min promedio.
- **Share rate:** ≥1% de twin sessions generan share link.
- **B2B Enterprise:** ≥3 clientes Enterprise paying $25K+/mes que incluyen twin.
- **What-if simulator usage:** ≥100 simulaciones/mes Mes 6 post-FASE 32.
- **Ciudades:** CDMX, Bogotá, São Paulo desplegadas Mes 12.
- **Tech PR:** ≥3 artículos tier 1 tech (TechCrunch LATAM, Expansión Tech, Forbes Tech) cubriendo twin.

## References

- [00.1 §5 Shift 2](../00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md#shift-2--de-scores-estáticos-a-digital-twin-temporal-tesla) — shift temporal → twin.
- [ADR-010 — IE Pipeline](./ADR-010_IE_PIPELINE_ARCHITECTURE.md) — temporal snapshots existentes.
- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) — FASE 32 en H2.
- [ADR-013 — API as Product](./ADR-013_API_AS_PRODUCT.md) — exposición vía API.
- [FASE 32 — Digital Twin](../02_PLAN_MAESTRO/FASE_32_DIGITAL_TWIN.md).
- [07.3 GC-3 Temporal / Twin](../07_GAME_CHANGERS/).
- [07.6 GC-6 What-if simulator](../07_GAME_CHANGERS/).
- [07.13 GC-13 Data layers](../07_GAME_CHANGERS/).
- Mapbox Standard docs — https://docs.mapbox.com/mapbox-gl-js/.
- OSM Buildings — https://osmbuildings.org/.
- react-three-fiber docs — https://docs.pmnd.rs/react-three-fiber.
- deck.gl — https://deck.gl.
- Liveblocks — https://liveblocks.io.
- NVIDIA Omniverse — https://www.nvidia.com/en-us/omniverse/.
- Virtual Singapore (reference) — https://www.nrf.gov.sg/programmes/virtual-singapore.
- Tesla Vehicle Twin (various public talks).

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
