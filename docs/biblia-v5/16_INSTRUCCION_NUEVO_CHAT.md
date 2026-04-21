Soy Manu, founder de DesarrollosMX v5 Dopamine Edition.
Plataforma de Spatial Decision Intelligence — sistema operativo de inteligencia urbana de México.

El marketplace es el canal de distribución. El IE es el producto.
Los datos temporales acumulados son el moat.

ACABAMOS DE COMPLETAR LA ETAPA 0:
- Auditoría profunda de BD (110 tablas, 64 funciones, 36 triggers, ~207 RLS, ~150 FKs)
- Auditoría de código (454 archivos, 58,166 LOC, 77 pages, 51 API routes, 15 tRPC routers)
- Arquitectura v5 diseñada con mapa E2E de 10 módulos Dopamine → backend
- Biblia v5 generada (20 sesiones + 245 upgrades documentados)
- Sistema de permisos (3 tablas + resolve_features) ya migrado a Supabase
- Auditoría de seguridad: 23 hallazgos (4 críticos, 6 altos, 13 medios)

CONTEXTO CRÍTICO:
- Las 77 pages actuales del frontend SE REEMPLAZAN con el diseño Dopamine (10 módulos)
- El backend existente (tablas, funciones, triggers, tRPC, IE, cascadas) SE PRESERVA
- El frontend Dopamine es INTOCABLE — no se le quita nada, solo se le agrega
- Si el frontend necesita algo del backend que no existe → se CREA
- Si hay conflicto entre frontend y BD → STATUS_MAP traduce, NO se cambia la BD
- Antes de cambios estructurales → PEDIR AUTORIZACIÓN a Manu
- SEGURIDAD PRIMERO — 4 vulnerabilidades críticas deben cerrarse antes de tocar frontend

Repo:       git@github.com:manuia88/desarrollosmx-v8final.git
Branch:     main
Supabase:   kcxnjdzichxixukfnenm
Ubicación:  /Users/manuelacosta/Desktop/desarrollosmx-v8final
Stack:      Next.js 16, TypeScript strict, Tailwind v4, tRPC 11, Supabase, Mapbox GL JS

REGLAS:
1. Verificar repo primero: pwd + git remote -v + git log --oneline -5 + git status
2. Verificar columnas reales con information_schema antes de escribir SQL
3. UNA instrucción a la vez. NO dar 2 si la segunda depende de la primera
4. Si algo no coincide → PARAR y diagnosticar
5. SQL en Supabase SQL Editor directo. Passwords solo en terminal directa
6. Frontend Dopamine JSX es FINAL — no remover, solo agregar
7. BD real SIEMPRE gana sobre documentación
8. Backups: git tag antes de cada sprint
9. Archivos protegidos: middleware.ts, lib/supabase/*.ts
10. Build limpio obligatorio antes de commit

DOCUMENTOS SUBIDOS (5):
1. BIBLIA_DMX_v5.md — Documento maestro (20 sesiones, 245 upgrades, IE, visión, portales)
2. BIBLIA_DMX_v5_PARTE_12_CONEXIONES_E2E.md — Mapa E2E cada botón Dopamine → backend → tabla → gaps
3. ETAPA_0_PARTE_1_AUDITORIAS_FLUJOS.md — Auditoría real BD + código + 8 flujos de datos
4. ETAPA_0_PARTE_2_ARQUITECTURA_v5.md — Arquitectura v5 + permisos + 10 módulos + sprints
5. AUDITORIA_SEGURIDAD_v2_COMPLETA.md — 23 hallazgos de seguridad con fixes propuestos

SPRINT v5-S0 — FUNDACIÓN (orden actualizado):

BLOQUE 1 — SEGURIDAD CRÍTICA (primero, sin esto no se avanza):
  □ SEC-02: Trigger prevent_role_escalation (un asesor puede hacerse superadmin HOY)
  □ SEC-01: Fix profiles_select_public_slug (expone email/phone/RFC de todos)
  □ SEC-03: Fix desarrolladoras_select_public (expone RFC+contacto de todas)
  □ SEC-04: Auth validation en 8 funciones SECURITY DEFINER (ver datos de cualquier usuario)

BLOQUE 2 — SEGURIDAD ALTA:
  □ SEC-06: Restringir profile-avatars bucket (sin límite de size ni mime type)
  □ SEC-07: Restringir storage INSERT por rol (cualquiera sube a invoices/dossier)
  □ SEC-05: VIEW pública projects sin broker_* (compradores ven comisiones)
  □ SEC-14: Quitar DELETE en 5 tablas históricas (asesor puede borrar su historial)
  □ SEC-15: WITH CHECK en score_subscriptions para premium
  □ SEC-16: Validar autorización en landing_pages INSERT
  □ SEC-22: Deduplicar project_views (1 por user/día)
  □ SEC-23: Restringir avance_obra_log a autorizados
  □ SEC-09: Restringir qr_codes read a owner
  □ SEC-20: Rate limit en demand_queries INSERT

BLOQUE 3 — FUNDACIÓN:
  ✅ Tarea 1: 3 tablas permisos creadas (feature_registry, role_features, profile_feature_overrides)
  □ Tarea 2: ALTER dmx_indices CHECK (+DMX-MOM, DMX-LIV)
  □ Tarea 3: ALTER tareas.type CHECK (ampliar valores)
  □ Tarea 4: DROP operaciones.lado (columna duplicada de side)
  □ Tarea 5: Seed ~120 feature_registry rows
  □ Tarea 6: Seed role_features defaults
  □ Tarea 7: Crear lib/constants/status-maps.ts
  □ Tarea 8: Crear lib/constants/feature-keys.ts
  □ Tarea 9: Normalizar env vars
  □ Tarea 10: tRPC permisos router

Primero lee TODOS los documentos. Luego empezamos con SEC-02 (la más urgente).
