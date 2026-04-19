# FASE 20 — Portal Comprador (10 Pages + Personalización Netflix + Family Accounts + WhatsApp Primary + UPG 7.11 Buyer Experience)

> **Duración estimada:** 6-8 sesiones Claude Code (~24-32 horas con agentes paralelos) para core + 1-2 sesiones extra para BLOQUE 20.L PPD + Innovations (total 7-10 sesiones)
> **Dependencias:** FASE 02 (Auth + RLS + role='comprador' + resolve_features), FASE 03 (AI-Native Shell + Copilot + Voice), FASE 04 (Design System), FASE 05 (i18n + multi-currency), FASE 08-12 (IE scores A01-A11 + H14 Buyer Persona + C03 Matching + isócronas F13), FASE 17 (Document Intel pública read-only), FASE 18 (escrow + pre-aprobación widgets), FASE 21 (landing pública — onboarding cross-portal).
> **Bloqueantes externos:**
> - **Meta WhatsApp Business API approval** (2-4 semanas para templates aprobados — crítico y no paralelizable).
> - **Vercel AI SDK v6** con Claude Sonnet 4 + GPT-4o-mini para Copilot comprador.
> - **Twilio** backup para SMS si WA falla.
> - **Mapbox token** para mapas ficha + isócronas commute.
> - Stripe + pre-aprobación widgets (Fase 18 implementa, Fase 20 consume).
> - **PWA manifest + service worker** (Fase 25 optimiza — acá wiring básico).
> **Resultado esperado:** Portal Comprador `(comprador)` group con 10 páginas completas. Personalización Netflix (homepage per buyer_persona). Family accounts (wishlist compartida, roles, invites). WhatsApp primary (onboarding + notifs via WA). Pre-aprobación crediticia widget. Apartado escrow UX. Voz + AI Copilot proactivo. UPG 7.11 (9 herramientas 90-98 Buyer Experience). T&Cs disclaimer DMX es infraestructura. Notificaciones multi-canal. Account settings + preferences + notifs config + family invites. Mobile PWA base. Tag `fase-20-complete`.
> **Priority:** [H1]

## Contexto y objetivo

El comprador es el usuario final de DMX. A diferencia del asesor (profesional) o dev (B2B), el comprador necesita **confianza + claridad + simplicidad + delight**. La personalización Netflix (homepage per `buyer_persona`) convierte DMX en una experiencia personal, no genérica — un inversor ve ROI/yield primero, una familia ve schools/safety primero, un primerizo ve affordability/crédito primero.

Los aspectos MX específicos son: **family accounts** (las decisiones de compra son familiares, no individuales — pareja + padres opinan), **WhatsApp primary** (México vive en WA, no email — onboarding, chat asesor, notifs), **pre-aprobación express** (integración directa con bancos remueve el paso "ir a ventanilla").

Crítico:
- DMX NO es responsable post-venta (ADR-008) — disclaimer visible en onboarding + T&Cs + footer.
- UPG 7.11 (Sub-etapa 7.11, contexto §23.1, upgrades 90-98) mapea directo a esta fase — 9 herramientas Buyer Experience con datos reales.
- Copilot proactivo: inicia conversaciones cuando detecta oportunidad ("3 proyectos nuevos match tu búsqueda"). No es chatbot reactivo.

## Game-changers integrados en esta fase

| GC | Nombre | Impacto | Bloque/Módulo |
|---|---|---|---|
| GC-62 | Lifestyle DNA matching | Quiz 10 preguntas → perfil detallado → matching personalizado más allá de buyer_persona | Módulo 20.A.3 (nuevo onboarding extendido) + 20.E.2 (nuevo) |
| GC-68 | Commute REAL calendar-aware | Integra Google Calendar; calcula commute a destinos frecuentes usando tráfico REAL Mapbox | Módulo 20.D.5 (nuevo en Property detail) |
| GC-69 | Tax + fees true cost | ISAI + honorarios notario + predial proyectado + HOA: costo total verdadero | Módulo 20.D.6 (nuevo en Property detail) |
| GC-71 | Compare 5 side-by-side | Ampliación del Comparador (hoy 2-5) con hard limit 5 + ordering + personalización Lifestyle DNA | Módulo 20.D.1 amplía |
| GC-4 | Voice search español MX | Voice input default mobile + comandos "muéstrame X" + TTS proactivo | Módulo 20.H.3 amplía |

## Bloques

### BLOQUE 20.A — Layout `(comprador)` group + onboarding

#### MÓDULO 20.A.1 — Layout + guard

**Pasos:**
- `[20.A.1.1]` Ruta `app/(comprador)/layout.tsx` con guard role='comprador' OR public (algunos paths semi-públicos como /explorar).
- `[20.A.1.2]` Sidebar 10 items (iconos + labels): Dashboard, Lifestyle Match, ¿Me Alcanza?, Simulador Inv, TCO, Patrimonio 20y, Comparador, Timing, Watchlist, Discover Weekly.
- `[20.A.1.3]` Header con Family selector (si múltiples family accounts) + language switcher + notif bell + avatar.
- `[20.A.1.4]` AI Copilot sidebar persistente (FASE 03) con contexto comprador + voice button prominente.
- `[20.A.1.5]` Tint light per-page (bgLavender default, bgMint family, bgPeach calc pages).

**Criterio de done del módulo:**
- [ ] Login comprador carga `/comprador/dashboard`.
- [ ] Sidebar 10 items clickables.

#### MÓDULO 20.A.2 — PPD Capa 1: Micro-onboarding inicial (3-5 preguntas, ~60s)

> Implementa Capa 1 de [ADR-021 Progressive Preference Discovery](../01_DECISIONES_ARQUITECTONICAS/ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md). Reemplaza el onboarding 5-step monolítico anterior. **Las propiedades quedan visibles desde minuto 0** — no hay paywall psicográfico.

Pasos:
- [20.A.2.1] Si `profiles.onboarding_completed=false` AND `profiles.onboarding_wave=0` → **soft prompt** (banner dismissable, no modal full-screen) "¿Quieres mejores matches en 60 segundos?". Default skip OK; user puede explorar sin completar.
- [20.A.2.2] Card full-screen mobile (sheet en desktop) con `<ProgressBarMultiSegment segments={5} current={N}/>` arriba.
- [20.A.2.3] **Pregunta 1 — Presupuesto + forma pago**: rango precio + radio (contado / crédito / mixto). Skip → default presupuesto inferido por zona seleccionada (Capa 3).
- [20.A.2.4] **Pregunta 2 — Timeline**: radio "ya busco" / "3-6 meses" / "investigación". Skip → default "investigación".
- [20.A.2.5] **Pregunta 3 — Buyer persona**: cards con icon (first_time / investor / upgrade_family / couple_first / retiree / relocation_regional / relocation_international). Skip → null (Capa 3 inferirá behavioral).
- [20.A.2.6] **Pregunta 4 — Zona interés inicial**: ciudad + 1-2 alcaldías (autocomplete con `supported_cities` + `colonias` table). Skip → default ciudad de profile.country_code.
- [20.A.2.7] **Pregunta 5 — Situación familiar**: solo / pareja / con_hijos / ampliando / empty_nester. Skip → null.
- [20.A.2.8] Al terminar (o skip): set `profiles.onboarding_wave=1`, `profiles.onboarding_completed=false` (queda abierto a Capa 2). Persist en `profiles.psychographic_profile.layer1` jsonb.
- [20.A.2.9] Trigger explore con propiedades relevantes filtradas por zona+presupuesto. Mostrar T&Cs disclaimer DMX como infraestructura (link footer + checkbox en step 1, no obligatorio bloqueante).

