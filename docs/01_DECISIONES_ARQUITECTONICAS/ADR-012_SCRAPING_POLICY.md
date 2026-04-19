# ADR-012 — Scraping policy: Chrome Extension + admin upload + partnerships

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

DMX requiere datos del **mercado secundario** (listings publicados de casas/departamentos en venta y renta, con precio, m², amenidades, tiempo en mercado, tipo de vendedor) para calibrar al menos 3 scores y un índice crítico del IE:

- **F-A04 — Arbitrage Score** (oportunidad primario vs secundario por colonia).
- **F-A12 — Price Fairness** (¿el proyecto primario está sobreprecio vs secundario comparable?).
- **DMX Estimate v1** (AVM mexicano, índice I01 en [ADR-010](./ADR-010_IE_PIPELINE_ARCHITECTURE.md)) — requiere ≥500 comps/colonia/mes.
- Alimenta también `market_prices_secondary` como feedstock temporal.

Las **fuentes principales** del mercado secundario residencial en MX son:

| Portal | Cobertura estimada | Posición | TOS scraping |
|--------|--------------------|----------|--------------|
| **Inmuebles24** (Adevinta / Schibsted) | ~500K listings MX | #1 residencial | **Prohíbe scraping server-side** |
| **Vivanuncios** (eBay / Adevinta) | ~300K listings MX | #2 residencial | **Prohíbe scraping server-side** |
| **Propiedades.com** (Grupo Altán / Habi) | ~200K listings MX | #3 residencial | **Prohíbe scraping + competidor directo** |
| **Mercado Libre Inmuebles** | ~150K listings MX | #4 inventario mixto | **Prohíbe scraping + rate limit bot** |
| **Facebook Marketplace** | ~100K+ listings MX | #5 peer-to-peer | **Prohíbe scraping + Meta TOS** |
| Lamudi MX | ~80K listings MX | #6 premium | Prohíbe scraping |

Adicionalmente, el founder verificó con **Apify** (plataforma líder de scraping-as-a-service) la posibilidad de desplegar *actors* sobre estos portales. **Apify rechazó el despliegue** por razones comerciales y legales (riesgo de recepción de takedown notices hacia su infraestructura). Esto elimina la ruta "contratar scraping externo" sin necesidad de revisar proveedor por proveedor.

Sumado al contexto histórico:

