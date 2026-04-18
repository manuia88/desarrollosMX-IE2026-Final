# M05 — Captaciones (Pipeline Vendedor/Propietario)

> **Portal:** Asesor
> **Ruta principal:** `/asesores/captaciones`
> **Fase donde se construye:** [FASE 13 — Portal Asesor M1-M5](../02_PLAN_MAESTRO/FASE_13_PORTAL_ASESOR_M1_M5.md)
> **Sidebar tint:** bgPeach `#FFF3ED`
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/M5_Captaciones.tsx`

---

## Descripción funcional

Pipeline de captaciones — propietarios que quieren vender/rentar. Kanban 6 columnas (Pendiente / Seguimiento / Encuentro / Valuación / Documentación / Captado). **Mejora crítica vs Pulppo**: EXIGE mínimo dirección + tipo operación + precio ANTES de crear registro (elimina phantom drafts Pulppo). Editor 6 secciones (Ubicación cascada País→Estado→Ciudad→Colonia, Características, Operación, Promoción con IA título/descripción, Info Interna, Galería). 4 etapas funcionales con campos específicos. Catálogos filtrados por país+tipo: **17 tipos propiedad + 47 amenidades + 42 espacios**. Acuerdo comercial con comisión desde 1% + exclusividad 3/6/9/12m. Menú ··· 8 acciones (Compartir Radar / Cambiar estado / Encuentros / Tareas / Notas / Publicar propiedad / Duplicar / Cerrar captación irreversible).

## Flujos principales

### Flujo 1 — Crear captación (sin phantom drafts)
1. Botón "+ Nueva captación" → modal exige MÍNIMO: dirección, tipo operación (venta/renta), precio.
2. Sin esos 3 campos → submit disabled + tooltip "Completa los datos mínimos".
3. INSERT en `captaciones` + propietario via picker (o crear contacto inline).
4. Gamification: +25 XP.

### Flujo 2 — Kanban 6 etapas funcionales
1. 6 columnas: Pendiente / Seguimiento / Encuentro / Valuación / Documentación / Captado.
2. Drag & drop con validaciones + panels específicos por etapa:
   - **Seguimiento**: urgencia_venta (sin/baja/media/alta), motivo (comprar/compraron/inversión/sucesión), posibilidad (inmediata/en_construcción/doc_compleja), inicio_comercialización.
   - **Encuentro**: motivo (primer/propuesta/fotografías/otra) + fecha + hora + notas + location (presencial/virtual).
   - **Valuación**: precio solicitado vs sugerido vs precio_salida + ACM automático (cron `acm-generate`).
   - **Documentación**: checklist documentos (escrituras, predial, no adeudo agua, identificación, acta matrimonial, KYC).
   - **Captado**: firma digital acuerdo comercial via Mifiel.

### Flujo 3 — Editor 6 secciones
1. En detalle captación, tab "Editar".
2. Secciones:
   - **Ubicación**: cascada País → Estado → Ciudad → Colonia (autocompletado INEGI + geocoder).
   - **Características**: m², recámaras, baños, estacionamientos, antigüedad, orientación.
   - **Operación**: venta/renta, precio, mantenimiento, predial anual, disponibilidad.
   - **Promoción**: título + descripción (botón "Generar con IA" via Anthropic).
   - **Info Interna**: urgencia, motivo, notas privadas (no salen en listing).
   - **Galería**: upload fotos (drag & drop) + classify AI (sala/cocina/recámara/baño/fachada/exterior).

### Flujo 4 — Menú ··· 8 acciones
1. Kebab menu en card:
   - **Compartir Radar**: genera QR + link público al radar comprador.
   - **Cambiar estado**: modal con 6 etapas.
   - **Encuentros**: lista + crear nuevo.
   - **Tareas**: create tarea ligada.
   - **Notas**: editor con 3 niveles visibility.
   - **Publicar propiedad**: pasa a `proyectos` (si cumple Quality Score mínimo) o `propiedades_secundarias`.
   - **Duplicar**: clona captación (para múltiples unidades mismo edificio).
   - **Cerrar captación**: irreversible — requiere motivo obligatorio + confirmación "Escribe CERRAR".

### Flujo 5 — ACM automático (Valuación)
1. Al entrar a etapa "Valuación", si hay datos mínimos → trigger `scores.calculateACM`.
2. Input: ubicación + m² + tipo + características.
3. Output: `precio_sugerido` ± rango + comparables (top 5) + confidence (alta/media/baja).
4. UI muestra: solicitado | sugerido | salida → chart side-by-side + gap %.

### Flujo 6 — Acuerdo Comercial
1. En etapa "Captado", panel Acuerdo:
   - Comisión: slider desde 1% hasta 10% (step 0.25%).
   - Exclusividad: none / 3 / 6 / 9 / 12 meses.
   - Estado: pending / review / signed.
2. Click "Firmar" → flow Mifiel (genera PDF + NOM-151 timestamping).

## Wireframe textual

```
┌───────────────────────────────────────────────────────────────┐
│ Captaciones                        [+ Nueva captación]         │
├────┬──────────────────────────────────────────────────────────┤
│ SB │ Pend │Segui│Encue│Valua│Docum│Capt                       │
│    │ ┌───┐┌────┐┌────┐┌────┐┌────┐┌────┐                     │
│    │ │Del V ││Nápol││Roma ││Polan││Condsa││Cuauht│           │
│    │ │$4.5M ││$3.2M││$6M  ││$8M  ││$5.5M ││$4M   │           │
│    │ │ ···  ││ ··· ││ ··· ││ ··· ││ ···  ││ ···  │           │
│    │ └───┘└────┘└────┘└────┘└────┘└────┘                     │
│    │ Mínimo para crear: dirección + tipo + precio             │
└────┴──────────────────────────────────────────────────────────┘

