# M19 — Marketplace Público (Landing + Rutas)

> **Portal:** Público (no-auth)
> **Ruta principal:** `/`
> **Fase donde se construye:** [FASE 21 — Portal Público](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md)
> **Priority:** [H1]
> **Referencia visual:** `/docs/referencias-ui/Landing_v2.jsx`

---

## Descripción funcional

Marketplace público + landing SPA principal de DesarrollosMX. Punto de entrada de todos los compradores + asesores + devs. **9 secciones** (Navbar → Hero → PhotoCarousel → Ticker → Pillars → ZoneExplorer → HowItWorks → Moat → CTA → Footer) inspirada en Bloomberg/NYT pero con Dopamine aesthetic. Rutas adicionales: `/explorar` (mapa público simplificado vs admin M17), `/indices` (rankings públicos), `/metodologia` (transparency S&P-inspired), `/asesores/[slug]` (microsites anonimizados — VIEW public_profiles sin PII). Newsletter signup, DMX Wrapped anual viral teaser (Spotify Wrapped pattern), SEO + JSON-LD, referral system con slug único UTM.

## Secciones landing (9)

1. **Navbar** — logo + nav (Explorar, Índices, Metodología, Para Asesores, Para Desarrolladores) + CTA login/signup + language switcher.
2. **Hero** — título + subtitle + mock Dashboard (3 KPIs: DMX Score 8.4 ↑0.3, Absorción 2.1x ↑12%, Momentum +0.8σ Positivo) + chart momentum por zona 12 barras (periods 6M/1A/3A) + 4 zone scores (Del Valle 8.7, Roma 7.9, Nápoles 8.2, Condesa 7.6).
3. **PhotoCarousel** — fotos high-quality proyectos destacados.
4. **Ticker** — stats bar animada (108+ scores / 7 índices / 50+ fuentes / 16 alcaldías CDMX).
5. **Pillars** — 3 pilares del producto (IE / Marketplace / AI Copilot).
6. **ZoneExplorer** — 5 zonas interactivas (Del Valle / Nápoles / Roma Norte / Condesa / Polanco) con 6 metrics cada una (Precio, Tendencia, Absorción, Riesgo, Ecosistema, Momentum).
7. **HowItWorks** — 4 pasos (Ingestamos ciudad / Cruzamos todo / 108 Scores en 5 niveles / Tú decides mejor).
8. **Moat** — tabla vs 4 competidores (CoStar $35B, Local Logic Series B, Walk Score Redfin, Habi LATAM) con qué tienen y qué les falta.
9. **CTA + Footer** — signup + newsletter + social.

## Rutas públicas adicionales

- `/explorar` — mapa Mapbox con 7 capas subset simplificado (sin crossfilter, sin time travel).
- `/indices` — rankings públicos (top 20 colonias por cada índice DMX).
- `/metodologia` — transparency public (inspirado S&P): descripción cada índice, fuentes, ejemplo cálculo, disclaimer IE. Sin auth.
- `/asesores/[slug]` — microsite por asesor (SEC-01 resuelto: VIEW `public_profiles` SIN PII — solo public bio, photos, proyectos asociados, reviews).
- `/proyectos/[id]` — ver M20 (ficha proyecto personalizada).

## Flujos principales

### Flujo 1 — SSR landing
1. Next.js 16 renders SSG con revalidate cada hora.
2. Animaciones framer-motion + ParticleField canvas (70 partículas).
3. Intersection observer activa AnimNum counters.
4. Respect `prefers-reduced-motion`.

### Flujo 2 — /explorar
1. Mapbox con 7 capas simplificadas: Catastro (simplified), DENUE (tier), FGJ (tier), GTFS, DMX Score (published zones), Desarrollos (published only), Demanda (anonymized aggregate).
2. Sin filters avanzados, sin crossfilter, sin time travel.
3. Click pin proyecto → /proyectos/[id].

### Flujo 3 — /indices
1. Lista 7 índices DMX con rankings.
2. Por índice: top 20 colonias + gráfica temporal.
3. Filtros: ciudad, tipo propiedad.
4. CTA: "Regístrate para ver análisis profundos".

