import { createAdminClient } from '@/shared/lib/supabase/admin';

// Provenance formal por dataset output. Soporta Constitutional AI GC-7:
// source_span guarda página + texto literal cuando un LLM extrae un campo
// estructurado desde PDF.

export interface LineageEntry {
  runId: string;
  source: string;
  destinationTable: string;
  destinationPk?: string;
  upstreamUrl?: string;
  upstreamHash?: string;
  transformation?: string;
  confidence?: number;
  sourceSpan?: Record<string, unknown>;
}

export async function recordLineage(entries: LineageEntry | LineageEntry[]): Promise<void> {
  const arr = Array.isArray(entries) ? entries : [entries];
  if (arr.length === 0) return;
  const supabase = createAdminClient();
  await supabase.from('data_lineage').insert(
    arr.map((e) => ({
      run_id: e.runId,
      source: e.source,
      destination_table: e.destinationTable,
      destination_pk: e.destinationPk ?? null,
      upstream_url: e.upstreamUrl ?? null,
      upstream_hash: e.upstreamHash ?? null,
      transformation: e.transformation ?? null,
      confidence: e.confidence ?? null,
      source_span: (e.sourceSpan ?? null) as never,
    })),
  );
}