Detail:
┌─Captación Nápoles 345 | Venta | $3.2M──────────── [··· menú]──┐
├─Tabs: Editar | Seguimiento | Encuentros | Valuación | Docs────┤
│ [Ubicación][Caracts][Operación][Promoción][Interna][Galería] │
│                                                                 │
│ Valuación:  Solicitado $3.2M │ Sugerido $2.85M │ Salida $3.0M  │
│ ACM: gap -11% alto, revisar con propietario                    │
└────────────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<CaptacionesKanban />` (`features/captaciones/components/CaptacionesKanban.tsx`) — 6 columns.
- `<CaptacionCard />` — compact card.
- `<NuevaCaptacionDialog />` — valida mínimo dirección + tipo + precio.
- `<UbicacionCascade />` — País → Estado → Ciudad → Colonia.
- `<CaptacionEditor />` — 6 secciones con accordion.
- `<PromocionAIGenerator />` — botón genera título + descripción.
- `<GaleriaUploader />` — drag&drop + classify AI.
- `<ACMDisplay />` — chart solicitado vs sugerido vs salida + comparables.
- `<AcuerdoComercialPanel />` — slider comisión + exclusividad + firma.
- `<CaptacionMenu />` — kebab 8 acciones.
- `<CerrarCaptacionDialog />` — confirm irreversible.

## Procedures tRPC consumidas

- `asesorCRM.listCaptaciones` — filters + view.
- `asesorCRM.createCaptacion` — input: minimum schema.
- `asesorCRM.updateCaptacionEtapa` — con validaciones.
- `asesorCRM.updateCaptacionData` — editar secciones.
- `asesorCRM.closeCaptacion` — irreversible con motivo.
- `asesorCRM.duplicateCaptacion`.
- `catalogos.getByCountryAndType` — input: `{ countryCode, propertyType }` / output: `{ tipos, amenidades, espacios }`.
- `scores.calculateACM` — input: `{ captacionId }` / output: `{ precioSugerido, rangeMin, rangeMax, comparables, confidence }`.
- `ai.generatePromocion` — input: `{ captacionId }` / output: `{ titulo, descripcion }`.
- `ai.classifyPhoto` — input: `{ photoUrl }` / output: `{ category }`.
- `legal.createAcuerdoComercial` — input: `{ captacionId, comisionPct, exclusividadMeses }` / output: `{ mifielEnvelopeId }`.
- `captacion.publishAsProperty` — convierte captación → proyecto/propiedad_secundaria.

## Tablas BD tocadas

- `captaciones` — SELECT/INSERT/UPDATE.
- `captacion_seguimientos` — INSERT (per etapa data).
- `captacion_encuentros` — INSERT.
- `captacion_valuaciones` — INSERT.
- `captacion_documentos` — INSERT (checklist).
- `captacion_acuerdos` — INSERT con Mifiel envelope.
- `contactos` — SELECT (propietario picker).
- `photos` — INSERT (galería).
- `acm_results` — INSERT (scores.calculateACM output).
- `propiedades_secundarias` — INSERT en publish.
- `proyectos` — INSERT en publish (si new build).
- `catalogos_tipos`, `catalogos_amenidades`, `catalogos_espacios` — SELECT filtrados por country+type.

## Estados UI

- **Loading**: skeleton kanban 6 cols.
- **Error**: toast + modo read-only.
- **Empty**: ilustración + CTA "Tu primera captación vale oro" + tutorial.
- **Success**: kanban con drag&drop.

## Validaciones Zod

```typescript
const createCaptacionInput = z.object({
  countryCode: z.string().length(2),
  direccion: z.string().min(5).max(200),
  tipoOperacion: z.enum(['venta', 'renta']),
  precio: z.number().positive(),
  currency: z.enum(['MXN', 'USD', 'COP', 'ARS', 'BRL']).default('MXN'),
  propietarioContactoId: z.string().uuid(),
  tipoPropiedad: z.enum([
    'departamento', 'casa', 'terreno', 'oficina', 'local',
    'bodega', 'edificio', 'nave_industrial', 'penthouse', 'loft',
    'villa', 'duplex', 'townhouse', 'estudio', 'rancho', 'isla', 'otro'
  ]),
});

