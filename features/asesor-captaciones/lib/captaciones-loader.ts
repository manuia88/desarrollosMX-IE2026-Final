import 'server-only';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { CaptacionesFilters, CaptacionStatusKey } from './filter-schemas';
import { STATUS_KEYS } from './filter-schemas';

export interface CaptacionFeatures {
  recamaras?: number;
  banos?: number;
  area_m2?: number;
  amenidades?: string[];
}

export interface AcmSnapshot {
  score: number;
  breakdown: {
    priceFit: number;
    zoneScore: number;
    amenities: number;
    sizeFit: number;
    discZone: number;
  };
  rationale: string[];
  hasFallbackZoneScore: boolean;
  computedAt: string;
}

export interface CaptacionSummary {
  id: string;
  asesorId: string | null;
  brokerageId: string | null;
  createdBy: string | null;
  leadId: string | null;
  propietarioNombre: string;
  propietarioTelefono: string | null;
  propietarioEmail: string | null;
  direccion: string;
  tipoOperacion: 'venta' | 'renta';
  precioSolicitado: number;
  currency: string;
  countryCode: string;
  zoneId: string | null;
  ciudad: string | null;
  colonia: string | null;
  status: CaptacionStatusKey;
  statusChangedAt: string;
  features: CaptacionFeatures;
  acmResult: AcmSnapshot | null;
  acmComputedAt: string | null;
  closedAt: string | null;
  closedMotivo: string | null;
  closedNotes: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaptacionDetail extends CaptacionSummary {
  zonePulseScoreUsed: number | null;
  hasSyntheticZoneScore: boolean;
}

export interface CaptacionesLoadResult {
  captaciones: CaptacionSummary[];
  statusCounts: Record<CaptacionStatusKey, number>;
  asesorId: string | null;
  isStub: boolean;
  reason: string | null;
}

interface CaptacionRow {
  id: string;
  asesor_id: string | null;
  brokerage_id: string | null;
  created_by: string | null;
  lead_id: string | null;
  propietario_nombre: string;
  propietario_telefono: string | null;
  propietario_email: string | null;
  direccion: string;
  tipo_operacion: string;
  precio_solicitado: number | string;
  currency: string;
  country_code: string;
  zone_id: string | null;
  ciudad: string | null;
  colonia: string | null;
  status: string;
  status_changed_at: string;
  features: unknown;
  acm_result: unknown;
  acm_computed_at: string | null;
  closed_at: string | null;
  closed_motivo: string | null;
  closed_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const FIELDS =
  'id, asesor_id, brokerage_id, created_by, lead_id, propietario_nombre, propietario_telefono, propietario_email, direccion, tipo_operacion, precio_solicitado, currency, country_code, zone_id, ciudad, colonia, status, status_changed_at, features, acm_result, acm_computed_at, closed_at, closed_motivo, closed_notes, notes, created_at, updated_at';

function parseFeatures(raw: unknown): CaptacionFeatures {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const out: CaptacionFeatures = {};
    if (typeof obj.recamaras === 'number') out.recamaras = obj.recamaras;
    if (typeof obj.banos === 'number') out.banos = obj.banos;
    if (typeof obj.area_m2 === 'number') out.area_m2 = obj.area_m2;
    if (Array.isArray(obj.amenidades)) {
      out.amenidades = obj.amenidades.filter((x): x is string => typeof x === 'string');
    }
    return out;
  }
  return {};
}

function parseAcm(raw: unknown): AcmSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.score !== 'number') return null;
  const bRaw = (obj.breakdown ?? {}) as Record<string, unknown>;
  return {
    score: obj.score,
    breakdown: {
      priceFit: typeof bRaw.priceFit === 'number' ? bRaw.priceFit : 0,
      zoneScore: typeof bRaw.zoneScore === 'number' ? bRaw.zoneScore : 0,
      amenities: typeof bRaw.amenities === 'number' ? bRaw.amenities : 0,
      sizeFit: typeof bRaw.sizeFit === 'number' ? bRaw.sizeFit : 0,
      discZone: typeof bRaw.discZone === 'number' ? bRaw.discZone : 0,
    },
    rationale: Array.isArray(obj.rationale)
      ? obj.rationale.filter((x): x is string => typeof x === 'string')
      : [],
    hasFallbackZoneScore: obj.hasFallbackZoneScore === true,
    computedAt: typeof obj.computedAt === 'string' ? obj.computedAt : '',
  };
}

