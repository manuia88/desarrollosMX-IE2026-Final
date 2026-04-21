# FASE 32 — Digital Twin 4D

> **Duración estimada:** 6 sesiones Claude Code (~24 horas)
> **Dependencias:** [FASE 11 XL — IE Índices DMX + moonshots core + seeds (Time Machine API, Constellations, Living Atlas, Climate Twin, LifePath, Genoma — seeds implementados)](./FASE_11_IE_INDICES_DMX.md), [FASE 21 — Portal Público](./FASE_21_PORTAL_PUBLICO.md), [FASE 28 — Launch Soft](./FASE_28_LAUNCH_SOFT.md)
> **Bloqueantes externos:**
> - `MAPBOX_ACCESS_TOKEN` con plan que incluye Mapbox Standard + 3D Buildings
> - OpenStreetMap Buildings dataset access (free) + tiles hosting
> - Cuenta Liveblocks para multiplayer collaboration (`LIVEBLOCKS_SECRET`)
> - iOS Developer account + Android Developer account para AR companion app (H3 pin)
> - Mesh licensing o data provider for temporal historical tiles (Here, TomTom o procesado propio)
> - `FFMPEG_SERVICE_URL` (Remotion Lambda o self-host) para export video/GIF
> **Horizonte:** H2
> **Resultado esperado:** Digital Twin 4D de CDMX (y resto ciudades roadmap) — 3D buildings Mapbox + OSM con layers temporales deslizables (2020→2026→proyecciones 2030), data layers toggleables (crime heatmap, transit, amenity density, risk polygons), what-if simulator ("si construyo torre X en zona Y, cómo cambian scores"), multiplayer collaboration (Liveblocks — pattern Figma), AR companion app como STUB H3 (GC-39), export video/GIF timelapse para marketing. Tag `fase-32-complete`.
> **Priority:** [H2]

## Contexto y objetivo

El mapa 2D de FASE 21 resolvió "ver zonas y scores". Esta fase va a otra dimensión — **experiencia 4D (3D espacial + tiempo) que convierte DMX en el único proveedor de "ciudad como producto"**. Es diferenciación visible en demos: competidor muestra tabla Excel, DMX muestra ciudad 3D que evoluciona en el tiempo y responde a what-ifs del usuario.

Rationale: ver [ADR-011](../01_DECISIONES_ARQUITECTONICAS/ADR-011_MOONSHOT_3_HORIZONTES.md), [ADR-016 Digital Twin](../01_DECISIONES_ARQUITECTONICAS/ADR-016_DIGITAL_TWIN.md). El moat aquí es **datos temporales propios + 3D interactivo + multiplayer**. El 3D sin datos es bonito pero inútil; los datos sin 3D son Excel que ya existe. Mapbox GL JS + react-three-fiber + nuestros `zone_scores` históricos producen un producto único.

Audience prioritaria:
1. **Comprador ficha proyecto** — timelapse "cómo se veía Polanco en 2020 vs hoy vs proyecciones 2030".
2. **Asesor presentación** — carga proyecto 3D, toggle layers, muestra crime drop + transit improve.
3. **Desarrollador site selection** — what-if "si construyo torre 20 pisos aquí, cómo afecta vista/tráfico/valores circundantes".
4. **Terminal B2B** (FASE 35) — integrado en dashboards enterprise.

El branding: "DMX Atlas 4D". URL pública: `desarrollosmx.com/atlas`.

## Bloques

### BLOQUE 32.A — 3D buildings base layer

#### MÓDULO 32.A.1 — Mapbox Standard + OSM Buildings

**Pasos:**
- `[32.A.1.1]` Setup Mapbox Standard style en `features/atlas-4d/lib/mapbox-style.ts` — configuración 3D nativa con `lightPreset: 'day'`, `showBuildings: true`, `showRoadLabels: true`, terrain exaggeration 1.2.
- `[32.A.1.2]` Extender con OSM Buildings tiles hosted en nuestro S3 (Vercel Blob si dataset <50GB). Script `scripts/osm-buildings-etl.mjs` descarga extracts de geofabrik.de (CDMX, GDL, MTY), genera tiles MVT, sube a bucket `atlas-4d-tiles`.
- `[32.A.1.3]` Layer `buildings-3d-extruded` en map style:
  ```ts
  {
    id: 'buildings-3d-extruded',
    source: 'osm-buildings',
    'source-layer': 'building',
    type: 'fill-extrusion',
    paint: {
      'fill-extrusion-height': ['coalesce', ['get', 'height'], ['*', ['get', 'levels'], 3]],
      'fill-extrusion-base': 0,
      'fill-extrusion-color': [
        'interpolate', ['linear'], ['zoom'],
        15, '#aaa',
        17, '#888'
      ],
      'fill-extrusion-opacity': 0.85,
    },
  }
  ```
