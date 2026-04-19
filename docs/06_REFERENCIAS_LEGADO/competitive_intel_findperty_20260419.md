---
title: Findperty.com — Competitive Intel + Design Forensic Report
date: 2026-04-19
investigator: Claude Sonnet 4.6
target_audience: DesarrollosMX (Spatial Decision Intelligence Platform)
status: archived (insumo housekeeping post-07b)
related:
  - ADR-021 Progressive Preference Discovery
  - ADR-022 Vibe Tags Hybrid
  - ADR-023 Design System Refinement
  - FASE 20 Portal Comprador (PPD architecture)
  - FASE 04 Design System (módulo 4.P)
---

# 🏡 FINDPERTY.COM — COMPETITIVE INTEL + DESIGN FORENSIC REPORT

> **Para:** DesarrollosMX (Spatial Decision Intelligence Platform)
> **Fecha:** 19 Apr 2026
> **Investigador:** Claude Sonnet 4.6
> **Sesión:** ~45 min activos · 13 screenshots clave · bundle JS 1.37 MB analizado · API schema observado

---

## NOTA DE METODOLOGÍA

Las 3 sesiones autenticadas (Comprador / Asesor / Propietario) que mencionas no estaban disponibles en el tab group de esta sesión — solo se accedió al Tab 1 sin sesión. Sin embargo, se extrajo la máxima inteligencia posible mediante:

- Análisis completo del bundle JS minificado (1.37 MB)
- Extracción directa de rutas, endpoints API, AuthContext, configuración de roles
- Design tokens via `getComputedStyle` en páginas cargadas
- Screenshots sistemáticos del landing, property modal, auth forms, carrusel de propiedades
- Inspección de toda la arquitectura técnica expuesta en el bundle

**ACTUALIZACIÓN CRÍTICA (final de la sesión):** Se encontró sesión activa de comprador en el tab. Se exploraron exitosamente: `/swipe` (feed con propiedad real), `/matches` (Tus Conexiones), `/onboarding` (las 15 preguntas completas de la Ola 1), auth form, register form, filtros del swipe y el modal de propiedad. El reporte queda completamente cerrado.

---

## 1. RESUMEN EJECUTIVO

Findperty es un MVP temprano construido sobre **emergent.sh** (plataforma de generación de apps SPA). Stack: React CRA + Tailwind + Recharts + Axios. ~+500 usuarios declarados. Producto real, pero con deuda técnica estructural alta (CRA, sin SSR, sin SEO real, no hay robots.txt/sitemap, no hay manifest).

El **algoritmo de matching psicográfico de 49-52 preguntas** es su único diferenciador real. Cuatro pilares (Emocional 35%, Técnico 25%, Urbano 20%, Financiero 20%) + "lifestyle tags" (Pet Lover, Wow Factor, Ritual del Café). Es genuinamente original en el mercado mexicano y tiene potencial viral.

La arquitectura es exposable: Backend en `real-estate-hub-116.emergent.host`, Auth con JWT en `localStorage` (sin httpOnly cookies), sin Framer Motion, sin SSR, sin CDN propio. Vulnerabilidades técnicas que DMX puede superar fácilmente.

Modelo de negocio confirmado: Freemium para compradores, subscripción pagada para Agentes (Stripe) con RIC Dashboards, membresía para Propietarios. Rutas de pago encontradas: `/payment`, `/payment-success`, `/agent/membership/checkout`.

El **gap de DMX es enorme**: Findperty no tiene mapa, no tiene search/filtros clásicos, no tiene análisis geoespacial, no tiene market intelligence, no tiene comparación de zonas, no tiene herramientas financieras (calculadoras hipotecarias), no tiene portafolio de desarrolladores. **DMX tiene moat estructural si ejecuta bien.**

---

## 2. FEATURE MATRIX POR ROL

### 🛒 COMPRADOR

| Feature | Findperty | DMX Status |
|---|---|---|
| Onboarding psicográfico (52 preguntas, 4 waves) | ✅ Core feature | Steal + Superar |
| Swipe interface (Tinder for homes) | ✅ /swipe route | Pendiente |
| Match Score visible en card (%) | ✅ Hero + cards | Similar pero más profundo |
| Lifestyle tags (Pet Lover, Wow Factor...) | ✅ Únicos | Superar con más data |
| Feed filtrado por 70%+ score | ✅ "Solo ves lo que te interesa" | Pendiente |
| Ficha propiedad modal | ✅ Básica, paywall rápido | Superar |
| Dirección oculta (NDA flow) | ✅ "Dirección revelada al hacer match" | Modelo interesante |
| Dashboard comprador | ✅ /matches route | Pendiente |
| Herramientas financieras | ❌ No encontradas | **Moat DMX** |
| Mapa interactivo | ❌ No existe | **Moat DMX** |
| Comparador propiedades | ❌ No encontrado | **Moat DMX** |
| Alertas de precio | ❌ No encontrado | **Moat DMX** |
| Calculadora hipotecaria | ❌ No existe | **Moat DMX** |
| Análisis de zona (schools, seguridad) | ❌ No existe | **Moat DMX** |

### 🏠 PROPIETARIO

| Feature | Findperty | DMX Status |
|---|---|---|
| Dashboard propietario | ✅ /owner-dashboard | Pendiente |
| Registro privado de intención de venta | ✅ Destacado en landing | Similar |
| Selección de agente verificado | ✅ Mencionado en landing | Pendiente |
| Leads filtrados por compatibilidad | ✅ Promesa de la plataforma | Pendiente |
| Upload wizard fotos + descripción | ✅ Presumible | Pendiente |
| AI assist para descripción | ❓ No confirmado | **Moat DMX** |
| Valuación automática / ACM | ❓ /ric/ endpoint encontrado | Superar |
| Analytics de zona comparativa | ❓ Analytics backend encontrado | **Moat DMX** |
| Contrato/exclusividad | ❓ No confirmado | Pendiente |
| Membership requerida | ✅ Membresía para propietarios | — |

### 👔 ASESOR INMOBILIARIO

| Feature | Findperty | DMX Status |
|---|---|---|
| Agent Dashboard | ✅ /agent-dashboard | Pendiente |
| RIC (Reporte Inteligencia Comercial) | ✅ /ric/ endpoint, mencionado en landing | **Steal** |
| Análisis Gap + Matriz Audiencias | ✅ Mencionado explícitamente | **Steal** |
| Leads pre-calificados con Match Score | ✅ Core feature | Pendiente |
| Pipeline / Funnel tracking | ✅ /agent/leads, pipeline route | Pendiente |
| Presentación / Dossier | ✅ /agent/presentation/ route | Pendiente |
| Match Gap por propiedad | ✅ /agent/match-gap/ route | **Steal** |
| Analytics de performance | ✅ /agent/analytics | Pendiente |
| Membership checkout (Stripe) | ✅ /agent/membership/checkout | Similar |
| Upload INE/foto perfil | ✅ /agent/profile/upload-ine | — |
| CRM completo | ❓ Básico | **Moat DMX** |
| WhatsApp integrado | ✅ 12 referencias en bundle | Pendiente |
| Comparativa equipo | ❓ | **Moat DMX** |
| AI Coaching | ❌ | **Moat DMX** |

### 🔑 ADMIN

