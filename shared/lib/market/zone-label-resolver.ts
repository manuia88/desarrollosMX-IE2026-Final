import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

export type ZoneScopeType = 'colonia' | 'alcaldia' | 'city' | 'estado' | string;

export interface ResolveZoneLabelOptions {
  readonly scopeType: ZoneScopeType;
  readonly scopeId: string;
  readonly countryCode?: string;
  readonly supabase?: SupabaseClient<Database>;
}

export interface ResolveZoneLabelSyncOptions {
  readonly scopeType: ZoneScopeType;
  readonly scopeId: string;
}

export interface BatchResolveItem {
  readonly scopeType: ZoneScopeType;
  readonly scopeId: string;
  readonly countryCode?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_PREFIX_REGEX = /^[0-9a-f]{8}-/i;

const FALLBACK_ESTADO = '[Estado sin nombre]';
const FALLBACK_CIUDAD = '[Ciudad sin nombre]';
const FALLBACK_ALCALDIA = '[Alcaldía sin nombre]';
const FALLBACK_ZONA = '[Zona sin nombre]';

const ESTADO_LABELS: Readonly<Record<string, string>> = Object.freeze({
  AGS: 'Aguascalientes',
  BC: 'Baja California',
  BCS: 'Baja California Sur',
  CAM: 'Campeche',
  CMX: 'Ciudad de México',
  COA: 'Coahuila',
  COL: 'Colima',
  CHP: 'Chiapas',
  CHH: 'Chihuahua',
  DUR: 'Durango',
  GUA: 'Guanajuato',
  GRO: 'Guerrero',
  HID: 'Hidalgo',
  JAL: 'Jalisco',
  MEX: 'Estado de México',
  MIC: 'Michoacán',
  MOR: 'Morelos',
  NAY: 'Nayarit',
  NLE: 'Nuevo León',
  OAX: 'Oaxaca',
  PUE: 'Puebla',
  QUE: 'Querétaro',
  ROO: 'Quintana Roo',
  SLP: 'San Luis Potosí',
  SIN: 'Sinaloa',
  SON: 'Sonora',
  TAB: 'Tabasco',
  TAM: 'Tamaulipas',
  TLA: 'Tlaxcala',
  VER: 'Veracruz',
  YUC: 'Yucatán',
  ZAC: 'Zacatecas',
});

const CIUDAD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  CDMX: 'Ciudad de México',
  MTY: 'Monterrey',
  GDL: 'Guadalajara',
  PUE: 'Puebla',
  QRO: 'Querétaro',
  TOL: 'Toluca',
  MER: 'Mérida',
  TIJ: 'Tijuana',
  AGS: 'Aguascalientes',
  SLP: 'San Luis Potosí',
});

const ALCALDIA_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'alvaro-obregon': 'Álvaro Obregón',
  azcapotzalco: 'Azcapotzalco',
  'benito-juarez': 'Benito Juárez',
  coyoacan: 'Coyoacán',
  cuajimalpa: 'Cuajimalpa',
  cuauhtemoc: 'Cuauhtémoc',
  'gustavo-a-madero': 'Gustavo A. Madero',
  iztacalco: 'Iztacalco',
  iztapalapa: 'Iztapalapa',
  'magdalena-contreras': 'Magdalena Contreras',
  'miguel-hidalgo': 'Miguel Hidalgo',
  'milpa-alta': 'Milpa Alta',
  tlahuac: 'Tláhuac',
  tlalpan: 'Tlalpan',
  'venustiano-carranza': 'Venustiano Carranza',
  xochimilco: 'Xochimilco',
});

const CACHE_MAX_ENTRIES = 1000;

class LruMap {
  private readonly store = new Map<string, string>();

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  set(key: string, value: string): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= CACHE_MAX_ENTRIES) {
      const firstKey = this.store.keys().next().value;
      if (typeof firstKey === 'string') {
        this.store.delete(firstKey);
      }
    }
    this.store.set(key, value);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

const cache = new LruMap();

export const ZoneLabelCache = Object.freeze({
  get(key: string): string | undefined {
    return cache.get(key);
  },
  set(key: string, value: string): void {
    cache.set(key, value);
  },
  clear(): void {
    cache.clear();
  },
  size(): number {
    return cache.size();
  },
});

