# BIBLIA DMX v5 — PARTE 12
## MAPA DE CONEXIONES END-TO-END
## Frontend Dopamine → Backend Existente → Gaps
## Regla: Frontend Dopamine es INTOCABLE. Backend se adapta. No se borra nada. Si hay conflicto → pedir autorización.

---

# REGLAS DE ESTA PARTE

```
1. El diseño del frontend Dopamine (10 JSX + 9 DOCX) NO se modifica
2. El backend existente (110 tablas, 64 funciones, 36 triggers, 9 tRPC routers) NO se borra
3. Si el frontend necesita algo que no existe → SE CREA
4. Si algo del backend existe pero el frontend no lo usa → SE DEJA (no se borra)
5. Si hay conflicto (ej: status en español vs inglés) → STATUS_MAP traduce, NO se cambia la BD
6. Antes de cualquier cambio estructural → PEDIR AUTORIZACIÓN a Manu
```

---

# M1: DASHBOARD — Command Center

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Mostrar saludo + nombre     → profiles.first_name               → profiles              → ✅ EXISTE
   + estado disponible/no      → profiles.estado                   → profiles              → ✅ EXISTE
                                 CHECK: disponible/no_disponible/en_visita

2. KPI: Pipeline activo        → asesorCRM.getBusquedas            → busquedas             → ✅ EXISTE
   (count WHERE etapa NOT IN     WHERE asesor_id AND etapa NOT IN     etapa CHECK 7 vals
   ganada/perdida)               ('ganada','perdida')

3. KPI: Contactos este mes     → asesorCRM.getContactos            → contactos             → ✅ EXISTE
   (count WHERE created_at       WHERE asesor_id AND created_at      idx_contactos_asesor
   >= inicio_mes)                 >= inicio_mes

4. KPI: Operaciones activas    → asesorCRM.getOperaciones          → operaciones           → ✅ EXISTE
   (count WHERE status NOT IN    WHERE status NOT IN                  status CHECK español
   cerrada/cancelada)            ('cerrada','cancelada')              ⚠️ Frontend usa inglés → STATUS_MAP

5. KPI: Revenue mes            → get_asesor_dashboard(id)          → operaciones           → ✅ EXISTE (función SQL)
   (SUM comision_total WHERE     SUM(comision_total) WHERE            comision_total numeric
   status='cerrada')             status='cerrada' AND month

6. KPI: Visitas esta semana    → asesorCRM.getVisitasProgramadas   → visitas_programadas   → ✅ EXISTE
   (count WHERE fecha >=         WHERE asesor_id AND fecha >=        idx_visitas_prog_fecha
   inicio_semana)                inicio_semana

7. KPI: Comisión pendiente     → Cálculo sobre operaciones         → operaciones           → ✅ EXISTE
   (SUM comision_total -         WHERE estado_cobro IN               estado_cobro CHECK:
   comision_cobrada)             ('pendiente','parcial')              pendiente/parcial/cobrada/vencida

8. Insights IA: Briefing      → get_morning_briefing(id)           → Función SQL → jsonb   → ✅ EXISTE
   (Morning briefing AI)

9. Insights: Mercado           → intelligence.getZoneScores         → zone_scores           → ✅ ROUTER EXISTE
                                                                      ⚠️ 0 rows (sin datos hasta Sesión 07)

10. Insights: Personal         → gamification.getGamification       → asesor_gamification   → ✅ EXISTE
    (XP, streak, level)          getXP, getStreak, getLevel          xp_total, current_streak, level

11. Acción: Registrar llamada  → INSERT actividad_timeline          → actividad_timeline    → ✅ EXISTE
    (quick action button)        tipo='llamada', entity_type,         tipo CHECK 7 vals
                                 contenido                            ⚠️ FALTA: tRPC mutation para esto
                                                                      → CREAR: asesorCRM.createTimelineEntry