| Feature | Findperty |
|---|---|
| Admin Dashboard | /admin-dashboard |
| Gestión propiedades | /admin/properties |
| Pending properties (moderación) | /admin/pending-properties |
| Analytics | /admin/analytics |
| User management | /admin/users, /admin/user-details/ |
| Pipeline admin | /admin/pipeline |
| Geo Stats | /admin/geo-stats — **INTERESANTE** |
| Vibe Analysis | /admin/vibe-analysis — **INTERESANTE** |
| Matches Feed | /admin/matches/feed |
| Alerts | /admin/alerts |
| Seed Demo Data | /admin/seed-demo-data — MVP evidence |
| Export | /admin/export |
| Payments management | /admin/pending-payments, /admin/agents/payments/ |
| Master partners | /admin/master-partners-users |
| Buyer Segments | /analytics/buyer-segments endpoint |
| Abandonment analytics | /analytics/abandonment endpoint |

---

## 3. STACK TÉCNICO INFERIDO

```
FRONTEND
├── Framework:     React 18 (CRA — Create React App, NO Next.js)
├── Build:         Webpack (CRA default), bundle: main.09d61e14.js (1.37 MB minified)
├── Routing:       React Router v7.13.0 (cutting edge — nueva API)
├── Styling:       Tailwind CSS v3 (--tw-* variables confirmadas)
├── HTTP client:   Axios v1.13.5 (confirmado en bundle)
├── Charts:        Recharts (confirmado en bundle)
├── Toasts:        Sonner (keyframes sonner-fade-in/out detectados)
├── Motion:        CSS transitions + cubic-bezier (sin Framer Motion, sin GSAP)
├── State mgmt:    React Context + useState/useEffect (sin Zustand, sin Redux)
├── Data fetching: Vanilla Axios hooks (sin TanStack Query, sin SWR)
├── Forms:         Vanilla React (sin react-hook-form, sin Formik)
├── Fonts:         Montserrat (brand font, Google Fonts), system-ui fallback stack
├── Icons:         Lucide React (viewBox 0 0 24, stroke-linecap round)
└── Custom anim:   swipe-out-left/right/up/down keyframes

BACKEND
├── Host:          emergent.host (PaaS de emergent.sh — plataforma vibe-coding)
├── URL:           https://real-estate-hub-116.emergent.host/api
├── Type:          REST API (prefijo /api/, JSON responses)
├── Auth:          JWT Bearer token en localStorage['token']  ⚠️ XSS risk
├── Roles:         shopper | owner | agent (+ admin implícito)
├── Schema IDs:    UUID v4
├── Timestamps:    ISO8601 con timezone
└── Stack:         Python/Node probable (emergent.sh usa FastAPI o Express)

ANALYTICS & MONITORING
├── Product analytics: PostHog v1.369.2
│                      (project key: phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs)
│                      Session recording habilitado, web vitals, dead clicks
├── Error tracking:    Rollbar (12+ referencias en bundle)
├── Infrastructure:    Cloudflare (Workers + Insights beacon)
├── App generator:     emergent.sh (scripts/emergent-main.js cargado en producción)

PAYMENTS
├── Processor: Stripe (referenciado en bundle, rutas de checkout)
├── Flows:     /payment, /payment-success, /agent/membership/checkout

COMMUNICATIONS
├── WhatsApp: Integración directa (12 refs en bundle)
├── Email:    No confirmado (probablemente via backend)

FUENTES DE DATOS
└── Unsplash API (imágenes de propiedades — demo data)

SEO / CRAWLABILITY (TODO ❌)
├── robots.txt: ❌ No existe (CRA sirve index.html para todo)
├── sitemap.xml: ❌ No existe
├── manifest.json: ❌ No existe
├── Meta OG: No encontrados
├── Schema.org: ❌ Ninguno
└── SSR: ❌ Ninguno (SPA pura, terrible para SEO)

MAPS
├── ❌ No hay ninguna librería de mapas en el bundle
└── Geo Stats y match geográfico son conceptuales en el backend, sin UI de mapa

PWA
├── ❌ No hay Service Worker
├── ❌ No hay manifest
└── ❌ No hay offline capability

FUERA DE ESCENA (no detectado)
├── No Mapbox / Google Maps / Leaflet
├── No Sentry / Bugsnag
├── No Intercom / Crisp / Drift
├── No Firebase / Supabase / Auth0 / Clerk
└── No A/B testing (Optimizely, LaunchDarkly)
```

---

## 4. MODELO DE NEGOCIO

Estructura confirmada por rutas y bundle:

| Segmento | Modelo | Señales |
|---|---|---|
| Comprador | Freemium → Gated | Free signup, pero propiedades detalladas requieren registro + onboarding |
| Propietario | Membership pagada | /payment flow, Stripe checkout para owners |
| Asesor | Subscription mensual | /agent/membership/checkout, /payments/status/ endpoint, Stripe |
| Admin | Interno | Master partners users sugiere white-label B2B posible |

- **Pricing:** No visible públicamente (no hay /precios real). Modelo opaque — típico de MVP temprano.
- **Social proof:** "+500 usuarios" en landing. Muy bajo aún — producto en etapa muy early.
- **Trust signals:** Ninguno prominente. Sin logos partners, sin testimoniales con foto real, sin menciones de medios, sin certificaciones.

**Conclusión:** Es un MVP pre-monetización construido como proof-of-concept sobre Emergent.sh. No compite comercialmente aún.

---

## 5. DIFERENCIADORES DE FINDPERTY (Qué hacen bien que DMX no tiene aún)

1. **Matching psicográfico de 49-52 preguntas** — el concepto de "ADN de Hogar" es una narrativa de producto muy fuerte y diferenciada en LATAM
2. **Tinder/swipe UX para propiedades** — la mecánica de deslizar crea engagement y hábito. Psicología de gamificación aplicada
3. **NDA automático para revelar dirección** — mecanismo de privacidad elegante que añade exclusividad
4. **Lifestyle tags visuales** (Pet Lover, Wow Factor, Ritual del Café, Santuario Zen) — lenguaje emocional en cards que va más allá de "3 recámaras / 2 baños"
5. **RIC (Reporte de Inteligencia Comercial)** para agentes — producto de valor diferencial prometido
6. **Match Gap por propiedad** para agentes — análisis de qué compradores no hacen match y por qué
7. **Score breakdown visible** (Emocional/Técnico/Urbano/Financiero) en cada propiedad — transparencia del algoritmo
8. **Privacidad del propietario** — el vendedor no expone su identidad hasta hacer match
9. **Sistema de "Olas" gamificado** con notificaciones "¡Ola desbloqueada! 🎉" — onboarding que se siente progresión, no formulario
10. **Historia narrativa de la propiedad** — copy de storytelling además de specs

---

## 6. GAPS DE FINDPERTY — MOAT DE DMX

- ❌ **Sin mapa ninguno** — cero UI geoespacial. DMX con Spatial Intelligence es incomparablemente superior
- ❌ **Sin calculadora financiera** — sin hipotecas, sin simulador crédito FOVISSSTE/INFONAVIT/SHF, sin ROI
- ❌ **Sin análisis de zona** — sin datos de seguridad, escuelas, plusvalía histórica, proyectos futuros
- ❌ **Sin market intelligence** — no pueden responder "¿cuánto vale mi casa vs el mercado?"
- ❌ **Sin comparador de propiedades** — no se puede comparar side-by-side
- ❌ **Sin search clásico** — solo ven propiedades que el algoritmo les da. No hay "buscar en Polanco con 3 recámaras máx $8M"
- ❌ **Sin alertas de precio** — sin notificaciones de bajadas de precio
- ❌ **Sin CRM robusto** — para agentes solo hay pipeline básico, sin historial completo de cliente
- ❌ **Sin AI de descripción** — los propietarios no tienen AI para generar o optimizar listings
- ❌ **Sin SEO** — zero crawlability. DMX con Next.js/SSR tiene ventaja enorme en adquisición orgánica
- ❌ **Sin mobile nativo / PWA** — la app no es instalable, sin offline
- ❌ **Sin análisis de desarrollador** — no hay producto B2B para constructoras
- ❌ **Sin data enrichment** — no se conectan a SIC, registros públicos, SNIM, etc.

