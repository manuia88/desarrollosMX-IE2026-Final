# 08 — Prototype JSX → Modules M01-M20 Mapping

> Mapping completo de los 17 componentes prototype JSX (`tmp/product_audit_input/DMX-prototype/src/`) contra los 20 módulos funcionales M01-M20 y sus acciones backend canon.
>
> Doc complementario de:
> - `07_FRONTEND_PROTOTYPE_CANONICAL.md` (spec frontend canon completo)
> - `06_AUDIT_ESTADO_REAL_M01_M20.md` (auditoría estado real implementación)
> - `01_DECISIONES_ARQUITECTONICAS/ADR-048_FRONTEND_PROTOTYPE_CANONICAL_REPLACEMENT.md` (formalización decisión)
>
> Generado en sub-bloque FASE 07.7.A.1 (2026-04-25).

---

# SECCIÓN 2 — Draft `08_PROTOTYPE_TO_MODULES_MAPPING.md`

## Tabla principal — 17 componentes prototype × módulos M01-M20

| # | Componente Prototype JSX | Tipo | Módulos M01-M20 que sirve | Acciones backend canon | Datos requeridos | Estado mapping |
|---|---|---|---|---|---|---|
| 1 | `App.jsx` | composition root | M19 (landing), portal shell global indirecto M01-M20 | Renderiza tree; no acción backend | — | direct M19 |
| 2 | `icons.jsx` | shared assets | TODOS M01-M20 (cross-cutting) | — (puro presentational) | — | direct (cross-cutting) |
| 3 | `primitives.jsx` | shared motion primitives | TODOS M01-M20 que necesiten BlurText/FadeUp/Stagger/AnimatedBar/CountUp | — | — | direct (cross-cutting) |
| 4 | `Navbar.jsx` | shell navigation | M19 (público), M01 (Asesor), M10 (Dev), M16 (Admin), M18 (Comprador) — patrón base global | Auth state (Iniciar sesión button) | session, user role | adapt-pattern (variantes per portal) |
| 5 | `Hero.jsx` | landing block | **M19** (Marketplace Público landing) | SSG/ISR landing render | content estático i18n + 5 score samples | direct M19 |
| 6 | `LiveTicker.jsx` | data ticker | **M19** (landing), **M17** (Market Observatory admin), **M19 /indices** | tRPC `getColoniasPriceTicker` | 12 colonias × {ppm2, delta} | direct M19/M17 |
| 7 | `SearchBar.jsx` | search form | **M19** (landing search), **M19 /explorar**, **M18** (Comprador dashboard search), **M03** (Contactos search), **M04** (Búsquedas pipeline filter) | tRPC `searchProperties`, `searchColonias` | tipo, precio, colonia/zona, scores | direct M19, adapt M18, adapt M03, adapt M04 |
| 8 | `ColoniasBento.jsx` (Vinyl Tiles) | colonia grid + scores | **M19** (landing), **M19 /indices**, **M17** (Observatory layer 5), **M18** (Comprador watchlist zones) | tRPC `getZoneScoresBento`, `getZoneTimeseries` | colonias[], scores LIV/MOV/SEC/ECO, trend 24m, facts dyn | direct M19/M17, adapt M18 |
| 9 | `ColoniaComparator.jsx` (Radar Battle) | comparator interactive | **M19** (landing), **M19 /indices**, **M18** (Comprador A08 Comparador up to 4), **M17** (Observatory zone diff) | tRPC `getZoneRadarSpec`, `compareZones` | 8 colonias × 6 axes (Movilidad, Seguridad, Comercio, Momentum, Educación, Riesgo) | direct M19, **adapt M18** (extender a 4 colonias / 15 dimensiones) |
| 10 | `PropertyListings.jsx` (PropertyCard) | marketplace grid | **M19** (landing properties featured), **M19 /explorar**, **M20** (Ficha proyecto personalizada — card individual), **M02** (Desarrollos asesor inventory), **M11** (Inventario dev), **M18** (Comprador watchlist + Discover Weekly) | tRPC `listProperties`, `getPropertyDetail` | properties[], photos[], scores LIV/MOV/SEC, asesor, plusvalia | direct M19/M20, adapt M02/M11/M18 |
| 11 | `IntelligenceEngine.jsx` | engine showcase | **M19** (landing), **M19 /metodologia** (transparency S&P style), **M16** admin overview | SSG metadata | 50+ data sources, 97 vars stat, score sample | direct M19 |
| 12 | `Stats.jsx` | hero stats grid | **M19** (landing), **M19 /metodologia**, **M16** admin home, **M17** observatory header | tRPC `getPlatformStats` (count vars, sources, colonias, time) | 4 KPIs CountUp | direct M19, adapt M16/M17 |
| 13 | `Testimonials.jsx` | social proof marquee | **M19** (landing), **M19 /asesores/[slug]** (microsite reviews) | tRPC `listTestimonials` (moderated) | testimonials[] {q, author, role} | direct M19 |
| 14 | `Faq.jsx` | accordion | **M19** (landing), **M19 /metodologia**, **M19 /precios** (futuro), portales onboarding | content estático i18n | 7 items q+a | direct M19 |
| 15 | `CtaFooter.jsx` | CTA + global footer | **M19** (landing), footer global cross-portal M01-M20 | newsletter signup form | — | direct M19 (CTA) + global (Footer) |
| 16 | `MapOverlay.jsx` | hero map preview | **M19** (landing hero overlay), inspiración para **M17 mini-map** | Demo data o tRPC `getZonePreview` | colonia + 6 scores + ping coords | direct M19 |
| 17 | `CustomCursor.jsx` | desktop fancy cursor | **NINGUNO** (skip — decisión §11/§17 canon) | — | — | skip-no-fit |

