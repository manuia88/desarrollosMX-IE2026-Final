# ADR-022 — Vibe Tags Hybrid (AI-generated + verifiable data backing)

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** Manu Acosta (founder)
**Referenced by:** [FASE 20 Portal Comprador](../02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md), [FASE 21 Portal Público](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md), [FASE 04 Design System (componente VibeTagChip)](../02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md)
**References:** [ADR-010 IE Pipeline Architecture](./ADR-010_IE_PIPELINE_ARCHITECTURE.md), [ADR-021 Progressive Preference Discovery](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md), [Competitive Intel Findperty](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md)
**Supersedes:** —

## 1. Context

El benchmark competitivo Findperty (ver [competitive_intel_findperty_20260419.md](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md)) implementa un sistema de **vibe_tags** cualitativos como mecanismo de discovery diferenciador (ej: *Pet Lover*, *Wow Factor*, *Ritual del Café*). El insight relevante es que el lenguaje lifestyle resuena más con compradores generacionales jóvenes (millennials/Gen Z) que el listado puro de specs técnicos (m², recámaras, niveles).

Sin embargo, el sistema Findperty tiene una debilidad arquitectónica: los tags son **self-reported** por el publicador (owner / asesor), sin backing data verificable. Esto genera fricción de trust: cualquier listing puede declararse "Pet Friendly" sin validar que efectivamente exista un parque cercano, una veterinaria a 500m, o políticas pet-friendly explícitas en el reglamento del condominio.

DMX tiene una capability única que ningún competidor MX/LATAM tiene cableada hoy: dispone de un stack de datos verificables ya documentado en [ADR-010 IE Pipeline](./ADR-010_IE_PIPELINE_ARCHITECTURE.md) y [FASE 07 Ingesta](../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md):

- **DENUE SCIAN** (categorización exhaustiva de comercios y servicios por geocódigo).
- **Mapbox isochrones** (caminabilidad real, no Euclidean distance).
- **WalkScore propio DMX** (cálculo nativo con metodología auditada — no dependencia de API externa).
- **FGJ Open Data** (criminalidad CDMX por colonia + tendencia YoY).
- **GTFS transit** (estaciones metro/metrobús/RTP/cablebús con coordenadas oficiales).
- **SIGED** (catálogo escuelas SEP con nivel y modalidad).
- **DGIS** (catálogo unidades médicas Salud Federal + Estatales).
- **Catastro municipal + AirROI snapshots** (plusvalía y yields STR temporales).

Combinar la **comunicación lifestyle** (Findperty-style) con el **backing cuantitativo verificable** (DMX-only) es un diferenciador competitivo defendible y alimenta downstream el match score 6D del Portal Comprador (ver [ADR-021 Progressive Preference Discovery](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md) Capa 3 `inferred_preferences`).

## 2. Decision

**DMX implementa un sistema de `vibe_tags` híbrido** — AI-generated desde property/zone data + verificación contra los datasets DMX, con confidence level explícito y editabilidad auditada por owner/asesor.

Decisiones concretas:

1. **Generación AI + verificación cuantitativa**: cada vibe_tag se genera automáticamente desde property data y/o zone data y se valida contra una `validation_rule` ejecutable contra los datasets DMX (DENUE, isochrones, WalkScore, FGJ, GTFS, SIGED, DGIS, catastro, AirROI). Sin verificación, el tag NO se publica.
2. **Confidence level explícito**: cada instancia de tag declara `confidence: 'high' | 'medium' | 'low' | 'insufficient'`. Tags `insufficient` no se renderizan al usuario final pero quedan en BD para diagnóstico de cobertura. Threshold por tag se define en `vibe_tags_catalog.confidence_threshold`.
3. **Editabilidad con audit trail**: owner/asesor puede editar (suprimir o anotar) tags vía UI. Cada edición requiere `edited_by` (auth user_id), `edited_reason` (texto libre min 10 chars) y queda en audit log inmutable (cumpliendo [ADR-018 R7](./ADR-018_E2E_CONNECTEDNESS.md)). Ediciones son revertibles desde Portal Admin.
4. **Validation rule por tag**: cada entrada del catálogo tiene una `validation_rule jsonb` ejecutable por el `validation engine` (`shared/lib/vibe-tags/validators/<code>.ts`). El validator es función pura `(propertyOrZone, datasetSnapshots) => {value, confidence, sources[]}`.
5. **Frontend chip estándar**: VibeTagChip muestra `[ícono] [label localizado] [valor cuantitativo si aplica] [confidence badge]`. Ej: `[🚶] Walkable 87/100 [✓ high]`, `[🐾] Pet-friendly · 12 parques <500m [✓ high]`. Confidence `medium` muestra badge ámbar; `low` muestra badge tenue + tooltip explicativo.
6. **Vocabulario versionado**: tabla `vibe_tags_catalog` versionada (cada cambio en `validation_rule` o `label` incrementa `version`). Esto evita "tag explosion" libre y permite recompute consistente cuando una rule cambia.
7. **Granularidad doble property + zone**: tags aplicables tanto a `properties` (especificidad) como a `zones` (agregado para SEO + filtros zonales). El validator declara qué granularidad soporta. Algunos tags solo tienen sentido a nivel zona (`zona_emergente`, `gentrification_active`), otros solo a nivel property (`refurb_opportunity`, `sun_orientation_optimal`), la mayoría aplica a ambos.
8. **Pipeline de recompute**: cron `vibe_tags_recompute` (planificado en [FASE 12](../02_PLAN_MAESTRO/FASE_12_IE_PIPELINE_PRODUCCION.md) o [FASE 22](../02_PLAN_MAESTRO/FASE_22_AGENTIC_LAYER.md) según se priorice) recalcula tags daily, y on-demand cuando un dataset upstream cambia (trigger por `data_source` watermark).
9. **Reuso cross-portales**: el catálogo + chip + filter son reutilizables por Portal Comprador (filtros + cards), Portal Público (SEO `/zonas/[slug]` indexa "Walkable Polanco"), Portal Asesor (insights operativos) y Portal Dev (pricing power signals).

## 3. Consequences

### Positivas

- **Trust del comprador**: cada tag es verificable contra un dataset citable — al pasar mouse sobre un chip, el tooltip muestra `data_source` + `computed_at`, eliminando la fricción "¿es real?" que arrastra Findperty self-reported.
- **Diferenciador competitivo defendible**: vs Findperty (cualitativo subjetivo) y vs Inmuebles24/Vivanuncios/Lamudi/Casas y Terrenos (sin lenguaje lifestyle del todo, solo specs). DMX es el único que junta ambas cosas.
- **Re-uso del stack IE existente**: cero pipelines nuevos — los validators consumen lo que [FASE 07 Ingesta](../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md) ya recolecta y lo que [FASE 08-12](../02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md) ya scorea (WalkScore, transit, parks, schools, etc.).
- **Alimentación al match score 6D**: tags inferidos vía interacción usuario ([ADR-021 PPD Capa 3](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md)) se mapean directamente a este vocabulario. Si el usuario filtra repetidamente por `foodie_zone` y `transit_excellent`, el match score eleva propiedades con esos tags incluso sin form explícito.
- **SEO**: páginas `/zonas/[slug]` indexan combinaciones `Walkable Polanco`, `Foodie Roma Norte`, `Familiar Lomas Verdes` — long-tail orgánico que portales generalistas no pueden cubrir.
- **Calidad sobre cantidad**: vocabulario versionado con 50-60 tags curados evita la "tag explosion" libre (zillow tiene >2000 tags self-reported con duplicación semántica masiva — anti-patrón).
- **Producto B2B latente**: el catálogo de vibe_tags por zona es empaquetable como segmento de "Lifestyle Reports" para alcaldías y desarrolladores (consistente con la estrategia [ADR-019](./ADR-019_STR_MODULE_COMPLETE.md) de productos B2B verticales).

### Negativas / tradeoffs