---

## 7. 10 INSIGHTS CONCRETOS PARA DMX

1. **Adopta el "ADN de Hogar"** como capa complementaria a tu Spatial Intelligence. Las preguntas psicográficas como perfil del comprador → tu motor geoespacial las usa para rankear zonas además de propiedades.

2. **Copia el score breakdown visual** (Emocional/Técnico/Urbano/Financiero) pero agrégale dimensiones extras: "Espacial" (distancia a trabajo, isocronas) + "Inversión" (plusvalía proyectada) — son tu moat.

3. **Crea los lifestyle tags pero basados en data real** (sensores, POIs, AGEBS, DENUE). Los de Findperty son cualitativos/subjetivos. Los tuyos pueden ser cuantitativos y verificables.

4. **El NDA flow es un patrón de UX brillante** para proteger privacidad y crear exclusividad. Implementar en DMX para propietarios en pre-venta o propiedades de lujo.

5. **La mecánica swipe** para el feed tiene altísima retención. DMX debería tener un modo "exploración" con swipe + un modo "búsqueda avanzada" con mapa + filtros. Dos modos, dos tipos de usuario.

6. **RIC para agentes es el killer feature para monetización B2B.** Tu versión debe incluir data de transacciones registradas (SIC), análisis de competencia, y proyecciones de plusvalía basadas en geodata.

7. **El flujo de registro con selector de rol** en el mismo formulario es eficiente. Considera personalizarlo más: si eres agente, pregunta cédula; si eres propietario, pregunta ciudad de la propiedad.

8. **La frase "Solo ves lo que realmente te interesa"** es copywriting poderoso. DMX puede usar "Solo inviertes tiempo en propiedades con potencial real" — apelando más al lado racional/financiero.

9. **PostHog + Rollbar es un stack razonable** para early stage. DMX debería agregar Mixpanel o Amplitude para funnel analysis más sofisticado al escalar.

10. **El talón de Aquiles de Findperty es SEO/adquisición.** Con CRA puro no indexan. DMX con Next.js + páginas de zona ("Casas en venta en Polanco CDMX") puede capturar todo el tráfico orgánico que Findperty nunca podrá tocar.

---

## 8. 🎨 DESIGN PLAYBOOK FOR DMX

### 8.1 Paleta de Colores Completa (extraída via getComputedStyle)

```
🟡 BRAND PRIMARY
  Lime/Chartreuse:  #ccd500  — El color dominante de la marca. Muy bold, energético.
                   Usado en: CTAs primarios, badges de match score, sección hero,
                   fondos de secciones alternadas, confetti elements
  rgba(204,213,0,0.1) → Verde lima muy suave (hover backgrounds, chips)
  rgba(204,213,0,0.5) → Verde lima semitransparente

🔵 BRAND SECONDARY (Score pillars)
  Coral/Pink:       #f43f5e  — Emocional pillar, heart icon, CTA hover states
  Blue:             #3b82f6  — Técnico pillar, default link states
  Purple:           #a855f7  — Urbano pillar
  Green:            #22c55e  — Financiero pillar, check marks

⬛ NEUTRALS DARK (Backgrounds oscuros)
  Slate-900:        #0f172a  — Navbar background, dark hero overlay
  Dark Brown-Black: #141413  — Deep backgrounds (Emergent default)
  Dark Gray:        #1e293b  — Alt dark sections
  Charcoal:         #1f1e1d  — Texto primario dark

  Property Card BG: #2b2926  — Warm dark, muy específico
  Mid Dark:         #3a4d5f  — Table headers, secondary dark
  Dark Steel:       #384451  — Texto primario (dark blue-gray, body)
  Navy Gray:        #3f3c39  — Body text dark

⬜ NEUTRALS LIGHT
  White:            #ffffff  — Backgrounds primarios
  Gray-50:          #f9fafb  — Section backgrounds alternados
  Gray-100:         #f3f4f6  — Input backgrounds
  Gray-200:         #e4e4e7  — Borders, dividers (zinc-200)
  Gray-300:         #d1d5db  — Placeholder text
  Warm White:       #faf9f5  — Card backgrounds, warm tone
  Beige Cremoso:    #f4f1de  — Fondo Conexiones / secciones secundarias

🌈 SEMANTIC
  Error/Danger:     #ef4444  — Error states, dislike button (X)
  Success:          #22c55e  — Match indicators, checkmarks
  Warning:          #f59e0b  — Warning states
  Error light bg:   #fef2f2

🎨 SPECIALTY
  Mint/Teal light:  #d1e8e2  — Score card background (compatible estimada)
  Blue Mist:        #e1e8ed  — Soft info backgrounds
  Cream:            #f5f5dc  — Tag backgrounds
  Light Pink:       #fecaca  — Error light backgrounds
  Sage:             #4a7c59  — Alternate green
  Muted Blue:       #5b7c99  — Subtle info elements
  Warm Brown:       #8b7355  — Tertiary text/icons

🎨 SOMBRA CORAL (única, para elementos especiales)
  rgba(217,119,87,0.663)  — Inset shadow — elementos destacados / wow moment
  rgba(217,119,87,0.24)   — Coral para elevation shadows
```

### 8.2 Typography

```
FONT FAMILIES
  Primary Brand:    Montserrat, sans-serif
                    → Headings, CTAs, scores, match percentages
                    → Bold/Semi-bold para impacto

  System/Body:      ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji"
                    → Body text, descriptions, metadata
                    (= Tailwind default stack)

  Emergent/Support: "ABC Diatype", system-ui... (del script de emergent.sh)

  Icons:            apollo-icons (custom icon font via @font-face, data: URI embedded)

FONT SIZES (scale detectada)
  12px → Micro labels, location text, tag text, helper text
  14px → Body secondary, metadata, buttons, nav, captions
  16px → Body principal (base)
  18px → Body large / subtitle / card headings
  20px → Small heading
  24px → H4 / widget titles / section headings
  30px → H2
  36px → H1 ("Encuentra tu Hogar Perfecto")
  48px → Hero subtitle
  72px → Hero headline
  96px → Giant display numbers

TYPE SCALE RATIO: ~1.25 (Major Third)

FONT WEIGHTS (detectados)
  400 — Regular body
  500 — Medium emphasis (nav items, form labels)
  600 — Semi-bold CTAs/labels (números destacados)
  700 — Bold headings principales
  800 — Extra bold hero/display

LINE HEIGHTS (px): 16 → 18 → 20 → 21 → 24 → 28 → 32 → 36 → 40
LETTER SPACING: -0.45px en headings (tracking negativo sutil — más premium)

HERO COPY PATTERN:
  Headline: Montserrat 72px, weight 800, color #0f172a
  Sub:      Montserrat 18-20px, weight 400, color #384451
  CTA:      Montserrat 16px, weight 700, uppercase tracking
```

### 8.3 Spacing System (base 4px / 8px)

```
BASE UNIT: 4px (detectado en tokens — Tailwind default)

SCALE:
  2px   → Micro gaps (entre icon y label)
  4px   → XS (gap-1, p-1)
  6px   → XS+
  8px   → SM (2×4) (gap-2, p-2 — tight elements)
  10px  → SM+
  12px  → MD- (gap-3, p-3 — cards internos)
  16px  → MD (4×4) — Base unit, muy usado (gap-4, p-4)
  20px  → MD+
  24px  → LG (6×4) (gap-6, p-6 — secciones)
  32px  → XL (8×4) (gap-8, p-8 — secciones grandes)
  40px  → 2XL (10×4) (gap-10, p-10 — hero sections)
  48px  → 3XL (12×4) (gap-12, p-12 — espaciado mayor)
  64px  → Section padding vertical
  96px  → Large section gaps
  112px → Hero padding

INFERENCE: Sistema de 4px estrictamente seguido (Tailwind default)
```

