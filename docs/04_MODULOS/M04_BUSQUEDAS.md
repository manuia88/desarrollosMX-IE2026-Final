# M04 — Búsquedas (Pipeline Comprador)

> **Portal:** Asesor
> **Ruta principal:** `/asesores/busquedas`
> **Fase donde se construye:** [FASE 13 — Portal Asesor M1-M5](../02_PLAN_MAESTRO/FASE_13_PORTAL_ASESOR_M1_M5.md)
> **Sidebar tint:** purple `#a855f7` (token `--mod-busquedas`)
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M4_Busquedas.tsx`
> **Estado:** [SHIPPED 13.E — 2026-04-26] List/Drawer/Matcher core. Kanban + Wizard Ofertar diferidos a 13.F+/M07.

## Estado FASE 13.E (shipped 2026-04-26)

- BD: tabla `busquedas` (FK lead_id + criteria jsonb + matched_count + last_run_at + status). Migration `20260426203131_busquedas_create.sql`. RLS 8 policies (asesor / master broker / admin). Cero SECDEF nuevas — `audit_rls_allowlist` v30 vigente.
- Feature `features/asesor-busquedas/` (RE-SKIN canon prototype): `BusquedasPage` + tabs activa/pausada/cerrada + filters + grid + card + detail drawer + match score badge + matcher engine deterministic.
- Feature `features/busquedas/` (tRPC): 8 procedures (list/get/create/update/pause/close/reopen/runMatcher) + Zod schemas single source of truth.
- Matcher engine canon: 5 dimensions (price 30%, zoneIE 25%, amenities 20%, family 15%, DISC 10%) + rationale chips. Pure deterministic function, no LLM, exhaustive Vitest coverage.
- i18n keys: 5 locales (es-MX + en-US Tier 1; es-CO + es-AR + pt-BR fallback graceful).
- Route: `app/[locale]/(asesor)/asesores/busquedas/page.tsx` (Suspense + canon shell).

## Diferido (post 13.E)

- Kanban drag&drop 6 columnas + validaciones HARD etapa → 13.F+.
- Wizard Ofertar 6 pasos + parser EasyBroker/ML/Inmuebles24 → M07 Operaciones.
- Notas 3 niveles visibility + historial cross-agencia → 13.G+.
- Suggest semantic match C03 (Anthropic) → 13.H+.

---

## Descripción funcional

Pipeline kanban de búsquedas activas (compradores buscando propiedad). 6 columnas visibles + 1 oculta (Perdida), con validaciones HARD por etapa. **Mejora crítica vs Pulppo**: drag&drop funcional (Pulppo lo rompió, fuerza menú 4 taps). Matching engine integrado (/suggested — 10 resultados, sort: operación > tipo > colonia > precio > recámaras). Wizard Ofertar 6 pasos con "Pegar liga" EasyBroker/ML/Inmuebles24 para importar datos. Notas con 3 niveles visibilidad (Privada / Inmobiliaria / DMX). Historial cross-agencia del contacto. Lead Score C01 badge. Fuente contacto con **17 opciones adaptadas MX** (Inmuebles24, Facebook, WhatsApp, MercadoLibre, Portal Terreno, Vivanuncios, ICasas, Propiedades.com, DMX marketplace, etc.).

## Flujos principales

### Flujo 1 — Kanban drag & drop
1. Usuario entra a `/asesores/busquedas`, default view = Kanban.
2. 6 columnas visibles: Pendiente / Buscando / Visitando / Ofertando / Cerrando / Ganada + 1 oculta Perdida (toggle).
3. Drag card → drop en otra columna → `trpc.asesorCRM.updateBusquedaEtapa`.
4. Validaciones HARD (ejemplos):
   - A "Visitando": requiere ≥1 visita registrada → si no, toast error + abre modal crear visita.
   - A "Ofertando": requiere ≥1 operación tipo propuesta.
   - A "Cerrando": requiere ≥1 operación en estado `oferta_aceptada` o posterior.
   - A "Ganada": requiere operación en `cerrada`.
5. Si pasa → optimistic update + success toast. Si falla → rollback + error toast.
6. Gamification: +25 XP al pasar a "Ganada".

### Flujo 2 — Crear búsqueda
1. Botón "+ Nueva búsqueda" → modal wizard.
2. Pasos: (1) Contacto (picker o nuevo inline), (2) Preferencias (tipo, recámaras, zonas, precio min/max, amenidades), (3) Fuente contacto (17 opciones), (4) Urgencia, (5) Notas.
3. INSERT busqueda + busqueda_preferences.
4. Auto-trigger: `trpc.matching.runSuggest` → 10 proyectos/unidades rankeados.

### Flujo 3 — Matching /suggested
1. En detalle búsqueda, tab "Sugerencias" (default).
2. Muestra 10 matches rankeados (sort: operación > tipo > colonia > precio > recámaras).
3. Cada match: card con DMX Score, match score % (0-100), razones (chips "Colonia preferida", "Precio dentro rango", etc.).
4. Acciones por match: Compartir con contacto, Agendar visita, Descartar.

### Flujo 4 — Wizard Ofertar 6 pasos
1. En card de match, botón "Ofertar".
2. Wizard:
   - **Paso 1 Operación**: side (both/seller/buyer).
   - **Paso 2 Comprador**: asesor (team picker, default me) + contacto (ya hidratado).
   - **Paso 3 Vendedor**: propiedad (browser) + propietario (contacto picker con "Pegar liga" EasyBroker/ML/Inmuebles24 — parser extrae datos).
   - **Paso 4 Estado**: CHECK 6 valores, default "propuesta" + fecha cierre auto +10 días.
   - **Paso 5 Comisión**: % default 3% (buyer side) / 4% (both) + IVA 16% auto + split plataforma 20% explícito.
   - **Paso 6 Notas**: textarea + attachments opcional.
3. Submit → `trpc.operaciones.createOperacion` + vincula a búsqueda.
4. Búsqueda auto-avanza a "Ofertando".

### Flujo 5 — Notas 3 niveles
1. Tab "Notas" en detalle búsqueda.
2. Editor rich text + radio visibility: Privada (solo yo) / Inmobiliaria (mi broker) / DMX (equipo plataforma).
3. INSERT `busqueda_notes` con `visibility` CHECK.
4. RLS respeta visibility en SELECT.

### Flujo 6 — Historial cross-agencia
1. Panel lateral "Historial del contacto" en detalle.
2. Muestra actividad del contacto en otras inmobiliarias (si feature `feature:asesor:cross_agency_history`).
3. Datos anonimizados: "Visita en Polanco el 12-mar con otra inmobiliaria" (no muestra asesor específico).

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Búsquedas             [Kanban][List]      [+ Nueva búsqueda]   │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ Pendiente│Buscando│Visitando│Ofertando│Cerrando│Ganada   │
│    │ ┌───────┐┌────────┐┌────────┐┌───────┐┌───────┐┌───────┐ │
│    │ │Juan P.││Ana G.  ││Luis R. ││María M││Pedro L││Carla S│ │
│    │ │Compr. ││Depa    ││Polanco ││Oferta ││Cierre ││Ganada │ │
│    │ │LS: 84 ││LS: 72  ││LS: 91  ││LS: 88 ││LS:92  ││$3.5M  │ │
│    │ │🔥     ││🌡      ││🔥      ││🔥     ││🔥     ││✅     │ │
│    │ └───────┘└────────┘└────────┘└───────┘└───────┘└───────┘ │
│    │ [Drag&Drop real — validaciones HARD]                     │
└────┴──────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<BusquedasKanban />` (`features/busquedas/components/BusquedasKanban.tsx`) — dnd-kit con 6 columns + hidden col toggle.
- `<BusquedaCard />` — contacto + preferencias summary + Lead Score C01 + temperatura.
- `<BusquedaForm />` — wizard 5 pasos.
- `<FuenteContactoSelector />` — 17 opciones MX.
- `<SuggestedMatches />` — lista 10 matches con scoring.
- `<WizardOfertar />` — 6 pasos con stepper.
- `<PegarLigaInput />` (`features/operaciones/components/PegarLigaInput.tsx`) — parser EasyBroker/ML/Inmuebles24.
- `<BusquedaNotesTab />` — editor + visibility selector.
- `<CrossAgencyHistoryPanel />` — timeline anonimizado.
- `<ValidationErrorDialog />` — shows hard validation fail con CTA.

