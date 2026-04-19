# ADR-011 — Pivot moonshot: 3 horizontes explícitos (39 fases)

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

DesarrollosMX llegó a mediados de abril de 2026 con el rewrite de BATCH 1 documentado (28 archivos en `/docs`), 10 ADRs cerrados (ADR-001..010), y el plan maestro armado en 30 fases (FASE 00-29) donde `FASE 29` absorbía en forma de *pins* las iniciativas H2/H3 (API premium, app nativa, Knowledge Graph, expansion internacional, etc.).

Tras esa consolidación, el founder revisó el alcance competitivo del producto contra:

- **Empresas que definieron categoría** fuera del vertical inmobiliario: Apple (invariant técnico), Stripe (docs-first), Airbnb (Superhost + community), Tesla (digital twin + OTA), Clay + Lusha + Apollo (GTM enrichment), Palantir (forward-deployed), Tempus AI (data ecosystem bilateral), Anthropic (constitutional AI + agents), Shopify + Salesforce (platform + ecosystem), Spotify + Netflix (personalización flywheel).
- **Competidores verticales inmobiliarios**: CoStar ($35B, US+UK+FR commercial), Cherre (~$300M, US infra-only), Local Logic (~$50M, static scores US+CA), Walk Score (Redfin, 3 scores), First Street (climate-only US), DD360/Wiggot/Pulppo/Compa (CRM MX sin IE temporal).
- **Momentum del mercado AI 2025-2026**: shift de chatbots (reactive) a agents (persistent, tool-using), precio de inference cayendo 10x anual, Vercel AI Gateway + Anthropic Memory API cambiando la economía del agente persistente.
- **Fuerzas regulatorias LATAM**: LFPDPPP MX endurecida 2025, LGPD Brasil en enforcement, Law 25.326 Argentina, abriendo oportunidad *y* fricción para data ecosystems.

La conclusión estratégica: el plan de 30 fases con pins H2/H3 subestimaba el potencial de DMX como **plataforma** (no producto). Las piezas necesarias para convertirse en Spatial Decision Intelligence Platform LATAM con valuation $1-5B en 3-5 años no caben como pins en una sola fase — requieren fases propias, explícitas, con triggers medibles entre ellas.

Fuerzas adicionales:

1. **Equipo actual = founder + Claude Code agents + contratistas puntuales.** No hay headcount para ejecutar 20 fases H2+ en paralelo. El plan debe ser secuencial y con triggers "no pasas al siguiente horizonte sin señal".
2. **Runway proyectado** (bootstrap + angel round) soporta H1 completo y arranque H2. H2 avanzado y H3 requieren Series A / B con métricas probadas.
3. **Deuda documental**: planificar a 36 meses significa que algunos documentos envejecerán antes de ejecutarse. Es un costo aceptable si se compensa con disciplina de revisión pre-fase.
4. **Optionality es valiosa**: 3 horizontes con triggers permiten *pivot mid-course* si una señal H1 indica que H2 debe reordenarse. Un plan monolítico de 30 fases con pins lo penaliza.
5. **Fuerza competitiva**: CoStar, Cherre, Local Logic no están mirando LATAM residencial. La ventana de *ser el primero con esto* es 24-36 meses. Después entran los mismos CoStar/Cherre como *followers* o adquirentes.

## Decision

**Se adopta un plan maestro de 39 fases (FASE 00-38) organizadas en 3 horizontes explícitos, con triggers medibles entre ellos.**

### Estructura

| Horizonte | Fases | Ventana | Revenue target | Geografía | Status |
|-----------|-------|---------|----------------|-----------|--------|
| **H0 — Foundation** | 00-06 | Mes 0-3 (histórico + actual) | $0 (pre-revenue) | N/A (infraestructura) | En ejecución |
| **H1 — MVP Platform** | 07-29 | Mes 3-9 | $50K-500K MRR | CDMX + Monterrey | Planificado |
| **H2 — Platform Play** | 30-35 | Mes 9-24 | $500K-5M MRR | LATAM 5 países (MX, CO, AR, BR, CL) | Triggered |
| **H3 — Financial Infra + International** | 36-38 | Mes 24-36+ | $5M-25M MRR | 8-12 países (+US Latinx) | Triggered |

H0 queda fuera de este ADR (ya ejecutado / en curso según CONTRATO_EJECUCION). Los horizontes H1/H2/H3 son el foco.

