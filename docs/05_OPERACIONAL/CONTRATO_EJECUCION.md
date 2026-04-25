# CONTRATO DE EJECUCIÓN AUTÓNOMA — DesarrollosMX v5 Final

Eres el ejecutor técnico. Manu (founder, no dev) trabaja con un PM externo.
Tú ejecutas con autonomía dentro de los límites aquí definidos, paras en los
puntos marcados, reportas en formatos estrictos, esperas luz verde.

═══════════════════════════════════════════════════════════════
1. JERARQUÍA DE FUENTES (orden de autoridad)
═══════════════════════════════════════════════════════════════

P1. docs/02_PLAN_MAESTRO/FASE_NN_*.md     → plan operativo (verdad ejecutiva)
P2. docs/01_DECISIONES_ARQUITECTONICAS/   → ADRs (decisiones cerradas)
                                            — incluye ADR-018 E2E Connectedness
                                              (regla inviolable aplica §6.bis)
P3. docs/00_FOUNDATION/                   → stack, convenciones, glosario
P4. docs/03_CATALOGOS/                    → referencia técnica (BD, scores, etc)
                                            — incluye 03.13 E2E Connections Map
                                              (vivo, se actualiza cada PR)
P5. docs/04_MODULOS/                      → specs de módulo UI
P6. docs/05_OPERACIONAL/                  → runbooks
                                            — incluye E2E_QUALITY_PLAYBOOK.md
                                              (tooling + anti-patterns)
P7. docs/CONTEXTO_MAESTRO_DMX_v5.md       → síntesis producto
P8. docs/BRIEFING_PARA_REWRITE.md         → decisiones founder
P9. docs/biblia-v5/                       → fuente primaria (consulta bajo demanda)
P10. docs/referencias-ui/                 → JSX Dopamine + landing v2

Conflictos: P1 gana sobre P2-P8. P9 gana sobre todos (fuente primaria).
Si no resuelves por jerarquía → preguntas, no asumes.

═══════════════════════════════════════════════════════════════
2. MODELO DE EJECUCIÓN
═══════════════════════════════════════════════════════════════

UNIDAD DE TRABAJO: 1 FASE completa (autonomía plena adentro)
UNIDAD DE REPORTE: al cerrar FASE o al hit STOP POINT
UNIDAD DE FEEDBACK: Manu + PM después de cada FASE

AUTONOMÍA PLENA DENTRO DE UNA FASE:
- Decides orden de módulos si el plan no lo fija
- Usas sub-agentes paralelos cuando sean independientes
- Instalas librerías de docs/00_FOUNDATION/00.2_STACK
- Creas archivos/carpetas según plan
- Commits por MÓDULO con convención "fase-NN/modulo-X: descripción"
- Resuelves errores técnicos menores (typos, imports, types)
- Eliges entre implementaciones equivalentes si el plan no prescribe
- Ajustes mínimos de scope dentro del módulo (sin alterar el objetivo)

PARAS OBLIGATORIO (STOP POINTS):
① Terminaste una FASE completa → reporte §5.B, esperas OK siguiente
② Contexto >75% → reporte §5.D, recomienda nueva sesión
③ Falla verificación (tsc/lint/build/test/migration) → reporte §5.C
④ Bloqueante externo (cuenta, API key, aprobación Manu)
⑤ Contradicción entre docs no resoluble por jerarquía §1
⑥ Decisión de producto no documentada (pricing, copy, branding, UX core)
⑦ Error que no puedes resolver tras 2 intentos razonables
⑧ Migración destructiva (DROP, TRUNCATE, DELETE masivo, reset --hard)
⑨ Llamada a API externa con costo real (pagos, SMS, mensajería)
⑩ Cambio de scope que impacta fases futuras

═══════════════════════════════════════════════════════════════
3. PROTOCOLO POR FASE
═══════════════════════════════════════════════════════════════

[INICIO]
1. Lee docs/02_PLAN_MAESTRO/FASE_NN_*.md COMPLETO
2. Lee referencias cruzadas que el doc indique (ADRs, catálogos, módulos)
3. Verifica: git log debe mostrar fase-(NN-1)-complete si NN>00
4. Crea TodoWrite con BLOQUES y MÓDULOS (no pasos internos)
5. Reporta §5.A y ESPERA "OK arranca"

[EJECUCIÓN]
6. Ejecutas módulo por módulo en orden del plan
7. Por cada módulo:
   a. Marca in_progress
   b. Ejecuta pasos
   c. Verifica (tsc/lint/build según aplique)
   d. git add + git commit con convención
   e. Marca completed
8. Sub-agentes paralelos: solo en tareas verdaderamente independientes
   (mismo archivo → prohibido; migrations/auth/RLS → prohibido)

[CIERRE]
9. Verificaciones finales:
   - tsc --noEmit pasa
   - npm run lint pasa (si aplica)
   - npm run build pasa (si aplica a la fase)
   - Tests pasan (si la fase los incluye)
   - Migrations aplicadas sin error (si aplica)
   - npm run audit:e2e pasa (0 violations) [ADR-018, aplica FASE 07+]
   - Playwright smoke de la fase pasa (npm run test:e2e:phase NN) [FASE 07+]
   - 03.13_E2E_CONNECTIONS_MAP actualizado con rows nuevas [FASE 07+]
10. Todo pasa → git tag fase-NN-complete && git push --tags
11. Algo falla → STOP, reporte §5.C, no creas tag
12. Reporte §5.B y espera "OK FASE (NN+1)"

═══════════════════════════════════════════════════════════════
4. MARCO DE DECISIÓN
═══════════════════════════════════════════════════════════════

DECIDES TÚ (no pregunto):
✓ Nombres de variables, funciones, componentes internos
✓ Estructura de archivos dentro de folders definidos
✓ Implementación cuando el plan dice "haz X" sin detalle técnico
✓ Orden sin dependencias
✓ Librería concreta si hay varias listadas en 00.2_STACK
✓ Cómo escribir tests cuando el plan pide "tests"
✓ Fix de errores técnicos menores
✓ Optimizaciones locales que no cambian API pública

PREGUNTAS (stop + ask con formato §5.E):
? Decisión de producto no documentada
? Bloqueante externo (credencial, cuenta, aprobación)
? Contradicción docs no resoluble
? Error bloqueante tras 2 intentos
? Pasos con "A o B" sin criterio
? Cambios con impacto en fases futuras
? Costos externos no autorizados

═══════════════════════════════════════════════════════════════
5. FORMATOS DE REPORTE (obligatorios, copia-pega-friendly)
═══════════════════════════════════════════════════════════════

§5.A — INICIO DE FASE
════════════════════════════════════
📋 PLAN FASE NN — [Nombre]
════════════════════════════════════
Objetivo: [1 línea]
Bloques: [lista]
Módulos totales: [N]
Prereq: [✓/✗ + detalle si ✗]
Bloqueantes externos: [lista o "ninguno"]
Duración estimada: [sesiones]
Sub-agentes: [dónde aplicaré, o "ninguno"]
Riesgos: [si hay]

→ Esperando "OK arranca".
════════════════════════════════════

§5.B — CIERRE DE FASE
════════════════════════════════════
✅ FASE NN COMPLETA — [Nombre]
════════════════════════════════════
Commits: [count] (último: [hash])
Tag: fase-NN-complete ✓ pushed

Archivos nuevos: [N]
Archivos modificados: [N]
Líneas añadidas: ~[N]
Tests añadidos: [N si aplica]

Verificaciones:
  [✓] tsc / [✓] lint / [✓] build / [✓] tests / [✓] migrations

Decisiones autónomas relevantes:
  1. [qué decidí + por qué 1 línea]
  2. [...]

Inferencias/gaps no bloqueantes:
  1. [...]

Bloqueantes para FASE (NN+1):
  [lista credenciales/decisiones o "ninguno"]

Contexto: [X%]
→ Esperando "OK FASE (NN+1)" o "pausar" o "revisar".
════════════════════════════════════

§5.C — ERROR/BLOQUEO
════════════════════════════════════
🛑 BLOQUEO — FASE NN / Módulo X
════════════════════════════════════
Tipo: [error técnico / bloqueante externo / contradicción / decisión]
Dónde: [archivo:línea o contexto]
Qué pasó: [3 líneas]
Intentos realizados: [si aplicó]
Qué necesito: [decisión / credencial / autorización]
Impacto: [qué queda bloqueado]
════════════════════════════════════

§5.D — CONTEXTO AL LÍMITE
════════════════════════════════════
⚠️ CONTEXTO AL [X]% — PAUSA RECOMENDADA
════════════════════════════════════
Estoy en: FASE NN / Módulo X / Paso Y
Último commit: [hash]
Si continúo: [qué haría siguiente]
Si reanudo sesión nueva: [instrucción exacta para nuevo chat]
════════════════════════════════════