- `[32.A.1.4]` Tests visual regression con Playwright + percy.io para layer base en 5 zonas.

**Criterio de done del módulo:**
- [ ] CDMX 3D visible zoom 14-20.
- [ ] Tiles servidos <200ms p95.

### BLOQUE 32.B — react-three-fiber layer (interactive 3D objects)

#### MÓDULO 32.B.1 — r3f integration

**Pasos:**
- `[32.B.1.1]` Setup `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing`. Next.js dynamic import con `{ ssr: false }` para evitar SSR issues con THREE.
- `[32.B.1.2]` Wrapper component `features/atlas-4d/components/interactive-scene.tsx` que se superpone al canvas Mapbox via `mapbox-gl-threejs-interop` o custom layer con `customLayer.onAdd`.
- `[32.B.1.3]` Objetos interactivos r3f:
  - **Hotspots**: esferas flotantes sobre zonas con score alto (click → drawer con métricas).
  - **Proyectos DMX**: modelos simplificados (`<Box>`) con altura × valor × color coded por operation.
  - **Trayectorias transit**: líneas animadas desde stops a destinos populares.
  - **Iso-chrones** (accessibility): polígonos suaves (convexHull) mostrando 15/30/45 min commute.
- `[32.B.1.4]` Performance: LOD (level of detail) — reduce geometry density a zoom bajo. Frustum culling enabled. Target 60fps @ desktop, 30fps mobile.

**Criterio de done del módulo:**
- [ ] r3f layer interactivo sobre Mapbox.
- [ ] 60fps desktop validated.

### BLOQUE 32.C — Temporal slider (2020→2030)

#### MÓDULO 32.C.1 — Historical snapshots from zone_scores

**Pasos:**
- `[32.C.1.1]` Query `SELECT zone_id, score_name, value, period_start FROM zone_scores WHERE period_start BETWEEN '2020-01-01' AND NOW() ORDER BY period_start` — datos viene de FASE 07-12.
- `[32.C.1.2]` Endpoint tRPC `atlas.getTemporalSnapshots(input: { country_code, bbox, period_start, period_end, interval })` → retorna snapshots por mes/trimestre.
- `[32.C.1.3]` Slider UI component `features/atlas-4d/components/temporal-slider.tsx`:
  - Scrubbable (debounced 200ms) con react-aria.
  - Ticks mensuales con label trimestral.
  - "Play" button que anima mes-a-mes a 1fps (cinemática).
  - Keyboard accessible (arrows ±1 mes, Shift+arrows ±1 año).
- `[32.C.1.4]` Animación: al mover slider, layers color-coded re-interpolan suave (Mapbox expression `interpolate` + `step`). Evitar re-fetch; usar pre-loaded snapshots en memoria.

**Criterio de done del módulo:**
- [ ] Slider mueve entre 2020 y hoy.
- [ ] Animación fluida sin stutter.

#### MÓDULO 32.C.2 — Proyecciones 2026-2030

**Pasos:**
- `[32.C.2.1]` Modelo forecast sencillo H2 (ARIMA o Prophet) sobre `zone_scores` → genera proyecciones por zona × score.
- `[32.C.2.2]` Tabla `zone_score_projections`:
  ```sql
  CREATE TABLE public.zone_score_projections (
    zone_id UUID NOT NULL,
    country_code CHAR(2) NOT NULL,
    score_name TEXT NOT NULL,
    period DATE NOT NULL,
    value_predicted NUMERIC(10,4) NOT NULL,
    confidence_low NUMERIC(10,4),
    confidence_high NUMERIC(10,4),
    model_version TEXT NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (zone_id, score_name, period)
  );
  ```
- `[32.C.2.3]` Visual distinction: proyecciones renderizadas con pattern rayado + opacidad 0.7 + legend "[proyección]". Confidence interval visible on hover.
- `[32.C.2.4]` Cron mensual recompute proyecciones.

