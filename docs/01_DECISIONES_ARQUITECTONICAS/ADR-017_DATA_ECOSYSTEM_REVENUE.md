# ADR-017 — Data Ecosystem Revenue: marketplace bilateral de datos (FASE 33)

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

El principio rector de DMX ([00.1 §3](../00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md#3-principio-rector-la-cita-que-ancla-el-alma-del-producto)) establece que *"los datos temporales acumulados son el moat"*. En H1 este moat se construye vía fuentes públicas (DENUE, FGJ, SACMEX, GTFS, SIGED, DGIS, Atlas Riesgos, Banxico, INEGI) + Chrome extension market capture ([ADR-012](./ADR-012_SCRAPING_POLICY.md)) + transacciones propias del marketplace + ingesta admin de reportes Cushman/CBRE/Tinsa/Softec.

En H2, DMX evoluciona a **data ecosystem bilateral** — una plataforma donde terceros (bancos, aseguradoras, fondos, gobierno, academia) no solo **consumen** datos DMX (vía API — [ADR-013](./ADR-013_API_AS_PRODUCT.md)) sino también **contribuyen** datos propios agregados al ecosystem, a cambio de scores licenciados, brand co-mentioning o discount en planes.

### Patrones de referencia

| Empresa | Modelo | Revenue mix |
|---------|--------|-------------|
| **Tempus AI** | Precision medicine + genomic data ecosystem | ~50% revenue de data licensing bilateral |
| **Veeva** | CRM pharma + Veeva OpenData + Crossix | ~40% revenue de data products |
| **Cherre** | Real estate Knowledge Graph + vendor integrations | ~60% revenue de data ecosystem |
| **IQVIA** | Healthcare data + 150+ data partnerships | ~$14B revenue basado en data mix |
| **Experian** | Credit data + 1000s of partnerships | Platform de datos bilateral |
| **Bloomberg Terminal** | Financial data + ecosystem de proveedores | $10B+ revenue con data en core |

El patrón consistente: **data ecosystems bilaterales generan 30-50% del revenue** con márgenes ≥90% (data es high-margin comparado con servicios).

### Por qué DMX puede ser data ecosystem (no solo producto)

1. **Posición única de agregación.** DMX cruza SCIAN + catastro + FGJ + DENUE + marketplace propio + listings secundarios + operaciones reales. Ningún otro player LATAM tiene esta combinación.
2. **Marketplace genera datos únicos.** Transacciones reales de compra (precios de cierre, velocity, feedback), visitas, wishlist, search logs — datos que ningún partner externo tiene.
3. **Puente bidireccional.** DMX es uniquely positioned para ser el *interconnector* — cada partner contribuye su slice y recibe agregado del ecosystem.
4. **Compliance listo.** LFPDPPP MX madura, LGPD Brasil, Law 25.326 AR — DMX nace compliant ([ADR-009](./ADR-009_SECURITY_MODEL.md)), facilita data exchange legal.
5. **Revenue high-margin.** Data licensing tiene gross margin ≥90% (costo marginal near-zero). Comparado con marketplace fee ~40% margen, multiplicador 2x en margen.

### H3 revenue split target

[ADR-011](./ADR-011_MOONSHOT_3_HORIZONTES.md) establece target H3:
- 40% marketplace + fee cierre.
- 35% API.
- 25% productos B2B + data ecosystem + financial infra.

Dentro de ese 25%, data ecosystem contribuye la mayor parte (~15-18 puntos) — $750K-$4.5M MRR en H3.

### Fuerzas H2

- Post-FASE 30 API as Product hay ≥50 clientes B2B pagando → base para upsell bilateral.
- Post-FASE 32 Digital Twin genera atracción a partners que quieren embeber twin con su data.
- Regulación LATAM 2026 estabilizada (LFPDPPP maduro, LGPD enforcement claro).
- Tempus AI ejemplo vivo: bilateral data ecosystem *viable* en mercados regulados.

## Decision

**Se adopta estructura de Data Ecosystem Revenue con 3 revenue streams, materializada en FASE 33 (H2).**

### D1 — Revenue streams del data ecosystem

**Stream 1: DMX sells scores/data to partners (outbound)**
Clientes objetivo:
- **Bancos** (Santander, BBVA, Banorte, Citibanamex, HSBC, Inbursa, Scotiabank) → underwriting hipotecario diferenciado por colonia, pricing de crédito.
- **Aseguradoras** (Mapfre, AXA, GNP, MetLife, Qualitas) → póliza de daños calibrada con risk scores (sísmico + hídrico + criminal).
- **Fondos inmobiliarios** (FIBRAs, REITs, PE funds) → site selection + pipeline monitoring + momentum alerts.
- **Gobierno** (SEDATU federal, SEDUVI CDMX, alcaldías, INFONAVIT, FOVISSSTE) → planificación urbana, política pública.
- **Academia** (UNAM, ITAM, Tec Monterrey, ITESO, universidades LATAM) → research access programs.
- **Portales** (Lamudi, Vivanuncios, Mercado Libre Inmuebles) → embed DMX Score en fichas.

**Stream 2: Partners contribute data back (inbound)**
Partners aportan su data agregada + anonimizada al ecosystem:
- **Bancos** → transacciones hipotecarias agregadas (no PII) por colonia, tasa aprobada promedio, LTV, monto.
- **Aseguradoras** → claims data agregada (siniestros por zona por tipo).
- **Fondos** → pipeline data + rendimientos por producto tipo.
- **Portales** → listings feed oficial.
- **Gobierno** → permits, cédulas, resoluciones, zonificación updates.

Intercambio:
- Partner contribuye data → DMX enriquece su ecosystem + mejora scores para todos.
- Partner recibe: scores premium + discount en planes + access exclusivo a insights cross-partner + brand co-mentioning.

**Stream 3: Brand co-mentioning + visibility**
- "DMX Score 8.4 — Powered by [Santander Banking Intelligence]" en fichas proyecto.
- "Insurance Risk Score — Powered by [Mapfre Claims Network]".
- Partners ganan marketing; DMX gana credibilidad + exposición B2B.

### D2 — Contract tiers

| Tier | Target | Pricing | Features | Data contribution |
|------|--------|---------|----------|-------------------|
| **Starter** | Startups, fintechs iniciales | $5,000/mes | 10K queries/día, 1 env (prod o sandbox), email support | Opcional |
| **Pro** | Bancos regionales, aseguradoras medianas, portales | $25,000/mes | 100K queries/día, historical depth 5 años, sandbox + prod, Slack support | Opcional con discount |
| **Enterprise** | Top 10 bancos, aseguradoras Tier 1, gobierno federal | $100,000-$500,000/mes | Unlimited queries, SLA 99.95%, dedicated CSM, custom endpoints, data contribution contract | **Requerida** para pricing óptimo |
| **Academic** | Universidades / research | $500-$5,000/mes (grants) | Anonymized datasets, research API, joint publication rights | **Obligatoria** (research publications citan DMX) |
| **Government** | Federal/state/municipal LATAM | Custom (nego por país) | Dashboard planificación + API + twin access | **Obligatoria** (gobiernos contribuyen permits/zoning) |

### D3 — Compliance framework

Obligatorio por regulación + reputación:

**México: LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares)**
- Consentimiento explícito para cada flujo de datos.
- Aviso de privacidad público detallado.
- Data subject rights (ARCO: Acceso, Rectificación, Cancelación, Oposición).
- INAI notifications si breach.

**UE: GDPR** (para partners europeos o data con residentes UE)
- Lawful basis.
- DPO designated.
- DPIA para high-risk processing.
- Right to be forgotten.

**Brasil: LGPD (Lei Geral de Proteção de Dados)**
- Similar a GDPR con matices.
- ANPD como autoridad.

**Argentina: Law 25.326 (Protección de Datos Personales)**
- AAIP como autoridad.

**Técnicas aplicadas:**
1. **Anonimización** — eliminación de PII antes de agregación.
2. **Agregación** — nunca se expone dato individual; solo colonia / AGEB / zone level.
3. **Differential privacy** — noise gaussiano añadido a agregados sensibles (patrón Apple/Google).
4. **K-anonymity** — k≥5 mínimo (cada fila agregada representa ≥5 sujetos originales).
5. **Data Processing Agreements (DPAs)** entre DMX y cada partner.
6. **Data residency** — data MX permanece en región MX/US East; BR en región BR si partners lo requieren.

### D4 — Partner dashboard

`/partners/dashboard` (auth con partner credentials):

**Secciones:**
- **Overview** — usage mensual, spend, credit remaining.
- **Usage metrics** — queries por endpoint, por día, by API key.
- **Data contribution** — stats de data que el partner aportó + acknowledgement de impact ("Tu data contribuyó a mejorar Walk Score en 42 colonias este mes").
- **Invoices** — históricos, próximo billing, payment methods.
- **Renewal** — contract dates, auto-renewal config, negotiation de expansion.
- **Support** — tickets, Slack channel link, CSM contact.
- **Insights exclusivos** — reports trimestrales cross-partner (anonymized) solo para Enterprise.
- **Compliance** — DPA signed, audit reports, certifications.

### D5 — Revenue allocation

**Target H3 revenue split del ecosystem (25% del total):**
- 40% Outbound (DMX licensing scores) → $300K-$1.8M MRR.
- 20% Inbound discounts materializados en premium scores premium tiers → $150K-$900K MRR.
- 20% Academic/research programs → $75K-$450K MRR (growth steady).
- 20% Government contracts → $150K-$900K MRR.

**Cost structure:**
- Compute: ~5% revenue.
- DPAs + compliance legal: ~10% revenue (legal team H2+).
- CSM + account management: ~15% revenue.
- Partner revenue share (brand co-mentioning discount): ~10% revenue.
- **Net margin: ~60%** — high-margin stream.

## Rationale

### Por qué bilateral (no solo outbound)

- **Outbound only** (solo vender scores) limita al data que DMX puede agregar solo. Cap en ~$500K MRR.
- **Bilateral** (partners contribuyen) crea flywheel: más partners → más data → mejores scores → más demanda → más partners. Scale potencial 5-10x outbound only.
- Tempus AI prueba el modelo: 50% revenue de data licensing *requiere* bilateral.

### Por qué contratos Starter/Pro/Enterprise/Academic/Government

Cubren todas las verticales relevantes sin sobrecomplicar pricing:
- Starter cubre fintechs + startups (adquisición).
- Pro cubre bancos regionales + aseguradoras medianas (expansion).
- Enterprise cubre top tier (revenue concentrado).
- Academic construye credibilidad académica (papers, citations, future hires).
- Government cubre B2G (recurrente, prestigio).

### Por qué compliance first

- LATAM regulation 2026 está enforced. Un data breach o violation LFPDPPP = $15M USD multa + reputación destruida.
- Bancos y aseguradoras NO firman con partners que no demuestran compliance.
- Cost inicial (~10% revenue) es peaje necesario.

### Por qué H2 (FASE 33)

- Requires base de scores maduros (H1 completo) + API as Product (FASE 30).
- Requires compliance maturity (H1 FASE 06 + ongoing).
- Requires bandwidth legal (headcount H2).
- H1 bootstrap no puede soportar DPAs + legal review + CSM hiring.

### Por qué no lo hace CoStar / Cherre

- CoStar tiene B2B data licensing pero **US only + commercial RE**. Residencial LATAM abierto.
- Cherre hace **knowledge graph + integrations** pero *no* bilateral bilateral (no recibe data de partners, solo agrega de vendors).
- Local Logic vende 18 scores B2B → no es ecosystem.
- Ningún competidor LATAM está cerca.

## Consequences

### Positivas

- **Revenue stream high-margin.** Net margin ~60% vs marketplace ~40%. Multiplicador valor.
- **Moat compounding.** Cada partner aporta data → DMX mejora scores → más demanda → más partners. Flywheel autónomo.
- **Credibility institucional.** Bancos top + gobierno usando DMX = prestigio + PR.
- **Barriers to entry altos.** Competidor requiere construir DMX core *+* partner network *+* compliance LATAM. Barrera temporal 24-36 meses.
- **Optionality expansion internacional.** Partners LATAM multi-país aceleran expansión DMX a sus países.
- **Data richness compounding.** Scores mejoran con cada data source. A mayor network, mejor producto.
- **H3 financial infra enabler.** Data ecosystem facilita FASE 36 Fractional Investing + FASE 37 Embedded Banking (partners ya tienen contrato + trust).

### Negativas / tradeoffs

- **Legal overhead significativo.** DPAs + compliance + audits + DPO = team legal H2+ (~$200K-$400K/año + abogados especializados externos).
- **Compliance cost ongoing.** Auditorías, certifications (SOC 2, ISO 27001), data residency — estimado 10% revenue.
- **Complejidad técnica.** Anonymization + differential privacy + k-anonymity + audit logs cross-partner.
- **Partner negotiation cycles largos.** 6-12 meses para firmar Enterprise. Pipeline management crítico.
- **Risk de data breach.** Con data de múltiples fuentes, breach impacto multiplicado. Mitigación: defense in depth + insurance.
- **Data governance complejo.** Políticas de quién puede ver qué, cuándo, cómo, retention, deletion. Requiere Chief Data Officer H2+.
- **Regulatory risk.** LATAM countries pueden cambiar regulación (ya pasó México 2025). Monitoring legal continuo.

### Neutrales

- **Requires GC eng + data governance.** Hiring roles nuevos H2.
- **Data residency multi-country.** Infra adicional por país.
- **Partners churning.** Normal ~10% anual. Incluido en forecast.
- **Pricing transparency vs negotiation.** Pro tier pública; Enterprise con floors público + negociación arriba.

## Alternatives considered

### Alt 1: "Only sell, no buy" (outbound data licensing puro)
**Rechazada.** Cap revenue + no compounding + pierde diferenciación vs CoStar/Cherre que también venden.

### Alt 2: "No data business" (solo producto + API)
**Rechazada.** Deja $50M+/año on table (estimado H3 potential). Competidores lo hacen (Tempus, Veeva proven).

### Alt 3: "White-label" (DMX como backend invisible para partners)
**Rechazada.** Pierde brand DMX. Reduce valuation (marca invisible se commoditiza).

### Alt 4: "Free for partners" (sin charge por data outbound, solo bilateral exchange)
**Rechazada.** Perdemos revenue predecible. Partners ven "gratis" como low-value. Pricing es señal de calidad.

### Alt 5: "Solo gobierno" (enfoque B2G only)
**Rechazada.** B2G ciclos largos + riesgos políticos. Diversificación multi-vertical es más sana.

### Alt 6: "Arrancar data ecosystem en H1"
**Rechazada.** H1 budget + bandwidth + compliance maturity insuficientes. FASE 33 es correcto.

### Alt 7: "Acquire a data vendor" (buy existing data pipeline)
**Rechazada.** Capital intensive + cultural integration risk + la data que queremos (marketplace propio) no se adquiere, se genera.

## Success metrics

- **Partners signed:** 10+ Mes 6 post-FASE 33; 30+ Mes 18; 50+ Mes 24.
- **Revenue ecosystem:** $500K MRR Mes 12 post-FASE 33; $2M MRR Mes 24.
- **Data contribution rate:** ≥60% of Enterprise partners contribute data back.
- **Net margin:** ≥55% sostenido.
- **Compliance:** SOC 2 Type II achieved + zero breaches.
- **Academic citations:** ≥5 papers mencionando DMX Mes 18.
- **Government contracts:** ≥2 federal/estatales contratos LATAM Mes 18.

## References

- [ADR-010 — IE Pipeline Architecture](./ADR-010_IE_PIPELINE_ARCHITECTURE.md) — data pipeline base.
- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) — FASE 33 en H2.
- [ADR-013 — API as Product](./ADR-013_API_AS_PRODUCT.md) — technical layer para partners.
- [ADR-009 — Security Model](./ADR-009_SECURITY_MODEL.md) — compliance base.
- [ADR-015 — Platform Play H2](./ADR-015_PLATFORM_PLAY_H2.md) — platform context.
- [FASE 33 — Data Ecosystem](../02_PLAN_MAESTRO/FASE_33_DATA_ECOSYSTEM.md).
- [07.18 GC-18 Data Marketplace](../07_GAME_CHANGERS/).
- [07.19 GC-19 Bilateral Partnerships](../07_GAME_CHANGERS/).
- [07.22 GC-22 Compliance LATAM](../07_GAME_CHANGERS/).
- LFPDPPP — https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf.
- LGPD Brasil — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm.
- GDPR — https://gdpr-info.eu.
- Tempus AI public materials (investor presentations, S-1 filings).
- Veeva Annual Report 2024.
- Cherre vendor ecosystem docs.
- Apple Differential Privacy whitepaper.

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
