# BIBLIA DMX v5 — FRONTEND COMPLETO
## PART 1 de 2: Design System + Hooks + Componentes + Portal Asesor
## Contenido ÍNTEGRO de FRONTEND_DMX_v4_PART1
## Fase: Sprint v5-S1 a S5 (Frontend Dopamine)
---
# BIBLIA FRONTEND — DesarrollosMX v4
## UI · Componentes · Hooks · Portal Asesor (Pulppo tropicalizado + IE)
## PART 1 de 2 (Módulos 1–4)
## Fecha: 8 abril 2026
## Stack: Next.js 16, React 19, TypeScript strict, Tailwind v4, tRPC 11, @tanstack/react-query, Mapbox GL JS, Recharts, PostHog

---

# ÍNDICE GENERAL (2 ARCHIVOS)

```
PART 1 (este archivo):
  MÓDULO 1: Design System Tokens + Responsive
  MÓDULO 2: tRPC Client + 12 Hooks Core
  MÓDULO 3: Componentes Compartidos + Patrones UI
  MÓDULO 4: Portal Asesor Completo (Pulppo tropicalizado + IE overlay)

PART 2 (BIBLIA_FRONTEND_DMX_v4_PART2.md):
  MÓDULO 5: Portal Desarrollador + Admin + Comprador + Público
  MÓDULO 6: Features Transversales (Personalización, Discover Weekly, Gamification,
            Marketing auto, Conversaciones, Academia, Navegación)
```

---

# MÓDULO 1: DESIGN SYSTEM TOKENS + RESPONSIVE

## 1.1 Paleta de colores (conservada de v3)

```
Background:       #FAFAFC      Fondo principal light
Surface/Cards:    #FFFFFF      Tarjetas y superficies
Text primary:     #0F0F1A      Textos principales
Text secondary:   #9CA3AF      Textos secundarios
Text muted:       #6B7280      Textos deshabilitados/hint
Accent gradient:  #6366F1 → #EC4899   CTAs principales, hero, branding
Secondary accent: #8B5CF6      Acentos secundarios (purple)
Success/Precios:  #10B981      Positivo, precios, disponible
Info:             #0EA5E9      Informativo, links
Warning:          #F59E0B      Alertas, semáforo amarillo
Danger:           #EF4444      Error, urgente, vencido
Dark sections:    #0F0F1A      Footer, sidebars, secciones dark
Borders light:    #F3F4F6      Bordes cards default
Borders hover:    #E5E7EB      Bordes hover

NUEVOS v4 (gamification):
  XP gold:        #EAB308      Color XP y streaks
  Badge bronze:   #CD7F32      Badge nivel 1-10
  Badge silver:   #C0C0C0      Badge nivel 11-25
  Badge gold:     #FFD700      Badge nivel 26-50
  Momentum pos:   #22C55E      Momentum positivo
  Momentum neg:   #EF4444      Momentum negativo
  Momentum neu:   #6B7280      Momentum neutral
```

## 1.2 Tipografía (conservada de v3)

```
Font family: Plus Jakarta Sans (next/font, weights 300-800)
H1: 42px / 800 / -.04em       Hero, títulos de página
H2: 22-24px / 800             Secciones principales
H3: 18px / 700                Sub-secciones, card títulos
Body: 14-15px / 400           Texto general
Small: 12-13px / 400          Labels, metadata
Micro: 10-11px / 400          Badges, tags
```

## 1.3 Componentes base (conservados de v3)

```
Cards:         rounded-2xl (16px), hover translateY(-4px) + shadow, .35s
Buttons pill:  rounded-lg (8-10px), hover translateY(-1px)
Badges:        rounded-md (6px), backdrop-blur, semi-transparent
Category tabs: rounded-full (999px), scroll horizontal mobile
Search box:    rounded-xl (14px), focus border #6366F1
Absorption:    height 3px, animate growBar .8s en hover
Iconos:        Lucide React (SVG, no emojis)
```

## 1.4 Responsive Breakpoints (Tailwind v4 CSS-first)

```css
@theme {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

```
Componente      | Mobile (<768)          | Tablet (768-1024)     | Desktop (>1024)
────────────────┼────────────────────────┼───────────────────────┼─────────────────
Sidebar         | Hidden → bottom nav    | 60px iconos only      | 240px expandido
Cards grid      | 1 col, stack           | 2 cols                | 3-4 cols
KPI cards       | 2×2 compact            | 4×1 row               | 4×2 grid
Tablas          | Scroll horiz, pin col1 | Scroll si >6 cols     | Full visible
Mapbox          | 100vw full bleed       | Con sidebar            | Con sidebar+controls
Modals          | Full screen (sheet)    | Centered 600px        | Centered 600px
Pipeline Kanban | Scroll horiz 1 col     | 3 cols visible        | 6 cols visible
Forms           | Stack vertical 100%    | 2 cols donde aplica   | 2-3 cols
Charts Recharts | Simplified, 1 serie    | Full + tooltip        | Full + legend