**Criterio de done del módulo:**
- [ ] Proyecciones visible slider futuro.
- [ ] UX transmite incertidumbre (confidence).

### BLOQUE 32.D — Data layers toggle

#### MÓDULO 32.D.1 — Layer system

**Pasos:**
- `[32.D.1.1]` Componente `features/atlas-4d/components/layer-panel.tsx` con toggles:
  - Crime heatmap (desde `geo_snapshots` metric `crime_rate_*`)
  - Transit network (GTFS stops + routes + isochrones)
  - Amenity density (DENUE SCIAN tiered)
  - Risk polygons (Atlas Nacional — sismo, inundación, deslave)
  - Air quality (RAMA — si FASE 07 activada)
  - Price heatmap (`zone_price_index`)
  - New developments pipeline (DMX projects)
- `[32.D.1.2]` Cada layer con opacity slider + color palette picker + "focus mode" (resto layers fade out).
- `[32.D.1.3]` Performance: WebGL instancing para heatmaps densos. Deferred rendering para layers no-visibles.
- `[32.D.1.4]` URL state: layers encoded en query string para share links (`?layers=crime,transit&opacity=70,40&period=2024-06`).

**Criterio de done del módulo:**
- [ ] 7 layers toggleables.
- [ ] Share link reproduce estado exacto.

### BLOQUE 32.E — What-if simulator

#### MÓDULO 32.E.1 — Simulation engine

**Pasos:**
- `[32.E.1.1]` UI: click en lote vacío → modal "Simular construcción" con inputs:
  - Tipo: torre residencial / mixed use / comercial / oficina
  - Altura (pisos 3-50)
  - Densidad (units / unit mix)
  - Precio avg por m²
  - Timeline (construcción 18-36 meses)
- `[32.E.1.2]` tRPC `atlas.simulateConstruction` que calcula impacto:
  - `supply_pressure_delta` — aumento oferta en zona → impacto price_index (función calibrada con FASE 12 IE scores).
  - `transit_saturation_delta` — población extra vs capacidad metro.
  - `amenity_demand_delta` — demanda comercio → signal gentrification_velocity.
  - `view_obstruction` — geometría 3D nueva torre vs circundantes (raycasting).