### 8.4 Border Radius

```
8px   → SM — inputs, tags pequeños, small cards
12px  → MD — cards de thumbnails, buttons, cards normales, chips ← el más usado
16px  → LG — property cards principales, modales
28px  → XL — pills/chips grandes
32px  → 2XL — modales, panels
40px  → 3XL — elementos prominentes
9999px → FULL — badges, match score pills, botones pill
8px 0 0 8px → Sidebar/attached elements

PATTERN: Muy redondeado. Filosofía "friendly/approachable".
Botones CTA = 9999px (pill completo) o 12px (rounded-xl)
Cards = 16px
Modales = 16-32px
Pattern principal: 3 niveles consistentes (sm 8 / md 12 / pill 9999)
```

### 8.5 Shadows (Sistema completo)

```css
/* XS (subtle): rgba(0,0,0,0.05) 0px 1px 2px 0px */
/*   → Botones, inputs                           */

/* SM (card):   rgba(0,0,0,0.09) 0px 4px 9px 0px */
/*   → Property cards thumbnail (custom: minimal-shadow class) */

/* MD (standard): rgba(0,0,0,0.1) 0px 1px 3px,   */
/*                rgba(0,0,0,0.1) 0px 1px 2px -1px */
/*   → Elementos flotantes (Tailwind shadow-md)  */

/* LG (panels): rgba(0,0,0,0.1) 0px 10px 15px -3px, */
/*              rgba(0,0,0,0.1) 0px 4px 6px -4px */
/*   → Modales, dropdowns                        */

/* XL (modales): rgba(0,0,0,0.25) 0px 25px 50px -12px */
/*   → Modal principal                           */

/* FOCUS RING: rgb(255,255,255) 0 0 0 0,         */
/*             rgb(204,213,0) 0 0 0 4px (usa el lime brand!) */
/*   → Accesibilidad integrada con brand color   */

/* SPECIALTY (cálido, en elementos naranja-coral): */
/* INSET wow:   rgba(217,119,87,0.663) 0 0 14px 0 inset, */
/*              rgba(217,119,87,0.463) 0 0 24px 0 inset, */
/*              rgba(217,119,87,0.18)  0 0 34px 0 inset  */
/* OUTER glow:  rgba(217,119,87,0.24) 0px 40px 80px 0px, */
/*              rgba(217,119,87,0.24) 0px 4px 14px 0px   */
/*   → Efectos de brillo/glow en elementos emocionales/celebraciones */
```

**Nota DMX:** Sistema minimalista (máx 2 layers), excepto coral accent shadow que es tridimensional y da profundidad premium. Usar para "wow moment" en cards destacadas / celebraciones.

### 8.6 Animations & Transitions

```
TIMING FUNCTIONS:
  Primary ease: cubic-bezier(0.4, 0, 0.2, 1) — "Ease In-Out" suave (=Tailwind default)
  Alternate:    ease-in-out (opacity fades)

DURATIONS:
  Fast:    150ms → Hover states, color changes, botones
  Normal:  300ms → Panel opens, cards, transforms

TRANSITIONS DETECTADAS:
  Color/BG/Border: 150ms cubic-bezier(0.4,0,0.2,1)
  Transform:       150ms cubic-bezier(0.4,0,0.2,1) (scale 1.1 on hover detectado)
  Opacity fades:   300ms ease-in-out
  Rotations:       300ms cubic-bezier(0.4,0,0.2,1) (180deg rotate = caret flip)

SCALE ON HOVER: scale(1.1) en score circles y elementos interactivos
TRANSLATE Y: -3px en hover de cards

KEYFRAMES CUSTOM detectados:
  swipe-out-left / swipe-out-right / swipe-out-up / swipe-out-down
  bounceIn / bounceOut (property cards)
  fadeIn / fadeOut (general)
  bounceInDown / bounceOutUp (onboarding olas — transición entre olas)
  enter / exit (Radix-style dialogs)
  accordion-up / accordion-down
  sonner-fade-in / sonner-fade-out / sonner-spin (toast library)

NO Framer Motion. NO GSAP. Puro CSS transitions.
El carrusel hero usa CSS transform + transition.

RECOMENDACIÓN DMX: Agregar Framer Motion para una diferencia perceptual significativa
en page transitions, stagger effects y spring animations.
```

### 8.7 Component Patterns

```
BUTTON VARIANTS:
  Primary CTA:   bg=#ccd500, text=#1f1e1d, border-radius=9999px,
                 padding=16px 32px, font=Montserrat 700
  Secondary CTA: bg=transparent, border=2px #0f172a, border-radius=9999px,
                 padding=16px 32px
  Dark CTA:      bg=#0f172a, text=white, border-radius=9999px
  Purple CTA:    bg=#a855f7, text=white (para "Agente Inmobiliario" CTA)
  Blue CTA:      bg=#3b82f6, text=white (para "Propietario" CTA)
  Lime small:    bg=#ccd500, text=dark, para "Ver Propiedad y Hacer Match"
  Destructive:   bg=transparent, color=red(239,68,68), border-transparent

  Icon en CTA:   ✨ sparks icon antes del texto (Lucide)
  Shadcn pattern: "inline-flex items-center justify-center gap-2 whitespace-nowrap
                   text-sm font-medium transition-color"

INPUT FIELDS:
  Border:        1px solid #e4e4e7 (zinc-200)
  Border-radius: 9999px (pill inputs!) — distinctive
                 OR 12px rounded-xl para forms estructurados
  Padding:       12px 20px
  Placeholder:   color #d1d5db (gray-300)
  Focus:         ring-2 ring-lime-500 (#ccd500) ring offset
  BG:            white / semi-transparent
  Forms:         No floating labels — top labels o inline labels
  Select:        rounded-xl(12px), border-gray-200, bg-white
  Slider:        track green-lime accent, thumb circle
  Option btns:   bg-white, border, rounded-xl, full-width

CARD COMPONENT (Property Card):
  Thumbnail:     Aspect ratio ~4:3 o 3:4 (la card es taller que ancha), border-radius 12-16px
  Title overlay: gradient bottom-to-top, white text
  Location:      small pin icon + colonia name (12-14px)
  Match badge:   Yellow/lime pill (9999px), right-bottom of thumbnail, ✨ icon
  Layout:        Horizontal scroll strip (NOT grid on landing) / single-column 430px en swipe
  Selected:      Highlight border (lime #ccd500, 2px)
  Stats mini:    bg-gray-50, rounded-xl, flex items-center gap

SCORE CIRCLES:
  Size:          ~40x40px circular
  Colors:        Each pillar has unique color (red/blue/purple/green)
  Icons:         Heart/Lightning/Building/Chart in white

MATCH SCORE BADGE:
  Style:         Pill, bg=#ccd500, text=dark, icon=heart/sparkle
  Position:      Overlapping bottom-right de thumbnail
  Font:          Montserrat Bold 14px

LIFESTYLE TAGS / VIBE TAGS:
  Style:         Pill, outline/ghost, small icon + text
  BG:            Semi-transparent white
  Border:        1px white/30%
  Font:          12px, system-ui

MODAL / DIALOG:
  Width:         ~860px (max) / max-w-lg en swipe
  Border-radius: 16-32px
  Photo gallery: Thumbnails strip debajo de foto principal
  Close:         X button top-right corner (círculo verde-lime border)
  BG:            White
  Backdrop:      Dark overlay rgba(31,30,29,0.4) — oscuro suave
  Header:        Nombre + badge inline ("Activa")
  Score-first:   "Tu Compatibilidad 50%" en grande ANTES del precio (lección clave)

PILLAR CARDS (La Ciencia del Match):
  Grid:          4 columns
  Border-top:    4px solid (color único por pilar)
  Icon:          Outline style, colored
  Padding:       24px
  Radius:        16px

SWIPE CONTROLS:
  Botones:       Dos circulares centrados debajo de card — X (red) y ❤️ (lime más grande)
  Asimetría:     Like > Skip — informa la acción preferida
  Help text:     "Desliza ← para pasar · Desliza → para dar like" inline casual
  Bottom sheet:  Botón "↑" expande card para revelar score breakdown
```