12. Acción: Programar visita   → INSERT visitas_programadas         → visitas_programadas   → ✅ EXISTE
    (quick action button)        + INSERT tareas auto                 ⚠️ FALTA: tRPC mutation directa
                                                                      → CREAR: asesorCRM.scheduleVisit

13. Acción: Compartir propiedad → INSERT busqueda_proyectos         → busqueda_proyectos    → ✅ EXISTE
    (quick action button)         estado='compartido'                 estado CHECK 4 vals

14. Toggle disponibilidad      → UPDATE profiles.estado             → profiles              → ✅ EXISTE
    (header availability)        'disponible' ↔ 'no_disponible'      ⚠️ FALTA: tRPC mutation
                                                                      → CREAR: asesorCRM.toggleAvailability

15. Gamification bar           → gamification.getGamification       → asesor_gamification   → ✅ EXISTE
    (XP bar + level + streak)

16. Notificaciones badge       → notificaciones WHERE leida=false   → notificaciones        → ✅ EXISTE
    (bell icon with count)       AND recipient_id=auth.uid()          idx_notif_recipient_unread
                                                                      ⚠️ FALTA: tRPC query
                                                                      → CREAR: asesorCRM.getUnreadNotifCount

17. Búsqueda global (cmdk)     → Múltiples queries paralelas       → contactos, projects,  → ✅ PARCIAL
    (command palette ⌘K)         FTS contactos.search_vector          busquedas               cmdk ya instalado
                                 + projects.nombre ILIKE              ⚠️ FALTA: tRPC unificado
                                                                      → CREAR: asesorCRM.globalSearch
```

### GAPS M1:
```
CREAR:
  - asesorCRM.createTimelineEntry (mutation)
  - asesorCRM.scheduleVisit (mutation) — o extender existente
  - asesorCRM.toggleAvailability (mutation)
  - asesorCRM.getUnreadNotifCount (query)
  - asesorCRM.globalSearch (query)
  
NO TOCAR:
  - get_asesor_dashboard() — funciona, el frontend consume su output
  - get_morning_briefing() — funciona
  - gamification router (3 queries) — funciona
```

---

# M2: DESARROLLOS (antes "Inventario")

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Lista de proyectos          → scores.getProjectList              → projects + fotos      → ✅ EXISTE
   (cards con foto, precio,      uses get_unit_stats_batch()          + unidades (stats)
   ubicación, scores)            FK: projects.desarrolladora_id

2. Filtrar por alcaldía        → WHERE projects.alcaldia=?          → projects              → ✅ EXISTE
                                  idx_projects_alcaldia

3. Filtrar por tipo            → WHERE projects.tipo_vivienda=?     → projects              → ✅ EXISTE
                                  CHECK: departamento/casa/loft/penthouse/townhouse/mixto

4. Filtrar por etapa           → WHERE projects.etapa_proyecto=?    → projects              → ✅ EXISTE
                                  CHECK: planeacion/preventa/.../entregado

5. Ver detalle proyecto        → developer.getProjectById           → projects (83 cols)    → ✅ EXISTE
                                  + prototipos + unidades + fotos     FK: project_id

6. Ver inventario unidades     → developer.getProjectUnits          → unidades (30 cols)    → ✅ EXISTE
   (tabla/grid con status)       WHERE project_id                    estado CHECK: disponible/reservado/vendido/no_disponible

7. Ver prototipos              → developer.getPrototipos            → prototipos            → ✅ EXISTE
                                  WHERE project_id                    FK: prototipos.project_id

8. Ver esquemas de pago        → developer.getEsquemasPago          → esquemas_pago         → ✅ EXISTE
                                  WHERE project_id                    + precios_unidad + unidad_esquema_desglose

9. Ver fotos galería           → photos.getProjectPhotos            → fotos                 → ✅ EXISTE
                                  WHERE project_id                    Hook: useProjectPhotos (140 LOC)
                                  ORDER BY orden

10. Ver avance de obra         → developer.getAvanceObra            → avance_obra           → ✅ EXISTE
                                  WHERE project_id                    + avance_obra_log

11. Ver IE scores del proyecto → scores.getProjectScores            → project_scores        → ✅ ROUTER EXISTE
                                  WHERE project_id                    ⚠️ 0 rows (sin datos hasta Sesión 08+)

12. Ver competidores           → developer.getCompetitors           → project_competitors   → ✅ EXISTE
                                  WHERE project_id                    FK: competitor_project_id → projects

13. Score badges en cards      → scores.getProjectScores            → project_scores        → ✅ EXISTE (vacío)
    (DMX Score, Absorption)

14. Broker alliance badge      → projects.broker_alliance           → projects              → ✅ EXISTE
                                  projects.broker_commission_pct       boolean + numeric
```