Criterio de done del módulo:
- [ ] Flow Capa 1 completable en <60s con todas las respuestas O en <10s skip-all.
- [ ] Persiste en `profiles.psychographic_profile.layer1`.
- [ ] Propiedades visibles incluso con skip-all.

#### MÓDULO 20.A.3 — PPD Capa 2: Micro-questions embedded engine

> Implementa Capa 2 de ADR-021. Trigger engine frontend lanza preguntas dinámicas durante navegación.

Pasos:
- [20.A.3.1] Tabla `micro_questions_catalog` con vocabulario versionado (~20-30 preguntas distribuidas en categorías Emocional/Técnico/Urbano/Financiero/Espacial/Inversión). Catálogo seed FASE 20 con prioridad + cooldown_days + trigger_conditions jsonb.
- [20.A.3.2] Engine trigger frontend: hook `usePPDQuestionTrigger()` que evalúa cada N interacciones (3-7 dinámico), respeta cooldown 7d per question, max 1 pregunta per session browser.
- [20.A.3.3] UI: toast-style bottom sheet (no modal blocking). 3-4 opciones swipe-dismissable. Skip siempre disponible. Tiempo respuesta <10s.
- [20.A.3.4] Persist en `user_micro_question_answers` (one row per answer + context jsonb snapshot).
- [20.A.3.5] **NON-ADAPTIVE en catálogo**: el set de preguntas no cambia según respuestas previas. Solo cambia el orden/timing en que aparecen (behavioral-driven). Documentado en código + tests.
- [20.A.3.6] Cada answer dispara recompute parcial de `match_score` para próximas vistas (event-driven optimistic UI).

Criterio de done del módulo:
- [ ] Catálogo seed con ≥20 preguntas distribuidas en 6 dimensiones.
- [ ] Engine respeta cooldown + max-per-session.
- [ ] Skip funciona y NO bloquea exploración.
- [ ] Audit log per answer.

#### MÓDULO 20.A.4 — PPD Capa 3: Behavioral inference engine

> Implementa Capa 3 de ADR-021. Server job que destila `inferred_preferences` desde behavioral signals.

Pasos:
- [20.A.4.1] Tabla `behavioral_signals` particionada mensual via pg_partman. Schema: id, user_id, signal_type (dwell|photo_zoom|map_expand|save|skip|contact|price_skip|story_read), property_id nullable, signal_data jsonb, created_at. BRIN index (user_id, created_at).
- [20.A.4.2] Frontend hooks: `usePPDSignal(signalType, payload)` invocado desde swipe deck, ficha, mapa, comparador. Throttle a 1 send per signal_type per second.
- [20.A.4.3] Cron `ppd_inference_recompute` daily (FASE 12) recalcula `profiles.inferred_preferences jsonb` por user con confidence per dimension (0-1).
- [20.A.4.4] Trigger event-based si user cruza ≥50 interacciones nuevas → recompute incremental.
- [20.A.4.5] Output integra en `match_score` cuando `user_micro_question_answers` no cubre dimensión (Capa 2 prevalence high; Capa 3 fills gaps).
- [20.A.4.6] Privacy: `behavioral_signals` queda fuera de exports user-facing y de logs (LFPDPPP).

Criterio de done del módulo:
- [ ] Tabla particionada con datos de prueba.
- [ ] Cron run sin error con >100 users seed.
- [ ] inferred_preferences poblado con confidence per dim.

#### MÓDULO 20.A.5 — PPD Capa 4: Profile transparency UI (/profile/dna)

> Implementa Capa 4 de ADR-021. UI pública per-user de "lo que DMX sabe de ti".

Pasos:
- [20.A.5.1] Route `app/(comprador)/profile/dna/page.tsx` con `<RadarChart6D values={...} confidenceByDim={...} />` (componente FASE 04 módulo 4.P).
- [20.A.5.2] Completion meter % calculado desde answers count + signals count + dimensions covered.
- [20.A.5.3] "Lo que DMX sabe de ti" — lista editable: cada item muestra label + value detected + ConfidenceBadge + botón "Editar" (override manual via answer al micro-question).
- [20.A.5.4] Share para pareja/familia (co-match): genera URL share-link con read access a profile dna del invitee. Usa `family_accounts` infrastructure (BLOQUE 20.F).
- [20.A.5.5] CTA optional "Survey rápido 10-15 preguntas" (boost match score más rápido sin esperar Capa 2 organic).
- [20.A.5.6] Settings toggle `dna_visible` (boolean, default true) para opt-out de transparency UI (privacy-conscious users).

Criterio de done del módulo:
- [ ] Route renderiza con datos reales.
- [ ] RadarChart6D muestra 6 ejes + confidence.
- [ ] Edit cycle: user override → reflected in match_score próxima carga.

### BLOQUE 20.B — 10 Pages — Dashboard, Lifestyle, Affordability

#### MÓDULO 20.B.1 — Page 1: Dashboard personalizado (Netflix-style)

**Pasos:**
- `[20.B.1.1]` `/comprador/dashboard/page.tsx`. Primera carga: query `user_scores.buyer_persona` → adapta orden secciones.
- `[20.B.1.2]` Secciones (orden dependiente):
  - **investor**: (1) ROI/Yield highlights top picks, (2) Cash flow simulator card, (3) Market Cycle B05 insight, (4) Gentrification opportunities, (5) Wishlist.
  - **family_growing**: (1) Matches con schools rating alto, (2) Safety map overlay zones, (3) Affordability calculator, (4) Watchlist, (5) Visitas próximas.
  - **first_buyer**: (1) Pre-aprobación crediticia widget prominent, (2) Affordability A01 simplified, (3) Infonavit/Fovissste calc, (4) Curated "primer hogar" picks, (5) Educational content.
  - **empty_nest**: (1) Downsize/simplify picks, (2) Low-maintenance amenities, (3) Senior-friendly zones (N10), (4) Investment alternativas patrimonio.
  - **executive_downtown**: (1) Walkability + transit premium zones, (2) Concierge services amenities, (3) TCO premium, (4) Prestige neighborhoods.
  - **remote_worker**: (1) Co-working nearby, (2) Fast internet + concurrence amenity, (3) Livability N10 + Nightlife N09, (4) Lifestyle Match A10.
- `[20.B.1.3]` Artwork personalizado: thumbnails de proyectos cambian según persona (inversor ve hero con number ROI, familia ve hero con sonrisa niños, etc.) — patrón Netflix artwork A/B.
- `[20.B.1.4]` Carousel horizontal "Porque te gusta X, te puede gustar Y" (collaborative filtering basado en wishlist + search_logs).
- `[20.B.1.5]` Widget Dopamine: "Property of the week" hero grande.

**Criterio de done del módulo:**
- [ ] Cambiar buyer_persona en perfil → orden secciones actualiza.
- [ ] Artwork per persona diferente.

#### MÓDULO 20.B.2 — Page 2: Lifestyle Match (A10, 6 perfiles)

**Pasos:**
- `[20.B.2.1]` `/comprador/lifestyle-match/page.tsx`:
  - Selector 6 perfiles (quiet / nightlife / family / fitness / remote_worker / investor).
  - Score 0-100 por zona según perfil seleccionado.
  - Mapa top 10 zonas con color-scale.
