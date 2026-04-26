import 'server-only';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { DesarrollosFilters, TabKey } from './filter-schemas';

export interface DesarrolloSummary {
  id: string;
  name: string;
  slug: string;
  desarrolladoraName: string | null;
  ciudad: string | null;
  colonia: string | null;
  countryCode: string;
  tipo: string;
  operacion: 'venta' | 'renta';
  priceFrom: number | null;
  priceTo: number | null;
  currency: string;
  unitsAvailable: number | null;
  unitsTotal: number | null;
  bedrooms: number[] | null;
  amenities: string[];
  photoUrl: string | null;
  dmxScore: number | null;
  qualityScore: number | null;
  momentumDelta: number | null;
  exclusividad: {
    mesesExclusividad: number;
    mesesContrato: number;
    comisionPct: number;
  } | null;
  isPlaceholder: boolean;
  boundarySource: 'real' | 'synthetic_h1' | 'pending';
  updatedAt: string | null;
}

export interface DesarrollosLoadResult {
  projects: DesarrolloSummary[];
  tabCounts: Record<TabKey, number>;
  nextCursor: string | null;
  asesorId: string | null;
  isStub: boolean;
  reason: string | null;
}

interface ProyectoRow {
  id: string;
  nombre: string;
  slug: string;
  desarrolladora_id: string;
  ciudad: string | null;
  colonia: string | null;
  country_code: string;
  tipo: string;
  operacion: string;
  status: string;
  units_total: number | null;
  units_available: number | null;
  price_min_mxn: number | null;
  price_max_mxn: number | null;
  currency: string;
  bedrooms_range: number[] | null;
  amenities: unknown;
  cover_photo_url: string | null;
  privacy_level: string;
  is_active: boolean;
  updated_at: string;
}

interface ExclusividadJoin {
  proyecto_id: string;
  meses_exclusividad: number;
  meses_contrato: number;
  comision_pct: number | string;
}

interface DesarrolladoraJoin {
  id: string;
  name: string;
}

function parseAmenities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string');
}

async function fetchTabCounts(
  supabase: ReturnType<typeof createAdminClient>,
  asesorId: string | null,
): Promise<Record<TabKey, number>> {
  const counts: Record<TabKey, number> = { own: 0, exclusive: 0, dmx: 0, mls: 0 };

  const { count: dmxCount } = await supabase
    .from('proyectos')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('privacy_level', 'public');
  counts.dmx = dmxCount ?? 0;

  const { count: mlsCount } = await supabase
    .from('proyectos')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .in('privacy_level', ['public', 'broker_only']);
  counts.mls = mlsCount ?? 0;

  if (asesorId) {
    const { data: assignments } = await supabase
      .from('project_brokers')
      .select('proyecto_id, role')
      .eq('broker_user_id', asesorId)
      .eq('active', true);
    const allIds = (assignments ?? []).map((row) => row.proyecto_id);
    const exclusiveIds = (assignments ?? [])
      .filter((row) => row.role === 'lead_broker')
      .map((row) => row.proyecto_id);
    counts.own = allIds.length;
    counts.exclusive = exclusiveIds.length;
  }

  return counts;
}

function mapRow(
  row: ProyectoRow,
  desarrolladoraNames: Map<string, string>,
  exclusividadByProyecto: Map<string, ExclusividadJoin>,
): DesarrolloSummary {
  const exclusividadRow = exclusividadByProyecto.get(row.id);
  const operacion: 'venta' | 'renta' = row.operacion === 'renta' ? 'renta' : 'venta';
  return {
    id: row.id,
    name: row.nombre,
    slug: row.slug,
    desarrolladoraName: desarrolladoraNames.get(row.desarrolladora_id) ?? null,
    ciudad: row.ciudad,
    colonia: row.colonia,
    countryCode: row.country_code,
    tipo: row.tipo,
    operacion,
    priceFrom: row.price_min_mxn,
    priceTo: row.price_max_mxn,
    currency: row.currency,
    unitsAvailable: row.units_available,
    unitsTotal: row.units_total,
    bedrooms: row.bedrooms_range,
    amenities: parseAmenities(row.amenities),
    photoUrl: row.cover_photo_url,
    dmxScore: null,
    qualityScore: null,
    momentumDelta: null,
    exclusividad: exclusividadRow
      ? {
          mesesExclusividad: exclusividadRow.meses_exclusividad,
          mesesContrato: exclusividadRow.meses_contrato,
          comisionPct: Number(exclusividadRow.comision_pct),
        }
      : null,
    isPlaceholder: false,
    boundarySource: 'real',
    updatedAt: row.updated_at,
  };
}

