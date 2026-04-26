import 'server-only';
import type { MatchScore, UnidadCandidate } from '@/shared/lib/matcher/matcher-engine';
import { runMatcher } from '@/shared/lib/matcher/matcher-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { BusquedaCriteria, BusquedasFilters, TabKey } from './filter-schemas';

export interface BusquedaSummary {
  id: string;
  leadId: string;
  asesorId: string | null;
  brokerageId: string | null;
  countryCode: string;
  status: 'activa' | 'pausada' | 'cerrada';
  criteria: BusquedaCriteria;
  matchedCount: number;
  lastRunAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  leadName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
}

export interface BusquedaDetail extends BusquedaSummary {
  matches: MatchScore[];
  matchedProyectos: ProyectoSummary[];
  matchedUnidades: UnidadSummary[];
  zoneScoresUsed: number;
  hasSyntheticZoneScore: boolean;
}

export interface ProyectoSummary {
  id: string;
  nombre: string;
  ciudad: string | null;
  colonia: string | null;
  zoneId: string | null;
  amenities: string[];
  coverPhotoUrl: string | null;
  currency: string;
}

export interface UnidadSummary {
  id: string;
  proyectoId: string;
  numero: string;
  recamaras: number | null;
  banos: number | null;
  areaM2: number | null;
  priceMxn: number | null;
  status: string;
}

export interface BusquedasLoadResult {
  busquedas: BusquedaSummary[];
  tabCounts: Record<TabKey, number>;
  asesorId: string | null;
  isStub: boolean;
  reason: string | null;
}

interface BusquedaRow {
  id: string;
  lead_id: string;
  asesor_id: string | null;
  brokerage_id: string | null;
  country_code: string;
  status: string;
  criteria: unknown;
  matched_count: number;
  last_run_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadJoinRow {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
}

function parseCriteria(raw: unknown): BusquedaCriteria {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      tipo: (obj.tipo as BusquedaCriteria['tipo']) ?? undefined,
      operacion: (obj.operacion as BusquedaCriteria['operacion']) ?? 'venta',
      zone_ids: Array.isArray(obj.zone_ids) ? (obj.zone_ids as string[]) : [],
      ciudades: Array.isArray(obj.ciudades) ? (obj.ciudades as string[]) : [],
      price_min: typeof obj.price_min === 'number' ? obj.price_min : undefined,
      price_max: typeof obj.price_max === 'number' ? obj.price_max : undefined,
      currency: (obj.currency as BusquedaCriteria['currency']) ?? 'MXN',
      recamaras_min: typeof obj.recamaras_min === 'number' ? obj.recamaras_min : undefined,
      recamaras_max: typeof obj.recamaras_max === 'number' ? obj.recamaras_max : undefined,
      amenities: Array.isArray(obj.amenities) ? (obj.amenities as string[]) : [],
    };
  }
  return {
    operacion: 'venta',
    zone_ids: [],
    ciudades: [],
    currency: 'MXN',
    amenities: [],
  };
}

function mapBusqueda(row: BusquedaRow, leadsById: Map<string, LeadJoinRow>): BusquedaSummary {
  const lead = leadsById.get(row.lead_id);
  const status = (['activa', 'pausada', 'cerrada'].includes(row.status) ? row.status : 'activa') as
    | 'activa'
    | 'pausada'
    | 'cerrada';
  return {
    id: row.id,
    leadId: row.lead_id,
    asesorId: row.asesor_id,
    brokerageId: row.brokerage_id,
    countryCode: row.country_code,
    status,
    criteria: parseCriteria(row.criteria),
    matchedCount: row.matched_count,
    lastRunAt: row.last_run_at,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    leadName: lead?.contact_name ?? null,
    leadEmail: lead?.contact_email ?? null,
    leadPhone: lead?.contact_phone ?? null,
  };
}

async function fetchTabCounts(
  supabase: ReturnType<typeof createAdminClient>,
  asesorId: string | null,
): Promise<Record<TabKey, number>> {
  const counts: Record<TabKey, number> = { activa: 0, pausada: 0, cerrada: 0 };
  if (!asesorId) return counts;
  for (const status of ['activa', 'pausada', 'cerrada'] as const) {
    const { count } = await supabase
      .from('busquedas')
      .select('id', { count: 'exact', head: true })
      .eq('asesor_id', asesorId)
      .eq('status', status);
    counts[status] = count ?? 0;
  }
  return counts;
}