### Flujo 4 — /metodologia
1. Página informativa inspirada S&P / Moody's transparency.
2. Secciones: Filosofía, Fuentes (50+), Cascadas, Confidence levels, Ejemplo cálculo, Equipo metodológico, Disclaimer IE ("no es asesoría financiera, es data product"), Changelog metodología.

### Flujo 5 — /asesores/[slug] microsite
1. Resuelve asesor por slug único.
2. Query `public_profiles` VIEW (NO PII).
3. Renders: photo + bio + zones especialización + proyectos + reviews (moderados) + CTA "Contáctame" (form sin mostrar phone/email directo — proxy via platform).

### Flujo 6 — Newsletter signup
1. Footer form: email + opt-in categorías.
2. Double opt-in Resend.
3. Tagging para segments (investor / first-buyer / dev / asesor).

### Flujo 7 — DMX Wrapped anual viral
1. Banner en landing enero: "Tu DMX Wrapped 2026 está listo".
2. CTA → login → /comprador/wrapped (cron `annual_wrapped` generó).
3. Share buttons (WA, IG Stories, Twitter).

### Flujo 8 — Referral system
1. User logueado genera link: `desarrollosmx.com/?r=<slug_unico>&utm_source=referral&utm_medium=user&utm_campaign=<slug>`.
2. Nuevo signup attrib → `referrals` table.
3. Reward: XP + eventual $ cuando referido hace primera compra (H2).

## Wireframe textual

```
┌──────────────────────────────────────────────────────────────┐
│ Navbar: [Logo DMX][Explorar][Índices][Metod][Asesores][Login]│
├──────────────────────────────────────────────────────────────┤
│ HERO                                                           │
│ Inteligencia Espacial Inmobiliaria LATAM                      │
│ 108 scores • 7 índices • 50+ fuentes • 16 alcaldías CDMX     │
│ [Mock dashboard: DMX Score 8.4 / Absorción 2.1x / Momentum +]│
│ [CTA: Empezar gratis] [Ver /metodologia]                      │
├──────────────────────────────────────────────────────────────┤
│ PhotoCarousel (scroll horizontal HD fotos proyectos)          │
├──────────────────────────────────────────────────────────────┤
│ Ticker: 108+ scores | 7 índices | 50+ fuentes | 16 alcaldías │
├──────────────────────────────────────────────────────────────┤
│ Pillars: IE | Marketplace | AI Copilot                        │
├──────────────────────────────────────────────────────────────┤
│ ZoneExplorer: [Del Valle][Nápoles][Roma][Condesa][Polanco]   │
│  6 metrics interactivos por zona                              │
├──────────────────────────────────────────────────────────────┤
│ HowItWorks: 1→Ingestamos 2→Cruzamos 3→108 Scores 4→Decides   │
├──────────────────────────────────────────────────────────────┤
│ Moat table: DMX vs CoStar/LocalLogic/WalkScore/Habi           │
├──────────────────────────────────────────────────────────────┤
│ Final CTA: [Empezar gratis]                                   │
├──────────────────────────────────────────────────────────────┤
│ Footer: Newsletter + Social + Legal + Language                │
└──────────────────────────────────────────────────────────────┘
```

## Componentes UI requeridos

- `<PublicNavbar />` (`features/public/components/PublicNavbar.tsx`).
- `<Hero />` con mock dashboard.
- `<PhotoCarousel />`.
- `<Ticker />`.
- `<Pillars />`.
- `<ZoneExplorer />` con 5 tabs.
- `<HowItWorks />`.
- `<MoatTable />`.
- `<FinalCTA />`.
- `<PublicFooter />`.
- `<ParticleField />` — canvas 70 partículas.
- `<AnimNum />` — IntersectionObserver counter.
- `<FloatingShapes />`.
- `<Card3D />` — shared.
- `<Btn />` — primary/white/outline/outlineWhite con shimmer.
- `<ExplorarMap />` — simplified 7 layers.
- `<IndicesRankings />` con 7 tabs.
- `<MetodologiaPage />` — secciones.
- `<AsesorMicrositePage />`.
- `<NewsletterSignupForm />`.
- `<DMXWrappedTeaser />`.

## Procedures tRPC consumidas