### H1 — MVP Platform (Fases 07-29)

| Fase | Título breve | Objetivo clave |
|------|--------------|----------------|
| 07 | Ingesta Datos | 50+ fuentes, Chrome ext GC-27, admin upload |
| 08-12 | IE Scores N0-N5 | 118 scores + 7 índices + cascadas |
| 13 | Marketplace Público | /explorar, ficha, /indices, /metodologia |
| 14-16 | CRM Asesor M1-M10 | 10 módulos Dopamine |
| 17 | Portal Desarrollador | Contabilidad + IE overlays |
| 18 | Portal Comprador | 10 pages + personalización Netflix |
| 19-20 | AI Copilot + Agentes | Copilot sidebar + 5 agentes especializados |
| 21 | Gamification | Streaks + XP + ligas |
| 22 | Notificaciones + Webhooks | 20 tipos × 4 canales + 12 event types |
| 23 | Monetización | Planes asesor/dev, fee cierre, API starter |
| 24 | Admin | /admin, Market Observatory |
| 25 | Performance + PWA | Core Web Vitals green, offline básico |
| 26 | i18n catálogos | SCIAN, estados, colonias en 5 locales |
| 27 | Testing | Vitest + Playwright coverage >70% |
| 28 | Launch soft | Piloto 30-50 asesores + 5-10 devs |
| 29 | Scaffold H2/H3 | Hooks preparatorios para FASE 30+ |

**Revenue target H1:** $50K-500K MRR (blended asesor subs + fee cierre + API starter). Hitos de retention D30 ≥40% asesores / ≥25% compradores, NPS ≥50 / ≥45. Mención prensa tier 1 ≥3.

### H2 — Platform Play (Fases 30-35)

| Fase | Título breve | Trigger pre-requerido |
|------|--------------|----------------------|
| 30 | API as Product (Stripe-like) | >$100K MRR + 3+ clientes API B2B activos |
| 31 | Agentic Marketplace | Copilot H1 con >500 DAU + Anthropic Memory activa |
| 32 | Digital Twin 4D | ≥3 snapshots completos CDMX + Mapbox Standard validado |
| 33 | Data Ecosystem Bilateral | LFPDPPP compliance + 2+ partners firmados |
| 34 | Creator Economy (App Store) | API as Product live + 20+ desarrolladores externos manifestaron interés |
| 35 | DMX Terminal (B2B Enterprise) | 5+ clientes B2B Pro plan + solicitud explícita workstation |

**Revenue target H2:** $500K-5M MRR. Split pre-H3: marketplace 45% / API 30% / B2B products 25%. Cobertura geográfica: LATAM 5 países operando (datos calibrados en ≥20 ciudades Tier 1).

### H3 — Financial Infra + International (Fases 36-38)

| Fase | Título breve | Trigger pre-requerido |
|------|--------------|----------------------|
| 36 | Fractional Investing (tokenización) | Data ecosystem FASE 33 en producción + regulación CNBV clarificada |
| 37 | Embedded Banking (hipotecas + escrow) | Partnership ≥1 banco tier 1 MX + AML/KYC UIF compliance maduro |
| 38 | Expansión Internacional (US Latinx + BR + CL) | Revenue >$3M MRR + 2 países LATAM con retention comparable a MX |

**Revenue target H3:** $5M-25M MRR. Revenue split: 40% marketplace + fee cierre / 35% API / 25% productos B2B + financial infra. Valuation objetivo: $1-5B. Series B target: $100M+.

### Triggers entre horizontes (no opcionales)

**Antes de iniciar H2** (FASE 30):
- ≥ $100K MRR sostenido 2 meses consecutivos.
- ≥ 200 asesores activos pagando.
- ≥ 3 clientes API B2B pagando (no Starter gratis).
- NPS asesor ≥50, comprador ≥45.
- ≥ 3 menciones prensa tier 1 citando "DMX Score".
- audit-dead-ui pasando con 0 violations en `main`.

**Antes de iniciar H3** (FASE 36):
- ≥ $3M MRR sostenido 3 meses.
- LATAM ≥ 5 países operando (MX + 4).
- DMX Estimate error <15% vs cierre real en ≥3 ciudades.
- Digital twin v1 desplegado en ≥3 capitales LATAM.
- Data ecosystem con ≥10 partnerships bilaterales activas.
- Series A cerrada (mínimo $20M).