- **Curaduría humana inicial**: los 50-60 tags + sus validation rules requieren diseño + tests por tag. Estimación: 2-3 días de un ingeniero senior para vocabulario inicial v1, más 0.5-1 día por tag adicional posterior. Mitigación: priorizar los 20 tags con mayor cobertura DENUE/isochrones primero, los 30-40 restantes pueden iterarse semanalmente.
- **Validation engine es código + tests**: cada validator es módulo TS con su test unitario obligatorio (tests de fixture con propiedades reales en Polanco/Condesa/Roma + zonas data-pobres). Costo recurrente de mantenimiento ~5% del backlog IE.
- **Confidence `insufficient` en zonas pioneras**: ciudades fuera de CDMX (especialmente municipios <50K hab) tienen cobertura DENUE/transit/FGJ pobre. Algunos tags se renderizarán solo en mercados maduros. Mitigación: el chip simplemente no se muestra (no hay "tag broken"), y el catálogo de cobertura se publica en Portal Admin para guiar prioridad de ingesta.
- **Riesgo de manipulación por editores**: owner/asesor con motivación comercial puede falsificar (suprimir tags negativos, p.ej. `low_robbery=false`). Mitigación: (a) audit trail obligatorio + flag review en queue moderación, (b) tags negativos críticos (criminalidad, riesgos ambientales) marcados `non_editable: true` en catálogo, (c) revisión periódica de edits por sub-agente moderación ([FASE 22](../02_PLAN_MAESTRO/FASE_22_AGENTIC_LAYER.md)).
- **Recompute cuando una rule cambia**: bumping `validation_rule.version` requiere recompute batch sobre todo el inventory. Para >100K properties + zones, esto es ~1-2 horas en Vercel Functions con concurrency razonable. Mitigación: cron nocturno + dry-run flag para preview de impacto antes de commit.
- **i18n del label**: cada tag tiene `label jsonb` con 5 idiomas (es-MX, es-CO, es-AR, pt-BR, en-US) — overhead de traducción cada vez que se agrega un tag al catálogo. Aceptable porque CLAUDE.md regla 8 ya lo exige globalmente.

### Neutrales

- **Schema BD**: nueva tabla `vibe_tags_catalog` (vocabulario) + columna `vibe_tags jsonb[]` agregada a `properties` y `zones` (registrar en [03.1 Catálogo BD](../03_CATALOGOS/03.1_CATALOGO_BD.md)). Migration aditiva, sin breakage.
- **Reusable cross-portales**: el chip + filter + catálogo son shared (`shared/ui/vibe-tag-chip.tsx`, `shared/lib/vibe-tags/`), accesibles desde Portal Comprador, Portal Público, Portal Asesor, Portal Dev.
- **Compatible con [ADR-021 PPD](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md)**: el vocabulario de tags es exactamente el espacio donde `inferred_preferences` (Capa 3) opera. Sin ADR-022 el sistema PPD tendría que inventar su propio espacio de features — con ADR-022 ambos comparten.

## 4. Alternativas consideradas

### Alt 1 — Tags self-reported puros (clon Findperty)

**Rechazada.** Pierde el diferenciador trust + verificable. Convierte a DMX en un competitor más, no en categoría aparte. Además expone a riesgo legal si un tag falso (`low_robbery` en zona alta criminalidad real) genera daño al comprador (LFPDPPP / responsabilidad civil).

### Alt 2 — Solo data backing sin lenguaje lifestyle

**Rechazada.** Mantiene el status quo "stack de specs técnicos" que ya tienen Inmuebles24/Vivanuncios/Lamudi. No aprovecha el insight Findperty de que el lenguaje lifestyle baja la fricción de discovery para Gen Z/millennials. El backing solo, sin chip cualitativo, queda como detail técnico que el comprador no puede parsear rápido.

### Alt 3 — LLM puro generando tags free-form sin catálogo

**Rechazada.** Sin vocabulario versionado se cae en tag explosion (Zillow anti-pattern) — un LLM puede generar `walkable`, `caminable`, `pedestrian-friendly`, `foot-friendly` para la misma propiedad en distintos runs. Imposible filtrar, agregar o usar como features para match score. Catálogo cerrado es prerequisito de utility downstream.