### GAPS M2:
```
SIN GAPS SIGNIFICATIVOS. El developer router (728 LOC, 13 procedures) cubre todo.
Los IE scores estarán vacíos hasta las sesiones 08+, pero la infraestructura existe.
El frontend mostrará placeholders "Score disponible pronto" con confidence='insufficient_data'.
```

---

# M3: CONTACTOS

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Lista contactos con filtros → asesorCRM.getContactos             → contactos             → ✅ EXISTE
   (temperatura, tipo, tags)     WHERE asesor_id=auth.uid()          5 RLS policies
                                 + filtros opcionales                 idx_contactos_asesor

2. Búsqueda FTS               → contactos.search_vector GIN         → contactos             → ✅ EXISTE
   (buscar por nombre/tel)       tRPC query con textSearch            idx_contactos_search

3. Ver detalle contacto        → asesorCRM.getContactoById          → contactos             → ✅ EXISTE
   (info personal)               first_name + last_name               ⚠️ NOT "nombre" — phones es jsonb NOT text
                                  phones jsonb[], emails jsonb[]

4. Cambiar temperatura         → asesorCRM.updateContacto           → contactos             → ✅ EXISTE
   (frio→tibio→caliente→cliente)  UPDATE temperatura                  CHECK: frio/tibio/caliente/cliente

5. Ver DISC Profile            → JOIN disc_profiles                 → disc_profiles          → ✅ EXISTE
   (D/I/S/C badge + tactics)     WHERE contact_id                    FK: disc_profiles.contact_id → contactos

6. Ver timeline                → actividad_timeline                 → actividad_timeline    → ✅ EXISTE
   (notas, llamadas, emails)     WHERE entity_id AND                  entity_type='contacto'
                                  entity_type='contacto'

7. Ver búsquedas vinculadas    → busquedas WHERE contacto_id        → busquedas             → ✅ EXISTE
                                  FK: busquedas.contacto_id

8. Ver operaciones del contacto → operaciones WHERE                 → operaciones           → ✅ EXISTE
                                   contacto_comprador_id              FK: operaciones.contacto_comprador_id

9. Crear contacto nuevo        → asesorCRM.createContacto           → contactos             → ✅ EXISTE
   (form con validaciones)       Trigger: check_duplicate_phone       trigger anti-duplicados
                                 Trigger: update_contactos_search     trigger FTS auto
                                 Trigger: xp_contacto_creado          trigger XP +10

10. Editar contacto            → asesorCRM.updateContacto           → contactos             → ✅ EXISTE

11. Poder compra verificado    → UPDATE contactos                   → contactos             → ✅ EXISTE
    (toggle + presupuesto)       poder_compra_verificado,             boolean + numeric
                                 presupuesto_max, ingreso_estimado

12. Tags management            → UPDATE contactos.tags              → contactos             → ✅ EXISTE
    (agregar/quitar tags)        text[] array                         tags text[]