Touch targets: mínimo 44×44px en mobile
Inputs: mínimo 16px font-size en iOS (evita zoom)
```

---

# MÓDULO 2: tRPC CLIENT + 12 HOOKS CORE

## 2.1 Setup tRPC (conservado de v3, implementado)

```typescript
// lib/trpc/client.ts
export const trpc = createTRPCReact<AppRouter>();

// lib/trpc/provider.tsx — wraps app layout
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 1000 * 60 * 30, staleTime: 1000 * 60 * 5 },
  },
});
const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })],
});

// lib/trpc/error-handler.ts — mensajes en español por código tRPC
UNAUTHORIZED → 'Tu sesión expiró. Inicia sesión de nuevo.'
FORBIDDEN → 'No tienes permiso para esta acción.'
TOO_MANY_REQUESTS → 'Límite alcanzado. Espera un momento o mejora tu plan.'
PRECONDITION_FAILED → 'Tu plan no permite esta acción. Actualiza tu suscripción.'
```

## 2.2 Regla: tRPC vs Supabase directo (conservada de v3)

```
tRPC:            Lógica de negocio, permisos, cálculos, AI, scores on-demand
Supabase client: CRUD simple propio protegido por RLS
Supabase Realtime: Suscripciones en tiempo real
Supabase Storage: File uploads
Supabase Auth:   Login, registro
```

## 2.3 Hooks existentes (10 implementados — conservar todos)

```
useProjectPhotos    (140 lines) — 6 sub-hooks: upload, classify, delete, reorder, setCover, stats
useDocumentJobs     (94 lines)  — 3 sub-hooks: list, upload, extract
useRealtimeAlerts   (81 lines)  — Supabase Realtime subscription
useDriveMonitor     (57 lines)  — 4 sub-hooks: status, connect, disconnect, checkNow
useDashboardPriorities (38 lines) — RPC get_asesor_dashboard
useProjectDetails   (32 lines)  — 4 sub-hooks: full, update, esquemas, withEsquemas
useProjectScores    (29 lines)  — 4 sub-hooks: absorption, channel, trust, portfolio
useMacroSeries      (21 lines)  — 3 sub-hooks: series, costTracker, marginPressure
useLoadingState     (17 lines)  — Query state: isFirstLoad, isRefreshing, isStale
useDevDashboard     (8 lines)   — tRPC wrapper
```

## 2.4 Hooks NUEVOS v4

```typescript
// =====================================================
// useScore — genérico para cualquier score (conservado de v3 spec)
// =====================================================
function useScore(table: 'zone_scores'|'project_scores'|'user_scores',
                  entityId: string|undefined, scoreType: string) {
  const supabase = createClient();
  const entityColumn = table === 'zone_scores' ? 'zone_id'
    : table === 'project_scores' ? 'project_id' : 'user_id';
  return useQuery({
    queryKey: ['score', table, entityId, scoreType],
    queryFn: async () => {
      const { data } = await supabase.from(table)
        .select('score_value, score_label, components, confidence, trend_vs_previous, calculated_at')
        .eq(entityColumn, entityId).eq('score_type', scoreType)
        .order('period_date', { ascending: false }).limit(1).single();
      return data;
    },
    enabled: !!entityId,
    gcTime: 1000 * 60 * 30, staleTime: 1000 * 60 * 5,
  });
}

// =====================================================
// useOnDemandScore — request recálculo si score no existe
// =====================================================
function useOnDemandScore(table, entityId, scoreType) {
  const [isCalculating, setIsCalculating] = useState(false);
  const scoreQuery = useScore(table, entityId, scoreType);
  useEffect(() => {
    if (scoreQuery.data === null && entityId && !isCalculating) {
      setIsCalculating(true);
      trpc.scores.requestRecalc.mutate({
        scoreType, entityType: table === 'zone_scores' ? 'zone' : 'project',
        entityId, priority: 1
      }).catch(() => setIsCalculating(false));
    }
  }, [scoreQuery.data, entityId]);
  // Polling 3s mientras calcula
  useEffect(() => {
    if (!isCalculating) return;
    const interval = setInterval(() => {
      scoreQuery.refetch().then(r => { if (r.data !== null) setIsCalculating(false); });
    }, 3000);
    return () => clearInterval(interval);
  }, [isCalculating]);
  return { ...scoreQuery, isCalculating };
}

