# FASE 20 — Portal Comprador (10 Pages + Personalización Netflix + Family Accounts + WhatsApp Primary + UPG 7.11 Buyer Experience)

> **Duración estimada:** 8 sesiones Claude Code (~32 horas con agentes paralelos)
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

#### MÓDULO 20.A.2 — Onboarding 5-step

**Pasos:**
- `[20.A.2.1]` Si `profiles.onboarding_completed=false` → redirect `/onboarding/step-1`.
- `[20.A.2.2]` Step 1: Bienvenida + aceptar T&Cs (checkbox obligatorio con link detalle que explícitamente enumera "DMX es infraestructura de marketplace, no es responsable de la construcción, entrega, ni garantías post-venta — esas son del desarrollador").
- `[20.A.2.3]` Step 2: Perfil — nombre, teléfono (WhatsApp), ciudad, país.
- `[20.A.2.4]` Step 3: Buyer Persona quiz (calcula H14):
  - 8 preguntas: intención (vivir/invertir/segunda_casa), tamaño familia, edades hijos, ingresos rango, urgencia, sensitivity precio, sensibilidad riesgo, prioridades (lista draggable — schools/safety/transit/ecosystem/ROI).
  - Output: buyer_persona (investor/family_growing/first_buyer/empty_nest/executive_downtown/remote_worker) + Lifestyle preference (6 perfiles A10).
- `[20.A.2.5]` Step 4: Preferencias búsqueda — ciudad(es), zonas favoritas, rango precio, recámaras min, amenities must-have.
- `[20.A.2.6]` Step 5: Connect family (opcional) — invitar pareja/padres/asesor via WA link "Explora conmigo: {unique_link}".
- `[20.A.2.7]` Marca `onboarding_completed=true` + score_subscriptions iniciales para zonas favoritas.

**Criterio de done del módulo:**
- [ ] Flow 5 steps completa en <3 min.
- [ ] buyer_persona persistido en `user_scores`.

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

#### MÓDULO 20.D.1 — Page 7: Comparador (A08 multi-dimensional 8 dims)

**Pasos:**
- `[20.D.1.1]` `/comprador/comparador/page.tsx` compara 2-5 unidades side-by-side.
- `[20.D.1.2]` 8 dimensiones (columnas comparativas):
  1. Precio + precio/m2
  2. Ubicación + DMX Score
  3. Amenidades count + premium score
  4. Calidad constructiva (dev trust H05)
  5. Inversión ROI 10y
  6. Livability N08 + N10
  7. Safety F01 + N04
  8. Commute al lugar trabajo/escuela (isócronas F13)
- `[20.D.1.3]` Radar chart overlayed 8 dims todas las unidades.
- `[20.D.1.4]` Highlights: "Unit A gana en 5/8, Unit B en 2/8, Unit C en 1/8".
- `[20.D.1.5]` AI narrative con recomendación weighted según buyer_persona.

**Criterio de done del módulo:**
- [ ] Comparador 3 unidades renderiza 8 dims.
- [ ] Highlights correctos.

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
- `[20.H.3.3]` Voice input default mobile (PWA). Desktop: voice opcional pero teclear default.
- `[20.H.3.4]` Voice command examples: "Muéstrame proyectos en Condesa bajo 4 millones con 2 recámaras".
- `[20.H.3.5]` TTS responses opcional.

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
- [ ] Tag git `fase-20-complete`.
- [ ] Features entregados: 40 (target §9 briefing).

**Dependencia cruzada:** Este archivo referencia M18 Dashboard Comprador + M19 Marketplace + M20 Ficha Proyecto (docs/04_MODULOS/) — Agente H BATCH 2 escribe.

## Próxima fase

FASE 21 — Portal Público (landing SPA + /explorar + /proyectos/[id] + /indices + /metodologia + /asesores/[slug] + SEO + A11y)

---
**Autor:** Claude Opus 4.7 (rewrite BATCH 2 Agent E) | **Fecha:** 2026-04-17