### Alt 4 — Tags solo a nivel zona (sin granularidad property)

**Rechazada.** Pierde tags específicos de la propiedad (`refurb_opportunity`, `sun_orientation_optimal`, `wow_factor`) que solo tienen sentido al nivel listing. La granularidad doble es necesaria.

### Alt 5 — Diferir vibe_tags a H2 / post-launch

**Rechazada.** El diferenciador competitivo es justamente al launch. Findperty está activo hoy en CDMX y captando mindshare en el segmento target (compradores 28-42 años en colonias premium). Perder la ventana H1 transfiere la categoría al competitor.

## 5. Vocabulario inicial (50-60 tags en 8 categorías)

> Nota: snake_case ES. La columna `data_source` indica el dataset DMX que alimenta el validator. Granularidad: `P` = property, `Z` = zone, `PZ` = ambos.

### 5.1 Lifestyle (10)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `walkable` | PZ | WalkScore propio | umbral high ≥80, medium 60-79 |
| `pet_friendly` | PZ | DENUE SCIAN parques + veterinarias + isochrone 8 min | high ≥3 parques + ≥2 vets <500m |
| `family_friendly` | PZ | SIGED escuelas + DENUE pediatría + parques | mix balanceado escuelas/parques <1km |
| `nightlife_zone` | Z | DENUE SCIAN bares/antros 7224*/7225* | density por km² |
| `foodie_zone` | PZ | DENUE SCIAN 7225* (restaurantes) | high ≥30 restaurantes <500m |
| `fitness_zone` | PZ | DENUE SCIAN gyms + parques + ciclovías | mix |
| `outdoor_lover` | PZ | parques + áreas verdes + ciclovías Mapbox | superficie verde >X% |
| `art_culture` | Z | DENUE SCIAN museos/galerías + Cultura SEP | density |
| `quiet_residential` | PZ | DENUE SCIAN comercio bajo + transit moderado | inverso de density comercial |
| `bohemian` | Z | DENUE galerías + cafés indie + bookstores | combinación |

### 5.2 Inversión (8)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `alta_plusvalia` | PZ | catastro snapshots + AirROI ADR delta | YoY ≥15% high |
| `alto_yield_str` | PZ | AirROI ADR + occupancy | yield bruto STR estimado |
| `alto_yield_ltr` | PZ | rentas LTR observadas + precio venta | yield bruto LTR |
| `zona_emergente` | Z | catastro delta + nuevos desarrollos detectados | combinación tendencia |
| `gentrification_active` | Z | DENUE delta cafés/galerías + catastro delta | señal compuesta |
| `stable_value` | PZ | catastro varianza baja en 3 años | volatilidad baja |
| `refurb_opportunity` | P | edad construcción + scoring foto-CV (FASE 11) | property-only |
| `pre_construccion_premium` | P | flag listing pre-venta + reputación developer | property-only |

### 5.3 Ambiental (6)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `green_zone` | PZ | superficie verde Mapbox + DENUE parques | %verde ≥X% |
| `low_pollution` | Z | SIMAT calidad aire CDMX | promedio ICA bajo |
| `sun_orientation_optimal` | P | orientación + altura building | property-only |
| `low_flood_risk` | PZ | atlas riesgo inundación CENAPRED | bucket bajo |
| `low_seismic_risk` | PZ | zonificación sísmica CENAPRED + tipo suelo | bucket bajo |
| `water_secure` | Z | tandeo agua histórico SACMEX/CONAGUA | sin tandeo |

### 5.4 Social (5)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `alta_densidad` | Z | INEGI densidad poblacional | quintil top |
| `comunidad_consolidada` | Z | INEGI antigüedad promedio residencia | residentes ≥10 años |
| `mix_socioeconomico` | Z | INEGI AGEB diversidad ingresos | varianza alta |
| `jovenes_dominan` | Z | INEGI pirámide edad | mediana <35 |
| `familias_jovenes` | Z | INEGI hogares con menores | proporción alta |

