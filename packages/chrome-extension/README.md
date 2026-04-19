# DMX Market Assistant — Chrome Extension

Captura legal de listings desde Inmuebles24, Vivanuncios, Propiedades.com,
Mercado Libre Inmuebles y Facebook Marketplace, conforme [ADR-012](../../docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md)
y [GC-27](../../docs/00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md).

> Workspace `@dmx/chrome-extension` (Manifest V3 + Vite + TypeScript). H1 se distribuye via `load unpacked`; H2 evalúa Chrome Web Store.

## Arquitectura

```
packages/chrome-extension/
├── manifest.json           — Manifest V3 (host_permissions + content_scripts)
├── vite.config.ts          — bundling popup
├── build.mjs               — orquesta Vite por kind (popup, service worker, content scripts)
├── src/
│   ├── background/
│   │   └── service-worker.ts        — relay dmx:capture → /api/market/capture
│   ├── content/
│   │   ├── _shared.ts               — helpers extracción + FAB inject + toast
│   │   ├── inmuebles24.ts
│   │   ├── vivanuncios.ts
│   │   ├── propiedades-com.ts
│   │   ├── ml-inmuebles.ts
│   │   └── fb-marketplace.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.tsx                — 3 estados (loading/disconnected/connected)
│   │   └── styles.css
│   └── lib/
│       ├── auth.ts                  — chrome.storage helpers + login/logout
│       ├── capture-client.ts        — POST /api/market/capture
│       ├── config.ts                — API base toggle (prod / localhost)
│       ├── portals.ts               — PORTAL_IDS + SOURCE_FOR_PORTAL
│       ├── schema.ts                — Zod marketCaptureSchema
│       └── token-format.ts          — isValidTokenFormat (pure)
└── dist/                            — output `npm run build` (gitignored)
```

## Build

Desde la raíz del monorepo:

```bash
npm install                                  # instala devDeps del workspace
npm run --workspace=@dmx/chrome-extension build
```

Genera `packages/chrome-extension/dist/` con:

```
dist/
├── manifest.json
├── popup.html + popup.js + assets/popup-*.css
├── service-worker.js          (ES module)
└── content/
    ├── inmuebles24.js         (IIFE)
    ├── vivanuncios.js
    ├── propiedades-com.js
    ├── ml-inmuebles.js
    └── fb-marketplace.js
```

## Cargar en Chrome (load unpacked)

1. Abre `chrome://extensions/` en Chrome.
2. Activa **Developer mode** (toggle arriba-derecha).
3. Click **Load unpacked** y selecciona `packages/chrome-extension/dist/`.
4. La extensión aparece como **DMX Market Assistant** con badge `[alpha]`.

Para iterar durante dev:

```bash
npm run --workspace=@dmx/chrome-extension build
```

Después click 🔄 (reload) en el card de la extensión en `chrome://extensions/`.

## Conectar con DMX

1. Click en el icono de la extensión → popup abre.
2. Selecciona **API base** (`https://desarrollosmx.com` o `http://localhost:3000`).
3. Click **Generar token en DMX** — abre nueva pestaña en `/extension/connect`.
4. Inicia sesión en DMX (si no estás autenticado) y click **Generar token**.
5. Copia el token y pégalo en el campo del popup → **Guardar token**.
6. Popup muestra tu nombre y el counter de capturas.

> Token expira a los **90 días**. Re-genera otro cuando expire — el viejo queda revocado al guardar el nuevo (mismo storage key).

## Capturar un listing

1. Navega a una página de listing en cualquiera de los 5 portales soportados.
2. Aparece un FAB (botón flotante) `📥 Capturar en DMX` abajo-derecha.
3. Click → la extensión:
   - Extrae datos del DOM (JSON-LD → OpenGraph → __NEXT_DATA__ → selectores).
   - Calcula SHA-256 del HTML para dedup + auditoría.
   - Envía al service worker → `/api/market/capture` con tu Bearer token.
   - Muestra toast verde (éxito) o rojo (error con razón).

Listings capturados van a `market_prices_secondary` con
`source = chrome_ext_<portal>` y `captured_via = chrome_extension`.

## URLs soportadas (host_permissions)

| Portal | Pattern URL |
|---|---|
| Inmuebles24 | `https://www.inmuebles24.com/*` |
| Vivanuncios | `https://www.vivanuncios.com.mx/*` |
| Propiedades.com | `https://propiedades.com/*` + `https://www.propiedades.com/*` |
| ML Inmuebles MX | `https://inmuebles.mercadolibre.com.mx/*` |
| FB Marketplace | `https://www.facebook.com/marketplace/*` |
| DMX API | `https://desarrollosmx.com/*` + `http://localhost:3000/*` (dev) |

## Rate limit

Server enforces **500 capturas / hora / usuario** (ADR-012 §270).
Si excedes: response `429 rate_limited` y el toast lo refleja.

## Troubleshooting

**El FAB no aparece en una página de listing.**
Significa que el `isListingPage()` del content script no detectó el patrón URL.
Reportar al equipo con la URL exacta — los selectores se ajustan en updates.

**Toast "Captura falló: invalid_token".**
Token expiró o fue revocado. Genera otro en `/extension/connect`.

**Toast "Captura falló: rate_limited".**
Llegaste al límite 500/hora. Espera 1 hora o usa otra cuenta.

**Service worker inactivo (popup muestra contador desactualizado).**
MV3 termina el service worker tras 30s idle. Recarga el popup o
navega a un listing para re-activarlo.

**Error de CORS al llamar localhost desde la extensión.**
El manifest incluye `http://localhost:3000/*` en host_permissions, pero
asegúrate de que el dev server corra en ese puerto exacto.

## Schema del payload

Definido en `src/lib/schema.ts` (Zod). Mirror server-side en
`features/market/schemas/capture.ts`. El normalizer
`features/market/lib/capture.ts:normalizeCapture` mapea a la shape de
`market_prices_secondary` (price → price_minor centavos, captured_at → posted_at, etc.).

## Distribución H1

H1: `load unpacked` interno + onboarding por equipo de adopción.
H2: evaluación de Chrome Web Store (requiere review + privacidad disclosures).

## Referencias

- [ADR-012 Scraping Policy](../../docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md)
- [FASE 07 Plan §7.E](../../docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md)
- Manifest V3 docs: https://developer.chrome.com/docs/extensions/mv3