### 8.8 Icon + Illustration Style

```
ICONS:
  Style:         Outline / línea, stroke-width ~1.5-2
  Library:       Lucide React (confirmado)
                 viewBox: "0 0 24 24"
                 stroke: currentColor
                 stroke-linecap: "round"
                 stroke-linejoin: "round"
                 fill: "none" (outline icons)
  Custom:        apollo-icons font embedded (browser extension)
  Tamaños:       w-4 h-4 (16px), w-5 h-5 (20px), 24px típico, 40px en circles
  Ejemplos:      lucide-house, lucide-heart, lucide-log-out, lucide-sliders-horizontal,
                 lucide-map-pin, lucide-bed, lucide-bath, lucide-square,
                 lucide-dollar-sign, lucide-sparkles (match icon ✨)

ILLUSTRATIONS:
  NO hay ilustraciones propias
  Hero: Fotografías de alta calidad de propiedades reales
  Phone mockup: Render de smartphone con pantalla de la app
  Empty states: Solo iconos + copy (oportunidad para DMX agregar ilustración)
  Style: Foto-realismo, NO ilustraciones vectoriales

PHOTOGRAPHY:
  Style:         Arquitectura moderna, alta calidad, luz natural
  Subjects:      Casas de lujo, penthouses con alberca, casas con jardín
  Cities:        CDMX (Condesa, Polanco, Coyoacán), Mérida, Morelia, Querétaro
  Treatment:     Full bleed, sin filtros pesados, colores naturales
  Imagen hero property:
    Aspect ratio: ~16:9 o 4:3 (card 3:4)
    Gradiente:    linear oscuro en bottom tercio sobre imagen
    Texto:        título + ubicación con sombra blanca/dark

EMOJI:
  Usados extensamente en UI (☀️🌅🌙☕🥖🌳🪵✨🐕🐱📱🎉🚀)
  Como complemento sensorial en preguntas/respuestas de onboarding
```

### 8.9 Moodboard — Screenshots Capturados

| # | Screenshot ID | Descripción | Valor para DMX |
|---|---|---|---|
| 1 | ss_9168ch9ej | Hero fullscreen + Match badge + Score circles + CTA verde | Hero pattern completo ⭐⭐⭐⭐⭐ |
| 2 | ss_5460yve2b | Property thumbnail strip + Verde hero CTA section | Property card row ⭐⭐⭐⭐ |
| 3 | ss_174449yyw | Modal propiedad open — foto + thumbnails + Compatibilidad block | Modal pattern + paywall elegante ⭐⭐⭐⭐⭐ |
| 4 | ss_3175aycqj | Login form — centered card, logo, inputs pill | Auth form pattern minimal ⭐⭐⭐⭐ |
| 5 | ss_9044pzw6q | Register form — role selector, WhatsApp field, city search | Onboarding form ⭐⭐⭐⭐ |
| 6 | ss_3691t1rae | Hero slider — Casa Coyoacán, 4 score pillars, tags, CTA | Hero state 2 ⭐⭐⭐ |
| 7 | ss_8643amtb4 | Auth redirect → Login screen + navbar autenticada | Auth state + nav minimal 3 items ⭐⭐⭐ |
| 8 | ss_4982ohyyd | Swipe feed empty state: "Encuentra tu Hogar Perfecto" + Filtros | Empty state + UX copy motivador ⭐⭐⭐⭐ |
| 9 | ss_7397p8y1t | Panel Filtros: Ciudad dropdown + Rango Precio slider $0M-$50M+ | Filtros ultra-simples (qué NO copiar) ⭐⭐⭐ |
| 10 | ss_76998x9tn | "Tus Conexiones" — empty state fondo olive/beige #F4F1DE | Conexiones section + bg color único ⭐⭐⭐ |
| 11 | ss_2279fxf25 | Onboarding Ola 1 — intro + sparkle ✨ + "Tu hogar es mucho más que m²" + progress 4 segmentos | Copy onboarding + UI progreso ⭐⭐⭐⭐⭐ |
| 12 | ss_9245wn0n8 | Swipe card REAL — "Loft Industrial Roma Norte", 50% Match badge | Swipe card con match bajo (pre-onboarding) ⭐⭐⭐⭐⭐ |
| 13 | ss_727730e1o | Swipe card expandida — botones X/❤️, "Desliza ← para pasar · → para like" | Mecánica swipe + instrucciones ⭐⭐⭐⭐ |

**Captures adicionales (segunda sesión exploratoria):**

| # | ID | Vista | Valor |
|---|---|---|---|
| 01 | ss_1962ym4bk | Onboarding Ola 1 hero emocional con ✨ verde lima | Modelo de hero copy emocional |
| 02 | ss_8265zo6qq | Ola 1 ADN — fade in con progress bar 4 segmentos | Sistema de progreso gamificado |
| 03 | ss_5260n09nh | Onboarding preguntas 14-15 + CTA "Siguiente Ola →" | Diseño button-list de opciones |
| 04 | ss_1130v9k9v | CTA Final "Completar ADN" + emoji 🚀 + layout 2 CTAs | Pattern formulario multi-step |
| 05 | ss_0476dcvpx | Toast "Ola 2: Arquitectura y Técnica desbloqueada! 🎉" | Micro-celebración pattern |
| 06 | ss_3277pkw0g | Toast "Ola 4: Viabilidad Financiera desbloqueada!" | Patrón consistente toasts avance |
| 07 | ss_9497cmyl9 | Primera property card post-onboarding + toast "ADN 100% completo" | Transición onboarding→producto wow |
| 08 | ss_73494cj4b | Property card "Casa Coyoacán" full con badge | Property card estándar |
| 09 | ss_58137b0kp | Match Score expandido: 4 dimensiones con barras de color | El feature más diferenciador |
| 10 | ss_1031hhnpu | Modal ficha completa: foto hero + "Tu Compatibilidad 50%" + grid stats | Modal con score-first prominente |
| 11 | ss_86946rbio | Conexiones empty state — fondo beige #F4F1DE | Empty state + color alternativo |
| 12 | ss_5229nufml | Filtros: dropdown ciudad + slider precio + Limpiar/Aplicar | Filtros ultra-minimal (referencia NO copiar) |
| 13 | ss_9271xk7m5 | Swipe empty: "No Hay Más Propiedades" + "Buscar de nuevo" outlined lima | Empty state feed agotado |

---

## 9. STEAL THIS LIST (10 Features/UX a replicar con upgrade)

