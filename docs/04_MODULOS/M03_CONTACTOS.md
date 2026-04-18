# M03 — Contactos

> **Portal:** Asesor
> **Ruta principal:** `/asesores/contactos`
> **Fase donde se construye:** [FASE 13 — Portal Asesor M1-M5](../02_PLAN_MAESTRO/FASE_13_PORTAL_ASESOR_M1_M5.md)
> **Sidebar tint:** bgLavender `#F0EEFF`
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M3_Contactos.tsx`

---

## Descripción funcional

Agenda/CRM del asesor. Lista + detalle de contactos (compradores, vendedores, propietarios, brokers, inversores). Schema limpio (**NO heredado de Pulppo/DISC**): `phones` jsonb[], `emails` jsonb[], `first_name` + `last_name` (NUNCA `nombre`), `temperatura` CHECK (`frio/tibio/caliente/cliente`), `tipo` CHECK (`comprador/vendedor/propietario/broker/inversor/otro`), `tags` text[], `search_vector` GIN (FTS Postgres, NO Algolia como Pulppo). Anti-duplicados via `normalize_phone()` + unique index. Incluye Argumentario AI inline (scoreC02) que genera mensaje personalizado según perfil del contacto + proyecto que le quieres mostrar.

## Flujos principales

### Flujo 1 — Crear contacto (sin duplicados)
1. Usuario click "Nuevo contacto".
2. Form con: first_name, last_name, phone (picker internacional libphonenumber-js), email, tipo, temperatura, tags.
3. Al submit: `normalize_phone()` antes de validar.
4. Check unique index `contactos_normalized_phone_uniq` — si ya existe → warning "Ya existe Juan Pérez, ver perfil" + link.
5. Si passes validación → INSERT + trigger calcula `search_vector`.
6. Gamification: +10 XP.

### Flujo 2 — Búsqueda (FTS Postgres)
1. Input search en header del listado.
2. `trpc.asesorCRM.searchContactos` con debounce 200ms.
3. Query: `WHERE search_vector @@ plainto_tsquery('spanish', $1)` + ranking.
4. Highlight matches en nombre + email + phone.
5. Sin límite de resultados (virtual scroll react-virtual).

### Flujo 3 — Detalle + timeline
1. Click contacto → navigate `/asesores/contactos/[id]`.
2. Layout: header (avatar + name + tipo + temperatura), 4 tabs (Info, Timeline, Búsquedas, Notas).
3. Timeline: calls, visits, emails, WhatsApps, operaciones (orden desc).
4. Botón "Argumentario AI" → drawer con preview de mensaje personalizado.

### Flujo 4 — Argumentario AI (C02)
1. En detalle contacto, botón "Generar argumentario".
2. Modal: selector proyecto/unidad + objetivo (agendar visita / enviar info / reactivar).
3. `trpc.ai.generateArgumentario` con RAG sobre: perfil contacto, historial, scores proyecto, zone_scores.
4. Output: mensaje listo para copiar + botones "Enviar WhatsApp" / "Enviar Email" / "Guardar borrador".
5. Citations inline ("según su visita a X el día Y").

### Flujo 5 — Bulk actions
1. Checkbox selection en listado.
2. Bulk: exportar CSV, cambiar temperatura, añadir tag, eliminar (soft delete), enviar a campaña.
3. Confirmación modal con contador.

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Contactos                     Search: [Juan______] + Nuevo     │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ [☰ Filtros] Tipo: All▾  Temp: All▾  Tags: +            │
│    │ ┌───────────────────────────────────────────┐             │
│    │ │ ☐ | Juan Pérez | Comprador | 🔥 | +52... │             │
│    │ │ ☐ | Ana García | Vendedor  | 🌡 | +52... │             │
│    │ │ ☐ | Luis Ruiz  | Inversor  | ❄️ | +52... │             │
│    │ └───────────────────────────────────────────┘             │
│    │                   [virtual scroll, 500+ rows]              │
└────┴──────────────────────────────────────────────────────────┘

Detail:
┌─Header: Juan Pérez | Comprador | 🔥 Caliente | +52 55 1234─────┐
├─Tabs: Info | Timeline | Búsquedas | Notas─────────────────────┤
│ Timeline:                                                       │
│ • 2026-04-15 Llamada 8min — interesado Del Valle 2 rec         │
│ • 2026-04-12 Visita Parque Residencial — feedback hot          │
│ • 2026-04-10 WhatsApp enviado con argumentario AI              │
│                                                                 │
│ [Argumentario AI ✨] [Agendar visita] [Enviar WhatsApp]         │
└────────────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<ContactosList />` (`features/contactos/components/ContactosList.tsx`) — virtual list con row component.
- `<ContactoRow />` (`features/contactos/components/ContactoRow.tsx`) — avatar + name + tipo badge + temperatura emoji + phone.
- `<ContactoForm />` (`features/contactos/components/ContactoForm.tsx`) — react-hook-form + Zod resolver.
- `<PhoneInput />` (`shared/ui/primitives/PhoneInput.tsx`) — libphonenumber-js wrapper multi-country.
- `<TemperaturaSelector />` — 4 opciones con emoji + color.
- `<TipoSelector />` — 6 opciones.
- `<TagsMultiSelect />` — creatable tags + autocomplete.
- `<ContactoDetailPage />` — layout con 4 tabs.
- `<TimelineEntry />` — render entries por tipo.
- `<ArgumentarioDialog />` — modal con AI generation + citations.
- `<DuplicateWarning />` — toast con link al existing.
- `<BulkActionsBar />` — sticky bottom con selected count + actions.

