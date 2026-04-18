# M06 — Tareas

> **Portal:** Asesor
> **Ruta principal:** `/asesores/tareas`
> **Fase donde se construye:** [FASE 14 — Portal Asesor M6-M10](../02_PLAN_MAESTRO/FASE_14_PORTAL_ASESOR_M6_M10.md)
> **Sidebar tint:** bgSlate `#F0F2F7`
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M6_Tareas.tsx`

---

## Descripción funcional

Gestor de tareas del asesor. **3 columnas visuales → 5 types internos** (property, capture, search, client, lead) + general. Estados `pending/expired/done`. Vencidas primero. Form 2 pasos (entidad + detalle). **Mejoras críticas vs Pulppo**: (1) date picker absoluto NO solo períodos relativos; (2) campo prioridad en creación (no sólo filtro); (3) integración nativa con calendario; (4) widget "Tareas del día" en M01 Dashboard; (5) campo `redirect_to` (bugfix del typo `reddirectTo` de Pulppo). Control acceso por `permissions.tasks.view` (managers ven equipo). STATUS_MAP tipo Opción B (no tocar BD, hacer mapping en FE: BD type CHECK acepta property/capture/search/client/lead/general).

## Flujos principales

### Flujo 1 — Ver tareas del día (default)
1. Usuario entra a `/asesores/tareas`, default filter = "Hoy".
2. 3 columnas visuales: **Propiedades** (property + capture) / **Clientes** (search + client) / **Prospectos** (lead).
3. `trpc.asesorCRM.listTareas` con sort `expired:0, pending:1, done:2` luego por `due_at ASC`.
4. Vencidas destacadas en rojo + badge "Vencida X días".

### Flujo 2 — Crear tarea (form 2 pasos)
1. Botón "+ Nueva tarea" → wizard 2 pasos:
   - **Paso 1 Entidad**: selector type (property/capture/search/client/lead/general) + entity picker (opcional si general).
   - **Paso 2 Detalle**: 4 tipos fijos de detalle (Contactar propietario / Organizar visita / Organizar captación / Pedir devolución de visita) + custom text + due_at (date picker absoluto + time) + prioridad (alta/media/baja) + redirect_to (URL opcional al completar).
2. Submit → INSERT `tareas`.
3. Sync Google Calendar (via user token OAuth) si `preferences.sync_calendar=true`.

### Flujo 3 — Completar tarea
1. Checkbox en card → UPDATE `status='done'` + `completed_at`.
2. Si `redirect_to` → navigate esa URL (ej: registrar visita).
3. Gamification: +15 XP.

### Flujo 4 — Drag & drop reorder (prioridad visual)
1. Dentro de cada columna, drag reordena orden visual (no afecta BD sort).
2. Para cambiar priority → edit menú → select alta/media/baja.

### Flujo 5 — Widget "Tareas del día" en Dashboard M01
1. Desde M01, widget consume mismo `listTareas` pero con `{ scope: 'today', limit: 5 }`.
2. Click → navega a M06 con highlight.

### Flujo 6 — Vista manager (equipo)
1. Si user tiene `permissions.tasks.view_team=true`, toggle "Equipo" aparece.
2. Switch muestra tareas del equipo con asesor avatar.
3. Manager puede reasignar: drag tarea a otro asesor column.

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Tareas          Hoy | Semana | Mes | Todas    [+ Nueva]        │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ Propiedades     │ Clientes        │ Prospectos             │
│    │ ┌──────────────┐│ ┌──────────────┐│ ┌──────────────┐      │
│    │ │🔴 Llamar Ana ││ │🟡 Enviar doc ││ │🟢 Follow up  │      │
│    │ │ Vencida 2d   ││ │ Hoy 3pm      ││ │ Mañana       │      │
│    │ │ Alta         ││ │ Media        ││ │ Baja         │      │
│    │ └──────────────┘│ └──────────────┘│ └──────────────┘      │
│    │ ┌──────────────┐│ ┌──────────────┐│                       │
│    │ │☐ Fotos Pedro ││ │☐ Visita Luis ││                       │
│    │ │ Viernes      ││ │ Vie 5pm      ││                       │
│    │ └──────────────┘│ └──────────────┘│                       │
└────┴──────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<TareasBoard />` (`features/tareas/components/TareasBoard.tsx`) — 3 columnas con 5 types mapping.
- `<TareaCard />` — checkbox + title + entity link + due + priority badge.
- `<NuevaTareaWizard />` — 2 pasos con stepper.
- `<EntidadPicker />` — search property/capture/search/client/lead.
- `<DateTimePickerAbsolute />` (`shared/ui/primitives/DateTimePickerAbsolute.tsx`) — calendar widget NO solo relativos.
- `<PrioridadSelector />` — 3 opciones con color.
- `<DetalleTipoSelector />` — 4 tipos fijos + custom.
- `<TareaMenu />` — edit/delete/reassign.
- `<TareasTodayWidget />` (`features/tareas/components/TareasTodayWidget.tsx`) — consumido por M01.
- `<EquipoToggle />` — para managers.

## Procedures tRPC consumidas