// =====================================================
// useZoneScores — todos los scores de una zona
// =====================================================
function useZoneScores(zoneId: string|undefined) {
  // Dedup: solo el más reciente por score_type
  // Retorna { safety: {...}, transit: {...}, ecosystem_denue: {...}, ... }
}

// =====================================================
// useFeatureLimit — verificar límites del plan
// =====================================================
function useFeatureLimit(feature: string) {
  // Consulta subscriptions → plans.features → countUsage
  // Retorna { allowed: boolean, limit: number, used: number }
}

// =====================================================
// useCaptaciones — NUEVO v4: hook para pipeline captaciones
// =====================================================
function useCaptaciones(etapa?: string) {
  return trpc.asesorCRM.listCaptaciones.useQuery({ etapa });
}

// =====================================================
// usePropiedadesSecundarias — NUEVO v4
// =====================================================
function usePropiedadesSecundarias(tab: 'propias'|'empresa'|'todas') {
  return trpc.asesorCRM.listPropiedadesSecundarias.useQuery({ tab });
}

// =====================================================
// useGamification — NUEVO v4
// =====================================================
function useGamification() {
  return trpc.gamification.getMyStats.useQuery();
}

// =====================================================
// useLeaderboard — NUEVO v4
// =====================================================
function useLeaderboard(limit = 20) {
  return trpc.gamification.getLeaderboard.useQuery({ limit });
}

// =====================================================
// useCRMDashboard — NUEVO v4
// =====================================================
function useCRMDashboard() {
  return trpc.asesorCRM.getCRMDashboard.useQuery();
}

// =====================================================
// useLifestyleMatch — NUEVO v4
// =====================================================
function useLifestyleMatch(projectId: string, preference: string) {
  return trpc.comprador.getLifestyleMatch.useQuery({ projectId, preference });
}

// =====================================================
// useDiscoverWeekly — NUEVO v4
// =====================================================
function useDiscoverWeekly() {
  return trpc.comprador.getDiscoverWeekly.useQuery();
}
```

---

# MÓDULO 3: COMPONENTES COMPARTIDOS + PATRONES UI

## 3.1 Componentes compartidos por portal

```
Componente          | Asesor | Dev | Admin | Comprador | Props que cambian por rol
────────────────────┼────────┼─────┼───────┼───────────┼──────────────────────────
ProjectCard         | ✅     | ✅  | ✅    | ✅        | Score+comisión vs Score+edit vs Todo vs Básico
UnitTable           | ✅     | ✅  | ✅    | ✅        | Readonly vs Editable vs Todo vs Público
KPICard             | ✅     | ✅  | ✅    | ❌        | 11 KPIs vs proyecto KPIs vs AARRR
TimelineActivity    | ✅     | ✅  | ✅    | ❌        | Mi actividad vs proyecto vs global
MapView             | ✅     | ✅  | ✅    | ✅        | Demand radar vs Competitive vs Observatory vs Explorar
CalendarioWidget    | ✅     | ✅  | ✅    | ❌        | Mis visitas vs sala ventas vs todas
OperacionesTable    | ✅     | ✅  | ✅    | ❌        | Mis ops vs proyecto vs revenue total
FeedbackForm        | ✅     | ❌  | ❌    | ❌        | Post-visita 3 clicks
DocumentChecklist   | ✅     | ✅  | ✅    | ✅        | Editable vs readonly vs readonly vs propia op
ScoreDisplay        | ✅     | ✅  | ✅    | ✅        | +argumentario vs +recomendación vs +drill-down vs +explicación
DataFreshness       | ✅     | ✅  | ✅    | ✅        | Indicador ● color por antigüedad
FeatureGate         | ✅     | ✅  | ❌    | ❌        | Límites plan asesor vs dev
NotificationBell    | ✅     | ✅  | ✅    | ✅        | Filtrado por tipos de rol
CitySelector        | ✅     | ✅  | ✅    | ✅        | Filtro explorar vs wizard vs global vs explorar
```

## 3.2 Componentes NUEVOS v4

```
SCORES IE:
  ScoreCard           — Card genérica: valor + label + trend + confidence badge
  ScoreBadge          — Badge inline: valor + color (para cards de proyecto)
  ScoreChart          — Trend line del score últimos 6-12 meses (Recharts sparkline)
  ScoreRadar          — Radar chart 6 ejes para LQI / Lifestyle Match (Recharts)
  MomentumIndicator   — Gauge semicircular: rojo←→verde con 5 barras señal
  RiskBadge           — Escudo verde/amarillo/rojo con tooltip de flags
  WalkabilityBadge    — Número grande 0-100 + label Walk Score style
  PriceFairnessBadge  — Badge verde/amarillo/rojo estilo Pulppo valuación
  ValueScoreScatter   — Scatter plot LQI vs Precio con zona marcada