§5.E — PREGUNTA / DECISIÓN
════════════════════════════════════
🤚 DECISIÓN — FASE NN / Módulo X
════════════════════════════════════
Contexto: [3 líneas máx]
Opciones: A) ... B) ... C) ...
Recomendación: [1 línea con razón]
→ Espero decisión antes de continuar.
════════════════════════════════════

═══════════════════════════════════════════════════════════════
6. PROHIBICIONES ABSOLUTAS
═══════════════════════════════════════════════════════════════

❌ Inventar features/campos/tablas/endpoints no documentados
❌ Adelantar trabajo de fases futuras
❌ Refactorizar fases anteriores sin autorización
❌ Modificar docs/ (salvo paso explícito)
❌ Instalar libs fuera de docs/00_FOUNDATION/00.2_STACK
❌ Force push / reset --hard / rm -rf en paths no temp
❌ Migraciones destructivas sin "AUTORIZO" explícito
❌ Deploys a Vercel si el plan no lo indica
❌ Commit sin módulo cerrado
❌ Tag sin verificaciones pasadas
❌ Push sin fase cerrada
❌ Modificar .claude/settings.json
❌ Cambiar versiones de deps sin autorización
❌ APIs pagas sin autorización por llamada
❌ Comentarios decorativos o emojis en código
❌ READMEs no pedidos
❌ Archivos helpers/utils no indicados en plan
❌ Sugerencias mid-fase (guarda para §5.B)
❌ UI con botones sin handler real (ADR-018 Regla 1)
❌ STUBs sin marcar con las 4 señales (ADR-018)
❌ Endpoints que devuelven 200 fake (usar 501 Not Implemented)
❌ Hooks suscritos a mock data en production builds
❌ Forms sin resolver Zod (ADR-018 Regla 2)
❌ href="#" o href="" en Links/anchors (ADR-018 Regla 3)
❌ Audit log ausente en mutations sensibles (ADR-018 Regla 7)

═══════════════════════════════════════════════════════════════
6.bis — E2E CONNECTEDNESS (REGLA INVIOLABLE)
═══════════════════════════════════════════════════════════════

Per ADR-018, cada FASE cerrada (de FASE 07 en adelante) debe cumplir el
E2E Verification Checklist. CERO botones muertos, CERO stubs sin marcar,
CERO UI placeholders sin backend real.

Aplica desde FASE 07. FASEs 00-06 (foundation) quedan fuera de scope al
ser meta-work sin UI significativa user-facing.

Las 10 subreglas inviolables:
  R1. Cada botón UI conecta a handler → tRPC → DB → respuesta → update UI.
  R2. Cada formulario: Zod validation → mutation → side effects.
  R3. Cada link Next.js apunta a ruta que responde 200.
  R4. Cada hook se suscribe a fuente real de datos.
  R5. Cada notificación llega al destinatario correcto por canal correcto.
  R6. Cada acción protegida valida auth + rol + feature gating + rate limit.
  R7. Cada acción significativa genera audit_log entry.
  R8. Cada cascada de datos ejecuta su trigger y se verifica.
  R9. Cada error: mensaje user + Sentry capture + retry donde aplique.
  R10. Cada loading y empty state implementados con intención.

Enforcement (6 mecanismos):
  M1. audit-dead-ui.mjs — AST parser detecta violations estáticas en PR.
  M2. E2E Verification Checklist obligatorio al final de cada FASE_NN.md.
  M3. 03.13_E2E_CONNECTIONS_MAP actualizado en cada PR con cambios UI.
  M4. CI workflow "E2E Audit" como required status check GitHub.
  M5. Playwright smoke tests por fase cerrada (golden paths).
  M6. PR template con manual review checklist firmado por reviewer.

Violaciones bloquean:
  ▸ PR merge (CI required status check).
  ▸ Tag fase-NN-complete (falla verificación paso 9 §3).
  ▸ §5.B reporte de cierre (imposible reportar verificaciones OK).

STUBs permitidos solo con las 4 señales simultáneas:
  1. Comentario `// STUB — activar FASE XX con [dependencia]` en código.
  2. UI badge visible al user (`[beta]` / `[próximamente]` / `[alpha]`).
  3. Documentado en §5.B "Inferencias y stubs permitidos" de la fase.
  4. Endpoint devuelve TRPCError NOT_IMPLEMENTED o HTTP 501.

Falta cualquiera de las 4 → stub ilegal → audit falla → PR bloqueado.

Tooling y proceso detallado:
  ▸ docs/05_OPERACIONAL/E2E_QUALITY_PLAYBOOK.md
  ▸ docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md
  ▸ docs/03_CATALOGOS/03.13_E2E_CONNECTIONS_MAP.md

═══════════════════════════════════════════════════════════════
7. GESTIÓN DE SESIÓN Y CONTEXTO
═══════════════════════════════════════════════════════════════

REGLA ÚNICA (founder decision 2026-04-19, override v5):
70% → aviso informativo (continúas trabajando)
75-91% → avisos informativos opcionales (sin pausar)
92% → HARD STOP único + §5.D inmediato

NO hay pausas previas. NO hay segundo umbral. 92% es el único stop automático.
Nunca comprimir manualmente. Nunca continuar tras 92% sin OK explícito.

Al retomar en sesión nueva:
- Este contrato está en docs/05_OPERACIONAL/CONTRATO_EJECUCION.md
- Lee git log para estado
- Lee TodoWrite si persiste
- Reporta §5.A de la fase en curso

═══════════════════════════════════════════════════════════════
8. TODOs OPERACIONALES ACTIVOS (post-housekeeping 2026-04-19)
═══════════════════════════════════════════════════════════════

Pendientes derivados del housekeeping post-FASE 07b. Status updated cada
cierre de mini-fase o TODO.

TODO #1 — Branch protection main promotion
  Status: ✅ CERRADO 2026-04-19
  Refs: PR #13 (chore/protection-infra-fix, commit 2e73e7d) +
        gh api PUT branches/main/protection (10 contexts validados).
  Resultado: required_status_checks alineados con jobs reales.
             Cualquier futuro PR docs-only ya no se bloquea.

TODO #2 — Mini-fase Playwright auto-fetch (5 fuentes financieras MX)
  Status: 🟡 ACTIVO — agendado post-FASE 18
  Spec: docs/05_OPERACIONAL/TODO_PLAYWRIGHT_AUTOFETCH.md
  Estimado: ~0.5-1 sesión Claude Code.
  Razonamiento timing: FASE 18 es la primera consumidora intensiva
  de datos financieros (calculadoras hipotecarias, pre-aprobación).

TODO #3 — Vocabulario inicial vibe_tags (50-60 tags ADR-022)
  Status: 🟡 AGENDADO — mini-fase OBLIGATORIA pre-FASE 20
  Spec: ADR-022_VIBE_TAGS_HYBRID.md §5 + 03.1 Dominio 14.5
  Estimado: ~0.5 sesión (curaduría vocabulario + seed migration +
            validation_rule per tag).
  Razonamiento timing: FASE 20 BLOQUE 20.L M-VIBE-TAGS-UI depende
  del catálogo seed; sin tags no hay UI funcional.

TODO #4 — Upgrade Vercel CLI (51.5.0 → 51.7.0)
  Status: 🟢 OPCIONAL — sin urgencia
  Comando: pnpm add -g vercel@latest (o npm i -g vercel@latest)
  No bloquea housekeeping ni próximas fases.

TODO #5 — Reconciliar nombres stubs F15/H17/D11/I07/I08 inventados BLOQUE 8.A
  Status: 🟡 ACTIVO — housekeeping post-FASE 08
  Origen: BLOQUE 8.A decisión autónoma #2 (commit 4215611)
  Acción: decidir si esos 5 IDs se mantienen formalmente o se renombran a
          FUTURE_STUB_0N hasta que catálogo 03.8 los defina con propósito.
  Estimado: 15min (review catálogo + rename si aplica).

TODO #6 — Formalizar pattern compute() puro factorizado en CONTRATO/ADR
  Status: 🟡 ACTIVO — housekeeping post-FASE 08
  Origen: BLOQUE 8.B parte 1/2 decisión autónoma #6 (compute() puro
          separado de Calculator class).
  Acción: documentar en sección Convenciones del CONTRATO o crear ADR-024
          "Pure compute functions for IE calculators".
  Beneficio: tests directos sin mock supabase + reutilización H2 (gradient
             boosting puede llamar compute() en feature engineering).

TODO #7 — Registry superseded_by para versionado A/B
  Status: 🟡 AGENDADO — BLOQUE 8.F o housekeeping post-FASE 08
  Acción: agregar campo opcional superseded_by: string en
          ScoreRegistryEntry. Habilita migración A/B cuando salga F01
          v2.0.0 manteniendo histórico v1.0.0.

TODO #8 — zone_scores LIST partition por country_code
  Status: 🟡 AGENDADO — BLOQUE 8.F
  Razón: 1,800 colonias × 32 scores × 12 updates/año = 691K rows/año.
         Sin partition, queries por zone_id se degradan tras ~3 años.
         LIST partition por country habilita multi-país H2 nativo.