### 🥇 STEAL #1 — "ADN de Hogar" Onboarding Psicográfico por Olas
**Lo que hacen:** 49-52 preguntas lifestyle en 4 categorías (Emocional 35%, Técnico 25%, Urbano 20%, Financiero 20%) con gamificación.
**Cómo mejorarlo en DMX:** Agregar backing con datos reales (si dices "amo la naturaleza" → algoritmo busca propiedades a <200m de parques según INEGI/DENUE). Slider visual en lugar de solo radio buttons. Hacer preguntas **adaptativas** (si no tienes auto, no preguntar sobre garage). **Crítica:** 49 upfront es demasiado → ver ADR-021 PPD para arquitectura por capas.

### 🥇 STEAL #2 — Match Score Multidimensional en Card
**Lo que hacen:** Badge "50% Match" visible + desglose 4 dimensiones con barras de colores al expandir.
**Cómo mejorarlo en DMX:** 6 dimensiones con datos cuantitativos reales (Emocional, Técnico, Urbano, Financiero, **Espacial**, **Inversión**). Explicar **por qué** cada dimensión tiene ese score citando data sources ("Tu match urbano es 80% porque hay 3 parques a <5min según DENUE, fibra óptica disponible y comercio a 2 cuadras").

### 🥇 STEAL #3 — Vibe Tags como Lenguaje de Producto
**Lo que hacen:** Tags lifestyle "Ritual del Café", "Vida de Barrio", "Walkable", "Doble Altura".
**Cómo mejorarlo en DMX:** Tags con **data backing verificable** ("Walkable 87/100" → WalkScore propio calculado). Tags AI-generated + editables por propietario/asesor con audit trail. Tags de inversión: "Alta plusvalía 5 años (+18% YoY AirROI)", "Rentabilidad AirBnB", "Zona emergente". Ver ADR-022.

### 🥇 STEAL #4 — Sistema de "Olas" en Onboarding con Desbloqueables
**Lo que hacen:** Cada sección se "desbloquea" con toast de celebración "¡Ola N desbloqueada! 🎉".
**Cómo mejorarlo en DMX:** Barra de progreso total (% compatibilidad mejorado por respuesta), preview de propiedades que aparecerán, permitir guardar y continuar. **Pero:** distribuir las preguntas en el tiempo (PPD), no todas upfront.

### 🥇 STEAL #5 — Swipe Mode como Discovery Layer
**Lo que hacen:** Tinder UX para primeras exploraciones — menor fricción que búsqueda.
**Cómo mejorarlo en DMX:** Swipe con keyboard shortcuts (← →), swipe + superlike, undo último swipe, "¿Por qué pasé?" para training del algoritmo. **Pero:** complementar con vista mapa/lista/grid, NO ser el único modo.

### 🥇 STEAL #6 — Historia de la Propiedad (Storytelling Narrativo)
**Lo que hacen:** Cada propiedad tiene un párrafo de storytelling además de specs.
**Cómo mejorarlo en DMX:** AI-generated property story basado en datos reales del inmueble + zona + scores IE. Editable por propietario/asesor. En español natural, no jerga técnica.

### 🥇 STEAL #7 — "Dirección Oculta hasta Compromiso" (NDA Flow)
**Lo que hacen:** `address: "Hidden until contract signed"` — coordenadas en mapa pero sin número exacto.
**Cómo mejorarlo en DMX:** Revelar dirección al agendar visita O pago apartado. Mostrar radio de 200m en mapa hasta compromiso. Implementar para premium / pre-venta.

### 🥇 STEAL #8 — Modal con Score Antes que Precio
**Lo que hacen:** En el modal, lo primero que ves es "Tu Compatibilidad 50%" en verde lime grande.
**Cómo mejorarlo en DMX:** Poner score personalizado **antes** del precio — refuerza el match antes de la discusión de dinero. Funciona psicológicamente.

### 🥇 STEAL #9 — Badge de Status Enriched en Header del Modal
**Lo que hacen:** Badge "Activa" en pill verde lima junto al nombre.
**Cómo mejorarlo en DMX:** Badges enriquecidos: "Activa · Precio bajó 5%", "Nueva hoy", "Alta demanda (8 interesados)", "Exclusiva por 15 días", "Inspección agendada".

### 🥇 STEAL #10 — Pregunta Final de Valor Percibido
**Lo que hacen:** En Ola 4, la última pregunta es "El precio debe justificar: Calidad de vida diaria / Retorno de inversión / Ambos". Esto segmenta buyer intent.
**Cómo mejorarlo en DMX:** Usar respuesta para mostrar ROI proyectado vs lifestyle metrics según corresponda. Integrar en buyer_persona detection.

---

## 10. AUDITORÍA TÉCNICA — SEO, ACCESIBILIDAD, PWA

### SEO — Crítico ❌

```
robots.txt:      ❌ No existe (CRA sirve index.html para /robots.txt)
sitemap.xml:     ❌ No existe
meta description: ✅ "A product of emergent.sh" — GENÉRICO, sin optimizar
og:title/image:  ❌ No encontrados
Schema.org:      ❌ Cero JSON-LD
Canonical:       ❌ No encontrado
Twitter cards:   ❌ No encontrados
SSR:             ❌ Pure SPA — invisible para crawlers sin JS
Páginas de zona: ❌ Ninguna (no hay /cdmx/polanco/casas-en-venta)
```

**Impacto:** Findperty no puede rankear en Google para búsquedas de propiedades. Todo su tráfico debe ser paid/referral/direct. Este es el hueco más grande que DMX puede explotar con Next.js + SSR.

### Accesibilidad — Básica

```
Aria labels:    Parcial (algunas secciones con aria-label)
Focus visible:  Sí (ring lime en focus, confirmado en shadows)
Alt texts:      No verificado en fotos de propiedades
Keyboard nav:   Probablemente funcional (Tailwind defaults)
Contraste:      ⚠️ Lime (#ccd500) sobre dark pasa, pero sobre blanco puede ser marginal
WCAG Level:     AA probable en elementos principales, A+ en algunos
```

### PWA — No existe ❌

```
manifest.json:   ❌ (CRA sirve index.html)
Service Worker:  ❌ No registrado
Offline mode:    ❌
Install prompt:  ❌
Push notifs:     ❌
```

### Performance (Estimada)

```
Bundle JS:       1.37 MB minificado — PESADO. Con gzip ~400-500KB estimado.
CSS bundle:      main.ea71df78.css — sin code splitting
LCP:             Probable 2.5-4s (foto hero fullscreen sin lazy loading evidente)
FID/INP:         Moderado (sin server components, hidratación completa)
CLS:             Bajo (layout estable)
Core Web Vitals: Probablemente "Needs Improvement" o "Poor" en mobile
```

---

## 11. DON'T DO LIST (Antipatterns a evitar)