### 5.5 Conectividad (6)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `transit_excellent` | PZ | GTFS estaciones + isochrone walk 8 min | high ≥3 estaciones <500m |
| `fibra_disponible` | PZ | IFT cobertura fibra confirmada | flag binario |
| `coworking_nearby` | PZ | DENUE SCIAN coworkings + isochrone | ≥1 coworking <800m |
| `aeropuerto_proximo` | Z | distancia aeropuertos comerciales | <30 min en auto |
| `multiple_metro_lines` | Z | GTFS líneas distintas <800m | ≥2 líneas |
| `bike_friendly` | PZ | ciclovías Mapbox + Ecobici/MiBici | density |

### 5.6 Seguridad (5)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `baja_criminalidad` | Z | FGJ Open Data delitos por colonia | quintil bajo |
| `mejora_continua_seguridad` | Z | FGJ delta YoY | tendencia descendente ≥2 años |
| `vigilancia_24_7` | P | flag amenidad property | property-only, non_editable cuando se cita reglamento |
| `gated_community` | P | flag tipología property | property-only |
| `low_robbery` | Z | FGJ subcat robos | non_editable |

### 5.7 Amenidades cercanas (8)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `parques_cerca` | PZ | DENUE + isochrone 8 min | ≥2 parques |
| `escuelas_top_cerca` | PZ | SIGED + ranking calidad | ≥2 escuelas top quintil <1km |
| `hospitales_cerca` | PZ | DGIS + isochrone 12 min auto | ≥1 hospital nivel ≥II |
| `supermercados_cerca` | PZ | DENUE SCIAN 462* | ≥1 super <800m |
| `gym_cerca` | PZ | DENUE SCIAN gym | ≥1 <800m |
| `restaurantes_cerca` | PZ | DENUE SCIAN 7225* | ≥10 <500m |
| `cines_cerca` | PZ | DENUE cines | ≥1 <2km |
| `museos_cerca` | PZ | DENUE museos | ≥1 <2km |

### 5.8 Demografía (4)

| code | granularidad | data_source | nota validator |
|---|---|---|---|
| `zona_familiar` | Z | INEGI hogares con menores + escuelas + parques | composite |
| `zona_solteros` | Z | INEGI hogares unipersonales | proporción alta |
| `zona_retirees` | Z | INEGI mediana edad alta + servicios médicos | composite |
| `zona_executives` | Z | INEGI ingreso top + DENUE oficinas/coworkings | composite |

**Tags compuestos derivados (consumen otros tags como input):**

- `nomad_friendly` (Z): requiere `fibra_disponible` + `foodie_zone` + `coworking_nearby` + `transit_excellent` simultáneamente con confidence ≥medium.

**Total v1: 56 tags** (10+8+6+5+6+5+8+4 + 1 compuesto +3 placeholders para iteración semanal).

## 6. Implementation notes

- **Schema BD** (registrar en [03.1 Catálogo BD](../03_CATALOGOS/03.1_CATALOGO_BD.md)):

  Tabla `vibe_tags_catalog`:
  - `id uuid pk`
  - `code text unique not null` (snake_case del vocabulario)
  - `label jsonb not null` (5 idiomas: `{es-MX, es-CO, es-AR, pt-BR, en-US}`)
  - `category text not null` (lifestyle | inversion | ambiental | social | conectividad | seguridad | amenidades | demografia)
  - `validation_rule jsonb not null` (DSL declarativo + ref al validator file)
  - `data_source text not null` (alias de la fuente principal)
  - `confidence_threshold jsonb not null` (umbrales high/medium/low)
  - `granularity text not null` ('property' | 'zone' | 'both')
  - `non_editable boolean default false` (tags críticos de seguridad/ambiental)
  - `version int not null default 1`
  - `created_at timestamptz`, `updated_at timestamptz`
  - RLS: lectura pública (catálogo no es PII), escritura `service_role` only.

  Columnas nuevas en `properties` y `zones`:
  - `vibe_tags jsonb[] not null default '{}'` — array de instancias `{code, value?, confidence, data_source, computed_at, edited_by?, edited_reason?, validator_version}`.