const acuerdoComercialInput = z.object({
  captacionId: z.string().uuid(),
  comisionPct: z.number().min(1).max(10).multipleOf(0.25),
  exclusividadMeses: z.enum(['0', '3', '6', '9', '12']),
  fechaInicio: z.string().date(),
});

const closeCaptacionInput = z.object({
  captacionId: z.string().uuid(),
  motivo: z.enum(['vendida', 'propietario_decidio_no_vender', 'precio_no_competitivo', 'otro']),
  motivoDetalle: z.string().max(500).optional(),
  confirmText: z.literal('CERRAR'),
});
```

## Integraciones externas

- **INEGI** — geocoder + catálogo colonias MX.
- **DANE** — equivalente CO. **INDEC** AR. **IBGE** BR. **INE** CL.
- **Mapbox Geocoder** — autocompletado direcciones.
- **Anthropic Claude** — generación títulos + descripciones promoción.
- **OpenAI Vision** — classify photos (categoría).
- **Mifiel** — firma digital acuerdo comercial (NOM-151).
- **Supabase Storage** — galería.

## Tests críticos

- [ ] Crear captación sin dirección → submit disabled.
- [ ] Cambiar a "Valuación" trigger ACM automático.
- [ ] Editor genera título/descripción IA <3s con citations.
- [ ] Photo upload classify correcto (95%+ accuracy test fixtures).
- [ ] Acuerdo Comercial firma Mifiel → PDF almacenado con timestamp NOM-151.
- [ ] Cerrar captación requiere typing "CERRAR" + motivo obligatorio.
- [ ] Publish as property: Quality Score threshold ≥70 → proyectos, <70 → propiedades_secundarias.
- [ ] Catálogos filtran por country + type (CDMX departamento ≈15 amenidades relevantes, NO 47).
- [ ] i18n: todos los tipos/motivos via `t('captaciones.*')`.
- [ ] RLS: captaciones solo visibles al asesor dueño + MB inmobiliaria.

## i18n keys ejemplo

```tsx
<Column>{t('captaciones.etapa.' + etapa)}</Column>
<Label>{t('captaciones.form.direccion')}</Label>
<Select>
  {TIPOS_PROPIEDAD.map(t => <Option>{t('catalogos.tipo.' + t)}</Option>)}
</Select>
```

## Referencia visual

Ver `/docs/referencias-ui/M5_Captaciones.tsx` (757 LOC). Tint bgPeach, kanban 6 columns, editor secciones con accordion.

## Cross-references

- ADR-002 AI-Native (ACM + classify + promoción)
- ADR-003 Multi-Country (catálogos filtrados por country)
- ADR-009 Security (soft delete reversible; close irreversible)
- ADR-010 IE Pipeline (ACM = score integrado)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — ACM, Quality Score
- [FASE 18 Legal](../02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md) — Mifiel integration
- Módulos relacionados: M02 Desarrollos (publish), M03 Contactos (propietario), M06 Tareas, M08 Marketing (Radar)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