## Subsección — componentes prototype con mapping múltiple (cubren > 1 módulo)

Componentes high-impact: 1 por componente para múltiples módulos. Ranking por número de módulos servidos:

| Componente | # módulos | Módulos | Estrategia port |
|---|---|---|---|
| icons.jsx | 20 | TODOS M01-M20 | shared/ui/icons port único, named exports |
| primitives.jsx | 20 (potencial) | TODOS los que usen motion | shared/ui/motion port único |
| Navbar.jsx | 5 (M19 + 4 portales) | M19, M01, M10, M16, M18 | base layout component + per-portal overrides (links, brand, accent) |
| SearchBar.jsx | 5 | M19, M18, M03, M04 (+ /explorar) | shared/ui/search-bar configurable + per-context tabs/chips/onSubmit |
| PropertyListings.jsx | 6 | M19, M20, M02, M11, M18 (+ /explorar) | shared/ui/property-card unificado, cada módulo wrap con propio data fetch |
| ColoniasBento.jsx | 4 | M19, M17, M18 (+ /indices) | shared/ui/zone-bento configurable layers (LIV/MOV/SEC/ECO o subset per portal) |
| ColoniaComparator.jsx | 4 | M19, M17, M18 (A08) (+ /indices) | shared/ui/zone-comparator configurable axes (6 default, hasta 15 para A08) |
| LiveTicker.jsx | 3 | M19, M17 (+ /indices) | shared/ui/ticker configurable items + label |
| Stats.jsx | 4 | M19, M16, M17 (+ /metodologia) | shared/ui/stats-grid configurable items |
| IntelligenceEngine.jsx | 3 | M19, M16 (+ /metodologia) | shared/ui/intelligence-showcase reutilizable |

## Subsección — módulos M01-M20 SIN equivalente prototype (gaps frontend canon)

Módulos que NO tienen ningún componente prototype mapeado directamente — toda su UI requiere construir desde cero usando el design system canon (tokens + primitives + cards/buttons/forms patterns).

| Módulo | Razón gap | Componentes UI a construir (estimado) | Recomendación |
|---|---|---|---|
| M01 Dashboard Asesor | Portal interno con KPIs, pipeline, quick actions — prototype no cubre dashboards admin | Command center grid, KPI cards, calendar widget, quick activity feed | Build from scratch usando tokens canon + cards genéricos. Sidebar tint lavender (ADR-023 §2.8). |
| M02 Desarrollos Asesor | Inventario asesor — la card Property es similar pero para vista interna | List/grid Properties (reusar PropertyCard adapted), filters lateral, bulk actions | Reusar PropertyCard, agregar bulk-action bar |
| M03 Contactos | CRM asesor lite — leads, pipeline contacts | Contacts table, segments tags, contact card, communication timeline | Build from scratch + reusar SearchBar adapted |
| M04 Búsquedas (Pipeline Comprador) | Kanban pipeline matching builds | Kanban board, swimlanes, search-card, criteria editor | Build from scratch (Kanban no en prototype) |
| M05 Captaciones (Pipeline Vendedor) | Mirror M04 para vendedores | Kanban, listing capture wizard, owner profile | Build from scratch |
| M06 Tareas | Task manager (inbox + calendar + priorities) | Task list, calendar, kanban tasks, modal create/edit | Build from scratch |
| M07 Operaciones | Deal flow (offer → contract → escrow → close) | Deal pipeline, document upload, signatures, escrow status | Build from scratch (high spec / forms-heavy) |
| M08 Marketing Asesor | Templates campaign + WA mass send | Template gallery, campaign builder, audience segmentation | Build from scratch |
| M09 Estadísticas Asesor | Metrics dashboard | Charts (recharts), KPI cards, compare periods | Build from scratch + reusar Stats pattern |
| M10 Dashboard Desarrollador | Dashboard B2B dev | Project portfolio, financial KPIs, sales velocity | Build from scratch |
| M11 Inventario Dev | Listings management | Project list, unit grid, status badges | Reusar PropertyCard adapted |
| M12 Contabilidad Dev | Financial dashboard | P&L, cash flow charts, document gen | Build from scratch (heavy data) |
| M13 CRM Dev | CRM B2C completo | Lead funnel, conversation timeline, qualifications | Build from scratch |
| M14 Marketing Dev | Channel mgmt, ads | Campaign list, channel ROI, creative library | Build from scratch |
| M15 Analytics Dev IE 7 Tabs | IE consumer per dev | 7 tab dashboard, recharts heavy, IE overlays | Build from scratch (es el corazón B2B IE) |
| M16 Dashboard Admin 17 Pages | Admin global | 17 pages diversas — alguna reusará Stats/Ticker | Build from scratch + reusar Stats/Ticker |
| M17 Market Observatory | Mapbox 7 layers | Mapbox embed, layer toggle panel, filters, time slider | Build from scratch (Mapbox-heavy) — MapOverlay sirve como mini-map decorativo solamente |
| M18 Dashboard Comprador 10 Pages | Consumer | Reusar Bento, Comparator, PropertyCard (Discover Weekly), build A01/A02/A05/A07/A08/A10/A11 calculators from scratch | Mix reuse + build |
| M19 Marketplace Público | Landing 9 secciones | **TODOS los componentes prototype mapean directo aquí** | Direct port |
| M20 Ficha Proyecto | Project detail page | Reusar PropertyCard expanded + agregar gallery, schedule visit, score breakdown | Reusar PropertyCard + extensión |

