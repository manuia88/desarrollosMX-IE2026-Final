## Summary

<1-3 bullets describing the change>

## Test plan

- [ ] Tests existing pasan
- [ ] Tests nuevos cubren feature (si aplica)
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run audit:dead-ui:ci` verde
- [ ] `npm run audit:rls` verde (si la PR toca tablas/SECDEF)

## ADR-018 E2E Connectedness — 10 reglas inviolables

- [ ] Cada botón UI conecta handler → tRPC → DB → respuesta → update UI
- [ ] Cada formulario: Zod validation → mutation → side effects esperados
- [ ] Cada link Next.js apunta a ruta que responde 200
- [ ] Cada hook se suscribe a fuente real de datos (zero `useState` con mock data)
- [ ] Cada notificación llega al destinatario por canal correcto (email / push / in-app)
- [ ] Cada acción protegida valida auth + rol + feature gating + rate limit
- [ ] Cada acción significativa genera `audit_log` entry
- [ ] Cada cascada de datos ejecuta su trigger y se verifica en tests
- [ ] Cada error: mensaje user + `Sentry.captureException` + retry donde aplique
- [ ] Cada loading y empty state implementado con intención (no spinner genérico)

> Referencia: `docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md`

## STUBs declarados (4 señales canónicas)

Si esta PR introduce STUBs, lista cada uno con las 4 señales obligatorias:

- [ ] Comentario en código `// STUB — activar FASE XX`
- [ ] UI badge "Próximamente" o similar visible al usuario
- [ ] Documentación §5.B (sección STUB en doc de fase/módulo)
- [ ] Endpoint responde HTTP 501 / `TRPCError NOT_IMPLEMENTED`

> STUBs sin las 4 señales fallan `audit:dead-ui:ci` (ADR-018 §M1).

## 5 preguntas filtro IE (BIBLIA v5 §17)

Cada feature nueva debe responder SI a las 5 preguntas. Si responde NO a las cinco → cortar.

- [ ] ¿Genera datos que otro módulo consume?
- [ ] ¿Consume datos que otro módulo genera?
- [ ] ¿Reduce fricción para que un usuario genere más datos?
- [ ] ¿Hace que un usuario tome una mejor decisión?
- [ ] ¿Mide algo que nos ayuda a mejorar la plataforma? (AARRR)

> Referencia: `docs/biblia-v5/17_BIBLIA_DMX_v5_Decisiones_Hallazgos_Plan.md` §17

## Referencias

- ADR-XXX (link al ADR relevante si aplica)
- FASE_NN (link al doc de fase si aplica)
- M0X_modulo (link a spec del módulo si aplica)
- Issue / discusión origen (si aplica)