- `[20.B.2.2]` Consume `trpc.scores.getA10LifestyleMatch({ profile, city })`.
- `[20.B.2.3]` Side panel zona clicada: breakdown score (ecosystem type matches, crime low, transit quality, amenity mix).
- `[20.B.2.4]` Recomendación AI: "Basado en tu perfil 'fitness', Condesa y Del Valle destacan por parques + gym density + walkable."
- `[20.B.2.5]` CTA "Ver proyectos en zona X" → filtra marketplace.

**Criterio de done del módulo:**
- [ ] 6 perfiles selectables con scoring diferenciado.
- [ ] Mapa renderiza en <2s.

#### MÓDULO 20.B.3 — Page 3: ¿Me Alcanza? (A01 Affordability calculadora)

**Pasos:**
- `[20.B.3.1]` `/comprador/afordabilidad/page.tsx` calculadora interactiva:
  - Inputs: ingreso mensual, deudas existentes, ahorros disponibles, dependientes, plazo crédito deseado.
  - Cálculos: max monthly payment (30% ingreso - deudas), max monto crédito, max precio vivienda, needed enganche.
  - Breakdown: INFONAVIT (H11), bank credit (Buró estimado), propio (ahorros).
- `[20.B.3.2]` Consume `trpc.scores.getA01Affordability({ inputs })`.
- `[20.B.3.3]` Chart "Qué puedo comprar ahora vs en 1 año si ahorro X": dos escenarios comparados.
- `[20.B.3.4]` CTA "Ver 8 proyectos dentro de tu presupuesto" → filtrado auto.
- `[20.B.3.5]` Link pre-aprobación widget (Fase 18).

**Criterio de done del módulo:**
- [ ] Calculator outputs correctos con test inputs.
- [ ] Filtrado proyectos resulta válido.

### BLOQUE 20.C — Pages 4-6: Simulador Inversión + TCO + Patrimonio

#### MÓDULO 20.C.1 — Page 4: Simulador Inversión (A02, 4 escenarios)

**Pasos:**
- `[20.C.1.1]` `/comprador/simulador-inversion/page.tsx` con 4 escenarios side-by-side:
  - **Conservador**: precio base, rental ocupación 70%, appreciation 4% año.
  - **Base**: rental 80%, appreciation 6%.
  - **Optimista**: rental 90%, appreciation 8%.
  - **Pesimista**: rental 50%, appreciation 2%.
- `[20.C.1.2]` Inputs: precio unidad, enganche %, plazo hipoteca, inflación expectation.
- `[20.C.1.3]` Outputs per escenario: cashflow mensual neto, IRR 5y/10y/20y, break-even month, NPV.
- `[20.C.1.4]` Chart comparativo cashflow acumulado 10 años.
- `[20.C.1.5]` Consume `trpc.scores.getA02InvestmentSim({ inputs, unitId })`.
- `[20.C.1.6]` Export PDF resultado para compartir con contador/asesor financiero.

**Criterio de done del módulo:**
- [ ] 4 escenarios coherentes entre sí.
- [ ] PDF export funcional.

#### MÓDULO 20.C.2 — Page 5: TCO Calculator (A05, 10 años)

**Pasos:**
- `[20.C.2.1]` `/comprador/tco/page.tsx` Total Cost of Ownership 10 años:
  - Precio adquisición + impuestos (3% ISAI CDMX + 0.7% notarial).
  - Mantenimiento anual estimado (% construcción m2, 1-2%).
  - Servicios (luz, gas, agua, internet) proyectados con INPC.
  - Predial + cuotas mantenimiento torre.
  - Hipoteca total (principal + interés).
  - Seguros (hogar, vida si aplica).
- `[20.C.2.2]` Chart stacked area mostrando costos acumulados 10y.
- `[20.C.2.3]` Comparativa "Comprar vs Rentar 10y" — si renta es más costosa, visualizado.
- `[20.C.2.4]` Consume `trpc.scores.getA05TCO({ unitId, inputs })`.
- `[20.C.2.5]` CTA "Guardar este análisis a Watchlist" (attaches TCO to a specific unit tracking).

**Criterio de done del módulo:**
- [ ] TCO cálculo con componentes desglosados correctos.
- [ ] Comparativa renta útil.

#### MÓDULO 20.C.3 — Page 6: Patrimonio 20y (A11)

**Pasos:**
- `[20.C.3.1]` `/comprador/patrimonio-20y/page.tsx` proyección patrimonio:
  - Inputs: propiedad target + escenario apreciación + reinversión opción.
  - Outputs: valor propiedad 20y, total invertido vs ganancia, scenario de refinance, wealth trajectory.
- `[20.C.3.2]` Chart line patrimonio vs contrafactual (mantener en bank account Cetes).
- `[20.C.3.3]` Comparativa multi-unidad (up to 3 side-by-side).
- `[20.C.3.4]` Consume `trpc.scores.getA11Patrimonio20y({ unitIds })`.
- `[20.C.3.5]` AI narrative: "A 20 años, esta propiedad podría valer $12M (valor actual $3.5M) — 3.4x multiplier. Considerando renta opcional post-crédito, yield efectivo 7.2% annual."

**Criterio de done del módulo:**
- [ ] Chart renderiza proyección correcta.
- [ ] Multi-unidad compare functional.

### BLOQUE 20.D — Pages 7-10: Comparador + Timing + Watchlist + Discover Weekly

#### MÓDULO 20.D.1 — Page 7: Comparador 5 side-by-side (GC-71 + A08)

**Pasos:**
- `[20.D.1.1]` `/comprador/comparador/page.tsx` compara 2-5 unidades side-by-side (hard limit 5 — GC-71).
- `[20.D.1.2]` 10 dimensiones (columnas comparativas, expandidas con GC-68 + GC-69):
  1. Precio sticker + precio/m2
  2. **True cost año 1 (GC-69)**: ISAI + notario + predial + HOA
  3. Ubicación + DMX Score
  4. Amenidades count + premium score
  5. Calidad constructiva (dev trust H05)
  6. Inversión ROI 10y
  7. Livability N08 + N10
  8. Safety F01 + N04
  9. **Commute REAL (GC-68)**: tiempo ponderado a destinos calendar
  10. **Lifestyle DNA fit (GC-62)**: score match contra lifestyle_dna del user
- `[20.D.1.3]` Radar chart overlayed 10 dims todas las unidades.
- `[20.D.1.4]` Highlights: "Unit A gana en 6/10, Unit B en 3/10, Unit C en 1/10".
- `[20.D.1.5]` AI narrative con recomendación weighted según buyer_persona + Lifestyle DNA.
- `[20.D.1.6]` Export PDF (compartir con family/asesor).

**Criterio de done del módulo:**
- [ ] Comparador 5 unidades renderiza 10 dims.
- [ ] Lifestyle fit cambia ranking.
- [ ] PDF export funcional.

#### MÓDULO 20.D.2 — Page 8: Timing Optimizer (A07)

**Pasos:**
- `[20.D.2.1]` `/comprador/timing/page.tsx` "¿Cuándo comprar?" analysis:
  - Market cycle zona (expansion/peak/contraction/trough) de B05.
  - Interest rate trend 6-12m (Banxico forecast).
  - Seasonality MX (Q4 peak, Q1 slow).
  - Predicted price trajectory zona 12m.