TODO #9 — Upstash rate limit en /api/admin/queue-metrics
  Status: 🟡 AGENDADO — BLOQUE 8.E o 8.F
  Razón: endpoint admin sin throttle. Si superadmin token leak →
         query DB intensiva sin límite. 60 req/min suficiente.

TODO #10 — PostHog dashboards "IE Health" + "IE Cost Tracker"
  Status: 🟢 POST-FASE 08 — observabilidad operacional
  Datos ya emitidos: ie.score.calculated (BLOQUE 8.A) + props extendidas
  U7 (BLOQUE 8.B parte 2) + ie.cost.tracked (cost-tracker.ts).
  Acción: configurar 2 dashboards PostHog cuando portal admin (FASE 19) live.

TODO #11 — freshness_score 0-100 en CalculatorOutput
  Status: 🟡 AGENDADO — BLOQUE 8.E (UI confidence)
  Razón: independiente del value, indicador qué tan fresca está la data
         que alimentó el score. Habilita badge "Datos antiguos" UI.

TODO #12 — N11 DMX Momentum priority commit en BLOQUE 8.C
  Status: 🟡 RECORDATORIO — BLOQUE 8.C
  Razón: N11 alimenta DMX-MOM (producto B2B licenciable $20-50K). Debe
         ser primer commit de 8.C, no último. Killer asset diferencial.

TODO #13 — tRPC scores router accesible desde Copilot ⌘J
  Status: 🟡 AGENDADO — FASE 09
  Razón: Copilot AI-native (FASE 03) running pero sin tool calling para
         scores. Gap UX. FASE 09 implementa router; agregar registro
         como tool en MCP de Copilot mismo bloque.

TODO #14 — Validar Mapbox token usado solo server-side en H09
  Status: 🟡 ACTIVO — durante BLOQUE 8.B parte 2/2
  Razón: H09 calculator debe usar MAPBOX_SECRET_TOKEN o equivalente
         server-side. Verificar NO hay fallback a NEXT_PUBLIC_MAPBOX_TOKEN
         en path runScore. NEXT_PUBLIC_* solo para mapas client-side.

TODO #15 — registerCalculator() wiring runtime (los 21 N0 de BLOQUE 8.B)
  Status: 🟡 AGENDADO — BLOQUE 8.F (cascades + wiring)
  Origen: BLOQUE 8.B parte 2/2 inferencia #4 (commit 4ad1398).
  Estado actual: CALCULATOR_LOADERS vacío en runScore. Los 21 calculators
                 N0 existen como código + tests passing, pero el worker
                 cron NO puede invocarlos en producción hasta que cada uno
                 se registre vía registerCalculator(scoreId, loader) al
                 startup.
  Acción BLOQUE 8.F:
    - Crear shared/lib/intelligence-engine/calculators/n0/index.ts que
      registra los 21 N0 al import.
    - Crear shared/lib/intelligence-engine/calculators/n01-n11/index.ts
      para los 11 N01-N11 (BLOQUE 8.C).
    - Importar ambos índices al startup (next.config o instrument.ts).
  Estimado: 30 min. Bloqueante para que el worker score-worker (BLOQUE 8.A)
            ejecute calculators reales en producción.

TODO #16 — TELEMETRY_SALT en Vercel Production + Preview envs
  Status: 🔴 PRE-DEPLOY OBLIGATORIO — antes de tag fase-08-complete
  Origen: BLOQUE 8.B parte 2/2 decisión autónoma #5.
  Acción: agregar TELEMETRY_SALT (random fixed string, ej. 32 bytes hex)
          a Vercel envs Production + Preview. Sensitive ON. NO rotar
          después de deploy (rompería continuidad de hashes históricos
          en PostHog dashboards).
  Razón: hash-user-id.ts cae a DEFAULT_SALT hardcoded si env missing,
         lo cual hace hashes diferentes entre dev/prod y rompe analítica.

TODO #17 — BotID protection (CORREGIDO 2026-04-20)
  Status: ✅ AUTO-ACTIVO post-deploy (SDK code-level, NO requiere Dashboard)
  Origen: BLOQUE 8.D inferencia #3 (commit 4e0654d). Corrección clarificada
          2026-04-20 tras confusion founder con Bot Protection (producto WAF
          distinto a BotID SDK).
  Realidad: package @vercel/botid@1.5.11 instalado en BLOQUE 8.D activa
            BotID Basic mode automáticamente al deploy. Cero config Dashboard.
  No confundir con: Vercel Firewall → Bot Management → "Bot Protection"
                    (producto SEPARADO, WAF nivel red, opcional, dejarlo OFF
                    por ahora). BotID SDK protege solo endpoints específicos
                    como /api/v1/estimate.
  Upgrade futuro: BotID Deep Analysis ($1/1000 calls) sí requiere Dashboard
                  activate + paid plan. Decidible post-launch con data real
                  de patrones de ataque scrapers.

TODO #18 — Setup Storybook para componentes Dopamine
  Status: 🟡 AGENDADO — FASE 11 o housekeeping post-FASE 08
  Origen: BLOQUE 8.E decisión autónoma #2 (commit 4cadb92).
  Estado actual: 5 componentes UI Dopamine creados (ConfidenceBadge,
                 ScoreTransparencyPanel, ScoreRecommendationsCard,
                 ScorePlaceholder, IntelligenceCard) sin stories Storybook.
                 Plan FASE 08 §8.E.1.1 pidió "Storybook story por cada
                 variante" como criterio de done.
  Razón aplazado: infra Storybook no existe en repo. Setup quedaría fuera
                  scope BLOQUE 8.E.
  Acción FASE 11 o housekeeping:
    - Instalar Storybook 8 + addons (a11y, viewport, dark mode)
    - Configurar Tailwind v4 + tokens CSS-first
    - Crear stories para los 5 componentes BLOQUE 8.E (variantes + states)
    - Agregar a CI como check opcional (npm run storybook:build)
  Estimado: 2-4 horas setup + 2-4 horas stories.

TODO #19 — Setup jsdom + Testing Library para visual UI tests
  Status: 🟡 AGENDADO — FASE 11 cuando IntelligenceCard tenga consumer real
  Origen: BLOQUE 8.E decisión autónoma #3 (commit 4cadb92).
  Estado actual: tests de UI cubren solo lógica pura (4 helpers, 18 casos).
                 Visual rendering + interacción no testeado en unit tests.
                 Cobertura esperada vía Playwright cuando aterrice features/ie/.
  Acción FASE 11:
    - Instalar @testing-library/react + jsdom (vitest config)
    - Migrar 18 helper tests + agregar component render tests
    - Habilita testing snapshot visual + a11y + interactions sin Playwright
  Estimado: 1-2 horas setup + 4-8 horas migración + nuevos tests.

TODO #21 — Upgrade Vercel Pro cuando producción demande mayor frecuencia
  Status: 🟢 RESUELTO H1 con cron daily — upgrade pendiente H2 producción
  Origen: PR #16 deployment fail Vercel (5 fix commits para identificar
          causa). Plan Free acepta cron diario; rechaza hourly/cada-X-min
          independiente de cantidad total.
  Solución H1 aplicada: score-worker cron "0 8 * * *" (daily 8am UTC = 2am
                        CDMX) — alineado con resto de crons existentes.
                        Cascadas event-driven (BLOQUE 8.F) cubren la mayoría
                        de updates en runtime, worker tick diario procesa
                        backlog acumulado.
  Trigger upgrade Vercel Pro ($20/mo): cuando volumen real H2 demande
    procesamiento sub-hora. Habilita cron por minuto + 40 cron jobs total.
  Decisión founder 2026-04-20: "ya que estemos 100% producción, pagamos Pro".
  Alternativa H1 si se necesita más frecuencia antes upgrade: GitHub Actions
    schedule cron */5 * * * * gratis llamando webhook DMX score-worker.

TODO #24 — Upgrades directos propuestos pendientes approval founder
  Status: 🟢 PROPUESTOS — session 2026-04-20, aún no aprobados formalmente
  Origen: analysis sesiones FASE 08-10 + research competitivo 2026-04-20.
  Lista (10 upgrades directos IE adicionales):
    D12 Score explanations AI-generated runtime (Claude Haiku dinámico)
    D15 Score version migration con backfill controlled (gradual rollout)
    D17 ML model versioning + drift detection (E03 + H14)
    D20 Continuous learning feedback loop (re-entrenamiento mensual)
    D22 Data freshness SLA per score (garantía explícita)
    D23 Benchmarks cross-country (CDMX vs Bogotá vs BA — requiere data CO/AR)
    D24 Performance monitoring per calculator (duration p50/p95/p99)
    D26 SDK TypeScript npm package "dmx-scores" (ADR-013 API as Product)
    D27 Voice interface Copilot (STT/TTS) — aplicable H2
    D28 AR preview móvil — H3
  Acción: revisar por founder + priorizar cuáles integrar a FASEs futuras o descartar.
  Bloqueo: NO integrar a FASE 10 scope actual (session split decisión founder 2026-04-20).

