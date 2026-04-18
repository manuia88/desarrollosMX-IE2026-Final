# FASE 25 — Performance + Mobile (PWA H1 + optimizaciones + mobile-first UX)

> **Duración estimada:** 2 sesiones Claude Code (~8 horas con agentes paralelos)
> **Dependencias:** FASE 00 (bootstrap Next 16 + Turbopack), FASE 04 (Design System Dopamine), FASE 22 (push notifs web), FASE 24 (Core Web Vitals baseline + Lighthouse CI).
> **Bloqueantes externos:**
> - **Apple Developer account** (para iOS PWA badge oficial H2 — no bloqueante H1 ya que PWA standard en iOS 16.4+).
> - **VAPID keys** generadas (FASE 22 ya las gestiona).
> - Dominio + HTTPS obligatorio para PWA + Web Push.
> - Feature flags `pwa_install_prompt`, `push_notifications_enabled` en `feature_registry`.
> **Resultado esperado:** PWA funcional instalable en iOS/Android/desktop con service worker offline básico + push notifications. Bundle optimizado (<200KB first load JS route-level). Images next/image + Sharp 3 variantes. Fonts local con preload. Edge Functions para hot paths (search + scores cached). Mobile-first UX (touch targets 44px + gestures + pull-to-refresh + safe-area insets). Tag `fase-25-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Esta fase optimiza el producto para **mobile (60%+ tráfico esperado MX)** y **instalable** (PWA, sin App Store). Mobile-first no es cosmetic; 80%+ compradores primer contacto vía phone desde WA/landing.

Principios no negociables:
- **PWA H1 para TODOS los usuarios** (asesores + devs + compradores). App nativa iOS/Android solo asesores en H2 (Fase 29 scaffold) vía Expo.
- **Core Web Vitals H1 targets**: LCP <2.5s, INP <200ms, CLS <0.1 en p75.
- **First load JS per route**: <200KB (budget enforced).
- **Mobile-first**: todas las vistas se diseñan primero 375px luego scale up.
- **Touch targets 44×44 mínimo** (Apple HIG). Safe-area insets respetados.
- **Offline graceful**: service worker cache assets + API GET idempotent; no promete funcionalidad offline completa.

Cross-references:
- ADR-004 (feature-sliced — facilita code splitting per feature).
- FASE 04 (DS Dopamine — componentes responsive from day 1).
- FASE 22 (Web Push adapter vive ahí; SW push handler vive aquí).
- FASE 24 (Core Web Vitals medidos desde aquí en PostHog + Vercel Analytics + Lighthouse CI).
- Runbook 05.1 (deployment) tiene sección PWA asset versioning.

## Bloques

### BLOQUE 25.A — PWA foundations

#### MÓDULO 25.A.1 — Web Manifest

**Pasos:**
- `[25.A.1.1]` Crear `public/manifest.json`:
  ```json
  {
    "name": "DesarrollosMX",
    "short_name": "DMX",
    "description": "Spatial Decision Intelligence para bienes raíces MX",
    "start_url": "/?source=pwa",
    "display": "standalone",
    "orientation": "portrait-primary",
    "background_color": "#F5F3F0",
    "theme_color": "#6366F1",
    "lang": "es-MX",
    "scope": "/",
    "categories": ["business","finance","productivity"],
    "icons": [
      {"src":"/icons/icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},
      {"src":"/icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"},
      {"src":"/icons/maskable-192.png","sizes":"192x192","type":"image/png","purpose":"maskable"},
      {"src":"/icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}
    ],
    "screenshots": [
      {"src":"/screenshots/mobile-dashboard.webp","sizes":"540x1170","type":"image/webp","form_factor":"narrow"},
      {"src":"/screenshots/desktop-dashboard.webp","sizes":"1280x720","type":"image/webp","form_factor":"wide"}
    ],
    "shortcuts": [
      {"name":"Buscar","url":"/?action=search","icons":[{"src":"/icons/shortcut-search.png","sizes":"96x96"}]},
      {"name":"Agregar contacto","url":"/contactos/new","icons":[{"src":"/icons/shortcut-contact.png","sizes":"96x96"}]}
    ],
    "share_target": {
      "action": "/share",
      "method": "POST",
      "enctype": "multipart/form-data",
      "params": {"title":"title","text":"text","url":"url","files":[{"name":"attachments","accept":["image/*","application/pdf"]}]}
    }
  }
  ```
- `[25.A.1.2]` Generar icons desde master SVG (script `scripts/generate-pwa-icons.ts`) con maskable safe-zone 20%.
- `[25.A.1.3]` Meta tags en `app/layout.tsx`:
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
  - `<meta name="apple-mobile-web-app-title" content="DMX">`
  - `<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">`
  - `<meta name="theme-color" content="#6366F1" media="(prefers-color-scheme: light)">`
  - `<meta name="theme-color" content="#111118" media="(prefers-color-scheme: dark)">`

**Criterio de done del módulo:**
- [ ] Manifest válido via `npx pwa-asset-generator`.
- [ ] Lighthouse PWA audit ≥90 score.

#### MÓDULO 25.A.2 — Service Worker (next-pwa o Serwist)

**Pasos:**
- `[25.A.2.1]` Instalar `serwist` (moderna alternativa next-pwa compatible Next 16) + `@serwist/next`.
- `[25.A.2.2]` Config `next.config.ts` wrap con `withSerwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })`.
- `[25.A.2.3]` `app/sw.ts`:
  - `defaultCache` (runtime + static).
  - Strategies:
    - Static assets (images, fonts): CacheFirst, max 60 days, cacheName `static-assets`.
    - API GET (cached idempotent like `/api/v1/scores/*`): StaleWhileRevalidate 5min max-age.
    - HTML shell: NetworkFirst 3s timeout → cache fallback.
    - Navigation: NavigationRoute with deny list (`/api/*`).
  - Push event handler → muestra notif → click opens URL.
  - Background sync para form submissions offline (`formsync` queue).
- `[25.A.2.4]` Versioning: SW versión por commit SHA → auto-update UI notif "Nueva versión disponible" con `serwist.messageSkipWaiting()`.

**Criterio de done del módulo:**
- [ ] App funciona offline con último dashboard cached.
- [ ] Update detected → toast "Nueva versión" → click aplica.

#### MÓDULO 25.A.3 — Install prompt

**Pasos:**
- `[25.A.3.1]` Hook `useInstallPrompt()`:
  - Escucha `beforeinstallprompt` event (Android/desktop).
  - Detecta iOS (Safari): muestra tutorial manual "Compartir → Agregar a pantalla de inicio".
  - Feature flag `pwa_install_prompt` para rollout gradual.
- `[25.A.3.2]` Componente `<InstallPromoBanner>` no invasivo, aparece tras 3 sesiones o acción clave (ej: lead agregado). Dismissible 30 días.
- `[25.A.3.3]` Landing page incluye sección "Descarga la app" con botones Android/iOS + instrucciones.
- `[25.A.3.4]` Event PostHog `pwa_install_prompted`, `pwa_installed`, `pwa_dismissed`.

**Criterio de done del módulo:**
- [ ] Instalación testeada en Chrome Android, Safari iOS 16+, Chrome/Edge desktop.

### BLOQUE 25.B — Web Push notifications

#### MÓDULO 25.B.1 — Subscription flow

**Pasos:**
- `[25.B.1.1]` Hook `useWebPush()`:
  - Check `Notification.permission`.
  - Si `default` → mostrar UX pre-permission asking permiso (reason: "Avisarte de nuevos leads y visitas").
  - Al accept → `Notification.requestPermission()` → `serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`.
  - POST subscription a `/api/push/subscribe` → INSERT `push_subscriptions` (FASE 22 schema).
- `[25.B.1.2]` Settings `/settings/notifications` incluye toggle Push + device list + revoke button.

**Criterio de done del módulo:**
- [ ] Push notif llega desktop Chrome + Android Chrome.
- [ ] iOS Safari 16.4+ soportado.

#### MÓDULO 25.B.2 — SW push handler

**Pasos:**
- `[25.B.2.1]` En `app/sw.ts`:
  ```ts
  self.addEventListener('push', async (event) => {
    const data = event.data?.json();
    await self.registration.showNotification(data.title, {
      body: data.body, icon: '/icons/icon-192.png', badge: '/icons/badge-72.png', data: { url: data.url, notifId: data.notifId }, actions: data.actions, tag: data.tag, renotify: data.renotify, requireInteraction: data.urgent
    });
  });
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
    // mark clicked via fetch beacon
  });
  ```
- `[25.B.2.2]` Badge count (Android) con `navigator.setAppBadge(count)` desde main thread.

**Criterio de done del módulo:**
- [ ] Click en push abre URL correcto + badge cuenta OK Android.

### BLOQUE 25.C — Performance optimizations

#### MÓDULO 25.C.1 — Turbopack + bundler config

**Pasos:**
- `[25.C.1.1]` Next 16 default Turbopack — confirmar activo. No volver a Webpack (pierde hot reload velocity).
- `[25.C.1.2]` `next.config.ts`:
  - `experimental.ppr: 'incremental'` (Partial Prerendering Next 16).
  - `experimental.cacheComponents` para 'use cache' + cacheLife.
  - `experimental.optimizePackageImports: ['@radix-ui/react-*', 'lucide-react', 'date-fns', 'recharts']`.
  - `compress: true`.

**Criterio de done del módulo:**
- [ ] `npm run dev` HMR <200ms cambios CSS; <500ms cambios JS.

#### MÓDULO 25.C.2 — Bundle analysis + code splitting

**Pasos:**
- `[25.C.2.1]` Instalar `@next/bundle-analyzer`. Run `ANALYZE=true npm run build` regular.
- `[25.C.2.2]` Budget per route: first load JS <200KB (alert si >).
- `[25.C.2.3]` Code splitting feature-sliced: cada feature dinámicamente imported en rutas que no lo necesitan.
  ```ts
  const Captaciones = dynamic(() => import('@/features/captaciones/components/Page'), { ssr: true, loading: () => <Skeleton/> });
  ```
- `[25.C.2.4]` Heavy libs marcados dynamic:
  - Mapbox GL JS (<500KB) → `dynamic(import('@/shared/ui/MapboxMap'), { ssr: false })`.
  - Recharts (<200KB) → dynamic en páginas que usan charts.
  - react-pdf (~2MB) → dynamic en generadores PDF.
  - Three.js (H3) → dynamic pending.

**Criterio de done del módulo:**
- [ ] Análisis muestra < 200KB per route (excepto rutas específicas con charts admits +100KB).
- [ ] First Load JS shared <150KB.

#### MÓDULO 25.C.3 — Images (next/image + Sharp)

**Pasos:**
- `[25.C.3.1]` Config `next.config.ts`:
  ```ts
  images: {
    remotePatterns: [{protocol:'https',hostname:'*.supabase.co'},{protocol:'https',hostname:'images.unsplash.com'},{protocol:'https',hostname:'api.mapbox.com'}],
    formats: ['image/avif','image/webp'],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
  }
  ```
- `[25.C.3.2]` Todas `<Image>` con `width`+`height` explícitos (CLS=0) + `alt` obligatorio (a11y).
- `[25.C.3.3]` `loading="lazy"` default; above-the-fold `priority={true}`.
- `[25.C.3.4]` Thumbnails: Supabase Storage function `image-transform` via Supabase Image Transformation (Storage v2) o Sharp worker edge function generando 3 variants (thumb 200w, medium 800w, full 1920w) al upload.
- `[25.C.3.5]` Fallback: imagen placeholder gradient Dopamine si remote falla.
- `[25.C.3.6]` Skeleton shimmer para loading state (matching aspect ratio).

**Criterio de done del módulo:**
- [ ] Lighthouse image audits pass.
- [ ] No CLS shift en carga imagen.

#### MÓDULO 25.C.4 — Fonts

**Pasos:**
- `[25.C.4.1]` Instalar fonts locales via `next/font/local`:
  ```ts
  // app/fonts.ts
  import localFont from 'next/font/local';
  export const outfit = localFont({ src: [{path:'./fonts/Outfit-Variable.woff2',weight:'100 900'}], display: 'swap', variable: '--font-outfit' });
  export const dmSans = localFont({ src: [{path:'./fonts/DMSans-Variable.woff2',weight:'300 700'}], display: 'swap', variable: '--font-dm-sans' });
  ```
- `[25.C.4.2]` Preload en `<head>`:
  ```html
  <link rel="preload" href="/fonts/Outfit-Variable.woff2" as="font" type="font/woff2" crossorigin>
  ```
- `[25.C.4.3]` CSS `font-display: swap` en @font-face.
- `[25.C.4.4]` Subset a caracteres Latin + español MX (quitar CJK): fuentes <50KB cada.

**Criterio de done del módulo:**
- [ ] FOUT reducido. Lighthouse "preload key requests" pass.

### BLOQUE 25.D — Edge Functions hot paths

#### MÓDULO 25.D.1 — Edge runtime endpoints

**Pasos:**
- `[25.D.1.1]` `/api/search` (global search, ⌘K): runtime 'edge' — fetch Supabase con `SERVICE_ROLE` RLS-aware + Postgres FTS. Cache 30s.
- `[25.D.1.2]` `/api/v1/scores/[type]` API pública externa: runtime 'edge' con cache 5min por (lat, lon, type).
- `[25.D.1.3]` `/api/public/lp/[slug]` (landing pages): edge + SWR pattern.
- `[25.D.1.4]` Unstable cases (Claude AI calls, PDF generation): mantener Node runtime (necesitan timers + streams).

**Criterio de done del módulo:**
- [ ] Edge endpoints p99 <200ms MX + CO.

#### MÓDULO 25.D.2 — Edge Config feature flags + rate limits

**Pasos:**
- `[25.D.2.1]` Vercel Edge Config para:
  - Feature flags critical (aderir a PostHog como primary, Edge como fallback).
  - Rate limits per endpoint (JSON map).
  - Canary rollout percentages.
  - Maintenance mode global (flag on → middleware retorna 503 + mensaje).
- `[25.D.2.2]` Helper `getEdgeConfig(key)` — ≤10ms lookup.

**Criterio de done del módulo:**
- [ ] Maintenance mode toggle → deploy <2min propagation.

#### MÓDULO 25.D.3 — Next 16 Cache Components ('use cache')

**Pasos:**
- `[25.D.3.1]` Pages server components candidate a caching:
  - `/indices` (H): `use cache` + `cacheLife('hours')` + tags `['indices', 'rankings']`.
  - `/metodologia`: `use cache` + `cacheLife('days')`.
  - `/proyectos/[id]` (público): `use cache` + `cacheLife('minutes')` + tag `['project:${id}']`.
- `[25.D.3.2]` Invalidation via `revalidateTag('project:abc')` cuando cambia proyecto.
- `[25.D.3.3]` PPR (Partial Prerendering): static shell + dynamic data via Suspense.

**Criterio de done del módulo:**
- [ ] `/indices` TTFB <100ms en cache hit.

### BLOQUE 25.E — Mobile-first UX

#### MÓDULO 25.E.1 — Touch targets + gestures

**Pasos:**
- `[25.E.1.1]` Rule CSS `@media (pointer: coarse) { .touch-target { min-height: 44px; min-width: 44px; } }`.
- `[25.E.1.2]` Botones y tappables ≥44px (verificar con Playwright visual regression).
- `[25.E.1.3]` Gestures: swipe back, swipe to delete (contactos + tasks), long press menu.
- `[25.E.1.4]` Librería `@use-gesture/react` + `react-spring` para animations.

**Criterio de done del módulo:**
- [ ] A11y audit targets ≥44px.
- [ ] Swipe funciona iOS + Android.

#### MÓDULO 25.E.2 — Pull-to-refresh

**Pasos:**
- `[25.E.2.1]` Hook `usePullToRefresh(onRefresh)` detectando touchstart + overscroll.
- `[25.E.2.2]` UI spinner Dopamine con gradient al deslizar hacia abajo desde top.
- `[25.E.2.3]` Aplicar en: Dashboard, Contactos list, Búsquedas list, Notificaciones, Inbox.
- `[25.E.2.4]` Disable si `pointer: fine` (desktop).

**Criterio de done del módulo:**
- [ ] Pull-refresh trigger re-fetch data OK.

#### MÓDULO 25.E.3 — Safe-area insets

**Pasos:**
- `[25.E.3.1]` `viewport-fit=cover` en meta viewport.
- `[25.E.3.2]` CSS global:
  ```css
  :root { --safe-area-top: env(safe-area-inset-top); --safe-area-bottom: env(safe-area-inset-bottom); --safe-area-left: env(safe-area-inset-left); --safe-area-right: env(safe-area-inset-right); }
  .page-layout { padding-top: var(--safe-area-top); padding-bottom: var(--safe-area-bottom); }
  ```
- `[25.E.3.3]` Tab bar bottom sticky → usa `padding-bottom: calc(0.75rem + var(--safe-area-bottom))`.

**Criterio de done del módulo:**
- [ ] Contenido no tapado por notch iPhone / barra status.

#### MÓDULO 25.E.4 — Responsive breakpoints

**Pasos:**
- `[25.E.4.1]` Tailwind v4 config breakpoints: `sm:640, md:768, lg:1024, xl:1280, 2xl:1536`.
- `[25.E.4.2]` Layouts:
  - <640px: sidebar colapsa a bottom nav (5 tabs + menú).
  - 640-1024: sidebar icon-only (60px).
  - ≥1024: sidebar expanded (240px).
- `[25.E.4.3]` Testing: Playwright snapshots 3 viewports (375/768/1440).

**Criterio de done del módulo:**
- [ ] UX mobile usable test humano 15min sin bugs bloqueantes.

### BLOQUE 25.F — Lighthouse CI gates

#### MÓDULO 25.F.1 — Config + gates

**Pasos:**
- `[25.F.1.1]` `.lighthouserc.json` con 6 URLs críticas: `/`, `/explorar`, `/pricing`, `/dashboard` (authed), `/proyectos/[seed]`, `/indices`.
- `[25.F.1.2]` Assertions: performance ≥85, accessibility ≥95, best-practices ≥90, SEO ≥90, PWA ≥90.
- `[25.F.1.3]` GH Actions workflow `.github/workflows/lighthouse.yml` runs en PRs.
- `[25.F.1.4]` Mobile + desktop both tested.

**Criterio de done del módulo:**
- [ ] PR con regression falla CI.

### BLOQUE 25.G — Prefers-reduced-motion + accessibility

#### MÓDULO 25.G.1 — Respect user prefs

**Pasos:**
- `[25.G.1.1]` CSS global:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  }
  ```
- `[25.G.1.2]` Hook `usePrefersReducedMotion()` para desactivar animations framer-motion condicional.
- `[25.G.1.3]` Card3D tilt desactivado si reduce motion.

**Criterio de done del módulo:**
- [ ] OS setting on → animations off.

### BLOQUE 25.H — Loading perf budgets

#### MÓDULO 25.H.1 — Budget enforcement

**Pasos:**
- `[25.H.1.1]` `next.config.ts` webpack config budget (o turbopack equivalente):
  - Per route JS: 200KB gzipped.
  - Per route CSS: 50KB.
  - Per route images total: 500KB.
- `[25.H.1.2]` CI reporta budget report en PR comment.

**Criterio de done del módulo:**
- [ ] PR que añade 100KB bundle sin justificación bloqueado.

## Criterio de done de la FASE

- [ ] Manifest PWA + iconos + screenshots + shortcuts + share_target.
- [ ] Service Worker Serwist con offline strategies + versioning + update prompt.
- [ ] Install prompt cross-platform (Android/iOS/desktop) con PostHog events.
- [ ] Web Push subscribe flow + SW push handler + badge Android.
- [ ] Turbopack + PPR + Cache Components activos.
- [ ] Bundle analysis + route budgets <200KB first load JS.
- [ ] Images next/image + 3 variants + formats AVIF/WebP + placeholders.
- [ ] Fonts locales preloaded + font-display:swap.
- [ ] Edge endpoints (search + scores + landing) deployed.
- [ ] Edge Config feature flags + rate limits + canary + maintenance mode.
- [ ] Mobile-first: touch targets 44px + gestures + pull-to-refresh + safe-area + responsive sidebar.
- [ ] Lighthouse CI bloquea PRs con regression (performance ≥85, pwa ≥90).
- [ ] prefers-reduced-motion respetado.
- [ ] Budgets CI report en PR comments.
- [ ] Tests dispositivos reales: iPhone 13 Safari 17, Pixel 7 Chrome, Samsung S21 Samsung Internet, iPad Safari.
- [ ] Tag git `fase-25-complete`.

## Próxima fase

FASE 26 — Compliance + Auditoría (LFPDPPP + privacy + audit + legal docs).

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent F) | **Fecha:** 2026-04-17