ZONA:
  HeatmapOverlay      — Capa Mapbox con heatmap de cualquier score por zona
  NeighborhoodReport  — Reporte completo tipo Local Logic (multi-sección)
  SafetyPanel         — Donut delitos + heatmap horario + tendencia
  TransitPanel        — Mapa estaciones + badges tipo + isócronas
  EcosystemPanel      — Donut 12 categorías + bar chart sorted + densidad

COMPRADOR:
  LifestyleMatchSelector — 6 botones perfil + radar chart + match %
  InvestmentScenarios    — 4 cards con yield por estrategia
  AffordabilityCalc      — Sliders enganche/plazo + resultado
  TCOCalculator          — Timeline 10 años stacked bar
  PatrimonioSimulator    — Gráfica 20 años compra vs renta vs CETES
  CommuteCalculator      — Mapa con ruta + tiempo + opciones transporte
  TimingOptimizer        — Semáforo + razonamiento + impacto financiero

GAMIFICATION:
  GamificationWidget     — XP bar + level + streak flame + badge reciente
  LeaderboardTable       — Ranking mensual entre asesores
  BadgeGrid              — Grid de badges earned/locked
  StreakCounter           — Flame icon + días consecutivos
  XPNotification         — Toast "+10 XP — Contacto creado"

CRM (Pulppo tropicalizado):
  CaptacionKanban        — 6 columnas pipeline captación
  CaptacionCard          — Card en kanban: dirección + propietario + etapa + valuación
  PropSecEditor          — Editor propiedad secundaria (simplificado vs Pulppo)
  PropSecCard            — Card grid: foto + dirección + precio + valuación badge
  ACMPanel               — Resultado ACM: precio sugerido + comparables + confidence
  ValuacionBadge         — Badge verde/amarillo/rojo (Pulppo style con IE data)
  CalidadCircle          — Círculo de calidad publicación (Pulppo style)

MARKETING:
  MarketingPieceGenerator — Auto-generación: Post Largo, Cuadrado, Story, Video Story
```

## 3.3 Patrones UI (conservados de v3 + nuevos)

### ScoreDisplay con datos insuficientes
```typescript
function ScoreDisplay({ scoreType, entityId, table = 'project_scores' }) {
  const { data, isCalculating } = useOnDemandScore(table, entityId, scoreType);
  
  if (isCalculating) return (
    <Card className="animate-pulse border-indigo-100 bg-indigo-50/30 p-4">
      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
      <span className="text-sm text-indigo-600">Calculando score...</span>
    </Card>
  );
  if (data?.confidence === 'insufficient_data') return (
    <ScorePlaceholder message="Score disponible cuando haya más datos en la zona" />
  );
  if (data?.confidence === 'low') return (
    <ScoreWithWarning value={data.score_value} warning="Calculado con datos limitados" />
  );
  return <ScoreCard value={data.score_value} components={data.components} trend={data.trend_vs_previous} />;
}
```

### Loading States por tipo de data (conservado v3)
```
Dashboard RPC:        Full skeleton 4 KPI + carrusel + gráfica
Lista contactos:      Skeleton rows 6 filas shimmer
Score individual:     Inline skeleton 60×24 shimmer
Score on-demand:      "Calculando..." spinner (useOnDemandScore)
Mapa Mapbox:          Grey placeholder + spinner center
AI generated:         "Generando con IA..." + progress dots
Tabla grande:         Skeleton rows + header estático
Ficha proyecto SSR:   app/loading.tsx skeleton

Patrón: useLoadingState hook → isFirstLoad, isRefreshing, isStale
  isFirstLoad → skeleton
  isRefreshing → datos stale + spinner sutil
  isStale → datos + opacity 0.6
```

---

# MÓDULO 4: PORTAL ASESOR COMPLETO (Pulppo tropicalizado + IE)

El portal asesor es el más complejo. Integra los módulos de Pulppo (dashboard, contactos, búsquedas, captaciones, tareas, inventario, operaciones, métricas) con el IE overlay (scores en cada superficie) y gamification.

## 4.1 Dashboard Asesor

```
Ruta: /asesor/dashboard
Data: RPC get_asesor_dashboard + metricas_kpi + briefing + gamification