export async function loadBusquedas(
  filters: BusquedasFilters,
  asesorId: string | null,
): Promise<BusquedasLoadResult> {
  const supabase = createAdminClient();

  const tabCounts = await fetchTabCounts(supabase, asesorId);

  if (!asesorId) {
    return {
      busquedas: [],
      tabCounts,
      asesorId,
      isStub: false,
      reason: null,
    };
  }

  let query = supabase
    .from('busquedas')
    .select(
      'id, lead_id, asesor_id, brokerage_id, country_code, status, criteria, matched_count, last_run_at, notes, created_by, created_at, updated_at',
    )
    .eq('asesor_id', asesorId)
    .eq('status', filters.tab)
    .order('updated_at', { ascending: false })
    .limit(60);

  if (filters.countryCode) query = query.eq('country_code', filters.countryCode);

  const { data: rows } = await query;
  const busquedaRows = (rows ?? []) as unknown as BusquedaRow[];

  const total = tabCounts.activa + tabCounts.pausada + tabCounts.cerrada;
  if (busquedaRows.length === 0) {
    return {
      busquedas: [],
      tabCounts,
      asesorId,
      isStub: total === 0,
      reason:
        total === 0
          ? 'BD vacía — sin búsquedas registradas. Crea la primera para activar el matcher.'
          : null,
    };
  }

  const leadIds = Array.from(new Set(busquedaRows.map((r) => r.lead_id)));
  const { data: leads } = await supabase
    .from('leads')
    .select('id, contact_name, contact_email, contact_phone')
    .in('id', leadIds);
  const leadsById = new Map<string, LeadJoinRow>();
  for (const row of (leads ?? []) as LeadJoinRow[]) {
    leadsById.set(row.id, row);
  }

  let busquedas = busquedaRows.map((row) => mapBusqueda(row, leadsById));

  if (filters.tipo) busquedas = busquedas.filter((b) => b.criteria.tipo === filters.tipo);
  if (filters.operacion)
    busquedas = busquedas.filter((b) => b.criteria.operacion === filters.operacion);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    busquedas = busquedas.filter(
      (b) =>
        (b.leadName ?? '').toLowerCase().includes(q) || (b.notes ?? '').toLowerCase().includes(q),
    );
  }

  return {
    busquedas,
    tabCounts,
    asesorId,
    isStub: false,
    reason: null,
  };
}

export async function loadBusquedaDetail(
  busquedaId: string,
  asesorId: string | null,
): Promise<BusquedaDetail | null> {
  if (!asesorId) return null;
  const supabase = createAdminClient();
  const { data: busquedaRow } = await supabase
    .from('busquedas')
    .select(
      'id, lead_id, asesor_id, brokerage_id, country_code, status, criteria, matched_count, last_run_at, notes, created_by, created_at, updated_at',
    )
    .eq('id', busquedaId)
    .eq('asesor_id', asesorId)
    .maybeSingle();
  if (!busquedaRow) return null;

  const row = busquedaRow as unknown as BusquedaRow;
  const { data: lead } = await supabase
    .from('leads')
    .select('id, contact_name, contact_email, contact_phone')
    .eq('id', row.lead_id)
    .maybeSingle();
  const leadsById = new Map<string, LeadJoinRow>();
  if (lead) leadsById.set((lead as LeadJoinRow).id, lead as LeadJoinRow);
  const summary = mapBusqueda(row, leadsById);

  const candidates = await fetchCandidates(supabase, summary.criteria);
  const zoneIds = Array.from(
    new Set(candidates.map((c) => c.proyectoZoneId).filter((v): v is string => Boolean(v))),
  );

  const { zoneScores, hasSynthetic } = await fetchZoneScores(supabase, zoneIds);
  const matches = runMatcher({
    criteria: summary.criteria,
    candidates,
    zoneScores,
  }).slice(0, 10);

  const matchedProyectos = await fetchProyectos(
    supabase,
    Array.from(new Set(matches.map((m) => m.proyectoId))),
  );
  const matchedUnidades = await fetchUnidades(
    supabase,
    matches.map((m) => m.unidadId),
  );

  return {
    ...summary,
    matches,
    matchedProyectos,
    matchedUnidades,
    zoneScoresUsed: zoneScores.size,
    hasSyntheticZoneScore: hasSynthetic,
  };
}