- `[32.E.1.3]` Resultado overlay en mapa: polígonos circundantes con color delta (verde = positivo, rojo = negativo), tooltip con números.
- `[32.E.1.4]` Export "scenario" — guarda en tabla `atlas_scenarios` (owner-scoped, shareable con link), permite comparar N escenarios side-by-side.
- `[32.E.1.5]` Tabla:
  ```sql
  CREATE TABLE public.atlas_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    country_code CHAR(2) NOT NULL,
    name TEXT NOT NULL,
    inputs JSONB NOT NULL,
    results JSONB NOT NULL,
    share_slug TEXT UNIQUE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

**Criterio de done del módulo:**
- [ ] Simulator devuelve 4 deltas + visual overlay.
- [ ] Scenarios save + share.

### BLOQUE 32.F — Multiplayer collaborative (Liveblocks)

#### MÓDULO 32.F.1 — Figma-pattern sync

**Pasos:**
- `[32.F.1.1]` Instalar `@liveblocks/react` + `@liveblocks/node`. Auth token provisioning tRPC `atlas.getLiveblocksToken` retorna JWT firmado con permissions para room.
- `[32.F.1.2]` Cada atlas session es un `room` Liveblocks. URL pattern `/atlas/room/{room_id}?country=MX`.
- `[32.F.1.3]` Shared state via `useStorage`:
  - Layers activos + opacidades
  - Slider temporal position
  - What-if scenarios pending
  - Annotations (usuario dibuja polygon + comenta)
- `[32.F.1.4]` Presence: cursores de cada participante con avatar + nombre. Broadcast events: zoom together, focus annotation.
- `[32.F.1.5]` Permissions: owner invita via email; guests pueden view-only o edit. Audit log de acciones.

**Criterio de done del módulo:**
- [ ] 4 usuarios editan room simultáneamente.
- [ ] State sync <200ms p95.

### BLOQUE 32.G — AR companion app (H3 pin — GC-39)

#### MÓDULO 32.G.1 — STUB iOS/Android

**Pasos:**
- `[32.G.1.1]` STUB — activar FASE 38+ (post International Expansion). Documentar arquitectura:
  - iOS: ARKit + RealityKit.
  - Android: ARCore + Sceneform.
  - App wrapper Expo/React Native share codebase.
  - Backend: asesor escanea QR en propiedad → app carga zona scores + overlay AR de crime heatmap, transit lines, projected developments.
- `[32.G.1.2]` Landing page `/ar-app` con waitlist form (almacena en `features/ar-waitlist`).
- `[32.G.1.3]` Badge `[H3 próximamente]` en UI donde se menciona AR mode.
- `[32.G.1.4]` Cross-reference [GC-39](../07_GAME_CHANGERS/07.3_PROPTECH_CLUSTER.md#gc-39) pattern.

**Criterio de done del módulo:**
- [ ] STUB marcado.
- [ ] Waitlist funcional.

### BLOQUE 32.H — Export video/GIF timelapse

#### MÓDULO 32.H.1 — Remotion-based export

**Pasos:**
- `[32.H.1.1]` Service `apps/atlas-renderer/` con Remotion + Vercel Functions (fluid compute) para renderizar video de una sesión atlas.
- `[32.H.1.2]` Input: `{ bbox, period_start, period_end, layers, duration_seconds, resolution, format: 'mp4'|'gif'|'webm' }`. Output: URL firmada a asset en Blob storage (TTL 7 días).
- `[32.H.1.3]` Pattern uso:
  - Asesor genera timelapse zona para compartir en WhatsApp (GC-10/GC-87 pattern).
  - Marketing exporta para social media (15/30/60s cuts).
  - Reports includen video embed.
- `[32.H.1.4]` Watermark DMX bottom-right. Removible en plan Pro+.
- `[32.H.1.5]` Cross-reference [GC-10 Social Video](../07_GAME_CHANGERS/07.5_SOCIAL_CLUSTER.md#gc-10) y [GC-87](../07_GAME_CHANGERS/07.4_AI_CLUSTER.md#gc-87).

**Criterio de done del módulo:**
- [ ] Export MP4 de 30s en <2 min.
- [ ] GIF export funcional.

## Criterio de done de la FASE

- [ ] 3D buildings layer activo en CDMX + 2 ciudades más.
- [ ] react-three-fiber interactive objects superpuestos.
- [ ] Temporal slider 2020→2030 con proyecciones.
- [ ] 7 data layers toggleables con URL state.
- [ ] What-if simulator con 4 deltas + scenarios save/share.
- [ ] Multiplayer Liveblocks — 4+ concurrent users testados.
- [ ] AR companion app STUB + waitlist H3.
- [ ] Export video/GIF via Remotion.
- [ ] Performance 60fps desktop / 30fps mobile validados.
- [ ] RLS en `atlas_scenarios` (owner-scoped) + `zone_score_projections` (public read).
- [ ] Tag git: `fase-32-complete`.

## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados con integration tests
- [ ] Permission enforcement validado para cada rol (asesor / dev / comprador / admin / superadmin)

### States
- [ ] Loading states: 3D tiles loading, temporal slider buffering, what-if computing
- [ ] Error states: WebGL not supported, Liveblocks disconnect, render fail
- [ ] Empty states: "No data for this period"
- [ ] Success states: scenario saved, export ready notification

### Quality
- [ ] Mobile responsive verificado — 3D degradado a 2D+overlays en mobile low-end
- [ ] Accessibility WCAG 2.1 AA (keyboard nav para slider y toggles, ARIA, contrast, focus visible)
- [ ] `prefers-reduced-motion` respeta (anima timelapse disabled)
- [ ] i18n — zero strings hardcoded
- [ ] Core Web Vitals green (LCP <2.5s, FID <100ms, CLS <0.1)
- [ ] FPS budget — monitor y degrada gracefully si <30fps sostained

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright visual regression para 5 zones / 3 periodos
- [ ] PostHog events tracked (atlas_session_start, layer_toggle, scenario_saved, export_requested)
- [ ] Sentry captures errors
- [ ] WebGL memory leaks tested (run loop 10 min sin crecer >200MB)

### Stubs (si aplica)
- [ ] STUB AR marcado `// STUB — activar FASE 38+`
- [ ] STUB visible al user con badge `[H3 próximamente]`
- [ ] Waitlist AR funcional
- [ ] STUB documentado en §5.B

