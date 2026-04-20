// Runtime cache in-memory con TTL + tag invalidation.
// H1 implementation: Map-based scoped a globalThis (persiste entre invocaciones
// de misma instancia Fluid Compute). Upgrade path H2 a Vercel Runtime Cache
// (@vercel/functions getCache()) sin cambiar el API externo.
//
// Uso: calculators IE (F01/F02/F03/H01/H02 y otros heavy-query) cachean
// queries geo_data_points por zone+source+period+radius TTL 24h. Reduce DB
// load 60-80% en re-runs por worker cron.
//
// Invalidación: cascade geo_data_updated llama invalidateByTag('geo:<source>')
// cuando ingesta nueva data, forzando próximo runScore a requery.

export interface CacheEntry<T = unknown> {
  readonly value: T;
  readonly tags: readonly string[];
  readonly expiresAt: number;
}

export interface SetOptions {
  readonly ttlSeconds: number;
  readonly tags?: readonly string[];
}

const STORE_KEY = '__dmx_runtime_cache__';

type Store = Map<string, CacheEntry<unknown>>;

function getStore(): Store {
  const g = globalThis as unknown as { [STORE_KEY]?: Store };
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map();
  return g[STORE_KEY];
}

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt <= Date.now();
}

export function get<T>(key: string): T | undefined {
  const store = getStore();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (isExpired(entry)) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function set<T>(key: string, value: T, options: SetOptions): void {
  const store = getStore();
  store.set(key, {
    value,
    tags: options.tags ?? [],
    expiresAt: Date.now() + options.ttlSeconds * 1000,
  });
}

export function invalidate(key: string): boolean {
  return getStore().delete(key);
}

export function invalidateByTag(tag: string): number {
  const store = getStore();
  let n = 0;
  for (const [key, entry] of store.entries()) {
    if (entry.tags.includes(tag)) {
      store.delete(key);
      n++;
    }
  }
  return n;
}

export function invalidatePattern(pattern: RegExp): number {
  const store = getStore();
  let n = 0;
  for (const key of store.keys()) {
    if (pattern.test(key)) {
      store.delete(key);
      n++;
    }
  }
  return n;
}

export function clearCache(): void {
  getStore().clear();
}

export function cacheSize(): number {
  return getStore().size;
}

// Higher-level helper: ejecuta fn() si no hay cache hit, sino devuelve cached.
// Calculators lo usan: `cached('f01:geo:cdmx-5:fgj:2026-04', 86400, ['geo:fgj'], fetchFn)`.
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  tags: readonly string[],
  fn: () => Promise<T>,
): Promise<T> {
  const hit = get<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  set(key, value, { ttlSeconds, tags });
  return value;
}

// Helper para calculators IE que consultan geo_data_points.
// Key schema: geo:<source>:<zone>:<period>:<radius>
export function geoCacheKey(args: {
  source: string;
  zoneId: string;
  period: string;
  radiusKm: number;
}): string {
  return `geo:${args.source}:${args.zoneId}:${args.period}:${args.radiusKm}`;
}

export function geoCacheTag(source: string): string {
  return `geo:${source}`;
}
