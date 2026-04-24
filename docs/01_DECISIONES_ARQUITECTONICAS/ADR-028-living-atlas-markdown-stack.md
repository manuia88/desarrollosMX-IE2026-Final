# ADR-028 — Living Atlas markdown stack

- **Status**: Accepted
- **Date**: 2026-04-24
- **Phase**: FASE 11 XL — BLOQUE 11.S
- **Decision makers**: Founder (Manu) + Claude Code

## Contexto

BLOQUE 11.S (Living Atlas) materializa el producto **"Wiki colectiva de
colonias"** ya declarado en schema `public.colonia_wiki_entries` desde
FASE 11 XL `20260421100000_fase11_xl_dmx_indices_schema.sql`. El schema
guarda contenido en `content_md text` + `sections jsonb` (8 secciones
por colonia) y el UI público debe renderizar ese markdown de forma
accesible, segura (XSS) y performante en Server Components / Client
Components Next.js 16.

## Problema

Renderizar markdown user-generated (o LLM-generated) es un vector XSS
clásico. Necesitamos:

1. Convertir markdown → HTML semántico.
2. Soportar GitHub Flavored Markdown (tablas, task lists, strikethrough)
   porque los prompts Haiku producen listas y tablas.
3. Sanitizar output para prevenir XSS (anchors con `javascript:`, event
   handlers inline, tags custom maliciosos).
4. Respetar tokens Dopamine (`styles/tokens.css`) para tipografía.

## Alternativas consideradas

| Alternativa | Rechazo |
|---|---|
| **Regex manual markdown → HTML** | XSS risk alto; zero cobertura GFM; deuda técnica (memoria feedback `zero_deuda_tecnica`). |
| **MDX nativo Next.js** | Requiere setup Webpack/Turbopack complejo para contenido dinámico BD; MDX está diseñado para archivos estáticos importados, no para strings jsonb fetched runtime. |
| **Abandonar markdown (solo texto plano en secciones)** | Pierde la capacidad editorial futura (links, tablas, estructura jerárquica) → bloquea L-NEW8 editor rico FASE 12. |
| **DOMPurify en cliente + marked.js** | Dos libs acopladas; DOMPurify no compone con pipelines remark/rehype; harder tree-shake. |

## Decisión

Instalar el stack **unified/remark/rehype**, estándar de facto en React:

- `react-markdown@^9` — componente `ReactMarkdown` que acepta markdown
  como children + pipelines configurables + custom component map
  (para aplicar tokens Dopamine a `h1`, `p`, `a`, etc.).
- `remark-gfm@^4` — plugin que añade GFM (tablas, task lists,
  autolinks, strikethrough).
- `rehype-sanitize@^6` — sanitizer a nivel HAST (HTML AST) con default
  schema safe-by-default. Corre **después** de remark parse, **antes**
  de render React, así 100 % del HTML que llega al DOM pasa por la
  lista blanca.

## Consecuencias

- **Positivas**: XSS blocked por default; GFM completo; integración
  trivial con RSC (stream MD → HTML server-side); custom components
  permiten map a primitivas Dopamine sin hardcode de clases.
- **Negativas**: +3 deps (~80 KB gzipped server, ~35 KB shipped al
  cliente porque los Server Components render pre-sanitizan). Bundle
  aceptable dado el producto editorial resultante.
- **Migración futura**: cuando L-NEW8 (FASE 12 N5) añada editor rico
  Tiptap/Lexical, el stack unified sigue siendo el renderer — el
  editor output convierte a markdown compatible.

## Referencias

- `features/atlas/components/WikiContentRenderer.tsx` — componente que
  aplica ReactMarkdown + remarkGfm + rehypeSanitize.
- Migration `20260424200000_fase11_xl_zone_slugs.sql` — relaja policy
  `colonia_wiki_public_read` para publicar seed LLM con
  `published=true + reviewed=false` (editorial workflow queda para
  FASE 12).
- Script `scripts/seed-living-atlas-wiki.ts` — genera 200 entradas via
  Claude Haiku 4.5 con cost cap $3 USD.
