# ADR-003 — Multi-country desde día 1 (schema, i18n, FX, legal/fiscal)

**Status:** Accepted
**Date:** 2026-04-17
**Deciders:** Manu Acosta (founder), Claude Opus 4.7 (Senior Review)

## Context

DesarrollosMX nace en México (CDMX primero, luego 16 alcaldías + 10 ciudades top MX) pero la decisión comercial del founder (BRIEFING §2, pregunta 6) es **multi-country día 1**. Expansión objetivo H2/H3:

- **es-MX** (default) — CDMX + 16 alcaldías + MX nacional.
- **es-CO** — Bogotá + Medellín.
- **es-AR** — CABA + GBA.
- **pt-BR** — São Paulo + Rio.
- **en-US** — spec gringa para compradores extranjeros de bienes raíces en LATAM y para eventual expansión a mercados hispanohablantes de EEUU.

La decisión estratégica implica que el producto, desde la primera migration, debe soportar simultáneamente:

1. **Currencies y FX**: MXN, COP, ARS, BRL, USD. Tipos de cambio en tiempo real (Open Exchange Rates + cache 10 min), con conversión opcional a USD para compradores internacionales.
2. **Timezones**: America/Mexico_City, America/Bogota, America/Argentina/Buenos_Aires, America/Sao_Paulo, America/New_York, etc. Cada `profiles.preferred_timezone` TEXT NOT NULL con default por country_code.
3. **Legal frameworks per country**: MX Mifiel + NOM-151, CO Certicámara + Ley 527/1999, AR Ley de Corretaje + firma hologr. + AFIP, BR CRECI + ICP-Brasil, CL Ley 19.799. Cada país requiere adaptadores distintos de firma electrónica y compliance documental.
4. **Payment processors per country**: Stripe MX + Stripe Connect, MercadoPago LATAM (CO, AR, BR, CL), Wompi CO, PagSeguro BR (evaluable).
5. **Tax engines per country**: IVA MX 16%, IVA CO 19%, IVA AR 21%, ICMS BR (varía por estado), IVA CL 19%. Cálculos de retenciones diferentes (ISR MX 10%, Monotributo AR, Simples Nacional BR, etc.).
6. **Fiscal docs per country**: CFDI 4.0 (MX) con 30+ complementos, Factura DIAN (CO), AFIP CAE (AR), NFS-e (BR), DTE SII (CL). Cada país tiene PAC/certificador distinto.
7. **Regional data sources**: INEGI + Banxico + CNBV (MX), DANE + Banco República (CO), INDEC + BCRA (AR), IBGE + Banco Central (BR), INE + Banco Central (CL). La arquitectura del Intelligence Engine debe permitir registrar fuentes per-country sin reingeniería.
8. **Catálogos territoriales per country**: estados MX (32) vs departamentos CO (32) vs provincias AR (23) vs estados BR (27); alcaldías/municipios/partidos/comunas; colonias/barrios; códigos postales con formatos distintos (5 dígitos MX, 6 CO, 4 letras+4 AR, 8 BR, 7 CL).
9. **i18n**: idiomas es/pt/en + locales es-MX vs es-CO con modismos distintos ("alberca" vs "piscina", "cochera" vs "garaje"). Next-intl con dictionaries por locale.

Restricciones adicionales:

- **Arranque MVP sólo en MX** (FASE 28 soft launch se ejecuta con asesores CDMX). Los otros países se activan gradualmente (FASE 29 scaffold H2/H3). Pero el schema y la arquitectura no deben requerir migración al activarlos.
- **Catálogos IE propios (mapeo SCIAN)** son MX-específicos. No existe SCIAN en CO/AR/BR; cada país tiene su clasificación (CIIU CO, CLANAE AR, CNAE BR). Esto obliga a tratar el mapeo SCIAN como MX-only y diseñar en el registry del IE una clave compuesta `(country_code, scian_code)` o `(country_code, ciiu_code)`.
- **Costo vs. beneficio**: retrofit a multi-country en una codebase con tráfico de producción es notoriamente costoso (véase SEC-01..03 que ya son dolorosos en single-country). En un rewrite sin usuarios, el costo incremental es bajo.