function cacheKey(scopeType: ZoneScopeType, scopeId: string): string {
  return `${scopeType}:${scopeId}`;
}

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function looksLikeUuidPrefix(value: string): boolean {
  return UUID_PREFIX_REGEX.test(value);
}

// Slug → Title Case (preserves common spanish accented characters that may
// already be present in the slug).
function slugToTitle(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function resolveEstado(scopeId: string): string {
  const direct = ESTADO_LABELS[scopeId];
  if (direct) return direct;
  const upper = ESTADO_LABELS[scopeId.toUpperCase()];
  if (upper) return upper;
  if (isUuid(scopeId)) return FALLBACK_ESTADO;
  if (looksLikeUuidPrefix(scopeId)) return FALLBACK_ESTADO;
  return slugToTitle(scopeId);
}

function resolveCiudad(scopeId: string): string | null {
  const direct = CIUDAD_LABELS[scopeId];
  if (direct) return direct;
  const upper = CIUDAD_LABELS[scopeId.toUpperCase()];
  if (upper) return upper;
  if (isUuid(scopeId)) return null;
  if (looksLikeUuidPrefix(scopeId)) return null;
  return slugToTitle(scopeId);
}

function resolveAlcaldiaSync(scopeId: string): string | null {
  const direct = ALCALDIA_LABELS[scopeId];
  if (direct) return direct;
  const lower = ALCALDIA_LABELS[scopeId.toLowerCase()];
  if (lower) return lower;
  if (isUuid(scopeId)) return null;
  if (looksLikeUuidPrefix(scopeId)) return null;
  return slugToTitle(scopeId);
}

function resolveColoniaSync(scopeId: string): string | null {
  if (isUuid(scopeId)) return null;
  if (looksLikeUuidPrefix(scopeId)) return null;
  return slugToTitle(scopeId);
}

// Synchronous resolver — uses hardcoded maps + slug fallback only. Returns
// never-UUID output: if the scopeId is a UUID-shaped string with no match,
// a bracketed [Zona sin nombre] / [Estado sin nombre] / etc. is returned.
export function resolveZoneLabelSync(opts: ResolveZoneLabelSyncOptions): string {
  const { scopeType, scopeId } = opts;
  if (!scopeId) return FALLBACK_ZONA;

  const key = cacheKey(scopeType, scopeId);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let label: string;
  switch (scopeType) {
    case 'estado': {
      label = resolveEstado(scopeId);
      break;
    }
    case 'city': {
      const resolved = resolveCiudad(scopeId);
      label = resolved ?? FALLBACK_CIUDAD;
      break;
    }
    case 'alcaldia': {
      const resolved = resolveAlcaldiaSync(scopeId);
      label = resolved ?? FALLBACK_ALCALDIA;
      break;
    }
    case 'colonia': {
      const resolved = resolveColoniaSync(scopeId);
      label = resolved ?? FALLBACK_ZONA;
      break;
    }
    default: {
      if (isUuid(scopeId) || looksLikeUuidPrefix(scopeId)) {
        label = FALLBACK_ZONA;
      } else {
        label = slugToTitle(scopeId);
      }
    }
  }

  cache.set(key, label);
  return label;
}

interface ZonaSnapshotPayload {
  readonly name?: unknown;
  readonly label?: unknown;
}

function extractNameFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as ZonaSnapshotPayload;
  if (typeof p.name === 'string' && p.name.length > 0) return p.name;
  if (typeof p.label === 'string' && p.label.length > 0) return p.label;
  return null;
}

async function fetchZonaSnapshotLabel(
  supabase: SupabaseClient<Database>,
  zoneId: string,
  countryCode: string | undefined,
): Promise<string | null> {
  try {
    let query = supabase
      .from('zona_snapshots')
      .select('payload')
      .eq('zone_id', zoneId)
      .order('computed_at', { ascending: false })
      .limit(1);
    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }
    const { data, error } = await query;
    if (error) return null;
    const rows = (data ?? []) as ReadonlyArray<{ payload: unknown }>;
    const first = rows[0];
    if (!first) return null;
    return extractNameFromPayload(first.payload);
  } catch {
    return null;
  }
}