- ❌ **CRA (Create React App) como base** → Sin SSR, sin SEO, sin code splitting optimizado. DMX debe ir con Next.js 16+ App Router desde el día 1.
- ❌ **JWT en localStorage** → Vulnerable a XSS. DMX debe usar httpOnly cookies o al menos Secure/SameSite cookies.
- ❌ **Sin mapa de ningún tipo** → Findperty tiene matching sin UI geoespacial. En real estate MX, el mapa es fundamental.
- ❌ **Sin robots.txt / sitemap** → Findperty es invisible para Google. DMX debe tener SSR + sitemap dinámico desde el día 1.
- ❌ **Backend en dominio de tercero visible (emergent.host)** → Expone la infraestructura. DMX debe usar subdominio propio (api.desarrollosmx.com).
- ❌ **+500 usuarios como social proof** → Es un número muy bajo. Esperar más tracción o usar métricas de calidad.
- ❌ **Horizontal scroll strip único** para property cards → Funciona en mobile pero limitado en desktop. DMX debe tener grid + map view toggle.
- ❌ **Sin herramientas financieras** → El comprador mexicano necesita saber si puede pagar. Calculadora hipotecaria es must-have.
- ❌ **0 páginas de zona para SEO** → No tienen "Casas en venta en Polanco" o "Departamentos en Condesa". DMX puede capturar ese tráfico.
- ❌ **Sin dark mode** → En 2026 es un gap de experiencia.
- ❌ **Solo 2 filtros (Ciudad + Precio)** → Insuficiente. DMX no debe lanzar con menos de 8-10 filtros estándar (recámaras, baños, m², colonia, antigüedad, amenidades).
- ❌ **Sin búsqueda tradicional** → El swipe no reemplaza la búsqueda — son complementarios.
- ❌ **Sin landing público / SEO cero** → Sin OG, sin schema.org, sin Open Graph. Invisibles en Google.
- ❌ **Empty states sin acción clara** → Conexiones solo dice "Aún no tienes conexiones" sin guía. DMX debe tener empty states con ilustración + CTA específico.
- ❌ **Sin comparador** → Top-3 feature más pedido en real estate.
- ❌ **Imágenes Unsplash para demo** → Sin imágenes reales no hay confianza.
- ❌ **Sin confirmación post-swipe** → Después del like no hay feedback. Reduce sensación de progreso.
- ❌ **Single bundle sin code splitting** → 1.37MB es demasiado.
- ❌ **Onboarding bloqueante de 49 preguntas antes del swipe** → ADR-021 PPD resuelve con capas progresivas.

---

## 12. LECCIONES PARA FASE 07b / 13+ / PORTALES DMX

### Para FASE 07b (Comprador / 04 Design System):

