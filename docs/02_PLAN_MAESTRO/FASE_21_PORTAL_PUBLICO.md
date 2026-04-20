# FASE 21 — Portal Público (Landing SPA + /explorar + /proyectos/[id] + /indices + /metodologia + /asesores/[slug] + SEO + A11y + Wrapped + Referral)

> **Duración estimada:** 7 sesiones Claude Code (~28 horas con agentes paralelos)
> **Dependencias:** FASE 04 (Design System — Card3D, AnimNum, FloatingShapes, ParticleField), FASE 05 (i18n + multi-country), FASE 08-12 (IE completo + dmx_indices), FASE 19 (Market Observatory — subset capas para /explorar), FASE 20 (portal comprador onboarding flow — landing CTAs llevan a signup).
> **Bloqueantes externos:**
> - **Dominio** `desarrollosmx.com` + subdomains (`app`, `api`, `docs`) con DNS + SSL.
> - **Vercel Analytics + Speed Insights** habilitados.
> - **PostHog** para conversion tracking + referral tracking.
> - **Google Search Console** + Bing Webmaster propiedad verificada.
> - **Mapbox token** (public, rate limited para /explorar — 50K map loads/mes tier).
> - **Sanity CMS** opcional H2 para /metodologia content editable (MVP hardcoded).
> - **Resend** para newsletter signup.
> **Resultado esperado:** Portal público en `app/(public)/` group. Landing SPA full pixel-perfect respecto a `docs/referencias-ui/Landing_v2.jsx` (9 secciones). `/explorar` mapa público simplificado. `/proyectos/[id]` ficha completa con 3 tabs IE públicos. `/indices` rankings top colonias. `/metodologia` descripción fórmulas + fuentes + disclaimer. `/asesores/[slug]` microsites usando VIEW `public_profiles` (SEC-01 fix ADR-009). SEO completo (meta + OG + JSON-LD). Newsletter signup. DMX Wrapped anual teaser. A11y + i18n + performance Core Web Vitals (LCP <2.5s, CLS <0.1, INP <200ms). Referral system desde día 1. Tag `fase-21-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El portal público es **la primera impresión** de DMX + **la puerta al marketplace** + **la demostración pública del moat**. Tiene 3 audiencias simultáneas:
1. **Compradores potenciales**: "ayúdame a decidir qué comprar". Landing → explorar → ficha → signup → comprador portal.
2. **Desarrolladores enterprise**: "esto es más sofisticado que DD360/Monopolio". Landing → /indices + /metodologia → convencido → sales call.
3. **Inversionistas + prensa + gobierno**: "DMX es único en LATAM". Moat table + methodology pública + DMX Wrapped viral.

El landing ya existe especificado en `docs/referencias-ui/Landing_v2.jsx` (939 LOC, componentes Dopamine: Navbar, Btn, Card3D, Sec, Title, Label, FloatingShapes, ParticleField, AnimNum). Fase 04 ya creó los primitives — aquí instanciamos el landing completo SPA + las rutas semi-públicas (explorar/proyectos/indices/metodologia/asesores).

Crítico:
- **SEC-01 fix aplicado**: `/asesores/[slug]` DEBE usar VIEW `public_profiles` sin PII — nunca `profiles` tabla directa (ADR-009).
- Performance crítica (SEO + UX): LCP <2.5s — imágenes optimizadas (Sharp WebP 3 variantes Fase 04), fonts display=swap, tercer rail scripts async.
- i18n: landing debe disponer es-MX/es-CO/es-AR/pt-BR/en-US. Routing automático con `next-intl` (FASE 05).
- Core Web Vitals monitored con Vercel Speed Insights + PostHog.

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-9 | Short-form video feed (Real Estate TikTok) | Feed vertical tipo TikTok para exploration emocional de proyectos | Módulo 21.A.11 (nuevo) |
| GC-4 | Voice search público | Search voice en landing + /explorar (es-MX / pt-BR) | Módulo 21.B.2 (nuevo) |
| GC-7 | Constitutional AI on copy generation | Reglas para narratives / market copy generados (landing ticker, /indices narrative, /metodologia auto-updates): nunca inventar datos, siempre source span, confidence threshold | Módulo 21.H.4 (nuevo) |

## Bloques

### BLOQUE 21.A — Landing SPA (9 secciones pixel-perfect)

#### MÓDULO 21.A.1 — Setup primitives + tokens

**Pasos:**
- `[21.A.1.1]` Verificar Fase 04 ya creó primitives en `shared/ui/dopamine/`:
  - `Card3D.tsx` (perspective 800 + mouse-follow).
  - `AnimNum.tsx` (counter IntersectionObserver).
  - `FloatingShapes.tsx` (float animations con mouse parallax).
  - `ParticleField.tsx` (canvas 70 partículas + lines dist<110px).
- `[21.A.1.2]` Crear primitives faltantes Dopamine-specific para landing:
  - `Navbar.tsx` en `shared/ui/layout/Navbar.tsx` (fixed top, blur backdrop, logo + 5 nav items + 2 CTAs).
  - `Btn.tsx` en `shared/ui/primitives/Btn.tsx` con 4 variants: `primary` (gradient indigo-pink + shimmer), `white`, `outline`, `outlineWhite`.
  - `Sec.tsx` en `shared/ui/layout/Sec.tsx` (section wrapper con bg + padding responsive).
  - `Title.tsx` en `shared/ui/primitives/Title.tsx` (pre + title + sub + align).
  - `Label.tsx` en `shared/ui/primitives/Label.tsx` (chip label with outline).
- `[21.A.1.3]` Tokens T en `styles/tokens.css` CSS vars:
  ```css
  :root {
    --dmx-indigo: #4F46E5;
    --dmx-pink: #EC4899;
    --dmx-bg: #FAF8F5;
    --dmx-bg-cream: #F5F3F0;
    --dmx-white: #FFFFFF;
    --dmx-dark: #1A1A1A;
  }
  ```
- `[21.A.1.4]` Fonts Outfit (400-900) + DM Sans (300-700) via `next/font/google` con `display: 'swap'`.

**Criterio de done del módulo:**
- [ ] Los 5 primitives renderizados en Storybook (Fase 04 si existe) o snapshot test.
- [ ] Tokens accesibles via `--dmx-*`.

#### MÓDULO 21.A.2 — Section 1: Navbar

**Pasos:**
- `[21.A.2.1]` `app/(public)/_components/navbar.tsx` con estructura:
  - Left: logo DMX (SVG optimizado).
  - Center: nav items (Plataforma, Metodología, Moat, Índices).
  - Right: CTAs "Explorar mapa" (sz=sm) + "Ingresar" (outline sz=sm) + lang switcher.
- `[21.A.2.2]` Scroll behavior: blur backdrop bg appears cuando scroll >40px.
- `[21.A.2.3]` Mobile hamburger menu con slide-over.
- `[21.A.2.4]` Nav items anchor-scroll a secciones de landing (smooth scroll).

**Criterio de done del módulo:**
- [ ] Navbar blur efect correcto en scroll.
- [ ] Mobile menu funciona.

#### MÓDULO 21.A.3 — Section 2: Hero con mock Dashboard

**Pasos:**
- `[21.A.3.1]` `app/(public)/_components/hero.tsx` con layout split (izq copy + ctas, der mock dashboard):
  - Background: `<ParticleField>` + `<FloatingShapes colors={[indigo, pink]}>`.
  - Izq: Label "La plataforma de inteligencia inmobiliaria de México" + Title h1 "La decisión inmobiliaria más inteligente de LATAM" + subtitle + 2 CTAs ("Explorar el mapa" primary + "Ver demo en vivo" outline).
- `[21.A.3.2]` Der: mock Dashboard Card3D con 3 KPIs animados:
  - **DMX Score**: `<AnimNum target={8.4} suffix="" />` + badge verde "+0.3".
  - **Absorción**: `<AnimNum target={2.1} suffix="x" />` + badge "+12%".
  - **Momentum**: `<AnimNum target={0.8} suffix="σ" prefix="+" />` + label "Positivo".
- `[21.A.3.3]` Mini chart momentum zona: 12 barras vertical (periods 6M/1A/3A selector tabs). Heights random pero reproducible.
- `[21.A.3.4]` 4 zone scores chip row: Del Valle 8.7, Roma 7.9, Nápoles 8.2, Condesa 7.6.
- `[21.A.3.5]` Tras hero: stats bar grande con 4 counters:
  - `<AnimNum target={108} suffix="+" />` scores
  - `<AnimNum target={7} />` índices propietarios
  - `<AnimNum target={50} suffix="+" />` fuentes datos
  - `<AnimNum target={16} />` alcaldías CDMX

**Criterio de done del módulo:**
- [ ] Animaciones correct (once on viewport).
- [ ] Mock dashboard responsive.

#### MÓDULO 21.A.4 — Section 3: PhotoCarousel

**Pasos:**
- `[21.A.4.1]` `app/(public)/_components/photo-carousel.tsx`:
  - Carousel horizontal auto-scroll 10s per slide.
  - 6 fotos de desarrollos top MX (hero quality).
  - Overlay gradient + etiqueta zona + DMX Score sobrepuesto.
  - Pause on hover.
- `[21.A.4.2]` Photos CDN optimized (next/image con priority=false salvo first).

**Criterio de done del módulo:**
- [ ] Carousel auto-scroll.
- [ ] Pause hover funciona.

#### MÓDULO 21.A.5 — Section 4: Ticker

**Pasos:**
- `[21.A.5.1]` `app/(public)/_components/ticker.tsx`:
  - Infinite scroll horizontal de stats dinámicos:
    - "108+ scores calculados cada hora"
    - "Última actualización FGJ: hace 2h"
    - "Del Valle momentum +0.8σ esta semana"
    - "Nueva parcela Catastro 2.3M CDMX"
  - Data fetchable desde API pública `/api/public/ticker-stats`.
- `[21.A.5.2]` Paused on hover.

**Criterio de done del módulo:**
- [ ] Ticker scrolling smooth.
- [ ] Data real desde API.

#### MÓDULO 21.A.6 — Section 5: Pillars

**Pasos:**
- `[21.A.6.1]` `app/(public)/_components/pillars.tsx` — 3-4 cards con pillars DMX:
  - **Datos**: "50+ fuentes públicas + snapshots temporales + mapeo SCIAN propietario".
  - **Inteligencia**: "108 scores en 5 niveles + 7 índices DMX + cascadas automáticas".
  - **Calibración**: "Marketplace real con transacciones que calibran modelos".
  - **LATAM-first**: "Residencial + comercial. Multi-país desde día 1".
- `[21.A.6.2]` Cada pillar en `<Card3D glowColor={color}>` con icon + title + description + link "Ver más".

**Criterio de done del módulo:**
- [ ] 4 Card3D con animations correct.

#### MÓDULO 21.A.7 — Section 6: ZoneExplorer

**Pasos:**
- `[21.A.7.1]` `app/(public)/_components/zone-explorer.tsx`:
  - Left sidebar: 5 zonas clickables (Del Valle, Nápoles, Roma Norte, Condesa, Polanco).
  - Right: grid 6 metric cards para zona seleccionada:
    - Precio ($/m2)
    - Tendencia 12m
    - Absorción (ratio)
    - Riesgo (DMX-IRE)
    - Ecosistema (F03 badge)
    - Momentum (N11 sigma)
- `[21.A.7.2]` Al cambiar zona: refetch metrics + fade transition.
- `[21.A.7.3]` CTA bottom "Ver análisis completo de {zona}" → /proyectos?zone=X o /indices?zone=X (marketplace interno con filtro).

**Criterio de done del módulo:**
- [ ] 5 zonas toggleables con data real.
- [ ] CTA redirects correctamente.

#### MÓDULO 21.A.8 — Section 7: HowItWorks 4 pasos

**Pasos:**
- `[21.A.8.1]` `app/(public)/_components/how-it-works.tsx`:
  - 4 pasos numerados:
    1. "Ingestamos ciudad — 50+ fuentes" — ilustración mapa con pins.
    2. "Cruzamos todo (Catastro×DENUE×FGJ×SIGED)" — diagrama cross-correlation.
    3. "108 Scores en 5 niveles" — stack de scoring cards.
    4. "Tú decides mejor" — persona decisión content.
- `[21.A.8.2]` Cada paso con icon + title + description + visual.
- `[21.A.8.3]` Layout vertical en mobile, horizontal en desktop.

**Criterio de done del módulo:**
- [ ] 4 pasos renderizados correctamente.

#### MÓDULO 21.A.9 — Section 8: Moat table

**Pasos:**
- `[21.A.9.1]` `app/(public)/_components/moat.tsx` tabla comparativa vs 4 competidores:
  - Rows: DMX, CoStar ($35B), Local Logic, Walk Score (Redfin), Habi.
  - Cols: Geografía, # Scores, Temporalidad, Marketplace calibrador, Neighborhood, Multi-fuente, LATAM.
  - Cells con check/cross + notes highlighted.
- `[21.A.9.2]` DMX row highlighted full green, competitors rows amber/red por gap.
- `[21.A.9.3]` CTA bajo tabla: "Ver nuestro moat completo" → /moat (page detail opcional).

**Criterio de done del módulo:**
- [ ] Tabla responsive mobile (scroll-x).
- [ ] Color-coding correcto.

#### MÓDULO 21.A.10 — Section 9: CTA final + Footer

**Pasos:**
- `[21.A.10.1]` `app/(public)/_components/cta.tsx` gran section con fondo gradient + Title + 2 CTAs:
  - "Acceder a la plataforma" (v=white sz=lg).
  - "Solicitar demo" (v=outlineWhite sz=lg).
- `[21.A.10.2]` `app/(public)/_components/footer.tsx`:
  - 4 columnas: Producto, Empresa, Recursos, Legal.
  - Newsletter signup inline.
  - Copyright + socials + language switcher.

**Criterio de done del módulo:**
- [ ] CTAs redirects funcionan.
- [ ] Newsletter signup confirm.

#### MÓDULO 21.A.11 — Short-form video feed (GC-9 Real Estate TikTok)

**Pasos:**
- `[21.A.11.1]` Nueva sección landing (entre ZoneExplorer y HowItWorks) + ruta dedicada `/explorar-video`: feed vertical full-screen swipe up/down al estilo TikTok.
- `[21.A.11.2]` Cada video 15-60s: tour proyecto + overlay IE scores + CTA "Ver ficha" + creator (asesor o dev) + música opcional.
- `[21.A.11.3]` Source videos: (a) auto-generados desde FASE 22 `ai_marketing_assets.asset_type='video_story'`, (b) subidos manualmente por dev/asesor vía `/marketing/video-feed` (FASE 14/15).
- `[21.A.11.4]` Algoritmo feed: collaborative filtering + zone_interest + lifestyle_dna si logueado; para anónimos: trending global.
- `[21.A.11.5]` Engagement actions: like, save to watchlist, share (WA/Twitter/IG), report inapropiado.
- `[21.A.11.6]` Performance: lazy load + HLS streaming + preload next 2 videos. Max 2MB/video on mobile.
- `[21.A.11.7]` A11y: captions obligatorios autogenerados (Whisper) + control play/pause teclado + prefers-reduced-motion skip auto-play.

**Criterio de done del módulo:**
- [ ] Feed carga 20 videos + swipe smooth a 60fps.
- [ ] Tap video → ficha proyecto.
- [ ] Captions visibles + toggle.

### BLOQUE 21.B — /explorar mapa público simplificado

#### MÓDULO 21.B.1 — Map public

**Pasos:**
- `[21.B.1.1]` `app/(public)/explorar/page.tsx` con Mapbox GL JS.
- `[21.B.1.2]` 3 capas toggleables subset de Admin Market Observatory:
  - Capa A: zone_scores composite (DMX Livability) con color-scale fill.
  - Capa B: desarrollos (pins por status).
  - Capa C: DMX Momentum zona (heatmap de tendencia).
- `[21.B.1.3]` Filtros basic: ciudad (selector), rango precio, tipo vivienda.
- `[21.B.1.4]` Click zona → side panel con score breakdown + top 3 proyectos + CTA "Ver más en /indices".
- `[21.B.1.5]` Click proyecto → redirect `/proyectos/[id]`.
- `[21.B.1.6]` Sin auth requerida. Rate limit por IP (max 50 clics/min para evitar scraping).
- `[21.B.1.7]` Desktop: sidebar filtros visible; mobile: filter drawer.

**Criterio de done del módulo:**
- [ ] 3 capas renderizan.
- [ ] Rate limiting valida.
- [ ] Mobile responsive.

#### MÓDULO 21.B.2 — Voice search público (GC-4)

**Pasos:**
- `[21.B.2.1]` Floating mic button en landing hero + en `/explorar` topbar. Tap → Web Speech API `lang='es-MX'` (o pt-BR si locale BR) → transcribe query.
- `[21.B.2.2]` Query pasa por endpoint `/api/public/voice-query-parse` Claude Haiku que extrae `{ zones[], property_type, price_min, price_max, bedrooms, filters_extra }` → aplica filtros en /explorar o redirige a /proyectos?filters=...
- `[21.B.2.3]` TTS opcional response: "Encontré 24 proyectos en Condesa bajo 4M con 2 recámaras".
- `[21.B.2.4]` Rate limit 30 queries/min por IP. Session memory last 3 queries (para "muéstrame más baratos").
- `[21.B.2.5]` Accessibility: mic visible, keyboard shortcut Shift+Slash, ESC cancela, fallback textual.
- `[21.B.2.6]` PostHog event `voice_search_query` con zones/price/filters extracted (anonymous).

**Criterio de done del módulo:**
- [ ] Voice query test aplica filtros correctos.
- [ ] Latencia <2s p95.
- [ ] Sin auth required.

### BLOQUE 21.C — /proyectos/[id] ficha completa

#### MÓDULO 21.C.1 — Hero + tabs

**Pasos:**
- `[21.C.1.1]` `app/(public)/proyectos/[id]/page.tsx` (Next.js Server Component con streaming):
  - Hero: photo carousel principal + título + ubicación + precio desde $X + CTA "Apartar" / "Hablar con asesor".
  - Info bar: unidades disponibles, avance obra %, entrega estimada, dev badge H05.
- `[21.C.1.2]` Tabs row: Tab Zona | Tab Inversión | Tab Riesgos | Tab Amenidades | Tab Planos | Tab Avance | Tab Ubicación.
- `[21.C.1.3]` Metadata SEO: og:image dynamic via `/api/og?project=X` (Fase 22 marketing).

**Criterio de done del módulo:**
- [ ] Proyecto carga con SSR + hydration.
- [ ] Tabs clickables.

#### MÓDULO 21.C.2 — Tab Zona (scores IE públicos)

**Pasos:**
- `[21.C.2.1]` Tab con grid de scores públicos (subset de 108):
  - DMX-LIV Livability
  - DMX-MOM Momentum
  - F01 Safety
  - F03 Ecosystem (SCIAN tier ratios)
  - F08 Life Quality Index
  - N08 Walkability MX
  - H01 School Quality nearby
  - H02 Health Access
- `[21.C.2.2]` Cada score card con badge numérico + bar visualizer + comparativa zona promedio.
- `[21.C.2.3]` Link hover "¿Cómo se calcula?" → tooltip → link /metodologia#score.

**Criterio de done del módulo:**
- [ ] 8 scores públicos rendean con data real.
- [ ] Tooltips metodología.

#### MÓDULO 21.C.3 — Tab Inversión

**Pasos:**
- `[21.C.3.1]` Tab con:
  - A02 Investment Simulation summary (4 escenarios compact).
  - A04 Buy vs Rent breakeven.
  - A11 Patrimonio 20y trajectory.
  - Expected cap rate basado en STR/LTR D07.
- `[21.C.3.2]` CTA "Hacer mi simulación personalizada" → si auth comprador, abre Simulator Fase 20; si no, signup prompt.

**Criterio de done del módulo:**
- [ ] 4 sub-widgets renderizan.

#### MÓDULO 21.C.4 — Tab Riesgos

**Pasos:**
- `[21.C.4.1]` Tab con:
  - H03 Seismic Risk score + categoría.
  - N07 Water Security score.
  - F05 Water quality.
  - F12 Risk map visual.
  - N04 Crime Trajectory (trend).
- `[21.C.4.2]` Transparencia: "Estos scores vienen de fuentes públicas: CENAPRED, SACMEX, Atlas Riesgos CDMX, FGJ." + link metodologia.

**Criterio de done del módulo:**
- [ ] 5 risk dimensions visibles.
- [ ] Fuentes transparentes.

### BLOQUE 21.D — /indices rankings públicos

#### MÓDULO 21.D.1 — Rankings page

**Pasos:**
- `[21.D.1.1]` `app/(public)/indices/page.tsx` con tabs per índice: DMX-IPV | DMX-IAB | DMX-IDS | DMX-IRE | DMX-ICO | DMX-MOM | DMX-LIV.
- `[21.D.1.2]` Tab content: tabla top 30 colonias por ese índice, columnas [rank, colonia, alcaldía, valor, delta vs trimestre anterior].
- `[21.D.1.3]` Chart de la evolución top 10 colonias últimos 24m (Recharts Line).
- `[21.D.1.4]` CTA "Descargar reporte completo (PDF)" → `/api/public/indices-report?index=X&period=Q1-2026`.
- `[21.D.1.5]` Newsletter inline: "Recibe el reporte mensual DMX-MOM por email".

**Criterio de done del módulo:**
- [ ] 7 tabs funcionales.
- [ ] PDF descargable.

#### MÓDULO 21.D.2 — Newsletter monthly index

**Pasos:**
- `[21.D.2.1]` Cron `monthly_index_newsletter` día 5 cada mes: genera PDF reporte trimestral + lo envía a subscribers via Resend.
- `[21.D.2.2]` Subscriber list en `newsletter_subscriptions` tabla con preference indice + country.

**Criterio de done del módulo:**
- [ ] Cron produce PDF + email a 1+ subscriber test.

### BLOQUE 21.E — /metodologia (pública, sin auth)

#### MÓDULO 21.E.1 — Metodología content

**Pasos:**
- `[21.E.1.1]` `app/(public)/metodologia/page.tsx` content hardcoded (MVP) con secciones:
  - **Principios**: apertura, transparencia, reproducibilidad (inspiración S&P Global).
  - **Fuentes**: listado 50+ fuentes con tipo, frecuencia, última actualización.
  - **Scores**: los 108 scores con breakdown fórmula + inputs.
  - **Índices**: los 7 DMX con fórmula detallada (ej: DMX-IPV = F08×0.30 + F09×0.25 + N11×0.20 + A12×0.15 + N01×0.10).
  - **Cascadas**: 6 cascadas explicadas (unit_sold, price_changed, macro_updated, geo_data_updated, feedback_registered, search_behavior).
  - **Ejemplo cálculo**: walk-through completo para una colonia ejemplo (Del Valle).
  - **Disclaimer**: "Los scores son indicativos — no constituyen asesoramiento financiero. Consulte siempre con un profesional."
- `[21.E.1.2]` Table of contents sticky side.
- `[21.E.1.3]` Print-friendly styling.

**Criterio de done del módulo:**
- [ ] Metodología renderea correctamente.
- [ ] Print CSS OK.

### BLOQUE 21.F — /asesores/[slug] microsites

#### MÓDULO 21.F.1 — Microsite asesor (VIEW public_profiles)

**Pasos:**
- `[21.F.1.1]` `app/(public)/asesores/[slug]/page.tsx` SSR.
- `[21.F.1.2]` Query `supabase.from('public_profiles').select('*').eq('slug', params.slug).single()`. **CRÍTICO: nunca tabla `profiles` directa** (SEC-01 ADR-009).
- `[21.F.1.3]` `public_profiles` VIEW definition (creada FASE 02 o acá si no existe):
  ```sql
  CREATE VIEW public_profiles AS
  SELECT id, slug, first_name, last_name_initial, avatar_url, bio_public,
    zones_specialty, languages, years_experience, badges, trust_score_label
  FROM profiles
  WHERE is_public = TRUE AND is_active = TRUE;
  ```
- `[21.F.1.4]` Contenido microsite:
  - Hero: avatar + nombre + apellido inicial + badges + zonas.
  - Stats: años experiencia, # proyectos vendidos (agregado), Trust Score tier ("Verificado", no numérico).
  - Proyectos destacados: grid de projects asignados vía `is_authorized_broker`.
  - Reviews compradores (top 5 con approval previo).
  - CTA "Contactar" → form lead capture (no reveal email/phone directo).
- `[21.F.1.5]` SEO: meta name+title dinámico + OG image dinámico + JSON-LD Person schema.
- `[21.F.1.6]` Form contacto crea `contactos` + `busquedas` en backend, asignado al asesor target.

**Criterio de done del módulo:**
- [ ] Microsite /asesores/juan-perez carga.
- [ ] Query NO expone PII (verificado con audit RLS).
- [ ] Form lead funciona end-to-end.

### BLOQUE 21.G — SEO + Newsletter + Wrapped

#### MÓDULO 21.G.1 — SEO completo

**Pasos:**
- `[21.G.1.1]` Meta tags base en `app/(public)/layout.tsx`:
  - title template `%s | DesarrollosMX`.
  - description + keywords.
  - viewport responsive.
- `[21.G.1.2]` Open Graph tags per página: og:title, og:description, og:image (dynamic OG), og:url.
- `[21.G.1.3]` Twitter Card tags equivalent.
- `[21.G.1.4]` JSON-LD structured data:
  - Landing: `Organization` schema.
  - /proyectos/[id]: `Product` + `Place` + `Offer` schemas.
  - /asesores/[slug]: `Person` + `RealEstateAgent` schema.
- `[21.G.1.5]` `sitemap.xml` dinámico con `next-sitemap` package o manual route `/sitemap.xml` que incluye: landing + /proyectos (paginadas) + /asesores + /indices + /metodologia.
- `[21.G.1.6]` `robots.txt` con sitemap reference + disallow admin/api.
- `[21.G.1.7]` Canonical URLs per locale (hreflang) con next-intl.

**Criterio de done del módulo:**
- [ ] Google Search Console valida sitemap.
- [ ] Rich results test pasa para Organization + Place.

#### MÓDULO 21.G.2 — Newsletter signup

**Pasos:**
- `[21.G.2.1]` Componente `<NewsletterForm>` reusable en footer + inline sections.
- `[21.G.2.2]` Schema `newsletter_subscriptions` (email, preferences, country_code, confirmed_at, unsubscribed_at).
- `[21.G.2.3]` Submit → double opt-in: Resend email confirmation link → click confirma.
- `[21.G.2.4]` Unsubscribe link in every email + endpoint `/api/newsletter/unsubscribe?token=X`.

**Criterio de done del módulo:**
- [ ] Signup + confirm flow exitoso.
- [ ] Unsubscribe funciona.

#### MÓDULO 21.G.3 — DMX Wrapped teaser (anual viral)

**Pasos:**
- `[21.G.3.1]` Section landing "Mira el DMX Wrapped 2025" (o del año actual al publicar).
- `[21.G.3.2]` CTA → `/wrapped/2025` (Fase 22 implementa full; Fase 21 landing teaser).
- `[21.G.3.3]` Cron `annual_wrapped` (1 enero): genera reporte viral con estadísticas anuales zonas top, devs destacados, evolución momentum. Emails + in-app + landing update.
- `[21.G.3.4]` Social share buttons (Twitter/X, Facebook, LinkedIn, WhatsApp).

**Criterio de done del módulo:**
- [ ] Teaser banner en landing.
- [ ] Link /wrapped/YYYY al menos placeholder.

### BLOQUE 21.H — A11y + i18n + Performance

#### MÓDULO 21.H.1 — Accessibility

**Pasos:**
- `[21.H.1.1]` Auditoría axe-core en cada page: 0 errores críticos, <5 warnings.
- `[21.H.1.2]` Keyboard nav completo (tab order, focus visible, skip-to-main link).
- `[21.H.1.3]` ARIA labels en botones icon-only, landmarks (nav, main, footer).
- `[21.H.1.4]` Color contrast ≥4.5:1 para text, 3:1 large text.
- `[21.H.1.5]` `prefers-reduced-motion`: desactivar ParticleField + FloatingShapes + Card3D transform.
- `[21.H.1.6]` Alt text descriptive en todas imágenes (no "photo1.jpg").
- `[21.H.1.7]` Form labels explicit con `htmlFor`.

**Criterio de done del módulo:**
- [ ] axe-core clean en 5 pages.
- [ ] Lighthouse A11y ≥95.

#### MÓDULO 21.H.2 — i18n

**Pasos:**
- `[21.H.2.1]` Strings en `messages/es-MX.json`, `messages/es-CO.json`, `messages/es-AR.json`, `messages/pt-BR.json`, `messages/en-US.json` (FASE 05 ya pobló).
- `[21.H.2.2]` Routing locale-aware: `/es-MX/...`, `/pt-BR/...`. Default redirect basado en `Accept-Language` header + geo.
- `[21.H.2.3]` Language switcher header con country flags.
- `[21.H.2.4]` Content-specific: /metodologia tiene versión per país (MX describe INEGI + BANXICO, BR describe IBGE + BCB).
- `[21.H.2.5]` Hreflang tags correctos per URL.

**Criterio de done del módulo:**
- [ ] 5 locales funcionan.
- [ ] Hreflang validates.

#### MÓDULO 21.H.3 — Core Web Vitals

**Pasos:**
- `[21.H.3.1]` LCP <2.5s target: optimizar hero image (next/image priority, WebP 800w), font display=swap, preconnect critical origins.
- `[21.H.3.2]` CLS <0.1 target: reserve space imagenes (width+height), evitar layout shifts en AnimNum (min-width pre-set).
- `[21.H.3.3]` INP <200ms target: event handlers lightweight, useDeferredValue para filters heavy.
- `[21.H.3.4]` Bundle analysis: `next build` + `@next/bundle-analyzer` — target <300KB initial JS.
- `[21.H.3.5]` Lazy load below-fold: ZoneExplorer, Moat, CTA — dynamic imports con loading=.
- `[21.H.3.6]` Vercel Speed Insights activo + PostHog web vitals tracking.
- `[21.H.3.7]` Pre-rendering static para landing + /metodologia. SSR streaming para /proyectos/[id]. ISR 1h para /indices.

**Criterio de done del módulo:**
- [ ] LCP p75 <2.5s validated Vercel Insights.
- [ ] Bundle <300KB initial.
- [ ] Lighthouse Performance ≥90.

#### MÓDULO 21.H.4 — Constitutional AI on copy generation (GC-7)

**Pasos:**
- `[21.H.4.1]` Cada copy AI-generado user-facing público (ticker dinámico, /indices narrative, /metodologia auto-updates, DMX Wrapped social share text, meta descriptions dinámicas de /proyectos/[id]) pasa por validator `constitutionalPublicCopy(text, sources[])`:
  - R1 Never hallucinate data: si texto contiene números/stats, el sistema verifica que cada número existe en `sources` (tabla de datos backend ground-truth).
  - R2 Source citation: cada afirmación factual lleva `data-source-ref` atributo con link a /metodologia#score o fuente pública.
  - R3 Disclaimer post-venta: cualquier copy que describa "beneficios" debe incluir disclaimer DMX no responsable post-venta.
  - R4 Low confidence → not publish: si LLM confidence <0.85 → no publica auto, crea tarea admin review.
- `[21.H.4.2]` Tabla `public_copy_audit_log` guarda cada generación con sources, outcome (published / pending_review / rejected), validation checks.
- `[21.H.4.3]` Cron `public_copy_health` diario reporta copy publicado con violations detectadas post-hoc.

**Criterio de done del módulo:**
- [ ] Copy con número inventado → rejected.
- [ ] Audit log visible para admin.

### BLOQUE 21.I — Referral system

#### MÓDULO 21.I.1 — Referral tracking

**Pasos:**
- `[21.I.1.1]` Cada user al signup recibe `referral_slug` único (ej. `juan-abc123`) persistido en `profiles.referral_slug`.
- `[21.I.1.2]` URLs con UTM tracking: `desarrollosmx.com?ref={slug}` → cookie 30d + localStorage attribution.
- `[21.I.1.3]` Al signup: si cookie `ref` present → crear `referrals` record (referrer_id, referee_id, tracking_source, created_at).
- `[21.I.1.4]` Rewards system (MVP simple):
  - Comprador refiere comprador → ambos reciben 1 mes premium features gratis (cuando Fase 23 Stripe live, MVP es non-op).
  - Dev refiere dev → ambos ahorran $200 primer mes del plan nuevo.
  - Asesor refiere asesor → ambos +100 XP gamification.
- `[21.I.1.5]` Dashboard referrals en portal user: "Tus referidos" con count + rewards earned.
- `[21.I.1.6]` Share links con WA/Twitter/Email pre-generated.

**Criterio de done del módulo:**
- [ ] Click ref link + signup crea referral record.
- [ ] Dashboard muestra referrals.

## Criterio de done de la FASE

- [ ] Landing SPA 9 secciones pixel-perfect vs `docs/referencias-ui/Landing_v2.jsx`.
- [ ] Todos los primitives Dopamine (Navbar, Btn, Card3D, Sec, Title, Label, FloatingShapes, ParticleField, AnimNum) implementados.
- [ ] /explorar mapa público 3 capas.
- [ ] /proyectos/[id] ficha con 3+ tabs IE públicos.
- [ ] /indices con 7 índices rankings + newsletter.
- [ ] /metodologia completa con 50+ fuentes + 108 scores + 7 índices detallados.
- [ ] /asesores/[slug] microsites usando VIEW `public_profiles` (SEC-01 fix aplicado, verificado audit).
- [ ] SEO: meta + OG + JSON-LD + sitemap.xml + robots.txt + hreflang correctos.
- [ ] Newsletter signup con double opt-in + unsubscribe.
- [ ] DMX Wrapped teaser + cron anual.
- [ ] A11y: Lighthouse ≥95, axe-core 0 errores críticos.
- [ ] i18n 5 locales (es-MX/es-CO/es-AR/pt-BR/en-US).
- [ ] Performance: LCP p75 <2.5s, CLS <0.1, INP <200ms (validated Vercel Insights).
- [ ] Referral system: slug único per user + cookie attribution + dashboard.
- [ ] Bundle <300KB initial JS.
- [ ] Tests Vitest ≥70% en `features/public/*`. Playwright e2e: visit landing → cambiar locale → navegar explorar → click proyecto → ver /metodologia → newsletter signup + confirm.
- [ ] Tag git `fase-21-complete`.
- [ ] Features entregados: 30 (target §9 briefing).

**Dependencia cruzada:** Este archivo referencia M19 Marketplace Público + M20 Ficha Proyecto Personalizada (docs/04_MODULOS/) — Agente H BATCH 2 escribe.

## Features añadidas por GCs (delta v2)

- **F-21-31** Short-form video feed (GC-9) estilo TikTok con captions + collaborative filtering.
- **F-21-32** Voice search público (GC-4) es-MX / pt-BR sin auth.
- **F-21-33** Constitutional AI on public copy generation (GC-7) con audit log.

## E2E VERIFICATION CHECKLIST

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-21-complete`.

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

FASE 22 — Marketing + Comms (Notifs multi-canal + WA Business + Webhooks consumers + Auto-gen piezas + Academia)

---

## Laterals pipeline (proposed durante ejecución previa)

Ver registro maestro: `docs/07_GAME_CHANGERS/LATERAL_UPGRADES_PIPELINE.md`

Aplican en esta fase:
- **L15 Score Layers Toggle** (Strava Heatmaps pattern) — usuario activa/desactiva visualización de scores específicos como capas overlay sobre /explorar. Bloque sugerido: integrar en `/explorar` con panel de toggle layers (safety, walkability, water, momentum, etc.) sobre Mapbox heatmaps.

Al ejecutar FASE 21, revisar status en pipeline maestro y confirmar incorporación al scope.

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
**Pivot revisión:** 2026-04-18 (biblia v2 moonshot — GCs integrados + E2E checklist)
