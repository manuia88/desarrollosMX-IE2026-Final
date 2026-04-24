// Living Atlas seed script (BLOQUE 11.S).
// Genera contenido wiki para hasta 200 colonias CDMX vía Claude Haiku 4.5.
// Hard cap cost $3 USD. Aborta antes de batch si proyección > cap.
// Idempotente: salta colonias con versión publicada reciente.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   ANTHROPIC_API_KEY=... \
//   node --experimental-strip-types scripts/seed-living-atlas-wiki.ts [--dry-run] [--limit=N]
//
// Lee de: public.zona_snapshots (colonias MX con payload.name / payload.label).
// Escribe a: public.colonia_wiki_entries + public.zone_slugs (service_role).

import Anthropic from '@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ensureUniqueSlug, slugify } from '../features/atlas/lib/slugify';
import { WIKI_SECTION_KEYS, type WikiSectionKey } from '../features/atlas/types';
import type { DatabaseWithAtlasExt } from '../shared/lib/supabase/admin-ext';

const MODEL_ID = 'claude-haiku-4-5-20251001';
const MODEL_PRICING_KEY = 'claude-haiku-4-5';
const INPUT_PRICE_PER_MTOK = 0.8;
const OUTPUT_PRICE_PER_MTOK = 4.0;
const COST_CAP_USD = 3.0;
const ESTIMATED_INPUT_TOKENS_PER_COLONIA = 900;
const ESTIMATED_OUTPUT_TOKENS_PER_COLONIA = 2200;
const DEFAULT_TARGET_COLONIAS = 200;
const MAX_OUTPUT_TOKENS = 3500;
const SECTION_MIN_CHARS = 80;
const SECTION_MAX_CHARS = 1800;

const wikiSectionsOutputSchema = z.object({
  intro: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
  historia: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
  caracter: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
  transporte: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
  gastronomia: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
  vida_cultural: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
  seguridad_vida: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
  mercado_inmobiliario: z.string().min(SECTION_MIN_CHARS).max(SECTION_MAX_CHARS),
});

type WikiSectionsOutput = z.infer<typeof wikiSectionsOutputSchema>;

const SECTION_HEADINGS_ES: Readonly<Record<WikiSectionKey, string>> = Object.freeze({
  intro: 'Introducción',
  historia: 'Historia',
  caracter: 'Carácter',
  transporte: 'Transporte',
  gastronomia: 'Gastronomía',
  vida_cultural: 'Vida cultural',
  seguridad_vida: 'Seguridad y vida diaria',
  mercado_inmobiliario: 'Mercado inmobiliario',
});

interface SeedArgs {
  readonly dryRun: boolean;
  readonly limit: number;
}

interface ColoniaSource {
  readonly zone_id: string;
  readonly label: string;
  readonly alcaldia: string | null;
  readonly country_code: string;
}

interface SeedReport {
  processed: number;
  skipped: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
}

function parseArgs(argv: ReadonlyArray<string>): SeedArgs {
  let dryRun = false;
  let limit = DEFAULT_TARGET_COLONIAS;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) limit = Math.min(parsed, DEFAULT_TARGET_COLONIAS);
    }
  }
  return { dryRun, limit };
}

export function estimateBatchCostUsd(
  numColonias: number,
  inputTokensPer: number = ESTIMATED_INPUT_TOKENS_PER_COLONIA,
  outputTokensPer: number = ESTIMATED_OUTPUT_TOKENS_PER_COLONIA,
): number {
  const inputCost = (numColonias * inputTokensPer * INPUT_PRICE_PER_MTOK) / 1_000_000;
  const outputCost = (numColonias * outputTokensPer * OUTPUT_PRICE_PER_MTOK) / 1_000_000;
  return Number((inputCost + outputCost).toFixed(4));
}

interface ZonaSnapshotPayload {
  readonly name?: unknown;
  readonly label?: unknown;
  readonly alcaldia?: unknown;
  readonly municipio?: unknown;
}

function extractLabel(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as ZonaSnapshotPayload;
  if (typeof p.name === 'string' && p.name.trim().length > 0) return p.name.trim();
  if (typeof p.label === 'string' && p.label.trim().length > 0) return p.label.trim();
  return null;
}