Layout:
┌─────────────────────────────────────────────────────────────┐
│ Header: "¡Hola [Nombre]!" + GamificationWidget (XP/streak) │
│ [Banner upgrade plan si free] [🔍 ⌘+K] [● Disponible ›]   │
├─────────────────────────────────────────────────────────────┤
│ Carrusel "¿Qué debo hacer hoy?" (scroll horizontal)        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │🔥 Lead   │ │📅 Visita │ │⏰ Tarea  │ │💰 Cobro  │           │
│ │Hot sin   │ │hoy 3pm  │ │vencida  │ │pendiente│           │
│ │contactar │ │Proyecto │ │Llamar   │ │Op #DMX  │           │
│ │[Contactar]│ │[Ver]    │ │[Hacer]  │ │[Cobrar] │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│ Grid Quick-Links (4×2)                                      │
│ [Pipeline] [Contactos] [Captaciones] [Inventario]           │
│ [Tareas]   [Operaciones] [Métricas]  [Dossier IA]          │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐          │
│ │ Commission Forecast  │ │ Weekly Briefing      │          │
│ │ $45K / $82K / $120K  │ │ "Esta semana: 3 leads│          │
│ │ 30d    60d    90d    │ │ hot, tasa bajó 0.2%, │          │
│ │ ████ ██████ ████████ │ │ Nápoles momentum ↑"  │          │
│ └──────────────────────┘ └──────────────────────┘          │
├─────────────────────────────────────────────────────────────┤
│ CRM Mini-Dashboard: captaciones_por_etapa + props_activas  │
│ + comisiones_mes + operaciones_mes                         │
└─────────────────────────────────────────────────────────────┘

Carrusel "¿Qué debo hacer hoy?" (inspirado Pulppo):
  Tarjetas priorizadas por urgencia:
  1. Leads Hot sin contactar (C01 lead_score >= 80 + días_sin_contacto > 0)
  2. Visitas programadas para hoy
  3. Tareas vencidas
  4. Cobros pendientes (operaciones con estado_cobro='pendiente')
  5. Búsquedas sin responder > 24h (SLA)
  6. Captaciones sin avance > 7 días
  Cada tarjeta: icono + título + subtítulo + CTA button

GamificationWidget:
  ┌─────────────────────────────────┐
  │ 🔥 7 días · Nivel 12 · 1,250 XP │
  │ ████████████░░░░ 75% → Nivel 13 │
  │ Badge reciente: 🏆 Experto BJ   │
  └─────────────────────────────────┘
```

## 4.2 Contactos (Pulppo tropicalizado)

```
Ruta: /asesor/contactos
Data: contactos + Supabase FTS + tags

Mejoras vs Pulppo:
  + tipo_contacto field (comprador/vendedor/propietario/inquilino/inversionista/broker)
    → Pulppo NO tiene campo tipo, DMX sí
  + ingreso_estimado, credito_otorgado fields
  + Lead Score badge (C01) en cada row de la lista
  + último_contacto_at visible (cuándo fue la última interacción)
  + Búsqueda via Supabase FTS (no Algolia como Pulppo)
  + Toggle "Mis contactos / Todos" (multi-tenancy con visible_asesores_cache)
  + Detección duplicados al crear (normalize_phone + check)

Detalle contacto (/asesor/contactos/[id]):
  5 tabs:
  1. Perfil: datos + tipo + tags + presupuesto + crédito
  2. DISC: análisis DISC + coaching AI
  3. Búsquedas: pipeline de búsquedas vinculadas + lead score
  4. Captaciones: captaciones donde es propietario
  5. Actividad: timeline (actividad_timeline filtrado por contacto)
  
  Sidebar derecho:
  - Lead Score prominente (Hot/Warm/Cool/Cold) con acción sugerida
  - Matching: top 3 proyectos sugeridos (C03)
  - Commission forecast del pipeline de este contacto
```

## 4.3 Pipeline / Búsquedas (Pulppo tropicalizado + IE)

```
Ruta: /asesor/pipeline
Data: busquedas + contactos + user_scores(lead_score)

Kanban 6+1 columnas (exacto como Pulppo):
  PENDIENTE → BUSCANDO → VISITANDO → OFERTANDO → CERRANDO → GANADA
  + PERDIDA (oculta, accesible via "Cerrar búsqueda")

4 métricas superiores (exacto como Pulppo):
  Sin responder: count + $   → Leads pendiente sin contacto
  Potenciales: count + $     → Buscando + Visitando + Ofertando
  Cerrando: count + $        → Mismo que columna Cerrando
  Ganadas: count + $         → Histórico

