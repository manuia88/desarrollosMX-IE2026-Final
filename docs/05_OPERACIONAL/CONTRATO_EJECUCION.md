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
