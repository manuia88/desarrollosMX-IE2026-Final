# ADR-018 — E2E Connectedness: regla inviolable contra vaporware

**Status:** Accepted (founder mandate crítico)
**Date:** 2026-04-18
**Deciders:** Manu Acosta (founder), Claude Opus 4.7

## Context

El founder detectó un **riesgo crítico** en pivots pasados que pone en peligro todo el proyecto moonshot: **shipping UI con botones muertos, endpoints stub no marcados, UI placeholders sin backend, hooks sin suscripción real, formularios sin mutation, notificaciones sin delivery, links a rutas 404**.

Este patrón es conocido y tiene nombre en la industria: **vaporware UI-first**.

### Evidencia del problema en el vertical AI/SaaS 2025-2026

Herramientas UI-first dominantes en el mercado actual:

| Herramienta | Pattern observado | Churn piloto 30-90 días |
|-------------|-------------------|--------------------------|
| **Lovable.dev** | UI linda + backend mock / stubs sin marcar | ~80% |
| **v0 by Vercel** | Generative UI + integration manual requerida | ~60% |
| **Bolt.new (StackBlitz)** | Full-stack generado + endpoints placeholder | ~70% |
| **Replit Agent** (2024 early) | App completa + funcionalidad incompleta | ~65% |
| **Cursor "generate app"** flows | Feature requests + stubs TODOs | Varía |

En cada caso, el user inicial prueba, descubre botón muerto en día 3, pierde confianza, abandona. Ratings colapsan. Investment capital revisa la categoría escéptico.

### Por qué es particularmente mortal para DMX moonshot