Validaciones HARD por etapa (exacto como Pulppo):
  Visitando: requiere ≥1 visita registrada
  Ofertando: requiere ≥1 operación
  Cerrando: requiere ≥1 operación
  Ganada: requiere ≥1 operación

Mejoras vs Pulppo con IE:
  + Lead Score badge en cada card (Hot/Warm/Cool/Cold + color)
  + Matching: tab "Proyectos sugeridos" en detalle búsqueda (C03)
  + Fuente obligatoria al crear búsqueda
  + Motivo de pérdida obligatorio + REVERSIBLE (Pulppo no tiene motivo)
  + Lifestyle preference en búsqueda → personaliza matching
  + Presupuesto min/max → alimenta demand signals para B01
  + $ en header = valor acumulado de operaciones vinculadas

DnD: Pulppo tiene DnD en DOM pero bloqueado por validaciones.
     DMX: igual — cambio via "Cambiar estado" con validaciones.
```

## 4.4 Captaciones (NUEVO v4 — Pulppo Módulo 05 tropicalizado)

```
Ruta: /asesor/captaciones
Data: trpc.asesorCRM.listCaptaciones

Kanban 6 columnas:
  PENDIENTE → SEGUIMIENTO → ENCUENTRO → VALUACIÓN → DOCUMENTACIÓN → CAPTADO
  + PERDIDA (oculta, con motivo obligatorio — fix de Pulppo)

Diferencias vs Pulppo:
  + Captura rápida móvil: dirección + tipo + operación + precio + 1 foto = 2 minutos
    → Pulppo crea captación con solo contactId (genera registros fantasma)
    → DMX requiere mínimo dirección aproximada + tipo
  + ACM basado en IE (no solo datos internos como Pulppo)
    → Botón "Solicitar valuación" → trpc.asesorCRM.requestACM → calculate_acm()
    → Resultado: precio sugerido + comparables + confidence
  + Motivo de pérdida OBLIGATORIO al cerrar (Pulppo no lo tiene)
    → Opciones: precio, exclusiva_rechazada, competidor, timing, desistió, otro
    → Datos de motivo → analytics de por qué se pierden captaciones
  + Encuentros con registro estructurado (fecha + motivo + notas)
  + Etapa seleccionable al crear (Pulppo siempre empieza en Pendiente)
  + Amenidades filtradas por CDMX (~15 relevantes, no 100+ como Pulppo)

Card en kanban:
  ┌──────────────────────────┐
  │ 📍 Del Valle Centro       │
  │ Departamento · Venta      │
  │ Juan Pérez (propietario)  │
  │ $4,500,000 MXN            │
  │ ┌────────────────┐        │
  │ │🟢 Precio óptimo │ ACM   │
  │ └────────────────┘        │
  │ 📋 0  📅 2  📝 1           │
  │ Manuel Acosta  · 15/04/26 │
  └──────────────────────────┘
```

## 4.5 Propiedades Secundarias / Inventario CRM (NUEVO v4)

```
Ruta: /asesor/inventario
Data: trpc.asesorCRM.listPropiedadesSecundarias + projects autorizados

5 tabs (inspirado Pulppo pero adaptado a DMX):
  PROPIAS:          propiedades_secundarias WHERE asesor_id=me
  EMPRESA:          propiedades_secundarias WHERE employer_id=my_employer
  DMX DESARROLLOS:  projects WHERE project_brokers.authorized (inventario nuevo)
  MLS SECUNDARIO:   propiedades_secundarias WHERE estado='activo' (todas, MLS interno)
  TODAS:            union de todo

Cada tab muestra conteo: "Propias (12) · Empresa (45) · DMX (38) · MLS (2,340)"

Sistemas de calidad (Pulppo style con IE):
  Calidad publicación: Alta / Media / Baja / Sin publicar
    → Calculado por: fotos >= 10 + descripción > 200 chars + precio + dirección completa
  Valuación IE: Precio óptimo / Poco competitivo / Fuera de mercado / Sin valuación
    → Calculado por ACM IE (no solo datos internos como Pulppo)
    → Badge color: 🟢 óptimo / 🟡 poco competitivo / 🔴 fuera de mercado / ⚪ sin valuación
  Documentación: Sin doc / Pendiente / Revisión / Aprobados / Rechazados / Contrato
    → Pipeline legal de la captación

Overlay de scores IE en inventario nuevo (DMX Desarrollos):
  Cada proyecto muestra: DMX Score + Trust Score + Absorption + Price Fairness
  → Badges de color en cada card del grid