## Subsección — componentes prototype SIN mapping a módulos (overhead visual potencial)

Componentes prototype que NO tienen módulo claro de uso o mapeo cuestionable:

| Componente | Análisis | Acción recomendada |
|---|---|---|
| `CustomCursor.jsx` | Desktop fancy cursor. Conflicto a11y, no mobile, mainline cleaner principle. | **SKIP — no portar** (decisión §11/§17 canon). |
| `MapOverlay.jsx` | Decorativo en hero M19. NO es M17 real (M17 es Mapbox real con 7 layers). Riesgo: gente confunde con feature funcional. | Portar SOLO como decoración hero M19. Documentar EXPLICITLY que es "preview / mock visual" en spec. NO confundir con M17. |
| `Stats.jsx` 4 hardcoded KPIs (97+, 50+, 18, 3.2s) | Marketing fluff visual. Datos reales pueden no coincidir mes a mes. | Portar SI los KPIs son auditables y documentados (i.e. stats reales actualizadas semanal vía cron). Else: marketing-only y degradar a "approx". |
| `Testimonials.jsx` 6 hardcoded | Marketing requiere testimonials reales y consent. Ningún backend prototype. | Portar UI; backend agregar `testimonials` table + moderation workflow + consent records (pendiente de fase real). |
| `IntelligenceEngine.jsx` panel score Del Valle Centro 87 hardcoded | Demo data; requiere data real cuando exista. | Portar con data real desde tRPC `getZonePreview('del-valle-centro')` cuando IE backend tenga seeded data. |
| `LiveTicker.jsx` 12 colonias hardcoded | Idem — requiere `price_timeseries` real. | Portar con tRPC real cuando data esté ingestada. |
| `RadarChart` 8 colonias / 6 axes hardcoded | Idem. | Portar con tRPC real desde `colonia_scores` table. |

Patrón común: TODA la data en el prototype es hardcoded. Ningún componente tiene mapping API real. La acción para cada uno es **portar UI + agregar tRPC fetch real**. El riesgo es shipping landing con data mock perpetua.

## Subsección — recomendaciones priorización port

Cruzando con `docs/08_PRODUCT_AUDIT/03_RICE_PRIORITIES.md` y `04_ROADMAP_INTEGRATION.md` (referenciados en prompt; no leídos exhaustivamente en este draft pero asumiendo el critical path apunta a M19 landing público como primer entregable shipped):

**Wave 1 — primera semana M3a/M3b (bloqueante de M19)**:
1. icons.jsx (2h) — required by todos.
2. primitives.jsx (4h) — required by Hero/Bento/Comparator/PropertyListings/IE/Stats/Testimonials/Faq/CtaFooter.
3. Tokens.css refresh (4h) — required by todos.
4. Navbar.jsx + Hero.jsx (14h) — first paint above-the-fold.
5. SearchBar.jsx (8h) — first conversion.

**Wave 2 — second week M3b**:
6. LiveTicker.jsx (2h) — quick win social proof.
7. ColoniasBento.jsx + VinylTile (12h) — first IE showcase.
8. PropertyListings.jsx + PropertyCard (10h) — first marketplace.
9. IntelligenceEngine.jsx (6h) — IE narrative.
10. MapOverlay.jsx (3h) — hero decoration polish.

**Wave 3 — final M19 landing**:
11. ColoniaComparator.jsx (12h) — interactive showcase.
12. Stats.jsx (3h).
13. Testimonials.jsx (3h).
14. Faq.jsx (4h).
15. CtaFooter.jsx (4h).
16. App.jsx composition (0.5h).

**Wave 4 — M18/M17/M02/etc reuse**:
- Adapt SearchBar para /explorar, M18, M03, M04.
- Adapt PropertyCard para M02, M11, M18, M20.
- Adapt ColoniasBento para M17 layer 5, M18 watchlist.
- Adapt ColoniaComparator para M18 A08 (extender a 4 colonias / 15 dimensiones).

Total wall-clock M3a + M3b para M19 landing: ~22h CC pace 4x ≈ **3 días CC** + waves 4 distribuidos en M02/M11/M18/M17 conforme cada módulo se construya.

---

# Fin Sección 2.
