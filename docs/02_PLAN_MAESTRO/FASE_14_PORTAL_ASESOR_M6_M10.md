# FASE 14 — Portal Asesor (M06 Tareas + M07 Operaciones + M08 Marketing + M09 Estadísticas)

> **Duración estimada:** 6 sesiones Claude Code (~24 horas con agentes paralelos)
> **Dependencias:** FASE 13 (M01-M05 + layout asesor + STATUS_MAP), FASE 08-10 (IE N0-N3), FASE 11 XL (15 índices DMX + moonshots + seeds implementados — Trend Genome, Scorecard, Pulse), FASE 12 (N5 AI + Mapa 12 capas + LifePath v1), FASE 04 (DS)
> **Bloqueantes externos:**
> - Facturapi.io cuenta activa con credenciales (para CFDI 4.0 en M07).
> - Mifiel cuenta (firma electrónica NOM-151) — trial o prod.
> - Integración calendario Google/Outlook/Apple configurada (FASE 03 AI shell ya wireó OAuth).
> - WhatsApp Cloud API token activo (para M08 templates).
> - Recharts instalado + `shared/ui/charts/*` primitives (FASE 04).
> - Spec visual: `docs/referencias-ui/M6_Tareas.tsx` a `M9_Estadisticas.tsx`.
> **Resultado esperado:** M06 Tareas con date picker absoluto + prioridad en creación + calendario integration. M07 Operaciones con wizard 6 pasos, split comisión 20% EXPLÍCITO, STATUS_MAP completo, RFC+CFDI+Mifiel NOM-151 como diferenciador, módulo Legal separado `/legal`. M08 Marketing con landings+QR+WA templates+client folders+auto-gen piezas+clasificación AI fotos+`marketing_portales` publicación. M09 Estadísticas 2 superficies (página + slide-over) con pedagogía integrada. Gamification widgets M01+M09 (streaks, XP, leaderboards, badges). Discover Weekly + Wrapped en M01. Tag `fase-14-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Cierra los 9 módulos del portal asesor (M10 Dashboard Developer queda en FASE 15 Portal Desarrollador). Este bloque entrega el flow comercial completo: tareas operativas, operaciones con compliance fiscal/legal mexicano, marketing auto-generado, estadísticas con pedagogía.

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-28 | Sequence Engine (Apollo/Outreach pattern) | Multi-channel automation (WA+email+SMS+call) con branching por response | Módulo 14.A.5 (nuevo) |
| GC-29 | Intent Signals (6sense/Bombora pattern) | Detecta hot leads por behavior y los sube en priority queue | Módulo 14.B.6 (nuevo) |
| GC-30 | AI Dialer + AI Scribe | Click-to-call + transcripción + extracción next actions | Módulo 14.B.7 (nuevo) |
| GC-35 | Multi-channel blast | WA+email+SMS simultáneo con personalización por contacto | Módulo 14.C.5 (nuevo, dentro Marketing) |
| GC-42 | QR Check-in visita | QR único por visita; asesor+comprador scan para trackear asistencia real | Módulo 14.B.8 (nuevo) |
| GC-52 | Cross-sell Detector | Surface upsell opportunities (inversor compró → otras props similares) | Módulo 14.B.9 (nuevo) |
| GC-56 | Commission Forecast | Forecast 3-6 meses basado en pipeline probabilístico | Módulo 14.D.5 (nuevo) |
| GC-39 | Offline visits + voice notes post-visita | PWA offline capture + voice note transcribed + auto-fill feedback | Módulo 14.B.10 (nuevo) |

Crítico:
- M07 es el módulo más complejo por las flows financieros MX (comisión+IVA+split invisible-ya-no, CFDI, Mifiel) — es donde DMX supera a Pulppo.
- STATUS_MAP operaciones (DISC-01 resuelto desde rewrite): offer↔propuesta, offer_blocked↔oferta_aceptada, contract↔escritura, closed↔cerrada, paying↔pagando, cancelled↔cancelada.
- Spec visual pixel-perfect de `docs/referencias-ui/M6-M9_*.tsx`.

## Bloques

### BLOQUE 14.A — M06 Tareas

#### MÓDULO 14.A.1 — Ruta + 3 columnas visuales

**Pasos:**
- `[14.A.1.1]` `app/(asesor)/tareas/page.tsx`. 3 columnas visuales: **Propiedades** (agrupa tipos `property` + `capture`), **Clientes** (`search` + `client`), **Prospectos** (`lead`) + columna "General" toggleable.
- `[14.A.1.2]` Mapping BD↔FE via `TASK_TYPE_MAP` (FASE 13 status-maps). Opción B (no tocar BD CHECK) — siempre se lee/escribe español en BD.
- `[14.A.1.3]` Sort: `status=expired` primero, `pending` después, `done` al final. Tareas vencidas con borde rojo pulsante.
- `[14.A.1.4]` Tint slate. Card3D.

**Criterio de done del módulo:**
- [ ] Crear tarea tipo 'property' en FE → BD persiste 'propiedades'.
- [ ] Tareas expired aparecen primero + badge rojo.

#### MÓDULO 14.A.2 — Date picker absoluto + prioridad creación

**Pasos:**
- `[14.A.2.1]` `NewTaskModal` con:
  - Selector entidad (tab Propiedad|Contacto|Búsqueda|Captación|General) → autocomplete picker.
  - Detalle tarea (4 tipos fijos): "Contactar propietario", "Organizar visita", "Organizar captación", "Pedir devolución de visita", + "Otra" con texto libre.
  - **Fecha vencimiento: date picker absoluto** (calendar widget; NO solo relativos como Pulppo). Opciones rápidas "Hoy", "Mañana", "+7d" pero también fecha específica.
  - **Prioridad en creación**: alta/media/baja (chip selector; no solo filtro post-creación como Pulppo).
- `[14.A.2.2]` Form react-hook-form + Zod schema `CreateTaskSchema` con `due_date: z.string().datetime()`, `priority: z.enum(['alta','media','baja'])`.

**Criterio de done del módulo:**
- [ ] Crear tarea con fecha 2026-05-15 15:00 → persiste correctamente.
- [ ] Prioridad "alta" agrega flag rojo a card.

#### MÓDULO 14.A.3 — Calendario integration + widget Dashboard

**Pasos:**
- `[14.A.3.1]` Integrar tareas con calendario interno: página `/tareas?view=calendar` con vista mes/semana/día (usa `react-big-calendar` con Dopamine theme).
- `[14.A.3.2]` Sync bidireccional a Google Calendar (OAuth del perfil): crear tarea con due_date → evento calendar; editar evento en Google → webhook actualiza BD.
- `[14.A.3.3]` Widget "Tareas del día" en M01 Dashboard: lista top 5 tareas de hoy + CTA "Ver todas".

**Criterio de done del módulo:**
- [ ] Tarea creada aparece en Google Calendar en <30s.
- [ ] Widget Dashboard refresca realtime.

#### MÓDULO 14.A.4 — Control acceso managers + tRPC

**Pasos:**
- `[14.A.4.1]` Asesores ven solo sus tareas. Managers con `permissions.tasks.view_team=true` ven tareas de todo el equipo (`get_visible_asesor_ids()`).
- `[14.A.4.2]` tRPC procedures: `tareas.list`, `tareas.create`, `tareas.update`, `tareas.complete`, `tareas.postpone`. Usa `asesorProcedure` middleware (valida is_active).
- `[14.A.4.3]` Cron `expire_overdue_tasks` diario 05:00 marca tareas vencidas no completadas como `status='expired'`.

**Criterio de done del módulo:**
- [ ] Manager ve tareas de todos sus asesores.
- [ ] Cron corre y marca vencidas.

#### MÓDULO 14.A.5 — Sequence Engine (GC-28 Apollo/Outreach pattern)

**Pasos:**
- `[14.A.5.1]` Tabla `sequence_templates` (id, name, owner_id, steps jsonb) y `sequence_runs` (id, contact_id, template_id, status, current_step, started_at, stopped_at, stop_reason).
- `[14.A.5.2]` UI `/asesor/sequences` canvas visual: nodes `Message (channel: wa/email/sms/task)` + `Wait N hours/days` + `Branch (if response = yes/no/timeout)`.
- `[14.A.5.3]` Worker `sequence_runner` cada 5min avanza steps; si contacto responde (via WA webhook FASE 22 o email open/click) → marca `responded_at` y dispara branch `yes`.
- `[14.A.5.4]` Stop conditions automáticas: contact opt-out, operation created, visit scheduled.
- `[14.A.5.5]` Feature gated `feature.sequence_engine` (starter 3 active seqs, pro 20, enterprise ilimitado).

**Criterio de done del módulo:**
- [ ] Secuencia 3 pasos ejecuta correctamente con branching.
- [ ] Stop on response verificado.

### BLOQUE 14.B — M07 Operaciones (wizard 6 pasos)

#### MÓDULO 14.B.1 — Ruta + tabla operaciones

**Pasos:**
- `[14.B.1.1]` `app/(asesor)/operaciones/page.tsx` con tabla: código_único (`98A-ACOS-ACOS` formato), fecha_creación, status (en español visible, mapeado por STATUS_MAP), valor_cierre, comisión_neta, fecha_cierre_estimada.
- `[14.B.1.2]` Filtros: status, side (both/seller/buyer), mes, asesor_productor.
- `[14.B.1.3]` Tint mint (#EDFAF5). Card3D per operación.

**Criterio de done del módulo:**
- [ ] Tabla 50 ops virtualizada.
- [ ] Click → detalle operación.

#### MÓDULO 14.B.2 — Wizard 6 pasos

**Pasos:**
- `[14.B.2.1]` `NewOperationWizard` componente stepper con 6 pasos:
  1. **Operación** — side picker con descripciones:
     - **AMBOS LADOS** (asesor representa comprador y vendedor).
     - **LADO VENDEDOR** (co-broke: otra inmobiliaria trae comprador).
     - **LADO COMPRADOR** (co-broke: otra inmobiliaria tiene propiedad).
  2. **Comprador** — asesor productor/vendedor team picker + contacto comprador picker.
  3. **Vendedor** — propiedad browser (buscar proyecto interno) + propietario picker + campo "Pegar liga" EasyBroker/Mercadolibre/Inmuebles24 → al pegar, server action extrae título/precio/ubicación/fotos vía scraping y auto-llena campos.
  4. **Estado** — inicial "Propuesta" + fecha_cierre auto +10 días (editable) + valores reserva/promoción/cierre con moneda MXN/USD.
  5. **Comisión** — % default 4% configurable, **IVA 16% auto** sobre el %: "4% → 4.64%" con explicación. **Split plataforma 20% EXPLÍCITO** en recibido (diferencia vs Pulppo que lo oculta): UI muestra "Comisión inmobiliaria 80%: $X — Split plataforma 20%: $Y — Total: $Z". Checkbox declaración jurada OBLIGATORIO para submit.
  6. **Notas** — textarea libre + attachments opcional (PDF/JPG ≤10MB).
- `[14.B.2.2]` Al submit: crea operación con `status='propuesta'` (mapStatus fe2be), `codigo_unico=generate_operation_code()`, `auto_tasks=generate_operation_documents(op_id)`.

**Criterio de done del módulo:**
- [ ] Wizard completo 6 pasos fluye sin errores.
- [ ] Pegar liga ML extrae datos correctamente.
- [ ] UI muestra split 20% claramente.

#### MÓDULO 14.B.3 — STATUS_MAP + ciclo cobro

**Pasos:**
- `[14.B.3.1]` Todos los botones de cambio estado (Avanzar a Oferta Aceptada / Escritura / Cerrada / Pagando) usan `mapStatus('fe2be','operacion', ...)` antes de llamar BD.
- `[14.B.3.2]` Validación avance: no puede saltar de 'propuesta' a 'cerrada' sin pasar por 'oferta_aceptada'+'escritura'. Trigger BD enforces + UI preview siguiente estado válido.
- `[14.B.3.3]` Ciclo cobro separado (`commission_payments`): status inicial `pending` → `paid` (parcial) → `closed` (íntegro) → `expired`. Vista `/operaciones/[id]/cobros` con tabla pagos parciales + facturación CFDI.

**Criterio de done del módulo:**
- [ ] Intentar saltar estados → toast error + no modifica BD.
- [ ] Ciclo cobro refleja payments parciales.

#### MÓDULO 14.B.4 — RFC + CFDI 4.0 + fiscalidad MX (Facturapi)

**Pasos:**
- `[14.B.4.1]` Al registrar pago comisión → form fiscal: RFC emisor, receptor, régimen_fiscal (CHECK SAT 14 opciones), uso_cfdi, método_pago (PUE/PPD), forma_pago.
- `[14.B.4.2]` Llamada Facturapi `/invoices/create` con stamp SAT. Devuelve UUID CFDI + XML + PDF. Persistir en `operation_documents` tipo='cfdi'.
- `[14.B.4.3]` Validaciones Zod: RFC regex `^[A-Z&Ñ]{3,4}\d{6}[A-V1-9][A-Z\d]{2}$`, monto con 2 decimales, tasa_iva=16 (MX) default.
- `[14.B.4.4]` Error handling SAT: si stamp falla, guardar en status `draft_error` + permitir retry manual.

**Criterio de done del módulo:**
- [ ] CFDI stamp con datos test SAT sandbox.
- [ ] PDF descargable.

#### MÓDULO 14.B.5 — Módulo Legal `/legal` (Mifiel NOM-151)

**Pasos:**
- `[14.B.5.1]` `app/(asesor)/legal/page.tsx` separado de Operaciones. Flow documentos: **No subido** → **En revisión** → **Aprobado** | **Rechazado** → **Contrato enviado** → **Contrato firmado**.
- `[14.B.5.2]` Upload documento (escritura, identificación, poder, etc.) → `operation_documents` + trigger AI extraction (FASE 17 stub en H1).
- `[14.B.5.3]` Integración Mifiel: al pasar a "Contrato enviado" llama API Mifiel `/documents` con PDF + firmantes. Recibe webhook cuando todos firman → status='firmado' + NOM-151 evidence almacenado.
- `[14.B.5.4]` Diferenciador MX: UI muestra badge "NOM-151 compliant" — nadie más lo tiene (Pulppo usa PDF sin firma electrónica válida).
- `[14.B.5.5]` Operación `status='escritura'` se activa solo cuando Legal marca `contrato_firmado=true`.

**Criterio de done del módulo:**
- [ ] Flow completo Mifiel con firmantes.
- [ ] Badge NOM-151 visible.

#### MÓDULO 14.B.6 — Intent Signals hot leads (GC-29)

**Pasos:**
- `[14.B.6.1]` Service `features/operaciones/lib/intent-signals.ts` computa `intent_score` 0-100 por contacto usando señales:
  - Email opens/clicks 7d (+5 per open, +15 per click).
  - Landing visits 7d (+20 per visit).
  - Wishlist adds 14d (+10 per add).
  - Chat replies <1h (+30).
  - Form submit property detail (+40).
- `[14.B.6.2]` Tabla `intent_signals_log` audit trail + cron rollup horario a `contactos.intent_score` + `intent_tier` (cold/warm/hot/burning).
- `[14.B.6.3]` Widget M01 Dashboard "Hot Leads" priority queue (top 10 por intent_score >70).
- `[14.B.6.4]` Trigger notif tipo `new_hot_lead` cuando contacto cruza threshold 70 → asesor asignado.

**Criterio de done del módulo:**
- [ ] Contacto simulado 3 opens + 1 click → intent_score ≥20.
- [ ] Widget top 10 ordenado correctamente.

#### MÓDULO 14.B.7 — AI Dialer + AI Scribe (GC-30)

**Pasos:**
- `[14.B.7.1]` Integración Twilio Voice (FASE 22 Twilio base) + widget click-to-call en ficha contacto/operación.
- `[14.B.7.2]` Llamada se graba (con consent disclaimer recorded) → post-call upload a Storage `call-recordings/` (cifrado).
- `[14.B.7.3]` Worker `call_transcription_worker` usa Whisper (OpenAI) para ES-MX transcript → guarda en `calls` tabla (id, operation_id, contact_id, recording_url, transcript, duration_s, status).
- `[14.B.7.4]` AI Scribe: Claude Sonnet analiza transcript → extrae `{ next_actions[], key_objections[], sentiment, summary, suggested_tasks[] }` → crea tareas sugeridas (user aprueba).
- `[14.B.7.5]` Feature gated `feature.ai_dialer` (pro+, cost tracked per minuto grabación).

**Criterio de done del módulo:**
- [ ] Llamada test graba + transcribe en <2min post-call.
- [ ] Scribe genera ≥1 next action coherente.

#### MÓDULO 14.B.8 — QR Check-in visita (GC-42)

**Pasos:**
- `[14.B.8.1]` Al crear `visitas_programadas` → sistema genera `visit_qr_token` único (JWT 24h vida). URL `dmx.to/v/<token>`.
- `[14.B.8.2]` Scan QR (asesor Y comprador) desde mobile → endpoint `/api/visit/checkin` registra geolocation + timestamp + user_id. Marca `visitas_programadas.arrived_at`.
- `[14.B.8.3]` Si ambos scans dentro de 15min y geolocations match (±200m del proyecto) → `status='confirmed_arrival'`.
- `[14.B.8.4]` No-show detection: si visit time +30min sin check-in → trigger notif asesor + contador de no-shows en contacto.

**Criterio de done del módulo:**
- [ ] QR scan ambos flancos → arrived_at registrado.
- [ ] No-show dispara notif.

#### MÓDULO 14.B.9 — Cross-sell Detector (GC-52)

**Pasos:**
- `[14.B.9.1]` Cron `cross_sell_detector_daily` analiza contactos post-compra:
  - Inversor compró departamento → sugerir 2ª unidad misma zona / proyecto hermano.
  - Familia compró primera casa → sugerir seguro hogar (partner).
  - Dev con 3 proyectos exitosos → sugerir feasibility para zona nueva.
- `[14.B.9.2]` Output: `cross_sell_opportunities` tabla (contact_id, type, rationale, expires_at, acted_on).
- `[14.B.9.3]` Widget M07 Operaciones "Cross-sell oportunidades" top 5.

**Criterio de done del módulo:**
- [ ] Op cerrada inversor → oportunidad 2ª unidad creada.
- [ ] Widget muestra rationale legible.

#### MÓDULO 14.B.10 — Offline visits + voice notes post-visita (GC-39)

**Pasos:**
- `[14.B.10.1]` PWA (FASE 25 base) soporta flujo offline: asesor en visita sin señal captura fotos + nota de voz en Service Worker IndexedDB.
- `[14.B.10.2]` Componente mobile `<VoiceNotePostVisit>`: record (max 5 min) → al volver online, sube blob + llama `/api/voice-notes/transcribe` (Whisper).
- `[14.B.10.3]` Transcript + Claude Haiku analiza → auto-llena `interaction_feedback` (rating 1-5, tags, texto limpio, objeciones, interest_level).
- `[14.B.10.4]` Timeline contacto incluye nota + audio player + transcript.
- `[14.B.10.5]` Sync queue visible en UI con status "Pendiente de sync".

**Criterio de done del módulo:**
- [ ] Voice note offline → sync + transcribe al reconectar.
- [ ] Feedback form auto-llenado editable.

### BLOQUE 14.C — M08 Marketing

#### MÓDULO 14.C.1 — Landing pages + QR + templates WhatsApp + folders

**Pasos:**
- `[14.C.1.1]` `app/(asesor)/marketing/page.tsx` con 4 sub-tabs: Landings, QR Codes, WhatsApp Templates, Client Folders.
- `[14.C.1.2]` **Landings**: CRUD landing pages por proyecto con tema Dopamine light + datos proyecto + ficha pública con scores IE. URL `dmx.mx/l/[slug]`.
- `[14.C.1.3]` **QR codes**: generador con `qrcode` lib, slug único, tracking `qr_codes.scan_count` via `/r/[slug]` redirect.
- `[14.C.1.4]` **WhatsApp templates**: CRUD templates con variables ({nombre}, {proyecto}, {precio}). Aprobar en Meta Business Manager (OAuth) antes de enviar.
- `[14.C.1.5]` **Client Folders**: carpetas de proyectos por contacto compartibles (tipo Notion). `client_folders` + `client_folder_projects`. Share link con expiración.

**Criterio de done del módulo:**
- [ ] 4 CRUDs funcionales.
- [ ] QR scan incrementa counter.

#### MÓDULO 14.C.2 — Auto-generación piezas marketing

**Pasos:**
- `[14.C.2.1]` Botón "Generar assets" por proyecto llama API que crea:
  - PostCuadrado (1080x1080) — pieza Instagram
  - PostLargo (1080x1350) — feed vertical
  - Story (1080x1920) — Stories IG/FB/WA (TTL 24h)
  - VideoStory (1080x1920, ≤15s, mp4) — template slides
  - Video (1920x1080, ≤30s) — YouTube short
- `[14.C.2.2]` Usa Sharp para imágenes (composite foto proyecto + logo DMX + texto + precio + DMX Score + **badges de los 15 índices DMX licenciables** FASE 11 XL — seeds implementados). El asesor selecciona en el wizard qué índices destacar (e.g., MOM 84/100, YNG 72/100, LIV 88/100). Estos badges son parte del pitch comercial y validan que el asesor tiene acceso a data propietaria DMX.
- `[14.C.2.3]` Templates en `shared/lib/marketing/templates/*` — cada uno con slots para 2-4 badges índices y logo pequeño "Powered by DMX Indices".
- `[14.C.2.4]` Status `ready` | `generating` | `failed`. Persistidos en `fotos` con tag `marketing_asset`.

**Criterio de done del módulo:**
- [ ] 5 piezas generadas en <30s.
- [ ] Story con DMX Score visible.
- [ ] Badges índices DMX visibles y legibles en todas las piezas.

#### MÓDULO 14.C.3 — Fotos: upload + clasificación AI

**Pasos:**
- `[14.C.3.1]` Upload route `/api/photos/upload` ya existe (FASE 17 mejora). En H1 usa GPT-4o Vision para clasificar: exterior/fachada/sala/cocina/recámara/baño/amenidad/plano.
- `[14.C.3.2]` `/api/photos/classify` batch para proyecto: itera fotos sin tag, clasifica, persiste en `fotos.tipo`.
- `[14.C.3.3]` UI muestra fotos agrupadas por tipo.

**Criterio de done del módulo:**
- [ ] 20 fotos clasificadas en <60s con precisión ≥85%.

#### MÓDULO 14.C.4 — Marketing portales (publicación cross-portal)

**Pasos:**
- `[14.C.4.1]` Tabla `marketing_portales` (ya creada v5.1-S3) con `(captacion_id, portal, status, external_id, published_at, error)`. Portales soportados: inmuebles24, mercadolibre, vivanuncios, icasas, propiedades_com.
- `[14.C.4.2]` CTA en M08 "Publicar a portales" → selector multi-portal → queue job publicación. Worker llama API cada portal (requiere credenciales por asesor en `profile_integrations`). Status polling cada 60s.
- `[14.C.4.3]` Al publicar, persistir `external_id` para eventual actualización/baja.

**Criterio de done del módulo:**
- [ ] Publicar a Inmuebles24 con credencial asesor → success en <2 min.

#### MÓDULO 14.C.5 — Multi-channel blast (GC-35)

**Pasos:**
- `[14.C.5.1]` UI `/marketing/blast` wizard: Paso 1 segmento (filtros sobre `contactos`), Paso 2 canales (WA + email + SMS checkboxes), Paso 3 mensaje por canal (WA template / email React Email / SMS 160char) con variables `{first_name}`, `{zone}`, `{project}`, `{ie_score}`.
- `[14.C.5.2]` Preview por canal + estimación alcance + costo (WA $0.005/msg, SMS $0.045/msg, email $0).
- `[14.C.5.3]` Send respeta opt-out, quiet hours (FASE 22), rate limits Meta/Twilio, y feature cap `feature.blast_max_contacts_month` (starter 100, pro 1000, enterprise ilimitado).
- `[14.C.5.4]` Tracking: `blast_campaigns` tabla con métricas opens/clicks/replies per channel.

**Criterio de done del módulo:**
- [ ] Blast a 10 contactos test llega por 3 canales.
- [ ] Metrics visibles <5min.

### BLOQUE 14.D — M09 Estadísticas (2 superficies + pedagogía)

#### MÓDULO 14.D.1 — Página completa `/stats`

**Pasos:**
- `[14.D.1.1]` `app/(asesor)/estadisticas/page.tsx` con layout 2 filas:
  - **Fila 1**: Calidad Atención (2 KPIs semaforizados): T. 1ª respuesta vs SLA 3600s (60min), T. respuesta promedio vs SLA 7200s (120min).
  - **Fila 2**: 9 KPIs Métricas Operaciones: consultas_totales, consultas_recibidas, consultas_atendidas, busquedas_activas, oportunidades_interesado, ACMs_generados, propiedades_activas, oportunidades_propietario, visitas_agendadas.
- `[14.D.1.2]` **4 gráficas Recharts** debajo:
  1. Evolución mensual consultas (línea 12m).
  2. Funnel pipeline (Bar Chart: leads→visitas→ofertas→ops).
  3. Revenue mensual (Area Chart 12m).
  4. Distribución búsquedas por etapa (Pie Chart 7 etapas).
- `[14.D.1.3]` Tint lavender. Card3D para KPIs.

**Criterio de done del módulo:**
- [ ] 11 KPIs + 4 charts render con data real.
- [ ] Semáforos correctos según umbrales Pulppo adaptados.

#### MÓDULO 14.D.2 — Slide-over `?metrics=true` (11 KPIs semáforo)

**Pasos:**
- `[14.D.2.1]` Al click en cualquier KPI del Dashboard M01 → abre slide-over lateral con los 11 KPIs en layout vertical, cada uno con semáforo + trend.
- `[14.D.2.2]` Cerrable con Esc + fondo oscurecido.

**Criterio de done del módulo:**
- [ ] Slide-over abre en <200ms.

#### MÓDULO 14.D.3 — Pedagogía por KPI (sub-drawer 4 secciones)

**Pasos:**
- `[14.D.3.1]` Cada KPI con icono "?" que abre sub-drawer con 4 secciones:
  1. **¿Qué mide?** (definición + fórmula).
  2. **¿Por qué importa?** (impacto en comisión/pipeline).
  3. **Consejos** (3 tips accionables para mejorar).
  4. **¿Cómo evoluciona?** (gráfica 12m del KPI específico).
- `[14.D.3.2]` Textos en `messages/es-MX.json` clave `stats.pedagogia.[kpi].{que_mide,por_que,consejos,evolucion}`.

**Criterio de done del módulo:**
- [ ] Los 11 KPIs tienen pedagogía completa.

#### MÓDULO 14.D.4 — Selector fechas flexible + filtros + comparativa equipo

**Pasos:**
- `[14.D.4.1]` Date range picker: Hoy, Ayer, Últimos 7 días, Últimos 30 días, Este mes, Mes pasado, Custom (2 pickers).
- `[14.D.4.2]` Filtros: por colonia (multi-select), por producto/tipo_propiedad, por canal (fuente_contacto).
- `[14.D.4.3]` Comparativa vs equipo: toggle "Ver vs promedio equipo" → overlay sobre cada KPI con barra benchmark (requiere manager permission o self-opt-in).

**Criterio de done del módulo:**
- [ ] Cambiar rango fechas actualiza KPIs sin full page reload.
- [ ] Comparativa equipo respeta RLS (solo permissions.stats.view_team).

#### MÓDULO 14.D.4.5 — Dashboard "Zonas trending" (Trend Genome — FASE 11 XL seeds implementados)

**Pasos:**
- `[14.D.4.5.1]` Sub-tab nueva en M09 Estadísticas: "Zonas trending" alimentada por `zone_alpha_alerts` + `zone_pulse_scores` + Trend Genome (FASE 11 XL SEEDs).
- `[14.D.4.5.2]` Vista: lista top 20 colonias con mayor momentum/pulse en últimos 30d, con columna delta vs. baseline, tier (alpha/emerging/mainstream/declining), trigger (e.g., "influencer_wave_nightlife_2026-04"), y CTA "Ver detalle Genome".
- `[14.D.4.5.3]` Filtros: tipo alert (price_alpha/social_alpha/trend_alpha), alcaldía, ventana temporal (7d/30d/90d).
- `[14.D.4.5.4]` Click en zona → drawer con timeline events + charts pulse + acciones sugeridas para asesor ("captar en esta zona pronto antes que suba 8-12%").
- `[14.D.4.5.5]` Feature gated `feature.trend_genome_dashboard` (Starter+).

**Criterio de done del módulo:**
- [ ] Dashboard renderiza top 20 zonas con data real FASE 11 XL.
- [ ] Drawer detalle completo en <800ms.

#### MÓDULO 14.D.5 — Commission Forecast 3-6 meses (GC-56)

**Pasos:**
- `[14.D.5.1]` Service `features/estadisticas/lib/commission-forecast.ts`: por cada `busqueda`/`operacion` abierta calcula `expected_value = valor_estimado × comision_pct × probability(etapa)` donde probability viene de histórico asesor:
  - propuesta 20%, oferta_aceptada 55%, escritura 85%, pagando 95%.
- `[14.D.5.2]` Agregación por mes próximos 6 (basado en `fecha_cierre_estimada`).
- `[14.D.5.3]` UI `/estadisticas?tab=forecast` con chart barras apiladas (confirmed + probable + stretch) + tabla desglosada.
- `[14.D.5.4]` Escenarios: optimista (prob×1.3), base, pesimista (prob×0.7). Toggle.
- `[14.D.5.5]` Export PDF para compartir con manager / planeación personal.

**Criterio de done del módulo:**
- [ ] Forecast 6m renderiza coherente con pipeline real.
- [ ] Escenarios alternables sin reload.

### BLOQUE 14.E — Gamification + Discover Weekly + Wrapped (M01+M09)

#### MÓDULO 14.E.1 — GamificationWidget M01 Dashboard

**Pasos:**
- `[14.E.1.1]` Componente `shared/ui/gamification/GamificationWidget.tsx` consume `asesorCRM.getGamification(userId)`.
- `[14.E.1.2]` Shows: current_streak (🔥 icon), xp_total + nivel (1-10), monthly_rank (position en liga Bronce/Plata/Oro/Diamante), last 3 badges con icon.
- `[14.E.1.3]` Next-level progress bar (XP faltante).
- `[14.E.1.4]` Leaderboard mensual (top 10 asesores zona) drawer por CTA.

**Criterio de done del módulo:**
- [ ] Widget realtime via Supabase Realtime.
- [ ] Leaderboard filtra por alcaldía por defecto.

#### MÓDULO 14.E.2 — Streaks, XP, badges lógica

**Pasos:**
- `[14.E.2.1]` Triggers BD (FASE 01) ya suman XP: contacto +10, visita +25, operacion_cerrada +500. Verificar activos.
- `[14.E.2.2]` Streaks: cron `gamification-daily` (ya activo v5.1) revisa si responde leads <60min promedio → si sí, incrementa streak; si no, resetea. Monthly reset día 1 a las 00:00.
- `[14.E.2.3]` Badges desbloqueados: "Experto Nápoles" (>10 ventas colonia), "Respuesta Rayo" (SLA <15min 30 días), "Pipeline Maestro" (>$10M activo), "Multi-canal" (cierres en 3+ canales).
- `[14.E.2.4]` Notificación tipo 17 "Badge desbloqueado" (FASE 22 inject).

**Criterio de done del módulo:**
- [ ] Cerrar operación +500 XP visible en <30s.
- [ ] Badge "Respuesta Rayo" desbloquea tras 30d SLA cumplido.

#### MÓDULO 14.E.3 — Discover Weekly + Wrapped M01

**Pasos:**
- `[14.E.3.1]` Cron `discover_weekly_generate` lunes 8am: para cada asesor activo, corre C03 matching × búsquedas activas top → genera `ai_generated_content.type='discover_weekly'` con 3 proyectos + narrativa.
- `[14.E.3.2]` Widget "Discover Weekly" en M01 Dashboard: 3 cards proyectos + CTA "Ver detalle" + "Compartir con cliente" (selecciona contacto para cada match).
- `[14.E.3.3]` Wrapped anual (FASE 11 ya lo genera): tile especial 1-15 enero "Tu año DMX 2025" con stats personalizadas.

**Criterio de done del módulo:**
- [ ] Lunes 8:05am Discover Weekly visible.
- [ ] Compartir match crea busqueda_proyectos entry.

### BLOQUE 14.F — Tests + feature flags + polishing

#### MÓDULO 14.F.1 — E2E Playwright M06-M09

**Pasos:**
- `[14.F.1.1]` 4 specs: `tareas.spec`, `operaciones.spec`, `marketing.spec`, `estadisticas.spec`.
- `[14.F.1.2]` `operaciones.spec` cubre: wizard 6 pasos, STATUS_MAP roundtrip, CFDI stamp mock, Mifiel flow mock.

**Criterio de done del módulo:**
- [ ] 4/4 specs green 2 runs.

#### MÓDULO 14.F.2 — Feature flags granulares

**Pasos:**
- `[14.F.2.1]` `feature_registry` entries: `asesor_m06_tareas`, `asesor_m06_calendar_sync`, `asesor_m07_operaciones`, `asesor_m07_cfdi`, `asesor_m07_mifiel`, `asesor_m08_marketing`, `asesor_m08_portales`, `asesor_m09_estadisticas`, `asesor_m09_team_comparison`, `gamification_widget`, `discover_weekly`, `dmx_wrapped`.
- `[14.F.2.2]` Admin puede toggle per plan/role/user (FASE 19).

**Criterio de done del módulo:**
- [ ] 12 flags listados.

#### MÓDULO 14.F.3 — Polishing Dopamine final

**Pasos:**
- `[14.F.3.1]` Revisar cada módulo contra `docs/referencias-ui/M6-M9_*.tsx` pixel-perfect.
- `[14.F.3.2]` Card3D hover animations @ 60fps sin jank.
- `[14.F.3.3]` Prefers-reduced-motion respetado.
- `[14.F.3.4]` Contrast ≥4.5:1 en todos los tints.

**Criterio de done del módulo:**
- [ ] Visual regression testing (Percy/Chromatic) verde.

## Criterio de done de la FASE

- [ ] M06 Tareas con date picker absoluto + prioridad creación + calendario sync.
- [ ] M07 Operaciones wizard 6 pasos + split 20% EXPLÍCITO + STATUS_MAP testeado + CFDI 4.0 (Facturapi) + Módulo Legal `/legal` con Mifiel NOM-151.
- [ ] M08 Marketing: landings + QR + WA templates + client folders + auto-gen 5 piezas + clasificación fotos AI + `marketing_portales`.
- [ ] M09 Estadísticas 2 superficies + pedagogía 11 KPIs + selector fechas flexible + comparativa equipo.
- [ ] Gamification widget M01 + badges + leaderboard.
- [ ] Discover Weekly lunes 8am + DMX Wrapped anual visibles M01.
- [ ] 4 specs e2e Playwright pasando (Tareas, Operaciones, Marketing, Estadísticas).
- [ ] Feature flags 12 granulares activos.
- [ ] Bundle budget <300KB por ruta (M07 con Facturapi+Mifiel SDK).
- [ ] Tag git: `fase-14-complete`.
- [ ] Documentación: `docs/04_MODULOS/M06..M09_*.md` reflejan estado "implementado".

## Features añadidas por GCs (delta v2)

- **F-14-14** Sequence Engine multi-channel (GC-28) con canvas visual + branching.
- **F-14-15** Intent Signals hot leads (GC-29) con score 0-100 + tier.
- **F-14-16** AI Dialer + AI Scribe (GC-30) con Twilio Voice + Whisper + Claude extract.
- **F-14-17** QR Check-in visita (GC-42) con geolocation match + no-show.
- **F-14-18** Cross-sell Detector cron (GC-52) con 3 heurísticas base.
- **F-14-19** Offline visits + voice notes post-visita (GC-39) PWA + Whisper.
- **F-14-20** Multi-channel blast (GC-35) con segmentación + opt-out + costo preview.
- **F-14-21** Commission Forecast 3-6 meses (GC-56) con 3 escenarios + export PDF.

## E2E VERIFICATION CHECKLIST

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-14-complete`.

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

[FASE 15 — Portal Desarrollador (M10-M15)](./FASE_15_PORTAL_DESARROLLADOR.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17
**Pivot revisión:** 2026-04-18 (biblia v2 moonshot — GCs integrados + E2E checklist)