function mapRow(row: CaptacionRow): CaptacionSummary {
  const status = STATUS_KEYS.includes(row.status as CaptacionStatusKey)
    ? (row.status as CaptacionStatusKey)
    : 'prospecto';
  const tipo = row.tipo_operacion === 'renta' ? 'renta' : 'venta';
  return {
    id: row.id,
    asesorId: row.asesor_id,
    brokerageId: row.brokerage_id,
    createdBy: row.created_by,
    leadId: row.lead_id,
    propietarioNombre: row.propietario_nombre,
    propietarioTelefono: row.propietario_telefono,
    propietarioEmail: row.propietario_email,
    direccion: row.direccion,
    tipoOperacion: tipo,
    precioSolicitado: Number(row.precio_solicitado),
    currency: row.currency,
    countryCode: row.country_code,
    zoneId: row.zone_id,
    ciudad: row.ciudad,
    colonia: row.colonia,
    status,
    statusChangedAt: row.status_changed_at,
    features: parseFeatures(row.features),
    acmResult: parseAcm(row.acm_result),
    acmComputedAt: row.acm_computed_at,
    closedAt: row.closed_at,
    closedMotivo: row.closed_motivo,
    closedNotes: row.closed_notes,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchStatusCounts(
  supabase: ReturnType<typeof createAdminClient>,
  asesorId: string | null,
): Promise<Record<CaptacionStatusKey, number>> {
  const counts: Record<CaptacionStatusKey, number> = {
    prospecto: 0,
    presentacion: 0,
    firmado: 0,
    en_promocion: 0,
    vendido: 0,
    cerrado_no_listado: 0,
  };
  if (!asesorId) return counts;
  for (const status of STATUS_KEYS) {
    const { count } = await supabase
      .from('captaciones')
      .select('id', { count: 'exact', head: true })
      .eq('asesor_id', asesorId)
      .eq('status', status);
    counts[status] = count ?? 0;
  }
  return counts;
}

export async function loadCaptaciones(
  filters: CaptacionesFilters,
  asesorId: string | null,
): Promise<CaptacionesLoadResult> {
  const supabase = createAdminClient();
  const statusCounts = await fetchStatusCounts(supabase, asesorId);

  if (!asesorId) {
    return {
      captaciones: [],
      statusCounts,
      asesorId,
      isStub: false,
      reason: null,
    };
  }

  let query = supabase
    .from('captaciones')
    .select(FIELDS)
    .eq('asesor_id', asesorId)
    .order('updated_at', { ascending: false })
    .limit(120);
  if (filters.countryCode) query = query.eq('country_code', filters.countryCode);
  if (filters.status) query = query.eq('status', filters.status);

  const { data: rows } = await query;
  const captacionRows = (rows ?? []) as unknown as CaptacionRow[];

  const total = STATUS_KEYS.reduce((acc, k) => acc + statusCounts[k], 0);
  if (captacionRows.length === 0) {
    return {
      captaciones: [],
      statusCounts,
      asesorId,
      isStub: total === 0,
      reason:
        total === 0
          ? 'BD vacía — sin captaciones registradas. Crea la primera captación para activar el pipeline.'
          : null,
    };
  }

  let captaciones = captacionRows.map(mapRow);

  if (filters.operacion) {
    captaciones = captaciones.filter((c) => c.tipoOperacion === filters.operacion);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    captaciones = captaciones.filter(
      (c) =>
        c.propietarioNombre.toLowerCase().includes(q) ||
        c.direccion.toLowerCase().includes(q) ||
        (c.notes ?? '').toLowerCase().includes(q) ||
        (c.ciudad ?? '').toLowerCase().includes(q),
    );
  }

  return {
    captaciones,
    statusCounts,
    asesorId,
    isStub: false,
    reason: null,
  };
}

export async function loadCaptacionDetail(
  captacionId: string,
  asesorId: string | null,
): Promise<CaptacionDetail | null> {
  if (!asesorId) return null;
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from('captaciones')
    .select(FIELDS)
    .eq('id', captacionId)
    .eq('asesor_id', asesorId)
    .maybeSingle();
  if (!row) return null;
  const summary = mapRow(row as unknown as CaptacionRow);

  let zonePulseScoreUsed: number | null = null;
  let hasSyntheticZoneScore = false;
  if (summary.zoneId) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: pulses } = await supabase
      .from('zone_pulse_scores')
      .select('pulse_score')
      .eq('scope_type', 'zone')
      .eq('scope_id', summary.zoneId)
      .gte('period_date', since)
      .limit(30);
    const list = (pulses ?? []) as Array<{ pulse_score: number | string | null }>;
    if (list.length > 0) {
      const nums = list
        .map((r) => Number(r.pulse_score))
        .filter((n) => Number.isFinite(n) && n >= 0);
      if (nums.length > 0) {
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        zonePulseScoreUsed = avg > 1 ? Math.min(1, avg / 100) : avg;
      } else {
        hasSyntheticZoneScore = true;
      }
    } else {
      hasSyntheticZoneScore = true;
    }
  } else {
    hasSyntheticZoneScore = true;
  }

  return {
    ...summary,
    zonePulseScoreUsed,
    hasSyntheticZoneScore,
  };
}
