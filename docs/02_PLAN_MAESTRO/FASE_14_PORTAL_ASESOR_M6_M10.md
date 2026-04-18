# FASE 14 — Portal Asesor (M06 Tareas + M07 Operaciones + M08 Marketing + M09 Estadísticas)

> **Duración estimada:** 6 sesiones Claude Code (~24 horas con agentes paralelos)
> **Dependencias:** FASE 13 (M01-M05 + layout asesor + STATUS_MAP), FASE 08-12 (IE completo), FASE 04 (DS)
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
- `[14.C.2.2]` Usa Sharp para imágenes (composite foto proyecto + logo DMX + texto + precio + DMX Score). Templates en `shared/lib/marketing/templates/*`.
- `[14.C.2.3]` Status `ready` | `generating` | `failed`. Persistidos en `fotos` con tag `marketing_asset`.

**Criterio de done del módulo:**
- [ ] 5 piezas generadas en <30s.
- [ ] Story con DMX Score visible.

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

## Próxima fase

[FASE 15 — Portal Desarrollador (M10-M15)](./FASE_15_PORTAL_DESARROLLADOR.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent D) | **Fecha:** 2026-04-17