Si los triggers no se cumplen, el horizonte se **posterga**, no se ejecuta con métricas por debajo. Esta disciplina es la diferencia entre un moonshot disciplinado y un zombie startup.

## Rationale

### Por qué 3 horizontes (y no 2 o 5)

**Dos horizontes** (H1 launch / H2 everything) colapsa en un mega-H2 difícil de ejecutar y difícil de vender a inversores. Mezclar "API as product" con "embedded banking" en un mismo horizonte oculta la secuencia de compounding (primero la plataforma + ecosystem crea la reputación; después la reputación viabiliza los productos financieros).

**Cinco horizontes** (o más) crea sobre-planificación. Cada horizonte adicional multiplica el tiempo de mantenimiento de docs, y los planes >18 meses son poco fiables. Con 3 horizontes cubrimos los *modos* del negocio (MVP, Platform, Financial Infra) sin fraccionar artificialmente.

### Por qué fases propias (y no pins H2/H3 en FASE 29)

La versión previa del plan ponía H2/H3 como *pins* en `FASE 29.A`, `29.B`, etc. Problemas:
- No asigna responsabilidad clara de scope.
- No permite triggers medibles (¿cuándo arrancamos el pin 29.F?).
- Mezcla el scope operacional (FASE 29 scaffold) con el scope estratégico (plataforma completa).

Al darles **fase propia** (FASE 30, 31, ... 38) cada iniciativa tiene:
- Documento `FASE_NN_*.md` con su spec completa.
- Triggers explícitos pre-requisito.
- E2E Verification Checklist propio ([ADR-018](./ADR-018_E2E_CONNECTEDNESS.md)).
- Métricas de éxito medibles.

### Por qué estos triggers específicos

Los triggers mezclan **métricas de negocio** (MRR, retention, NPS) con **métricas de producto** (audit-dead-ui pasando, NPS, error <15%) con **métricas de compliance** (LFPDPPP maduro, AML/KYC). Esa mezcla evita tres fallos comunes:
- Triggers solo de revenue → se cumplen con tráfico hollow sin retention.
- Triggers solo de producto → se cumplen sin validación de mercado.
- Triggers solo de compliance → se cumplen en burbuja legal sin producto listo.

### Inspiración explícita

- **Stripe** (docs-first platform, $95B): FASE 30 replica el playbook completo — docs portal interactivo, SDKs multi-lenguaje, sandbox, webhooks, devrel.
- **Nvidia** (CUDA ecosystem): IE registry + API as product = "CUDA" del spatial decision intelligence.
- **Palantir** (forward-deployed + data-to-decisions): DMX Terminal FASE 35 replica el modelo B2B Enterprise workstation.
- **Tempus AI** (precision + data ecosystem bilateral): FASE 33 replica el contrato bilateral partners.
- **Airbnb** (Superhost + community): gamification H1 (FASE 21) + creator economy H2 (FASE 34).
- **Tesla** (digital twin): FASE 32.
- **Anthropic** (constitutional AI + agents persistentes): FASE 19-20 H1 + FASE 31 H2.
- **Shopify / Salesforce** (platform + app store): FASE 34.

## Consequences

### Positivas

- **Roadmap claro 36 meses.** Stakeholders (inversores, partners estratégicos, asesores piloto) pueden ver la trayectoria completa sin tener que adivinar "qué viene después del MVP".
- **Deferral disciplinado.** H2 y H3 no compiten con H1 por recursos: el código H1 se puede escribir con la confianza de que las fases posteriores ya tienen su hogar documental.
- **Moat compounding.** Cada fase H2+ no reemplaza H1 — la amplifica. API as Product (FASE 30) amplifica scores H1. Digital twin (FASE 32) amplifica marketplace H1. Data ecosystem (FASE 33) amplifica feedstock H1.
- **Optionality preservada.** Si la señal H1 indica que (p. ej.) la demanda es más B2B que B2C, podemos reordenar H2 (mover FASE 35 DMX Terminal antes de FASE 34 Creator Economy) sin romper el plan.
- **Series A/B pitch estructurado.** Los inversores reconocen patrones (Stripe / Palantir / Tempus) y valoran triggers explícitos.
- **Hiring roadmap claro.** H2 requiere DevRel + 3D engineer + data legal. H3 requiere fintech compliance + expansion GM. El plan les dice cuándo entrar.

