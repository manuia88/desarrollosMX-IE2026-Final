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

TODO #17 — Activar BotID protection en Vercel Project Dashboard
  Status: 🔴 PRE-DEPLOY OBLIGATORIO — antes de tag fase-08-complete
  Origen: BLOQUE 8.D inferencia #3 (commit 4e0654d).
  Acción: en [Vercel Dashboard] → Project desarrollos-mx-ie-2026-final →
          Settings → Security → BotID → enable "Basic" mode (free).
          Sin esto, checkBotId() en /api/v1/estimate retorna 200 fake
          o falla silenciosamente en producción.
  Modo elegido: Basic (free). Deep Analysis ($1/1000 calls) decidible
                post-launch con data real de patrones de ataque scrapers.
  Razón: endpoint AVM público es target obvio scrapers competencia.
         Free tier 5/mes se evade trivialmente sin BotID.