// Async resolver — performs DB lookup for alcaldia/colonia if the sync
// resolution only returned the bracketed fallback. Always returns a human
// readable string (never a raw UUID).
export async function resolveZoneLabel(opts: ResolveZoneLabelOptions): Promise<string> {
  const { scopeType, scopeId, countryCode, supabase } = opts;
  if (!scopeId) return FALLBACK_ZONA;

  const key = cacheKey(scopeType, scopeId);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const sync = resolveZoneLabelSync({ scopeType, scopeId });
  const needsDbLookup =
    sync === FALLBACK_ZONA || sync === FALLBACK_ALCALDIA || sync === FALLBACK_CIUDAD;
  if (!needsDbLookup) {
    return sync;
  }

  const client = supabase ?? createAdminClient();
  const dbLabel = await fetchZonaSnapshotLabel(client, scopeId, countryCode);
  const label = dbLabel ?? sync;
  cache.set(key, label);
  return label;
}

// Batch resolver — resolves N items with a single DB query for the subset
// that requires one. Items already resolved via hardcoded maps or slug
// fallback do not trigger a query.
export async function batchResolveZoneLabels(
  items: ReadonlyArray<BatchResolveItem>,
  opts: { readonly supabase?: SupabaseClient<Database> } = {},
): Promise<ReadonlyArray<string>> {
  if (items.length === 0) return [];

  const results: string[] = new Array<string>(items.length);
  const pendingIndexes: number[] = [];
  const pendingIds: string[] = [];
  const pendingCountries = new Set<string>();

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item) {
      results[i] = FALLBACK_ZONA;
      continue;
    }
    const key = cacheKey(item.scopeType, item.scopeId);
    const cached = cache.get(key);
    if (cached !== undefined) {
      results[i] = cached;
      continue;
    }
    const sync = resolveZoneLabelSync({ scopeType: item.scopeType, scopeId: item.scopeId });
    const needsDbLookup =
      sync === FALLBACK_ZONA || sync === FALLBACK_ALCALDIA || sync === FALLBACK_CIUDAD;
    if (!needsDbLookup) {
      results[i] = sync;
      continue;
    }
    results[i] = sync;
    pendingIndexes.push(i);
    pendingIds.push(item.scopeId);
    if (item.countryCode) pendingCountries.add(item.countryCode);
  }

  if (pendingIndexes.length === 0) {
    return results;
  }

  const client = opts.supabase ?? createAdminClient();
  try {
    let query = client
      .from('zona_snapshots')
      .select('zone_id, payload, computed_at')
      .in('zone_id', pendingIds);
    if (pendingCountries.size === 1) {
      const only = pendingCountries.values().next().value;
      if (typeof only === 'string') {
        query = query.eq('country_code', only);
      }
    }
    const { data, error } = await query;
    if (!error && data) {
      const latestByZone = new Map<string, { label: string; computedAt: string }>();
      const rows = data as ReadonlyArray<{
        zone_id: string;
        payload: unknown;
        computed_at: string;
      }>;
      for (const row of rows) {
        const candidate = extractNameFromPayload(row.payload);
        if (!candidate) continue;
        const existing = latestByZone.get(row.zone_id);
        if (!existing || row.computed_at > existing.computedAt) {
          latestByZone.set(row.zone_id, { label: candidate, computedAt: row.computed_at });
        }
      }
      for (const idx of pendingIndexes) {
        const item = items[idx];
        if (!item) continue;
        const resolved = latestByZone.get(item.scopeId);
        if (resolved) {
          results[idx] = resolved.label;
          cache.set(cacheKey(item.scopeType, item.scopeId), resolved.label);
        } else {
          cache.set(cacheKey(item.scopeType, item.scopeId), results[idx] ?? FALLBACK_ZONA);
        }
      }
    }
  } catch {
    // Keep sync fallbacks already placed in results[].
  }

  return results;
}

export const ZONE_LABEL_FALLBACKS = Object.freeze({
  estado: FALLBACK_ESTADO,
  city: FALLBACK_CIUDAD,
  alcaldia: FALLBACK_ALCALDIA,
  zona: FALLBACK_ZONA,
});