## Decision

Se adopta **multi-country en la primera migration de Fase 01**. Reglas firmes:

### D1. Schema: `country_code` NOT NULL + índice compuesto

Toda tabla de dominio (no de sistema interno puro) lleva columna `country_code CHAR(2) NOT NULL` con CHECK `country_code IN ('MX','CO','AR','BR','US','CL','PE','UY')` y referencia a `supported_countries(code)`. Tablas afectadas (no exhaustivo):

- Perfiles y tenants: `profiles`, `desarrolladoras`, `broker_companies`, `agencies`.
- Dominio core: `projects`, `unidades`, `contactos`, `busquedas`, `captaciones`, `operaciones`, `tareas`, `propiedades_secundarias`, `acm_valuaciones`, `visitas_programadas`, `comisiones`.
- IE: `zone_scores`, `project_scores`, `user_scores`, `zones`, `geo_data_points`, `macro_series`, `geo_snapshots`, `market_prices_secondary`, `dmx_indices`.
- Marketing + growth: `project_landing_pages`, `qr_codes`, `events`, `search_logs`.
- Feature registry: `feature_registry.country_scope jsonb` (ej. `["MX","CO"]`) para restringir disponibilidad.

Índices compuestos `(country_code, <clave de filtrado principal>)` en cada tabla de dominio: por ejemplo `idx_projects_country_developer (country_code, developer_id)`, `idx_zone_scores_country_zone (country_code, zone_id)`.

Tabla `supported_countries` con: `code CHAR(2) PK`, `name`, `default_locale`, `default_currency`, `default_timezone`, `phone_prefix`, `launch_phase` (`h1`|`h2`|`h3`), `active BOOLEAN`.

### D2. i18n con `next-intl` desde archivo 1

- Dictionaries en `/messages/{locale}.json` para: `es-MX` (default), `es-CO`, `es-AR`, `pt-BR`, `en-US`.
- Cero strings hardcoded en UI. Todo pasa por `t('namespace.key')`.
- Rutas `[locale]`-scoped: `/es-MX/panel/dashboard`, `/pt-BR/painel/dashboard`. Fallback a `es-MX` si locale no disponible.
- Fechas, monedas, direcciones vía helpers `formatCurrency(amount, locale)`, `formatDate(date, locale)`, `formatAddress(parts, country_code)` en `shared/lib/i18n/`.

### D3. FX con Open Exchange Rates + cache 10 min

- Cron `ingest_fx_rates` cada 10 min escribe en `fx_rates (from_code, to_code, rate, as_of_timestamp)`.
- Conversión cliente-lado via helper `useCurrency()` hook que lee de contexto i18n.
- UI permite toggle visual "Mostrar en MXN | USD | moneda local"; la moneda canónica de guardado es siempre la moneda nativa del proyecto (columna `unidades.precio_currency CHAR(3)`).

### D4. Legal/payment/tax/fiscal per-country

- Tabla `country_legal_config (country_code PK, signer_provider, tax_engine_provider, fiscal_doc_provider, compliance_flags jsonb)`.
- Adaptadores por país en `shared/lib/legal/`, `shared/lib/payments/`, `shared/lib/tax/`, `shared/lib/fiscal/`. Interface común + implementaciones `mx/`, `co/`, `ar/`, `br/`, `cl/`.
- Facturapi.io o Finkok como provider CFDI MX; equivalentes per país (ver ADR-008 §Blockers).
- Stripe + Stripe Connect globalmente; MercadoPago como complemento LATAM.

### D5. Default i18n = es-MX

Dado que el soft launch es MX, el fallback es `es-MX`. `next.config` + `next-intl` configurados con `defaultLocale: 'es-MX'`, `locales: ['es-MX','es-CO','es-AR','pt-BR','en-US']`.

### D6. Catálogos seed per-country en Fase 01

