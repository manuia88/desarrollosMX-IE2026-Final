# M20 — Ficha Proyecto Personalizada

> **Portal:** Público (no-auth con upgrade autenticado)
> **Ruta principal:** `/proyectos/[id]`
> **Fase donde se construye:** [FASE 21 — Portal Público](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md)
> **Priority:** [H1]

---

## Descripción funcional

Ficha completa de proyecto inmobiliario con **3 tabs** y personalización por `buyer_persona` si usuario está autenticado. Ruta pública (SEO) pero con capacidades extra para usuarios logueados (watchlist, apartar, compartir, simulaciones guardadas). Los 3 tabs:

1. **Tab Zona** — scores IE públicos `zone_scores` + ecosystem SCIAN + safety FGJ + transit + walkability.
2. **Tab Inversión** — A02 Simulación 4 escenarios + A05 TCO 10y + A11 Patrimonio 20y + DMX-IPV índice.
3. **Tab Riesgos** — DMX-IRE índice + H03 seismic + N07 water + F12 risk map.

Personalización por `buyer_persona` autenticado (artwork + orden secciones). OpenGraph + JSON-LD (Place + Product). CTA `Apartar con escrow` (Fase 18) o `Agendar visita` (asesor picker del proyecto via `project_brokers`). Historial precios visible (priceHistory[]).

## Flujos principales

### Flujo 1 — Render público (no-auth)
1. User llega a `/proyectos/[id]` via SEO / landing / search.
2. SSG con ISR 1 hora.
3. Renders: hero fotos + datos básicos + 3 tabs + CTA "Regístrate para apartar".
4. Disclaimers post-venta visibles.

### Flujo 2 — Tab Zona
1. Panel con:
   - DMX Score proyecto (big number).
   - zone_scores breakdown (educación, seguridad, movilidad, amenidades, salud).
   - Ecosystem SCIAN — tipo y densidad comercios/servicios en 500m radius.
   - Safety FGJ — incidentes últimos 12 meses con categorías.
   - Transit — distancia metro/metrobús más cercano + frecuencia.
   - Walkability score + bikeability.
2. Mini-map con capas IE subset.
3. Comparar vs media ciudad.

### Flujo 3 — Tab Inversión
1. Calculadora interactiva (si auth, pre-fill buyer_persona data).
2. Sub-secciones:
   - **Simulación A02** — 4 escenarios (contado, crédito, pre-venta, co-inv).
   - **TCO A05** — 10 años de costo total.
   - **Patrimonio A11** — forecast 20 años compra vs renta.
   - **DMX-IPV** — Índice Potencial de Valorización (propietario).
3. CTA: guardar simulación + compartir PDF.

### Flujo 4 — Tab Riesgos
1. Sub-secciones:
   - **DMX-IRE** — Índice Riesgo Espacial (compuesto).
   - **H03 Seismic** — zona sísmica + histórico sismos.
   - **N07 Water** — estrés hídrico + hundimiento suelo.
   - **F12 Risk Map** — múltiples riesgos (inundación, volcán, incendio).
2. Recomendaciones mitigación.
3. Link a pólizas de seguros (partners H2).

### Flujo 5 — CTA Apartar
1. Si auth → "Apartar con escrow" (M18 flow).
2. Si no auth → modal "Regístrate en 30s" + WA OTP.
3. Select unidad + monto apartado.

### Flujo 6 — Agendar visita
1. CTA "Agendar visita".
2. Asesor picker (from `project_brokers` asignados al proyecto).
3. Calendar slot picker (integra Google Calendar del asesor).
4. Submit → crea `visitas` + notif asesor.

### Flujo 7 — Personalización auth
1. Si user logueado, `user_scores.buyer_persona` ya definido.
2. Orden de tabs + artwork adapta:
   - Investor → Tab Inversión primero.
   - Family → Tab Zona primero (schools + safety).
   - First-buyer → Tab Inversión con foco affordability.

