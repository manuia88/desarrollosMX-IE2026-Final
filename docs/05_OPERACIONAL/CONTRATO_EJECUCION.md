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

70% → aviso informativo (continúas trabajando)
90% → paras al siguiente MÓDULO completo + §5.D
95% → paras inmediato + §5.D (hard stop)
Nunca comprimir manualmente. Nunca continuar tras 95% sin OK.

Al retomar en sesión nueva:
- Este contrato está en docs/05_OPERACIONAL/CONTRATO_EJECUCION.md
- Lee git log para estado
- Lee TodoWrite si persiste
- Reporta §5.A de la fase en curso