## Procedures tRPC consumidas

- `asesorCRM.listBusquedas` — input: `{ filters, view }` / output: grouped by etapa.
- `asesorCRM.createBusqueda` — input: schema below.
- `asesorCRM.updateBusquedaEtapa` — input: `{ busquedaId, nuevaEtapa }` / backend valida HARD rules.
- `asesorCRM.getBusquedaById` — input: `{ id }` / output: busqueda + contacto + preferencias + visitas + operaciones + notas.
- `matching.runSuggest` — input: `{ busquedaId }` / output: `{ matches[] }` (top 10).
- `operaciones.createOperacion` — (wizard ofertar final step).
- `asesorCRM.addBusquedaNote` — input: `{ busquedaId, body, visibility }`.
- `scrapers.parseExternalListing` — input: `{ url }` / output: `{ price, bedrooms, m2, photos[], address }` (EasyBroker/ML/Inmuebles24).
- `asesorCRM.getCrossAgencyHistory` — input: `{ contactoId }` / output: anonymized events.
- `scores.getLeadScore` — input: `{ contactoId, busquedaId }` / output: `{ scoreC01, factors[] }`.

## Tablas BD tocadas

- `busquedas` — SELECT/INSERT/UPDATE. Columnas: id, contacto_id, asesor_id, etapa CHECK, fuente_contacto CHECK, urgencia CHECK, created_at.
- `busqueda_preferences` — SELECT/INSERT/UPDATE (tipo, recamaras, zonas[], precio_min, precio_max, amenidades[]).
- `busqueda_notes` — SELECT/INSERT con `visibility` CHECK.
- `visitas` — SELECT (validación etapa).
- `operaciones` — SELECT/INSERT (wizard ofertar).
- `contactos` — SELECT (picker).
- `proyectos`, `unidades` — SELECT (browser wizard).
- `match_results` — SELECT (suggested matches cached).
- `lead_scores` — SELECT (C01 badge).
- `audit_log` — INSERT en cambios etapa.