### Sign-off
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-32-complete aplicado post-merge

## Schema SQL adicional

```sql
-- Annotations multiplayer (BLOQUE 32.F)
CREATE TABLE public.atlas_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT NOT NULL,
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  geometry GEOMETRY(Polygon, 4326),
  label TEXT,
  body_markdown TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_aa_room ON public.atlas_annotations (room_id, created_at DESC);

-- AR waitlist (BLOQUE 32.G STUB)
CREATE TABLE public.ar_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  country_code CHAR(2) NOT NULL,
  role TEXT,
  signed_up_at TIMESTAMPTZ DEFAULT now()
);

-- Export jobs (BLOQUE 32.H)
CREATE TABLE public.atlas_export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  spec JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','rendering','ready','failed')),
  output_url TEXT,
  output_format TEXT CHECK (output_format IN ('mp4','gif','webm')),
  duration_seconds INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_aej_owner ON public.atlas_export_jobs (owner_id, created_at DESC);
```

## tRPC procedures (nuevos en features/atlas-4d/routes/)

- `atlas.getTemporalSnapshots` — ver BLOQUE 32.C; input `{ country_code, bbox, period_start, period_end, interval: 'month'|'quarter'|'year' }`.
- `atlas.getProjections` — lee `zone_score_projections` para periodo futuro.
- `atlas.simulateConstruction` — ver BLOQUE 32.E; valida lote vacío, computa deltas, persiste scenario si `save=true`.
- `atlas.saveScenario` — persiste `atlas_scenarios` owner-scoped.
- `atlas.getScenario` — lee por id o share_slug si `is_public=true`.
- `atlas.requestExport` — crea job en queue, devuelve job_id; GET `atlas.getExport(job_id)` polling.
- `atlas.getLiveblocksToken` — ver BLOQUE 32.F; firma JWT con claims room permissions.

## Crons nuevos

- `atlas_projections_recompute` — mensual día 1 02:00 UTC. Recorre zone_scores históricas, refit modelo ARIMA/Prophet, escribe en `zone_score_projections` con nueva `model_version`. Alerta Slack si RMSE > threshold vs previous version.
- `osm_buildings_tiles_refresh` — trimestral. Re-descarga extracts geofabrik, re-tile, sube a S3 `atlas-4d-tiles`.

## Archivos feature-sliced impactados

```
features/atlas-4d/
├── components/
│   ├── interactive-scene.tsx         (r3f canvas + hotspots)
│   ├── temporal-slider.tsx
│   ├── layer-panel.tsx
│   ├── scenario-builder.tsx
│   └── export-dialog.tsx
├── hooks/
│   ├── use-temporal-snapshots.ts
│   ├── use-layer-state.ts
│   └── use-liveblocks-room.ts
├── lib/
│   ├── mapbox-style.ts
│   ├── projection-model.ts
│   └── raycast-view-obstruction.ts
├── routes/
│   └── atlas-router.ts               (tRPC)
├── schemas/
│   └── atlas.schema.ts               (Zod)
├── types/
│   └── atlas.types.ts
└── tests/
    ├── projection-model.test.ts
    ├── raycast.test.ts
    └── atlas-e2e.spec.ts             (Playwright)
```

## Features implementadas en esta fase (≈ 20)

1. **F-32-01** Mapbox Standard 3D + terrain config
2. **F-32-02** OSM Buildings tiles MVT hosted
3. **F-32-03** Layer buildings-3d-extruded con heights coherentes
4. **F-32-04** react-three-fiber integration sobre Mapbox
5. **F-32-05** r3f hotspots interactivos (click → drawer)
6. **F-32-06** r3f proyectos DMX modelos simplificados
7. **F-32-07** r3f isochrones accessibility
8. **F-32-08** Temporal slider scrubbable + Play animation
9. **F-32-09** Endpoint `atlas.getTemporalSnapshots`
10. **F-32-10** Tabla `zone_score_projections` + model ARIMA/Prophet
11. **F-32-11** Visual distinction proyecciones (pattern rayado + confidence)
12. **F-32-12** 7 data layers toggleables con opacity + focus mode
13. **F-32-13** URL state encoded para share links
14. **F-32-14** What-if simulator con 4 deltas (supply, transit, amenity, view)
15. **F-32-15** Tabla `atlas_scenarios` + save/share
16. **F-32-16** Multiplayer Liveblocks rooms
17. **F-32-17** Presence cursors + shared state + annotations
18. **F-32-18** AR companion app STUB + `/ar-app` waitlist
19. **F-32-19** Remotion export video MP4/GIF/WebM con watermark
20. **F-32-20** Pattern-referenced GC-10/GC-39/GC-87 integrations