1. **B2B confianza.** Asesores, desarrolladores, bancos, aseguradoras no toleran "casi funciona". Un cliente Enterprise pagando $25K/mes cancela el primer lunes si detecta stubs no marcados.
2. **Prensa tier 1.** Si Forbes/Expansión cubre "DMX Score 8.4" y el reader clickea link y 404, la coverage se convierte en ridículo.
3. **Flywheel paso 5.** La credibilidad institucional ([00.1 §6](../00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md#6-flywheel-ie1-16-xind-parte-4)) depende de terceros citando DMX. Un tercero no cita un producto que "casi funciona".
4. **Inversores Series A/B.** Diligencia técnica descubre stubs → valuation cut 50% o declined.
5. **Regulación financiera H3.** CNBV / SBIF / Banxico no aprueban fractional investing ni embedded banking en plataforma con stubs en prod.

### Por qué pasa (el diagnóstico del patrón)

El patrón "UI linda + backend incompleto" emerge de tres fuerzas:
- **Pressure de demos.** Demos visuales venden reuniones; backend no es visible hasta producción.
- **Copilot / LLM generation.** Claude/GPT genera UI component muy rápido, backend procedure con la misma rapidez — pero *no garantiza que ambos estén conectados*.
- **Fragmented testing.** Tests unit pasan; integration tests fake; nadie prueba user journey completo.

Sin disciplina explícita, el equipo ship "parece funcional" en lugar de "es funcional".

### El contraste — Apple "it just works"

Apple ship iPhone 2007 con botones que, al tocarlos, hacen lo que dicen. Cada elemento interactivo está conectado. "It just works" no es marketing — es **invariant técnico enforcement**. Apple no ship features sin que el invariant esté respetado, incluso si eso significa delay.

DMX adopta el mismo invariant. No como aspiration, sino como **gate de merge**.

### Momento oportuno de esta decisión

El pivot moonshot 2026-04-18 eleva el stakes significativamente. El plan de 39 fases + 3 horizontes + target $1-5B valuation no sobrevive a vaporware. La decisión es tomada *ahora*, antes de iniciar FASE 07 (primera fase post-foundation), para que toda la ejecución H1 → H3 opere bajo el invariant.

## Decision

**E2E Connectedness es regla inviolable a partir de 2026-04-18 para toda fase 07 en adelante, con 10 subreglas concretas, 6 mecanismos de enforcement, y 1 template de checklist obligatorio en cada FASE_NN.md.**

### Las 10 subreglas inviolables

**Regla 1 — Cada botón UI conecta a handler → tRPC → DB → respuesta → update UI.**
Todo `<button>`, `<Button>`, `<Link as="button">`, cualquier elemento con `onClick` debe tener:
- `onClick` handler no-op-free (nunca `onClick={() => {}}`).
- Handler invoca tRPC procedure real o ruta real.
- Procedure ejecuta operación real en BD.
- Respuesta actualiza UI (optimistic o post-response).
- Feedback visual al user (toast, banner, state change).

**Regla 2 — Cada formulario: Zod validation → mutation → side effects.**
Todo `<form>` o `<Form>` (react-hook-form) debe:
- Validar con schema Zod que viene de `/shared/schemas/`.
- `onSubmit` invoca tRPC mutation real.
- Mutation ejecuta BD insert/update.
- Side effects: notificaciones (tabla `notificaciones`), audit log (`audit_log`), cascada de scores (`score_recalculation_queue`), emails si aplica.
- Handle success/error states en UI.

**Regla 3 — Cada link (Next.js) apunta a ruta que responde 200.**
Todo `<Link href>` apunta a ruta registrada en `app/`. Link a ruta no existente = build fail (Next.js 16 + TypeScript strict).
Excepción marcada: links a rutas `app/soon/` placeholder *explícitamente* marcadas con `// STUB — FASE XX`.

**Regla 4 — Cada hook se suscribe a fuente real de datos.**
- `useQuery` via tRPC → procedure real → data real.
- Supabase realtime subscriptions → tabla real con RLS.
- WebSocket/SSE → endpoint real.
- Cero `useState` inicializado con mock data en production code path.

**Regla 5 — Cada notificación llega al destinatario correcto por canal correcto.**
- `notificaciones` tabla insert.
- Trigger envía por canal configurado (in_app / email / whatsapp / push).
- Canal tiene delivery real (Resend, Twilio, Novu, FCM).
- Recipient matches rule configured.
- Retry logic on delivery failure.

**Regla 6 — Cada acción protegida valida auth + rol + feature gating + rate limit.**
- tRPC `authenticatedProcedure` (no `publicProcedure` salvo `portal-publico`).
- Middleware `requireRole(['asesor', 'superadmin'])` cuando aplique.
- `checkFeatureLimit(userId, feature)` antes de ejecutar.
- Rate limit Upstash Redis por user × endpoint.
- 403 si no autorizado, 429 si rate limit exceeded.

**Regla 7 — Cada acción significativa genera audit_log entry.**
Acciones "significativas" definidas en catálogo:
- CRUD en: `contactos`, `operaciones`, `projects`, `unidades`, `captaciones`, `propiedades_secundarias`, `profiles`.
- Changes de permisos, roles.
- Uploads a Storage.
- Payments / escrow.
- Admin actions.
Audit log entry: `{actor_user_id, action, resource_type, resource_id, before_value, after_value, ip, user_agent, ts}`.

**Regla 8 — Cada cascada de datos ejecuta su trigger y se verifica.**
- Triggers BD definidos en migration (no código app).
- Test de integración que inserta fila → verifica que cascada ejecutó (ej. insert `operaciones` → verifica `score_recalculation_queue` entries).
- Documentation de cada cascada en [ADR-010 §D7](./ADR-010_IE_PIPELINE_ARCHITECTURE.md#d7-las-6-cascadas-formales).

**Regla 9 — Cada error: mensaje usuario + Sentry capture + retry donde aplique.**
- `ErrorBoundary` en cada feature.
- tRPC errors traducidos a mensajes user-friendly (i18n).
- `Sentry.captureException()` en catch blocks con context.
- Retry logic (backoff exponencial) para ops idempotentes.
- NO swallow errors silencioso.

**Regla 10 — Cada loading y empty state implementados con intención.**
- Loading: skeleton matching target layout (no generic spinner salvo en full-page loads iniciales).
- Empty states: diseño específico con call-to-action (no "No data").
- Error states: recoverable con retry button + fallback a cached/previous.

### Qué está permitido (STUBs *marcados*)

NO todo puede estar 100% completo en cada fase. La regla *no es* "todo debe funcionar ya". La regla es **"stubs están permitidos solo si están marcados de 4 maneras simultáneas"**:

1. **Comentario en código:**
   ```ts
   // STUB — activar en FASE 31 con [dependencia: Agent Marketplace]
   export const agentMarketplaceRouter = router({
     list: authenticatedProcedure
       .input(z.object({}))
       .query(async () => {
         throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Agent Marketplace will be available in FASE 31' })
       }),
   })
   ```

2. **UI badge visible al user:**
   ```tsx
   <Button disabled>
     Configurar Agente Custom
     <Badge variant="soon">próximamente · FASE 31</Badge>
   </Button>
   ```
   Badges disponibles: `[beta]`, `[próximamente]`, `[alpha]`, `[preview]`.

3. **Documentado en §5.B de la fase como "inferencia no bloqueante":**
   El documento `FASE_NN.md` tiene sección `## 5.B — Inferencias y stubs permitidos` listando explícitamente qué no se implementa *y por qué* (dependencia documental, fase futura, etc.).

4. **Endpoint devuelve 501 Not Implemented (no 200 fake):**
   Si hay endpoint stub, devuelve `TRPCError { code: 'NOT_IMPLEMENTED' }` o HTTP 501. NUNCA devuelve 200 con payload hardcoded fake.

Si falta cualquiera de los 4 → el stub es ilegal → build fail / audit-dead-ui falla → PR no mergea.

## Enforcement mechanisms

### M1 — `audit-dead-ui.mjs` (AST parser obligatorio)

Script custom `scripts/audit-dead-ui.mjs` usa AST parser (ts-morph o @babel/parser) para detectar violations estáticas:

**Patterns detectados:**

1. **Button sin onClick activo:**
   ```tsx
   <Button>Guardar</Button> // ❌ sin handler
   <Button onClick={() => {}}>Guardar</Button> // ❌ no-op
   <Button onClick={handleSubmit}>Guardar</Button> // ✓
   ```

2. **Form sin onSubmit:**
   ```tsx
   <form>...</form> // ❌
   <form onSubmit={handleSubmit}>...</form> // ✓
   ```

3. **Hooks sin deps apropiadas:**
   ```tsx
   useEffect(() => { fetch('/api/x') }) // ❌ missing deps
   useEffect(() => { fetch('/api/x') }, []) // ⚠ flagged (intentional?)
   ```

4. **Links con href inválido:**
   ```tsx
   <Link href="#">Click</Link> // ❌
   <Link href="">Click</Link> // ❌
   <Link href="/dashboard">Click</Link> // ✓ (verified at build)
   ```

5. **Stub endpoints sin marcado correcto:**
   - tRPC procedures que `throw Error` genérico en lugar de `TRPCError NOT_IMPLEMENTED`.
   - Procedures sin comentario `// STUB — activar`.

6. **Hardcoded mock data en render path:**
   ```tsx
   const data = { name: 'John', price: 1000 } // ❌ fuera de tests
   return <div>{data.name}</div>
   ```

7. **Placeholders `alert()` o `console.log` en handlers:**
   ```tsx
   onClick={() => alert('TODO')} // ❌
   onClick={() => console.log('coming')} // ❌
   ```

**Invocación:**
```bash
npm run audit:dead-ui
# ó como check CI:
npm run audit:dead-ui -- --ci --format=json
```

**Exit codes:**
- `0` — 0 violations.
- `1` — violations detectadas. Output incluye file + line + suggestion.

**Implementación detallada:** ver [E2E_QUALITY_PLAYBOOK](../05_OPERACIONAL/E2E_QUALITY_PLAYBOOK.md).

### M2 — E2E Verification Checklist obligatorio

Cada `FASE_NN.md` (de FASE 07 en adelante) debe incluir al final la sección `## E2E VERIFICATION CHECKLIST` siguiendo el template exacto (abajo). Sin esa sección, la fase no se da por cerrada.

### M3 — 03.13 E2E Connections Map

Catálogo vivo `docs/03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md` con matriz completa:

| UI element | Handler | tRPC procedure | Tablas BD | Side effects | Rol | Fase |
|------------|---------|----------------|-----------|--------------|-----|------|
| `<Button>Guardar contacto</Button>` en `ContactForm` | `handleSave` | `contactos.create` | `contactos` insert + `audit_log` | Notif #5, cascada scoring | asesor | 14 |

Se actualiza en cada fase con nuevos elementos. Grep-able. Sirve para auditorías + documentación + onboarding.

### M4 — CI check "E2E Audit" como required status check GitHub

GitHub Actions workflow:

```yaml
name: E2E Audit
on: [pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run audit:dead-ui -- --ci
      - run: npm run test:e2e:smoke
      - run: npm run typecheck
```

Configurado como **required status check** en branch protection rules de `main`. PR no mergea sin pasar.

### M5 — Playwright smoke tests por fase cerrada

Cada fase añade smoke tests Playwright que verifican **golden paths** de la fase:

Ejemplo FASE 14 (CRM Asesor):
```ts
// tests/e2e/fase-14-crm.spec.ts
test('asesor crea contacto → ve en lista → edita → elimina', async ({ page }) => {
  await loginAs(page, 'asesor@test')
  await page.goto('/crm/contactos')
  await page.click('text=Nuevo contacto')
  await page.fill('[name=nombre]', 'Test Buyer')
  await page.fill('[name=telefono]', '5555551234')
  await page.click('text=Guardar')
  await expect(page.locator('text=Test Buyer')).toBeVisible()
  // ...edit + delete
})
```

Golden paths documentados en cada FASE_NN.md §5.A. Tests corren en CI.

### M6 — PR template con review manual checklist

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## E2E Connectedness Checklist

- [ ] audit-dead-ui.mjs pasa (0 violations)
- [ ] Playwright smoke tests pasan
- [ ] 03.13_E2E_CONNECTIONS_MAP actualizado con nuevos elementos
- [ ] STUBs (si hay) marcados con 4 señales (comentario + badge + §5.B + 501)
- [ ] Notificaciones verifican delivery real
- [ ] Audit logs emiten para acciones CRUD
- [ ] Error states + loading states implementados
- [ ] Mobile responsive verificado
- [ ] i18n todos los strings
- [ ] Screenshots antes/después en PR
```

Review manual obligatorio por reviewer distinto al author. Reviewer firma con checklist.

## Template obligatorio: E2E VERIFICATION CHECKLIST

Copia exacta que va al final de cada `FASE_NN.md` (07-38):

```markdown
## E2E VERIFICATION CHECKLIST

### Conectividad
- [ ] Todos los botones UI mapeados en [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md)
- [ ] Todos los tRPC procedures implementados (no stubs sin marcar)
- [ ] Todas las migrations aplicadas y `db:types` regenerado
- [ ] Todos los triggers/cascades testeados con integration tests
- [ ] Permission enforcement validado para cada rol (asesor / dev / comprador / admin / superadmin)

### States
- [ ] Loading states (skeleton matching layout)
- [ ] Error states con recovery path
- [ ] Empty states con call-to-action
- [ ] Success states con feedback visual

### Quality
- [ ] Mobile responsive verificado (iPhone 15, Pixel 8, iPad)
- [ ] Accessibility WCAG 2.1 AA (keyboard nav, ARIA, contrast ≥4.5:1, focus visible)
- [ ] `prefers-reduced-motion` respeta
- [ ] i18n — zero strings hardcoded
- [ ] Core Web Vitals green (LCP <2.5s, FID <100ms, CLS <0.1)

### Automation
- [ ] `npm run audit:dead-ui` pasa (0 violations)
- [ ] Playwright smoke tests covering golden paths pasan en CI
- [ ] PostHog events tracked para acciones clave (analytics.md actualizado)
- [ ] Sentry captures errors (validación runtime con error fixture)

### Stubs (si aplica)
- [ ] STUBs marcados con `// STUB — activar FASE XX con [dependencia]`
- [ ] STUBs visibles al user con badge `[beta]` / `[próximamente]`
- [ ] STUBs documentados en §5.B — Inferencias y stubs permitidos
- [ ] STUB endpoints devuelven 501 Not Implemented (no 200 fake)

### Sign-off
- [ ] Reviewer manual: @____ firmó este checklist
- [ ] PR link: #___
- [ ] Tag fase-NN-complete aplicado post-merge
```

## Rationale

### Discipline > velocity short-term

Founder prefiere **+15% tiempo por fase** vs **80% churn piloto**. Matemática:
- 80% churn → retention pool tan chico que H2 triggers ([ADR-011](./ADR-011_MOONSHOT_3_HORIZONTES.md)) no se cumplen → plan moonshot se retrasa 6-12 meses.
- +15% tiempo → H1 termina mes 10.5 en lugar de mes 9, pero con retention 60%+ → H2 arranca fuerte, triggers se cumplen, moonshot on track.

Net present value: +15% tiempo << -80% churn.

### Apple pattern es real, no aspiration

"It just works" es patron de **enforcement técnico diario**, no cultura etérea. Apple tiene QA gates, build gates, reviewers que rechazan features incompletas. DMX replica el modelo con:
- audit-dead-ui (static AST check).
- Playwright smoke (dynamic check).
- Reviewers manuales (human check).
- CI gates (automation check).

Triple defense in depth.

### AST + E2E tests complementarios, no redundantes

- **AST check (audit-dead-ui):** catch dead code tempranamente (PR stage). Feedback rápido (segundos).
- **Playwright:** catch integration regressions (CI stage). Feedback medium (minutos).
- **Manual review:** catch UX / semantic issues (human stage). Feedback slow (hours/days).

Each capa catches distinto tipo de issue. Juntas → defense in depth.

### Stubs marcados vs stubs ocultos

Stubs son necesarios en desarrollo iterativo (no puedes construir todo a la vez). La clave es *honestidad*:
- Stub marcado → user sabe, founder sabe, inversor sabe, no hay sorpresa.
- Stub oculto → parece funcional, falla en producción, daña confianza.

Las 4 señales (comentario + badge + doc + 501) hacen stubs **imposibles de ocultar**.

### Por qué inviolable (no opcional)

El momento en que una violation se permite "por excepción", el patrón vuelve. Cada equipo productivo ha visto esto: "solo esta vez", "es urgente", "lo arreglamos después". Nunca se arregla. Inviolable significa sin excepción.

## Consequences

### Positivas

- **Cero vaporware.** Users piloto se quedan (retention target alcanzable).
- **NPS alto.** Tools que funcionan reciben NPS 60+; tools que parece funcional reciben 20-30.
- **Confianza inversores.** Due diligence H2+ pasa limpia.
- **Press coverage confiable.** Prensa puede clickear cualquier link y todos funcionan → más coverage positiva.
- **Hiring señal.** Engineers quieren trabajar en products que funcionan — retention team H2+ mejor.
- **Compliance facilita.** Auditorías SOC 2 / ISO 27001 pasan más rápido con código disciplinado.
- **Technical debt minimizada.** No hay deuda oculta que explota meses después.

### Negativas / tradeoffs

- **+15% tiempo por fase.** Aceptado explícitamente por founder.
- **Requires tooling build (audit-dead-ui).** Inicial 1-2 semanas ingeniería + mantenimiento continuo.
- **Requires discipline code review.** Reviewers deben firmar checklist. Overhead que founder prioriza.
- **Documentación más pesada.** 03.13 E2E Map debe mantenerse actualizado. Overhead aceptado.
- **Pushback team.** Engineers pueden frustrar con "too many checks". Mitigación: tooling que detecta automáticamente (menos manual), templates que hacen compliance rápido.
- **CI time +5-10 min por PR.** Audit + Playwright + typecheck. Aceptable.

### Neutrales

- **Documentación más pesada (E2E matrix).** Living doc que vale su peso.
- **Tradeoff aceptado explícitamente por founder.** No requiere re-discusión.
- **Applies desde FASE 07 en adelante.** FASEs 00-06 (foundation) son meta-work, no user-facing; fuera de scope.

## Alternatives considered

### Alt 1: "Ship fast, fix later"
**Rechazada.** Detallado en Rationale. Genera vaporware + churn piloto mortal para moonshot.

### Alt 2: "Manual review only, sin tooling"
**Rechazada.** No escala. Human errors inevitables. Es el modelo que llevó a vaporware en pivots pasados.

### Alt 3: "Only Playwright, no AST"
**Rechazada.** Playwright catch regressions pero es slow feedback (CI-stage). AST es fast feedback (PR-stage). Ambos juntos >> uno solo. Playwright also doesn't catch dead code que nunca se llama.

### Alt 4: "Only AST, no Playwright"
**Rechazada.** AST es static; cannot catch runtime integration issues (permissions broken at runtime, DB RLS rejection at execute time). Playwright catches lo que AST no.

### Alt 5: "Soft enforcement" (warnings, no blocks)
**Rechazada.** Warnings se ignoran. Blocks forzan disciplina.

### Alt 6: "Inviolable solo H1, flexible H2+"
**Rechazada.** La disciplina es justamente valiosa porque no se relaja. H2 es donde más user-facing features se construyen; relajar ahí = más vaporware.

### Alt 7: "Delegar E2E verification a QA team"
**Rechazada.** DMX no tiene QA team separado H1-H2. El author del code es responsable del E2E connectedness. QA team H3+ es complemento, no reemplazo.

### Alt 8: "Runtime assertions en vez de static checks"
**Rechazada.** Runtime assertions fail en producción. Static checks fail en PR. Prefer fail earlier.

## Migration plan (aplicación de este ADR)

**Inmediato (esta semana):**
1. Publicar este ADR.
2. Escribir `docs/05_OPERACIONAL/E2E_QUALITY_PLAYBOOK.md` con detalle de audit-dead-ui.
3. Escribir `docs/03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md` (vacío, template).
4. Actualizar template `FASE_NN.md` en `docs/02_PLAN_MAESTRO/TEMPLATE_FASE.md` con sección E2E checklist.

**FASE 07 kickoff:**
5. Implementar `scripts/audit-dead-ui.mjs`.
6. Configurar GitHub Actions workflow con E2E Audit required status.
7. Actualizar `.github/PULL_REQUEST_TEMPLATE.md` con checklist.
8. Primera corrida integral; baseline establecido.

**Retroactivo para FASEs 00-06:**
9. No aplica — foundation phases no tienen user-facing UI significativo.

**Continuo:**
10. Cada FASE 07-38 incluye checklist en su documento.
11. Reviewers firman checklist en PR.
12. Founder audita mensualmente quality gates.

## Success metrics

- **audit-dead-ui violations:** 0 en `main` sostenido.
- **Playwright smoke tests:** 100% pass rate en `main`.
- **03.13 E2E Map:** 100% de UI elements nuevos añadidos dentro de 48h post-merge.
- **PR blocked por E2E audit:** detección + fix avg <4 horas.
- **Retention piloto D30:** ≥40% asesores, ≥25% compradores (target [ADR-011](./ADR-011_MOONSHOT_3_HORIZONTES.md)).
- **NPS piloto:** asesor ≥50, comprador ≥45, desarrollador ≥55.
- **Press coverage:** cero artículos mencionan "broken buttons" o "doesn't work".
- **Investor diligence H2+:** zero stub discovery durante due diligence.

## Team ritual

- **Daily standup:** dev mentiona si E2E audit falla y por qué.
- **Weekly review:** founder + tech lead revisan `audit-dead-ui` trend.
- **Monthly retro:** 03.13 E2E Map growth rate vs fases cerradas.
- **Quarterly:** revisión ADR — aún inviolable, o ajustes necesarios.

## References

- [ADR-006 — Testing Strategy](./ADR-006_TESTING_STRATEGY.md) — base tests.
- [ADR-011 — Moonshot 3 Horizontes](./ADR-011_MOONSHOT_3_HORIZONTES.md) — contexto moonshot.
- [ADR-010 — IE Pipeline §D7](./ADR-010_IE_PIPELINE_ARCHITECTURE.md#d7-las-6-cascadas-formales) — cascadas verificables.
- [E2E_QUALITY_PLAYBOOK](../05_OPERACIONAL/E2E_QUALITY_PLAYBOOK.md) — tooling + proceso detallado.
- [03.13_E2E_CONNECTIONS_MAP](../03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md) — matriz viva.
- [CONTRATO_EJECUCION §7](../05_OPERACIONAL/CONTRATO_EJECUCION.md#7-regla-e2e-connectedness) — regla contractual.
- [FASE 27 — Testing](../02_PLAN_MAESTRO/FASE_27_TESTING.md) — infraestructura tests.
- [00.1 §15 — E2E Connectedness](../00_FOUNDATION/00.1_VISION_Y_PRINCIPIOS.md#15--e2e-connectedness-como-principio-inviolable-pivot-moonshot-2026-04-18) — síntesis.
- Apple Human Interface Guidelines — "It just works" principle.
- *Refactoring UI* (Adam Wathan, Steve Schoger) — complete states matter.
- *Working Effectively with Legacy Code* (Michael Feathers) — dead code detection patterns.
- ts-morph docs — https://ts-morph.com.
- Playwright docs — https://playwright.dev.

---

**Author:** Claude Opus 4.7 (biblia v2 moonshot rewrite) | **Date:** 2026-04-18