### Flujo 8 — Historial precios
1. Panel colapsable "Historial de precios" con línea temporal.
2. priceHistory[] desde `precios_unidad` trazable.
3. Transparencia anti-gaming.

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ [Photos carousel HD]                              [Share][❤]  │
│ Torre Nápoles — Benito Juárez, CDMX                           │
│ $3.2M – $6.8M MXN  |  45 unidades disponibles                │
│ DMX Score 8.4 ↑0.3 • Entrega Q4 2026                          │
│                                                                │
│ Tabs: [Zona] [Inversión] [Riesgos]                            │
│ ┌────────────────────────────────────────────────────┐        │
│ │ Tab Inversión (personalizado Investor):             │        │
│ │ Simulación A02 — 4 escenarios side-by-side         │        │
│ │ ROI neto: 8.2% anual                                │        │
│ │ TCO 10y: $4.8M total                                │        │
│ │ Patrimonio 20y: +$12M equity                        │        │
│ │ DMX-IPV: 85 (alto potencial)                        │        │
│ └────────────────────────────────────────────────────┘        │
│                                                                │
│ [Apartar con escrow $] [Agendar visita] [Guardar]             │
│                                                                │
│ Disclaimer post-venta + Historial precios (colapsable)        │
└──────────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<ProjectHero />` — photos + datos básicos + share + wishlist.
- `<ProjectTabs />` — 3 tabs.
- `<TabZona />` — scores + mini-map + ecosystem.
- `<TabInversion />` — calcs A02/A05/A11 + DMX-IPV.
- `<TabRiesgos />` — DMX-IRE + H03/N07/F12.
- `<ApartarCTA />`.
- `<AgendarVisitaDialog />` — asesor picker.
- `<PriceHistoryAccordion />`.
- `<DisclaimersBanner />` — post-venta.
- `<PersonalizedLayout />` — re-order tabs por persona.
- `<IEScoreExplainer />` — cada score con citation.

## Procedures tRPC consumidas

- `public.getProjectById` — input: `{ id }` / output: proyecto + unidades + scores + brokers.
- `scores.getProjectScoresFull` — DMX Score + zone_scores + IPV + IRE + H03 + N07 + F12.
- `scores.calculateInversion`, `calculateTCO`, `calculatePatrimonio` — (auth-gated).
- `public.getPriceHistory` — input: `{ projectId, unidadId? }`.
- `public.getProjectBrokers`.
- `apartado.initiate` (auth).
- `visitas.scheduleFromPublic` — auth required.

## Tablas BD tocadas

- `proyectos`.
- `unidades`.
- `precios_unidad` — historial.
- `photos`.
- `zone_scores`.
- `project_scores`.
- `project_brokers`.
- `user_scores` — si auth, buyer_persona.
- `wishlist_items` — si auth.
- `apartados` — en CTA apartar.
- `visitas` — en agendar.

## Estados UI

- **Loading**: SSG pre-rendered, datos visibles inmediato.
- **Error** (project not found): 404 con CTA back.
- **Empty** (no unidades disponibles): banner "Sold out — ver proyectos similares" + recomendaciones.
- **Success**: datos.

## SEO + JSON-LD

```tsx
<Head>
  <title>{project.nombre} — {project.colonia}, {project.ciudad} | DesarrollosMX</title>
  <meta name="description" content={project.descripcion_seo} />
  <meta property="og:image" content={`/og/project/${project.id}.png`} /> // Vercel OG dynamic
  <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": ["Place", "Product"],
      "name": project.nombre,
      "description": project.descripcion,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": project.ciudad,
        "addressRegion": project.estado,
        "addressCountry": project.country_code,
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": project.lat,
        "longitude": project.lng,
      },
      "offers": project.unidades.map(u => ({
        "@type": "Offer",
        "price": u.precio,
        "priceCurrency": u.currency,
        "availability": u.disponible ? "InStock" : "OutOfStock",
      })),
      "image": project.photos,
    }}
  </script>
</Head>
```

## Validaciones Zod

```typescript
const getProjectInput = z.object({
  id: z.string().uuid(),
});

const scheduleVisitFromPublicInput = z.object({
  projectId: z.string().uuid(),
  unidadId: z.string().uuid().optional(),
  asesorId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  contactoData: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    phone: z.string(),
    email: z.string().email(),
  }),
});
```

## Integraciones externas

- **Vercel OG** — dynamic OG image per project.
- **Mapbox** — mini-map.
- **Google Calendar API** — availability asesor slots.
- **Anthropic Claude** — score explanations citations.
- **Stripe Connect** — apartado (if auth + CTA click).
- **Meta Pixel + GA4** — attribution.
- **PostHog** — funnel.

## Tests críticos

- [ ] /proyectos/[id] SSG renders sin auth.
- [ ] JSON-LD valid (schema.org validator).
- [ ] Personalización auth: investor ve Tab Inversión primero.
- [ ] Price history accordion expande con datos.
- [ ] Agendar visita: asesor picker filtra por `project_brokers`.
- [ ] Apartar requires auth → modal signup.
- [ ] Disclaimers post-venta visibles.
- [ ] OG image generado (Vercel OG).
- [ ] i18n: 5 locales.
- [ ] Accessibility WCAG AA.
- [ ] Lighthouse performance >85.

## i18n keys ejemplo

```tsx
<Tab>{t('project.tabs.' + t)}</Tab>  // zona | inversion | riesgos
<Button>{t('project.cta.apartar')}</Button>
<p>{t('project.disclaimer.postVenta')}</p>
```

## Referencia visual

Ver Landing_v2.jsx para design system público. La ficha proyecto extiende Dopamine aesthetics con density de Bloomberg (Tab Inversión) y severidad NYT (Tab Riesgos).

## Cross-references

- ADR-002 AI-Native (score explanations citations)
- ADR-003 Multi-Country (SEO per locale + JSON-LD addressCountry)
- ADR-009 Security (disclaimers + apartado auth-required)
- [FASE 21](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md)
- [FASE 18 Escrow](../02_PLAN_MAESTRO/FASE_18_LEGAL_PAGOS_ESCROW.md)
- [03.8 Scores IE](../03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md) — A02, A05, A11, DMX-IPV, DMX-IRE, H03, N07, F12
- Módulos relacionados: M18 Comprador (personalización source), M19 Marketplace (entry), M02 Desarrollos (asesor view equivalente), M11 Inventario Dev (source of truth)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