- `asesorCRM.listTareas` — input: `{ scope: 'today'|'week'|'month'|'all', teamView?: boolean }` / output grouped.
- `asesorCRM.createTarea` — input: schema below.
- `asesorCRM.updateTarea` — input: `{ id, patch }`.
- `asesorCRM.completeTarea` — input: `{ id }` / output: `{ redirectTo?: string }`.
- `asesorCRM.reassignTarea` — input: `{ id, newAsesorId }` (manager only).
- `asesorCRM.deleteTarea`.
- `calendar.syncToGoogle` — input: `{ tareaId }` / output: `{ eventId }`.
- `calendar.syncToOutlook`.

## Tablas BD tocadas

- `tareas` — SELECT/INSERT/UPDATE. Schema:
  ```sql
  CREATE TABLE tareas (
    id uuid PRIMARY KEY,
    asesor_id uuid REFERENCES asesores(id),
    type text CHECK (type IN ('property', 'capture', 'search', 'client', 'lead', 'general')),
    entity_id uuid,
    title text NOT NULL,
    detalle_tipo text,
    description text,
    due_at timestamptz,
    priority text CHECK (priority IN ('alta', 'media', 'baja')) DEFAULT 'media',
    status text CHECK (status IN ('pending', 'expired', 'done')) DEFAULT 'pending',
    redirect_to text, -- URL absoluta o relativa (no typo reddirectTo)
    completed_at timestamptz,
    calendar_event_id text,
    created_at timestamptz DEFAULT now()
  );
  ```
- `audit_log` — INSERT en mutaciones.

## STATUS_MAP (Opción B — mapping en FE, no tocar BD)

```typescript
// Column visual → types internos
export const COLUMN_MAP = {
  propiedades: ['property', 'capture'],
  clientes: ['search', 'client'],
  prospectos: ['lead'],
  // 'general' aparece en todas si `visibleInAll=true`
};
```

## Estados UI

- **Loading**: skeleton 3 cols con 3 cards placeholder.
- **Error**: toast + retry.
- **Empty**: "No tienes tareas pendientes hoy ✨" + CTA "Crear una tarea".
- **Success**: board renderizado + animación entrada cards.

## Validaciones Zod

```typescript
const createTareaInput = z.object({
  type: z.enum(['property', 'capture', 'search', 'client', 'lead', 'general']),
  entityId: z.string().uuid().optional(), // required si type != 'general'
  title: z.string().min(3).max(200),
  detalleTipo: z.enum([
    'contactar_propietario',
    'organizar_visita',
    'organizar_captacion',
    'pedir_devolucion_visita',
    'custom'
  ]),
  description: z.string().max(2000).optional(),
  dueAt: z.string().datetime(),
  priority: z.enum(['alta', 'media', 'baja']).default('media'),
  redirectTo: z.string().max(500).optional(),
}).refine(
  (d) => d.type === 'general' || !!d.entityId,
  'entityId requerido excepto para tareas generales'
);
```

## Integraciones externas

- **Google Calendar API** — sync events.
- **Outlook Graph API** — sync events.
- **Apple Calendar** — via CalDAV.
- **PostHog** — completion funnel.
- **Vercel Queues** — cron job que marca `expired` tareas con `due_at < now() AND status='pending'`.

## Tests críticos

- [ ] Crear tarea con due_at pasado → status expired inmediato (no pending).
- [ ] Cron `tareas-mark-expired` corre cada hora.
- [ ] Sort: vencidas primero luego por due_at ASC.
- [ ] Complete tarea con redirect_to → navega URL.
- [ ] RLS: asesor solo ve sus tareas (manager con permission ve equipo).
- [ ] DateTime picker permite fechas absolutas (año 2026-12-31 OK).
- [ ] Priority en creación persiste (no sólo filtro).
- [ ] Sync calendar: evento creado en Google Calendar del user.
- [ ] Widget M01 muestra mismo data que /tareas?scope=today.
- [ ] Reassign solo disponible si `permissions.tasks.reassign=true`.
- [ ] Schema: campo `redirect_to` (no typo `reddirectTo`).
- [ ] i18n: `t('tareas.*')`.

## i18n keys ejemplo

```tsx
<Column>{t('tareas.column.' + col)}</Column> // propiedades | clientes | prospectos
<Badge>{t('tareas.priority.' + p)}</Badge>
<Badge>{t('tareas.status.' + s)}</Badge>
<Option>{t('tareas.detalleTipo.' + dt)}</Option>
```

## Referencia visual

Ver `/docs/referencias-ui/M6_Tareas.tsx` (549 LOC). Tint bgSlate, 3 columnas, cards compactas con checkbox y badges.

## Cross-references

- ADR-001 Rewrite (schema limpio, bugfix redirect_to)
- ADR-009 Security (RLS + permissions)
- [FASE 14](../02_PLAN_MAESTRO/FASE_14_PORTAL_ASESOR_M6_M10.md)
- [03.5 tRPC](../03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md)
- [03.7 Crons](../03_CATALOGOS/03.7_CATALOGO_CRONS.md) — `tareas-mark-expired`
- Módulos relacionados: M01 Dashboard (widget), M04 Búsquedas (crea tareas), M05 Captaciones (crea tareas)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