- `public.getHeroData`.
- `public.getZoneExplorerData`.
- `public.getExplorarLayers` — subset simplificado.
- `public.getIndicesRankings`.
- `public.getAsesorMicrosite` — input: `{ slug }` / output: public_profiles VIEW data.
- `public.submitNewsletter`.
- `public.getWrappedTeaser`.
- `referrals.generateLink`, `trackReferral`.

## Tablas BD tocadas

- `public_stats_cache` — hero data, rankings.
- `zone_scores` — public subset.
- `proyectos` — published only (WHERE status='published' AND is_public=true).
- `public_profiles` (VIEW sin PII).
- `reviews` — moderados.
- `newsletter_subscribers`.
- `referrals`.
- `wrapped_generations`.

## Estados UI

- **Loading**: SSG/ISR → pre-rendered, no skeleton visible.
- **Error**: 500 page custom con CTA "Reportar" + back home.
- **Empty** (index new): fallback copy "Estamos preparando tu recorrido" + list featured.
- **Success**: landing renderizada + animaciones.

## SEO + JSON-LD

```tsx
<Head>
  <title>DesarrollosMX — Inteligencia Espacial Inmobiliaria LATAM</title>
  <meta name="description" content="108 scores, 7 índices, 50+ fuentes. Decisiones inmobiliarias con data." />
  <meta property="og:image" content="/og/hero.png" /> // Vercel OG dynamic
  <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "DesarrollosMX",
      "url": "https://desarrollosmx.com",
      "logo": "...",
      "sameAs": ["https://instagram.com/desarrollosmx", "..."]
    }}
  </script>
</Head>
```

## Validaciones Zod

```typescript
const newsletterInput = z.object({
  email: z.string().email(),
  optinCategories: z.array(z.enum(['investor', 'first_buyer', 'dev', 'asesor', 'market_insights'])).default([]),
  locale: z.enum(['es-MX', 'es-CO', 'es-AR', 'pt-BR', 'en-US']).default('es-MX'),
});

const asesorMicrositeInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).max(80),
});
```

## Integraciones externas

- **Mapbox GL** — /explorar.
- **Next.js 16** — SSG/ISR + generateStaticParams.
- **Vercel OG** — dynamic OG images.
- **Resend** — newsletter.
- **PostHog** — analytics + A/B.
- **Twitter/X API, Meta, IG** — share + OG fetch.

## Tests críticos

- [ ] Landing LCP <2.5s (Lighthouse 90+).
- [ ] SSG renders correctamente multi-locale.
- [ ] /explorar 7 layers carga (tiles).
- [ ] /metodologia tiene ≥10 fuentes linkeadas.
- [ ] /asesores/[slug] NO expone phone ni email en HTML (security test).
- [ ] Newsletter double opt-in via Resend.
- [ ] DMX Wrapped teaser solo aparece enero.
- [ ] Referral link trackea UTMs correcto.
- [ ] JSON-LD valid schema.org.
- [ ] A/B test home CTA.
- [ ] i18n: 5 locales ready (es-MX default, es-CO, es-AR, pt-BR, en-US).
- [ ] Accessibility: WCAG AA min (contrast, keyboard, screen reader).

## i18n keys ejemplo

```tsx
<h1>{t('public.hero.title')}</h1>
<Button>{t('public.cta.signupFree')}</Button>
<TabName>{t('public.zoneExplorer.zones.delValle')}</TabName>
```

## Referencia visual

Ver `/docs/referencias-ui/Landing_v2.jsx` (JSX completo v2 analizado, shop Dopamine aesthetics + Bloomberg/NYT density). 56KB de código referencia.

## Cross-references

- ADR-002 AI-Native (copilot público — suscripción gratuita preview)
- ADR-003 Multi-Country (5 locales)
- ADR-009 Security (public_profiles VIEW sin PII cierra SEC-01)
- [FASE 21](../02_PLAN_MAESTRO/FASE_21_PORTAL_PUBLICO.md)
- [03.9 Fuentes Datos](../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md)
- Módulos relacionados: M17 Market Observatory (versión admin vs /explorar público), M18 Comprador (signup convierte), M20 Ficha Proyecto

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent H) | **Fecha:** 2026-04-17
