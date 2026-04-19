import { createAdminClient } from '@/shared/lib/supabase/admin';

// FASE 07b / BLOQUE 7b.O — Training corpus exporter (H3 seed).
//
// Job mensual: materializa features desde str_* + zone_scores (cuando exista)
// en JSONL, sube a Supabase Storage bucket ml-corpus/ + registra snapshot.
// Formato preferido es Parquet; como primer iteración se emite JSONL por
// simplicidad (Parquet requiere native writer + node-parquet binding).
//
// Ejecución: cron `ml_corpus_monthly` (plan §7b.O.1.2) — invoca via Vercel
// function 1× al mes (periodicidad='monthly'). Costo de ejecución: I/O
// Supabase storage + compute de Query, ~$0 adicional.

export interface ExportSnapshotOptions {
  readonly corpusName: string;
  readonly version: string; // convención "vYYYYMMDD".
  readonly countryCode?: string | undefined;
  readonly periodStart?: string | undefined;
  readonly periodEnd?: string | undefined;
  readonly limit?: number | undefined;
  readonly createdByUserId?: string | undefined;
}

export interface ExportSnapshotResult {
  readonly corpus_name: string;
  readonly version: string;
  readonly row_count: number;
  readonly schema_hash: string;
  readonly storage_path: string;
  readonly id: string;
}

export async function exportStrTrainingSnapshot(
  opts: ExportSnapshotOptions,
): Promise<ExportSnapshotResult> {
  const supabase = createAdminClient();

  // Query feature view: listings + monthly aggregates + sentiment-labeled reviews
  // (subset con ground truth). H3 training supervisado arranca aquí.
  const { data: listings } = await supabase
    .from('str_listings')
    .select(
      'platform, listing_id, country_code, market_id, bedrooms, bathrooms, capacity, property_type, superhost, professional_management, h3_r8',
    )
    .eq('country_code', opts.countryCode ?? 'MX')
    .limit(opts.limit ?? 50_000);

  const { data: snapshots } = await supabase
    .from('str_monthly_snapshots')
    .select('platform, listing_id, period, occupancy_rate, adr_minor, revpar_minor, revenue_minor')
    .gte('period', opts.periodStart ?? '2025-01-01')
    .lte('period', opts.periodEnd ?? new Date().toISOString().slice(0, 10))
    .limit(opts.limit ?? 500_000);

  // Schema hash: representación determinista de columnas exportadas.
  const schemaCols = [
    'listing_id',
    'platform',
    'country_code',
    'bedrooms',
    'bathrooms',
    'capacity',
    'property_type',
    'superhost',
    'professional_management',
    'h3_r8',
    'period',
    'occupancy_rate',
    'adr_minor',
    'revpar_minor',
    'revenue_minor',
    'split', // ml_deterministic_split
  ];
  const schemaHash = await sha256Hex(JSON.stringify(schemaCols));

  // Build JSONL: una línea por (listing × period). Deduplica por hash(listing_id)
  // split determinista al cargar entrenamiento (no se emite aquí; se computa
  // con ml_deterministic_split() en la BD cuando el trainer consume).
  const jsonl = (snapshots ?? [])
    .map((s) => {
      const listing = (listings ?? []).find(
        (l) => l.platform === s.platform && l.listing_id === s.listing_id,
      );
      return JSON.stringify({
        platform: s.platform,
        listing_id: s.listing_id,
        period: s.period,
        occupancy_rate: s.occupancy_rate,
        adr_minor: s.adr_minor,
        revpar_minor: s.revpar_minor,
        revenue_minor: s.revenue_minor,
        bedrooms: listing?.bedrooms ?? null,
        bathrooms: listing?.bathrooms ?? null,
        capacity: listing?.capacity ?? null,
        property_type: listing?.property_type ?? null,
        superhost: listing?.superhost ?? null,
        professional_management: listing?.professional_management ?? null,
        h3_r8: listing?.h3_r8 ?? null,
        country_code: listing?.country_code ?? null,
      });
    })
    .join('\n');

  const storagePath = `ml-corpus/${opts.corpusName}/${opts.version}/full.jsonl`;

  const uploadRes = await supabase.storage
    .from('ml-corpus')
    .upload(`${opts.corpusName}/${opts.version}/full.jsonl`, jsonl, {
      contentType: 'application/x-ndjson',
      upsert: true,
    });
  if (uploadRes.error) {
    throw new Error(`ml-corpus upload failed: ${uploadRes.error.message}`);
  }

  const insertMeta: Record<string, unknown> = {
    corpus_name: opts.corpusName,
    version: opts.version,
    schema_hash: schemaHash,
    row_count: snapshots?.length ?? 0,
    storage_path: storagePath,
    format: 'jsonl' as const,
    split: 'full' as const,
    country_code: opts.countryCode ?? null,
    period_start: opts.periodStart ?? null,
    period_end: opts.periodEnd ?? null,
    created_by: opts.createdByUserId ?? null,
  };

  const { data: snapshotRow, error: insertErr } = await supabase
    .from('ml_training_snapshots')
    .insert(insertMeta as never)
    .select('id')
    .single();
  if (insertErr || !snapshotRow) {
    throw new Error(`ml_training_snapshots insert failed: ${insertErr?.message}`);
  }

  return {
    corpus_name: opts.corpusName,
    version: opts.version,
    row_count: snapshots?.length ?? 0,
    schema_hash: schemaHash,
    storage_path: storagePath,
    id: snapshotRow.id,
  };
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
