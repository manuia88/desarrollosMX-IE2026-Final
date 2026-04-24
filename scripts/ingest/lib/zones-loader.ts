/**
 * Zones loader — helpers para ingest/seed de public.zones desde content/zones/.
 *
 * Responsabilidades:
 *   - UUID v5 determinístico (namespace DMX_ZONES_NAMESPACE)
 *   - Walk recursivo de content/zones y parseo de single + nested files
 *   - Validación Zod vía zoneEntrySchema
 *   - Sort topológico por admin_level (country=2 primero)
 *   - Upsert por chunks con onConflict (country_code, scope_type, scope_id)
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type ZoneCountryCode,
  type ZoneEntry,
  type ZoneScopeType,
  zoneEntrySchema,
  zoneNestedFileSchema,
} from '../../../shared/schemas/zones.ts';
import type { Database, Json } from '../../../shared/types/database.ts';

/**
 * Namespace UUID v5 DMX — hardcoded constant.
 * NO CAMBIAR — cambiar este valor invalida todos los IDs ya persistidos.
 */
export const DMX_ZONES_NAMESPACE = 'f7e9c4a8-6b2d-4e5f-9a1c-8d3b2e7f6c5a';

/**
 * UUID v5 nativo (RFC 4122 §4.3). Usa SHA-1 sobre namespace_bytes ++ name_bytes.
 * Zero dep externa — crypto.createHash('sha1') cubre node 18+.
 */