Grid de propiedades:
  Cards con: foto cover + dirección + precio + m² + recámaras + baños
  + ValuacionBadge + CalidadCircle + days_on_market + views_count

Filtros: tipo propiedad, operación, precio range, calidad, valuación, documentación
Ordenar: relevantes, menor/mayor precio, más recientes, más antiguas
```

## 4.6 Tareas (Pulppo tropicalizado)

```
Ruta: /asesor/tareas
Data: tareas WHERE asesor_id=me

3 columnas (exacto como Pulppo):
  PROPIEDADES: tareas WHERE categoria IN ('proyecto', 'captacion')
  CLIENTES:    tareas WHERE categoria IN ('busqueda', 'cliente')
  PROSPECTOS:  tareas WHERE categoria = 'lead'

Form nueva tarea (Pulppo tropicalizado):
  1. Seleccionar entidad: búsqueda (contacto) O propiedad (captación/proyecto)
  2. Tipo de tarea: Contactar propietario / Organizar visita / Organizar captación / 
     Seguimiento / Otro (DMX agrega "Seguimiento" y "Otro" vs 4 opciones Pulppo)
  3. Descripción libre
  4. Recordarme en: 1 día / 7 días / 15 días / 1 mes (Pulppo style, no date picker)
  5. Asignar a: asesor del equipo
  6. Vincular contacto (opcional)

Mejoras vs Pulppo:
  + Tareas automáticas visibles con badge "Auto" y razón
  + XP al completar tarea (+10 XP)
  + Tareas vencidas prominentes con contador en sidebar
```

## 4.7 Operaciones (Pulppo tropicalizado + IE)

```
Ruta: /asesor/operaciones
Data: operaciones + operation_timeline + commission_payments

Wizard 6 pasos (exacto como Pulppo):
  PASO 1 — Operación: selección de lado (Ambos / Vendedor / Comprador)
  PASO 2 — Comprador: asesor + contacto comprador
  PASO 3 — Vendedor: propiedad (proyecto DMX O propiedad secundaria) + propietario
  PASO 4 — Estado: estado + dinero reserva + fecha cierre + valor promoción + valor cierre
  PASO 5 — Comisión: % comisión + IVA 16% auto + split visible
  PASO 6 — Notas: observaciones libres

Mejoras vs Pulppo con IE:
  + Puede vincular propiedad_secundaria_id (mercado usado) O project_id+unidad_id (nuevo)
  + Co-broke: lado='vendedor' o 'comprador' con split de comisión claro
  + IVA 16% calculado automáticamente (4% → 4.64%) como Pulppo
  + Código único por operación (DMX-XXXX-XXXX)
  + Operation Timeline visual tipo Amazon (stages con status)
  + Document Checklist (INE, escritura, predial, etc.)
  + Payment Tracker (pagos programados + cobrados)
  + XP al cerrar operación (+500 XP)

Tabla de operaciones:
  Columnas: Propiedad, Estado (badge color), Comprador, Vendedor,
  Asesor Comprador, Productor, Operación (Venta/Renta), Comisión Total,
  Comisión Cobrada, Fecha estimada cierre, Fecha creación, Acciones

Sección Cierres Mensuales (Pulppo style, expandido):
  Ruta: /asesor/operaciones?tab=cierres
  Vista: calendario mensual con operaciones cerradas
  
  Header prominente:
    - Total comisiones mes actual: $XXX,XXX MXN (grande, verde)
    - Total comisiones cobradas: $XXX,XXX MXN vs pendientes
    - Comparativa vs mes anterior: +/-% con flecha
    - Meta mensual (si configurada) con progress bar
  
  Tabla de cierres:
    Columnas: Propiedad, Fecha cierre, Tipo (Venta/Renta), Valor operación,
              Comisión bruta, IVA 16%, Comisión neta, Estado cobro (Cobrada/Pendiente/Parcial)
    Filtros: mes selector (calendar picker), tipo operación, estado cobro
    Export: CSV / PDF resumen mensual
  
  Vista calendario:
    - Mes completo con días marcados por operación cerrada
    - Click en día → detalle de cierres del día
    - Color por estado: verde=cobrada, amarillo=pendiente, rojo=vencida
  
  KPIs de cierre:
    - Ticket promedio de comisión
    - Días promedio de cobro post-cierre
    - % de operaciones cobradas en <30 días
    - Comisión acumulada del año
  
  Mejora vs Pulppo:
    + Pulppo NO tiene vista de cierres mensuales consolidada — solo operaciones individuales
    + DMX agrega meta mensual + comparativa + forecast basado en pipeline
    + DMX conecta con C06 Commission Forecast: "Faltan $XX,XXX para la meta — tienes 3 leads Hot"
    + XP al cobrar comisión (+100 XP por cobro confirmado)

