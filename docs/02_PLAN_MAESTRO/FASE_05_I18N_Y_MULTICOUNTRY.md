# FASE 05 — i18n y Multi-country

> **Duración estimada:** 3 sesiones Claude Code (~6 horas con agentes paralelos)
> **Dependencias:** [FASE 01 — BD Fundación](./FASE_01_BD_FUNDACION.md), [FASE 02 — Auth](./FASE_02_AUTH_Y_PERMISOS.md), [FASE 04 — Design System](./FASE_04_DESIGN_SYSTEM.md)
> **Bloqueantes externos:**
> - `OPEN_EXCHANGE_RATES_APP_ID` (plan Developer $12/mes recomendado, Free limita requests)
> - Cuentas de fiscal providers (se vinculan en Fase 16; aquí solo se dejan configs): Facturapi.io MX, partner DIAN CO (Alegra/Siigo), AFIP WSFE AR, NFS-e municipal BR, SII CL.
> - Mifiel MX account para firma electrónica (vincula Fase 18).
> - Stripe account con activos en MX + MercadoPago LATAM (CO, AR, BR, CL) + Wompi CO (provider fallback para pagos COP ≥ 1M).
> - Diccionarios iniciales de strings traducidos — Claude Code los puede generar pero revisar con hablantes nativos antes de cerrar fase (contenido legal/fiscal lo revisa partner local en cada país).
> **Resultado esperado:** next-intl setup con 5 locales (es-MX, es-CO, es-AR, pt-BR, en-US) via segment `[locale]`, middleware de detection, hooks `useLocale/useCurrency` + formatters, FX service con Open Exchange Rates + cache Edge Config 10min, legal frameworks config per country, payment processors config, tax engines config, fiscal doc generators stubs, regional data sources config, timezone per user persistido. Tag `fase-05-complete`.
> **Priority:** [H1]

## Contexto y objetivo

Multi-country día 1 (ADR-003) es una restricción dura: toda UI y toda lógica de dominio asume `country_code` + `locale` + `currency` + `timezone`. Esta fase materializa esa decisión a nivel aplicación (next-intl, dictionaries, formatters) y a nivel negocio (legal/payment/tax/fiscal providers config por país). No implementa flujos CFDI completos (eso va en Fase 16) — solo deja los stubs configurados y los contratos de interface que Fase 16+ implementa.

## Bloques

### BLOQUE 5.A — next-intl setup

#### MÓDULO 5.A.1 — Instalación + routing `[locale]` segment

**Pasos:**
- `[5.A.1.1]` Verificar `next-intl` ya instalado (Fase 00). Si no: `npm i next-intl`.
- `[5.A.1.2]` Crear `shared/lib/i18n/config.ts`:
  ```typescript
  export const locales = ['es-MX', 'es-CO', 'es-AR', 'pt-BR', 'en-US'] as const;
  export type Locale = typeof locales[number];
  export const defaultLocale: Locale = 'es-MX';
  export const localeToCountry: Record<Locale, string> = {
    'es-MX': 'MX', 'es-CO': 'CO', 'es-AR': 'AR', 'pt-BR': 'BR', 'en-US': 'US'
  };
  ```
- `[5.A.1.3]` Crear `shared/lib/i18n/request.ts`:
  ```typescript
  import { getRequestConfig } from 'next-intl/server';
  import { locales, defaultLocale } from './config';

  export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = locales.includes(requested as any) ? requested! : defaultLocale;
    return {
      locale,
      messages: (await import(`../../../messages/${locale}.json`)).default,
      timeZone: 'America/Mexico_City'           // sobrescrito por profile.preferred_timezone
    };
  });
  ```
- `[5.A.1.4]` Actualizar `next.config.ts` para incluir plugin next-intl:
  ```typescript
  import createNextIntlPlugin from 'next-intl/plugin';
  const withNextIntl = createNextIntlPlugin('./shared/lib/i18n/request.ts');
  export default withNextIntl({ /* next config */ });
  ```