```

### GAPS M3:
```
SIN GAPS. El frontend Dopamine usa los mismos campos que tiene la BD.
Recordar: phones y emails son jsonb arrays, NO text. El frontend debe parsearlos.
```

---

# M4: BÚSQUEDAS

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Pipeline Kanban 7 columnas  → asesorCRM.getBusquedas             → busquedas             → ✅ EXISTE
   (pendiente→...→ganada/perdida) WHERE asesor_id                    etapa CHECK 7 valores español ✅
                                  GROUP BY etapa                      idx_busquedas_etapa

2. Drag & drop cambiar etapa   → asesorCRM.updateBusquedaEtapa     → busquedas             → ✅ EXISTE
   (mover card entre columnas)   UPDATE etapa                        ⚠️ Validaciones por etapa (Pulppo style)
                                                                      → VERIFICAR: ¿el mutation actual valida?

3. Crear búsqueda nueva        → asesorCRM.createBusqueda          → busquedas             → ✅ EXISTE
   (form con criterios)          INSERT con contacto_id, criterios    22+ columnas
                                  FK: busquedas.contacto_id

4. Ver propiedades sugeridas   → match_busqueda_inventario(id)     → busqueda_propiedades  → ✅ EXISTE (función SQL)
   (matching engine)              + busqueda_propiedades               FK: busqueda_id + project_id
                                  estado: sugerida/compartida/etc

5. Compartir proyecto con      → INSERT busqueda_proyectos          → busqueda_proyectos   → ✅ EXISTE
   cliente                       estado='compartido'                  FK: busqueda_id + project_id + unidad_id

6. Programar visita            → INSERT visitas_programadas         → visitas_programadas   → ✅ EXISTE
   (desde detalle búsqueda)      FK: busqueda_id + project_id         22 columnas
                                  + contacto_id + asesor_id

7. Registrar feedback visita   → UPDATE visitas_programadas         → visitas_programadas   → ✅ EXISTE
   (post-visita form)            feedback_interest, feedback_objection  feedback_interest CHECK: hot/warm/cold/lost
                                  + INSERT interaction_feedback         Trigger: trg_feedback_cascade
                                                                       → Cascada: feedback_registered → B03, C04

8. Historial de precios        → busqueda_historial_precio          → busqueda_historial_precio → ✅ EXISTE
   (cambios de presupuesto)      WHERE busqueda_id                    campo CHECK: presupuesto_min/max/valor_estimado

9. Contactos vinculados        → busqueda_contactos                 → busqueda_contactos   → ✅ EXISTE
   (many-to-many)                WHERE busqueda_id                    FK: busqueda_id + contacto_id
                                  rol: principal/co_comprador/etc

10. Comparador de proyectos    → Multiple scores.getProjectScores   → project_scores        → ✅ ROUTER EXISTE
    (comparar 2-5 proyectos)     + projects details                   ⚠️ Datos vacíos hasta Sesión 08+

11. Filtros de pipeline        → WHERE prioridad, fuente, etc       → busquedas             → ✅ EXISTE
    (prioridad, fuente, zona)     prioridad CHECK: alta/media/baja

12. Métricas superiores        → Aggregation queries                → busquedas + operaciones → ✅ EXISTE
    ($ en pipeline, conversion)   COUNT + SUM grouped                  ⚠️ FALTA: tRPC query dedicado
                                                                       → CREAR: asesorCRM.getPipelineMetrics
```

### GAPS M4:
```
CREAR:
  - asesorCRM.getPipelineMetrics (query) — aggregation de pipeline
  
VERIFICAR:
  - Que updateBusquedaEtapa tenga validaciones por etapa (ej: no saltar de pendiente a cerrando)
```

---

# M5: CAPTACIONES

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Pipeline Kanban 7 columnas  → asesorCRM.getCaptaciones           → captaciones           → ✅ EXISTE
   (pendiente→...→captado/perdida) WHERE asesor_id                   etapa CHECK 7 valores español ✅

2. Crear captación rápida      → asesorCRM.createCaptacion          → captaciones           → ✅ EXISTE
   (dirección + tipo + precio)    INSERT con campos mínimos           21 columnas