## Estados UI

- **Loading**: skeleton 6 columns con 3 cards placeholder cada una.
- **Error**: toast + kanban en modo read-only.
- **Empty**: ilustración por columna + CTA "Arrastra tu primera búsqueda aquí" en Pendiente.
- **Success**: kanban con drag&drop fluido, cards con animation spring.

## Validaciones Zod

```typescript
const FUENTES_CONTACTO_MX = [
  'inmuebles24', 'facebook', 'whatsapp', 'mercadolibre', 'portal_terreno',
  'vivanuncios', 'icasas', 'propiedades_com', 'dmx_marketplace', 'easybroker',
  'lonas', 'referido', 'evento', 'web_propia', 'instagram', 'tiktok', 'otro'
] as const;

const createBusquedaInput = z.object({
  contactoId: z.string().uuid(),
  fuenteContacto: z.enum(FUENTES_CONTACTO_MX),
  urgencia: z.enum(['inmediata', 'tres_meses', 'seis_meses', 'explorando']),
  preferencias: z.object({
    tipo: z.enum(['departamento', 'casa', 'terreno', 'oficina', 'local']),
    operacion: z.enum(['venta', 'renta']),
    recamarasMin: z.number().int().min(0).max(10),
    recamarasMax: z.number().int().min(0).max(10),
    zonas: z.array(z.string()).min(1).max(10),
    precioMin: z.number().positive(),
    precioMax: z.number().positive(),
    currency: z.enum(['MXN', 'USD']).default('MXN'),
    amenidades: z.array(z.string()).max(20).default([]),
  }),
  notes: z.string().max(2000).optional(),
});

const pegarLigaInput = z.object({
  url: z.string().url().refine(
    (u) => /easybroker|mercadolibre|inmuebles24/.test(u),
    'URL debe ser de EasyBroker, MercadoLibre o Inmuebles24'
  ),
});
```

## Integraciones externas

- **dnd-kit** — drag & drop accesible (keyboard support).
- **EasyBroker API / scraper** — parser listing.
- **MercadoLibre scraper** — parser ML.
- **Inmuebles24 scraper** — parser I24.
- **Anthropic Claude** — matching C03 (semantic match).
- **Mapbox** — minimap zonas preferidas.
- **PostHog** — funnel conversion tracking.

## Tests críticos

- [ ] Drag&drop a "Visitando" sin visita → bloqueo + modal.
- [ ] Drag&drop a "Visitando" con visita → pasa + toast éxito.
- [ ] Wizard Ofertar: "Pegar liga" EasyBroker extrae datos correctos.
- [ ] Matching /suggested sort operación > tipo > colonia > precio > recámaras.
- [ ] Notas visibility privada no visible por manager (RLS test).
- [ ] Lead Score C01 badge se actualiza cuando hay nueva visita.
- [ ] Cross-agency history anonimiza correctamente.
- [ ] i18n: `t('busquedas.*')` cubre todo.
- [ ] Accessibility: kanban keyboard nav (tab + space para drag).
- [ ] Perdida oculta: toggle muestra columna, count correcto.

## i18n keys ejemplo

```tsx
<Column>{t('busquedas.etapa.' + etapa)}</Column>
<Badge>{t('busquedas.urgencia.' + urg)}</Badge>
<Select label={t('busquedas.fuenteContacto')}>
  {FUENTES_MX.map(f => <Option>{t('busquedas.fuente.' + f)}</Option>)}
</Select>
```

## Referencia visual

Ver `/docs/referencias-ui/M4_Busquedas.tsx` (1059 LOC, módulo más grande asesor). Tint bgLavender, kanban fluido, cards con Card3D hover.

## Cross-references

- ADR-002 AI-Native (matching C03 + Lead Score C01)
- ADR-010 IE Pipeline
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — C01, C03
- [03.5 tRPC Procedures](../03_CATALOGOS/03.5_CATALOGO_TRPC_PROCEDURES.md)
- Módulos relacionados: M03 Contactos, M07 Operaciones (wizard ofertar crea aquí), M06 Tareas (auto-genera tareas)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