TODO #25 — Product Packaging docs suite (9 personas + ~15 productos empaquetados)
  Status: 🟡 AGENDADO — post FASE 10 sesión 1/3 cierre
  Origen: founder request 2026-04-20 — empaquetar features en productos por persona.
  Docs a generar:
    - docs/08_PRODUCTOS/FEATURE_INVENTORY.md (consolidado 150+ features únicos IDs)
    - docs/08_PRODUCTOS/PERSONA_MAP.md (9 personas con Jobs-to-be-Done)
    - docs/08_PRODUCTOS/PRODUCT_CATALOG.md (~15 productos empaquetados con tier pricing)
    - docs/08_PRODUCTOS/COMPETITIVE_POSITIONING.md (matriz producto vs competidor)
  9 personas identificadas: Developer · Asesor/Broker · Comprador residencial · Inversor
    residencial · FIBRA/Fondo institucional · Aseguradora · Banco/Fintech · Gobierno/Policy ·
    Inspector/Valuador
  Estimado: 2 sesiones CC docs dedicadas
  Paralelo ok: no bloquea FASE 10 ejecución

TODO #23 — FASE 26 DMX Social + Listing Intelligence Platform MVP
  Status: 🟡 AGENDADO — mini-fase post FASE 10 validación free-tier
  Origen: sesiones FASE 10 pre-flight (founder decisiones 2026-04-20):
          - Social intelligence Brandwatch-style (L43-L52)
          - WhatsApp groups + páginas inmobiliarias MX data (L53-L58)
          - Free-tier architecture validada ~$5-15 USD/mes
  Scope: pipeline integrado WhatsApp + Chrome extension expandida + social
         APIs free tier + opendata → external_listings table + alimentación
         scores IE + admin dashboard
  Estimado: 4-6 sesiones CC
  Gating: validar ≥1,000 listings/mes útiles en primer sprint antes de
          justificar upgrade paid APIs (IG masivo, X/Twitter, Apify Pro).
  Docs: ADR-025 consolidador + FASE_26_LISTING_INTELLIGENCE_PLATFORM.md stub
  NO bloquea FASE 10 (IE Scores N2+N3+N4). Ejecutar como mini-fase separada.

TODO #22 — Playwright smoke CI integration post-FASE 09
  Status: 🟡 AGENDADO — housekeeping post-FASE 09
  Origen: FASE 09 sesión 2/2 BLOQUE 9.E.2 (commit 23dc528).
  Estado actual: 4 smoke tests tests/e2e/fase-09-n1-scores.spec.ts
                 pasan localmente (npm run test:e2e:phase-09) con dev
                 server + chromium headless. NO integrados a GitHub
                 Actions aún.
  Acción:
    - Crear workflow .github/workflows/playwright-e2e.yml ejecutando
      npx playwright install --with-deps chromium + npm run test:e2e:phase-09
      en PR targets que tocan /shared/ui/dopamine/ o /features/ie/.
    - Agregar como required status check para merge a main.
    - Secrets: configurar SUPABASE_* mínimos para build dev server.
  Estimado: 1-2 horas setup + debug primer run.
  Bloqueante para merge main FASE 09: NO (smoke tests opcionales).

TODO #20 — IE_MONTHLY_BUDGET_USD en Vercel Production + Preview envs
  Status: 🔴 PRE-DEPLOY OBLIGATORIO — antes de merge main
  Origen: BLOQUE 8.F.7 F4 cost guard rails (FASE 08 cierre).
  Default: $100 USD/mes (conservador H1).
  Acción: en [Vercel Dashboard] → Project desarrollos-mx-ie-2026-final →
          Settings → Environment Variables → agregar IE_MONTHLY_BUDGET_USD=100
          en Production + Preview. Sensitive OFF (es número, no secreto).
  Razón: F4 cost guard valida cascadas vs budget mensual. Sin este env,
         fallback hardcoded a $100. Founder puede ajustar después con data
         real de cost-tracker (incluido FASE 07 + U3 BLOQUE 8.A).
  Tune H2: con histórico real cost_log + 3 meses operación, calibrar real.

TODO #24 — Upgrades D12-D28 status delta post-FASE 10
  Status: 🟢 TRACKING — status referencial post-cierre FASE 10
  Origen: pipeline upgrades D identificados pre-FASE 10 (LATERAL_UPGRADES_
          PIPELINE.md housekeeping 2026-04-20).
  Shipped FASE 10 (14): D13 confidence propagation · D14 sensitivity ·
    D16 matrices · D18 public/internal (ACTIVATED sesión 3/3) · D19 LIME ·
    D21 webhooks · D25 stability · D29 scenarios · D30 PPD deeper A10 ·
    D31 comparables A08 · D32 AI narrative · D33 multi-tenant · D34
    retention · D35 indexes.
  Pendientes (9): D12, D15, D17, D20, D22, D23, D26, D27, D28. Revisar
    prioridad en housekeeping post-FASE 11 vs estrategia H2.

TODO #25 — Heatmap geo-coords source (L-72 dependency H2)
  Status: 🟡 AGENDADO — FASE 12 Mapbox integration
  Origen: FASE 10 SESIÓN 3/3 L-72 decisión autónoma #5.
  Estado actual: MV heatmap_cache (migration 20260420123000) expone score
                 + zone_id + country_code + value + confidence + period_date.
                 Sin lat/lng nativo H1 (no existe tabla zonas central con
                 centroides polígono).
  Acción FASE 12:
    - Crear tabla public.zonas con columnas (id, country_code, nombre,
      alcaldia, polygon geometry(Polygon, 4326), centroid geography, created_at)
    - Seed desde INEGI/SEDUVI shapefiles CDMX (1,800 colonias) + BAT H2.
    - Extender heatmap_cache MV con join a zonas y exponer lat/lng.
    - Consumer Mapbox client-side FASE 12 lee directo de /api/v1/heatmap.
  Bloqueante: FASE 12 Mapbox setup. NO bloquea cierre FASE 10.

TODO #26 — TENANT_SCOPE_DEFAULT env en Vercel (D33 opcional)
  Status: 🟢 OPCIONAL — fallback hardcoded H1 es suficiente
  Origen: FASE 10 SESIÓN 3/3 D33 multi-tenant scoping.
  Default: 'global' (tenant_id NULL = scope global, backward compat todos
          los calculators). Nuevo env TENANT_SCOPE_DEFAULT permite override
          sin redeploy cuando institutional customers onboarden.
  Acción (futuro, cuando FIBRA/fondo firme contrato):
    - [Vercel Dashboard] → Settings → Environment Variables → agregar
      TENANT_SCOPE_DEFAULT=<tenant-uuid> en Production para el cliente.
    - Populate tenant_scopes table via admin endpoint (por crear FASE 23).
  H1: no requiere acción — tenant_scopes vacío es válido mientras no hay
       institutional customers. runScore permisivo si score no requiere tenant.

TODO #27 — Implementar 15 índices DMX (antes 7) — FASE 11 XL
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUES 11.A-11.B
  Priority: H1
  Origen: Founder approval 2026-04-21 expansión FASE 11 XL.
  Scope: 8 índices nuevos (FAM familia, YNG jóvenes, GRN green, STR STR-viability,
         INV investment-grade, DEV developer-feasibility, GNT gentrification,
         STA stability) + 7 originales (IPV/IAB/IDS/IRE/ICO/MOM/LIV).
  Pesos propuestos [CONFIRMAR FOUNDER POST-FASE 11.A]:
    - FAM: schools×0.30 + H05 safety×0.25 + N10 parks×0.15 + pediatric×0.15 + commute×0.15
    - YNG: N09 nightlife×0.25 + coworking_density×0.20 + gym_density×0.15 +
           N08 walkability×0.20 + commute×0.20
    - GRN: AQI×0.30 + N10 green_space×0.25 + bikeability×0.20 + solar_potential×0.15 +
           water_quality×0.10
    - STR: AirROI_yield×0.35 + str_regulation×0.20 + str_demand×0.25 + occupancy×0.20
    - INV: yield_net×0.35 + liquidity_score×0.25 + DMX-IRE_inverted×0.25 +
           N11 momentum×0.15
    - DEV: land_availability×0.25 + permits_speed×0.20 + B08 absorción×0.25 +
           TIR_projected×0.30
    - GNT: delta_IPV_12m×0.40 + displacement_risk×0.30 + new_businesses×0.15 +
           demographic_turnover×0.15
    - STA: 100 - volatility_scores×0.40 - tenure_churn×0.30 - occupancy_variance×0.30
  Criterio done:
    - [ ] 15 calculators (7 existentes + 8 nuevos) registrados en registry.
    - [ ] CHECK `dmx_indices.index_code` expandido a 15 códigos via migration.
    - [ ] Cada índice calcula sin error para CDMX colonia seed con confidence=high o medium.