3. Vincular contacto           → UPDATE captaciones.contacto_id     → captaciones           → ✅ EXISTE
                                  FK: captaciones.contacto_id

4. Vincular propiedad sec.     → INSERT propiedades_secundarias     → propiedades_secundarias → ✅ EXISTE
   (crear prop desde captación)   + UPDATE captaciones.propiedad_id   47 columnas
                                  FK: captaciones.propiedad_id

5. Solicitar ACM               → calculate_acm() o tRPC mutation   → acm_valuaciones       → ✅ FUNCIÓN EXISTE
   (valuación automática)         FK: captacion_id + propiedad_id     22 columnas
                                  + zona datos IE

6. Documentación status        → UPDATE propiedades_secundarias     → propiedades_secundarias → ✅ EXISTE
   (tracker de documentos)        documentacion_status                CHECK: sin_documentacion/.../contrato_firmado

7. Fotos de propiedad          → photos.uploadPropSec               → propiedades_secundarias_fotos → ✅ EXISTE
                                  Hook: usePropSecundariaPhotos        10 columnas

8. Cambiar etapa               → asesorCRM.updateCaptacionEtapa    → captaciones           → ✅ EXISTE
   (drag & drop o botón)         UPDATE etapa + validaciones          ⚠️ etapa='perdida' requiere motivo_perdida

9. Encuentros counter          → UPDATE captaciones                 → captaciones           → ✅ EXISTE
   (contar reuniones)            encuentros_count + ultimo_encuentro   integer + timestamptz
```

### GAPS M5:
```
SIN GAPS SIGNIFICATIVOS. Todo el backend de captaciones existe.
La única nota: cuando captaciones avanza a 'captado', la prop secundaria
debe pasar a estado='activo' — verificar que el mutation actual haga esto.
```

---

# M6: TAREAS

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Lista con filtros           → asesorCRM.getTareas                → tareas                → ✅ EXISTE
   (status, type, priority)      WHERE agent_id=auth.uid()            status CHECK: pending/in_progress/done/expired ✅

2. Filtro por tipo             → WHERE tareas.type=?                → tareas                → ⚠️ DISCREPANCIA
   Frontend: property/capture/    BD CHECK: propiedades/clientes/      → RESOLVER con STATUS_MAP
   search/client/lead             prospectos/general                    o AMPLIAR CHECK (pedir autorización)

3. Filtro por categoría        → WHERE tareas.categoria=?           → tareas                → ✅ EXISTE
   Frontend: proyecto/captación/   BD CHECK: proyecto/captacion/        ✅ Coinciden
   busqueda/cliente/lead           busqueda/cliente/lead

4. Completar tarea             → asesorCRM.completeTarea            → tareas                → ✅ EXISTE
   (marcar como done)            UPDATE status='done',                 completed_at timestamptz
                                  completed_at=now()

5. Crear tarea manual          → asesorCRM.createTarea              → tareas                → ✅ EXISTE
   (form con entidad, fecha)      INSERT con message, due_date,        create_auto_task() también disponible
                                  entity_id, entity_type

6. Tareas auto-generadas       → generate_auto_tasks(asesor_id)    → tareas                → ✅ FUNCIÓN EXISTE
   (badge "Auto" en UI)          auto_generated=true                   trigger_event text

7. Prioridad badge             → tareas.priority                    → tareas                → ✅ EXISTE
   (alta/media/baja con color)    CHECK: alta/media/baja               ✅ español en ambos

8. Link a entidad              → tareas.entity_id + entity_type    → tareas + entities     → ✅ EXISTE
   (click lleva al contacto/       redirect_to text (URL)              polimórfico
   propiedad/búsqueda)
```

### GAPS M6:
```
RESOLVER:
  - tareas.type: BD tiene propiedades/clientes/prospectos/general
    Frontend usa property/capture/search/client/lead
    OPCIÓN A: Ampliar CHECK + usar ambos (requiere ALTER → pedir autorización)
    OPCIÓN B: STATUS_MAP en frontend (sin tocar BD)
    → RECOMENDACIÓN: Opción B (no tocar BD)
```