export async function loadDesarrollos(
  filters: DesarrollosFilters,
  asesorId: string | null,
): Promise<DesarrollosLoadResult> {
  const supabase = createAdminClient();

  const tabCounts = await fetchTabCounts(supabase, asesorId);

  let assignmentIds: string[] | null = null;
  if (filters.tab === 'own' || filters.tab === 'exclusive') {
    if (!asesorId) {
      return {
        projects: [],
        tabCounts,
        nextCursor: null,
        asesorId,
        isStub: false,
        reason: null,
      };
    }
    const { data: assignments } = await supabase
      .from('project_brokers')
      .select('proyecto_id, role')
      .eq('broker_user_id', asesorId)
      .eq('active', true);
    if (filters.tab === 'exclusive') {
      assignmentIds = (assignments ?? [])
        .filter((row) => row.role === 'lead_broker')
        .map((row) => row.proyecto_id);
    } else {
      assignmentIds = (assignments ?? []).map((row) => row.proyecto_id);
    }
    if (assignmentIds.length === 0) {
      return {
        projects: [],
        tabCounts,
        nextCursor: null,
        asesorId,
        isStub: false,
        reason: null,
      };
    }
  }

  const fields =
    'id, nombre, slug, desarrolladora_id, ciudad, colonia, country_code, tipo, operacion, status, units_total, units_available, price_min_mxn, price_max_mxn, currency, bedrooms_range, amenities, cover_photo_url, privacy_level, is_active, updated_at';

  let query = supabase.from('proyectos').select(fields).eq('is_active', true);

  if (assignmentIds) {
    query = query.in('id', assignmentIds);
  } else if (filters.tab === 'dmx') {
    query = query.eq('privacy_level', 'public');
  } else if (filters.tab === 'mls') {
    query = query.in('privacy_level', ['public', 'broker_only']);
  }

  if (filters.countryCode) query = query.eq('country_code', filters.countryCode);
  if (filters.city) query = query.ilike('ciudad', `%${filters.city}%`);
  if (filters.colonia) query = query.ilike('colonia', `%${filters.colonia}%`);
  if (filters.tipo) query = query.eq('tipo', filters.tipo);
  if (filters.priceMin) query = query.gte('price_min_mxn', filters.priceMin);
  if (filters.priceMax) query = query.lte('price_max_mxn', filters.priceMax);
  if (filters.q) query = query.ilike('nombre', `%${filters.q}%`);

  const limit = 24;
  query = query.order('updated_at', { ascending: false }).limit(limit);

  const { data: rows } = await query;
  const proyectoRows = (rows ?? []) as unknown as ProyectoRow[];

  if (proyectoRows.length === 0) {
    return {
      projects: [],
      tabCounts,
      nextCursor: null,
      asesorId,
      isStub: tabCounts.dmx === 0 && tabCounts.mls === 0,
      reason:
        tabCounts.dmx === 0 && tabCounts.mls === 0
          ? 'BD vacía — sin proyectos cargados todavía. Solicita asignación a tu Master Broker.'
          : null,
    };
  }

  const desarrolladoraIds = Array.from(new Set(proyectoRows.map((row) => row.desarrolladora_id)));
  const proyectoIds = proyectoRows.map((row) => row.id);

  const [{ data: desarrolladoras }, { data: exclusividades }] = await Promise.all([
    supabase.from('desarrolladoras').select('id, name').in('id', desarrolladoraIds),
    supabase
      .from('exclusividad_acuerdos')
      .select('proyecto_id, meses_exclusividad, meses_contrato, comision_pct')
      .in('proyecto_id', proyectoIds)
      .eq('active', true),
  ]);

  const desarrolladoraNames = new Map<string, string>();
  for (const row of (desarrolladoras ?? []) as DesarrolladoraJoin[]) {
    desarrolladoraNames.set(row.id, row.name);
  }
  const exclusividadByProyecto = new Map<string, ExclusividadJoin>();
  for (const row of (exclusividades ?? []) as ExclusividadJoin[]) {
    exclusividadByProyecto.set(row.proyecto_id, row);
  }

  const projects = proyectoRows.map((row) =>
    mapRow(row, desarrolladoraNames, exclusividadByProyecto),
  );
  const lastRow = proyectoRows.at(-1);
  const nextCursor = proyectoRows.length === limit && lastRow ? lastRow.updated_at : null;

  return {
    projects,
    tabCounts,
    nextCursor,
    asesorId,
    isStub: false,
    reason: null,
  };
}