## BLOQUE 32.X — DMX Flux Capacitor + Metaverso de Colonias

> **Contexto:** Extensiones H2/H3 del Digital Twin que convierten la capacidad 4D (3D + tiempo) en productos diferenciados categóricamente. Consumen seeds FASE 11 XL (Time Machine API SEED, Constellations SEED, Living Atlas SEED).
> **Dependencias:** FASE 11 XL (seeds implementados), FASE 32 BLOQUES A-H (Digital Twin 4D core).

### MÓDULO 32.X.1 — DMX Flux Capacitor (Time Machine + Predictive Twin + Historical Forensics)

**Pasos:**
- `[32.X.1.1]` "DMX Flux Capacitor" es la extensión del Digital Twin 4D con 3 capacidades integradas:
  - **Time Machine** (extiende Time Machine API SEED FASE 11.Q): navegación temporal fluida 2010→2030 con rendering histórico fotorrealista (street view imagery histórica + reconstrucciones 3D colonias).
  - **Predictive Twin**: proyecciones tridimensionales de cómo se verá una zona en 2030 si se aprueba proyecto X (nuevo metrobús, torre 40 pisos, parque, CETRAM) — usa motor GAN + rendering Mapbox + causal modeling.
  - **Historical Forensics**: análisis retrospectivo "¿qué pasó aquí?" de una colonia específica — timeline eventos clave con evidence (permisos SEDUVI, noticias, eventos sociales) overlaid sobre 3D.
- `[32.X.1.2]` UI unificado `/flux-capacitor/[slug]` con scrubber temporal + mode switch (Past/Present/Future) + split-screen compare.
- `[32.X.1.3]` Audience: devs para due diligence (forensics) + compradores curiosos (time machine) + fondos para scenario planning (predictive).
- `[32.X.1.4]` Monetización: incluido en tier Enterprise DMX Urban OS; standalone $999/mo para devs.

**Criterio de done del módulo:**
- [ ] 3 capacidades operativas en 2 colonias demo (Roma Norte + Polanco).

### MÓDULO 32.X.2 — Metaverso de Colonias (Living Atlas + Digital Twin = XF-11)

**Pasos:**
- `[32.X.2.1]` "XF-11 Metaverso de Colonias" es la fusión completa de Living Atlas SEED (FASE 11.R) + Digital Twin 4D (FASE 32) + Constellations SEED (FASE 11.N): experiencia inmersiva 3D navegable donde usuarios caminan virtualmente por colonias y ven:
  - Edificios 3D con overlays de IE scores flotando.
  - Constellations edges entre colonias similares como "líneas de universo" visualizables.
  - Eventos en tiempo real (nuevos listings, alpha alerts, comunidad activa).
  - Avatares de residentes verificados (DMX Habitat H2).
  - NPCs guía AI que responden preguntas.
- `[32.X.2.2]` Modos navegación: walk mode (first-person), drone mode (aerial), scale mode (zoom out hasta vista ciudad completa).
- `[32.X.2.3]` Multiplayer: hasta 20 usuarios simultáneos por colonia room (Liveblocks FASE 32.F).
- `[32.X.2.4]` Casos de uso: tours virtuales con asesores, reuniones de due diligence con fondos, marketing experiencias para compradores (visit without visit), eventos comunitarios H2.
- `[32.X.2.5]` H3 roadmap: integración Apple Vision Pro / Meta Quest para full VR/AR experience.

**Criterio de done del módulo:**
- [ ] XF-11 demo funcional en 1 colonia.
- [ ] Multiplayer 5+ users simultáneos.

## Próxima fase

[FASE 33 — Data Ecosystem](./FASE_33_DATA_ECOSYSTEM.md)

---
**Autor:** Claude Opus 4.7 (biblia v2 moonshot) | **Fecha:** 2026-04-18