## Procedures tRPC consumidas

- `asesorCRM.listContactos` — input: `{ filters, cursor, limit }` / output: `{ contactos[], nextCursor }`.
- `asesorCRM.searchContactos` — input: `{ query }` / output: `{ results[] }` con highlights.
- `asesorCRM.createContacto` — input: schema below / output: `{ contactoId }`.
- `asesorCRM.updateContacto` — input: `{ id, patch }` / output: `{ contacto }`.
- `asesorCRM.deleteContacto` — soft delete.
- `asesorCRM.getContactoById` — input: `{ id }` / output: contacto + timeline + búsquedas + notas.
- `asesorCRM.addContactoNote` — input: `{ contactoId, body, visibility }` (privada/inmobiliaria/dmx).
- `ai.generateArgumentario` — input: `{ contactoId, proyectoId?, unidadId?, objetivo }` / output: `{ message, citations[] }`.
- `asesorCRM.checkDuplicate` — input: `{ phone }` / output: `{ existing: contacto | null }`.
- `asesorCRM.bulkUpdate` — input: `{ ids, patch }`.

## Tablas BD tocadas

- `contactos` — SELECT/INSERT/UPDATE/soft-delete. Columnas: id, asesor_id, country_code, first_name, last_name, phones jsonb[], emails jsonb[], tipo CHECK, temperatura CHECK, tags text[], normalized_phone (generated), search_vector GIN, created_at, updated_at, deleted_at.
- `timeline_entries` — SELECT (detail tab).
- `contacto_notes` — SELECT/INSERT, con `visibility` CHECK (`privada/inmobiliaria/dmx`).
- `busquedas` — SELECT (tab búsquedas del contacto).
- `operaciones` — SELECT (histórico).
- `ai_generated_content` — INSERT (type='argumentario').
- `audit_log` — INSERT on create/update/delete.

## Estados UI

- **Loading**: skeleton 20 rows shimmer. Header con placeholder.
- **Error**: banner "No pudimos cargar tus contactos. Reintentar." + retry.
- **Empty**: ilustración + CTA "Crear tu primer contacto" + tutorial opcional.
- **Success**: lista renderizada + count badge en header "248 contactos".

## Validaciones Zod

```typescript
const phoneSchema = z.object({
  number: z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Número inválido'),
  label: z.enum(['mobile', 'home', 'work', 'other']).default('mobile'),
  isPrimary: z.boolean().default(false),
});

const emailSchema = z.object({
  address: z.string().email(),
  label: z.enum(['personal', 'work', 'other']).default('personal'),
  isPrimary: z.boolean().default(false),
});

const createContactoInput = z.object({
  countryCode: z.string().length(2),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phones: z.array(phoneSchema).min(1).max(5),
  emails: z.array(emailSchema).max(5).default([]),
  tipo: z.enum(['comprador', 'vendedor', 'propietario', 'broker', 'inversor', 'otro']),
  temperatura: z.enum(['frio', 'tibio', 'caliente', 'cliente']).default('frio'),
  tags: z.array(z.string().max(30)).max(20).default([]),
  notes: z.string().max(2000).optional(),
});
```

## Integraciones externas

- **libphonenumber-js** — validación + normalización multi-country.
- **Postgres FTS** — search_vector GIN (NO Algolia — gap Pulppo cerrado).
- **Anthropic Claude** — Argumentario AI (C02).
- **Supabase Realtime** — updates contactos si manager edita (conflict resolution).
- **WhatsApp Business API** — send message directo desde drawer (M08 Marketing orchestration).
- **Resend** — send email.
- **PostHog** — track acciones.
- **Sentry** — errors.

## Tests críticos

- [ ] Crear contacto con phone duplicado → muestra warning con link al existing.
- [ ] `normalize_phone` iguala `+52 55 1234 5678` con `525512345678`.
- [ ] FTS busca por apellido + email + tag con ranking.
- [ ] RLS: asesor solo ve sus contactos (managers con permission ven equipo).
- [ ] Argumentario AI genera mensaje <3s con ≥1 citation.
- [ ] Tags creatable persiste nuevo tag.
- [ ] Soft delete: contacto borrado no aparece en list pero timeline de operaciones lo mantiene.
- [ ] i18n: `t('contactos.*')` para toda UI.
- [ ] Accessibility: PhoneInput accesible con keyboard, labels ARIA correctos.
- [ ] Historial cross-agencia: asesor ve actividad de contacto con otras inmobiliarias (si perm `permissions.contactos.cross_agency=true`).

## i18n keys ejemplo

```tsx
<Label>{t('contactos.form.firstName')}</Label>
<Select label={t('contactos.form.tipo')}>
  {TIPOS.map(t => <Option>{t('contactos.tipo.' + t)}</Option>)}
</Select>
<Badge>{t('contactos.temperatura.' + temp)}</Badge>
```

## Referencia visual

Ver `/docs/referencias-ui/M3_Contactos.tsx` (576 LOC JSX Dopamine). Tint bgLavender, lista compacta con avatars gradient, detail con 4 tabs.

## Cross-references

- ADR-001 Rewrite (schema limpio, sin `nombre` column ni typos)
- ADR-003 Multi-Country (libphonenumber-js)
- ADR-009 Security (RLS contactos por asesor_id + manager override)
- [03.5 tRPC Procedures](../03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md) — `asesorCRM.*`
- Módulos relacionados: M04 Búsquedas (linkea contacto), M06 Tareas (`contacto_id` FK), M07 Operaciones (comprador/vendedor picker)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
