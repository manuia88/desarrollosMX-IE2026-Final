# FASE 15 — Portal Desarrollador (M10 Dashboard + M11 Inventario + M12 Contabilidad pin + M13 CRM Dev + M14 Marketing Dev + M15 Analytics IE + UPG 7.10)

> **Duración estimada:** 7 sesiones Claude Code (~28 horas con agentes paralelos)
> **Dependencias:** FASE 02 (Auth + role='desarrollador' + resolve_features), FASE 04 (Design System + Card3D + Charts primitives), FASE 05 (i18n + multi-currency), FASE 07 (ingesta), FASE 08-12 (IE completo — B01 Demand Heatmap, B03 Pricing Autopilot, B04 PMF, B05 Market Cycle, B07 Competitive Intel, B08 Absorption Forecast, B09 Cash Flow, B12 Cost Tracker, B15 Launch Timing, H05 Trust Score), FASE 13-14 (Portal Asesor — muchos componentes reutilizables: Card3D, ScoreBadge, AnimNum, KPIRow).
> **Bloqueantes externos:**
> - Supabase Realtime habilitado en proyecto (FASE 01) para `useRealtimeUnits`.
> - Feature registry tabla poblada con keys `dev.*` (FASE 02 — ver Catálogo 03.10).
> - Mapbox token disponible (FASE 07) para Demand Heatmap en Tab 1 Analytics IE.
> - Recharts instalado (FASE 04).
> - Plans table poblada con Free/Starter/Pro/Enterprise dev (FASE 02 seed).
> - Storage bucket `project-photos` + `project-documents` creados (FASE 06).
> **Resultado esperado:** Portal Desarrollador `(developer)` group con 6 rutas principales (`/dashboard`, `/inventario`, `/crm`, `/marketing`, `/analytics`, `/contabilidad` pin stub). Trust Score H05 visible en Dashboard. Inventario unit grid con historial + realtime. CRM Dev pipeline propio (leads de interesados — distinto al CRM Asesor). Marketing Dev (landings + QR + kit ventas IE). Analytics IE con 7 tabs completos (Demanda, Pricing, Absorción, Competencia, PMF, Costos, Predicciones). UPG 7.10 (9 herramientas Developer Intelligence con datos reales). Pin stub Contabilidad (Fase 16 implementa full). Feature gating via `resolve_features` en cada card. Tag `fase-15-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El portal desarrollador es donde los desarrolladores inmobiliarios gestionan su inventario, ven el pulse de mercado que afecta sus proyectos, y toman decisiones de pricing/absorción asistidas por el IE DMX. Es una **superficie B2B monetizable** (§21 contexto — Starter $999/mes, Pro $2,999, Enterprise custom) cuya diferenciación vs competidores (DD360, Monopolio, Pulppo-enterprise) es la **intelligence IE inline en cada card**: un dev no sólo ve "vendí 3 unidades este mes" sino "tu absorción 2.1x supera al benchmark 1.4x de Del Valle, y tu pricing Aparatado 3B está 4% sobre competencia — riesgo 17% en 45d".

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-81 | Site Selection AI | Query en lenguaje natural "dónde comprar terreno" → AI escanea IE + demographics + competencia | Módulo 15.A.4 (nuevo) |
| GC-82 | Feasibility auto | Pegar link Catastro → cálculo automático cash flow + IRR + PMF preliminar | Módulo 15.F.3 amplía (ya existe UPG 85 — ahora con auto-fill por link) |
| GC-87 | Dynamic pricing daily | Cron recalcula pricing óptimo por unidad basado en demanda / competencia / absorción | Módulo 15.E.8 (nuevo) |
| GC-88 | Competitor radar | Monitoreo automático de desarrollos competidores en zona (alertas launch, cambios precio, inventario) | Módulo 15.E.9 (nuevo) |

Crítico:
- 7 tabs Analytics IE son **el producto más caro** del plan Pro — calidad de data visualization pedagógica (no números crudos).
- `resolve_features()` debe gatear TODAS las features dev — sin excepciones. Un Free no ve Pricing Autopilot, Absorption Forecast ni Predicciones.
- Multi-country: el dev puede ser MX, CO, AR, BR, CL. Currency + locale + fuentes de macro cambian por país (consumo de `supported_cities` en FASE 05).
- Este portal alimenta al marketplace público (FASE 21): si el dev sube bien su inventario + fotos + quality score ≥80%, su proyecto aparece destacado.

## Bloques

### BLOQUE 15.A — Layout desarrollador + Trust Score + Dashboard M10

#### MÓDULO 15.A.1 — Layout `(developer)` group

**Pasos:**
- `[15.A.1.1]` Crear ruta `app/(developer)/layout.tsx` con guard middleware (role='desarrollador' OR 'superadmin'), redirect a `/login?next=/developer/dashboard` si no autenticado.
- `[15.A.1.2]` Sidebar dev con 6 items: Dashboard (icon `LayoutDashboard`), Inventario (`Building2`), CRM (`Users`), Marketing (`Megaphone`), Analytics IE (`TrendingUp`), Contabilidad (`Receipt` — con badge "Pin" si Fase 16 no activa).
- `[15.A.1.3]` Header global con project-switcher (si el dev tiene múltiples proyectos según plan: Free 1, Starter 5, Pro ∞): `<ProjectSwitcher>` consulta `trpc.developer.listMyProjects` y setea `currentProjectId` en Zustand `useDeveloperStore`.
- `[15.A.1.4]` Breadcrumbs reutilizar `shared/ui/layout/Breadcrumbs.tsx`. Tint per-página (bgSlate para Inventario, bgLavender Dashboard, bgPeach Marketing).
- `[15.A.1.5]` AICopilot sidebar persistente (FASE 03) con contexto `currentProjectId`: preguntas sugeridas "¿Cómo está mi absorción este mes?", "¿Cuál es mi PMF score?".

**Criterio de done del módulo:**
- [ ] Login como role='desarrollador' redirige a `/developer/dashboard`.
- [ ] Project-switcher funciona: cambio de proyecto refresca Dashboard.
- [ ] Free dev con 1 proyecto no ve switcher (solo label).

#### MÓDULO 15.A.2 — M10 Dashboard Dev principal

**Pasos:**
- `[15.A.2.1]` `app/(developer)/dashboard/page.tsx`. Layout grid 3 columnas responsive:
  - **Columna 1 (wide):** Hero con Trust Score H05 grande (número + badge verde/ámbar/rojo + delta vs último mes) + 3 KPIs mini (absorción 30d, units en stock, promedio día en mercado).
  - **Columna 2:** "Qué pasó esta semana" carrusel 5 cards IE-driven ("Tu proyecto subió a percentil 82 en Del Valle", "B15 Launch Timing dice: espera 3 semanas para tu Torre B").
  - **Columna 3:** Notificaciones recientes (score_subscriptions + webhooks + leads) + "Próximas acciones" (tareas operativas).
- `[15.A.2.2]` Componente `<TrustScoreHero>` consume `trpc.scores.getTrustScore({ developerId })` (FASE 08). Badge:
  - Verde 80-100: "Confianza alta" + subtitle "Dev ranking top 15% MX".
  - Ámbar 60-79: "Confianza media" + actions sugeridas.
  - Rojo <60: "Alerta" + CTA "Ver plan de mejora IE".
- `[15.A.2.3]` Widget Perfil dev: foto + razón social + RFC (censurado 4 últimos) + país + ciudad + certificaciones + N° de proyectos activos. Edit inline con `trpc.developer.updateProfile`.
- `[15.A.2.4]` KPIs propios últimos 30d: revenue cerrado, pipeline en operaciones, lead-to-visit rate, visit-to-close rate. Usa `trpc.developer.getMyKPIs({ rangeDays })`.
- `[15.A.2.5]` Welcome banner condicional para onboarding: si `profiles.onboarding_completed=false` → mostrar checklist 5 pasos (1. Sube tu primer proyecto, 2. Sube fotos, 3. Sube docs para validación, 4. Configura canal distribución, 5. Conecta contador Fase 16).
- `[15.A.2.6]` Card "Market Pulse IE" con D01 Market Pulse AI-generated narrative (fase 12) — "El mercado Condesa subió 6% en Momentum esta semana, impulsado por XX".

**Criterio de done del módulo:**
- [ ] Dashboard carga en <2s (SSR + streaming).
- [ ] Trust Score refleja valor real desde `project_scores` (H05).
- [ ] Delta mes anterior calculado correctamente.

#### MÓDULO 15.A.3 — Feature gating via `resolve_features`

**Pasos:**
- `[15.A.3.1]` Hook `useDeveloperFeatures()` en `features/developer/hooks/use-developer-features.ts` que consume `trpc.auth.getMyFeatures` (wraps función SQL `resolve_features(auth.uid())`).
- `[15.A.3.2]` Retorna flags: `dev.projects_max`, `dev.ai_extractions_month`, `dev.drive_monitors_max`, `dev.storage_gb`, `dev.pricing_autopilot`, `dev.absorption_forecast`, `dev.competitive_intel`, `dev.predictions_tab`, `dev.api_access`.
- `[15.A.3.3]` Componente `<FeatureGate feature="dev.pricing_autopilot" fallback={<UpgradePrompt plan="pro" />}>...</FeatureGate>` que envuelve cards/tabs.
- `[15.A.3.4]` `<UpgradePrompt>` muestra plan target + CTA "Upgrade a Pro" → Stripe Checkout (implementado Fase 23, acá stub con alert).
- `[15.A.3.5]` Auditoría manual: listar en este archivo qué tabs/cards requieren qué plan:
  - **Free:** Dashboard (sin Market Pulse), Inventario (1 proyecto), CRM (10 leads/mes), Analytics Tab Demanda (solo).
  - **Starter:** Agrega Pricing tab, Competencia tab, Marketing auto-gen (50/mes).
  - **Pro:** Todos los 7 tabs, UPG 7.10 completo, Predicciones.
  - **Enterprise:** +API access (Fase 23).

**Criterio de done del módulo:**
- [ ] Login como Free dev no ve Tab Pricing (UpgradePrompt).
- [ ] Upgrade simulado a Pro desbloquea tabs.
- [ ] `resolve_features()` tarda <50ms.

#### MÓDULO 15.A.4 — Site Selection AI (GC-81)

**Pasos:**
- `[15.A.4.1]` Ruta `/developer/site-selection` con input natural language: "Quiero terreno para 60 unidades residencial medio en CDMX norte, budget $60M MXN, target absorción 2/mes".
- `[15.A.4.2]` Server procedure `developer.siteSelectionAI({ query })` Claude Sonnet function-calling con tools: `getZoneScores`, `getLandListings`, `getDemographics`, `getCompetition`, `getAbsorptionBenchmark`.
- `[15.A.4.3]` Output estructurado: top 5 zonas ranked + rationale + map con pins + terrenos disponibles matching + score fit 0-100.
- `[15.A.4.4]` Export PDF con análisis completo + comparables + caveats.
- `[15.A.4.5]` Feature gated Pro+ (cost tracked ~$0.50 USD per query).

**Criterio de done del módulo:**
- [ ] Query test produce top 5 con rationale <30s.
- [ ] Map renderiza pins con scores.

### BLOQUE 15.B — M11 Inventario Dev

#### MÓDULO 15.B.1 — Vista principal inventario

**Pasos:**
- `[15.B.1.1]` `app/(developer)/inventario/page.tsx`. Filtros superior: proyecto (si >1), prototipo, status (disponible/apartada/vendida/bloqueada), rango precio, superficie m2.
- `[15.B.1.2]` Vista Grid default: tarjetas de unidad con foto principal, precio, m2, status color-coded, badge días en mercado. Toggle a Vista Tabla (columnas: unit_name, prototipo, precio, m2, piso, orientación, status, días_mercado).
- `[15.B.1.3]` Vista Timeline (vista 3): gantt histórico de cambios de status por unidad (agrega `unit_change_log`).
- `[15.B.1.4]` Top bar métricas agregadas: total unidades, disponibles/apartadas/vendidas, absorción 30d, precio promedio/m2, days on market p50.
- `[15.B.1.5]` Query tRPC `trpc.developer.getInventory({ projectId, filters, pagination })` con cursor pagination (limit 50).

**Criterio de done del módulo:**
- [ ] Grid renderiza 200 unidades en <1s (virtualización con `@tanstack/react-virtual`).
- [ ] Filtros combinables (prototipo + status) funcionan.

#### MÓDULO 15.B.2 — Detalle unidad + historial

**Pasos:**
- `[15.B.2.1]` Click en unidad → slide-over `<UnitDetailDrawer>` (reusar patrón M04 Asesor).
- `[15.B.2.2]` Tabs: Info, Precios (historial `historial_precios`), Cambios (unit_change_log), Ocupación (reservas futuras), Leads asignados.
- `[15.B.2.3]` Tab Info: editable inline con validación Zod — cambiar precio dispara trigger cascada `price_changed` (FASE 08 — recalcula A12, A01, A04, A02, B02, B03, E01).
- `[15.B.2.4]` Tab Precios: recharts Line chart con puntos (x=fecha, y=precio), anotaciones de eventos (visita con oferta, cambio estrategia).
- `[15.B.2.5]` Tab Cambios: lista eventos `unit_change_log` (`status_changed`, `price_changed`, `assigned_to_broker`) con timestamp + autor.

**Criterio de done del módulo:**
- [ ] Editar precio registra en `historial_precios` + dispara cascade.
- [ ] Historial de precios gráfica correctamente las 3 últimas modificaciones.

#### MÓDULO 15.B.3 — Hook `useRealtimeUnits` + upload fotos

**Pasos:**
- `[15.B.3.1]` Hook `features/inventario/hooks/use-realtime-units.ts` suscribe a Supabase Realtime canal `unidades:project_id=eq.${projectId}` para INSERT/UPDATE/DELETE. Actualiza query cache de tRPC vía `utils.developer.getInventory.setData`.
- `[15.B.3.2]` Cuando otro usuario del mismo dev (p.ej. Project Manager) cambia precio → el inventory del dev owner se actualiza en tiempo real con toast "Pedro cambió precio de Apartado 3B".
- `[15.B.3.3]` Upload fotos por unidad: `<PhotoUploader>` (reusar `/api/photos/upload` FASE 04) con Sharp 3 variantes (thumbnail 320w, medium 800w, full 1920w). WebP output.
- `[15.B.3.4]` Classifier AI opcional (FASE 03 AI shell): `/api/photos/classify` clasifica interior/exterior/amenidades/vista/planos con Claude Sonnet vision.
- `[15.B.3.5]` Drag&drop reorder de fotos. Foto principal marcada con corona.

**Criterio de done del módulo:**
- [ ] Realtime actualiza UI en <2s cuando otro user modifica.
- [ ] Upload 5 fotos 8MB cada una en <20s.
- [ ] Classifier retorna tags válidos.

#### MÓDULO 15.B.4 — Prototipos + Esquemas de pago + Avance obra

**Pasos:**
- `[15.B.4.1]` Sub-ruta `/inventario/prototipos` CRUD de prototipos (`prototipos` tabla): nombre, m2 base, recámaras, baños, precio base, amenidades[], planos url.
- `[15.B.4.2]` Sub-ruta `/inventario/esquemas-pago` CRUD de esquemas (`esquemas_pago`): % enganche, # mensualidades, % contra-entrega, # meses gracia. Preview calculadora con valor cierre + comisión + IVA.
- `[15.B.4.3]` Sub-ruta `/inventario/avance-obra` con slider visual de % avance por etapa (cimentación, estructura, albañilería, acabados, áreas comunes, entrega). Cada cambio registra en `avance_obra_log`.
- `[15.B.4.4]` Upload fotos de avance obra mensuales con geolocalización opcional + drone photo.

**Criterio de done del módulo:**
- [ ] Crear prototipo + asignar a unidades nuevas funciona.
- [ ] Cambio en avance obra registra log + notif a compradores con apartado.

### BLOQUE 15.C — Canal Distribución + Lead Assignment

#### MÓDULO 15.C.1 — Configuración canal

**Pasos:**
- `[15.C.1.1]` Ruta `/crm/canal-distribucion` con config tipo wizard:
  - Step 1: Tipo de canal (in-house asesores, broker authorized, open broker MLS).
  - Step 2: Comisión % + split (entre asesor, broker company, DMX — transparente).
  - Step 3: Reglas de asignación (round-robin, zona, idioma, score asesor H05).
  - Step 4: SLAs (first response <15min, follow-up <24h).
- `[15.C.1.2]` Persistir en tabla `project_brokers` (columnas existentes FASE 01) con flags.
- `[15.C.1.3]` Vista "Asesores autorizados" lista asesores con `is_authorized_broker(project_id)=true` + métricas por asesor (leads recibidos, ventas cerradas, Trust Score H05).

**Criterio de done del módulo:**
- [ ] Wizard completado persiste en `project_brokers` + trigger cache actualizado.
- [ ] Asesor con role='asesor' AND `is_authorized_broker(project)` ve el proyecto en su M02 Desarrollos.

#### MÓDULO 15.C.2 — Lead Assignment + Distribución

**Pasos:**
- `[15.C.2.1]` Cuando llega nuevo lead (desde landing page FASE 21 → tabla `busqueda_proyectos`) el motor de asignación:
  - Consulta regla configurada en `project_brokers.assignment_rule`.
  - Si round-robin: elige siguiente asesor en lista, respetando disponibilidad (`profiles.estado='disponible'`).
  - Si zona: match asesor.zonas_especialidad con busqueda.zona.
  - Si score: asesor H05 > threshold.
- `[15.C.2.2]` Crea `busquedas.asesor_id = X` + notificación tipo 3 v4 "Nuevo lead asignado" WhatsApp + in_app.
- `[15.C.2.3]` Dashboard dev "Leads hoy" con tabla: nombre lead, fuente (landing/portal/referral), asesor asignado, tiempo_first_response, status.
- `[15.C.2.4]` Si asesor no responde en SLA → escalation: reasignar a siguiente + notif dev.

**Criterio de done del módulo:**
- [ ] Lead creado desde landing test se asigna automáticamente.
- [ ] SLA violation dispara reasignación en <30s.

### BLOQUE 15.D — M13 CRM Dev + M14 Marketing Dev

#### MÓDULO 15.D.1 — M13 CRM Dev (pipeline propio)

**Pasos:**
- `[15.D.1.1]` `app/(developer)/crm/page.tsx` con pipeline 6 etapas (distinto al CRM Asesor que tiene 7): `interesado → contactado → visitó → ofertó → apartó → cerró`.
- `[15.D.1.2]` Kanban con drag&drop (reusar component `<PipelineKanban>` de FASE 13). Cada card muestra lead: nombre, unidad interesada, asesor asignado, hot/warm/cold, días en etapa.
- `[15.D.1.3]` Query consolidada `trpc.developer.getPipelineLeads({ projectId })` que JOIN `busqueda_proyectos + contactos + busquedas + visitas_programadas + operaciones`.
- `[15.D.1.4]` Widget "Conversion funnel" agregado: visualiza % que pasa de interesado→contactado→visitó→ofertó→apartó→cerró.
- `[15.D.1.5]` Tab "Compradores apartados" — lista usuarios con apartado/escrow activo (Fase 18), status pagos, milestone.
- `[15.D.1.6]` Feature gated: Free 10 leads/mes, Starter 50/mes, Pro ∞.

**Criterio de done del módulo:**
- [ ] Drag lead de "visitó" a "ofertó" persiste + crea `operaciones` record (status='propuesta').
- [ ] Conversion funnel refleja valores reales.

#### MÓDULO 15.D.2 — M14 Marketing Dev

**Pasos:**
- `[15.D.2.1]` `app/(developer)/marketing/page.tsx` con secciones: Landings, QR codes, Kit ventas IE, Piezas auto-generadas, Portales externos.
- `[15.D.2.2]` Landings: reusar Fase 21 landing composer pero scoped al proyecto. Generador automático crea landing 1-page con fotos + amenidades + price range + mapa + 4 scores IE (Livability, Momentum, Safety, Ecosystem). URL: `desarrollosmx.com/p/<slug>`.
- `[15.D.2.3]` QR codes: vincula a unidad específica o proyecto. Útil para ads físicos (lonas obra). Tracking de scans en `qr_codes.scans_count` (corregir SEC-09 — policy con FK a dueño).
- `[15.D.2.4]` Kit ventas IE auto-generado: PDF con scores IE del proyecto + comparables + argumentario (C02 del asesor) + tabla avance obra. Descarga desde `/api/dev/kit-ventas?project=X`.
- `[15.D.2.5]` Auto-gen piezas Meta/IG: llamada a `/api/ai/generate-pieces` (FASE 03) con template tipo Post Cuadrado / Post Largo / Story / Video Story / Video. Output en `ai_generated_content.type='marketing_piece'`.
- `[15.D.2.6]` Portales externos (`marketing_portales` tabla v5.1-S3): toggle para publicar en Inmuebles24, Mudafy, Vivanuncios automáticamente con SOAP/API respectivo. Status publishing (pending/published/error).
- `[15.D.2.7]` WhatsApp templates: `whatsapp_templates` tabla con mensajes pre-aprobados WA Business (Meta).

**Criterio de done del módulo:**
- [ ] Generar landing para proyecto X produce URL funcional con 0 placeholders.
- [ ] Kit ventas PDF descargable con datos IE reales.
- [ ] Publicación a Inmuebles24 retorna listing_id válido.

### BLOQUE 15.E — M15 Analytics IE (7 tabs)

Ruta `app/(developer)/analytics/page.tsx`. Top bar tabs: Demanda | Pricing | Absorción | Competencia | PMF | Costos | Predicciones. Cada tab es un componente `features/analytics-dev/tabs/<name>-tab.tsx`.

#### MÓDULO 15.E.1 — Tab 1 Demanda (B01 Heatmap)

**Pasos:**
- `[15.E.1.1]` `<DemandTab>` con Mapbox GL JS embed (reusar `shared/ui/maps/MapboxHeatmap.tsx` FASE 07).
- `[15.E.1.2]` Consume `trpc.scores.getB01DemandHeatmap({ projectCenter, radiusKm })` que retorna GeoJSON con puntos pesados (búsquedas activas + wishlist + search_logs últimos 90d).
- `[15.E.1.3]` Overlay: pin del proyecto destacado en amarillo + radio de influencia 3km.
- `[15.E.1.4]` Side panel: "Búsquedas activas matcheando tu inventario" — lista `busquedas` con match (prototipo+precio+zona compatible) y comprador interesado (solo slug sin PII — ADR-009 SEC-01).
- `[15.E.1.5]` KPI superior: # búsquedas activas, # matches potenciales, match rate %.

**Criterio de done del módulo:**
- [ ] Heatmap renderiza puntos con intensidad correcta.
- [ ] Lista búsquedas muestra solo las que matchean criterios proyecto.

#### MÓDULO 15.E.2 — Tab 2 Pricing Autopilot (B03)

**Pasos:**
- `[15.E.2.1]` `<PricingTab>` muestra tabla por unidad: unit, prototipo, precio_actual, precio_sugerido_IE, delta %, días_mercado, confidence, reasoning.
- `[15.E.2.2]` Consume `trpc.scores.getB03PricingAutopilot({ projectId })` — ejecuta calculator B03 (FASE 10) por unidad.
- `[15.E.2.3]` Reasoning inline: "Competencia Apartado 2B del proyecto Torre Vista vende a $4.2M ($54,500/m2). Tu precio $52,000/m2 — consistente. Recomendación: mantener."
- `[15.E.2.4]` Acción "Aceptar sugerencia" → escribe a `unidades.precio_lista`, registra feedback `feedback_registered` cascade (aprendizaje B03).
- `[15.E.2.5]` Filtro "Desviaciones >5%" para detectar outliers.
- `[15.E.2.6]` Tab requiere `dev.pricing_autopilot=true` (Starter+).

**Criterio de done del módulo:**
- [ ] Tabla genera sugerencias para todas las unidades disponibles.
- [ ] Aceptar sugerencia dispara cascada `price_changed` (verificable en `score_recalculation_queue`).

#### MÓDULO 15.E.3 — Tab 3 Absorción Forecast (B08)

**Pasos:**
- `[15.E.3.1]` `<AbsorptionTab>` con 3 escenarios (optimista / base / pesimista) como 3 Line charts.
- `[15.E.3.2]` Consume `trpc.scores.getB08Forecast({ projectId, horizonMonths: 24 })`.
- `[15.E.3.3]` Eje X meses (0-24), eje Y unidades acumuladas vendidas. Línea actual (ventas históricas) + 3 proyecciones futuro.
- `[15.E.3.4]` KPIs: velocity actual (units/mes), velocity benchmark zona, ETA sold-out optimista / base / pesimista.
- `[15.E.3.5]` Sensitivity analysis: slider "Si bajo precio 5%" → recalcula velocity usando elasticidad zona (FASE 10).
- `[15.E.3.6]` Comentario IA narrative: "Bajo tu pricing actual, venderás 100% en 14 meses en escenario base. Si aceleras marketing digital +30% budget, reduces a 11 meses."

**Criterio de done del módulo:**
- [ ] 3 escenarios renderizan con datos coherentes (opt > base > pes).
- [ ] Slider sensibilidad actualiza forecast <500ms.

#### MÓDULO 15.E.4 — Tab 4 Competencia (B07)

**Pasos:**
- `[15.E.4.1]` `<CompetitiveTab>` tabla comparativa: mi proyecto vs top 5 competidores en radio 2km.
- `[15.E.4.2]` Consume `trpc.scores.getB07Competitive({ projectId })` que retorna array de 5 competidores (de `project_competitors` tabla + scoring).
- `[15.E.4.3]` 8 dimensiones comparativas (columnas): Precio/m2, Amenidades (count), Avance obra %, Absorción, DMX Score, Safety, Ecosystem, Time to delivery.
- `[15.E.4.4]` Color code por celda: verde (mejor que promedio competencia), ámbar (par), rojo (peor).
- `[15.E.4.5]` Radar chart lateral con 8 dims overlayed (mi proyecto vs media competencia).
- `[15.E.4.6]` "Gap analysis" IA-generado: "Tu proyecto es 12% más caro que promedio zona pero ofrece 2 amenidades más + mejor Livability +0.8. Justifica premium."

**Criterio de done del módulo:**
- [ ] Tabla renderiza 5 competidores con datos actualizados.
- [ ] Radar visualiza correctamente las 8 dims.

#### MÓDULO 15.E.5 — Tab 5 Product Market Fit (B04)

**Pasos:**
- `[15.E.5.1]` `<PMFTab>` muestra score PMF 0-100 + breakdown: gap analysis (demanda > oferta en tu segmento?) + demand count.
- `[15.E.5.2]` Consume `trpc.scores.getB04PMF({ projectId })`.
- `[15.E.5.3]` Desglose prototipo: cada prototipo con score PMF individual + "# búsquedas pidiendo X recámaras + Y m2 + Z precio en tu zona" vs "# unidades similares en mercado".
- `[15.E.5.4]` Recomendaciones: "Demanda 80 búsquedas en 2 recámaras 70-90m2, oferta competencia 120 unidades. Tu prototipo 2R 80m2 tiene PMF 45/100 — considera pivotar a 1R boutique."
- `[15.E.5.5]` Histórico PMF evolution (3, 6, 12 meses).

**Criterio de done del módulo:**
- [ ] PMF calculated con math consistente.
- [ ] Cada prototipo tiene score separado.

#### MÓDULO 15.E.6 — Tab 6 Costos (B12)

**Pasos:**
- `[15.E.6.1]` `<CostsTab>` con serie tiempo INPP Construcción (INEGI) superpuesta sobre costos del proyecto.
- `[15.E.6.2]` Consume `trpc.scores.getB12CostTracker({ projectId })` (B12 ya IMPLEMENTADO en registry).
- `[15.E.6.3]` AlertLevel: `critical` (INPP +15% YoY + tu margen <10%), `warning` (INPP +10-15%), `normal` (<10%).
- `[15.E.6.4]` Breakdown costos: materiales, mano obra, indirecto, imprevistos — comparativo mes actual vs mes anterior vs hace 1 año.
- `[15.E.6.5]` Recomendación IA: "INPP subió 11% YoY. Tu margen Bruto actual 18% está -3pp vs 21% hace año. Considera ajustar precio +4% o renegociar cadena suministro."
- `[15.E.6.6]` Integración futura con `journal_entries` Fase 16 para costos reales vs presupuestados.

**Criterio de done del módulo:**
- [ ] Serie INPP traída correctamente (BANXICO+INEGI FASE 07).
- [ ] AlertLevel correcto según threshold.

#### MÓDULO 15.E.7 — Tab 7 Predicciones (B05 + B15 + B09)

**Pasos:**
- `[15.E.7.1]` `<PredictionsTab>` con 3 sub-secciones:
  - **B05 Market Cycle fase**: cuál fase está la zona (expansión/pico/contracción/valle) + ubicación histórica del proyecto en cycle.
  - **B15 Launch Timing**: mejor momento para siguiente torre/fase (scoring 0-100 por mes próximos 24 meses).
  - **B09 Cash Flow 12 meses**: proyección ingresos vs egresos basado en Absorción (B08) + schema pago + costos actualizados.
- `[15.E.7.2]` Consume 3 procedures tRPC (`getB05MarketCycle`, `getB15LaunchTiming`, `getB09CashFlow`).
- `[15.E.7.3]` Visualización: B05 como gauge circular con fase actual marcada; B15 como timeline con barras de score; B09 como waterfall chart con ingresos/egresos/saldo.
- `[15.E.7.4]` Recomendación maestra AI-generated combinando los 3: "Zona Del Valle en expansión (B05 62%). Mejor launch Torre B: junio 2026 (B15 84/100). Cash Flow sano si absorción ≥2 units/mes."
- `[15.E.7.5]` Tab requiere `dev.predictions_tab=true` (Pro+).

**Criterio de done del módulo:**
- [ ] Los 3 sub-sections renderizan datos coherentes entre sí.
- [ ] Narrative IA cruza las 3 predicciones lógicamente.

#### MÓDULO 15.E.8 — Dynamic Pricing Daily (GC-87)

**Pasos:**
- `[15.E.8.1]` Cron `dynamic_pricing_daily` 2am por proyecto Pro+: recalcula precio óptimo per unidad usando:
  - B03 Pricing Autopilot (ya implementado) + elasticidad zona (FASE 10).
  - Demand signals últimos 7 días (búsquedas matching, wishlist adds, landing views).
  - Competitor moves (ver GC-88) — si competencia bajó 3% hace 24h, ajusta ±1%.
  - Absorción actual vs target (si absorción <target → lowering signal).
- `[15.E.8.2]` Output `dynamic_pricing_suggestions` tabla (unit_id, current_price, suggested_price, delta_pct, rationale, confidence, expires_at=end_of_day).
- `[15.E.8.3]` UI tab Pricing: toggle "Auto-apply" (si on, dev aprueba policy → cambios aplican con audit; si off, dev revisa cada mañana).
- `[15.E.8.4]` Notif dev diaria con resumen sugerencias día.
- `[15.E.8.5]` Feature gated Pro+ (Enterprise puede auto-apply).

**Criterio de done del módulo:**
- [ ] Cron genera sugerencias para 100 unidades en <90s.
- [ ] Auto-apply respeta guard-rails (±3% máximo por día).

#### MÓDULO 15.E.9 — Competitor Radar (GC-88)

**Pasos:**
- `[15.E.9.1]` Tabla `competitor_monitors` (project_id, competitor_project_id, metrics_tracked[], last_checked_at). Cada dev selecciona hasta 10 competidores (H1) o unlimited (Enterprise).
- `[15.E.9.2]` Cron `competitor_radar_daily` 4am: para cada monitor consulta `project_competitors` + `market_prices_secondary` (captura Chrome Ext GC-27 FASE 07) + news web (Claude + web browse) → detecta cambios:
  - Nuevo launch / nueva torre (scrape homepage or press release).
  - Cambio precio ±2%.
  - Inventario change (unidades disponibles delta).
  - Cambio avance obra.
  - Ads visibles FB/IG (Meta Ad Library API).
- `[15.E.9.3]` Alertas `competitor_alerts` tabla + widget tab Competencia "Alertas últimas 7 días".
- `[15.E.9.4]` AI narrative weekly: "Torre Vista bajó 4% en Apartado 2B; tu unidad equivalente ahora 6% sobre mercado".
- `[15.E.9.5]` Feature gated Pro+.

**Criterio de done del módulo:**
- [ ] Monitor configurado detecta cambio precio test.
- [ ] Alert aparece en UI <24h post-change.

### BLOQUE 15.F — UPG 7.10 Developer Intelligence (UPG 81-89)

Mapeo directo contexto §23.1 sub-etapa 7.10: 9 herramientas con datos reales.

#### MÓDULO 15.F.1 — UPG 81 Demand Heatmap Real + UPG 82 Pricing Advisor

**Pasos:**
- `[15.F.1.1]` UPG 81 ya cubierto en Tab 1 (consume DENUE+FGJ+busquedas reales — no dummy). Validar.
- `[15.F.1.2]` UPG 82 Pricing Advisor: componente adicional `<PricingAdvisor>` en página Analytics que analiza TODOS los proyectos comparables en 5km y recomienda rango óptimo per prototipo.
- `[15.F.1.3]` Integra `propiedades_secundarias` (mercado secundario) como baseline + primary offer via `unidades` + comparables via `project_competitors`.

**Criterio de done del módulo:**
- [ ] Advisor retorna rango [min, max, optimal] para cada prototipo activo.

#### MÓDULO 15.F.2 — UPG 83 Competitive + UPG 84 Benchmark

**Pasos:**
- `[15.F.2.1]` UPG 83 cubierto en Tab 4 Competencia.
- `[15.F.2.2]` UPG 84 Developer Benchmark (E06 score AI nivel 5): ruta `/analytics/benchmark` compara tu performance vs percentil desarrolladores MX (top 10%, top 25%, mediana).
- `[15.F.2.3]` Métricas benchmarkeables: absorción, days on market, Trust Score H05, conversión visit→sale, NPS compradores, tiempo entrega vs planeado.
- `[15.F.2.4]` Genera PDF "Tu Benchmark Dev Q<N>" con `/api/ai/generate-report?type=benchmark`.

**Criterio de done del módulo:**
- [ ] Percentiles calculados desde universo real de devs.
- [ ] PDF descargable.

#### MÓDULO 15.F.3 — UPG 85 Feasibility auto (GC-82) + UPG 86 Terrenos

**Pasos:**
- `[15.F.3.1]` UPG 85 Feasibility Report (I03 producto B2B stub aquí, full Fase 23): ruta `/analytics/feasibility/new` wizard:
  - Step 1: Subir polígono terreno (GeoJSON o dibujar en Mapbox) **o pegar link Catastro CDMX (GC-82)** → server parsea cuenta catastral + geometría + uso suelo automáticamente.
  - Step 2: Input programa (# unidades, m2 vendibles, mix prototipos). Si link Catastro: sugiere programa óptimo basado en densidad permitida + comparables zona.
  - Step 3: Engine IE calcula auto: DMX Score zona, densidad permitida (uso suelo SEDUVI si disponible), absorción esperada B08 zonal, precio target, **cash flow mensual + IRR 5y/10y + NPV + break-even month** (extensión GC-82).
  - Step 4: Generar reporte PDF con análisis + comparables + sensitivity analysis (±10% precio, ±20% absorción).
- `[15.F.3.2]` UPG 86 Terrenos disponibles: vista de terrenos en venta con scoring (consume `market_prices_secondary` filtered por tipo='terreno' + uso suelo).
- `[15.F.3.3]` Filtros: alcaldía, m2 min/max, precio/m2, zonificación, densidad permitida, scoring IE.

**Criterio de done del módulo:**
- [ ] Wizard feasibility completado produce PDF con números reales.
- [ ] Terrenos map muestra pines con score.
- [ ] Pegar link Catastro auto-llena Step 1 + 2 en <10s (GC-82).

#### MÓDULO 15.F.4 — UPG 87 Análisis Manzana + UPG 88 Oportunidades + UPG 89 Proyección

**Pasos:**
- `[15.F.4.1]` UPG 87 Análisis Manzana: click manzana en map → intelligence card con (F03 Ecosystem DENUE, F01 Safety, N01 Diversity Shannon-Wiener, F10 Gentrification 2.0, F09 Value Score).
- `[15.F.4.2]` UPG 88 Zonas Oportunidad (H12): ranking zonas emergentes con alta demanda + baja oferta + gentrification velocity alta (N03).
- `[15.F.4.3]` UPG 89 Proyección a 5 años: AI narrative + gráfica proyección por zona (consume H16 Neighborhood Evolution score nivel 2).

**Criterio de done del módulo:**
- [ ] Análisis manzana resuelve con <2s.
- [ ] Ranking oportunidades muestra top 10 colonias con badges.

### BLOQUE 15.G — Upload docs para Doc Intel (pin Fase 17) + Contabilidad pin stub Fase 16

#### MÓDULO 15.G.1 — Upload docs proyecto

**Pasos:**
- `[15.G.1.1]` `/inventario/documentos` por proyecto. Drop zone multi-file.
- `[15.G.1.2]` Categorías: Planos arquitectónicos, Memoria descriptiva, Escrituras, Permisos SEDUVI, Carta crédito construcción, Estudio de suelo, Factibilidad federal, Otros.
- `[15.G.1.3]` Al subir: crea `document_jobs` record con `status='uploaded'`, path Storage bucket `project-documents`, classified_type (sugerido por AI en FASE 17).
- `[15.G.1.4]` Preview inline PDF (react-pdf). Status visible: uploaded → extracting → extracted → validated → approved/rejected.
- `[15.G.1.5]` Fase 17 implementa pipeline AI extraction + Quality Score verde/ámbar/rojo. Acá solo upload + listar.

**Criterio de done del módulo:**
- [ ] Upload 20MB PDF se persiste + crea job.
- [ ] Lista muestra status en tiempo real (realtime channel).

#### MÓDULO 15.G.2 — Contabilidad pin stub

**Pasos:**
- `[15.G.2.1]` Ruta `/contabilidad/page.tsx` con placeholder "Fase 16 implementa contabilidad completa".
- `[15.G.2.2]` Sidebar pin dentro: Dashboard, Facturas, Pagos, Conciliación, Payout programs, Reportes — cada uno con "Próximamente Fase 16" salvo CRUDs muy básicos.
- `[15.G.2.3]` Preview KPIs mock: revenue del mes, comisiones pendientes, payouts próximos. Valores 0 hasta Fase 16.
- `[15.G.2.4]` CTA "Configurar tu FIEL + Facturapi" → redirect a doc de onboarding futuro.

**Criterio de done del módulo:**
- [ ] Ruta renderiza sin errores.
- [ ] Fase 16 luego popula full funcionalidad en mismo path.

### BLOQUE 15.X — Dev Moonshots: Simulador + Radar Trend Genome + Reporte Comité + Pipeline Tracker + API Enterprise

> **Contexto:** Extensión del Portal Desarrollador con capacidades B2B enterprise apalancando FASE 11 XL (seeds implementados). Este bloque posiciona DMX como herramienta de feasibility + intel competitivo nivel Cherre/CoStar para devs mexicanos.
> **Dependencias:** FASE 11 XL (15 índices DMX + Trend Genome + Scorecard + seeds implementados), FASE 12 (N5 + Mapa 12 capas), BLOQUE 15.E Analytics IE (7 tabs).

#### MÓDULO 15.X.1 — Simulador de Proyecto (eje dev)

**Pasos:**
- `[15.X.1.1]` Ruta `/developer/simulador-proyecto` con wizard 4 pasos:
  - Step 1: Ubicación (pegar link Catastro, polígono manual en Mapbox o colonia search).
  - Step 2: Tipología (residencial medio / alto / mixed-use / comercial / oficina) + m2 totales + # unidades + mix prototipos.
  - Step 3: Pricing target + esquema pago + timeline.
  - Step 4: Review inputs + botón "Simular".
- `[15.X.1.2]` Motor `developer.simulateProject` consume los **15 índices DMX** (FASE 11 XL seeds implementados) + scores zona + B01/B03/B04/B08/B12 calculators + comparables zona.
- `[15.X.1.3]` Output `{ absorcion_esperada_months, revenue_total_mxn, cost_total_mxn, irr_estimate, npv_estimate, break_even_month, sensitivity_analysis (±10% precio, ±20% absorcion), comparable_projects[], risk_flags[], pmf_score }`.
- `[15.X.1.4]` Export PDF 8-12 páginas con narrativa AI + charts + comparables.
- `[15.X.1.5]` Feature gated Pro+.

**Criterio de done del módulo:**
- [ ] Simulación completa en <30s.
- [ ] Numeros coherentes con B03/B08/B12.

#### MÓDULO 15.X.2 — Radar Trend Genome B2B

**Pasos:**
- `[15.X.2.1]` Ruta `/developer/radar-trend-genome` con suscripción push por dev a alertas específicas sobre zonas de interés (`zone_alert_subscriptions` FASE 11 XL).
- `[15.X.2.2]` Tipos de alerta: nuevo proyecto detectado en zona watchlist, price movement competidor, pulse score spike, influencer wave detectada, alpha alert Trend Genome.
- `[15.X.2.3]` Delivery multi-canal: in-app + email + WhatsApp + webhook (FASE 22).
- `[15.X.2.4]` Dashboard con feed cronológico de alertas + filtros severity + "Muted zones" para evitar ruido.
- `[15.X.2.5]` Feature gated Pro+ con límites por tier (Starter 5 suscripciones, Pro 50, Enterprise ilimitadas).

**Criterio de done del módulo:**
- [ ] Alerta test dispatch en <60s.
- [ ] Webhook entrega con HMAC válido.

#### MÓDULO 15.X.3 — Reporte para Comité (auto-gen PDF 15-20 pág)

**Pasos:**
- `[15.X.3.1]` Ruta `/developer/reporte-comite` permite al dev generar un "Investment Committee Memo" auto-generado con thesis completa de un proyecto (nuevo lanzamiento o feasibility evaluación).
- `[15.X.3.2]` Secciones: Executive Summary, Zone Deep Dive (15 índices DMX detallados), Competitive Landscape (B07 full), Demand Analysis (B01 + PMF B04), Pricing Strategy (B03), Absorption Forecast (B08), Financial Projections (simulador 15.X.1), Risk Matrix, Scenario Analysis, Recommendations.
- `[15.X.3.3]` AI redacta cada sección con citations cascade FASE 12.B.9. Claude Sonnet orchestrator + Haiku para subsections.
- `[15.X.3.4]` Template branding dev (logo + colores). Export PDF 15-20 páginas + versión Word editable.
- `[15.X.3.5]` Cost track $3-8 USD per report (LLM tokens); feature gated Pro+ con quota (Pro 5/mo, Enterprise ilimitado).

**Criterio de done del módulo:**
- [ ] Reporte completo en <3min.
- [ ] ≥30 citations verificables.

#### MÓDULO 15.X.4 — Pipeline Tracker (proyectos dev vs mercado)

**Pasos:**
- `[15.X.4.1]` Ruta `/developer/pipeline-tracker` con tabla de proyectos del dev (propios y pipeline) comparados vs. mercado zona.
- `[15.X.4.2]` Columnas: Proyecto, Zona, Status (presales/construction/pre-delivery/delivered), Avance obra %, Absorción actual vs benchmark, Precio/m2 vs zona median, Delta sobre forecast, DMX Score, Trust H05.
- `[15.X.4.3]` Filtros: zona, status, tipología.
- `[15.X.4.4]` Alertas embebidas: "Tu proyecto X en Del Valle está 2.1x bajo benchmark absorción — revisar pricing". Integra con Dynamic Pricing (15.E.8).
- `[15.X.4.5]` Export CSV/Excel para reportes internos.

**Criterio de done del módulo:**
- [ ] Tabla render con 20+ proyectos en <1.5s.
- [ ] Comparaciones vs mercado actualizadas daily.

#### MÓDULO 15.X.5 — API Enterprise REST consumo externo

**Pasos:**
- `[15.X.5.1]` Dev Enterprise tiene acceso a API REST propia `api.desarrollosmx.com/v1/developer/*` para integrar scores DMX + índices + alertas en sistemas propios del dev (ERP, BI interno, CRM customizado).
- `[15.X.5.2]` Endpoints key:
  - `GET /v1/developer/scores/:zone_id` — 15 índices + scores completos zona.
  - `GET /v1/developer/pipeline` — pipeline tracker data JSON.
  - `POST /v1/developer/simulate` — simulador project via API.
  - `GET /v1/developer/alerts` — alertas activas watchlist.
- `[15.X.5.3]` API keys gestionadas en `/developer/settings/api-keys` (reusa infra FASE 23 API externa — prefix `dmx_ent_`).
- `[15.X.5.4]` Rate limits Enterprise: 100K requests/day, bulk support.
- `[15.X.5.5]` SLA 99.9% + soporte dedicado + OpenAPI spec `api.desarrollosmx.com/v1/developer/openapi.json`.

**Criterio de done del módulo:**
- [ ] 4 endpoints operativos con auth + rate limit.
- [ ] OpenAPI spec válido.

### BLOQUE 15.H — Planes Dev + Feature gating matriz

#### MÓDULO 15.H.1 — Seed planes + features

**Pasos:**
- `[15.H.1.1]` Migration `seed_developer_plans` populala `plans` con:
  - `dev_free` (price_mxn_month=0): `projects_max=1, ai_extractions=5, drive_monitors=1, storage_gb=2, pricing_autopilot=false, absorption_forecast=false, competitive_intel=false, predictions_tab=false, api_access=false`.
  - `dev_starter` (999): `projects_max=5, ai_extractions=20, drive_monitors=5, storage_gb=10, pricing_autopilot=true, absorption_forecast=false, competitive_intel=true, predictions_tab=false, api_access=false`.
  - `dev_pro` (2999): `projects_max=999, ai_extractions=50, drive_monitors=999, storage_gb=50, pricing_autopilot=true, absorption_forecast=true, competitive_intel=true, predictions_tab=true, api_access=false`.
  - `dev_enterprise` (custom): todo true + `api_access=true`.
- `[15.H.1.2]` Seed `feature_registry` con keys `dev.projects_max`, `dev.ai_extractions_month`, `dev.pricing_autopilot`, etc.
- `[15.H.1.3]` Seed `role_features` mapping role='desarrollador' × feature × default_value.
- `[15.H.1.4]` Plan switch logic: `trpc.billing.switchPlan(plan_code)` → Fase 23 implementa Stripe billing; acá stub con mock + update `subscriptions.plan_id`.

**Criterio de done del módulo:**
- [ ] Usuario Free intenta crear 2do proyecto → error con CTA upgrade.
- [ ] Mock upgrade a Pro desbloquea todos los tabs.

#### MÓDULO 15.H.2 — Onboarding + pricing page

**Pasos:**
- `[15.H.2.1]` Ruta `/settings/plan` muestra plan actual + matriz de features + botón upgrade/downgrade.
- `[15.H.2.2]` Upgrade lleva a `/pricing` pública (Fase 21) pero logueado muestra CTAs específicos.
- `[15.H.2.3]` Notif automática cuando dev llega a 80% de límite (ej 4 de 5 proyectos Starter): "Estás al 80% de proyectos. Considera upgrade a Pro."

**Criterio de done del módulo:**
- [ ] Matrix de features rendea correctamente.
- [ ] Trigger 80% envía notif tipo 14 "Plan limit aproaching".

## Criterio de done de la FASE

- [ ] Todos los 8 bloques cerrados.
- [ ] 6 rutas principales + 10 sub-rutas del portal dev navegables sin errores.
- [ ] Los 7 tabs Analytics IE cargan datos reales desde calculators IE (FASE 08-12).
- [ ] UPG 7.10 (9 herramientas 81-89) accesibles y retornan datos reales.
- [ ] Feature gating funcionando en 100% de superficies (auditable matriz).
- [ ] Free/Starter/Pro sandbox users validan experiencia end-to-end.
- [ ] Realtime units hook probado con 2 sesiones simultáneas.
- [ ] Upload docs vinculado a `document_jobs` (Fase 17 procesa).
- [ ] Pin Contabilidad renderiza sin errores, ready para Fase 16.
- [ ] i18n: todas las strings via `t('developer.*')` — cero hardcoded (validado con `biome lint`).
- [ ] Multi-country: cambiar país en `supported_cities` de dev cambia FX + fuentes macro (FASE 05).
- [ ] Testing: Vitest coverage ≥70% en `features/developer/*`, `features/analytics-dev/*`. Playwright e2e: login dev → ver dashboard → ir a Tab Pricing → upgrade simulado → ver nueva tab.
- [ ] `supabase gen types` actualizado + commiteado.
- [ ] Tag git `fase-15-complete`.
- [ ] Features entregados: 30 (target §9 briefing).

## Features añadidas por GCs (delta v2)

- **F-15-31** Site Selection AI (GC-81) natural language query + map ranking.
- **F-15-32** Feasibility auto con link Catastro (GC-82) + cash flow + IRR.
- **F-15-33** Dynamic Pricing Daily (GC-87) cron + auto-apply toggle.
- **F-15-34** Competitor Radar (GC-88) daily cron + alertas.

## E2E VERIFICATION CHECKLIST

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-15-complete`.

- [ ] Todos los botones UI mapeados en 03.13_E2E_CONNECTIONS_MAP
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas
- [ ] Todos los triggers/cascades testeados
- [ ] Permission enforcement validado para cada rol
- [ ] Loading + error + empty states implementados
- [ ] Mobile responsive verificado
- [ ] Accessibility WCAG 2.1 AA
- [ ] audit-dead-ui.mjs pasa sin violations (0 dead)
- [ ] Playwright smoke tests covering happy paths pasan
- [ ] PostHog events tracked para acciones clave
- [ ] Sentry captures errors (validación runtime)
- [ ] STUBs marcados explícitamente con // STUB — activar FASE XX

## Próxima fase

FASE 16 — Contabilidad Dev (CFDI 4.0 + SAT + bancos + payout + holdback + dunning + AML + ESG)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
**Pivot revisión:** 2026-04-18 (biblia v2 moonshot — GCs integrados + E2E checklist)