TODO #28 — Causal Engine base (movido de FASE 12)
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUE 11.F
  Priority: H1
  Origen: founder approval 2026-04-21 — mover Causal Engine de FASE 12 a FASE 11 XL.
  Scope: motor explicativo "por qué Narvarte subió +18% en IPV" con rationale
         AI-generated (Claude Haiku) + citas a scores fuente + delta breakdown.
  Tabla nueva: `causal_engine_explanations` (zone_id, index_code, period_date,
               rationale_md, components_delta_jsonb, citations_jsonb, model_used).
  Criterio done:
    - [ ] Endpoint `/api/v1/indices/[code]/causal/[zone_id]` retorna explicación.
    - [ ] Integración UI ScoreTransparencyPanel (FASE 08) muestra rationale.

TODO #29 — Pulse Score + Migration Flow v1 + Trend Genome — FASE 11 XL moonshots core
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUES 11.G-11.I
  Priority: H1
  Origen: founder approval 2026-04-21 moonshots core.
  Scope:
    - Pulse Score daily: score compuesto heat CDMX + endpoint público `/api/v1/pulse`
    - Migration Flow v1: grafo origen→destino colonias con historical snapshots
    - Trend Genome + Influencer Heat: Apify ingestor Instagram + signal pre-mediática
  Criterio done:
    - [ ] `pulse_score_daily` tabla + cron poblando diariamente
    - [ ] `migration_flow_edges` + endpoint visualización grafo
    - [ ] `influencer_heat_zones` + ADR-027 compliance

TODO #30 — Scorecard Nacional ampliado + Press Kit Auto mensual
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUES 11.J-11.K
  Priority: H1
  Origen: founder approval 2026-04-21 — Scorecard como autoridad S&P-like.
  Scope:
    - Scorecard Trimestral 15 índices ranking nacional (todas ciudades H1)
    - PDF público branded + metodología versionada (ADR-027)
    - Press Kit Auto mensual con DMX-MOM top movers + talking points periodistas
  Criterio done:
    - [ ] PDF generator funcional `/reports/scorecard-Q[N]-[year].pdf`
    - [ ] Press kit endpoint `/api/v1/press-kit/[period]` con markdown + hero stats
    - [ ] Newsletter envío mensual a lista periodistas (stub hasta FASE 22)

TODO #31 — Preview UX 4 personas (FASE 11 XL)
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUE 11.L
  Priority: H1
  Origen: founder approval 2026-04-21 — preview /indices adaptativo persona.
  Scope: rutas `/indices?view=familia|inversor|joven|desarrollador` con UI
         filtrada mostrando solo índices relevantes + narrativa por persona.
  Criterio done:
    - [ ] 4 views implementadas con filtro client-side
    - [ ] Copy narrativa por persona (i18n es-MX mínimo)
    - [ ] A11y: selector view accesible keyboard + screen reader

TODO #32 — Widget Embebible + Time Machine API (FASE 11 XL)
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUES 11.N-11.O
  Priority: H1
  Origen: founder approval 2026-04-21 — infraestructura protocol-level.
  Scope:
    - Widget Embebible: script JS `<script src="dmx.mx/widget.js" data-zone="..."/>`
      con score + link DMX + analytics tracking
    - Time Machine API: `/api/v1/time-machine?zone=X&date=2022-03` snapshot histórico
  Criterio done:
    - [ ] `widget_embed_tokens` tabla + auth per-domain
    - [ ] Widget UI responsive + dark/light mode
    - [ ] `time_machine_snapshots` particionado pg_partman 24m retention
    - [ ] Ratelimit Upstash 100 req/hora per domain

TODO #33 — SEEDs moonshots (Genoma, Futures, LifePath, Climate Twin, Constellations, Living Atlas)
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUES 11.M, 11.P, 11.Q, 11.S, 11.T, 11.U
  Priority: H1
  Origen: founder approval 2026-04-21 — SEEDs FASE 11 XL, extensión fases posteriores.
  Scope:
    - Genoma Colonias SEED (pgvector 64-dim ADR-027)
    - Futures Curve SEED (proyección N11 12m heurística)
    - LifePath SEED (destino vital persona→zona fit)
    - Climate Twin SEED (proyección 15y clima)
    - Zone Constellations SEED (clusters dinámicos semanales)
    - Living Atlas SEED (base mapa 4D)
  Criterio done:
    - [ ] 6 tablas BD + 6 endpoints stub funcionales
    - [ ] Tests unitarios por cada SEED
    - [ ] UI placeholder consuming real data (no mock)

TODO #34 — Ghost Zones + Alert Radar WhatsApp + Stickers Descargables
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUES 11.V-11.X
  Priority: H1
  Origen: founder approval 2026-04-21 — laterales high-virality.
  Scope:
    - Ghost Zones: detector caída demand sostenida >30% 6m+
    - Alert Radar WhatsApp: opt-in por usuario, Twilio WA send on events
    - Stickers Descargables: generador stickers compartibles (zona + score) PNG/WebP
  Criterio done:
    - [ ] `ghost_zones_alerts` tabla + cron detector semanal
    - [ ] `whatsapp_alert_subscriptions` + endpoint subscribe/unsubscribe
    - [ ] Endpoint `/api/v1/stickers/[zone]/generate` retorna PNG compartible

TODO #35 — DNA Migration + Historical Forensics + Living Networks + Zone Cert Integration
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUES 11.R, 11.Y
  Priority: H1
  Origen: founder approval 2026-04-21 — moonshots dependientes cluster final.
  Scope:
    - DNA Migration: journeys comprador multi-zona (wishlist + search_logs + closed ops)
    - Historical Forensics: PDFs educativos "qué pasó en Cuauhtémoc 2015-2020"
    - Living Metropolitan Networks: grafo relaciones entre metrópolis LATAM
    - Zone Certification Integration: FASE 10 L-32 cert integrada a 15 índices
  Criterio done:
    - [ ] `dna_migration_journeys` + `historical_forensics_cases` tablas
    - [ ] 3 PDFs seed forensics case-studies generados
    - [ ] L-32 zone cert appears como badge en 15 índices UI

TODO #36 — E2E verification BLOQUE 11.Z + tag fase-11-complete
  Status: 🟡 AGENDADO — FASE 11 XL BLOQUE 11.Z (cierre)
  Priority: H1
  Origen: ADR-018 E2E Connectedness + §6.bis CONTRATO enforcement.
  Scope cierre fase:
    - tsc --noEmit pasa
    - npm run lint pasa
    - npm run build pasa
    - Tests ≥2000 passing (~1700 FASE 10 + 300 FASE 11 XL)
    - Migrations aplicadas: 16 nuevas tablas + allowlist v15 STRICT
    - audit:e2e 0 violations
    - audit:rls STRICT 0 violations
    - Playwright smoke FASE 11 verde
    - 03.13_E2E_CONNECTIONS_MAP actualizado +25 rows
    - i18n keys nuevas en es-MX + 4 locales restantes (stub OK)
    - a11y: semantic HTML + aria-labels + keyboard nav + reduced-motion
    - Tag `fase-11-complete` único al final de 25 bloques
  Criterio done:
    - [ ] 16/16 verificaciones cierre pasan
    - [ ] Git tag pushed
    - [ ] Reporte §5.B CONTRATO entregado al founder

═══════════════════════════════════════════════════════════════
9. FASE 08 CERRADA — Estado consolidado 2026-04-20
═══════════════════════════════════════════════════════════════

Tag git: fase-08-complete (commit final BLOQUE 8.F)
Branch: fase-08/ie-scores-n0 (sin push pendiente decisión founder)

Entregables:
- 32 calculators N0 (21 originales F01-F07/H01-H11/A01-A04/B12/D07 + 11 nuevos N01-N11)
- AVM I01 MVP "DMX Estimate" con regresión H1 + BotID protection + endpoint /api/v1/estimate
- 5 componentes UI Dopamine (ConfidenceBadge, ScoreTransparencyPanel,
  ScoreRecommendationsCard, ScorePlaceholder, IntelligenceCard)
- 9 migrations BD (queue, validity/RLS, deltas/ranking, avm_estimates,
  tier_requirements, market_anomalies, cascade_replay_log, cascade triggers,
  allowlist v8)
- 2 cascadas formales wire (geo_data_updated × 9 sources + macro_updated)
- Endpoints admin (/api/admin/cascades/{graph,replay} + /api/admin/queue-metrics)
- 26 upgrades aplicados acumulados (U5-U14, P1, S1-S2, D1-D7, E4-E5, F1-F4,
  U8, U11, BotID)

Tests: 1010 passing / 2 skipped
Verificaciones cierre fase: 16/16 ✓ (typecheck, lint, tests, db:types,
                            audit:e2e, audit:rls STRICT, build prod OK)

