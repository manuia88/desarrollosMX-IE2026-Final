# FASE 13 — Portal Asesor (M01 Dashboard + M02 Desarrollos + M03 Contactos + M04 Búsquedas + M05 Captaciones)

> **Duración estimada:** 7 sesiones Claude Code (~28 horas con agentes paralelos)
> **Dependencias:** FASE 00-06 (bootstrap, BD, auth, AI shell, DS Dopamine, i18n, seguridad), FASE 07 (ingesta), FASE 08-12 (IE completo para intelligence cards inline)
> **Bloqueantes externos:**
> - Tokens Dopamine publicados en `styles/tokens.css` (FASE 04).
> - Supabase Auth flows con magic link + password (FASE 02).
> - Feature flags `asesor_m01`..`asesor_m05` en `feature_registry` (FASE 02 fundación).
> - Middleware `is_active` enforcement (FASE 06).
> - Scores N0-N3 + N5 para intelligence cards inline (FASE 08-12).
> - Seed `catalogos`: 17 tipos propiedad, 47 amenidades, 42 espacios, filtrados por país+tipo.
> - Dataset seed de 3 asesores + 10 contactos + 5 captaciones + 3 búsquedas (`supabase/seed.sql`).
> **Resultado esperado:** 5 módulos M01-M05 del portal asesor operando en rutas `app/(asesor)/*` con layout Dopamine, componentes Card3D, integración IE inline, STATUS_MAP global, i18n 100%, tRPC cableado. Seguir pixel-perfect la spec visual de `docs/referencias-ui/M1-M5_*.tsx`. Tag `fase-13-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase entrega la mitad del portal asesor: los primeros 5 módulos (Dashboard command center, Desarrollos, Contactos, Búsquedas, Captaciones). Son el core del día a día del asesor — los otros 4 (Tareas, Operaciones, Marketing, Estadísticas) van en FASE 14.

Crítico:
- Seguir spec visual EXACTA de `docs/referencias-ui/M1_Dashboard.tsx` a `M5_Captaciones.tsx` (son los JSX Dopamine finales v5.1 tropicalizados).
- STATUS_MAP global (`shared/lib/constants/status-maps.ts`) para traducir frontend↔BD sin tocar schema CHECK donde hay divergencia.
- i18n 100% (cero strings hardcoded).
- Herramientas asesor datos reales UPG 7.9: valuación, comparables, plusvalía, dossier, alert catastral, argumentario AI, objeción killer, urgency, post-visita feedback, lead priority, ACM.

## Bloques

### BLOQUE 13.A — Layout asesor + STATUS_MAP global

#### MÓDULO 13.A.1 — Layout `app/(asesor)/layout.tsx`

**Pasos:**
- `[13.A.1.1]` Crear `app/(asesor)/layout.tsx` (server component con server-side auth check). Valida role ∈ {asesor, broker, admin, superadmin}, redirige a `/login` si no.
- `[13.A.1.2]` Integrar `shared/ui/layout/AsesorShell.tsx` con:
  - Sidebar izquierdo 60→240px (hover expand), bg #111118, 9 items M01-M09 (+Academia + Ajustes).
  - Header 54px glass morphism (sticky), con `GlobalSearchTrigger` (⌘K), AI Copilot toggle, notifs badge, user menu.
  - Main content max-width 1100px centrado.
- `[13.A.1.3]` Sidebar items con tint cuando activos: M01 bgLavender, M02 bgSlate, M03 bgLavender, M04 bgLavender, M05 bgPeach. Uso `AsesorNavItem` reusable.
- `[13.A.1.4]` Copilot sidebar persistente (FASE 03) inyectado en layout (deslizable, se cierra con `Esc`).

**Criterio de done del módulo:**
- [ ] Login → redirect a `/dashboard` (M01).
- [ ] Sidebar expande smooth animación 240ms.
- [ ] ⌘K abre global search (palette).

#### MÓDULO 13.A.2 — STATUS_MAP global

**Pasos:**
- `[13.A.2.1]` Crear `shared/lib/constants/status-maps.ts` con mapas:
  ```ts
  export const OP_STATUS_MAP = {
    fe2be: { offer: 'propuesta', offer_blocked: 'oferta_aceptada', contract: 'escritura', closed: 'cerrada', paying: 'pagando', cancelled: 'cancelada' },
    be2fe: { propuesta: 'offer', oferta_aceptada: 'offer_blocked', escritura: 'contract', cerrada: 'closed', pagando: 'paying', cancelada: 'cancelled' }
  };
  export const TASK_TYPE_MAP = {
    fe2be: { property: 'propiedades', capture: 'propiedades', search: 'clientes', client: 'clientes', lead: 'prospectos', general: 'general' },
    be2fe: { propiedades: 'property', clientes: 'search', prospectos: 'lead', general: 'general' }
  };
  export const BUSQUEDA_ETAPA_MAP = {
    // BD tiene etapas en español ya — mantener 1:1; map solo para display labels i18n
    labels: { pendiente: 'status.busqueda.pendiente', buscando: 'status.busqueda.buscando', visitando: 'status.busqueda.visitando', ofertando: 'status.busqueda.ofertando', cerrando: 'status.busqueda.cerrando', ganada: 'status.busqueda.ganada', perdida: 'status.busqueda.perdida' }
  };
  ```
- `[13.A.2.2]` Helper `mapStatus(direction, domain, value)` con tipos exhaustivos TypeScript (discriminated union).
- `[13.A.2.3]` Tests que validan roundtrip: `fe→be→fe === fe`.

**Criterio de done del módulo:**
- [ ] Tests roundtrip 100% para los 3 mapas.
- [ ] Linter falla si código usa string literal en lugar de `mapStatus`.

### BLOQUE 13.B — M01 Dashboard Command Center

#### MÓDULO 13.B.1 — Ruta y header

**Pasos:**
- `[13.B.1.1]` Crear `app/(asesor)/dashboard/page.tsx` (server component prefetch + client `DashboardShell`).
- `[13.B.1.2]` Header: saludo dinámico según hora ("Buenos días, {nombre}"), estado disponibilidad toggle (disponible/no_disponible/en_visita) con triple-segment switch (actualiza `profiles.estado` vía `asesorCRM.toggleAvailability`).
- `[13.B.1.3]` Seguir spec `M1_Dashboard.tsx` pixel-perfect: tokens Dopamine, Card3D con tilt `use3DTilt(4)`, fondo #F5F3F0.

**Criterio de done del módulo:**
- [ ] Saludo cambia por hora server-side.
- [ ] Toggle persiste y aparece en UI de otros usuarios realtime.

#### MÓDULO 13.B.2 — Carrusel "¿Qué debo hacer hoy?" (home alerts)

**Pasos:**
- `[13.B.2.1]` Componente `shared/ui/dashboard/PriorityCarousel.tsx` consume `useDashboardPriorities()` hook.
- `[13.B.2.2]` Migration tabla `home_alerts` si no existe: `(id, user_id, alert_type, priority int 1-10, reference_id, reference_type, title, subtitle, cta_label, cta_href, expires_at, dismissed_at, created_at)`. 6 tipos: `whatsapp_desvinculado`, `visita_sin_confirmar`, `captacion_pendiente`, `curso_pendiente`, `continua_refiriendo`, `dmx_discovery_weekly`.
- `[13.B.2.3]` Cron `refresh_home_alerts` 6am por asesor: detecta tareas vencidas, visitas hoy sin confirmar, captaciones en pendiente >3 días, curso Academia uncompleted, etc.
- `[13.B.2.4]` Carrusel con ChevronLeft/ChevronRight, auto-rotate 8s, dismiss por alerta con undo 5s.

**Criterio de done del módulo:**
- [ ] Asesor con 4 alertas ve carrusel con 4 cards navegables.
- [ ] Dismiss elimina de UI + marca dismissed_at en BD.

#### MÓDULO 13.B.3 — 7 KPIs pedagógicos con umbrales Pulppo adaptados

**Pasos:**
- `[13.B.3.1]` Componente `KPIBar.tsx` con 7 tiles (usa `MetricCard` del reference M1):
  1. Pipeline total valor (MXN, emerald si >$20M)
  2. Contactos calientes (frio/tibio/caliente counts; semáforo green si ≥5 caliente)
  3. Ops abiertas (count + pipeline valor)
  4. Revenue YTD (MXN, trend vs mes pasado)
  5. Visitas agendadas semana
  6. Comisión forecast 6m (C06 score)
  7. SLA 1ª respuesta (min, verde <15, amarillo <60, rojo ≥60)
- `[13.B.3.2]` Función `getSemaphore(key, value)` en `shared/ui/dashboard/semaphores.ts` replicando tabla Pulppo del contexto §15.3 (7 reglas exactas).
- `[13.B.3.3]` Horario hábil cómputo 8am-8pm (respetar `profiles.preferred_timezone`).

**Criterio de done del módulo:**
- [ ] 7 KPIs render con color correcto.
- [ ] KPI click abre drawer pedagogía (qué mide / por qué / consejos / evolución) — reusa componente drawer (FASE 14 M09 lo comparte).

#### MÓDULO 13.B.4 — Morning briefing AI (C05)

**Pasos:**
- `[13.B.4.1]` Tile expandible con briefing generado por `intelligence.getMorningBriefing()` (alias a N5 C05 de FASE 12).
- `[13.B.4.2]` Contenido: 3 recomendaciones acción (con CTA), 2 insights mercado (con citations), saludo personalizado.
- `[13.B.4.3]` Cache 24h; regenera al hacer click "Actualizar".

**Criterio de done del módulo:**
- [ ] Briefing visible al login lunes.
- [ ] Citations ≥3 clickable.

#### MÓDULO 13.B.5 — 3 insights + quick actions + GamificationWidget

**Pasos:**
- `[13.B.5.1]` 3 insights sections: Mercado (auto MOM-zone), Personal (C06 forecast), Gamification (racha + XP).
- `[13.B.5.2]` 5 quick actions buttons: Nueva llamada (createTimelineEntry), Agendar visita (scheduleVisit), Compartir proyecto (share link), Subir foto (upload), Crear captación (modal M05).
- `[13.B.5.3]` `GamificationWidget` (FASE 14 integration si reusable) muestra streak actual + XP total + nivel + 3 badges recientes + next-level progress.
- `[13.B.5.4]` Discover Weekly tile (lunes 8am) con 3 proyectos match del comprador top1.

**Criterio de done del módulo:**
- [ ] Click "Llamada" abre modal con timeline entry.
- [ ] GamificationWidget refresca en tiempo real con Supabase Realtime.

#### MÓDULO 13.B.6 — ⌘K Global Search

**Pasos:**
- `[13.B.6.1]` `shared/ui/ai/CommandPalette.tsx` usando `cmdk`. Usa `asesorCRM.globalSearch(query)` que devuelve mix: contactos, proyectos, busquedas, captaciones, operaciones, tareas (top 3 por cada).
- `[13.B.6.2]` Atajos rápidos tipo VS Code: "nc" → nueva captación, "nb" → nueva búsqueda, "nt" → nueva tarea.
- `[13.B.6.3]` Keyboard nav flecha + enter + ESC close.

**Criterio de done del módulo:**
- [ ] Buscar "gonzalez" devuelve contacto + búsquedas asociadas.
- [ ] Shortcut "nc" abre modal captación.

### BLOQUE 13.C — M02 Desarrollos

#### MÓDULO 13.C.1 — Ruta y tabs

**Pasos:**
- `[13.C.1.1]` `app/(asesor)/desarrollos/page.tsx`. Tabs superiores:
  - **Propias** (proyectos del employer)
  - **Exclusivas** (exclusividad asesor con X-Y-Z)
  - **DMX** (toda la plataforma visible)
  - **MLS** (red completa H2, stub en H1)
- `[13.C.1.2]` Tint slate (#F0F2F7). Grid 3 cols responsive.

**Criterio de done del módulo:**
- [ ] 4 tabs funcionales, contador en cada tab.

#### MÓDULO 13.C.2 — Project cards + Quality Score labels

**Pasos:**
- `[13.C.2.1]` `ProjectCard.tsx` con imagen hero + nombre + colonia + unidades disponibles + **Quality Score** (label descriptivo NO invertido como Pulppo): `Competitivo (≥80) | Moderado (60-79) | Fuera de mercado (<60) | Sin ACM`.
- `[13.C.2.2]` Sistema Exclusividad "X-Y-Z" badge (Pulppo-pattern): `3-6-4%` = 3 meses exclusividad + 6 meses contrato + 4% comisión.
- `[13.C.2.3]` IE inline: DMX Score (G01) badge + Momentum (N11) arrow + Risk (IRE) semáforo.
- `[13.C.2.4]` Menu ··· 6 acciones: Ver ficha, Compartir, Agregar a carpeta cliente, Generar assets marketing, Pedir info adicional, Reportar issue.

**Criterio de done del módulo:**
- [ ] Card renderiza con 3 scores IE reales.
- [ ] Share genera link `/proyectos/[id]?ref=[asesor_id]`.

#### MÓDULO 13.C.3 — Ficha proyecto `/desarrollos/[id]`

**Pasos:**
- `[13.C.3.1]` Hero galería fotos + video; sticky header con nombre + CTA "Apartar" (abre flow M07).
- `[13.C.3.2]` Tabs: Info general, Unidades (tabla con Pricing Autopilot B03 sugerencias visibles), Zona (scores IE embebidos), Análisis Dev (Trust H05), Assets Marketing (postCuadrado/postLargo/story/videoStory/video con status `ready|generating`).
- `[13.C.3.3]` CTA "Ver comparables" → abre M05/comparar con proyectos zona similares (UPG 7.9 comparables).
- `[13.C.3.4]` CTA "Valuación automática" → corre `intelligence.calculateAcm({ propertyFacts })` con feedback loading state.

**Criterio de done del módulo:**
- [ ] 5 tabs navegables.
- [ ] Pricing Autopilot sugerencias visibles por unidad.

### BLOQUE 13.D — M03 Contactos

#### MÓDULO 13.D.1 — Ruta y tabla

**Pasos:**
- `[13.D.1.1]` `app/(asesor)/contactos/page.tsx`. Tabla con columnas: foto+nombre, tipo (comprador/vendedor/propietario/broker/inversor/otro), temperatura (frio/tibio/caliente/cliente chip), tags[], last_interaction, lead_score (C01), siguiente_accion (C01.siguiente_mejor_accion).
- `[13.D.1.2]` Búsqueda FTS Postgres (search_vector GIN) + filtros tipo + temperatura + tags.
- `[13.D.1.3]` Tint lavender. Card3D hover.

**Criterio de done del módulo:**
- [ ] Tabla 500 contactos scroll virtualizado.
- [ ] Búsqueda latency <200ms.

#### MÓDULO 13.D.2 — Schemas, anti-duplicados, i18n

**Pasos:**
- `[13.D.2.1]` Zod schemas `features/contactos/schemas/contacto.ts`: `phones: z.array(z.object({ number: z.string().regex(/^\+\d{10,15}$/), label: z.enum(['movil','trabajo','whatsapp','otro']) })).max(5)`, `emails: z.array(z.object({ email: z.string().email(), label: z.string() })).max(5)`, `first_name`, `last_name`, `tipo`, `temperatura`, `tags: z.array(z.string()).max(10)`.
- `[13.D.2.2]` BD garantiza uniqueness: unique index `(asesor_id, normalize_phone(phones->>0->>'number'))`. En UI crear flujo anti-duplicado: al tipear teléfono → debounce 500ms → consulta `contactos.checkDuplicate(phone)` → si existe, mostrar toast "Ya existe contacto: [nombre]" + botón Ver.
- `[13.D.2.3]` Trigger BD existente `check_duplicate_phone` rejecta en INSERT. Manejar error 23505 en UI con mensaje amigable.
- `[13.D.2.4]` i18n: todos los labels en `messages/es-MX.json` clave `contactos.*`.

**Criterio de done del módulo:**
- [ ] Crear 2 contactos mismo teléfono → 2do rechazado UI-friendly.
- [ ] Roundtrip nombre con caracteres MX (acentos, ñ) respeta.

#### MÓDULO 13.D.3 — Ficha contacto con AI

**Pasos:**
- `[13.D.3.1]` `/contactos/[id]/page.tsx` con secciones: info básica, timeline (actividad_timeline), búsquedas asociadas, visitas, operaciones, notas compartibles (3 niveles visibilidad: privada/inmobiliaria/DMX).
- `[13.D.3.2]` CTA "Argumentario AI" (C02): botón genera argumentario personalizado con citations — muestra en modal con opción copiar/enviar WhatsApp.
- `[13.D.3.3]` Lead Priority badge (C01 score + siguiente_accion recommendation).
- `[13.D.3.4]` Detección duplicados side-panel: si `similar_contacts[]` devuelto desde BD (fuzzy match por email/teléfono similar) → sugerir merge.

**Criterio de done del módulo:**
- [ ] Argumentario AI genera en <12s con ≥3 citations.
- [ ] Merge flow funcional.

### BLOQUE 13.E — M04 Búsquedas

#### MÓDULO 13.E.1 — Kanban 6+1 (drag & drop real)

**Pasos:**
- `[13.E.1.1]` `app/(asesor)/busquedas/page.tsx` con Kanban 6 columnas: Pendiente → Buscando → Visitando → Ofertando → Cerrando → Ganada (+ Perdida oculta toggle).
- `[13.E.1.2]` Implementar drag & drop real con `@dnd-kit/core` (Pulppo no tiene esto — diferenciador DMX).
- `[13.E.1.3]` Validaciones HARD en backend (tRPC procedure `busquedas.updateEtapa`):
  - Ofertando requiere ≥1 operación asociada.
  - Cerrando requiere ≥1 operación.
  - Ganada requiere ≥1 operación en status ≥ escritura.
- `[13.E.1.4]` UI feedback: si validación falla → toast error + revert card a columna origen.

**Criterio de done del módulo:**
- [ ] Drag búsqueda Pendiente → Visitando fluye.
- [ ] Drag a Ofertando sin op → toast "Primero crea una oferta".

#### MÓDULO 13.E.2 — Wizard Crear Búsqueda + 17 opciones fuente contacto

**Pasos:**
- `[13.E.2.1]` Modal `NewBusquedaWizard` 4 pasos: Contacto (picker) → Filtros (operacion, tipo, colonias[], precio_min/max, recámaras, amenidades[]) → Prioridad (alta/media/baja) → Confirm.
- `[13.E.2.2]` Campo REQUIRED "fuente_contacto" con 17 opciones adaptadas MX:
  ```
  WhatsApp DMX, WhatsApp personal, Inmuebles24, Mercadolibre, Vivanuncios, EasyBroker, ICasas, Propiedades.com, Facebook, Instagram, TikTok, Broker referido, Broker externo, Landing DMX, QR evento, Lona, Otro
  ```
- `[13.E.2.3]` Zod schema con el enum + i18n labels.

**Criterio de done del módulo:**
- [ ] 17 opciones en dropdown.
- [ ] Crear búsqueda con todos los campos → aparece en Kanban Pendiente.

#### MÓDULO 13.E.3 — Matching engine `/suggested`

**Pasos:**
- `[13.E.3.1]` `/busquedas/[id]/suggested` route con 10 proyectos match (usa `intelligence.match({ busquedaId })` de FASE 10).
- `[13.E.3.2]` Sort: operación > tipo_propiedad > colonia preferida > precio cercano > recámaras.
- `[13.E.3.3]` Por match: rationale, missing_filters, botón "Proponer a cliente" (enqueue WhatsApp template).

**Criterio de done del módulo:**
- [ ] 10 matches renderizan en <1s.
- [ ] Proponer abre template WhatsApp con link + scores.

#### MÓDULO 13.E.4 — Wizard Ofertar 6 pasos

**Pasos:**
- `[13.E.4.1]` `NewOfferWizard`: Operación (side) → Comprador → Vendedor (pegar liga EasyBroker/ML/Inmuebles24 para auto-fill) → Estado (inicial Propuesta + fecha_cierre +10d auto) → Comisión (default 3% buyer-side; configurable) → Notas.
- `[13.E.4.2]` Al finalizar crea operación con status='propuesta' (mapStatus fe2be) + asocia busqueda_id.
- `[13.E.4.3]` Valida que el asesor sea side correcto antes de submit.

**Criterio de done del módulo:**
- [ ] Wizard completo crea operación.
- [ ] Pegar liga ML extrae título+precio+ubicación.

#### MÓDULO 13.E.5 — Notas 3 niveles + feedback post-visita + urgency

**Pasos:**
- `[13.E.5.1]` Notas con `visibility` CHECK (`privada` | `inmobiliaria` | `plataforma`). Solo DMX admin ve `plataforma`.
- `[13.E.5.2]` Post-visita feedback form (UPG 7.9): rating 1-5 + texto + tags (le_gusto, precio_alto, etc.). Guarda `interaction_feedback` → cascade feedback_registered enqueue B04/B03/C04.
- `[13.E.5.3]` Urgency score auto: si contacto hace >3 visitas/semana → badge "urgent" en su búsqueda con CTA "Priorizar" en Dashboard.

**Criterio de done del módulo:**
- [ ] Nota privada no visible al manager del employer.
- [ ] 3 visitas en 7 días → urgency badge aparece.

### BLOQUE 13.F — M05 Captaciones

#### MÓDULO 13.F.1 — Kanban 6 columnas con validación crear-mínimo

**Pasos:**
- `[13.F.1.1]` `app/(asesor)/captaciones/page.tsx` con Kanban 6 columnas: Pendiente → Seguimiento → Encuentro → Valuación → Documentación → Captado.
- `[13.F.1.2]` Tint peach (#FFF3ED).
- `[13.F.1.3]` **EXIGIR mínimo antes de crear**: formulario new-captacion requiere `direccion_completa`, `tipo_operacion`, `precio_solicitado` como not-null antes de permitir submit (zod `.required()` + backend check). Evita phantom drafts (fricción Pulppo).
- `[13.F.1.4]` Trigger BD `captaciones_require_minimum_fields` (opcional, double-safety): CHECK NOT NULL en esos 3 campos.

**Criterio de done del módulo:**
- [ ] Intentar crear captación sin dirección → zod rechaza UI.
- [ ] Kanban drag a Valuación sin ACM → toast "Primero genera ACM".

#### MÓDULO 13.F.2 — Editor 6 secciones

**Pasos:**
- `[13.F.2.1]` `/captaciones/[id]/edit` page con 6 secciones (tabs verticales):
  1. **Ubicación**: cascada País (MX/CO/AR/BR/CL) → Estado (CDMX/EDOMEX) → Ciudad → Colonia (autocomplete con `zones` table).
  2. **Características**: tipo_propiedad (de 17 catalogados), m2_construccion, m2_terreno, m2_totales (auto-calculado), recámaras, baños, estacionamientos, edad_años, orientación, estado_conservación.
  3. **Operación**: operacion (venta/renta), precio_solicitado, moneda (MXN/USD), comisión_pct acordada, condiciones especiales.
  4. **Promoción**: título + descripción (con botón "Generar con AI" que usa Claude Sonnet + N1 scores zona para copy optimizado), fotos (upload con Sharp WebP 3 variantes).
  5. **Info interna**: motivo venta (comprar/compraron/inversión/sucesión), urgencia, documentos disponibles, contacto_propietario.
  6. **Galería**: drag-reorder fotos, flag "foto_portada", AI clasificación automática (exterior/cocina/recámara/baño — FASE 17).
- `[13.F.2.2]` Catálogos filtrados por país+tipo propiedad: amenidades (47 total → solo las aplicables a ese tipo+país), espacios (42 total).
- `[13.F.2.3]` Autoguardado cada 10s con indicador "Guardado" + timestamp.

**Criterio de done del módulo:**
- [ ] 6 secciones navegables con guardado parcial.
- [ ] AI gen description con ≥3 citations.
- [ ] Amenidades depto MX → 15 opciones (no 100+).

#### MÓDULO 13.F.3 — 4 etapas funcionales + ACM

**Pasos:**
- `[13.F.3.1]` **Seguimiento**: form con urgencia_venta (sin/baja/media/alta), motivo, posibilidad (inmediata/construccion/doc_compleja), inicio_comercialización (date).
- `[13.F.3.2]` **Encuentros**: CRUD encuentros con motivo (primer/propuesta/fotografías/otra) + fecha + hora + notas. Integra calendario (FASE 14 M06).
- `[13.F.3.3]` **Valuación** (ACM automático, UPG 7.9): si todos los datos mínimos completos → CTA "Generar ACM" llama `intelligence.calculateAcm()` (usa AVM I01 + comparables zona + ajustes). Output: precio_solicitado vs sugerido vs salida. Persistir `acm_valuaciones`.
- `[13.F.3.4]` **Acuerdo Comercial**: comisión desde 1% (% o MXN), exclusividad (toggle), duración 3/6/9/12 meses, estado (pending/review/signed). Generar contrato PDF con template.

**Criterio de done del módulo:**
- [ ] ACM genera con range ±5% del input manual del asesor (sanity).
- [ ] Contrato PDF descargable.

#### MÓDULO 13.F.4 — Menú ··· 8 acciones

**Pasos:**
- `[13.F.4.1]` Menu por captación: Compartir Radar (link público con scores), Cambiar estado, Encuentros, Tareas (crea task asociada), Notas, Publicar propiedad (envía a `propiedades_secundarias` + schedule `sync_props_to_market` a `market_prices_secondary`), Duplicar propiedad, Cerrar captación (irreversible; requiere motivo_perdida).

**Criterio de done del módulo:**
- [ ] 8 acciones funcionales.
- [ ] Publicar propiedad aparece en M02 tab "DMX" con Tier 2 data.

#### MÓDULO 13.F.5 — Herramientas asesor datos reales (UPG 7.9 anchor en M05)

**Pasos:**
- `[13.F.5.1]` **Valuación automática ACM**: ya en M05.3.
- `[13.F.5.2]` **Plusvalía estimada**: botón en captación usa A11 Patrimonio 20y simulation.
- `[13.F.5.3]` **Alert catastral**: botón "Verificar catastro" consulta Catastro CDMX (stub H2) — en H1 muestra mock con link al trámite oficial.
- `[13.F.5.4]` **Dossier inversión**: botón genera C08 dossier para enviar al propietario convenciendo del precio sugerido.

**Criterio de done del módulo:**
- [ ] 4 herramientas accesibles desde captación.

### BLOQUE 13.G — Tests + seguridad + performance

#### MÓDULO 13.G.1 — E2E Playwright asesor

**Pasos:**
- `[13.G.1.1]` 5 specs e2e: `dashboard.spec`, `desarrollos.spec`, `contactos.spec`, `busquedas.spec`, `captaciones.spec`. Cubre happy paths + anti-duplicado + validaciones HARD kanban + IE inline cards render.

**Criterio de done del módulo:**
- [ ] 5/5 specs green 2 runs consecutivos.

#### MÓDULO 13.G.2 — RLS verification

**Pasos:**
- `[13.G.2.1]` Test integration: asesor A no ve captaciones de asesor B del mismo employer (según `captaciones_policies`).
- `[13.G.2.2]` Manager con `permissions.contactos.view_team=true` ve todos contactos del employer.

**Criterio de done del módulo:**
- [ ] 100% policies verificadas con pgtap.

#### MÓDULO 13.G.3 — Performance budgets

**Pasos:**
- `[13.G.3.1]` Lighthouse CI en PRs: M01 Dashboard LCP <2s, CLS <0.05, TBT <200ms.
- `[13.G.3.2]` Bundle size per route: budget 250KB gzip max por `(asesor)/*` route.

**Criterio de done del módulo:**
- [ ] 5 rutas cumplen budget.

## Criterio de done de la FASE

- [ ] M01-M05 deployados en `app/(asesor)/*` con layout Dopamine + Card3D.
- [ ] STATUS_MAP global activo y testeado roundtrip.
- [ ] i18n 100% — cero strings hardcoded.
- [ ] Anti-duplicados contactos funcionando (UI + BD).
- [ ] Kanban búsquedas con drag&drop real + validaciones HARD.
- [ ] Captaciones exige mínimo antes de crear (no phantom drafts).
- [ ] Catálogos filtrados por país+tipo_propiedad en M05.
- [ ] 4 herramientas UPG 7.9 accesibles (valuación, plusvalía, alert catastral, dossier).
- [ ] Argumentario AI C02 + Lead Priority C01 visibles en ficha contacto.
- [ ] IE cards inline en ficha proyecto (DMX Score G01 + Momentum + Risk).
- [ ] 5 specs e2e Playwright pasando.
- [ ] RLS verificada con pgtap.
- [ ] Lighthouse budgets cumplidos.
- [ ] Tag git: `fase-13-complete`.
- [ ] Documentación: `docs/04_MODULOS/M01..M05_*.md` reflejan estado "implementado".

## Próxima fase

[FASE 14 — Portal Asesor M06-M09 (Tareas + Operaciones + Marketing + Estadísticas)](./FASE_14_PORTAL_ASESOR_M6_M10.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17
