# BIBLIA DMX v5 — BACKEND COMPLETO
## PART 1 de 3: Modelo de Datos + Seguridad + Multi-Tenancy
## Contenido ÍNTEGRO de BACKEND_DMX_v4_PART1 + Datos Reales Verificados
## Fase: Sprint v5-S0 (Seguridad + BD)
---
# BIBLIA BACKEND — DesarrollosMX v4
## BD · Seguridad · Modelo de Datos
## PART 1 de 3 (Módulos 1–2)
## Fecha: 8 abril 2026
## Supabase: `kcxnjdzichxixukfnenm`
## Repo: `git@github.com:manuia88/desarrollosmx-v8final.git` branch main
## Stack: Next.js 16, TypeScript strict, Tailwind v4, tRPC 11, Supabase, Mapbox GL JS
## Escala objetivo: 1,500 desarrollos en todo México en 3 meses

---

# ÍNDICE GENERAL (3 ARCHIVOS)

```
PART 1 (este archivo):
  MÓDULO 1: Decisiones Arquitectónicas + Multi-Tenancy + Seguridad
  MÓDULO 2: Modelo de Datos — 105+ Tablas (99 existentes + 6+ nuevas v4)

PART 2 (BIBLIA_BACKEND_DMX_v4_PART2.md):
  MÓDULO 3: Helper Functions (~25) + Triggers (~10) + RLS (~160 policies)
  MÓDULO 4: tRPC Routers (13 → 15 con procedures detallados)
  MÓDULO 5: API Routes (14 funcionales + nuevas) + Crons (23+ con vercel.json)

PART 3 (BIBLIA_BACKEND_DMX_v4_PART3.md):
  MÓDULO 6: Stripe + Webhooks + Storage + Notificaciones + Soft Delete + Cross-Portal Flows
  MÓDULO 7: Sprints R0-R10 actualizados v4 + Bugs a corregir + CLAUDE.md
```

---

# MÓDULO 1: DECISIONES ARQUITECTÓNICAS + MULTI-TENANCY + SEGURIDAD

## 1.1 Decisiones conservadas de v3

Las siguientes decisiones arquitectónicas están **implementadas y validadas** en el repo actual. NO se cambian.

```
✅ tRPC como capa de API type-safe — 11 routers configurados, 5 funcionales
   /server/trpc/ con context.ts, init.ts, middleware.ts, router.ts
   Dependencias: @trpc/server, @trpc/client, @trpc/react-query, superjson

✅ IE como módulo aislado — /lib/intelligence-engine/
   Boundaries claros, API routes y crons NUNCA contienen lógica de cálculo
   registry.ts (97 scores), runner.ts, cascade.ts, types.ts, index.ts

✅ Multi-ciudad: city_id en 4 tablas IE
   market_prices_secondary, str_market_data, search_trends, office_market_data
   10 supported_cities seed, 16 zones (alcaldías CDMX)

✅ Materialización de visible_asesores_cache
   refresh_visible_cache() + get_visible_asesor_ids_for()
   Cron cada 5 min + invalidación por evento

✅ Batch recalculation para cascadas masivas
   score_recalculation_queue con batch_mode + batch_filter
   Priority 1-10 system

✅ Supabase client pattern: browser (anon), server (cookie), admin (service_role)
   lib/supabase/client.ts, server.ts, admin.ts

✅ Middleware auth + role routing
   middleware.ts: /asesores, /desarrolladores, /admin protegidos con role redirect

✅ CSP headers: Supabase, Mapbox, PostHog, Anthropic, OpenAI, Google, Stripe
```

## 1.2 Bugs a corregir INMEDIATAMENTE (de auditoría)

```
BUG 1: rateLimit() es NO-OP
  Archivo: lib/utils/rateLimit.ts:9-11
  Problema: Siempre retorna { ok: true }. /api/advisor-ai (2 Claude API calls) sin rate limiting.
  Fix: Implementar rate limiting real contra tabla api_rate_limits
  Prioridad: CRÍTICA — cualquiera puede spammear la API de Claude

BUG 2: B02 column mismatch
  Archivo: lib/intelligence-engine/calculators/register-all.ts:82
  Problema: Usa precio_total, superficie_m2 pero columnas reales son precio, m2_totales
  Fix: Cambiar a precio, m2_totales
  Prioridad: ALTA — B02 siempre retorna avgPriceM2 = 0

BUG 3: payment_breakdowns tabla inexistente
  Archivo: server/trpc/routers/documentIntel.ts (procedure approve)
  Problema: INSERT en payment_breakdowns pero tabla real es unidad_esquema_desglose
  Fix: Cambiar referencia a unidad_esquema_desglose
  Prioridad: MEDIA — breakdowns nunca se crean al aprobar extracción
```

## 1.3 Seguridad — Fixes adicionales identificados en auditoría