function uuidv5(name: string, namespace: string): string {
  const nsBytes = parseUuid(namespace);
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1').update(nsBytes).update(nameBytes).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  const b6 = bytes[6] ?? 0;
  const b8 = bytes[8] ?? 0;
  bytes[6] = (b6 & 0x0f) | 0x50;
  bytes[8] = (b8 & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function parseUuid(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }
  return Buffer.from(hex, 'hex');
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const CHUNK_SIZE = 100;

// Archivos excluidos del walk recursivo (no son entries de zonas)
const EXCLUDED_FILENAMES = new Set<string>(['schema.json']);

export type ZonesBatchSummary = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

/**
 * Genera un UUID v5 determinístico a partir de (countryCode, scopeType, scopeId).
 *
 * Invariantes:
 *   - Mismo input → mismo UUID, siempre.
 *   - Cambiar cualquier componente → UUID distinto.
 *   - Namespace fijo = DMX_ZONES_NAMESPACE.
 */
export function generateZoneId(
  countryCode: ZoneCountryCode | string,
  scopeType: ZoneScopeType | string,
  scopeId: string,
): string {
  const name = `${countryCode}:${scopeType}:${scopeId}`;
  return uuidv5(name, DMX_ZONES_NAMESPACE);
}

/**
 * Walk recursivo de `contentRoot`. Parsea cada archivo JSON encontrado:
 *   - Si contiene `{alcaldia, colonias}` → flatten a alcaldía + colonias.
 *   - Sino → single entry.
 *
 * Cada entry se valida con zoneEntrySchema; errores se propagan como ZodError
 * envueltos con el path del archivo que los originó.
 */
export async function loadAllZonesFromContent(contentRoot: string): Promise<ZoneEntry[]> {
  const jsonFiles = await walkJsonFiles(contentRoot);
  const all: ZoneEntry[] = [];

  for (const filePath of jsonFiles) {
    const raw = await fs.readFile(filePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[zones-loader] JSON inválido en ${filePath}: ${msg}`);
    }

    // Discriminamos por presencia de las keys de nested file
    if (isNestedShape(parsed)) {
      const nested = safeParseNested(parsed, filePath);
      all.push(nested.alcaldia);
      for (const colonia of nested.colonias) {
        all.push(colonia);
      }
    } else {
      const entry = safeParseEntry(parsed, filePath);
      all.push(entry);
    }
  }

  return all;
}

/**
 * Ordena el array in-place-safe por admin_level ascendente
 * (country=2 primero, neighborhood=10 último). Dentro del mismo nivel,
 * ordena alfabéticamente por scope_id para determinismo reproducible.
 */
export function topologicalSort(zones: ZoneEntry[]): ZoneEntry[] {
  return [...zones].sort((a, b) => {
    const levelDiff = a.metadata.admin_level - b.metadata.admin_level;
    if (levelDiff !== 0) return levelDiff;
    return a.scope_id.localeCompare(b.scope_id);
  });
}

type ZonesInsertRow = Database['public']['Tables']['zones']['Insert'];

/**
 * Upsert de zonas en chunks de 100. Genera el `id` determinísticamente vía
 * `generateZoneId`; usa onConflict (country_code, scope_type, scope_id) para
 * idempotencia. Retorna contadores + errores no-fatales.
 *
 * Nota: el cliente Supabase no expone contadores inserted vs updated en upsert.
 * Estrategia:
 *   1. SELECT previo por claves (country_code, scope_type, scope_id) para
 *      identificar filas existentes.
 *   2. Upsert en chunks.
 *   3. Calcular inserted = total - existing_count.
 */
export async function seedZonesBatch(
  supabase: SupabaseClient<Database>,
  zones: ZoneEntry[],
  _runId?: string,
): Promise<ZonesBatchSummary> {
  const summary: ZonesBatchSummary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  if (zones.length === 0) return summary;

  // Validación orphans — parent_scope_id debe resolverse dentro del mismo batch
  // o ser null. Si no resuelve, se registra como error no-fatal.
  const scopeIds = new Set(zones.map((z) => z.scope_id));
  for (const z of zones) {
    if (z.parent_scope_id != null && !scopeIds.has(z.parent_scope_id)) {
      summary.errors.push(
        `[zones-loader] huérfano: ${z.scope_id} referencia parent_scope_id=${z.parent_scope_id} que no existe en el batch`,
      );
    }
  }

  // Identificar filas ya existentes para contabilizar inserted vs updated
  const existing = new Set<string>();
  const keyChunks = chunk(zones, CHUNK_SIZE);
  for (const batch of keyChunks) {
    const countryCodes = Array.from(new Set(batch.map((z) => z.country_code)));
    const scopeTypes = Array.from(new Set(batch.map((z) => z.scope_type)));
    const ids = batch.map((z) => z.scope_id);
    const { data, error } = await supabase
      .from('zones')
      .select('country_code, scope_type, scope_id')
      .in('country_code', countryCodes)
      .in('scope_type', scopeTypes)
      .in('scope_id', ids);

    if (error) {
      summary.errors.push(`[zones-loader] select existing failed: ${error.message}`);
      continue;
    }
    for (const row of data ?? []) {
      existing.add(`${row.country_code}|${row.scope_type}|${row.scope_id}`);
    }
  }

  // Upsert chunks
  const rows: ZonesInsertRow[] = zones.map((z) => toInsertRow(z));
  const rowChunks = chunk(rows, CHUNK_SIZE);
  let upserted = 0;
  for (const batch of rowChunks) {
    const { error, count } = await supabase.from('zones').upsert(batch, {
      onConflict: 'country_code,scope_type,scope_id',
      count: 'exact',
    });
    if (error) {
      summary.errors.push(`[zones-loader] upsert failed: ${error.message}`);
      continue;
    }
    upserted += count ?? batch.length;
  }

  const existingCount = zones.filter((z) =>
    existing.has(`${z.country_code}|${z.scope_type}|${z.scope_id}`),
  ).length;
  summary.updated = existingCount;
  summary.inserted = Math.max(0, upserted - existingCount);

  return summary;
}

// -------------------- helpers internos --------------------

async function walkJsonFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current == null) break;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        if (EXCLUDED_FILENAMES.has(entry.name)) continue;
        out.push(full);
      }
    }
  }
  return out.sort();
}

function isNestedShape(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return 'alcaldia' in obj && 'colonias' in obj;
}

function safeParseEntry(value: unknown, filePath: string): ZoneEntry {
  const result = zoneEntrySchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `[zones-loader] ZodError en ${filePath}: ${JSON.stringify(result.error.issues)}`,
    );
  }
  return result.data;
}

function safeParseNested(
  value: unknown,
  filePath: string,
): { alcaldia: ZoneEntry; colonias: ZoneEntry[] } {
  const result = zoneNestedFileSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `[zones-loader] ZodError (nested) en ${filePath}: ${JSON.stringify(result.error.issues)}`,
    );
  }
  return result.data;
}

function toInsertRow(z: ZoneEntry): ZonesInsertRow {
  const id = generateZoneId(z.country_code, z.scope_type, z.scope_id);
  const row: ZonesInsertRow = {
    id,
    country_code: z.country_code,
    scope_type: z.scope_type,
    scope_id: z.scope_id,
    name_es: z.name_es,
    name_en: z.name_en,
    name_pt: z.name_pt ?? null,
    parent_scope_id: z.parent_scope_id ?? null,
    lat: z.lat ?? null,
    lng: z.lng ?? null,
    area_km2: z.area_km2 ?? null,
    population: z.population ?? null,
    metadata: z.metadata as unknown as Json,
  };
  return row;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