function extractAlcaldia(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as ZonaSnapshotPayload;
  if (typeof p.alcaldia === 'string' && p.alcaldia.trim().length > 0) return p.alcaldia.trim();
  if (typeof p.municipio === 'string' && p.municipio.trim().length > 0) return p.municipio.trim();
  return null;
}

type SupabaseAdmin = SupabaseClient<DatabaseWithAtlasExt>;

async function fetchColoniaSources(
  client: SupabaseAdmin,
  limit: number,
): Promise<ReadonlyArray<ColoniaSource>> {
  const { data, error } = await client
    .from('zona_snapshots')
    .select('zone_id, country_code, payload, computed_at')
    .eq('country_code', 'MX')
    .order('computed_at', { ascending: false })
    .limit(limit * 3);
  if (error) throw new Error(`fetch zona_snapshots failed: ${error.message}`);
  const rows = (data ?? []) as ReadonlyArray<{
    zone_id: string;
    country_code: string;
    payload: unknown;
    computed_at: string;
  }>;

  const seen = new Set<string>();
  const sources: ColoniaSource[] = [];
  for (const row of rows) {
    if (seen.has(row.zone_id)) continue;
    const label = extractLabel(row.payload);
    if (!label) continue;
    seen.add(row.zone_id);
    sources.push({
      zone_id: row.zone_id,
      label,
      alcaldia: extractAlcaldia(row.payload),
      country_code: row.country_code,
    });
    if (sources.length >= limit) break;
  }
  return sources;
}

async function fetchExistingPublishedVersions(
  client: SupabaseAdmin,
  zoneIds: ReadonlyArray<string>,
): Promise<Map<string, number>> {
  if (zoneIds.length === 0) return new Map();
  const { data, error } = await client
    .from('colonia_wiki_entries')
    .select('colonia_id, version, published')
    .in('colonia_id', zoneIds)
    .eq('published', true);
  if (error) throw new Error(`fetch colonia_wiki_entries failed: ${error.message}`);
  const rows = (data ?? []) as ReadonlyArray<{
    colonia_id: string;
    version: number;
    published: boolean;
  }>;
  const out = new Map<string, number>();
  for (const row of rows) {
    const prev = out.get(row.colonia_id) ?? 0;
    if (row.version > prev) out.set(row.colonia_id, row.version);
  }
  return out;
}

async function fetchExistingSlugs(
  client: SupabaseAdmin,
): Promise<{ slugSet: Set<string>; zoneSlugs: Map<string, string> }> {
  const { data, error } = await client.from('zone_slugs').select('zone_id, slug');
  if (error) throw new Error(`fetch zone_slugs failed: ${error.message}`);
  const rows = (data ?? []) as ReadonlyArray<{ zone_id: string; slug: string }>;
  const slugSet = new Set<string>();
  const zoneSlugs = new Map<string, string>();
  for (const row of rows) {
    slugSet.add(row.slug);
    zoneSlugs.set(row.zone_id, row.slug);
  }
  return { slugSet, zoneSlugs };
}

export function buildSystemPrompt(): string {
  return [
    'Eres un editor especializado en guías urbanas de colonias mexicanas para un portal inmobiliario de alto rigor (DesarrollosMX).',
    'Escribes en español neutro mexicano, tono editorial pero cercano, sin clichés ni hype.',
    'Produces SOLO JSON válido conforme al schema solicitado. Zero preámbulo, zero postámbulo, zero markdown wrapper fuera del valor string.',
    'Cada sección debe tener entre 80 y 1800 caracteres. Usa markdown dentro de los strings (listas, negritas, enlaces) cuando aporta.',
    'Nunca inventes estadísticas específicas ni cifras que no puedas justificar; prefiere lenguaje descriptivo sobre numérico.',
  ].join(' ');
}