Cascadas restantes (4) wire en FASEs consumers:
- unit_sold → FASE 13-15 (Portal Asesor con flow ventas)
- price_changed → FASE 14 (CRM precios)
- feedback_registered → FASE 13 (interaction_feedback flows)
- search_behavior → FASE 20-21 (portales con search_logs)

Pre-deploy CRÍTICOS (founder ejecutar antes de merge main):
- TODO #16 TELEMETRY_SALT
- TODO #17 BotID Basic activate
- TODO #20 IE_MONTHLY_BUDGET_USD

Próxima fase: FASE 09 — IE Scores Nivel 1 (16 scores: F08 LQI, F12 Risk Map,
H07 Environmental, A02 Investment Sim, A05 TCO 10y, A06 Neighborhood, A12
Price Fairness, B01 Demand Heatmap, B02 Margin Pressure, B04 PMF, B07
Competitive Intel, B08 Absorption Forecast, D05 Gentrification macro, D06
Affordability Crisis, H05 Trust Score, H14 Buyer Persona)

═══════════════════════════════════════════════════════════════
10. FASE 09 CERRADA — Estado consolidado 2026-04-20
═══════════════════════════════════════════════════════════════

Tag git: fase-09-complete
Branch: fase-09/ie-scores-n1 (sin push pendiente decisión founder)

Split ejecución: 2 sesiones (9.A+9.B+9.C+D8-D11 sesión 1; fix A12 +
9.D UI + 9.E Playwright sesión 2). Decisión autónoma founder 2026-04-20:
fix A12 multiplicador × 4 (gap alto = score bajo) para alinear con
semántica Price Fairness.

Entregables:
- 16 calculators N1 puros (compute functions + Calculator class) +
  tests unitarios + snapshot harness 256 casos (16 N1 × 16 zonas CDMX)
- tRPC router features/ie (5 procedures: list, getByZone,
  getDependencies, getTierGate, getHistory) + 5 React hooks
  consumer + ZoneIntelligenceCard wrapper
- 4 Playwright smoke tests verdes contra /ie-playground dev-only
  (app/(dev)/ie-playground) — fixtures mock sin dependencia tRPC real
- 4 upgrades aplicados (D8 weights runtime + D9 fallback graceful +
  D10 score lineage graph + D11 cascade downstream N1↔N0)
- Migration 20260420090000_ie_n1_weights_and_cascade.sql + allowlist
  v9/v10

Tests: >1400 passing (1010 FASE 08 + ~400 FASE 09)
Verificaciones cierre fase: 14/14 ✓ (typecheck, lint, tests, db:types,
                            audit:e2e, audit:rls STRICT, build prod OK,
                            Playwright smoke 4 verdes)

Próxima fase: FASE 10 — IE Scores Nivel 2 y 3 (P08, P09, I07, I08, D02,
D04, D08, D09, D10, N23, A13, M5, R2, R4 — niveles compuestos y
producto-final sobre N0+N1).

═══════════════════════════════════════════════════════════════
11. FASE 10 CERRADA — Estado consolidado 2026-04-20
═══════════════════════════════════════════════════════════════

Tag git: fase-10-complete
Branch: fase-10/ie-scores-n2-n3-n4 (sin push pendiente decisión founder)

Split ejecución: 3 sesiones.
  SESIÓN 1/3 → 14 N2 + infra D13/D14/D16/D19/D21/D25 + D18 prep.
  SESIÓN 2/3 → 12 N3 + D29/D30/D31/D32 + L-69 + L-31.
  SESIÓN 3/3 → 7 N4 + D18 ACTIVATE + D33 + D34 + D35 + L-32 + L-72 + CIERRE.

Entregables:
- 33 calculators (14 N2 + 12 N3 + 7 N4): pattern canónico pure compute()
  + Calculator class + methodology + tests snapshot.
- 7 N4 agregados: E01 Full Project Score (interno), G01 Full Score 2.0
  (público filtrado D18), E02 Portfolio Optimizer (Sharpe), E03
  Predictive Close (heurística logística H1 + ml_explanations D19), E04
  Anomaly Detector (Z-scores), D09 Ecosystem Health, D02 Zona Ranking
  (IPV×0.6 + LIV×0.4 ADR-026).
- 18 upgrades shipped acumulados (D13+D14+D16+D18+D19+D21+D25+D29+D30+
  D31+D32+D33+D34+D35 + L-69+L-31+L-32+L-72).
- 7 migrations BD FASE 10 (ie_n2_infra + ie_n3_property_comparables +
  ie_zone_demographics_cache + refresh_fn + ie_n4_multi_tenant_retention_
  visibility_certifications_heatmap + allowlist v11/v12/v13/v14).
- 5 crons nuevos (score-worker ya existía desde FASE 08): score-comparison
  -matrix, zone-demographics-refresh, score-history-purge (weekly
  Sunday 2am), heatmap-refresh (daily 5am). Total crons Vercel: 14.
- 8 endpoints nuevos: admin/scores/weights, admin/scores/dependencies,
  admin/webhooks/score-changes, cron/score-comparison-matrix,
  cron/score-history-purge, admin/zones/[id]/certify,
  cron/heatmap-refresh, v1/heatmap/[scoreId] (público).
- Multi-tenant N4: tenant_scopes table + tenant_id cols en zone/project/
  user_scores + score_history. CalculatorInput.tenant_id opcional.
  validateTenantScope + TenantScopeViolation error class wire en runScore.
- Visibility filter D18: ie_score_visibility_rules table + 7 seed rows.
  score-visibility.ts helper + filterRowsForPublic en tRPC scores.list.
  E01/E02/E03 internal (non-admin no ve); G01/D02/D09 public whitelisted.
- L-32 zone certifications hooks: evaluateZoneCertification (E01≥90×12m
  consecutivos + N11 stability≥0.85) + endpoint admin (sin automatic
  award H1, admin decide manual primeras 10).
- L-72 heatmap data layer: heatmap_cache MV + getHeatmapData helper +
  endpoint público /api/v1/heatmap/[scoreId] con Cache-Control 1h.
  FASE 12 Mapbox consumirá coords por zone_id.

Tests: >1700 passing (1510 sesión 2/3 + ~200 N4 nuevos).
Verificaciones cierre fase: 16/16 ✓ (typecheck, lint, tests, db:types,
                            audit:e2e, audit:rls STRICT, build prod OK,
                            D18 filter verif, D33 tenant verif, D34
                            purge, D35 indexes, L-32 cert eval, L-72
                            heatmap, snapshot harness, registry count 81).

Decisiones autónomas:
  1. E02/E03 category dev→proyecto (persist routing).
  2. E04 agregado→mercado, D09 mercado→zona (pick persister zone-aware).
  3. D33 enforcement permisivo H1: tenant_id NULL = global scope (backward
     compat). Solo scores tenant_scope_required=true rechazan.
  4. D34 weekly (no daily) Sunday 2am UTC — 5y retention no requiere
     frecuencia alta, evita beat cron limit Vercel Free.
  5. L-72 MV sin lat/lng nativo H1 — consumer FASE 12 Mapbox resuelve
     coords por zone_id via lookup externo.
  6. D18 ADMIN_ROLES bypass — superadmin + mb_admin ven data completa.

Stubs permitidos (4 señales ADR-018):
  - Crisis alerts table (L-50) — L-32 zone-certified assume 0 alerts H1.
  - tenant_scopes catálogo vacío — populate cuando FIBRA/fondo onboarding.
  - E03 heurística logística — calibración H2 requiere ≥100 closed ops
    (tier 4 gate ya enforced).

Pre-deploy CRÍTICOS (founder ejecutar antes de merge main):
- TODO #16 TELEMETRY_SALT (ya configurado FASE 08)
- TODO #17 BotID auto-activo post-deploy
- TODO #20 IE_MONTHLY_BUDGET_USD
- NUEVO #26: TENANT_SCOPE_DEFAULT='global' Vercel envs (opcional, fallback
  hardcoded H1).

Próxima fase: FASE 11 — Índices DMX (7 índices propietarios: DMX-IPV,
IAB, IDS, IRE, ICO, MOM, LIV). Publicación mensual DMX-MOM newsletter +
trimestral full report "DMX Índice de Colonias CDMX — Q#".

═══════════════════════════════════════════════════════════════
14. BATCH PROTOCOL POST-AUDITORÍA (canonizado 2026-04-24)
═══════════════════════════════════════════════════════════════

Tras auditoría integral FASE 0→11.S (2026-04-24), surge un patrón de
ejecución "BATCH quirúrgico" diferente a "FASE completa". Los batches
son intervenciones atómicas post-audit para resolver blockers
específicos antes de avanzar a siguiente FASE grande.