- `[20.D.2.2]` Output: score 0-100 "Es buen momento comprar en {zona}?" + recomendación.
- `[20.D.2.3]` Alert option: "Avísame cuando score >80 en {zonas seleccionadas}".
- `[20.D.2.4]` Consume `trpc.scores.getA07Timing({ zoneIds, userContext })`.

**Criterio de done del módulo:**
- [ ] Score + recomendación coherente.
- [ ] Alert subscription persiste.

#### MÓDULO 20.D.3 — Page 9: Watchlist + score alerts

**Pasos:**
- `[20.D.3.1]` `/comprador/watchlist/page.tsx` lista unidades guardadas.
- `[20.D.3.2]` Agregar: desde ficha proyecto → botón "Guardar".
- `[20.D.3.3]` Cada entry con: foto, precio actual, DMX Score actual, delta precio 30d, delta score 30d.
- `[20.D.3.4]` Subscribe alerts: checkboxes per entry: price_drop (<5%), score_change, new_availability_similar.
- `[20.D.3.5]` Persiste en `score_subscriptions` + `wishlist`.
- `[20.D.3.6]` Notificaciones (tipo 16 Momentum changed, tipo 2 Price changed) vía WA + in_app.

**Criterio de done del módulo:**
- [ ] Agregar/remover watchlist funciona.
- [ ] Alert price drop dispara notif.

#### MÓDULO 20.D.4 — Page 10: Discover Weekly (Spotify pattern)

**Pasos:**
- `[20.D.4.1]` `/comprador/discover-weekly/page.tsx` — 3 matches propuestos cada lunes 8am.
- `[20.D.4.2]` Cron `discover_weekly_generate` lunes 8am (FASE 12): lógica C03 matching × busquedas activas × visit history × perfil. Genera `ai_generated_content.type='discover_weekly'`.
- `[20.D.4.3]` UI: 3 cards grandes con hero image + "Te recomendamos porque: tu búsqueda X + tu visita Y + tu pattern Z".
- `[20.D.4.4]` Feedback: "Me gusta" / "No es para mí" → feedback_registered cascade → mejora futuras recomendaciones.
- `[20.D.4.5]` Historial últimas 10 Discover Weekly consultable.
- `[20.D.4.6]` Notif lunes 8am: "Tu Discover Weekly está listo" in_app + WA.

**Criterio de done del módulo:**
- [ ] Cron lunes 8am genera recs.
- [ ] Feedback mejora siguientes.

#### MÓDULO 20.D.5 — Commute REAL calendar-aware (GC-68)

**Pasos:**
- `[20.D.5.1]` Integración Google Calendar OAuth (scope `calendar.readonly`) + opción manual para agregar destinos frecuentes.
- `[20.D.5.2]` Componente `<CommuteRealPanel unitId>` en ficha proyecto (FASE 21) y comprador:
  - Lista destinos top 3 últimos 30 días (office, schools hijos, padres, gym).
  - Para cada destino → Mapbox Directions API con `depart_at = típico`: 8am, 18pm, sábado 11am. Usa `traffic='live'` para proyección con congestion actual.
  - Display: "Oficina (Reforma): 28 min lunes 8am en auto / 42 min transit; 52 min miércoles lluvia."
- `[20.D.5.3]` Score compuesto `commute_quality` 0-100 (weighted inverse por tiempo) añadido a comparador y scoring A10.
- `[20.D.5.4]` Privacy: eventos calendar NO se guardan en BD, solo se extraen destinos agregados; opt-in explícito.

**Criterio de done del módulo:**
- [ ] Conectar Calendar + ver commute a 3 destinos test en <10s.
- [ ] Tráfico live refleja diferencia hora pico vs fuera.

#### MÓDULO 20.D.6 — Tax + fees true cost (GC-69)

**Pasos:**
- `[20.D.6.1]` Componente `<TrueCostPanel unitId>`: desglosa costo REAL de adquisición por encima del precio sticker:
  - ISAI (estado-dependiente: CDMX 3%, Jalisco 2%, NL 2%).
  - Honorarios notariales (0.5%-1.5% valor).
  - Avalúo (~$5000-15000 MXN).
  - Registro Público Propiedad (~0.25%).
  - Predial proyectado año 1 (derivado de `catastral_value × tasa_municipio`).
  - HOA / mantenimiento torre (si aplica).
  - Seguros obligatorios (vida + daños si hipoteca).
  - Gastos hipoteca (comisión apertura 1%, seguro vida banco, interés capitalizado).
- `[20.D.6.2]` Output: precio sticker $X + verdadero costo año 1 $X × (1 + delta_pct). "Esta propiedad cuesta 6.3% más de lo que parece".
- `[20.D.6.3]` Fuentes: tabla `tax_fees_by_state` seed MX (31 estados × 5 conceptos) + tabla `transfer_costs_table` + HOA desde `projects.maintenance_fee`.
- `[20.D.6.4]` Visible en ficha proyecto FASE 21 tab Inversión + en Comparador (GC-71) + Simulador A02.

**Criterio de done del módulo:**
- [ ] Unit CDMX precio $5M → true cost año 1 = $5.3M con breakdown visible.
- [ ] Seed 31 estados completo.

### BLOQUE 20.E — Personalización Netflix engine

#### MÓDULO 20.E.1 — Persona engine

**Pasos:**
- `[20.E.1.1]` Service `features/personalization/lib/persona-ordering.ts`:
  ```ts
  function getHomepageSections(persona: BuyerPersona): Section[] {
    const baseSections = [...]; 
    return PERSONA_SECTION_ORDER[persona].map(key => baseSections.find(s => s.key === key));
  }
  ```
- `[20.E.1.2]` Config `PERSONA_SECTION_ORDER` constant map 6 personas → array.
- `[20.E.1.3]` Servicio artwork: `getArtworkForProject(projectId, persona)` retorna URL de thumbnail dependiente (pre-generated Fase 22 Marketing o sampled Fase 20 MVP).
- `[20.E.1.4]` A/B test framework (integrated PostHog): 10% users con random reverse order → mide engagement.

**Criterio de done del módulo:**
- [ ] Persona change actualiza sections.
- [ ] Artwork per persona cargando.

#### MÓDULO 20.E.2 — Lifestyle DNA personalization (GC-62 extensión)

**Pasos:**
- `[20.E.2.1]` Refinamiento: orden secciones dashboard combina `buyer_persona` (macro) + `lifestyle_dna` (micro). Ej: dos inversores con DNA distinto (uno "quiet_urban" vs "nightlife_heavy") ven distintos sub-orden de zones.
- `[20.E.2.2]` `getArtworkForProject(projectId, persona, lifestyleDNA)` puede escoger thumbnails diferentes: Condesa nocturna para nightlife_heavy, Condesa mañana para quiet_urban.
- `[20.E.2.3]` Re-quiz opcional cada 6 meses (cron notif "Actualiza tu Lifestyle DNA").

**Criterio de done del módulo:**
- [ ] 2 users mismo buyer_persona + DNA distinto → dashboards diferentes.

### BLOQUE 20.F — Family accounts

#### MÓDULO 20.F.1 — Schema + invites