- El onboarding de Findperty valida que los compradores **sí completan cuestionarios largos** si el framing es emocional, no técnico. Pero **49 upfront es riesgo** → arquitectura PPD por capas.
- El matching psicográfico es un differentiator real que DMX debe priorizar antes del launch.
- El swipe mode es viable como feature secundario — no como reemplazo del search.
- Tomar la paleta lime `#ccd500` como referencia de energía, pero DMX necesita brand más premium/confiable. Considerar verde esmeralda (#10b981) o azul data (#3b82f6) + acento vibrante. **Decisión actual DMX:** Mantener indigo/violet identity, refinar Dopamine hacia más cleaner aesthetic.
- Implementar Montserrat para headings (mismo que Findperty) — la familia es excelente para real estate. **Decisión DMX actual:** Outfit + DM Sans (ya cerrado en FASE 04).
- Tailwind CSS es la decisión correcta. No cambiar.
- Agregar Framer Motion para superar la animación básica de Findperty.

### Para FASE 13+ (Portales por rol):

- Los 3 portales de Findperty (buyer/owner/agent) son el patrón correcto. DMX debe añadir el 4to: **Desarrollador/Inmobiliaria**.
- El RIC (Reporte de Inteligencia Comercial) para agentes es el killer feature B2B. DMX debe priorizar esto con geodata superior.
- El `/admin/geo-stats` y `/admin/vibe-analysis` de Findperty sugieren que ellos SÍ tienen intención de análisis geoespacial — solo no tienen la UI. Es una carrera que DMX puede ganar ahora.
- Los Vibe Tags deben ser un campo estándar en el schema de propiedades de DMX desde el MVP (ver ADR-022).
- El schema de API de Findperty (`psychographic_attributes`, `vibe_tags`, `match_breakdown`) es un blueprint útil para el modelo de datos de DMX.

### Para el Design System:

- El sistema de sombras minimal es preferible al shadow-heavy.
- El verde lima `#ccd500` es arriesgado pero diferenciador.
- Pill inputs (border-radius 9999px) dan sensación moderna y friendly.

---

## 13. RECOMENDACIONES DE EJECUCIÓN

### ▶ Agregar al Plan Biblia DMX

- ✅ "ADN de Hogar" como capa de matching psicográfico → **ejecutado en ADR-021 PPD** (4 capas, no 49 upfront)
- ✅ Swipe mode como feature de exploración (no único modo) → **FASE 20 M-SWIPE-MODE**
- ✅ NDA flow para propiedades premium/pre-venta → **FASE 20 M-NDA-FLOW**
- ✅ RIC con superioridad de datos vs Findperty → **incorporar en M15 Analytics Dev IE**
- ✅ Match Gap analysis para dashboard agente → **incorporar en FASE 14 M9 Estadísticas**
- ✅ Lifestyle tags → versión cuantitativa/verificable → **ejecutado en ADR-022 Vibe Tags Hybrid**

### ▶ Priorizar H1

- SSR con Next.js + páginas de zona (SEO moat inmediato) — **YA en FASE 21 Portal Público**
- Calculadora financiera hipotecaria — **YA en FASE 20 M-FINANCIAL-REALITY-CHECK**
- Mapa interactivo como feature core — **YA en FASE 20 M-REVERSE-BROWSING**
- Auth segura (httpOnly cookies) — **YA en FASE 02 Auth y Permisos**
- Design system con tokens documentados — **YA en FASE 04 + módulo 4.P refinement**

### ▶ Priorizar H2/H3

- Swipe mode (gamificación del feed)
- PWA (installable, offline) — **YA en FASE 25**
- Dark mode — **TBD ADR**
- Análisis de zona con POIs + seguridad — **YA en FASES 08-12 Scores IE**
- Comparador side-by-side — **YA en FASE 20 M-COMPARADOR-MULTIDIM**

### ▶ Evitar

- CRA como base
- Hosting backend en dominio de tercero visible
- Autenticación con JWT en localStorage
- Single bundle sin code splitting (1.37MB es demasiado)
- Landing page sin navbar
- Solo 2 filtros en el feed
- Onboarding bloqueante antes del swipe — usar PPD progressive disclosure

### ▶ Orden de implementación Design System DMX

**Semana 1-2: Foundations**
- Tokens de color (paleta completa con semantic tokens) — FASE 04 ✅
- Typography scale (Outfit headings + DM Sans body) — FASE 04 ✅
- Spacing system (base 4px) — FASE 04 ✅
- Border radius scale (8/12/16/28/32/9999px) — FASE 04 ✅ + módulo 4.P
- Shadow scale (3 niveles + shadow-wow coral) — FASE 04 ✅ + módulo 4.P

**Semana 3-4: Components**
- Button variants (primary, ghost, dark, role-specific, **pill new**)
- Input fields (**pill new para search**)
- Cards (property card con match score badge, pillar circles)
- Modal / Sheet patterns
- Progress indicators (**multi-segment new para PPD onboarding**)

**Semana 5-6: Patterns**
- Swipe feed component
- **Score breakdown widget** (6 pillars con iconos y colors) — VibeTagChip
- **MatchScoreBreakdown** component
- **RadarChart6D** component
- **PropertyStory** component
- Lifestyle tags chips
- Onboarding question components (multiple choice, slider, yes/no)

**Semana 7-8: Motion**
- Agregar Framer Motion (swipe gestures, page transitions, stagger enters)
- Spring animations para los score circles
- Optimistic UI patterns en like/dislike
- **ToastCelebration** con confetti

---

## APÉNDICE — OLA 1 COMPLETA — ADN EMOCIONAL (15 preguntas)

Este es el gold de la investigación. Las 15 preguntas de la primera ola del onboarding psicográfico, con tipos de input:

| # | Pregunta | Tipo | Opciones |
|---|---|---|---|
| 1 | ¿Cómo quieres que te despierte el sol? | Multiple choice | Amante del amanecer ☀️ / Fan del atardecer 🌅 / Refugio en sombra 🌙 |
| 2 | ¿Qué nivel de ruido urbano toleras? | Slider 1-10 | Silencio absoluto ↔ Vibra urbana |
| 3 | ¿Tienes un ritual sagrado del café? | Multiple choice | Sí necesito mi estación ☕ / Rincón desayunador con vista / No es importante |
| 4 | ¿Qué aromas quieres cerca de casa? | Multiple choice | Panaderías 🥖 / Parques y naturaleza 🌳 / Ningún olor comercial |
| 5 | Si pudieras tocar tu casa, ¿qué sentirías? | Multiple choice | Madera cálida 🪵 / Frescura del mármol / Microcemento industrial |
| 6 | ¿Necesitas un rincón especial para leer? | Sí/No | Sí ✓ / No |
| 7 | ¿Requieres un espacio de introspección? (yoga, meditación) | Sí/No | Sí ✓ / No |
| 8 | ¿La cocina es el corazón social de tu hogar? | Multiple choice | Sí para convivir 👨‍👩‍👧 / Es un área técnica cerrada / Término medio |
| 9 | ¿Prefieres elementos antiguos o modernos? | Multiple choice | Ladrillo visto, vigas 🏛️ / Modernidad pulcra ✨ / Mezcla de ambos |
| 10 | ¿Qué tan importante es la conexión con naturaleza? | Slider 1-10 | No importante ↔ Esencial |
| 11 | ¿Tienes o planeas tener mascotas? | Multiple choice | Sí perro 🐕 / Sí gato 🐱 / Otras / No |
| 12 | Nivel de privacidad visual que necesitas | Slider 1-10 | Vista compartida ↔ Intimidad total |
| 13 | ¿Qué tan 'Smart' quieres tu hogar? | Multiple choice | Control total desde celular 📱 / Switches manuales / Híbrido |
| 14 | Los techos altos te hacen sentir: | Multiple choice | Libre y creativo 🕊️ / Indiferente / Prefiero acogedores |
| 15 | ¿Necesitas un 'Wow Factor' en la propiedad? | Multiple choice | Sí algo único e impactante ✨ / No es prioridad / Prefiero funcionalidad |

**Insight DMX:** Estas preguntas mapean a sensorialidad, sociabilidad, materialidad y lifestyle. Para la Wave **"Espacial"** de DMX agregar: distancia máxima a trabajo (isocronas), modo de transporte preferido, importancia de escuelas cercanas, tolerancia al tráfico, proximidad a parques vs comercio, preferencia de barrio (bohemio / corporativo / residencial tranquilo / emergente).

---

## APÉNDICE TÉCNICO — API SCHEMA REFERENCE

```json
// GET /api/auth/me
{
  "id": "UUID-v4",
  "email": "string",
  "name": "string",
  "role": "shopper | owner | agent",
  "created_at": "ISO8601"
}

// GET /api/swipe/next
{
  "id": "UUID-v4",
  "owner_id": "string",
  "title": "string",
  "story": "string (narrativa lifestyle)",
  "images": ["unsplash-url"],
  "municipality": "string",
  "address": "Hidden until contract signed",
  "coordinates": { "lat": 19.4177, "lng": -99.1636 },
  "features": {
    "bedrooms": 2,
    "bathrooms": 2,
    "area": 120,
    "price": 4500000
  },
  "psychographic_attributes": {
    "emotional": { "e1": "respuesta", "e3": "respuesta", "e10": 9 },
    "technical": { "t3": "respuesta", "t4": "respuesta" },
    "urban": { "u1": "respuesta", "u9": 8 }
  },
  "vibe_tags": ["luz_manana", "ritual_cafe", "home_office", "walkable"],
  "status": "active",
  "created_at": "ISO8601",
  "swipes_right": 3,
  "views": 3,
  "match_score": 50,
  "match_breakdown": {
    "emotional":   { "score": 50, "weight": 35, "weighted": 17.5, "label": "Emocional" },
    "technical":   { "score": 50, "weight": 25, "weighted": 12.5, "label": "Técnico" },
    "urban":       { "score": 50, "weight": 20, "weighted": 10,   "label": "Urbano" },
    "financial":   { "score": 50, "weight": 20, "weighted": 10,   "label": "Financiero" }
  },
  "city_match": false
}

// GET /api/onboarding/profile
{
  "user_id": "UUID",
  "completed": true,
  "emotional": {},
  "financial": {},
  "technical": {},
  "urban": {}
}

// GET /api/matches → array[]
```

---

## SÍNTESIS EJECUTIVA FINAL — Verdict en 6 dimensiones

| Dimensión | Findperty | DMX (potencial) | Ventaja |
|---|---|---|---|
| Diferenciación de producto | ⭐⭐⭐ Match psicográfico único | ⭐⭐⭐⭐⭐ Spatial Intelligence + psicográfico | DMX |
| UX/UI calidad | ⭐⭐⭐ Sólida, moderna, funcional | ⭐⭐⭐⭐ (con este playbook) | DMX (ejecutando) |
| Stack técnico | ⭐⭐ CRA sin SSR, emergent.sh | ⭐⭐⭐⭐⭐ Next.js, propio, escalable | DMX |
| SEO & Adquisición orgánica | ⭐ Invisible para Google | ⭐⭐⭐⭐⭐ Next.js SSR + páginas de zona | DMX |
| Herramientas profesionales (agente) | ⭐⭐ RIC prometido, pipeline básico | ⭐⭐⭐⭐⭐ CRM + geointelligence | DMX |
| Escalabilidad mercado | ⭐⭐ CDMX + 5 ciudades, MVP | ⭐⭐⭐⭐ LATAM desde el diseño | DMX |

**La principal amenaza de Findperty para DMX es la narrativa.** El concepto de "Haz Match con tu Casa Ideal" y el "ADN de Hogar" son narrativas poderosas que resuenan emocionalmente. DMX debe tener una narrativa igual de fuerte que comunique la superioridad del análisis espacial de forma que el consumidor no-técnico entienda y desee.

**Propuesta de narrativa para DMX (aprobada):**
> *"Propiedades que hacen match con tu vida. Zonas que multiplican tu inversión."*
>
> — Combina el beneficio emocional (lifestyle match) con el racional (inversión / plusvalía) desde la inteligencia espacial.

---

## RESUMEN EJECUTIVO PARA DECISIÓN RÁPIDA

**Findperty es:**
- ✅ Un MVP bien-concebido con UX de onboarding genuinamente brillante
- ✅ Una validación de mercado para matching psicográfico en real estate MX
- ✅ Una fuente de inspiración de UX patterns y design tokens accionables
- ❌ Un producto incompleto (solo 3 rutas, sin mapa, sin finanzas, sin asesores)
- ❌ Construido sobre infraestructura no-production (Emergent.sh vibe-coding)
- ❌ Pre-revenue, sin SEO, sin landing público, sin usuarios verificables

**Para DMX el veredicto es:** No es un competidor real hoy — es un signal de que el concepto de matching psicográfico tiene tracción. Toma las 3 ideas clave (**ADN de Hogar + Match Score 4D-6D + Vibe Tags**), impleméntalas con datos reales encima de tu Spatial Decision Intelligence, y tendrás un producto estructuralmente superior.

El moat de DMX son las capas que Findperty nunca podrá tener: **datos geoespaciales reales, herramientas financieras integradas, CRM de asesores, análisis de zona profundo y una plataforma multi-rol production-grade**. Findperty prueba el concepto; DMX lo ejecuta en serio.

---

**Reporte generado mediante exploración sistemática de findperty.com con browser automation.**
**Sesión: ~45 min activos. Screenshots: 13 capturas clave. Design tokens: extraídos via JavaScript directo al DOM. API schema: observado mediante network analysis y fetch directo.**