### Negativas / tradeoffs

- **Mayor deuda documental inicial.** Pasamos de ~35 docs fase a ~48 docs fase. Mantener los H2/H3 actualizados cuando aún no se ejecutan es un costo recurrente.
- **Riesgo de prematura claridad.** Los planes H3 pueden quedar obsoletos antes de ejecutarse (p. ej., si CNBV cambia regulación fractional investing). Mitigación: cada fase H2+ tiene revisión obligatoria pre-arranque donde se re-valida el plan contra contexto actual.
- **Complejidad de gobernanza documental.** ADRs se pueden contradecir con un plan tan largo. Mitigación: `ADR-011` (este) es el *source of truth* para alcance de horizontes, ADRs específicos de cada capacidad (012-018+) son ortogonales.
- **Fatiga del equipo.** Un roadmap de 36 meses puede desmoralizar en semana 12 del H1. Mitigación: H1 celebra hitos propios (fase-NN-complete tags); H2+ se mencionan en all-hands pero no en daily work H1.

### Neutrales

- **FASE 29 (H2/H3 scaffold) absorbe mayor detail.** En lugar de pins inline, FASE 29 se convierte en "hooks preparatorios" (feature flags, stubs marcados con `// STUB — activar FASE 30`, migrations previstas sin ejecutar) que la fase real consume.
- **Algunos pins 29.A originales se deprecan.** Lo que era `29.A API premium` ahora es FASE 30 completa; el pin se elimina. Lo que era `29.G Fractional investing` ahora es FASE 36; el pin se elimina.
- **Los ADRs 012-018 nacen conjunto con este.** Cada uno cubre una dimensión (scraping, API, agentic, platform, twin, data, E2E) para que ADR-011 solo trate de *horizontes*, no de implementación.

## Alternatives considered

### Alt 1: Mantener 30 fases con H2/H3 solo en pins FASE 29
**Rechazada.** Problemas ya expuestos en Rationale: no asigna responsabilidad, no permite triggers, mezcla scopes. Adicionalmente, convertir un único documento FASE 29 en el carry-all de ~15 iniciativas independientes hace ese doc ingestionable (estimado >600 líneas sólo para listar pins).

### Alt 2: 50 fases totales con granularidad alta (cada feature = fase)
**Rechazada.** Sobre-planificación. 50 fases implica cada una dura ~2 semanas en promedio; a ese grano la estructura de FASE_NN.md pierde valor (se vuelve lista de tickets). Además genera rigidez: si una fase chica necesita 3 semanas, todas las dependientes se corren.

### Alt 3: 2 horizontes (H1 launch / H2 everything else)
**Rechazada.** Colapsa 9 iniciativas muy diferentes (API product, agents, digital twin, data ecosystem, creator economy, DMX Terminal, fractional investing, embedded banking, international) en un mega-H2. Pierde el patrón Stripe/Palantir de *platform maturity before financial infra*. Pierde también el trigger natural "H2 valida plataforma antes de entrar a fintech H3".

### Alt 4: 4 horizontes (H1 MVP / H2 Platform / H3 Financial / H4 Global)
**Rechazada.** Agrega complejidad sin claridad adicional. La separación Financial vs Global es artificial: los productos financieros H3 escalan internacionalmente en el mismo movimiento. Sumarlos en H3 respeta el flujo operativo.

### Alt 5: Horizontes sin triggers (solo fases secuenciales)
**Rechazada.** Es el modo "cada fase sale cuando la anterior termina" sin considerar señal de mercado. Riesgo: ejecutar FASE 30 API as Product cuando solo tenemos 2 clientes dispuestos, quemando runway. Triggers obligatorios protegen contra "build for build's sake".

## Detalle expandido de horizontes

### Matriz resumen triggers × target × fases clave