- `[5.A.1.5]` Mover rutas existentes a `app/[locale]/...`: `(asesor)`, `(developer)`, `(admin)`, `(comprador)`, `(public)` todos dentro de `[locale]`.
- `[5.A.1.6]` `app/[locale]/layout.tsx` hace `import { NextIntlClientProvider, hasLocale } from 'next-intl';` + `notFound()` si locale inválido.

**Criterio de done del módulo:**
- [ ] `/es-MX/`, `/pt-BR/`, `/en-US/` responden 200.
- [ ] `/invalid-locale/` → 404.

#### MÓDULO 5.A.2 — Middleware de detection

**Pasos:**
- `[5.A.2.1]` Combinar middleware de Fase 02 (auth) con `createMiddleware` de next-intl:
  ```typescript
  import createIntlMiddleware from 'next-intl/middleware';
  const intlMiddleware = createIntlMiddleware({ locales, defaultLocale, localeDetection: true });
  export async function middleware(req: NextRequest) {
    // 1. Detectar locale (query, cookie, accept-language, geolocation)
    const response = intlMiddleware(req);
    // 2. Auth checks (de Fase 02) con response como base
    // ...
    return response;
  }
  ```
- `[5.A.2.2]` Detection order: `NEXT_LOCALE` cookie → user.preferred_locale from session → `accept-language` header → geo (via `x-vercel-ip-country`) mapeado a locale → default `es-MX`.

**Criterio de done del módulo:**
- [ ] Request de AR IP redirige a `/es-AR/`.
- [ ] Cookie `NEXT_LOCALE=pt-BR` override geo.

### BLOQUE 5.B — messages/ con 5 locales

#### MÓDULO 5.B.1 — Estructura namespace por feature

**Pasos:**
- `[5.B.1.1]` Crear `messages/es-MX.json` con namespaces:
  ```json
  {
    "Common": { "save": "Guardar", "cancel": "Cancelar", "loading": "Cargando...", "error": "Error" },
    "Auth": { "signin": "Iniciar sesión", "signup": "Crear cuenta", "logout": "Cerrar sesión", "mfa": { "title": "Verificación en dos pasos", "enroll": "Activar autenticador" } },
    "Nav": { "dashboard": "Panel", "marketplace": "Marketplace", "contacts": "Contactos", "searches": "Búsquedas" },
    "Search": { "placeholder": "Buscar desarrollos...", "filters": { "price": "Precio", "bedrooms": "Recámaras" } },
    "Properties": { "types": { "departamento": "Departamento", "casa": "Casa", "terreno": "Terreno" } },
    "Errors": { "unauthorized": "Acceso denegado", "notFound": "No encontrado" }
  }
  ```
- `[5.B.1.2]` Clonar para `es-CO.json`, `es-AR.json` — con tropicalizaciones: MX "departamento" → AR "departamento" (sinónimos OK), BR "apartamento", CO "apartamento"; MX "recámaras" → AR "habitaciones", CO "habitaciones", BR "quartos".
- `[5.B.1.3]` `pt-BR.json` traducido entero.
- `[5.B.1.4]` `en-US.json` traducido entero (mercado H2, stub inicial).
- `[5.B.1.5]` Script validator `scripts/validate-i18n.mjs` que chequea que todos los keys de `es-MX.json` existen en los otros 4 locales — corre en CI.

**Criterio de done del módulo:**
- [ ] 5 archivos en `messages/` con paridad de keys.
- [ ] CI script pasa (o falla si alguien olvida traducir).

### BLOQUE 5.C — Hooks + formatters

#### MÓDULO 5.C.1 — `useLocale`, `useCurrency`, `useTimezone`

**Pasos:**
- `[5.C.1.1]` `useLocale` provisto por next-intl (`import { useLocale } from 'next-intl'`). Re-export desde `shared/hooks/useLocale.ts`.
- `[5.C.1.2]` Crear `shared/hooks/useCurrency.ts`:
  ```typescript
  export function useCurrency() {
    const { profile } = useUser();
    const locale = useLocale();
    const country = localeToCountry[locale];
    const currency = profile?.preferred_currency ?? COUNTRY_DEFAULT_CURRENCY[country] ?? 'MXN';
    return { currency, country, locale };
  }
  ```