```
FIX 1: updateProjectDetails acepta z.any()
  Archivo: server/trpc/routers/developer.ts
  Problema: z.record(z.string(), z.any()) permite actualizar cualquier campo
  Fix: Reemplazar con schema Zod explícito de campos permitidos

FIX 2: CSP unsafe-eval y unsafe-inline
  Archivo: next.config.ts
  Problema: script-src incluye 'unsafe-eval' y 'unsafe-inline'
  Fix: Eliminar unsafe-eval (no necesario). Mantener unsafe-inline solo para
       style-src (requerido por algunas libs). Usar nonce para scripts.

FIX 3: Variables de entorno no documentadas
  Problema: BANXICO_TOKEN, INEGI_TOKEN, GOOGLE_API_KEY, CRON_SECRET usados pero
            no en .env.example
  Fix: Crear .env.example completo con TODOS los tokens necesarios

FIX 4: SUPERADMIN_EMAILS no usado en código visible
  Problema: Variable existe en .env.local pero no se referencia en middleware ni auth
  Fix: Verificar si se usa en Supabase functions o documentar uso
```

## 1.4 Multi-Tenancy — Los 3 tipos de asesor (conservado de v3)

```
TIPO 1: Asesor Independiente
  - Se registra solo, no pertenece a nadie
  - Ve catálogo público, solicita autorización al desarrollador para detalles
  - profiles.employer_type = 'independent'
  - Contactos, búsquedas, operaciones, métricas: 100% privados

TIPO 2: Asesor Inhouse de Desarrollador
  - Desarrollador lo registra directamente
  - Acceso automático a TODOS los proyectos del desarrollador
  - profiles.employer_type = 'developer', employer_id = dev_profile_id
  - Exclusividad enforced: no puede registrarse por fuera
  - Contactos/métricas visibles para el desarrollador

TIPO 3: Asesor Inhouse de Master Broker
  - MB lo registra
  - Ve proyectos que el MB tiene autorizados
  - profiles.employer_type = 'master_broker', employer_id = mb_profile_id
  - Misma exclusividad
  - Contactos/métricas visibles para el MB

Anti-duplicado:
  1. Normalizar teléfono (strip +52, espacios, guiones → 10 dígitos)
  2. Normalizar email (lowercase, trim)
  3. Buscar en profiles WHERE rol='asesor' AND is_active=true
  4. Si match: RECHAZAR con mensaje contextual
  5. Si NO match: permitir registro
```

## 1.5 Token Management (conservado de v3)

```
Secret                          Dónde vive      Acceso                    Nunca en cliente
─────────────────────────────────────────────────────────────────────────────────────────
SUPABASE_SERVICE_ROLE_KEY       .env.local       Solo API routes           ❌ JAMÁS
OPENAI_API_KEY                  .env.local       Solo /api/ai/*            ❌ JAMÁS
ANTHROPIC_API_KEY (CLAUDE_API_KEY) .env.local    Solo /api/dossier, /api/document-intelligence/*  ❌ JAMÁS
GOOGLE_DRIVE_SERVICE_ACCOUNT    .env.local       Solo /api/drive-sync/*    ❌ JAMÁS
STRIPE_SECRET_KEY               .env.local       Solo /api/payments/*      ❌ JAMÁS
STRIPE_WEBHOOK_SECRET           .env.local       Solo /api/payments/webhook ❌ JAMÁS
BANXICO_TOKEN                   .env.local       Solo ingest/banxico.ts    ❌ JAMÁS
INEGI_TOKEN                     .env.local       Solo ingest/inegi.ts + denue.ts  ❌ JAMÁS
CRON_SECRET                     .env.local       Solo /api/cron/*          ❌ JAMÁS
MAPBOX_ACCESS_TOKEN             .env.local       NEXT_PUBLIC_ (dominio restringido) OK
POSTHOG_KEY                     .env.local       NEXT_PUBLIC_              OK
SUPABASE_ANON_KEY               .env.local       NEXT_PUBLIC_ (RLS protege) OK
STRIPE_PUBLISHABLE_KEY          .env.local       NEXT_PUBLIC_              OK
```

## 1.6 Patrón obligatorio para TODA API route (conservado de v3)

```typescript
export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // 2. Perfil + rol + estado
  const { data: profile } = await supabase
    .from('profiles').select('id, rol, employer_type, employer_id, is_active')
    .eq('id', user.id).single();
  if (!profile?.is_active) return NextResponse.json({ error: 'Cuenta inactiva' }, { status: 403 });

  // 3. Zod validation
  const validation = schema.safeParse(await request.json());
  if (!validation.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  // 4. Rate limiting REAL (FIX BUG 1 — ya no es NO-OP)
  const rateLimitOk = await checkRateLimit(user.id, 'endpoint_name');
  if (!rateLimitOk) return NextResponse.json({ error: 'Límite excedido' }, { status: 429 });

  // 5. Permisos específicos del endpoint
  // 6. Lógica de negocio
  // 7. Audit log si es operación sensible
}
```

---

# MÓDULO 2: MODELO DE DATOS — 105+ TABLAS

## 2.1 Inventario completo de tablas

### Tablas existentes (99) — CONSERVAR TODAS