6 estados operación:
  propuesta → oferta_aceptada → contrato → cerrada_ganada → cobrando → cerrada_perdida
```

## 4.8 Métricas (Pulppo tropicalizado + IE scores)

```
Ruta: /asesor/metricas (slide-over) + /asesor/stats (página completa)

Slide-over (?metrics=true) — diagnóstico rápido (Pulppo style):
  KPIs con semáforo verde/amarillo/rojo:
  - T. primera respuesta (SLA: 60min, verde <15min, amarillo <60min, rojo >60min)
  - T. respuesta promedio (SLA: 120min)
  - Tasa de visita (verde >=75%)
  - Tasa de oferta (verde >=70%)
  - Inventario activo venta (verde >30%)
  - Tareas atrasadas clientes + propiedades
  
  Banner: "Mejora los niveles de métricas que tienes en rojo"
  Click en cada métrica → sub-drawer con definición + consejos (Pulppo style pedagógico)

Página /stats — estadísticas completas:
  Sección Calidad de Atención:
    T. primera respuesta + vs semana anterior + vs SLA
    T. respuesta promedio + vs semana anterior + vs SLA

  Sección Métricas de Operaciones:
    Consultas totales, recibidas, atendidas
    Búsquedas activas, Oportunidades interesado
    ACM creados, Propiedades activas
    Oportunidades propietario, Visitas agendadas/realizadas

  Sección IE Scores del Asesor (NUEVO v4 — Pulppo NO tiene):
    Activity Score (XP + engagement)
    Commission Forecast (30/60/90d)
    Lead Quality promedio (C01 avg de pipeline)
    Conversion Rate (visitas→operaciones)
    Zona expertise (zonas con más actividad)

  4 gráficas Recharts:
    Propiedades por etapa (barras)
    Consultas recibidas vs atendidas (líneas)
    Consultas vs Visitas (barras)
    Visitas agendadas vs realizadas (barras)

Mejoras vs Pulppo:
  + Scores IE del asesor (Pulppo solo tiene métricas de actividad)
  + Commission Forecast visual (30/60/90 días)
  + Total comisiones del mes prominente
  + Filtro por período (Pulppo solo tiene semana anterior — fijo)
  + Comparativa con equipo (si MB)
```

## 4.9 Otras páginas del portal asesor

```
/asesor/calendario       → Visitas + tareas + eventos custom (calendario_eventos)
/asesor/inteligencia     → 5 tabs: Market Pulse, Zonas, Macro, Demand, Momentum
                           FILTRADO por ciudad del asesor (zone.city_id)
/asesor/comparador       → A08 comparador multi-dimensional (2-5 proyectos)
/asesor/calculadora      → Mortgage calculator con macro_series reales
/asesor/dossier          → Generador AI: argumentario, objection killer, dossier inversión
/asesor/whatsapp-kit     → Templates + datos de proyecto pre-llenados
/asesor/acm              → ACM para propiedades secundarias (trpc.asesorCRM.requestACM)
/asesor/configuracion    → Automation rules + notificaciones config + perfil
/asesor/perfil           → Datos personales + microsite slug + zona operación
/asesor/notificaciones   → Lista de notificaciones con mark as read
/asesor/suscripcion      → Plan actual + upgrade + Stripe portal
/asesor/leaderboard      → Ranking mensual (gamification)
```

## 4.10 Sidebar Asesor (6 principales + 14 en "Más")

```
Principales (siempre visibles):
  Dashboard, Pipeline, Contactos, Captaciones, Inventario, Operaciones

En "Más":
  Tareas, Métricas, Calendario, Inteligencia, Comparador, Calculadora,
  Dossier IA, WhatsApp Kit, ACM, Leaderboard, Configuración, Perfil,
  Suscripción, Ayuda

Bottom nav mobile (5 items):
  Dashboard, Pipeline, Contactos, Captaciones, Más
```

---

# CROSS-REFERENCES

```
→ BIBLIA_IE_DMX_v4: Scores que cada componente consume (detallado en PART 2-3 de IE)
→ BIBLIA_BACKEND_DMX_v4 PART 2: tRPC routers que los hooks consumen
→ BIBLIA_BACKEND_DMX_v4 PART 1: Tablas que las queries leen/escriben
→ BIBLIA_FRONTEND_DMX_v4 PART 2: Otros portales + features transversales
```

---

**FIN DE PART 1 — Continúa en BIBLIA_FRONTEND_DMX_v4_PART2.md (Otros Portales + Features)**