export function buildUserPrompt(colonia: ColoniaSource): string {
  const alcaldia = colonia.alcaldia ?? 'Ciudad de México';
  return [
    `Genera una entrada wiki para la colonia "${colonia.label}" (alcaldía ${alcaldia}, CDMX, México).`,
    'Devuelve JSON con exactamente estas 8 claves (string markdown):',
    '  intro — 2-3 párrafos de presentación general',
    '  historia — orígenes + desarrollo urbano + hitos culturales',
    '  caracter — atmósfera, perfil de residentes, estilo de vida',
    '  transporte — metro, metrobús, ciclovías, accesibilidad',
    '  gastronomia — mercados, street food, restaurantes destacados',
    '  vida_cultural — museos, galerías, parques, eventos recurrentes',
    '  seguridad_vida — percepción de seguridad y vida diaria (sin inventar cifras)',
    '  mercado_inmobiliario — perfil de oferta (renta/venta), tipología, rango cualitativo',
    'Responde ÚNICAMENTE el objeto JSON sin code fences.',
  ].join('\n');
}

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }
  throw new Error('LLM output did not contain JSON object');
}

export function assembleContentMd(sections: WikiSectionsOutput, label: string): string {
  const parts: string[] = [`# ${label}`, ''];
  for (const key of WIKI_SECTION_KEYS) {
    parts.push(`## ${SECTION_HEADINGS_ES[key]}`);
    parts.push('');
    parts.push(sections[key]);
    parts.push('');
  }
  return parts.join('\n').trim();
}

export function sectionsToJsonb(
  sections: WikiSectionsOutput,
): Record<string, { heading: string; content_md: string }> {
  const out: Record<string, { heading: string; content_md: string }> = {};
  for (const key of WIKI_SECTION_KEYS) {
    out[key] = {
      heading: SECTION_HEADINGS_ES[key],
      content_md: sections[key],
    };
  }
  return out;
}