```
# | Categoría                | Cant | Tablas
──┼──────────────────────────┼──────┼──────────────────────────────────────
1 | Originales (Fases 0-2)   | 27   | profiles, projects, unidades, prototipos, esquemas_pago,
  |                          |      | precios_unidad, fotos, desarrolladoras, leads (DEPRECATED),
  |                          |      | client_folders, client_folder_projects, comisiones,
  |                          |      | asesor_outcomes, wishlist, visitas, whatsapp_templates,
  |                          |      | market_alerts, search_logs, events, project_views,
  |                          |      | demand_queries, unmet_demand, admin_actions,
  |                          |      | developer_scores, marketplace_daily_stats,
  |                          |      | zona_snapshots, price_change_log
2 | CRM (Fase 4)             | 14   | contactos, busquedas, busqueda_propiedades, tareas,
  |                          |      | operaciones, commission_payments, visitas_programadas,
  |                          |      | calendario_eventos, metricas_kpi, sla_config,
  |                          |      | notificaciones, notificaciones_config,
  |                          |      | asesor_status, actividad_timeline
3 | Intelligence existente   | 5    | external_data, zone_price_index, market_pulse,
  |                          |      | ai_insights, project_competitors
4 | SPE/DISC                 | 3    | disc_profiles, ai_coaching_log, automation_rules
5 | Historial                | 2    | avance_obra, historial_precios
6 | Document Intelligence    | 4    | document_jobs, drive_monitors, inventory_snapshots,
  |                          |      | unit_change_log
7 | Canal Distribución       | 2    | project_brokers, busqueda_proyectos
8 | Trust/Feedback           | 2    | developer_reviews, interaction_feedback
9 | Legal/Documental         | 2    | operation_documents, operation_timeline
10| Pagos/Apartados          | 2    | apartados, payment_plans
11| Marketing/QR             | 2    | project_landing_pages, qr_codes
12| Conversaciones           | 2    | conversations, conversation_messages
13| AI Management            | 3    | ai_prompt_versions, ai_usage_tracking, ai_corrections
14| Negocio/Billing          | 2    | plans, subscriptions
15| Geografía                | 2    | supported_cities, zones
16| Platform                 | 1    | platform_metrics
17| Webhooks                 | 2    | webhooks, webhook_logs
18| Audit                    | 1    | user_audit_log
19| Cache                    | 1    | visible_asesores_cache
20| IE: Fuentes externas     | 6    | macro_series, geo_data_points, market_prices_secondary,
  |                          |      | str_market_data, search_trends, office_market_data
21| IE: Scores calculados    | 3    | zone_scores, project_scores, user_scores
22| IE: Contenido AI         | 1    | ai_generated_content
23| IE: Índices              | 1    | dmx_indices
24| IE: Anomalías            | 1    | market_anomalies
25| Score Infrastructure     | 3    | score_recalculation_queue, score_history,
  |                          |      | score_subscriptions
26| Workflow                 | 1    | workflow_executions
27| Rate Limiting            | 1    | api_rate_limits
──┼──────────────────────────┼──────┼
   SUBTOTAL                  | 99   |
```

### Tablas NUEVAS v4

```
# | Categoría              | Cant | Tabla
──┼────────────────────────┼──────┼──────────────────────────────
28| IE: Snapshots           | 1    | geo_snapshots
29| API Externa             | 2    | api_keys, api_request_logs
30| Gamification            | 1    | asesor_gamification
31| CRM: Captaciones        | 1    | captaciones
32| CRM: Props Secundarias  | 2    | propiedades_secundarias, propiedades_secundarias_fotos
33| CRM: Valuaciones        | 1    | acm_valuaciones
──┼────────────────────────┼──────┼
   SUBTOTAL NUEVAS          | 8    |
   TOTAL v4                 | 107  |
```

## 2.2 CREATE de tablas nuevas v4

### geo_snapshots — Control de snapshots temporales del IE

```sql
-- Registra cada snapshot de datos geo para tracking temporal
-- Escritor: cada ingestor geo al completar una carga
-- Lector: snapshot-manager.ts, delta-calculator.ts, scores temporales (N03, N04, N11)
CREATE TABLE geo_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,                    -- 'denue' | 'fgj' | 'sacmex' | '0311' | 'siged' | 'dgis'
  city_id text REFERENCES supported_cities(id) DEFAULT 'cdmx',
  period_date date NOT NULL,               -- fecha del snapshot
  record_count integer NOT NULL DEFAULT 0, -- cuántos registros en este snapshot
  zones_affected uuid[] DEFAULT '{}',      -- zone_ids con datos en este snapshot
  metadata jsonb DEFAULT '{}',             -- stats: { nuevos, cerrados, cambiados, etc. }
  status text DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  error_message text,
  duration_ms integer,                     -- tiempo de ejecución del ingestor
  created_at timestamptz DEFAULT now(),
  UNIQUE(source, city_id, period_date)
);

CREATE INDEX idx_geo_snapshots_source ON geo_snapshots(source, period_date DESC);
CREATE INDEX idx_geo_snapshots_city ON geo_snapshots(city_id, source, period_date DESC);
```

### api_keys — Keys para API externa DMX