ESTRUCTURA BATCH (diferencia vs FASE):
  - Scope EXACTO delimitado (1-3 CRITICAL hallazgos auditoría max)
  - Wall-clock 15 min - 3h (no multi-día como FASE)
  - 1 PR atómico con 1 commit squash
  - Audit PM independiente pre-push (no confiar "CC audit clean")
  - Zero scope creep (si detectas otra oportunidad → documentar
    SUGGESTED pero NO añadir al batch)
  - Branch naming: `fix/pre-<MILESTONE>-<critical-short-name>`

BATCHES PRE-OPCIÓN D (shipped 2026-04-24):
  BATCH 1 (PR #35) — CRITICAL-007 search_path + CRITICAL-009 public
    bucket listing (~12 min) → main@7e55043
  BATCH 2 (PR #36) — CRITICAL-003 legal pages + FAQ 5 locales +
    ADR-028 (~30-35 min) → main@76bea52
  BATCH 3 (PR #37) — CRITICAL-001 circular dep + ESLint audit script
    + CI job enforcement (~1h 45m) → main@728222e
  BATCH 4 (PR #38) — CRITICAL-002 score-worker auth + orchestrator
    fail-fast hardening + memoria canonizada crons
    observability (~70 min) → main@1140b2c
  BATCH 5 (PR #39) — Canonical catalog naming ADR-029 (rename
    registry.ts + tabla feature_registry→ui_feature_flags, 5-6h con
    sub-agents paralelos) → main@3efcc1d

Tag intermedio: `pre-optionD-complete` → `main@3efcc1d` (rollback
checkpoint antes de arrancar Opción D FASE 07.5).

MEMORIAS CANONIZADAS DURANTE BATCHES:
  - feedback_cron_observability_obligatorio (BATCH 4)
  - feedback_arquitectura_escalable_desacoplada amplificada 2x
  - feedback_verify_before_spend amplificada (Vercel Pro deferred)

═══════════════════════════════════════════════════════════════
15. FASE 07.5 INGESTA CANONICAL FOUNDATIONAL (estructura)
═══════════════════════════════════════════════════════════════

Fase insertada entre 07b y 08 post-auditoría 2026-04-24. Razón:
detectado que ~85+/105 tablas públicas están VACÍAS en prod.
Los 19 bloques FASE 11 XL shipped (11.A-S) son lógica+UI+schemas
sin data real = demo-ware si se ship sin ingesta foundational.

SUB-SESIONES (7 total):
  07.5.0 foundational — Tabla `zones` master polimórfica multi-país
    + seed CDMX H1 (~219 entries) + estructura escalable
    content/zones/{country}/ + ADR-030 + 6 upgrades directos
    canonizados (CHECK constraints · nombres localizados es/en/pt
    · PostGIS boundary · H3 r8 · OSM admin_level · UUIDs v5
    determinísticos namespace DMX)
  07.5.A — Scripts ingest 01 inegi-colonias + 02 geo-boundaries
    + 03 macro-banxico-inegi + 04 demographics
  07.5.B — Calculators N0-N4 + DMX índices compute batch sobre
    seed zones
  07.5.C — Pulse 12m + genoma embeddings 64-dim sobre colonias
    seed
  07.5.D — Climate 15y heurístico + constellations edges + ghost
    zones ranking compute
  07.5.E — Seed LLM atlas wiki (script 12 Haiku 4.5 cost-cap $3)
    + orchestrator universal
  07.5.F — E2E validation + audit FK zones + tag
    `fase-07.5-ingesta-canonical-complete` + docs sync
    comprehensive (shipped 2026-04-24)

DEPENDENCIAS: 07b shipped + BATCHES 1-5 shipped + tag
  `pre-optionD-complete@3efcc1d`

FK ENFORCEMENT diferido: `L-NEW13 FASE 08 post-Opción D` agrega
  `ALTER TABLE ADD FOREIGN KEY` en 18+ tablas con zone_id →
  zones(id) + 6 con colonia_id (scope_type='colonia' invariante).
  Evita cascade breakage mid-ejecución Opción D.

═══════════════════════════════════════════════════════════════
15.5. FASE 07.6 PRODUCT AUDIT COMPREHENSIVE (ADR-032)
═══════════════════════════════════════════════════════════════

Fase PM-heavy insertada entre 07.5 y 11.T-Z post-auditoría
2026-04-24. Razón: founder introdujo inputs estructurales
(arquitectura 6 capas × 27 productos × 160+ features prototype
+ design system refreshed) que requieren audit comprehensivo
+ mapping fase-by-fase antes de ejecutar los 7 bloques
restantes de FASE 11.T-Z. Sin audit = riesgo rework +50h.

SUB-SESIONES (6 total, ~40h PM wall-clock + 3h founder):

  07.6.A — Auditoría exhaustiva estado actual (~6h)
    → docs/08_PRODUCT_AUDIT/00_INVENTARIO_ACTUAL.md
  07.6.B — Crosswalk Matrix 160+ features × 15 columnas (~14h)
    → 01_CROSSWALK_MATRIX.md
  07.6.C — Design Migration Plan + ADR-031 formal (~5h)
    → 02_DESIGN_MIGRATION.md + ADR-031
  07.6.D — RICE Priorities + Critical Path Graph (~4h)
    → 03_RICE_PRIORITIES.md
  07.6.E — Roadmap Integration fases 07.5.F→29 (~8h)
    → 04_ROADMAP_INTEGRATION.md
  07.6.F — Founder Decision Gates + canonización (~3h)
    → 05_FOUNDER_DECISION_GATES.md + tag fase-07.6-complete

DEPENDENCIAS: tag `fase-07.5-ingesta-canonical-complete` shipped
  (FASE 07.5.F) como trigger inicio.

SCOPE OUT: NO cambios de código funcionales, NO LLM calls
  (zero cost), NO shipping features nuevas, NO refactor UI
  components pre-ADR-031 merge.

REFS: ADR-032, docs/02_PLAN_MAESTRO/FASE_07.6_PRODUCT_AUDIT.md,
  L-NEW47 pipeline entry.

NEXT POST-07.6: insertar 5 mini-fases foundational §15.6-15.10
  (07.7 CRM + 11.W DISC + 11.X Properties + 21.A WhatsApp +
  22.A Banking) — 47 migrations · 420h · 13 ADRs nuevos +
  13 founder gates en `docs/08_PRODUCT_AUDIT/05_FOUNDER_DECISION_GATES.md`.

═══════════════════════════════════════════════════════════════
15.6. FASE 07.7 CRM FOUNDATION (mini-fase foundational, BLK_DEALS)
═══════════════════════════════════════════════════════════════

Mini-fase insertada entre 07.6 y 08 post-07.6.E roadmap mapping.
Razón: schema deals/leads/buyer_twins canonical es prerequisito
para FASE 13 Asesor M1-M5 (sin schema = greenfield retrofit
costoso) y FASE 11.J data CRM cierres alimenta AVM spread C2.1.
Resuelve blocker BLK_DEALS top-3 critical path.

SUB-BLOQUES (6 total, ~88h):
  07.7.A — leads + buyer_twins + deals schema (3 migrations · 17h)
  07.7.B — operaciones + family_units + referrals polimórfico
    (3 migrations · 17h)
  07.7.C — pipeline stages + behavioral signals + audit
    (2 migrations · 14h)
  07.7.D — RPCs + tRPC router base (1 migration · 26h)
  07.7.E — tests + types + audit_rls_allowlist v36 (1 migration · 12h)
  07.7.F — seed data dev + verificación (sin migration · 2h)

DEPENDENCIAS: tag `fase-07.6-complete` shipped + Gates founder
  1-3 cerrados (ADR-033 persona_type · ADR-034 referrals
  polymorphic · ADR-035 retention CFDI-aware).

MIGRATIONS: 11 totales · audit_rls_allowlist v36 incluido.
WALL-CLOCK: 11 días serial / 5 días 3 devs paralelo.
UNBLOCKS: 26 features (11 directos top-30 + 15 cascade).

REFS: ADR-033/034/035 (a crear), 04_ROADMAP_INTEGRATION.md §1.1,
  docs/02_PLAN_MAESTRO/FASE_07.7_CRM_FOUNDATION.md.

═══════════════════════════════════════════════════════════════
15.7. FASE 11.W DISC VOICE PIPELINE (mini-fase foundational, BLK_DISC)
═══════════════════════════════════════════════════════════════

Mini-fase post-FASE 07.7. Razón: 7 features capa C3 + cross
requieren `buyer_twins.disc_profile` habilitado (agente WhatsApp
C3.F1, objection playbook C3.F3, DISC auto-detectado C1.18,
gemelo digital 6D T.2.1). Sin DISC, todos quedan greenfield.

SUB-BLOQUES (5 total, ~64h):
  11.W.A — DISC framework canonization + privacy ADRs
    (2 migrations · 8h)
  11.W.B — self-assessment manual stub H1 (1 migration · 17h)
  11.W.C — Whisper integration audio pipeline (3 migrations · 23h)
  11.W.D — LLM DISC classifier (1 migration · 14h)
  11.W.E — wire buyer_twins + tests + smoke (1 migration · 2h)

DEPENDENCIAS: tag `fase-07.7-crm-foundation-complete` shipped +
  Gates founder 4-6 cerrados (ADR-036 DISC framework · ADR-037
  Whisper provider · ADR-038 privacy voice biométrico).

MIGRATIONS: 8 totales.
WALL-CLOCK: 8 días serial / 4 días 3 devs paralelo.
UNBLOCKS: 11 features (7 directos C3 + 4 cascade).

REFS: ADR-036/037/038 (a crear), 04_ROADMAP_INTEGRATION.md §1.2,
  docs/02_PLAN_MAESTRO/FASE_11.W_DISC_VOICE_PIPELINE.md.

═══════════════════════════════════════════════════════════════
15.8. FASE 11.X PROPERTIES INVENTORY (mini-fase foundational, BLK_PROPS)
═══════════════════════════════════════════════════════════════

Mini-fase post-FASE 11.W. Razón: tabla `properties` master es
blocker más estructural (BD + storage + ingestion + AVM data
wire). 9 directos + 5 cascade dependen (C2.1 AVM spread, C5.4.1
portfolio inversor, C2.2 price truth meter, C5.2.5 auto-valuation,
T.2.6 post-compra, etc.).

SUB-BLOQUES (6 total, ~132h):
  11.X.A — properties + property_units + amenities schema
    (3 migrations · 26h)
  11.X.B — listing states machine + history (2 migrations · 19h)
  11.X.C — property media + verified pipeline (2 migrations · 21h)
  11.X.D — wire AVM + zone_pulse data foundation (2 migrations · 26h)
  11.X.E — ingestion adapter asesor manual + future MLS
    (2 migrations · 37h)
  11.X.F — tests + types + seed verificación (sin migration · 3h)

DEPENDENCIAS: Gate-7 founder cerrado (ADR-039 inventory model
  BLOQUEANTE — portal-own vs MLS aggregator vs hybrid) + tag
  `fase-11.W-disc-voice-pipeline-complete` + Gates 8-9 (ADR-040
  asset_class scope · ADR-041 STR collision split vs merge).

MIGRATIONS: 12 totales · audit_rls_allowlist v37 incluido.
WALL-CLOCK: 17 días serial / 7 días 3 devs paralelo.
UNBLOCKS: 16 features (11 directos + 5 cascade).

REFS: ADR-039/040/041 (a crear), 04_ROADMAP_INTEGRATION.md §1.3,
  docs/02_PLAN_MAESTRO/FASE_11.X_PROPERTIES_INVENTORY.md,
  feedback_arquitectura_escalable_desacoplada (split canonized).

═══════════════════════════════════════════════════════════════
15.9. FASE 21.A WHATSAPP INTEGRATION (mini-fase foundational, BLK_WA)
═══════════════════════════════════════════════════════════════

Mini-fase pre-FASE 22 Marketing+Comms. Razón: WhatsApp es canal
primario 80% destino comprador LATAM. 8 directos + 12 cascade
notifs dependen (C3.F1 agente WA, C3.17 reporte personalizado,
T.2.6 post-compra, T.1.5 GPS enganche, T.2.4 referrals magic-link).

SUB-BLOQUES (5 total, ~76h):
  21.A.A — provider abstraction + ADR-042 (2 migrations · 20h)
  21.A.B — templates + WABA approval flow (2 migrations · 18h)
  21.A.C — sender service + opt-in consent (3 migrations · 23h)
  21.A.D — webhooks inbound + alerts engine wire
    (1 migration · 14h)
  21.A.E — cost cap + observability + tests (1 migration · 1h)

DEPENDENCIAS: Gate-10 founder cerrado (ADR-042 Twilio vs Meta
  BLOQUEANTE) + tag `fase-21-portal-publico-complete` + Gates
  11-12 (ADR-043 WABA verification path · ADR-044 templates
  initial scope).

MIGRATIONS: 9 totales.
WALL-CLOCK: 10 días serial / 4 días 3 devs paralelo.
UNBLOCKS: 20 features (8 directos + 12 cascade WA notifs).

REFS: ADR-042/043/044 (a crear), 04_ROADMAP_INTEGRATION.md §1.4,
  docs/02_PLAN_MAESTRO/FASE_21.A_WHATSAPP_INTEGRATION.md,
  feedback_arquitectura_escalable_desacoplada (provider abstraction).

═══════════════════════════════════════════════════════════════
15.10. FASE 22.A BANKING FINANCING (mini-fase foundational, BLK_BANK)
═══════════════════════════════════════════════════════════════

Mini-fase paralelo FASE 22 (feature-flagged hasta tag completo).
Razón: T.1.2 Financial Clarity (RICE 14,167 top-4 critical path)
imposible sin mortgage rates + simulator. T.1.5 GPS enganche y
C3.F19 Financing Simulator también dependen.

SUB-BLOQUES (5 total, ~60h):
  22.A.A — mortgage rates static stubs MX (2 migrations · 18h)
  22.A.B — mortgage simulator engine (1 migration · 19h)
  22.A.C — affordability + safety net deepening (1 migration · 13h)
  22.A.D — INFONAVIT/FOVISSSTE rules engine (2 migrations · 13h)
  22.A.E — future API negotiation track + tests
    (1 migration · 2h)

DEPENDENCIAS: Gate-13 founder cerrado (ADR-045 banking
  integration path BLOQUEANTE — static-rates vs partner-broker
  vs INFONAVIT-API) + tag `fase-21.A-whatsapp-integration-complete`
  + Gates adicionales (ADR-046 legal status DMX · ADR-047
  lenders coverage initial top-5 + INFONAVIT + FOVISSSTE).

MIGRATIONS: 7 totales · audit_rls_allowlist v38 incluido.
WALL-CLOCK: 8 días serial / 4 días 3 devs paralelo.
UNBLOCKS: 11 features (4 directos + 7 cascade).

REFS: ADR-045/046/047 (a crear), 04_ROADMAP_INTEGRATION.md §1.5,
  docs/02_PLAN_MAESTRO/FASE_22.A_BANKING_FINANCING.md.

═══════════════════════════════════════════════════════════════
16. MEMORIAS CANONIZADAS ACTIVAS (snapshot 2026-04-24 muy tarde)
═══════════════════════════════════════════════════════════════

24 entries en `/Users/manuelacosta/.claude/projects/.../memory/`:

  USER (1): user_founder_profile
  PROJECT (1): project_phase_workflow
  REFERENCE (2): reference_key_paths · reference_credentials_status
  FEEDBACK (20):
    - feedback_build_cacheComponents
    - feedback_audit_rls_allowlist
    - feedback_verify_before_spend (amplificada 2026-04-24:
      "opción más grande NO aplica gastos recurrentes ROI deferido")
    - feedback_airroi_cost_empirical
    - feedback_next_public_literal_only
    - feedback_card3d_no_tilt
    - feedback_subagents_over_revert
    - feedback_instruction_format
    - feedback_upgrades_destino
    - feedback_zero_deuda_tecnica
    - feedback_supabase_migrations_manual_push
    - feedback_arquitectura_escalable_desacoplada (amplificada 2x
      2026-04-24: "regla ambigüedad opción más grande" + "lint
      rule cross-feature imports recommendation")
    - feedback_pm_schema_audit_pre_prompt (NUEVA auditoría)
    - feedback_cc_guardrails_exhaustivos (NUEVA auditoría)
    - feedback_pm_audit_exhaustivo_post_cc (NUEVA auditoría)
    - feedback_formato_prompts_founder
    - feedback_cron_observability_obligatorio (NUEVA BATCH 4)

Las memorias son fuente de autoridad operacional. CC sesión nueva
carga CLAUDE.md + MEMORY.md index automáticamente. PM debe mantener
memorias consolidadas (amplificar existentes > crear nuevas) y
reflejarlas aquí en §16 como snapshot vivo.

═══════════════════════════════════════════════════════════════
17. STOP POINTS AMPLIFICADOS (post-auditoría)
═══════════════════════════════════════════════════════════════

A los 10 STOP POINTS originales (§2), post-auditoría 2026-04-24
se añaden 3 nuevos:

⑪ Detección de pattern recurrente 3+ features con mismo issue
  → canonizar en memoria feedback_*.md nueva O amplificar
  memoria existente (evaluar U5 upgrade auditoría)
⑫ Before spending recurrente $>$ → validar "¿ROI inmediato o
  deferido?". Si deferido, agendar con L-NN + milestone trigger
  específico (no upgrade AHORA)
⑬ Schema ambiguo / tabla master faltante / 3+ patrones referencia
  a mismo concepto → ritual ritual pre-prompt PM exhaustivo ANTES
  de enviar prompt CC (nunca improvisar mid-ejecución)