---

# M8: OPERACIONES

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Lista operaciones           → asesorCRM.getOperaciones           → operaciones           → ✅ EXISTE
   (cards con status badge)      WHERE asesor_comprador_id OR          34 columnas
                                  asesor_vendedor_id

2. Status badge coloreado      → operaciones.status                 → operaciones           → ⚠️ DISCREPANCIA
   Frontend: offer/offer_blocked/  BD: propuesta/oferta_aceptada/      → STATUS_MAP obligatorio
   contract/closed/paying/cancelled escritura/cerrada/pagando/cancelada

3. Wizard Step 0: Tipo         → operaciones.side                   → operaciones           → ✅ EXISTE
   (ambos/comprador/vendedor)     CHECK: ambos/comprador/vendedor      ⚠️ Ignorar columna 'lado' (duplicada)

4. Wizard Step 1: Propiedad    → operaciones.project_id +           → operaciones           → ✅ EXISTE
   (seleccionar proyecto/unidad)   unidad_id OR                        FK: project_id → projects
                                   propiedad_secundaria_id              FK: unidad_id → unidades
                                                                        FK: propiedad_secundaria_id → propiedades_sec

5. Wizard Step 2: Comprador    → operaciones.contacto_comprador_id  → operaciones           → ✅ EXISTE
   (seleccionar contacto)         FK: contacto_comprador_id → contactos

6. Wizard Step 3: Valores      → operaciones.valor_reserva,         → operaciones           → ✅ EXISTE
   (reserva, promoción, cierre)   valor_promocion, valor_cierre,       4 campos numeric
                                  moneda CHECK: MXN/USD

7. Wizard Step 4: Comisiones   → Trigger: calculate_commission      → operaciones           → ✅ TRIGGER EXISTE
   (auto-calculadas)              comision_pct, comision_total,        Trigger BEFORE INSERT/UPDATE
                                  comision_inmobiliaria,                calcula automáticamente
                                  comision_plataforma, iva_amount

8. Wizard Step 5: Documentos   → INSERT operation_documents         → operation_documents   → ✅ EXISTE
   (checklist docs requeridos)    FK: operacion_id                    status CHECK: pendiente/.../rechazado
                                  document_type CHECK: 14 tipos

9. Wizard Step 6: Confirmar    → asesorCRM.createOperacion          → operaciones           → ✅ EXISTE
   (INSERT final)                 Trigger: generate_operation_code     → code auto-generated UNIQUE
                                  Trigger: generate_operation_documents → docs auto-created
                                  Trigger: webhooks_operaciones        → webhook disparado
                                  Trigger: xp_operacion_cerrada        → XP (si cerrada)

10. Timeline visual            → operation_timeline                  → operation_timeline    → ✅ EXISTE
    (stages con status)           WHERE operacion_id                   stage CHECK: interes/visita/.../entrega
                                  FK: operacion_id                     status CHECK: pending/in_progress/completed/skipped

11. Cobros / facturación       → commission_payments                → commission_payments   → ✅ EXISTE
    (tracking de pagos)           WHERE operation_id                   FK: operation_id → operaciones
                                  + operaciones.estado_cobro           + factura_emitida, factura_numero, factura_pdf_url
                                  + operaciones.comision_cobrada

12. Busqueda vinculada         → operaciones.busqueda_id            → operaciones           → ✅ EXISTE
    (link a búsqueda origen)      FK: busqueda_id → busquedas
```

### GAPS M8:
```
RESOLVER:
  - STATUS_MAP para operaciones.status (español→inglés y viceversa)
  - Columna 'lado' duplicada — el frontend IGNORA 'lado', usa solo 'side'
    No borrar 'lado' sin autorización