- Estados/departamentos/provincias/estados federados (MX 32, CO 32, AR 23, BR 27, US 50 para referencia en expansión).
- Municipios/alcaldías top 50 por país en H1-MX; H2 expande CO+AR; H3 expande BR+US.
- Colonias/barrios sólo MX inicialmente (zonas IE se definen sobre colonias MX); H2 reutiliza estructura para CO/AR.
- Codigos postales con formato validado por `country_code` en helpers Zod.

## Rationale

Se adopta multi-country upfront porque:

1. **Costo marginal bajo en rewrite, alto en retrofit**. Añadir `country_code NOT NULL` a 25 tablas con datos ya poblados (estado actual del proyecto viejo) requiere migration con `DEFAULT 'MX'` + backfill + luego `ALTER ... SET NOT NULL`. En rewrite es una columna más en CREATE TABLE.
2. **Evita re-arquitectura del IE al expandir**. El registry de scores (IE5-§12, 118 scores) ya incluye scores geo-dependientes de fuentes MX (DENUE, FGJ, SACMEX). Diseñar el registry con clave `(country_code, score_code)` desde inicio evita colisiones al agregar CIIU (CO), CLANAE (AR), CNAE (BR).
3. **Legal/fiscal exige adapter pattern nativo**. CFDI 4.0 MX es un monstruo de complejidad (30+ complementos); mezclarlo con lógica de Factura DIAN CO en el mismo módulo es insostenible. El adapter pattern per-country es la única forma limpia.
4. **FX afecta matemática financiera crítica**. Comisiones, precios, cashflow a 12 meses (B09), Commission Forecast (C06), TCO 10y (A05): si un proyecto MX vende a comprador estadounidense y la moneda canónica no está definida desde el inicio, los cálculos divergen. Moneda canónica de guardado = moneda del proyecto; conversión es presentación.
5. **i18n post-hoc es caro**: `next-intl` es trivial al arrancar y muy costoso al retrofittar con cientos de componentes Dopamine ya escritos.
6. **Compliance regulatorio diverge rápido**: LFPDPPP MX vs LPDP CO vs Ley 25.326 AR vs LGPD BR tienen reglas distintas de retención, portabilidad y borrado de datos. Diseñar compliance por país (FASE 26) requiere que el schema soporte filtros por `country_code`.

## Consequences

### Positivas
- **Schema homogéneo expansible**: activar CO es un seed de `supported_countries` + dictionary `es-CO.json` + adapter legal/fiscal CO + seed de departamentos. No requiere migration de schema.
- **IE registry compatible multi-country**: el mapeo SCIAN queda aislado como MX-only; CO/AR/BR se agregan con sus propias taxonomías sin tocar código MX.
- **Cumplimiento LFPDPPP/LGPD desde FASE 26**: los filtros `country_code = 'BR'` en queries de borrado son triviales.
- **Roadmap comercial claro**: se puede cerrar un contrato con un asesor en Bogotá en Fase 29 sin bloquear rollout.
- **Marca global**: `/metodologia` pública sin auth puede publicarse en es-MX, en-US, pt-BR simultáneamente para posicionamiento SEO + academia.

### Negativas / tradeoffs
- **Complejidad upfront en Fase 01**: los seed de estados/municipios/alcaldías inflan la migración inicial (~5,000 registros combinados). Mitigación: seeds en archivos SQL separados + generación programática vía scripts con GeoNames + validación Zod.
- **Testing matrix multiplicada**: cada función crítica (cálculo comisión, conversión FX, parseo RFC/NIT/CUIT/CNPJ) debe probarse al menos en MX + uno LATAM. Vitest parametrizado por `country_code` mitiga, pero duplica líneas de tests.
- **Coste de adapters legal/fiscal inutilizados H1**: los adapters CO/AR/BR/CL se implementan como stubs en H1 (returning `NotImplementedError` si se invocan con `country_code != 'MX'`). Esto es disciplina de YAGNI parcial — se define la interface pero no la implementación completa.
- **Riesgo de diseño acoplado a MX implícito**: el founder y la spec biblia-v5 son 100% MX-native. Existe el riesgo de que decisiones de dominio que parecen universales resulten ser MX-específicas al llegar a CO (ej. el concepto de "broker MLS" en MX no mapea limpio a "inmobiliaria" en AR). Mitigación: checklist por feature "¿esta regla es MX-only o global?" antes de cerrar código en cada fase.
- **i18n de catálogos de negocio**: los CHECK constraints en español (p. ej. `busquedas.etapa IN ('pendiente','buscando','visitando','ofertando','cerrando','ganada','perdida')`) requieren dictionary adicional para pt-BR. Mitigación: dejar CHECK en ES universal + mapping en UI vía dictionary (no traducir valores de BD).
- **Costos FX en tiempo real**: Open Exchange Rates plan pago ($12-$99/mes según tier). Cache 10 min lo limita en consumo; presupuesto modesto.