**Pasos:**
- `[20.F.1.1]` Schema:
  ```sql
  CREATE TABLE family_accounts (
    id uuid PRIMARY KEY,
    primary_user_id uuid NOT NULL REFERENCES profiles(id),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE family_members (
    id uuid PRIMARY KEY,
    family_account_id uuid NOT NULL REFERENCES family_accounts(id) ON DELETE CASCADE,
    member_user_id uuid REFERENCES profiles(id),
    invited_email TEXT,
    invited_phone TEXT,
    role TEXT CHECK (role IN ('primary','viewer','approver')),
    invite_token TEXT UNIQUE,
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('invited','joined','declined','removed'))
  );
  CREATE TABLE family_wishlist (
    id uuid PRIMARY KEY,
    family_account_id uuid NOT NULL REFERENCES family_accounts(id),
    unit_id uuid REFERENCES unidades(id),
    project_id uuid REFERENCES projects(id),
    added_by uuid REFERENCES profiles(id),
    comments JSONB, -- array {user_id, comment, created_at}
    reactions JSONB, -- {user_id: 'love'|'like'|'meh'|'no'}
    added_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- `[20.F.1.2]` UI `/comprador/family/page.tsx` gestionar miembros: invitar por email/phone (WA), roles, remover.
- `[20.F.1.3]` Invite flow: genera `invite_token` → send WA "Te invitaron a la búsqueda familiar de {primary.name}: {link}".
- `[20.F.1.4]` Accept: acceso via token → signup/login → join account.
- `[20.F.1.5]` Family wishlist shared: al agregar unidad, todos los miembros la ven + pueden comentar/reaccionar.

**Criterio de done del módulo:**
- [ ] Invitar vía WA + accept → member joined.
- [ ] Wishlist comments realtime entre miembros.

#### MÓDULO 20.F.2 — Roles + notifs grupo

**Pasos:**
- `[20.F.2.1]` Role `primary`: full edit (invite, remove, agregar unidades, borrar).
- `[20.F.2.2]` Role `viewer`: read only + comment + react.
- `[20.F.2.3]` Role `approver`: requiere su signoff antes de reservar/comprar (opcional).
- `[20.F.2.4]` Notifs al grupo: cada add de wishlist → WA group notification template "Juan agregó {unit} a tu búsqueda familiar".
- `[20.F.2.5]` Family activity feed en dashboard: timeline quien agregó qué, comentarios.

**Criterio de done del módulo:**
- [ ] Approver role requiere signoff.
- [ ] Activity feed actualiza realtime.

### BLOQUE 20.G — WhatsApp primary integration

#### MÓDULO 20.G.1 — WA Business API

**Pasos:**
- `[20.G.1.1]` `shared/lib/messaging/whatsapp/client.ts` wrapper Meta WhatsApp Business Cloud API.
- `[20.G.1.2]` Templates aprobados Meta (pre-submitted, aguardar aprobación 2-4 semanas):
  - `welcome_buyer`: "Hola {name}, bienvenido a DMX. Explora propiedades: {link}".
  - `property_match`: "Nueva propiedad match: {project_name} en {zona}. Ver: {link}".
  - `price_drop`: "¡Baja de precio! {unit} ahora ${price}. Ver: {link}".
  - `visit_reminder`: "Recordatorio: visita mañana {time} en {project}. Ubicación: {maps_link}".
  - `escrow_milestone`: "Tu apartado avanzó a {milestone}. Detalles: {link}".
  - `contract_ready`: "Contrato listo para firmar: {link_mifiel}".
  - `discover_weekly`: "Tu Discover Weekly llegó. 3 propiedades para ti: {link}".
  - `family_invite`: "{inviter} te invitó a su búsqueda familiar: {link}".
  - `dispute_update`: "Update sobre tu caso {id}: {status}".
  - `payment_reminder`: "Cuota vence {date}. Pagar: {link}".
- `[20.G.1.3]` Método `sendWhatsappMessage(phone, template, variables)`.
- `[20.G.1.4]` Webhook `/api/webhooks/whatsapp` recibe replies + delivery statuses → persiste en `whatsapp_messages` tabla + emite internal notifications.
- `[20.G.1.5]` Fallback SMS Twilio si WA falla (phone not in WA, opt-out, delivery error).

**Criterio de done del módulo:**
- [ ] Send template test delivery (sandbox Meta).
- [ ] Webhook recibe delivery confirmation.

#### MÓDULO 20.G.2 — Chat directo asesor via WA

**Pasos:**
- `[20.G.2.1]` Botón "Chat con asesor" en ficha proyecto (Fase 21) → abre chat thread in-app + WA.
- `[20.G.2.2]` Schema `conversations` + `messages` (multi-channel — in-app UI + WA delivery).
- `[20.G.2.3]` Asesor ve conversations en M03 Inbox (Fase 14). Responder → mensaje vía WA al comprador.
- `[20.G.2.4]` Comprador puede responder desde WA directo → webhook → persistir en conversation.
- `[20.G.2.5]` Latencia <2s en ida-vuelta.

**Criterio de done del módulo:**
- [ ] Chat flow ping-pong funciona.
- [ ] Mensaje persiste correctamente.

### BLOQUE 20.H — Pre-aprobación + Escrow + Voice AI

#### MÓDULO 20.H.1 — Pre-aprobación widget dashboard

**Pasos:**
- `[20.H.1.1]` Dashboard widget `<PreApprovalCard>`: muestra pre-aprobaciones existentes del user o CTA "Consulta express".
- `[20.H.1.2]` Click CTA → abre widget completo `<PreApprovalCheck>` (Fase 18 built) embedded modal.
- `[20.H.1.3]` Resultado aprobado → badge permanente "Aprobado $X por {banco}" con expiration.

**Criterio de done del módulo:**
- [ ] Widget dashboard carga pre-approvals.
- [ ] Flow completa.

#### MÓDULO 20.H.2 — Apartado escrow UX

**Pasos:**
- `[20.H.2.1]` En ficha unidad (Fase 21 o in-app), CTA "Apartar esta unidad" → abre flow `<ApartadoFlow>`:
  - Step 1: Confirm unidad + monto default 3% con slider 1-5%.
  - Step 2: Términos (acknowledge DMX es facilitador; release rules; disputa workflow).
  - Step 3: Pago via Stripe Checkout.
  - Step 4: Confirmación + explicación milestones release.
- `[20.H.2.2]` Page `/comprador/apartados` lista apartados activos con timeline + status + next milestone + acción pending (signoff entrega?).
- `[20.H.2.3]` Notif WA en cada milestone change.

**Criterio de done del módulo:**
- [ ] Flow apartado test completa.
- [ ] Timeline visible con milestones reales.

#### MÓDULO 20.H.3 — Voice + AI proactivo (Copilot)

**Pasos:**
- `[20.H.3.1]` Copilot (FASE 03) con contexto comprador carga:
  - Profile + buyer_persona.
  - Wishlist actual.
  - Visitas pasadas.
  - Búsquedas activas.
- `[20.H.3.2]` Proactive triggers:
  - Matcher nuevo encontrado >85% confidence → Copilot inicia "¡Oye! Encontré un proyecto que creo que te va a encantar: {project}. ¿Quieres que te cuente más?".
  - Price drop en watchlist >5% → "{unit} bajó 7% a ${price}. ¿Te interesa revisarlo?".
  - Visita próxima → "Tu visita a {project} es mañana a las {time}. ¿Te genero la ruta con tiempo de traslado?".
- `[20.H.3.3]` **Voice search español MX (GC-4) default mobile** (PWA). Desktop: voice opcional pero teclear default. Usa Web Speech API con `lang='es-MX'`, fallback Whisper server-side si browser no soporta.
- `[20.H.3.4]` Voice command examples: "Muéstrame proyectos en Condesa bajo 4 millones con 2 recámaras", "¿Cuánto me cuesta realmente este depa?", "Compárame este con los otros dos que vi ayer".
- `[20.H.3.5]` TTS responses (ElevenLabs ES-MX voice para plan Pro, browser TTS gratis).
- `[20.H.3.6]` Continuous conversation mode (push-to-talk o wake word "Hola DMX") respetando privacy; toggle claro on/off.

**Criterio de done del módulo:**
- [ ] Proactive trigger test dispara.
- [ ] Voice query "muéstrame X" filtra correctamente.

### BLOQUE 20.I — Disclaimers + T&Cs

#### MÓDULO 20.I.1 — T&Cs + disclaimers

**Pasos:**
- `[20.I.1.1]` Page `/legal/terms` con T&Cs comprador — sección dedicada a DMX como infraestructura:
  > "DMX opera como plataforma de intermediación tecnológica entre desarrolladores, asesores inmobiliarios y compradores. **DMX no es parte en las operaciones de compraventa, no es responsable de la construcción, entrega, calidad, ni garantías post-venta de las propiedades. Estas responsabilidades son exclusivas del desarrollador correspondiente.** DMX facilita escrow, pagos y firma digital como servicios de infraestructura, pero no dictamina disputas — éstas se resuelven mediante canales oficiales (UIF, PROFECO, tribunales)."
- `[20.I.1.2]` Disclaimers visibles (no enterrados):
  - Footer: "DMX es plataforma, no constructora" con link T&Cs.
  - Onboarding step 1: explicit acknowledge con checkbox.
  - En fichas proyecto: badge "DMX valida metadata — el dev es responsable de entrega".
  - En apartado flow step 2: reiterar release rules + escalation path.
- `[20.I.1.3]` LFPDPPP compliance: consent explícito para cada uso de datos (perfilamiento, marketing, sharing con asesores). Config settings granular.

**Criterio de done del módulo:**
- [ ] T&Cs sincronizados Fase 26 Compliance.
- [ ] Disclaimer visible en 4 lugares mínimo.

### BLOQUE 20.J — UPG 7.11 Buyer Experience (90-98)

Mapeo UPG sub-etapa 7.11 contexto §23.1 — 9 herramientas Buyer Experience con datos reales.

#### MÓDULO 20.J.1 — UPG 90-93: Ficha scores + AVM + Momentum + Risk

**Pasos:**
- `[20.J.1.1]` UPG 90 Ficha scores por proyecto (impact en Fase 21 /proyectos/[id]) — tab "Zona" con los 108 scores IE públicos (subset visible según plan).
- `[20.J.1.2]` UPG 91 AVM vs precio: I01 DMX Estimate predicho vs precio_lista → ratio indica overpriced / fair / underpriced.
- `[20.J.1.3]` UPG 92 Momentum zona: N11 DMX-MOM histórico 24 meses visualizado.
- `[20.J.1.4]` UPG 93 Risk integral: DMX-IRE combina H03 seismic + N07 water + F01 safety + F06 uso suelo + N05 infra → badge color.

**Criterio de done del módulo:**
- [ ] Los 4 UPG integrados en ficha pública + comprador.

#### MÓDULO 20.J.2 — UPG 94-98: Nearby + Buy/Rent + Comparador + Affordability + Mapa público

**Pasos:**
- `[20.J.2.1]` UPG 94 Nearby isócronas (F13): mapa con isochrones 15/30/45 min caminando/bike/transit/car desde proyecto.
- `[20.J.2.2]` UPG 95 Buy vs Rent (A04 Arbitrage): calculador 5/10/20y si es mejor comprar aquí o rentar.
- `[20.J.2.3]` UPG 96 Comparador (cubierto Page 7).
- `[20.J.2.4]` UPG 97 Affordability checker (cubierto Page 3).
- `[20.J.2.5]` UPG 98 Mapa público IE: subset de Market Observatory Fase 19 — 3 capas públicas (zone_scores + desarrollos + momentum). Ruta `/explorar` (Fase 21 full, Fase 20 consume).

**Criterio de done del módulo:**
- [ ] Los 5 UPG integrados.

### BLOQUE 20.K — Notificaciones multi-canal + settings + PWA

#### MÓDULO 20.K.1 — Notifications center

**Pasos:**
- `[20.K.1.1]` Bell icon header → dropdown últimas 10 notificaciones + "Ver todas".
- `[20.K.1.2]` Page `/notificaciones` timeline all notifs con filtros por tipo (property_match/price_drop/escrow/family_activity).
- `[20.K.1.3]` Mark as read / unread bulk.
- `[20.K.1.4]` Settings `/settings/notifications`: toggle per tipo × canal (in_app / WA / email). Default: WA primary.

**Criterio de done del módulo:**
- [ ] Notifications center lista correctamente.
- [ ] Config persiste.

#### MÓDULO 20.K.2 — Account settings + PWA base

**Pasos:**
- `[20.K.2.1]` `/settings/account` edit profile + change password + 2FA setup.
- `[20.K.2.2]` `/settings/preferences` moneda, idioma, timezone, buyer_persona re-quiz.
- `[20.K.2.3]` `/settings/family` gestionar family account.
- `[20.K.2.4]` PWA manifest.json + service worker (Fase 25 optimiza cache + offline):
  - `public/manifest.json`: name, short_name, icons, theme_color, display='standalone'.
  - `public/sw.js` basic stale-while-revalidate para static assets.
- `[20.K.2.5]` "Add to Home Screen" prompt mobile después de 3 sesiones.

**Criterio de done del módulo:**
- [ ] Settings persists cambios.
- [ ] PWA instalable en iOS + Android.

### BLOQUE 20.L — Innovations Findperty-derived (módulos M-* aprobados housekeeping post-07b)

> Implementa innovations derivadas de competitive intel Findperty (2026-04-19) + 110 game-changers + ADRs 021/022/023. Bloque grande pero modular: cada M-* es independiente, paralelizable cuando no comparte tabla.

#### MÓDULO 20.L.1 — Matching + Discovery (M-MATCH-SCORE-6D, M-VIBE-TAGS-UI, M-VISUAL-PREFERENCE, M-REVERSE-BROWSING, M-SWIPE-MODE, M-PROPERTY-STORY)

Pasos:
- [20.L.1.1] **M-MATCH-SCORE-6D**: computation 6 dimensiones (Emocional/Técnico/Urbano/Financiero/Espacial/Inversión) con pesos dinámicos por buyer_persona (tabla pesos en ADR-021). Breakdown transparente visible en card + expandable en modal con `<MatchScoreBreakdown />`. Reasons cited (data sources). Persist en `buyer_property_matches`.
- [20.L.1.2] **M-VIBE-TAGS-UI**: `<VibeTagChip />` en property cards (max 4 visibles + "+N more") + filter UI (AND/OR/NOT) en /explorar + validation UI para owners/asesores con audit trail. Backed por `vibe_tags_catalog` (ADR-022).
- [20.L.1.3] **M-VISUAL-PREFERENCE**: Pinterest-style moodboards 20-30 pre-swipe (opt-in step opcional Capa 1). User likea vibes (ej: "moderno minimalista", "ladrillo urbano", "luz natural"). Likes alimentan inferred_preferences via signal type `moodboard_like`.
- [20.L.1.4] **M-REVERSE-BROWSING**: route `/zonas` como primary entry point alternativo (mapa heatmap + scores IE + vibe). Después `/zonas/[slug]/propiedades`. Inversión del flujo tradicional propiedad-first.
- [20.L.1.5] **M-SWIPE-MODE**: vista alternativa toggle (Mapa/Lista/Grid/Swipe) en `/explorar`. Keyboard shortcuts ← → ↑ ↓. Undo last swipe. Botón "¿Por qué pasé?" → mini-form para training del algoritmo.
- [20.L.1.6] **M-PROPERTY-STORY**: AI-generated narrative desde property data + scores IE + zona data. `<PropertyStory aiGenerated editable />` (FASE 04 módulo 4.P). Editable owner/asesor con audit trail.

Criterio de done del módulo:
- [ ] 6 sub-módulos navegables y testeados.
- [ ] Match score 6D refleja pesos por buyer_persona.

#### MÓDULO 20.L.2 — Collaboration + Social (M-CO-MATCH, M-BUYER-CIRCLES)

Pasos:
- [20.L.2.1] **M-CO-MATCH**: 2+ users vinculados (pareja/familia via `family_accounts` BLOQUE 20.F + columna `linked_partners` en profiles). Overlay matches mutuos + diferencias por dimensión. Negotiation helper con reasons concretas ("Tú priorizas Inversión 35%, tu pareja Espacial 25% — 3 propiedades cumplen ambos").
- [20.L.2.2] **M-BUYER-CIRCLES**: anonymous por buyer_persona + presupuesto + zona. User opt-in. Ver viaje agregado de otros del grupo (sin PII): "Otros 14 first_time en Polanco vieron 47 props promedio antes de apartar".

Criterio de done del módulo:
- [ ] Co-match overlay funciona con 2 users test.
- [ ] Buyer circles anonimizan correctamente.

#### MÓDULO 20.L.3 — Decisiones asistidas (M-REGRET-MODELING, M-COMMUTE-CONSTELLATION, M-AI-VIRTUAL-TOUR, M-CONTRARIAN-AI, M-NEGOTIATION-ADVISOR, M-FINANCIAL-REALITY-CHECK, M-CREDIT-PREQUALIFIED-LIVE)

Pasos:
- [20.L.3.1] **M-REGRET-MODELING**: lenguaje informativo nunca culposo. "Info que te faltaría conocer" vs "te arrepentirás". Pre-factual data-backed. Cita data sources (AirROI snapshots, días en mercado, comparables).
- [20.L.3.2] **M-COMMUTE-CONSTELLATION**: 5 lugares clave del user (`profiles.life_places jsonb`) + isochrones cruzadas desde propiedades candidatas. Mapbox Isochrones API.
- [20.L.3.3] **M-AI-VIRTUAL-TOUR**: agent AI "visita" via listing data + Google Street View + scores IE + Mapbox. Genera reporte honesto pre-visita física. Markdown + screenshots.
- [20.L.3.4] **M-CONTRARIAN-AI**: solo tras umbral confidence (≥50 interacciones + ≥10 saves + ≥20 answers). Framed como sugerencia ("Considera explorar Tlalpan — tus signals matchean pero no la tienes en watchlist"). 1 sola oportunidad per dimensión. User dismiss → preference confirmed + no vuelve a desafiar.
- [20.L.3.5] **M-NEGOTIATION-ADVISOR**: sugiere oferta + probabilidad aceptación usando comparables + días mercado + estacionalidad + motivación vendedor inferida.
- [20.L.3.6] **M-FINANCIAL-REALITY-CHECK**: banner embedded en ficha propiedad. "Tu capacidad $X/mes · Este $Y/mes · Viable: sí/ajustado/no" live con tasas Banxico.
- [20.L.3.7] **M-CREDIT-PREQUALIFIED-LIVE**: toggle "solo lo que me aprobarían" en filtros + simulador hipotecario integrado live (consume FASE 18 backend).

Criterio de done del módulo:
- [ ] 7 sub-módulos con triggers y data sources cited.
- [ ] Contrarian AI respeta umbral.

#### MÓDULO 20.L.4 — Transparencia + Trust (M-AUDIT-TRAIL, M-NDA-FLOW, M-PROPERTY-LEDGER, M-DYNAMIC-PERSONALITIES, M-RESIDENT-STORIES)

Pasos:
- [20.L.4.1] **M-AUDIT-TRAIL**: cada score/recommendation/tag con botón "¿Por qué?" → expand data sources + weights + confidence + timestamp. Cumple ADR-018 R7. Cumple Principio P15.
- [20.L.4.2] **M-NDA-FLOW**: dirección oculta hasta commitment (visita agendada O pago apartado). Coordenadas radio 200m pre-commitment. Columna `properties.show_address_after_match boolean default false` + `privacy_level text`.
- [20.L.4.3] **M-PROPERTY-LEDGER**: "CV propiedad" público — ventas pasadas, avalúos, cambios uso suelo, gravámenes, propietarios anonymized.
- [20.L.4.4] **M-DYNAMIC-PERSONALITIES**: UI copy adaptado per buyer_persona detectado. Misma data, tono diferente (investor → ROI-first wording, family → safety/schools-first wording).
- [20.L.4.5] **M-RESIDENT-STORIES**: testimonios anonimizados consentidos de residentes actuales. No marketing, data real (años viviendo, satisfacción, "lo que cambiaría").

Criterio de done del módulo:
- [ ] 5 sub-módulos integrados.
- [ ] NDA flow respeta coordinates radius.

#### MÓDULO 20.L.5 — Tools prácticas (M-VISIT-COMPANION-MOBILE, M-COMPARADOR-MULTIDIM, M-FAMILY-REPORT-PDF, M-SMART-MULTI-VISIT, M-ZONE-NEWSLETTER, M-DECISION-FATIGUE, M-DEMAND-SURGE, M-ZONE-TIME-TRAVEL, M-FUTURE-ZONING)

Pasos:
- [20.L.5.1] **M-VISIT-COMPANION-MOBILE**: checklist contextual durante visita física (offline-capable PWA). Pre-cargadas preguntas per tipo propiedad. Auto-save post-visita.
- [20.L.5.2] **M-COMPARADOR-MULTIDIM**: 5 propiedades side-by-side con scores IE + commute real + amenidades verificadas + mantenimiento + resale projection + presupuesto total verdadero (mensualidades + HOA + predial + servicios). Extiende módulo 20.D.1.
- [20.L.5.3] **M-FAMILY-REPORT-PDF**: generator branded + compartible + imprimible.
- [20.L.5.4] **M-SMART-MULTI-VISIT**: AI arma ruta óptima + coordina horarios + confirma automáticos.
- [20.L.5.5] **M-ZONE-NEWSLETTER**: suscripción por zona con new listings + price drops + events + scores IE updates.
- [20.L.5.6] **M-DECISION-FATIGUE**: detección overwhelm (skips rápidos, backs frecuentes, sesión larga sin save) → sugiere pause + top 3 curados.
- [20.L.5.7] **M-DEMAND-SURGE**: alerts con data real ("3 nuevos interesados últimas 48h") FOMO legítimo.
- [20.L.5.8] **M-ZONE-TIME-TRAVEL**: slider temporal con data histórica + proyección (requiere scores IE FASE 08+).
- [20.L.5.9] **M-FUTURE-ZONING**: permisos SEDUVI aprobados + impacto esperado.

Criterio de done del módulo:
- [ ] 9 sub-módulos navegables.
- [ ] PWA offline para visit-companion.

#### MÓDULO 20.L.6 — Marketplace + negociación (M-CONVERSATIONAL-QUERY, M-INVERSE-SELECTION, M-GROUP-BUYING, M-REVERSE-AUCTION, M-INSPECTOR-MARKETPLACE, M-ZONE-STOCK-MARKET)

Pasos:
- [20.L.6.1] **M-CONVERSATIONAL-QUERY**: user chatea natural language (Copilot extension), AI parsea + resuelve multiple constraints. "Quiero algo en Roma Norte bajo 6M con buena luz mañana y pet-friendly" → filtros aplicados + propiedades.
- [20.L.6.2] **M-INVERSE-SELECTION** ("La Propiedad me Elige"): propietario invita top matches (tabla `property_invitations` + rate limit + dismissed bloqueado + opt-in `profiles.receive_invitations` + 1-a-1).
- [20.L.6.3] **M-GROUP-BUYING**: compradores agrupados por edificio/desarrollo (tabla `buyer_groups` + `buyer_group_members`). Negociación grupal = mayor poder.
- [20.L.6.4] **M-REVERSE-AUCTION**: compradores publican demanda (`reverse_listings`), propietarios compiten.
- [20.L.6.5] **M-INSPECTOR-MARKETPLACE**: toggle al agendar visita. Inspector profesional DMX verificado con reporte mismo día.
- [20.L.6.6] **M-ZONE-STOCK-MARKET**: zonas como "stock-like" con cotización + trend + watchlist + alerts (sin tokens, solo visualization).

Criterio de done del módulo:
- [ ] 6 sub-módulos integrados.
- [ ] Group buying respeta threshold.

#### MÓDULO 20.L.7 — Monetization + infrastructure (M-ESCROW-DIGITAL, M-CFDI-AUTOMATICO, M-LEGACY-PROJECTION)

Pasos:
- [20.L.7.1] **M-ESCROW-DIGITAL**: apartado + señal + enganche en cuenta neutral con triggers automáticos. Revenue 0.5-1%. Extiende BLOQUE 20.H.2.
- [20.L.7.2] **M-CFDI-AUTOMATICO**: generación + timbrado + envío SAT + retención ISR con Facturapi.io/Finkok.
- [20.L.7.3] **M-LEGACY-PROJECTION**: patrimonio neto 20y + % propiedad + puente próximas compras. Extiende módulo 20.C.3.

Criterio de done del módulo:
- [ ] 3 sub-módulos en flujo escrow + CFDI + projection.

#### MÓDULO 20.L.8 — Engagement (M-PROPERTY-DATING-PROFILE)

Pasos:
- [20.L.8.1] **M-PROPERTY-DATING-PROFILE**: cada propiedad con perfil tipo persona — nombre, personalidad, hobbies, qué busca ocupante. Columna `properties.property_dating_profile jsonb`. UI playful pero opcional (toggle en ficha).

Criterio de done del módulo:
- [ ] Property dating profile renderiza per-property con datos test.

### Deferido a H2/H3 (documentado pero NO implementar en H1)

- **Pre-approval Multi-Banco** (H2, requiere contratos B2B con bancos)
- **Holographic AR** (H3)
- **DNA Match historic waves** (H2, requiere 500+ users con data acumulada)
- **Neighbor Pre-Match** (H2, requiere users activos con vecindarios poblados)

## Criterio de done de la FASE

- [ ] 10 pages navegables y funcionales.
- [ ] Onboarding 5-step persiste buyer_persona.
- [ ] Personalización Netflix engine cambia sections per persona.
- [ ] Family accounts (schema + invites + roles + wishlist compartida).
- [ ] WhatsApp primary con 10 templates + fallback SMS.
- [ ] Pre-aprobación crediticia widget activo (Fase 18 backend).
- [ ] Apartado escrow UX con timeline milestones.
- [ ] AI Copilot proactivo con 3+ triggers activos.
- [ ] Voice input mobile default.
- [ ] Disclaimers DMX infraestructura visibles en 4+ lugares.
- [ ] UPG 7.11 (9 herramientas 90-98) integradas.
- [ ] Notifications center + settings.
- [ ] PWA base instalable.
- [ ] i18n `t('buyer.*')`.
- [ ] Tests Vitest ≥70% en `features/buyer/*`, `features/family/*`, `features/personalization/*`. Playwright e2e: onboarding → buyer_persona = investor → homepage shows ROI first → apartar unit → escrow flow.
- [ ] PPD Capa 1-4 implementada (módulos 20.A.2 a 20.A.5).
- [ ] BLOQUE 20.L sub-módulos M-* navegables y testeados (prioridad H1: M-MATCH-SCORE-6D, M-VIBE-TAGS-UI, M-PROPERTY-STORY, M-AUDIT-TRAIL, M-NDA-FLOW, M-FINANCIAL-REALITY-CHECK).
- [ ] Tablas BD nuevas migradas: micro_questions_catalog, user_micro_question_answers, behavioral_signals (particionada), buyer_property_matches, vibe_tags_catalog, property_invitations, buyer_groups + buyer_group_members, reverse_listings.
- [ ] Tag git `fase-20-complete`.
- [ ] Features entregados: 40 (target §9 briefing).

**Dependencia cruzada:** Este archivo referencia M18 Dashboard Comprador + M19 Marketplace + M20 Ficha Proyecto (docs/04_MODULOS/) — Agente H BATCH 2 escribe.

## Features añadidas por GCs (delta v2)

- **F-20-41** Lifestyle DNA quiz + matching 25% weight (GC-62).
- **F-20-42** Commute REAL calendar-aware (GC-68) con Google Calendar + Mapbox live traffic.
- **F-20-43** Tax + fees true cost (GC-69) con seed 31 estados MX.
- **F-20-44** Comparador 5 side-by-side (GC-71) con 10 dims + export PDF.
- **F-20-45** Voice search español MX (GC-4) con Web Speech + Whisper fallback + TTS.

## E2E VERIFICATION CHECKLIST

Enforcement per [ADR-018 E2E Connectedness](../01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md). Todos los items deben pasar antes del tag `fase-20-complete`.

- [ ] Todos los botones UI mapeados en 03.13_E2E_CONNECTIONS_MAP
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas
- [ ] Todos los triggers/cascades testeados
- [ ] Permission enforcement validado para cada rol
- [ ] Loading + error + empty states implementados
- [ ] Mobile responsive verificado
- [ ] Accessibility WCAG 2.1 AA
- [ ] audit-dead-ui.mjs pasa sin violations (0 dead)
- [ ] Playwright smoke tests covering happy paths pasan
- [ ] PostHog events tracked para acciones clave
- [ ] Sentry captures errors (validación runtime)
- [ ] STUBs marcados explícitamente con // STUB — activar FASE XX

## Próxima fase

FASE 21 — Portal Público (landing SPA + /explorar + /proyectos/[id] + /indices + /metodologia + /asesores/[slug] + SEO + A11y)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
**Pivot revisión:** 2026-04-18 (biblia v2 moonshot — GCs integrados + E2E checklist)