| Horizonte | Trigger para iniciar | Revenue target | Ciudades | Hitos externos | ADRs aplicables |
|-----------|----------------------|----------------|----------|----------------|-----------------|
| H0 | N/A (cierre v5.1) | $0 | 0 | v5.1 closed, rewrite iniciado | 001-010 |
| H1 | Rewrite H0 completo | $50K-$500K MRR | CDMX + MTY | Soft launch piloto, 3 menciones prensa, audit-dead-ui 0 | 011-018 + 001-010 |
| H2 | $100K MRR + NPS ≥50 + 3 clientes API B2B | $500K-$5M MRR | LATAM 5 | Digital twin desplegado 3 capitales, app store, 50+ clientes B2B | 013-017 expandidos |
| H3 | $3M MRR + LATAM 5 operando + Series A | $5M-$25M MRR | 8-12 países | Series B $100M+, fractional investing regulado, embedded banking | Nuevos ADRs 019+ |

### H1 — revenue model breakdown (target $50K-$500K MRR)

| Stream H1 | Mes 3 | Mes 6 | Mes 9 (cierre H1) |
|-----------|-------|-------|-------------------|
| Asesor subs (Starter $499 + Pro $999 + Enterprise $2499) | $5K | $50K | $150K |
| Fee cierre 0.5% | $0 | $20K | $80K |
| Dev subs ($999-$2999) | $3K | $15K | $50K |
| API B2B Starter (Free/Starter $99/Pro $999) | $0 | $5K | $40K |
| Chrome ext Pro/Enterprise requirement | incluido | incluido | incluido |
| **Total MRR** | **$8K** | **$90K** | **$320K** |

### H2 — revenue model breakdown (target $500K-$5M MRR)

| Stream H2 | Mes 12 | Mes 18 | Mes 24 (cierre H2) |
|-----------|--------|--------|--------------------|
| Asesor subs LATAM 5 países | $250K | $600K | $1.2M |
| Fee cierre (marketplace volume) | $150K | $400K | $800K |
| Dev subs LATAM | $100K | $300K | $600K |
| API B2B (Starter → Pro → Business tiers) | $200K | $800K | $1.5M |
| Data ecosystem (ADR-017) | $50K | $200K | $500K |
| App Store revenue share (ADR-015) | $0 | $30K | $100K |
| DMX Terminal (FASE 35) | $0 | $100K | $400K |
| **Total MRR** | **$750K** | **$2.43M** | **$5.1M** |

### H3 — revenue model breakdown (target $5M-$25M MRR)

| Stream H3 | Mes 28 | Mes 32 | Mes 36 (cierre H3) |
|-----------|--------|--------|--------------------|
| Marketplace + fee cierre (40%) | $2M | $4M | $8M |
| API (35%) | $1.8M | $3.5M | $7M |
| Products B2B + Data (15%) | $800K | $1.5M | $3M |
| Financial infra (fractional + embedded banking, 10%) | $200K | $1M | $2M |
| International (US Latinx + BR + CL) (variable) | $500K | $2M | $5M |
| **Total MRR** | **$5.3M** | **$12M** | **$25M** |

### Mapeo de ADRs por horizonte

| Dimensión | H1 | H2 | H3 |
|-----------|----|----|----|
| Scraping / data acquisition | ADR-012 (Chrome ext + upload) | ADR-017 (partnerships) | ADR-017 + ADR-019 (H3 future) |
| API | ADR-013 básica (FASE 23) | ADR-013 full (FASE 30) | ADR-013 + ADR-019 Enterprise expansion |
| AI / agents | ADR-014 H1 (Copilot + 5 agents) | ADR-014 H2 (Agent Marketplace) | ADR-014 expandido |
| Platform / ecosystem | N/A | ADR-015 FASE 34 | ADR-015 + white-label |
| Digital twin | N/A | ADR-016 FASE 32 | ADR-016 + NVIDIA Omniverse evaluación |
| Data ecosystem | N/A | ADR-017 FASE 33 | ADR-017 + Financial data |
| E2E connectedness | ADR-018 (regla inviolable) | ADR-018 | ADR-018 |
| Financial infra | N/A | N/A | Nuevos ADRs FASE 36/37 |
| International | N/A | LATAM 5 (schema ADR-003) | Nuevos ADRs FASE 38 |

### Roadmap visual (texto)