async function generateSectionsForColonia(
  anthropic: Anthropic,
  colonia: ColoniaSource,
): Promise<{ sections: WikiSectionsOutput; inputTokens: number; outputTokens: number }> {
  const response = await anthropic.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserPrompt(colonia) }],
  });
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Anthropic response did not contain a text block');
  }
  const parsed = extractJsonPayload(textBlock.text);
  const sections = wikiSectionsOutputSchema.parse(parsed);
  return {
    sections,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function upsertWikiEntry(
  client: SupabaseAdmin,
  colonia: ColoniaSource,
  sections: WikiSectionsOutput,
  nextVersion: number,
): Promise<void> {
  const content_md = assembleContentMd(sections, colonia.label);
  const sectionsJsonb = sectionsToJsonb(sections);
  const { error } = await client.from('colonia_wiki_entries').upsert(
    {
      colonia_id: colonia.zone_id,
      version: nextVersion,
      content_md,
      sections: sectionsJsonb,
      edited_by: null,
      edited_at: new Date().toISOString(),
      reviewed: false,
      reviewed_by: null,
      published: true,
    },
    { onConflict: 'colonia_id,version' },
  );
  if (error)
    throw new Error(`upsert colonia_wiki_entries failed (${colonia.zone_id}): ${error.message}`);
}

async function upsertSlug(
  client: SupabaseAdmin,
  colonia: ColoniaSource,
  slug: string,
): Promise<void> {
  const { error } = await client.from('zone_slugs').upsert(
    {
      zone_id: colonia.zone_id,
      scope_type: 'colonia',
      slug,
      country_code: colonia.country_code,
      source_label: colonia.label,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'zone_id' },
  );
  if (error) throw new Error(`upsert zone_slugs failed (${colonia.zone_id}): ${error.message}`);
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
  }
  if (!anthropicKey && !args.dryRun) {
    throw new Error('ANTHROPIC_API_KEY required (or pass --dry-run)');
  }

  const supabase = createClient<DatabaseWithAtlasExt>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

  log(`[11.S seed] Fetching up to ${args.limit} colonias from zona_snapshots (MX)...`);
  const colonias = await fetchColoniaSources(supabase, args.limit);
  log(`[11.S seed] Resolved ${colonias.length} colonias with labels`);

  if (colonias.length === 0) {
    log('[11.S seed] No colonias con labels disponibles — nothing to seed');
    printReport({
      processed: 0,
      skipped: 0,
      failed: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: Date.now() - started,
    });
    return;
  }

  const existingVersions = await fetchExistingPublishedVersions(
    supabase,
    colonias.map((c) => c.zone_id),
  );
  const { slugSet, zoneSlugs } = await fetchExistingSlugs(supabase);

  const toProcess = colonias.filter((c) => !existingVersions.has(c.zone_id));
  const alreadyPublished = colonias.length - toProcess.length;
  log(
    `[11.S seed] ${toProcess.length} colonias pending (${alreadyPublished} already have published version)`,
  );

  const projectedCost = estimateBatchCostUsd(toProcess.length);
  log(
    `[11.S seed] Projected cost: $${projectedCost} USD (cap $${COST_CAP_USD}) | model=${MODEL_PRICING_KEY}`,
  );
  if (projectedCost > COST_CAP_USD) {
    throw new Error(
      `Projected cost $${projectedCost} exceeds cap $${COST_CAP_USD}. Abort. Reduce --limit or raise cap explicitly.`,
    );
  }

  if (args.dryRun) {
    log('[11.S seed] --dry-run: skipping LLM calls, printing first 3 prompts.');
    for (const colonia of toProcess.slice(0, 3)) {
      log(
        `\n--- ${colonia.label} (${colonia.alcaldia ?? 'CDMX'}) ---\n${buildUserPrompt(colonia)}\n`,
      );
    }
    printReport({
      processed: 0,
      skipped: alreadyPublished,
      failed: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs: Date.now() - started,
    });
    return;
  }

  if (!anthropic) throw new Error('anthropic client not initialized');

  const report: SeedReport = {
    processed: 0,
    skipped: alreadyPublished,
    failed: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    durationMs: 0,
  };

  for (let i = 0; i < toProcess.length; i += 1) {
    const colonia = toProcess[i];
    if (!colonia) continue;
    const progress = `[${i + 1}/${toProcess.length}]`;
    try {
      const { sections, inputTokens, outputTokens } = await generateSectionsForColonia(
        anthropic,
        colonia,
      );
      report.inputTokens += inputTokens;
      report.outputTokens += outputTokens;
      const runningCost =
        (report.inputTokens * INPUT_PRICE_PER_MTOK) / 1_000_000 +
        (report.outputTokens * OUTPUT_PRICE_PER_MTOK) / 1_000_000;
      report.costUsd = Number(runningCost.toFixed(4));

      if (report.costUsd > COST_CAP_USD) {
        log(`${progress} ABORT — running cost $${report.costUsd} breached cap $${COST_CAP_USD}`);
        break;
      }

      const existingVersion = existingVersions.get(colonia.zone_id) ?? 0;
      await upsertWikiEntry(supabase, colonia, sections, existingVersion + 1);

      const existingSlug = zoneSlugs.get(colonia.zone_id);
      const slug = existingSlug ?? ensureUniqueSlug(slugify(colonia.label), slugSet);
      if (!existingSlug) {
        slugSet.add(slug);
        zoneSlugs.set(colonia.zone_id, slug);
      }
      await upsertSlug(supabase, colonia, slug);

      report.processed += 1;
      log(
        `${progress} ${colonia.label} → slug=${slug} | tokens in/out=${inputTokens}/${outputTokens} | cost running=$${report.costUsd}`,
      );
    } catch (err) {
      report.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      log(`${progress} FAILED ${colonia.label} (${colonia.zone_id}): ${message}`);
    }
  }

  report.durationMs = Date.now() - started;
  printReport(report);
}

function printReport(report: SeedReport): void {
  const minutes = (report.durationMs / 60_000).toFixed(2);
  log('\n==================== SEED REPORT ====================');
  log(`Processed:      ${report.processed}`);
  log(`Skipped (exist): ${report.skipped}`);
  log(`Failed:         ${report.failed}`);
  log(`Input tokens:   ${report.inputTokens}`);
  log(`Output tokens:  ${report.outputTokens}`);
  log(`Cost USD:       $${report.costUsd.toFixed(4)} (cap $${COST_CAP_USD})`);
  log(`Duration:       ${minutes} min`);
  log('=====================================================\n');
}

const invokedDirectly = import.meta.url.endsWith(process.argv[1] ?? '');
if (invokedDirectly) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[11.S seed] fatal: ${message}\n`);
    process.exit(1);
  });
}
