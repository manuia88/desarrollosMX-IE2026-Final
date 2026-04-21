// Helpers puros para metodología de índices DMX.
// Consumen rows de dmx_indices_methodology_versions y exponen formas
// normalizadas para UI + tests. Sin side-effects, sin I/O.

export interface MethodologyRow {
  readonly index_code: string;
  readonly version: string;
  readonly formula_md: string;
  readonly weights_jsonb: unknown;
  readonly effective_from: string;
  readonly effective_to: string | null;
  readonly changelog_notes: string | null;
  readonly approved_at: string | null;
}

export interface WeightEntry {
  readonly key: string;
  readonly weight: number;
}

/**
 * Parsea `weights_jsonb` a un array ordenado de WeightEntry.
 *
 * Acepta varias formas razonables:
 *  - `{ "key": 0.4, "key2": 0.3 }`                     → {key, weight}[]
 *  - `[{ "key": "k", "weight": 0.4 }]`                 → pasthrough
 *  - `[{ "name": "k", "value": 0.4 }]`                 → {key:name, weight:value}
 *  - `{ components: { "k": 0.4 } }` / `{ weights: … }` → desanida
 *  - input inválido / null                             → [] vacío
 *
 * Los pesos no-numéricos o negativos se descartan. El orden final es
 * descendente por peso (más alto primero) y estable por key.
 */
export function parseWeightsJsonb(json: unknown): ReadonlyArray<WeightEntry> {
  const raw = unwrapContainer(json);
  const entries: WeightEntry[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const parsed = parseArrayItem(item);
      if (parsed) entries.push(parsed);
    }
  } else if (isRecord(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      const weight = toFiniteNumber(value);
      if (weight !== null && weight >= 0 && key.length > 0) {
        entries.push({ key, weight });
      }
    }
  }

  return sortEntries(entries);
}

/**
 * Resuelve la metodología activa para una fecha dada.
 *
 * Regla: la fila activa es aquella cuyo `effective_from <= today` y
 * (`effective_to` es null o `effective_to >= today`). Si hay múltiples
 * candidatas (nunca debería pero defensivo), se toma la de `effective_from`
 * más reciente. Si ninguna aplica, devuelve null.
 *
 * `today` debe ser ISO `YYYY-MM-DD`. Comparación lexicográfica funciona para
 * ISO dates.
 */
export function resolveActiveMethodology<T extends MethodologyRow>(
  versions: ReadonlyArray<T>,
  today: string,
): T | null {
  let best: T | null = null;
  for (const row of versions) {
    if (row.effective_from > today) continue;
    if (row.effective_to !== null && row.effective_to < today) continue;
    if (best === null || row.effective_from > best.effective_from) {
      best = row;
    }
  }
  return best;
}

/**
 * Agrupa las versiones por index_code preservando el orden original
 * (típicamente ya viene desc por effective_from desde el router).
 */
export function groupByIndexCode<T extends MethodologyRow>(
  versions: ReadonlyArray<T>,
): ReadonlyMap<string, ReadonlyArray<T>> {
  const map = new Map<string, T[]>();
  for (const row of versions) {
    const existing = map.get(row.index_code);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.index_code, [row]);
    }
  }
  return map;
}

/**
 * Devuelve true si la fila está activa (effective_to === null o >= today).
 */
export function isActiveMethodology(row: MethodologyRow, today: string): boolean {
  if (row.effective_from > today) return false;
  if (row.effective_to === null) return true;
  return row.effective_to >= today;
}

/**
 * Normaliza pesos a porcentajes 0-100 relativos al total.
 * Útil cuando los pesos vienen como fracciones 0-1 o absolutos distintos.
 * Si total es 0, devuelve pesos crudos como 0.
 */
export function normalizeWeightsToPercent(
  entries: ReadonlyArray<WeightEntry>,
): ReadonlyArray<WeightEntry> {
  const total = entries.reduce((acc, e) => acc + e.weight, 0);
  if (total <= 0) {
    return entries.map((e) => ({ key: e.key, weight: 0 }));
  }
  return entries.map((e) => ({ key: e.key, weight: (e.weight / total) * 100 }));
}

// ---------- internal ----------

function unwrapContainer(value: unknown): unknown {
  if (isRecord(value)) {
    if ('components' in value) return value.components;
    if ('weights' in value) return value.weights;
  }
  return value;
}

function parseArrayItem(item: unknown): WeightEntry | null {
  if (!isRecord(item)) return null;
  const keyCandidate = item.key ?? item.name ?? item.component ?? item.id;
  const weightCandidate = item.weight ?? item.value ?? item.w;
  if (typeof keyCandidate !== 'string' || keyCandidate.length === 0) return null;
  const weight = toFiniteNumber(weightCandidate);
  if (weight === null || weight < 0) return null;
  return { key: keyCandidate, weight };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortEntries(entries: ReadonlyArray<WeightEntry>): ReadonlyArray<WeightEntry> {
  return [...entries].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.key.localeCompare(b.key);
  });
}