- `[5.C.1.3]` Crear `shared/hooks/useTimezone.ts` que lee `profile.preferred_timezone` con fallback `countries.default_timezone`.

**Criterio de done del módulo:**
- [ ] Hook retorna currency coherente por país.

#### MÓDULO 5.C.2 — Formatters multi-country

**Pasos:**
- `[5.C.2.1]` Crear `shared/lib/i18n/formatters.ts`:
  ```typescript
  import { format as dfFormat } from 'date-fns';
  import { formatInTimeZone } from 'date-fns-tz';
  import { es, ptBR, enUS } from 'date-fns/locale';
  const dfLocale = { 'es-MX': es, 'es-CO': es, 'es-AR': es, 'pt-BR': ptBR, 'en-US': enUS };

  export function formatCurrency(amount: number, currency: string, locale: string) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  }
  export function formatNumber(n: number, locale: string, opts?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locale, opts).format(n);
  }
  export function formatDate(date: Date | string, locale: string, pattern = 'PP', tz?: string) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return tz ? formatInTimeZone(d, tz, pattern, { locale: dfLocale[locale] }) : dfFormat(d, pattern, { locale: dfLocale[locale] });
  }
  export function formatRelativeTime(date: Date | string, locale: string) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diff = (new Date(date).getTime() - Date.now()) / 1000;
    // ...logic to pick unit (days/hours/minutes)
  }
  ```
- `[5.C.2.2]` Hook wrapper `useFormatters()` que inyecta locale + tz automáticamente.

**Criterio de done del módulo:**
- [ ] `formatCurrency(1500000, 'MXN', 'es-MX')` → `"$1,500,000.00"`.
- [ ] `formatCurrency(1500000, 'COP', 'es-CO')` → `"$ 1.500.000,00"`.
- [ ] `formatDate(d, 'pt-BR', 'PP')` → `"15 de abr. de 2026"`.

### BLOQUE 5.D — FX service Open Exchange Rates

#### MÓDULO 5.D.1 — Cache Edge Config + endpoint