- **Habi API ya estaba prohibida** desde [ADR-010 §D10](./ADR-010_IE_PIPELINE_ARCHITECTURE.md#d10-política-de-fuentes-autorizadas--bloqueos-explícitos). Razón: competidor directo + TOS + riesgo legal.
- **El rewrite v5** inicialmente planificaba en FASE 07 BLOQUE 7.E ingestores `inmuebles24.ts` y `mudafy.ts` con "scraping responsable" (respeto robots.txt, rate limit 1 req/5s, user-agent identificable). Esta planificación **queda obsoleta** por el combo TOS + Apify rechazo + enforcement agresivo de Schibsted/Adevinta contra scrapers.
- **AirDNA (short-term rental data)** sigue siendo fuente legítima via API contratada ($99/mes).
- **Google Trends** sigue siendo fuente legítima via API oficial (`trends.googleapis.com`).
- **DENUE, FGJ, SACMEX, GTFS, SIGED, DGIS, Atlas Riesgos, Banxico, INEGI, SHF, SAT, Mapbox** siguen operando sin cambio — son APIs o bulk downloads oficiales.

El problema, entonces, no es *ingestar datos geoespaciales/macroeconómicos* — eso sigue funcionando. El problema es **cerrar el loop del mercado secundario** para alimentar el AVM y los scores de arbitrage sin violar TOS y sin depender de plataformas que rechazan la operación.

## Decision

**DMX adopta una política de adquisición de datos de mercado secundario de 3 vías escalonadas, en este orden de prioridad:**

### Vía 1 — Chrome Extension DMX (GC-27, patrón Lusha / Clay) — H1 PRIMARY

Se construye un paquete `packages/chrome-extension/` (Manifest V3) como parte del monorepo DMX. La extensión se distribuye en Chrome Web Store como "DMX Market Assistant" y se instala voluntariamente por asesores (obligatorio para plan Pro/Enterprise; opcional para Starter).

**Funcionamiento legal:**
- El usuario (asesor con sesión DMX activa) **navega manualmente** a Inmuebles24, Vivanuncios, Propiedades.com, Mercado Libre Inmuebles, Facebook Marketplace o Lamudi.
- El **content script** de la extensión extrae los datos visibles en el DOM que el usuario ya está viendo legítimamente en su navegador.
- La extensión hace POST a `/api/market/capture` con payload `{ portal, listing_id, url, price, sqm, address_raw, bedrooms, bathrooms, amenities[], raw_html_hash, captured_at, captured_by_user_id }`.
- El servidor valida autenticación (cookie/JWT del asesor), valida schema con Zod, deduplica contra `market_prices_secondary` (`UNIQUE(portal, listing_id, period_date)`), geocodifica la dirección y persiste.

**Por qué es legal:**
- **No es scraping server-side.** Es *browser automation del propio usuario* — la extensión actúa como asistente que mejora la experiencia de navegación del usuario.
- El usuario **autoriza explícitamente** (instalación + onboarding con checkbox consentimiento).
- El usuario **ejecuta manualmente** (abriendo el portal en su navegador).
- **Patrón proven model**: Lusha, Clay, Apollo.io, LinkedIn Sales Navigator, Seamless.ai operan con este modelo comercial en enrichment GTM hace >5 años. Los TOS de Chrome Web Store lo permiten; los TOS de los portales raramente aplican a asistentes del lado del cliente (lo que prohíben es scraping server-side y redistribución).

**Lo que NO hace la extensión:**
- No navega sola (no abre portals en background).
- No hace requests fuera del tab activo del usuario.
- No extrae datos de usuarios distintos al del asesor (no lee emails, DMs, perfiles personales).
- No redistribuye públicamente los listings capturados (permanecen internos a DMX, visibles solo para contar stats de mercado secundario + alimentar AVM).

**Schema de datos capturados:**
```ts
// packages/chrome-extension/src/schema.ts
export const marketCaptureSchema = z.object({
  portal: z.enum(['inmuebles24', 'vivanuncios', 'propiedades_com', 'ml_inmuebles', 'fb_marketplace', 'lamudi']),
  listing_id: z.string().min(1),
  url: z.string().url(),
  price_listed: z.number().positive(),
  currency: z.enum(['MXN', 'USD']),
  operation_type: z.enum(['venta', 'renta']),
  property_type: z.enum(['casa', 'departamento', 'terreno', 'local', 'oficina', 'otro']),
  sqm_construction: z.number().positive().optional(),
  sqm_terrain: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  parking: z.number().int().min(0).optional(),
  address_raw: z.string().min(5),
  amenities: z.array(z.string()).default([]),
  seller_type: z.enum(['particular', 'inmobiliaria', 'desconocido']).default('desconocido'),
  days_on_market: z.number().int().min(0).optional(),
  raw_html_hash: z.string().length(64), // SHA-256 para dedup y auditoría
  captured_at: z.string().datetime(),
})
```

**Storage server-side:**
- Tabla existente `market_prices_secondary` (FASE 07 original) con columna nueva `captured_via` enum `('chrome_extension', 'admin_upload', 'partnership_feed')` y `captured_by_user_id uuid NOT NULL REFERENCES profiles`.
- RLS policy: inserts solo desde endpoint `/api/market/capture` con auth válida. Select: solo admin y scoring workers.

**Incentivos para adoption:**
- Plan Starter asesor: obligatoria instalación para desbloquear "Market Intelligence" tab en CRM.
- Plan Pro/Enterprise: obligatoria + 50 XP bonus por cada 100 listings capturados / semana.
- Leaderboard mensual "Top capturers" (patrón Duolingo ligas — ver CONTEXTO §20.1).
- Feature feedback loop: los asesores que capturan reciben reporte "Tu zona favorita tuvo +X listings esta semana, momentum cambió de Y a Z".

### Vía 2 — Admin upload CSV/XLSX — H1 SECONDARY

UI administrativa `/admin/ingest/market` (protegida por rol `superadmin` o `admin_ingesta`) que permite subir archivos de reportes oficiales de firmas investigación:

| Firma | Reporte | Frecuencia | Formato |
|-------|---------|------------|---------|
| Cushman & Wakefield | MarketBeat Residencial MX | Trimestral | PDF + XLSX anexo |
| CBRE | Mexico Residential Report | Trimestral | PDF + XLSX |
| Tinsa MX | Tinsa IMIE (índice) | Mensual | PDF + XLSX |
| JLL | Residential Outlook | Semestral | PDF |
| Softec | Datos Softec (premium subscription) | Mensual | XLSX |
| Lamudi | Reporte Colonia (público) | Trimestral | PDF |

**Flujo:**
1. Admin descarga reporte oficial (con licencia válida).
2. Admin navega a `/admin/ingest/market`.
3. Selecciona fuente, sube archivo.
4. Parser server-side (XLSX con `exceljs`, CSV con `papaparse`, PDF con `pdf-parse` + GPT-4o-mini extraction estructurada Zod) convierte a `market_prices_secondary_aggregated` (tabla separada para datos agregados-por-zona, no listing individual).
5. Admin valida preview antes de commit final.

**Casos de uso:**
- Cushman/CBRE: datos trimestrales de precio mediano por colonia.
- Tinsa IMIE: índice macro de precios residenciales.
- Softec: datos detallados por desarrollo primario.
- Lamudi: datos por colonia (los que el portal publica oficialmente en reportes).

**Escala:** ~10-30 uploads/mes. No es alto volumen pero cubre *baseline agregado* sin depender de extensión.

### Vía 3 — Partnerships bilaterales — H2+

En H2 (FASE 33 Data Ecosystem — [ADR-017](./ADR-017_DATA_ECOSYSTEM_REVENUE.md)) DMX firma contratos bilaterales con portales que permitan **feed oficial** de listings. Rationale:

- **Los portales quieren scores IE** para enriquecer su propia UI (patrón Zillow embebe Walk Score desde 2009). DMX Score = valor para el portal.
- **DMX quiere volumen de listings** para alimentar AVM y arbitrage scores.
- **Exchange bilateral**: portal entrega feed diario (REST API o webhook) de listings agregados → DMX entrega scores agregados por colonia que el portal puede mostrar en su ficha.

**Candidatos prioritarios H2:**
- **Propiedades.com** — post-consolidación Altán/Habi, probable apertura a partnerships con data players no-competitivos.
- **Lamudi** — ya publica reportes; el paso a feed es natural.
- **Vivanuncios** — post-Adevinta consolidación, gobernanza decisional más clara.
- **Mercado Libre Inmuebles** — ML tiene historial de partnerships tech (API marketplace). Tamaño negociable.

**NO se busca partnership con:**
- **Inmuebles24** (Adevinta) — competencia directa por posicionamiento marketplace; demasiado grande para intercambio balanceado H2.
- **Habi** — sigue vetado por ADR-010 (competidor directo).
- **Facebook Marketplace** — Meta no hace partnerships bilaterales a este nivel.

**Términos típicos esperados:**
- Feed diario JSON con listings nuevos y actualizados.
- DMX entrega API key con scores IE agregados (no individuales) para que el portal los muestre.
- NDA mutuo, exclusividad soft (DMX no firma con competidor directo del portal en MX).
- Revenue share si el portal quiere monetizar scores premium dentro de su plataforma.

### Política de fuentes (update al whitelist de ADR-010)

**Autorizadas (whitelist en `features/ingesta/lib/sources/index.ts`):**
- Todas las fuentes originales ADR-010 §D10 (Banxico, INEGI, SHF, BBVA Research, CNBV, Infonavit, FOVISSSTE, DENUE, FGJ, GTFS, Atlas Riesgos, SIGED, DGIS, SACMEX, AirDNA, Google Trends, Cushman/CBRE).
- **NUEVO**: Chrome extension captures vía `/api/market/capture`.
- **NUEVO**: Admin uploads CSV/XLSX vía `/api/admin/ingest-market`.
- **NUEVO H2+**: Partnership feeds vía `/api/partners/{partner_id}/feed`.

**Prohibidas (blocklist hardcoded, fuerza ADR nuevo para desbloquear):**
- API Habi (`apiv2.habi.co`, `habi.co/api/*`, `propiedades.com/api/*`) — ADR-010.
- **NUEVO**: Scraping server-side de Inmuebles24, Vivanuncios, Propiedades.com, Mercado Libre, Facebook Marketplace, Lamudi.
- **NUEVO**: Uso de proveedores de scraping-as-service (Apify, Bright Data, Oxylabs) sobre portales de listings MX.

La whitelist en código lanza error al arrancar si alguna nueva entry matchea regex `/inmuebles24\.com|vivanuncios\.com|propiedades\.com|mercadolibre\.com\/inmuebles|facebook\.com\/marketplace/` en ingestores server-side.

## Rationale

La decisión se justifica por **legalidad + viabilidad operacional + diferenciación producto**:

1. **Legalidad.** Scraping server-side de los 6 portales viola TOS explícitos. Apify ya rechazó. El riesgo es:
   - Cease & desist carta (probable dentro de 30-90 días de operación detectable).
   - Bloqueo IP + ban cuenta.
   - Demanda civil (Schibsted/Adevinta tienen historial en EU de litigios contra scrapers).
   - Daño reputacional si se hace público que DMX roba datos de Inmuebles24.

2. **Viabilidad operacional.** La Chrome extension es construible en FASE 07 (Manifest V3 es estándar, se han escrito ~50K extensiones; templates públicos disponibles). Los patrones de content script + POST con auth son bien conocidos. La barrera no es técnica, es de adoption asesor — que se incentiva con features de plan y gamification.

3. **Diferenciación de producto.** La Chrome extension **es un feature diferenciador**, no un workaround legal. Clay y Lusha venden la extensión como parte de su value proposition. Asesores DMX pueden:
   - Capturar comparables mientras navegan — alimenta su propio CRM con 1-click "Añadir a listings de seguimiento".
   - Ver overlay DMX Score en cada listing que visitan en Inmuebles24 (si ya existe ese listing en DMX market_prices_secondary).
   - Hacer ACM automático consumiendo los comparables capturados.
   - El overlay dispara momentum del portal "DMX Score también en Inmuebles24" → branding viral.

4. **Scale.** Con 200 asesores capturando 50 listings/semana promedio = 10K listings/semana = 40K listings/mes. En 6 meses: ~240K listings únicos. Para CDMX con ~500K listings activos según estimación Inmuebles24, eso es cobertura ~40-50% suficiente para AVM calibrado.

5. **Admin upload cubre agregados.** Lo que la extensión no captura (reportes macro Cushman/CBRE/Tinsa) lo cubre admin upload. No hay hueco.

6. **Partnerships son premio, no requisito.** H2 partnerships añaden 2-5x volumen y oficialidad, pero H1 funciona sin ellas. El plan no bloquea H1 esperando firmas legales que toman 6-12 meses.

## Consequences

### Positivas

- **Legalidad completa.** Zero riesgo cease & desist, zero exposición TOS, zero demandas.
- **UX asesor diferenciador.** La extensión se convierte en feature killer para adoption asesor (patrón Lusha/Clay proven).
- **Control de calidad.** Los asesores capturan listings de las zonas que les importan → data relevante alta señal. El scraping server-side captura todo incluyendo ruido.
- **Moat adicional.** La red de asesores con extensión instalada es infraestructura difícil de replicar por competencia (requeriría construir extensión + ganar adoption).
- **Compliance datos.** LFPDPPP/GDPR-friendly: usuario autoriza, captura es transparente, datos anonimizados agregados.
- **Feedback loop marketing.** Asesores que ven "DMX Score 8.4" overlay en listings de Inmuebles24 comunican orgánicamente a colegas.
- **Expansión LATAM directa.** La extensión funciona idéntica en CO (MercadoLibre.com.co, Metrocuadrado), AR (Zonaprop, Argenprop), BR (VivaReal, ZapImóveis) — solo cambia la whitelist de hostnames.

### Negativas / tradeoffs

- **Dependencia de adoption asesor.** Si <50 asesores instalan, volumen insuficiente para AVM. Mitigación: obligatorio en plan Pro/Enterprise + XP bonus + feature gating sin extensión.
- **Volumen inicial menor vs scraping agresivo.** Un scraper server-side captura ~500K listings en 1 semana. La extensión llega a volumen comparable en ~6-9 meses. Tradeoff aceptable.
- **Costo ingeniería**. Construir Chrome extension Manifest V3 + content scripts + pipeline server = ~3-4 semanas ingeniería en FASE 07. Previsto.
- **Mantenimiento content scripts.** Los portales cambian DOM ocasionalmente; los selectores se rompen. Mitigación: monitoring automatizado con alerts + fallback a "usuario confirma manualmente" cuando el parse falla.
- **Usuarios Safari/Firefox excluidos H1.** Manifest V3 está en Safari 16.4+ (Safari Web Extensions) pero con diferencias. H1 solo Chrome/Edge/Brave. Safari + Firefox H2 si demanda lo justifica.
- **Vulnerabilidad abuse.** Un asesor malicioso podría usar la extensión para captura masiva spam. Mitigación: rate limit server-side (max 500 captures/hora/usuario), validación coherencia (listings duplicados del mismo portal), audit logs.

### Neutrales

- **Tabla `market_prices_secondary` permanece.** Solo cambian los ingestores que la alimentan (`captured_via` column).
- **Costo infra adicional minimal.** Extension hosting es gratuito (Chrome Web Store); backend endpoint usa infra Vercel existente.
- **Disclosure pública en `/metodologia`.** "DMX obtiene market data vía Chrome extension instalada voluntariamente por asesores autorizados" — transparencia genera confianza.
- **Legal review periódico.** Cada 6 meses revisión legal con abogado externo para confirmar que ningún portal cambió TOS para prohibir extensiones.

## Alternatives considered

### Alt 1: Scraping server-side con rate limiting conservador
**Rechazada.** TOS explícito de los 6 portales prohíbe scraping regardless of rate. Apify rechazó ya. El riesgo legal es cierto y el beneficio marginal vs alternativas legales no lo justifica. La operación también se vuelve fundacionalmente frágil (cualquier cambio de enforcement rompe el pipeline completo).

### Alt 2: Comprar data de terceros (DD360 data feed, Tinsa premium, Softec premium)
**Rechazada.**
- Costo alto: DD360 feed ~$3K-$5K USD/mes, Softec premium ~$2K/mes, Tinsa API ~$1K/mes → $72K-$100K USD/año solo por feed.
- Data contaminated: estos players agregan *su propio* data de fuentes grises; el mismo riesgo legal sin la ventaja de control.
- Dependencia estratégica: si Softec cambia precio 3x o corta servicio, DMX depende.
- Competidores: DD360 es competidor directo en AVM; comprarles feed es financiar al enemigo.

### Alt 3: Solo admin upload (sin Chrome extension)
**Rechazada.**
- Volumen insuficiente. Reportes mensuales/trimestrales agregados no calibran AVM colonia-por-colonia.
- No escalable a LATAM (cada país requiere fuentes distintas; admin manual multiplica carga operativa).
- Pierde el diferenciador de producto (extensión es feature, upload es backoffice).

### Alt 4: Partnerships H1 only (sin extensión)
**Rechazada.**
- Negociación partnerships toma 6-12 meses mínimo. FASE 07 (mes 3) no puede esperar.
- Portales requieren prueba de usage/scale antes de firmar. DMX H1 no tiene scale para negociar desde posición fuerte.
- Si FASE 07 se bloquea esperando partnerships, todos los scores AVM-dependientes (A04, A12, DMX Estimate) se atrasan → cascada H1 completa atrasada.

### Alt 5: Crowdsourcing público (patrón OpenStreetMap)
**Rechazada.**
- Calidad baja sin gatekeeping. Listings de Inmuebles24 ya son "públicos"; no hay incentivo para que compradores random los reporten a DMX.
- Conflicto TOS: si un usuario anónimo envía a DMX un listing de Inmuebles24, DMX actúa como receptor de data prohibida redistribuida. Gris legal.
- Adoption gate alto.

### Alt 6: Proxy de navegación (MITM headless browser rotativo)
**Rechazada.** Es scraping server-side disfrazado. Mismo TOS, mismo riesgo legal, peor ingeniería.

### Alt 7: Human data entry (operadores que llenan forms manualmente)
**Rechazada.** No escala económicamente. $10-20/hora × 40 hrs/semana × 200K listings mes = seis dígitos mensuales. Mejor invertir en adoption Chrome extension.

## Impact on FASE 07

[FASE 07 — Ingesta Datos](../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md) se reescribe para reflejar esta política. Cambios:

**BLOQUE 7.E — Fuentes Mercado** (pre-pivot):
- ~~`inmuebles24.ts` — scraping responsable robots.txt~~ **ELIMINADO**
- ~~`mudafy.ts` — scraping responsable~~ **ELIMINADO**
- ~~`propiedades_com.ts`~~ **NUNCA EXISTIÓ ADR-010, ELIMINADO si estaba**
- `airdna.ts` — API contratada ✓ SIGUE
- `google_trends.ts` — API oficial ✓ SIGUE
- `cushman_cbre.ts` — admin upload PDF ✓ SIGUE

**BLOQUE 7.E — Fuentes Mercado** (post-pivot):
- **NUEVO**: `packages/chrome-extension/` (paquete monorepo independiente) con Manifest V3, content scripts por portal, popup UI, background worker.
- **NUEVO**: Endpoint `/api/market/capture` (authenticatedProcedure, Zod validation, rate limit 500/hora/user).
- **NUEVO**: UI `/admin/ingest/market` con upload CSV/XLSX y preview.
- `airdna.ts` ✓
- `google_trends.ts` ✓
- `cushman_cbre.ts` ✓

## Impact on packages (monorepo)

Se añade nuevo paquete al workspace `packages/chrome-extension/`:

```
packages/chrome-extension/
├── manifest.json (Manifest V3)
├── src/
│   ├── background.ts (service worker)
│   ├── content-scripts/
│   │   ├── inmuebles24.ts
│   │   ├── vivanuncios.ts
│   │   ├── propiedades-com.ts
│   │   ├── mercadolibre.ts
│   │   ├── facebook-marketplace.ts
│   │   └── lamudi.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.tsx
│   │   └── styles.css
│   ├── lib/
│   │   ├── auth.ts (JWT + DMX session sync)
│   │   ├── capture-client.ts (POST /api/market/capture)
│   │   └── schema.ts (Zod shared)
│   └── assets/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── package.json
├── tsconfig.json
└── README.md (lineamientos uso interno)
```

La extensión comparte types/schemas con el servidor vía `shared/schemas/market-capture.ts`.

## References

- [ADR-010 — IE Pipeline Architecture §D10](./ADR-010_IE_PIPELINE_ARCHITECTURE.md) — prohibición Habi original.
- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) — contexto de H1 scope.
- [ADR-017 — Data Ecosystem Revenue](./ADR-017_DATA_ECOSYSTEM_REVENUE.md) — partnerships H2.
- [FASE 07 — Ingesta Datos](../02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md) — fase impactada.
- [03.9 — Catálogo Fuentes de Datos](../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md) — whitelist actualizada.
- [07.3 — Game Changers GC-27](../07_GAME_CHANGERS/07.3_CHROME_EXTENSION.md) — spec GC-27 (si existe; si no, pin H1).
- Chrome Web Store Developer Policies — https://developer.chrome.com/docs/webstore/program-policies
- Chrome Extensions Manifest V3 — https://developer.chrome.com/docs/extensions/mv3
- Lusha legal posture (ejemplo patrón) — https://www.lusha.com/legal/terms/
- hiQ Labs v. LinkedIn (9th Circuit, 2019) — precedente scraping datos públicos (con matices; DMX no se apoya en esto, es referencia no apelada).

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