### Neutrales
- **Default es-MX** refleja el origen del producto; no es excluyente.
- **Multi-currency canónico vs presentación**: regla definida explícita (guardar en moneda nativa, presentar en moneda usuario). Elimina ambigüedad en cálculos.
- **Country + timezone desacoplados**: un asesor brasileño viviendo en CDMX tiene `country_code='BR'` (su regulación) pero `preferred_timezone='America/Mexico_City'` (su presentación). Schema ya lo soporta.

## Alternatives considered

### Alt 1: MX-first con migración a multi-country H2
Arrancar 100% MX en H1 (sin `country_code`, sin adapters, sin i18n nativo) y hacer un sprint de "go multi-country" en H2. **Descartada** porque:
- Es la situación que motivó el rewrite (ver ADR-001). Repetirla es hacer el mismo error dos veces.
- Agrega deuda que pesa justo cuando el producto empieza a tener usuarios reales.
- Obliga a doble testing y doble deploy ventana al expandir.

### Alt 2: Schema único con overrides por país en columna jsonb
Usar una sola tabla `projects` con columna `country_overrides jsonb` que contenga variaciones per-country (fiscal_rules, currency, legal_rules) en vez de adaptadores modulares. **Descartada** porque:
- Pierde type safety: los overrides jsonb no se validan estrictamente por Postgres.
- Mezcla lógica MX con lógica CO en el mismo registro — imposible de auditar y de indexar.
- Los engines fiscales (CFDI, DIAN, AFIP) son sistemas externos con APIs distintas; meterlos como jsonb en un único modelo es una anti-pattern de "god column".

### Alt 3: Micro-servicio por país (por ej. `api-mx.desarrollosmx.com`, `api-co.desarrollosmx.com`)
Separar backend por país con bases de datos distintas y replicación selectiva. **Descartada** porque:
- El briefing §11 prohíbe explícitamente microservicios ("monolito Next.js es suficiente").
- Los datos cross-country (un comprador en USA mirando propiedades en MX) obligan a federación; complejidad excesiva.
- La escala H1 no lo justifica (asesores piloto < 100).
- El moat del IE es **datos temporales agregados**: partir la BD por país degrada el valor del agregado.

## References
- `../BRIEFING_PARA_REWRITE.md` §2 pregunta 6, §3 "Multi-country día 1 implica"
- `../CONTEXTO_MAESTRO_DMX_v5.md` §2 (schema actual), §12 (fuentes de datos — todas MX en v5.1)
- `../biblia-v5/06_IE_PART1_Vision_Arquitectura_Fuentes_SCIAN.md` §3 (mapeo SCIAN MX-only)
- `../02_PLAN_MAESTRO/FASE_01_BD_FUNDACION.md` (schema multi-country)
- `../02_PLAN_MAESTRO/FASE_05_I18N_Y_MULTICOUNTRY.md` (i18n + FX + adapters)
- `../03_CATALOGOS/03.1_CATALOGO_BD_TABLAS.md` (`country_code` marcado en cada tabla)
- `../03_CATALOGOS/03.9_CATALOGO_FUENTES_DATOS.md` (fuentes per-country)
- Open Exchange Rates: https://openexchangerates.org
- next-intl: https://next-intl-docs.vercel.app

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 1 Agent B) | **Fecha:** 2026-04-17