async function fetchCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  criteria: BusquedaCriteria,
): Promise<UnidadCandidate[]> {
  let proyectoQuery = supabase
    .from('proyectos')
    .select('id, zone_id, ciudad, amenities, operacion, tipo, is_active, country_code')
    .eq('is_active', true);
  if (criteria.tipo) proyectoQuery = proyectoQuery.eq('tipo', criteria.tipo);
  proyectoQuery = proyectoQuery.eq('operacion', criteria.operacion);
  if (criteria.ciudades.length > 0) {
    proyectoQuery = proyectoQuery.in('ciudad', criteria.ciudades);
  }
  const { data: proyectos } = await proyectoQuery;
  const proyectoRows = (proyectos ?? []) as Array<{
    id: string;
    zone_id: string | null;
    ciudad: string | null;
    amenities: unknown;
    operacion: string;
    tipo: string;
  }>;
  if (proyectoRows.length === 0) return [];
  const proyectoIds = proyectoRows.map((p) => p.id);

  let unidadQuery = supabase
    .from('unidades')
    .select('id, proyecto_id, recamaras, price_mxn, status')
    .in('proyecto_id', proyectoIds)
    .eq('status', 'disponible');
  if (criteria.price_min !== undefined)
    unidadQuery = unidadQuery.gte('price_mxn', criteria.price_min);
  if (criteria.price_max !== undefined)
    unidadQuery = unidadQuery.lte('price_mxn', criteria.price_max);
  if (criteria.recamaras_min !== undefined)
    unidadQuery = unidadQuery.gte('recamaras', criteria.recamaras_min);
  if (criteria.recamaras_max !== undefined)
    unidadQuery = unidadQuery.lte('recamaras', criteria.recamaras_max);
  const { data: unidades } = await unidadQuery;
  const unidadRows = (unidades ?? []) as Array<{
    id: string;
    proyecto_id: string;
    recamaras: number | null;
    price_mxn: number | null;
    status: string;
  }>;

  const proyectoMap = new Map<string, (typeof proyectoRows)[number]>();
  for (const p of proyectoRows) proyectoMap.set(p.id, p);

  return unidadRows.map((u) => {
    const proy = proyectoMap.get(u.proyecto_id);
    const amenities = Array.isArray(proy?.amenities)
      ? (proy?.amenities as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    return {
      unidadId: u.id,
      proyectoId: u.proyecto_id,
      proyectoZoneId: proy?.zone_id ?? null,
      proyectoAmenities: amenities,
      proyectoCiudad: proy?.ciudad ?? null,
      unidadRecamaras: u.recamaras,
      unidadPriceMxn: u.price_mxn,
    };
  });
}

async function fetchZoneScores(
  supabase: ReturnType<typeof createAdminClient>,
  zoneIds: string[],
): Promise<{ zoneScores: Map<string, number>; hasSynthetic: boolean }> {
  const map = new Map<string, number>();
  if (zoneIds.length === 0) return { zoneScores: map, hasSynthetic: false };
  const { data } = await supabase
    .from('zone_scores')
    .select('zone_id, score_value, score_type, level, provenance')
    .in('zone_id', zoneIds)
    .eq('score_type', 'IE_OVERALL')
    .order('computed_at', { ascending: false });
  let hasSynthetic = false;
  for (const row of (data ?? []) as Array<{
    zone_id: string;
    score_value: number | string;
    provenance: unknown;
  }>) {
    if (!map.has(row.zone_id)) {
      map.set(row.zone_id, Number(row.score_value));
    }
    if (row.provenance && typeof row.provenance === 'object') {
      const prov = row.provenance as Record<string, unknown>;
      if (prov.source === 'synthetic_h1' || prov.synthetic === true) hasSynthetic = true;
    }
  }
  return { zoneScores: map, hasSynthetic };
}

async function fetchProyectos(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<ProyectoSummary[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('proyectos')
    .select('id, nombre, ciudad, colonia, zone_id, amenities, cover_photo_url, currency')
    .in('id', ids);
  return (
    (data ?? []) as Array<{
      id: string;
      nombre: string;
      ciudad: string | null;
      colonia: string | null;
      zone_id: string | null;
      amenities: unknown;
      cover_photo_url: string | null;
      currency: string;
    }>
  ).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    ciudad: row.ciudad,
    colonia: row.colonia,
    zoneId: row.zone_id,
    amenities: Array.isArray(row.amenities)
      ? (row.amenities as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    coverPhotoUrl: row.cover_photo_url,
    currency: row.currency,
  }));
}

async function fetchUnidades(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<UnidadSummary[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('unidades')
    .select('id, proyecto_id, numero, recamaras, banos, area_m2, price_mxn, status')
    .in('id', ids);
  return (
    (data ?? []) as Array<{
      id: string;
      proyecto_id: string;
      numero: string;
      recamaras: number | null;
      banos: number | string | null;
      area_m2: number | string | null;
      price_mxn: number | string | null;
      status: string;
    }>
  ).map((row) => ({
    id: row.id,
    proyectoId: row.proyecto_id,
    numero: row.numero,
    recamaras: row.recamaras,
    banos: row.banos !== null ? Number(row.banos) : null,
    areaM2: row.area_m2 !== null ? Number(row.area_m2) : null,
    priceMxn: row.price_mxn !== null ? Number(row.price_mxn) : null,
    status: row.status,
  }));
}