```
  H0 (mes -3 → 0)      H1 (mes 0-9)              H2 (mes 9-24)              H3 (mes 24-36+)
  ═════════════════    ═══════════════════════   ═══════════════════════    ═══════════════════════
  rewrite base         MVP Platform              Platform Play              Financial Infra + Global
                       FASE 07-29                FASE 30-35                 FASE 36-38
                                                                            
  CDMX research        CDMX + MTY                LATAM 5 países             8-12 países
  Stack H1 fijado      Chrome ext GC-27          Digital twin 4D            Fractional investing
  ADRs 001-010         Agentic Copilot           Agentic Marketplace        Embedded banking
                       IE 118 scores             API as Product (Stripe)    US Latinx expansion
                       Gamification              Data Ecosystem bilateral   Series B $100M+
                       Soft launch piloto        Creator Economy            Valuation $1-5B
                                                 DMX Terminal B2B Ent
                                                 
  $0                   $50K - $500K MRR          $500K - $5M MRR            $5M - $25M MRR
                                                                            
  ▼ trigger:           ▼ trigger:                ▼ trigger:
   v5.1 closed          $100K MRR + NPS ≥50       $3M MRR + LATAM 5 + Series A
```

## Migration plan (cómo se aplica este ADR)

1. **Actualizar 00.1_VISION §8** con los 3 horizontes (ya ejecutado en biblia v2).
2. **Reescribir 02.0_INDICE_MAESTRO** para incluir FASE 30-38 (SUB-AGENT 2).
3. **Crear FASE_30..FASE_38.md** como documentos skeleton (SUB-AGENT 2).
4. **Refactor FASE_29.md** para convertir pins H2/H3 previos en "hooks preparatorios" que alimenten FASE 30+.
5. **Cada ADR 012-018** atiende una dimensión específica del moonshot sin duplicar contenido con este.
6. **CONTRATO_EJECUCION §7** incluye regla "cada fase H2+ valida triggers pre-arranque".

## Revisión periódica

Este ADR se revisa obligatoriamente:
- **Cierre H1 (mes 9):** validar triggers H2, ajustar revenue breakdown, re-confirmar scope FASE 30-35.
- **Cierre H2 (mes 24):** validar triggers H3, ajustar scope FASE 36-38 contra realidad regulatoria LATAM.
- **Post-Series A (en algún punto H2):** revisión integral con nuevo board.
- **Ad-hoc:** si una señal de mercado fuerte cambia hipótesis (p. ej. regulación CNBV bloquea fractional investing) → revisión inmediata.

La obsolescencia parcial de este ADR en H3 es esperada (planning 36 meses no predice el detalle fino). Lo que no debe cambiar sin ADR nuevo: la estructura 3-horizontes + triggers medibles entre ellos.

## References

- [ADR-001_REWRITE_DESDE_CERO](./ADR-001_REWRITE_DESDE_CERO.md) — decisión matriz del rewrite (horizontes son extensión natural).
- [ADR-012_SCRAPING_POLICY](./ADR-012_SCRAPING_POLICY.md) — afecta alcance H1 (FASE 07).
- [ADR-013_API_AS_PRODUCT](./ADR-013_API_AS_PRODUCT.md) — expande FASE 30.
- [ADR-014_AGENTIC_ARCHITECTURE](./ADR-014_AGENTIC_ARCHITECTURE.md) — expande FASE 19-20 (H1) + FASE 31 (H2).
- [ADR-015_PLATFORM_PLAY_H2](./ADR-015_PLATFORM_PLAY_H2.md) — expande FASE 34.
- [ADR-016_DIGITAL_TWIN](./ADR-016_DIGITAL_TWIN.md) — expande FASE 32.
- [ADR-017_DATA_ECOSYSTEM_REVENUE](./ADR-017_DATA_ECOSYSTEM_REVENUE.md) — expande FASE 33.
- [ADR-018_E2E_CONNECTEDNESS](./ADR-018_E2E_CONNECTEDNESS.md) — regla transversal a todas las fases.
- [00.1_VISION_Y_PRINCIPIOS §1.bis + §8](../00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md) — síntesis del pivot.
- [02.0_INDICE_MAESTRO](../02_PLAN_MAESTRO/02.0_INDICE_MAESTRO.md) — listado actualizado de fases.
- [FASE 29 — Scaffold H2/H3](../02_PLAN_MAESTRO/FASE_29_SCAFFOLD_H2_H3.md) — hooks preparatorios.
- Christensen, C. (1997) *The Innovator's Dilemma* — patrón "platform first, financial infra second".
- Moore, G. (1991) *Crossing the Chasm* — triggers entre horizontes evitan "chasm premature jump".
- Reid Hoffman — "Blitzscaling" playbook, matizado: blitzscale solo con triggers, no con fe.

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
