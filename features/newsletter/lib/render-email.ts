// features/newsletter/lib/render-email.ts
//
// Helper para renderizar email templates a HTML string.
//
// Motivo: en Next.js 16 App Router (React Server Components), el bundler
// resuelve `react-dom/server` a `server.react-server.js` que NO exporta
// `renderToStaticMarkup`. La solución oficial es obtener la implementación
// Node-only vía `require()` dinámico dentro de una función servidor —
// el bundler trata `require` como resolución runtime Node.js y usa el
// entry correcto (`server.node.js`), no el RSC stub.
//
// Single source de `renderToStaticMarkup` para todos los email templates
// (confirm-email, unsubscribe-confirm, monthly-mom, wrapped-annual,
// scorecard-digest-preview, scorecard-digest-post, zone-personalized).

import type { ReactElement } from 'react';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

export function renderToStaticMarkupSafe(element: ReactElement): string {
  // Dynamic require: bundler (Turbopack / Webpack) no evalúa este path
  // en build-time → no cae en la resolución RSC. Runtime Node.js resuelve
  // `react-dom/server.node` correctamente.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}