CREAR:
  - asesorCRM.createOperacion mutation con wizard 7 pasos
    (puede que el actual solo haga INSERT simple — verificar que maneje los 7 steps)
```

---

# M9: MARKETING

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. Galería fotos proyecto      → photos.getProjectPhotos            → fotos                 → ✅ EXISTE
                                  Hook: useProjectPhotos               22 columnas incl. AI classification

2. Upload fotos                → photos.uploadPhoto                 → fotos                 → ✅ EXISTE
   (drag & drop)                 Sharp → WebP → 3 variantes           API route: /api/photos/upload (170 LOC)

3. AI classification           → photos.classifyPhoto               → fotos                 → ✅ EXISTE
   (auto-categorizar)            ai_category, ai_confidence,           API route: /api/photos/classify (149 LOC)
                                 ai_tags, ai_description

4. Landing pages               → project_landing_pages              → project_landing_pages → ✅ EXISTE
   (crear/editar landings)       FK: project_id, created_by            config jsonb, slug, is_published
                                                                       ⚠️ FALTA: tRPC CRUD completo
                                                                       → CREAR: marketing.createLanding,
                                                                         marketing.updateLanding, marketing.getLandings

5. QR Codes                    → qr_codes                           → qr_codes             → ✅ EXISTE
   (generar QR para proyecto)    target_type: project/unit/etc         scan_count, last_scanned_at
                                                                       ⚠️ FALTA: tRPC CRUD
                                                                       → CREAR: marketing.createQR, marketing.getQRs

6. WhatsApp Templates          → whatsapp_templates                 → whatsapp_templates    → ✅ EXISTE
   (plantillas reutilizables)    WHERE asesor_id OR es_global=true     nombre, contenido, categoria
                                                                       ⚠️ FALTA: tRPC CRUD
                                                                       → CREAR: marketing.getTemplates,
                                                                         marketing.createTemplate

7. Compartir con cliente       → client_folders +                   → client_folders +      → ✅ EXISTE
   (carpetas de presentación)    client_folder_projects                client_folder_projects  FK: folder_id, project_id
                                                                       ⚠️ FALTA: tRPC CRUD
                                                                       → CREAR: marketing.createFolder,
                                                                         marketing.addProjectToFolder
```

### GAPS M9:
```
CREAR (tRPC router nuevo: marketing.ts):
  - marketing.createLanding / getLandings / updateLanding
  - marketing.createQR / getQRs
  - marketing.getTemplates / createTemplate / updateTemplate
  - marketing.createFolder / getFolders / addProjectToFolder

ALTERNATIVA: Agregar estas mutations al asesorCRM router existente
  → PEDIR AUTORIZACIÓN sobre dónde ponerlas (nuevo router vs existente)
```

---

# M10: ESTADÍSTICAS

## Acciones y Conexiones

```
ACCIÓN FRONTEND                → BACKEND                           → TABLA BD              → STATUS
──────────────────────────────────────────────────────────────────────────────────────────────────────

1. KPIs principales            → get_asesor_performance(id)         → Función SQL → jsonb   → ✅ EXISTE
   (contacts, visitas, ops)

2. KPI cards con período       → metricas_kpi                       → metricas_kpi          → ✅ EXISTE
   (weekly aggregates)            WHERE asesor_id                     17 columnas métricas
                                  + semana_inicio                      idx_metricas_asesor

3. Pipeline funnel             → busquedas GROUP BY etapa           → busquedas             → ✅ EXISTE
   (visualización embudo)         + conversion rates calculated        ⚠️ FALTA: query dedicada
                                                                       → CREAR: asesorCRM.getPipelineFunnel

4. Revenue chart               → operaciones WHERE status='cerrada' → operaciones           → ✅ EXISTE
   (Recharts por mes)            GROUP BY month                        SUM(comision_total)
                                  ORDER BY month                       ⚠️ FALTA: query dedicada
                                                                       → CREAR: asesorCRM.getRevenueByMonth

5. Actividad timeline          → actividad_timeline + events        → actividad_timeline    → ✅ EXISTE
   (chart de actividad)           GROUP BY day/week                    + events

6. Ranking                     → asesor_gamification                → asesor_gamification   → ✅ EXISTE
   (posición vs otros asesores)   monthly_rank + xp_this_month        gamification.getLeaderboard
                                                                       ⚠️ VERIFICAR: ¿existe query de leaderboard?

7. Comparativo mensual         → asesor_outcomes                    → asesor_outcomes       → ✅ EXISTE
   (mes actual vs anterior)       WHERE asesor_id                     leads_generados, visitas, ops, revenue
                                  GROUP BY mes                         UNIQUE(asesor_id, mes)

8. Exportar a Excel            → Client-side (xlsx library)         → N/A                   → ✅ EXISTE
   (botón descarga)              xlsx package instalado                No requiere backend
```