**Pasos:**
- `[5.D.1.1]` Crear `shared/lib/currency/fx.ts`:
  ```typescript
  import { get } from '@vercel/edge-config';
  type FXRates = { base: 'USD'; timestamp: number; rates: Record<string, number> };
  const TTL_MS = 10 * 60 * 1000;                   // 10 min

  export async function getFXRates(): Promise<FXRates> {
    const cached = await get<FXRates>('fx_rates');
    if (cached && Date.now() - cached.timestamp < TTL_MS) return cached;
    const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}`);
    const data = await res.json();
    // Edge Config write via API (not async in runtime; alternative: store in public.fx_rates table)
    return { base: data.base, timestamp: Date.now(), rates: data.rates };
  }
  export async function convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const { rates } = await getFXRates();
    const inUSD = from === 'USD' ? amount : amount / rates[from];
    return to === 'USD' ? inUSD : inUSD * rates[to];
  }
  ```
- `[5.D.1.2]` Tabla fallback `public.fx_rates`:
  ```sql
  CREATE TABLE public.fx_rates (
    base CHAR(3) NOT NULL,
    quote CHAR(3) NOT NULL,
    rate NUMERIC(18,8) NOT NULL,
    source TEXT NOT NULL DEFAULT 'openexchangerates',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (base, quote, fetched_at)
  );
  CREATE INDEX idx_fx_pair ON public.fx_rates (base, quote, fetched_at DESC);
  ```
- `[5.D.1.3]` Cron `fx_snapshot` every 10 min → fetch OpenExchangeRates → INSERT en `fx_rates`.
- `[5.D.1.4]` Hook `useFX(from, to)` → tRPC `fx.convert.useQuery({ from, to })`.
- `[5.D.1.5]` UI: en cards con precio, mostrar pill "MXN 1,500,000 (≈ USD $89,400)" si `profile.preferred_currency !== property.currency`.

**Criterio de done del módulo:**
- [ ] `fx.convert(100, 'MXN', 'USD')` retorna número plausible.
- [ ] Cache Edge Config reduce hits a API externa.

### BLOQUE 5.E — Legal frameworks config

#### MÓDULO 5.E.1 — Config per country

**Pasos:**
- `[5.E.1.1]` Crear `shared/lib/legal/` con un archivo por país:
  - `mx.ts`: exporta `LEGAL_CONFIG_MX = { esign: { provider: 'mifiel', fallback: 'docusign', regulation: 'NOM-151-SCFI-2017' }, contracts: { promesa_compraventa: { template_id: 'mx.promesa_v1', requires: ['rfc_comprador', 'rfc_vendedor', 'testigos:2'] }, escrituracion: {...} }, privacy: { regulation: 'LFPDPPP', cookie_banner_required: true, dpa_template: 'mx_dpa_v1' } }`.
  - `co.ts`: `LEGAL_CONFIG_CO = { esign: { provider: 'certicamara', fallback: 'docusign', regulation: 'Ley 527/1999' }, contracts: {...}, privacy: { regulation: 'Ley 1581/2012', ... } }`.
  - `ar.ts`: `{ esign: { regulation: 'Ley 25.506', provider: 'docusign_ar' }, contracts: { ley_corretaje: 'Ley 25.028' }, privacy: { regulation: 'Ley 25.326' } }`.
  - `br.ts`: `{ esign: { regulation: 'Lei 14.063/2020', provider: 'docusign_br' }, crec: { requires_registro: true }, privacy: { regulation: 'LGPD' } }`.
  - `cl.ts`: `{ esign: { regulation: 'Ley 19.799', provider: 'docusign_cl' }, privacy: { regulation: 'Ley 19.628' } }`.
  - `us.ts`: `{ esign: { regulation: 'ESIGN Act + UETA', provider: 'docusign' }, privacy: { regulation: 'state_varies' } }`.
- `[5.E.1.2]` `shared/lib/legal/index.ts`: `export const LEGAL_CONFIG = { MX, CO, AR, BR, CL, US }; export function getLegalConfig(country: string) { return LEGAL_CONFIG[country]; }`.
- `[5.E.1.3]` Tabla `legal_documents_template`:
  ```sql
  CREATE TABLE public.legal_documents_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    code TEXT NOT NULL,                         -- 'promesa_compraventa', 'contrato_arrendamiento'
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    body_md TEXT NOT NULL,                      -- markdown con placeholders {{variable}}
    required_fields JSONB NOT NULL,             -- ['rfc_comprador', 'testigos']
    locale TEXT NOT NULL REFERENCES public.locales(code),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX idx_ldt_country_code_version ON public.legal_documents_template (country_code, code, version);
  ```

**Criterio de done del módulo:**
- [ ] 6 archivos de config legal.
- [ ] Tabla `legal_documents_template` creada.

### BLOQUE 5.F — Payment processors config

#### MÓDULO 5.F.1 — Config + interface uniforme

**Pasos:**
- `[5.F.1.1]` Crear `shared/lib/payments/config.ts`:
  ```typescript
  export const PAYMENT_PROVIDERS = {
    MX: { primary: 'stripe', secondary: 'mercadopago', connect: 'stripe_connect', methods: ['card', 'oxxo', 'spei', 'mercadopago_wallet'] },
    CO: { primary: 'mercadopago', secondary: 'wompi', methods: ['card', 'pse', 'mercadopago_wallet', 'nequi'] },
    AR: { primary: 'mercadopago', methods: ['card', 'mercadopago_wallet', 'rapipago', 'pagofacil'] },
    BR: { primary: 'mercadopago', secondary: 'stripe', methods: ['card', 'pix', 'boleto', 'mercadopago_wallet'] },
    CL: { primary: 'mercadopago', secondary: 'stripe', methods: ['card', 'webpay', 'mercadopago_wallet'] },
    US: { primary: 'stripe', methods: ['card', 'ach', 'apple_pay', 'google_pay'] }
  } as const;
  ```
- `[5.F.1.2]` Interface uniforme `shared/lib/payments/provider.ts`:
  ```typescript
  export interface PaymentProvider {
    createCheckout(opts: CheckoutInput): Promise<{ url: string; session_id: string }>;
    createSubscription(opts: SubscriptionInput): Promise<{ subscription_id: string; status: string }>;
    createConnectAccount(opts: ConnectInput): Promise<{ account_id: string; onboarding_url: string }>;
    handleWebhook(body: unknown, signature: string): Promise<WebhookEvent>;
  }
  ```
- `[5.F.1.3]` Stubs `shared/lib/payments/stripe.ts`, `mercadopago.ts`, `wompi.ts` con interfaces implementadas — bodies TODO (Fase 18).

**Criterio de done del módulo:**
- [ ] Config + interface + 3 stubs.

### BLOQUE 5.G — Tax engines config

#### MÓDULO 5.G.1 — IVA/ICMS/etc per country

**Pasos:**
- `[5.G.1.1]` Crear `shared/lib/tax/config.ts`:
  ```typescript
  export const TAX_CONFIG = {
    MX: { vat_rate: 0.16, vat_name: 'IVA', withholding_isr_pct: 0.10, exempt_items: ['medicinas', 'libros'], fiscal_regimes: ['601','603','612','626'] },
    CO: { vat_rate: 0.19, vat_name: 'IVA', ica_range: [0.002, 0.014], retencion_fuente_pct: 0.035 },
    AR: { vat_rate: 0.21, vat_name: 'IVA', vat_reduced: 0.105, iibb_pct: 0.035, ganancias_pct: 0.35 },
    BR: { vat_icms_range: [0.07, 0.20], iss_range: [0.02, 0.05], pis_pct: 0.0165, cofins_pct: 0.076 },
    CL: { vat_rate: 0.19, vat_name: 'IVA' },
    US: { sales_tax_state_varies: true, federal_income_tax: 'varies' }
  };
  export function calculateTax(amount: number, country: string, type: 'vat' | 'iibb' | 'iss'): number { /* ... */ }
  ```
- `[5.G.1.2]` Tabla `tax_rules` (override per developer/item):
  ```sql
  CREATE TABLE public.tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    scope TEXT NOT NULL CHECK (scope IN ('global', 'desarrolladora', 'item')),
    scope_id UUID,
    tax_type TEXT NOT NULL,                     -- 'vat', 'iss', 'retencion'
    rate NUMERIC(6,4) NOT NULL,
    applies_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    applies_to TIMESTAMPTZ,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb
  );
  ```

**Criterio de done del módulo:**
- [ ] Config + helper + tabla listos.

### BLOQUE 5.H — Fiscal doc generators stubs

#### MÓDULO 5.H.1 — Interface + stubs por país

**Pasos:**
- `[5.H.1.1]` Interface `shared/lib/fiscal/generator.ts`:
  ```typescript
  export interface FiscalDocGenerator {
    emit(invoice: InvoiceInput): Promise<{ doc_id: string; xml?: string; pdf_url?: string; uuid?: string }>;
    cancel(doc_id: string, reason: string): Promise<{ ok: boolean }>;
    query(doc_id: string): Promise<FiscalDocStatus>;
  }
  ```
- `[5.H.1.2]` Stubs:
  - `shared/lib/fiscal/mx-facturapi.ts` (CFDI 4.0, complementos, cancelación con motivo 01/02/03/04).
  - `shared/lib/fiscal/co-dian.ts` (Factura electrónica, notas crédito/débito, nómina electrónica).
  - `shared/lib/fiscal/ar-afip.ts` (CAE, Factura A/B/C, notas crédito/débito).
  - `shared/lib/fiscal/br-nfs.ts` (NFS-e municipal por cidade).
  - `shared/lib/fiscal/cl-sii.ts` (Factura electrónica SII).
- `[5.H.1.3]` Factory `shared/lib/fiscal/index.ts`:
  ```typescript
  export function getFiscalGenerator(country: string): FiscalDocGenerator {
    switch (country) {
      case 'MX': return new MXFacturapiGenerator();
      case 'CO': return new CODianGenerator();
      case 'AR': return new ARAfipGenerator();
      case 'BR': return new BRNfsGenerator();
      case 'CL': return new CLSiiGenerator();
      default: throw new Error(`No fiscal generator for ${country}`);
    }
  }
  ```
- `[5.H.1.4]` Tabla `fiscal_docs`:
  ```sql
  CREATE TABLE public.fiscal_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code CHAR(2) NOT NULL REFERENCES public.countries(code),
    desarrolladora_id UUID REFERENCES public.desarrolladoras(id),
    doc_type TEXT NOT NULL,                     -- 'cfdi_4', 'factura_dian', 'factura_a', 'nfs_e', 'factura_sii'
    series TEXT,
    folio TEXT,
    uuid_extern TEXT,                           -- UUID proveedor (SAT, DIAN, AFIP, SII)
    total_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
    xml_url TEXT,
    pdf_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft','issued','accepted','rejected','canceled')),
    issued_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    operacion_id UUID,                          -- FK Fase 18
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_fdocs_country_status ON public.fiscal_docs (country_code, status);
  ```

**Criterio de done del módulo:**
- [ ] Interface + 5 stubs + factory + tabla.

### BLOQUE 5.I — Regional data sources config

(Prep para Fase 07 ingesta.)

#### MÓDULO 5.I.1 — Config per country

**Pasos:**
- `[5.I.1.1]` Crear `shared/lib/data-sources/config.ts`:
  ```typescript
  export const DATA_SOURCES = {
    MX: { macro: ['INEGI', 'Banxico', 'SHF', 'Infonavit', 'FOVISSSTE', 'CNBV', 'BBVA Research'], geo: ['DENUE', 'FGJ', 'GTFS', 'Atlas Riesgos', 'SIGED', 'DGIS/CLUES', 'SACMEX', 'SEDUVI', 'Catastro'], market: ['Inmuebles24', 'AirDNA', 'Google Trends', 'Cushman MX', 'CBRE MX'] },
    CO: { macro: ['DANE', 'Banrep', 'FNA'], geo: ['IGAC', 'Catastro Nacional'], market: ['Metrocuadrado', 'Fincaraiz'] },
    AR: { macro: ['INDEC', 'BCRA'], geo: ['ARBA'], market: ['Zonaprop', 'Argenprop'] },
    BR: { macro: ['IBGE', 'BCB', 'FipeZap'], geo: ['IBGE Malhas'], market: ['ZAP', 'VivaReal'] },
    CL: { macro: ['INE', 'BCentral', 'ADIMARK'], geo: ['SII Avaluos'], market: ['Portal Inmobiliario', 'Yapo'] },
    US: { macro: ['BLS', 'FRED', 'BEA'], geo: ['Census', 'OSM'], market: ['Zillow', 'Redfin'] }
  };
  ```

**Criterio de done del módulo:**
- [ ] Config seed listo para Fase 07 consumir.

### BLOQUE 5.J — Timezone per user

#### MÓDULO 5.J.1 — Preferred timezone + UI switcher

**Pasos:**
- `[5.J.1.1]` Columna `profiles.preferred_timezone` ya existe (Fase 01). Default es `countries.default_timezone`.
- `[5.J.1.2]` UI `/settings/account`: selector timezone con search (usar `Intl.supportedValuesOf('timeZone')` para lista completa).
- `[5.J.1.3]` Hook `useTimezone()` (ya creado 5.C.1): aplica en todas las `formatDate`.
- `[5.J.1.4]` Server side: `headers().get('x-vercel-ip-timezone')` como hint en signup.

**Criterio de done del módulo:**
- [ ] User AR ve fechas en `America/Argentina/Buenos_Aires`.

### BLOQUE 5.K — LocaleSwitcher + CurrencySwitcher en Header

#### MÓDULO 5.K.1 — Switchers funcionales

**Pasos:**
- `[5.K.1.1]` Crear `shared/ui/layout/LocaleSwitcher.tsx` dropdown con 5 locales + banderas (flag emoji o SVG).
- `[5.K.1.2]` Al seleccionar: `router.push(pathname.replace(currentLocale, newLocale))` + `cookies.set('NEXT_LOCALE', newLocale)` + `tRPC me.updatePreferredLocale.useMutation`.
- `[5.K.1.3]` `CurrencySwitcher.tsx`: dropdown con monedas activas (filtradas por país); update `profile.preferred_currency`.
- `[5.K.1.4]` Inyectar ambos en `Header` slots (de Fase 04).

**Criterio de done del módulo:**
- [ ] Cambiar locale desde header re-renderiza página en nuevo idioma.
- [ ] Cambio de currency re-formatea todos los precios.

## Criterio de done de la FASE

- [ ] next-intl operativo con 5 locales + segment routing + middleware detection.
- [ ] `messages/` con 5 archivos JSON de paridad validada en CI.
- [ ] Hooks `useLocale`, `useCurrency`, `useTimezone`, `useFormatters` disponibles.
- [ ] FX service con Open Exchange Rates + cache Edge Config + tabla `fx_rates`.
- [ ] Legal configs para 6 países + tabla `legal_documents_template`.
- [ ] Payment processors config + interface + stubs.
- [ ] Tax engines config + tabla `tax_rules`.
- [ ] Fiscal doc generators interface + 5 stubs + tabla `fiscal_docs`.
- [ ] Regional data sources config listo para Fase 07.
- [ ] Timezone per user operativo.
- [ ] LocaleSwitcher + CurrencySwitcher en Header.
- [ ] Tag git: `fase-05-complete`.
- [ ] CI script paridad i18n pasa.

## Features implementadas en esta fase (≈ 20)

1. **F-05-01** next-intl con 5 locales + `[locale]` segment
2. **F-05-02** Middleware de detection (cookie→user→header→geo→default)
3. **F-05-03** 5 diccionarios de messages con paridad validada en CI
4. **F-05-04** Hook `useLocale` + `useCurrency` + `useTimezone`
5. **F-05-05** Formatters (currency, number, date, relativeTime) con Intl + date-fns-tz
6. **F-05-06** FX service con Open Exchange Rates + cache Edge Config
7. **F-05-07** Tabla `fx_rates` + cron snapshot 10min
8. **F-05-08** Hook `useFX(from, to)` + UI pill conversion
9. **F-05-09** Legal configs 6 países (Mifiel MX, DocuSign, Certicámara CO, AFIP AR, CRECI BR, SII CL)
10. **F-05-10** Tabla `legal_documents_template` multi-locale
11. **F-05-11** Payment providers config + interface uniforme
12. **F-05-12** Stubs Stripe + MercadoPago + Wompi
13. **F-05-13** Tax engines config (IVA MX 16%, CO 19%, AR 21%, BR ICMS, CL 19%)
14. **F-05-14** Tabla `tax_rules` con scope override
15. **F-05-15** Fiscal doc generators interface + stubs CFDI/DIAN/AFIP/NFS-e/SII
16. **F-05-16** Tabla `fiscal_docs` multi-country
17. **F-05-17** Regional data sources config (prep Fase 07)
18. **F-05-18** Timezone per user + UI switcher + geo hint
19. **F-05-19** LocaleSwitcher + CurrencySwitcher en Header
20. **F-05-20** Tropicalización MX/CO/AR/BR/CL (recámaras vs habitaciones vs quartos)

## Próxima fase

[FASE 06 — Seguridad Baseline](./FASE_06_SEGURIDAD_BASELINE.md)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent C) | **Fecha:** 2026-04-17