- **Cada vibe_tag instance** (shape):
  ```
  {
    code: 'walkable',
    value: 87,
    confidence: 'high',
    data_source: 'walkscore_dmx',
    computed_at: '2026-04-19T...',
    edited_by: null,
    edited_reason: null,
    validator_version: 1
  }
  ```

- **Validation engine**: módulos en `shared/lib/vibe-tags/validators/<code>.ts` con interface `(target, snapshots) => {value, confidence, sources[]}`. Tests obligatorios con fixtures (`shared/lib/vibe-tags/validators/__fixtures__/`).
- **Catálogo seeded**: migration `supabase/migrations/<timestamp>_vibe_tags_catalog.sql` insert los 56 tags v1. Cambios posteriores en `validation_rule` requieren bump `version` + re-run del cron.
- **Cron `vibe_tags_recompute`**: planificado en [FASE 12 IE Pipeline Producción](../02_PLAN_MAESTRO/FASE_12_IE_PIPELINE_PRODUCCION.md) (si capacity) o [FASE 22 Agentic Layer](../02_PLAN_MAESTRO/FASE_22_AGENTIC_LAYER.md) (fallback). Frequency daily nocturno + on-demand vía orchestrator cuando watermark de `data_source` cambia.
- **Audit log**: cada edit humano se registra en `vibe_tags_edit_log` con `(property_or_zone_id, code, old_value, new_value, edited_by, edited_reason, edited_at)` — inmutable (RLS append-only), revertible desde Portal Admin (escribe nuevo registro de revert, no UPDATE destructivo).
- **UI**:
  - `VibeTagChip` (FASE 04 módulo 4.P del Design System): chip con icono + label localizado + valor + confidence badge. Variants `compact` (cards) / `expanded` (detalle property).
  - `VibeTagFilter` (FASE 21 ruta `/explorar`): filtro multi-select con operadores AND / OR / NOT, agrupado por categoría.
- **Integración con [ADR-021 PPD](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md)**: el vocabulario de tags es el espacio canónico donde `inferred_preferences` (Capa 3) opera. Cuando el usuario interactúa con properties que comparten tag `foodie_zone`, el sistema PPD infiere preferencia y la persiste en el perfil.
- **Timeline integración con [FASE 08 IE Scores N0](../02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md)**: revisar primer compute de vibe_tags cuando los scores N0 estén calibrados (mes 3-4 H1) para evitar tags con `confidence: insufficient` masivos al launch.
- **Localización**: labels en `messages/<locale>.json` cuando aplique para textos auxiliares (tooltip "data_source: SIGED · computed 2026-04-19"), pero el `label` por tag vive en `vibe_tags_catalog.label jsonb` para evitar fan-out de mantenimiento.

## References

- [ADR-010 — IE Pipeline Architecture](./ADR-010_IE_PIPELINE_ARCHITECTURE.md) §D2 (ingestores datasets que alimentan validators).
- [ADR-021 — Progressive Preference Discovery](./ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md) (uso del vocabulario en `inferred_preferences` Capa 3).
- [Competitive Intel Findperty 2026-04-19](../06_REFERENCIAS_LEGADO/competitive_intel_findperty_20260419.md) (origen del insight + análisis de la debilidad self-reported).
- [FASE 04 Design System](../02_PLAN_MAESTRO/FASE_04_DESIGN_SYSTEM.md) módulo 4.P (componente VibeTagChip).
- [FASE 20 Portal Comprador](../02_PLAN_MAESTRO/FASE_20_PORTAL_COMPRADOR.md) (consumidor primario en cards + filtros + match score).
- [FASE 21 Portal Público](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md) (SEO `/zonas/[slug]` + filtro `/explorar`).
- [03.1 Catálogo BD](../03_CATALOGOS/03.1_CATALOGO_BD.md) (registro de tabla + columnas).

---

**Autor:** Claude Opus 4.7 (biblia v2.1 — vibe_tags híbrido) | **Fecha:** 2026-04-19