### GAPS M10:
```
CREAR:
  - asesorCRM.getPipelineFunnel (query)
  - asesorCRM.getRevenueByMonth (query)
  - Verificar si gamification tiene getLeaderboard
```

---

# RESUMEN TOTAL DE GAPS

## Mutations/Queries a CREAR (backend nuevo para Dopamine):

```
ROUTER asesorCRM (extender):
  □ createTimelineEntry (mutation) — para acción rápida "registrar llamada"
  □ scheduleVisit (mutation) — para acción rápida "programar visita"
  □ toggleAvailability (mutation) — toggle disponibilidad en header
  □ getUnreadNotifCount (query) — badge de notificaciones
  □ globalSearch (query) — command palette ⌘K
  □ getPipelineMetrics (query) — métricas superiores del Kanban
  □ getPipelineFunnel (query) — embudo para estadísticas
  □ getRevenueByMonth (query) — chart de revenue

ROUTER marketing.ts (NUEVO o extensión):
  □ createLanding / getLandings / updateLanding
  □ createQR / getQRs
  □ getTemplates / createTemplate / updateTemplate
  □ createFolder / getFolders / addProjectToFolder

TOTAL: ~16 procedures nuevos
```

## Backend que SE PRESERVA sin cambios:

```
✅ 110 tablas (no se borra ninguna)
✅ 64 funciones SQL (no se modifica ninguna)
✅ 36 triggers (no se toca ninguno)
✅ 9 cascadas (ya conectadas)
✅ 107 scores en registry (se van llenando en sesiones 07+)
✅ 19 cron jobs (siguen corriendo)
✅ 9 tRPC routers funcionales (se EXTIENDEN, no se reescriben)
✅ 12 hooks existentes (se reusan donde aplique)
✅ 24 IE components (se remontan en el nuevo layout Dopamine)
```

## Lo que hay que hacer con STATUS_MAP:

```
lib/constants/status-maps.ts (NUEVO archivo):
  - OP_STATUS_MAP: offer↔propuesta, offer_blocked↔oferta_aceptada, etc.
  - TASK_TYPE_MAP: property↔propiedades, client↔clientes, etc.
  - Ambos sentidos: frontend→BD y BD→frontend
  - Cada componente Dopamine importa el MAP y traduce antes de enviar/recibir
```

## Las 77 pages actuales:

```
SE REEMPLAZAN por los 10 módulos Dopamine.
Los archivos de pages actuales en app/(asesor)/ (30 pages) se borran
  cuando los módulos Dopamine están implementados y verificados.
Los archivos en app/(desarrollador)/ (13 pages) se mantienen hasta que
  se implemente el portal Desarrollador Dopamine (Sesión 14).
Los archivos en app/(admin)/ (20 pages) se mantienen hasta Sesión 19.
Los archivos en app/(public)/ (10 pages) se mantienen hasta Sesión 18.

REGLA: No borrar page actual hasta que su reemplazo Dopamine esté
       funcionando, verificado visualmente, y commiteado con build limpio.
```