```sql
-- Autenticación de clientes de la API externa (B2B)
-- Escritor: admin al crear/revocar keys
-- Lector: middleware validateApiKey() en /api/v1/*
CREATE TABLE api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),        -- usuario/empresa dueño del key
  name text NOT NULL,                           -- "Portal Inmuebles24", "Fondo ABC"
  key_hash text NOT NULL UNIQUE,                -- SHA256 del API key (nunca almacenar key en plano)
  key_prefix text NOT NULL,                     -- primeros 8 chars para identificación "dmx_live_a1b2..."
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  permissions text[] DEFAULT '{}',              -- ['livability', 'momentum', 'risk', 'estimate']
  rate_limit_day integer NOT NULL DEFAULT 100,  -- queries/día según plan
  rate_limit_month integer NOT NULL DEFAULT 3000,
  requests_today integer DEFAULT 0,
  requests_month integer DEFAULT 0,
  requests_total bigint DEFAULT 0,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,                       -- null = no expira
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

### api_request_logs — Logging de requests API externa

```sql
-- Cada request a /api/v1/* se loggea aquí
-- Escritor: middleware logApiRequest() en /api/v1/*
-- Lector: admin dashboard API metrics
CREATE TABLE api_request_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id),
  endpoint text NOT NULL,                       -- '/v1/scores/livability'
  method text NOT NULL DEFAULT 'GET',
  params jsonb DEFAULT '{}',                    -- lat, lon, etc. (sin PII)
  response_status integer NOT NULL,
  response_time_ms integer,
  error_message text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Particionar por mes para performance (si Supabase soporta)
CREATE INDEX idx_api_logs_key ON api_request_logs(api_key_id, created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON api_request_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_logs_date ON api_request_logs(created_at DESC);
```

### asesor_gamification — Sistema de gamification del asesor

```sql
-- XP, streaks, badges, ranking del asesor
-- Escritor: triggers/crons que detectan acciones del asesor
-- Lector: GamificationWidget en dashboard asesor, leaderboard
CREATE TABLE asesor_gamification (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  xp_total integer DEFAULT 0,
  xp_this_month integer DEFAULT 0,
  level integer DEFAULT 1,                      -- 1-50, basado en XP total
  current_streak integer DEFAULT 0,             -- días consecutivos de actividad
  longest_streak integer DEFAULT 0,
  badges jsonb DEFAULT '[]',                    -- [{ id, name, earned_at, zone? }]
  monthly_rank integer,                         -- ranking entre asesores del mismo equipo/zona
  last_activity_at timestamptz,
  streak_frozen_until timestamptz,              -- para "freeze" de streak (premium feature)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- XP table (cuánto vale cada acción)
-- No es tabla de BD — es constante en código:
-- contacto_creado: 10, busqueda_creada: 15, visita_agendada: 20, visita_realizada: 25,
-- feedback_registrado: 15, operacion_creada: 50, operacion_cerrada: 500,
-- respuesta_lead_15min: 30, respuesta_lead_60min: 15, dossier_generado: 10
```

### captaciones — Pipeline de captación de propiedades secundarias

```sql
-- Inspirado en Pulppo Módulo 05 Captaciones, tropicalizado para DMX
-- Pipeline: pendiente → seguimiento → encuentro → valuacion → documentacion → captado
-- Escritor: asesor desde portal CRM
-- Lector: asesor (propias), MB (equipo), admin (todas)
CREATE TABLE captaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asesor_id uuid NOT NULL REFERENCES profiles(id),
  contacto_id uuid REFERENCES contactos(id),            -- propietario
  propiedad_id uuid REFERENCES propiedades_secundarias(id), -- se crea al avanzar
  
  -- Pipeline status
  etapa text NOT NULL DEFAULT 'pendiente'
    CHECK (etapa IN ('pendiente', 'seguimiento', 'encuentro', 'valuacion', 'documentacion', 'captado', 'perdida')),
  
  -- Datos iniciales (captura rápida móvil)
  direccion_aproximada text,
  tipo_propiedad text CHECK (tipo_propiedad IN (
    'departamento', 'casa', 'casa_condominio', 'terreno', 'ph', 'oficina',
    'local', 'bodega', 'edificio', 'otro'
  )),
  tipo_operacion text CHECK (tipo_operacion IN ('venta', 'renta', 'ambas')),
  precio_propietario numeric(14,2),              -- lo que el propietario pide
  precio_sugerido numeric(14,2),                 -- ACM/valuación del IE
  urgencia text CHECK (urgencia IN ('alta', 'media', 'baja')),
  motivo_venta text,
  exclusiva boolean DEFAULT false,
  
  -- Seguimiento
  notas text,
  motivo_perdida text CHECK (motivo_perdida IN (
    'precio', 'exclusiva_rechazada', 'competidor', 'timing', 'desistio', 'otro'
  )),
  
  -- Encuentros (reuniones con propietario)
  encuentros_count integer DEFAULT 0,
  ultimo_encuentro_at timestamptz,
  
  -- Fechas
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  
  -- Relación con equipo
  employer_id uuid                               -- para visibilidad MB/dev
);

CREATE INDEX idx_captaciones_asesor ON captaciones(asesor_id, etapa);
CREATE INDEX idx_captaciones_contacto ON captaciones(contacto_id);
CREATE INDEX idx_captaciones_etapa ON captaciones(etapa, created_at DESC);
```

### propiedades_secundarias — Inventario de propiedades usadas del asesor

```sql
-- Propiedades del mercado secundario (usadas) que el asesor capta y comercializa
-- Inspirado en Pulppo Propiedades, tropicalizado para DMX
-- Estas propiedades SON fuente de datos para el IE (market_prices_secondary calibrado)
CREATE TABLE propiedades_secundarias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asesor_id uuid NOT NULL REFERENCES profiles(id),
  captacion_id uuid REFERENCES captaciones(id),
  contacto_propietario_id uuid REFERENCES contactos(id),
  
  -- Ubicación
  direccion text NOT NULL,
  colonia text,
  alcaldia text,
  cp text,
  city_id text REFERENCES supported_cities(id) DEFAULT 'cdmx',
  zone_id uuid REFERENCES zones(id),
  latitude numeric(10,7),
  longitude numeric(10,7),
  
  -- Características
  tipo_propiedad text NOT NULL CHECK (tipo_propiedad IN (
    'departamento', 'casa', 'casa_condominio', 'terreno', 'ph', 'oficina',
    'local', 'bodega', 'edificio', 'otro'
  )),
  operacion text NOT NULL CHECK (operacion IN ('venta', 'renta', 'ambas')),
  recamaras integer,
  banos integer,
  medio_banos integer,
  estacionamientos integer,
  m2_terreno numeric(10,2),
  m2_construccion numeric(10,2),
  m2_total numeric(10,2),
  antiguedad_anos integer,
  piso integer,
  pisos_totales integer,
  orientacion text,
  amenidades text[] DEFAULT '{}',
  
  -- Precio
  precio_venta numeric(14,2),
  precio_renta numeric(12,2),
  moneda text DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  precio_m2 numeric(10,2),                     -- calculado: precio / m2_total
  
  -- Valuación IE
  precio_sugerido_ie numeric(14,2),            -- ACM basado en IE (A12-like)
  valuacion_status text DEFAULT 'sin_valuacion'
    CHECK (valuacion_status IN ('precio_optimo', 'poco_competitivo', 'fuera_mercado', 'sin_valuacion')),
  acm_id uuid REFERENCES acm_valuaciones(id),
  
  -- Estado
  estado text NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'activo', 'pausado', 'vendido', 'rentado', 'cancelado')),
  calidad text DEFAULT 'baja'
    CHECK (calidad IN ('alta', 'media', 'baja', 'sin_publicar')),
  
  -- Documentación (estado de captación completa)
  documentacion_status text DEFAULT 'sin_documentacion'
    CHECK (documentacion_status IN ('sin_documentacion', 'pendiente', 'revision',
                                     'aprobados', 'rechazados', 'contrato_enviado', 'contrato_firmado')),
  exclusiva boolean DEFAULT false,
  exclusiva_inicio date,
  exclusiva_fin date,
  
  -- Publicación en portales
  publicado_portales text[] DEFAULT '{}',       -- ['inmuebles24', 'vivanuncios', 'lamudi']
  
  -- Métricas
  views_count integer DEFAULT 0,
  leads_count integer DEFAULT 0,
  days_on_market integer DEFAULT 0,
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Relación con equipo
  employer_id uuid
);

CREATE INDEX idx_props_sec_asesor ON propiedades_secundarias(asesor_id, estado);
CREATE INDEX idx_props_sec_zona ON propiedades_secundarias(zone_id, operacion, estado);
CREATE INDEX idx_props_sec_tipo ON propiedades_secundarias(tipo_propiedad, operacion, city_id);
CREATE INDEX idx_props_sec_precio ON propiedades_secundarias(precio_venta, estado)
  WHERE estado = 'activo';

-- IMPORTANTE: Las propiedades secundarias activas con precio y zona son fuente de datos
-- para market_prices_secondary. Un cron agrega precios de propiedades_secundarias
-- a market_prices_secondary como source='dmx_captaciones' — esto calibra los modelos.
```

### propiedades_secundarias_fotos — Fotos de propiedades secundarias

```sql
CREATE TABLE propiedades_secundarias_fotos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  propiedad_id uuid NOT NULL REFERENCES propiedades_secundarias(id) ON DELETE CASCADE,
  url text NOT NULL,
  url_thumb text,
  url_lqip text,                               -- Low Quality Image Placeholder (base64)
  clasificacion text CHECK (clasificacion IN (
    'fachada', 'sala', 'cocina', 'recamara', 'bano', 'terraza',
    'estacionamiento', 'amenidad', 'vista', 'plano', 'otro'
  )),
  ai_classification_confidence numeric(3,2),
  sort_order integer DEFAULT 0,
  is_cover boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_props_sec_fotos ON propiedades_secundarias_fotos(propiedad_id, sort_order);
```

### acm_valuaciones — Análisis Comparativo de Mercado

```sql
-- ACM generado por el IE para valuación de propiedades secundarias
-- Inspirado en Pulppo ACM automático pero potenciado con datos del IE
-- Escritor: calculador ACM cuando asesor pide valuación
-- Lector: asesor en ficha de captación/propiedad
CREATE TABLE acm_valuaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  propiedad_id uuid REFERENCES propiedades_secundarias(id),
  captacion_id uuid REFERENCES captaciones(id),
  asesor_id uuid REFERENCES profiles(id),
  
  -- Inputs
  tipo_propiedad text NOT NULL,
  operacion text NOT NULL,                      -- 'venta' | 'renta'
  m2 numeric(10,2) NOT NULL,
  colonia text NOT NULL,
  alcaldia text NOT NULL,
  zone_id uuid REFERENCES zones(id),
  
  -- Resultados
  precio_sugerido numeric(14,2) NOT NULL,
  precio_m2_sugerido numeric(10,2) NOT NULL,
  rango_min numeric(14,2),
  rango_max numeric(14,2),
  confidence numeric(3,2),                      -- 0-1
  
  -- Comparables usados
  comparables jsonb NOT NULL DEFAULT '[]',
  -- [{ source, address, precio, m2, precio_m2, distance_km, similarity_pct, date }]
  
  -- Ajustes aplicados
  ajustes jsonb DEFAULT '{}',
  -- { piso: "+3%", antiguedad: "-5%", amenidades: "+2%", zona_momentum: "+4%" }
  
  -- Fuentes de datos
  sources_used text[] DEFAULT '{}',             -- ['market_prices_secondary', 'zone_scores', 'denue']
  comparables_count integer DEFAULT 0,
  
  -- IE integration
  zone_scores_snapshot jsonb,                   -- snapshot de scores de zona al momento del ACM
  momentum_score numeric(5,2),                  -- N11 al momento
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_acm_propiedad ON acm_valuaciones(propiedad_id, created_at DESC);
CREATE INDEX idx_acm_zona ON acm_valuaciones(zone_id, created_at DESC);
```

## 2.3 ALTER TABLEs sobre tablas existentes (conservados de v3 + nuevos v4)

### ALTERs conservados de v3 (ya aplicados o pendientes de R0)

```sql
-- PROFILES: Multi-tenancy + billing + fiscal (v3)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer_type text CHECK (employer_type IN ('independent','developer','master_broker'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer_id uuid;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer_released_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_normalized text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_locked boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rfc text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razon_social text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS regimen_fiscal text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Mexico_City';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- CONTACTOS: Tags + fuente + poder compra (v3)
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS fuente text;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS poder_compra_verificado boolean DEFAULT false;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS presupuesto_max numeric(14,2);
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS source_landing_page_id uuid REFERENCES project_landing_pages(id);

-- BUSQUEDAS: Fuente + pérdida + criterios (v3)
ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS fuente text;
ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS motivo_perdida text;
ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS tipo_propiedad_buscada text[];
ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS presupuesto_min numeric(14,2);
ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS presupuesto_max numeric(14,2);

-- TAREAS: Categoría (v3)
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS categoria text CHECK (categoria IN ('proyecto','cliente','lead'));

-- OPERACIONES: 3 precios + cobro + facturación (v3)
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS precio_avaluo numeric(14,2);
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS comision_cobrada numeric(12,2);
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS estado_cobro text DEFAULT 'pendiente' CHECK (estado_cobro IN ('pendiente','parcial','cobrada','vencida'));
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS factura_emitida boolean DEFAULT false;
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS factura_numero text;
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS factura_pdf_url text;

-- PROJECTS: Document Intelligence + Drive (v3)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_folder_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_folder_id text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drive_sync_enabled boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS extraction_confidence numeric(3,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fields_auto_filled integer DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fields_manual_filled integer DEFAULT 0;

-- UNIDADES: Tracking + concurrencia (v3)
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS last_price_change_at timestamptz;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS price_change_count integer DEFAULT 0;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS days_on_market integer DEFAULT 0;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now();
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS orientacion text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS vista text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS posicion_planta text;

-- DESARROLLADORAS: Trust Score (v3)
ALTER TABLE desarrolladoras ADD COLUMN IF NOT EXISTS trust_score numeric(4,1);
ALTER TABLE desarrolladoras ADD COLUMN IF NOT EXISTS profeco_quejas integer DEFAULT 0;
ALTER TABLE desarrolladoras ADD COLUMN IF NOT EXISTS entregas_a_tiempo integer DEFAULT 0;
ALTER TABLE desarrolladoras ADD COLUMN IF NOT EXISTS entregas_totales integer DEFAULT 0;
ALTER TABLE desarrolladoras ADD COLUMN IF NOT EXISTS tiempo_respuesta_avg_hrs numeric(6,1);

-- VISITAS_PROGRAMADAS: Feedback (v3)
ALTER TABLE visitas_programadas ADD COLUMN IF NOT EXISTS feedback_interest text CHECK (feedback_interest IN ('hot','warm','cold','lost'));
ALTER TABLE visitas_programadas ADD COLUMN IF NOT EXISTS feedback_objection text;
ALTER TABLE visitas_programadas ADD COLUMN IF NOT EXISTS feedback_notes text;
ALTER TABLE visitas_programadas ADD COLUMN IF NOT EXISTS feedback_at timestamptz;

-- AUTOMATION_RULES: Workflows (v3)
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS workflow_template text;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS workflow_steps jsonb;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- METRICAS_KPI: Activity score (v3)
ALTER TABLE metricas_kpi ADD COLUMN IF NOT EXISTS activity_score integer DEFAULT 0;
ALTER TABLE metricas_kpi ADD COLUMN IF NOT EXISTS activity_rank integer;
```

### ALTERs NUEVOS v4

```sql
-- PROFILES: Gamification + lifestyle preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifestyle_preference text
  CHECK (lifestyle_preference IN ('quiet', 'nightlife', 'family', 'fitness', 'remote_worker', 'investor'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS buyer_persona_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zona_operacion text[];   -- zonas donde opera el asesor

-- CONTACTOS: CRM enriquecido (inspirado Pulppo)
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS tipo_contacto text
  CHECK (tipo_contacto IN ('comprador', 'vendedor', 'propietario', 'inquilino', 'inversionista', 'broker_externo'));
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS ingreso_estimado numeric(12,2);
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS credito_otorgado boolean DEFAULT false;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS ultimo_contacto_at timestamptz;

-- BUSQUEDAS: Enriquecimiento
ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS lifestyle_preference text;
ALTER TABLE busquedas ADD COLUMN IF NOT EXISTS zonas_preferidas uuid[];   -- zone_ids

-- OPERACIONES: Co-broke y tipo de lado (inspirado Pulppo)
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS lado text DEFAULT 'ambos'
  CHECK (lado IN ('ambos', 'vendedor', 'comprador'));
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS asesor_productor_id uuid REFERENCES profiles(id);
ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS propiedad_secundaria_id uuid REFERENCES propiedades_secundarias(id);
-- NOTA: propiedad_secundaria_id es para operaciones de mercado secundario.
-- project_id + unidad_id es para operaciones de desarrollos nuevos.
-- Una operación tiene UNO de los dos: proyecto nuevo O propiedad secundaria.

-- GEO_DATA_POINTS: Mejorar para snapshots
ALTER TABLE geo_data_points ADD COLUMN IF NOT EXISTS snapshot_id uuid REFERENCES geo_snapshots(id);
```

## 2.4 Índices de performance (conservados v3 + nuevos v4)

```sql
-- Todos los índices de v3 se conservan (ver BIBLIA_BACKEND_v3 §3.4)
-- Nuevos índices v4:

-- Captaciones
CREATE INDEX idx_captaciones_employer ON captaciones(employer_id, etapa)
  WHERE employer_id IS NOT NULL;

-- Propiedades secundarias
CREATE INDEX idx_props_sec_latlon ON propiedades_secundarias(latitude, longitude)
  WHERE estado = 'activo';
CREATE INDEX idx_props_sec_employer ON propiedades_secundarias(employer_id, estado)
  WHERE employer_id IS NOT NULL;

-- ACM
CREATE INDEX idx_acm_asesor ON acm_valuaciones(asesor_id, created_at DESC);

-- Gamification
CREATE INDEX idx_gamification_rank ON asesor_gamification(xp_this_month DESC)
  WHERE xp_this_month > 0;

-- API
CREATE INDEX idx_api_logs_daily ON api_request_logs(api_key_id, created_at::date);

-- Contactos enriched
CREATE INDEX idx_contactos_tipo ON contactos(tipo_contacto, asesor_id)
  WHERE tipo_contacto IS NOT NULL;
CREATE INDEX idx_contactos_ultimo ON contactos(ultimo_contacto_at DESC)
  WHERE ultimo_contacto_at IS NOT NULL;

-- Geo snapshots para deltas
CREATE INDEX idx_geo_data_snapshot ON geo_data_points(snapshot_id)
  WHERE snapshot_id IS NOT NULL;
CREATE INDEX idx_geo_data_external ON geo_data_points(source, (data->>'external_id'))
  WHERE data->>'external_id' IS NOT NULL;
```

## 2.5 Script de migración de datos existentes (conservado v3 + nuevos v4)

```sql
-- Ejecutar DESPUÉS de ALTERs + CREATEs, ANTES de cualquier sprint
-- Conserva TODOS los scripts de v3 (§3.5) + agrega:

-- Profiles lifestyle default
UPDATE profiles SET lifestyle_preference = 'investor'
  WHERE rol = 'desarrollador' AND lifestyle_preference IS NULL;

-- Contactos tipo default
UPDATE contactos SET tipo_contacto = 'comprador'
  WHERE tipo_contacto IS NULL;

-- Operaciones lado default
UPDATE operaciones SET lado = 'ambos'
  WHERE lado IS NULL;

-- Gamification init para asesores existentes
INSERT INTO asesor_gamification (user_id, xp_total, level)
SELECT id, 0, 1 FROM profiles
WHERE rol IN ('asesor', 'master_broker') AND is_active = true
ON CONFLICT (user_id) DO NOTHING;

-- Zona operacion para asesores existentes (inferir de sus proyectos)
UPDATE profiles p SET zona_operacion = (
  SELECT ARRAY_AGG(DISTINCT z.id)
  FROM project_brokers pb
  JOIN projects pr ON pb.project_id = pr.id
  JOIN zones z ON pr.alcaldia = z.name
  WHERE pb.asesor_id = p.id AND pb.request_status = 'authorized'
)
WHERE rol = 'asesor' AND zona_operacion IS NULL;
```

## 2.6 Principio rector de datos

```
Cada línea de código responde SÍ a al menos una:
1. ¿Genera datos que otro módulo consume?
2. ¿Consume datos que otro módulo genera?
3. ¿Reduce fricción para que un usuario genere más datos?
4. ¿Hace que un usuario tome una mejor decisión?
5. ¿Mide algo que nos ayuda a mejorar la plataforma? (AARRR)

Si la respuesta es NO a las cinco → no se construye.

CONECTIVIDAD END-TO-END:
  Todo lo que se crea debe estar conectado.
  Antes de escribir código, pensar:
    ¿Quién produce este dato?
    ¿Quién lo consume?
    ¿En qué portales se muestra?
    ¿Qué acciones lo alimentan?
  Nunca crear algo aislado — todo fluye entre comprador↔asesor↔desarrollador↔plataforma.

PROPIEDADES SECUNDARIAS COMO FUENTE DE DATOS:
  Las propiedades captadas por asesores NO son solo inventario del CRM.
  Son FUENTE DE DATOS para el IE:
    - Precio/m² → alimenta market_prices_secondary (source='dmx_captaciones')
    - Tipo + zona → alimenta demand_queries y supply analysis
    - Tiempo en mercado → alimenta absorption models
    - Precio pedido vs precio cerrado → calibra A12 Price Fairness
  Cada propiedad que el asesor capta MEJORA el IE para todos.
  Este es el flywheel en acción.
```

---

# CROSS-REFERENCES

```
→ BIBLIA_IE_DMX_v4 PART 1: Arquitectura IE que vive en /lib/intelligence-engine/
→ BIBLIA_IE_DMX_v4 PART 4: Tabla geo_snapshots definida aquí, consumida por snapshot-manager.ts
→ BIBLIA_IE_DMX_v4 PART 5: Productos API que usan api_keys + api_request_logs
→ BIBLIA_BACKEND_DMX_v4 PART 2: Functions, triggers, RLS para TODAS estas tablas
→ BIBLIA_BACKEND_DMX_v4 PART 3: Integraciones que usan estas tablas
→ BIBLIA_FRONTEND_DMX_v4: Componentes que leen/escriben estas tablas
```

---

**FIN DE PART 1 — Continúa en BIBLIA_BACKEND_DMX_v4_PART2.md (Functions + tRPC + API + Crons)**

---
# ANEXO: VERIFICACIÓN REAL (Auditoría Supabase abril 2026)
```
BE1 dice ~105 tablas → REAL: 110 (107 + 3 permisos v5)
BE1 dice ~25 funciones → REAL: 64
BE1 dice ~10 triggers → REAL: 36
BE1 dice ~160 RLS → REAL: ~207

Tablas con datos (25/110): macro_series(104), unidades(47), actividad_timeline(24),
  historial_precios(16), zones(16), prototipos(16), avance_obra(13), projects(10),
  supported_cities(10), external_data(10), visitas_programadas(8), admin_actions(6),
  project_views(6), tareas(6), busqueda_proyectos(6), contactos(5), automation_rules(5),
  interaction_feedback(5), operaciones(4), ai_prompt_versions(4), notificaciones(4),
  plans(3), profiles(3), desarrolladoras(3), busquedas(3)

IE vacío (0 rows): geo_data_points, zone_scores, project_scores, user_scores, dmx_indices,
  geo_snapshots, score_history, score_recalculation_queue, market_anomalies, market_pulse

DISCREPANCIAS BD↔Frontend:
  DISC-01: operaciones.status español vs Dopamine inglés → STATUS_MAP
  DISC-02: tareas.type español vs Dopamine inglés → STATUS_MAP
  DISC-03: operaciones.lado duplicado de side → eliminar
  DISC-04: dmx_indices CHECK falta DMX-MOM, DMX-LIV → ALTER
  DISC-05: env vars inconsistentes → normalizar
  DISC-06: contactos.phones/emails = jsonb[], no text
  DISC-07: contactos = first_name+last_name, no "nombre"
  DISC-08: profiles.phone, no "telefono"

profiles (52 cols): id, first_name, last_name, email, phone, rol(CHECK 5), slug,
  avatar_url, bio, zona_principal, agencia, empresa, rfc, is_active, is_approved,
  estado(CHECK 3), desarrolladora_id, employer_type(CHECK 3), employer_id,
  employer_released_at, phone_normalized, registration_locked, razon_social,
  regimen_fiscal, storage_used_bytes, timezone, onboarding_completed, onboarding_step,
  broker_tipo(CHECK 2), email_dominio, inmobiliaria_nombre, inmobiliaria_rfc,
  certificaciones_broker(text[]), certificaciones_verificadas, certificaciones_verificadas_at,
  docs_verificacion_urls(text[]), docs_verificacion_status(CHECK 4),
  docs_verificacion_notas, docs_verificacion_revisado_por, lifestyle_preference(CHECK 6),
  buyer_persona_type, zona_operacion(text[]), meta_comision_mensual, microsite_slug,
  foto_url, especialidad(text[]), anos_experiencia, operaciones_cerradas, rating_promedio,
  certificaciones(text[]), redes_sociales(jsonb), created_at, updated_at

contactos (25 cols): id, agency_id, asesor_id(NOT NULL), first_name(NOT NULL), last_name,
  phones(jsonb[]), emails(jsonb[]), tipo(CHECK 6), tags(text[]), temperatura(CHECK 4),
  search_vector(tsvector GIN), fuente, notas, poder_compra_verificado, presupuesto_max,
  user_id, source_landing_page_id, direccion, ingreso_estimado, credito_otorgado,
  ultimo_contacto_at, created_at, updated_at

operaciones (34 cols): id, code(UNIQUE auto), side(CHECK 3), asesor_comprador_id,
  asesor_vendedor_id, contacto_comprador_id, project_id, unidad_id, status(CHECK 6 español),
  moneda(CHECK 2), valor_reserva, valor_promocion, valor_cierre, comision_pct, comision_total,
  comision_inmobiliaria, comision_plataforma, iva_amount, fecha_cierre_estimada,
  fecha_cierre_real, agency_id, notas, precio_avaluo, comision_cobrada,
  estado_cobro(CHECK 4), factura_emitida, factura_numero, factura_pdf_url,
  lado(DUPLICADO→eliminar), asesor_productor_id, propiedad_secundaria_id, busqueda_id,
  created_at, updated_at

Permisos v5 (ya creados): feature_registry + role_features + profile_feature_overrides
  + resolve_features() SECURITY DEFINER
```
