// FASE 15.H.3 B.5 — BI Export real handler
// Auth: API key Bearer dmxe_*. Scope: bi:export. Rate limit: 100K/day por key.
// Source: v_bi_export_developer (shipped commit 5315304).
// Formats: powerbi/tableau/looker/csv/xlsx. Entity: units|leads|operations|campaigns|all.

import { NextResponse } from 'next/server';
import {
  EXPORT_ENTITIES,
  EXPORT_FORMATS,
  type ExportEntity,
  type ExportFormat,
  type ExportPayload,
  formatExport,
} from '@/shared/lib/exports';
import { authenticateApiKey } from '@/shared/lib/moonshots/api-keys';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const maxDuration = 300;

function isFormat(value: string | null): value is ExportFormat {
  return !!value && (EXPORT_FORMATS as readonly string[]).includes(value);
}
function isEntity(value: string | null): value is ExportEntity {
  return !!value && (EXPORT_ENTITIES as readonly string[]).includes(value);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const formatParam = url.searchParams.get('format') ?? 'csv';
  const entityParam = url.searchParams.get('entity') ?? 'all';
  const rangeFrom = url.searchParams.get('from');
  const rangeTo = url.searchParams.get('to');

  if (!isFormat(formatParam)) {
    return NextResponse.json({ error: 'invalid_format', allowed: EXPORT_FORMATS }, { status: 400 });
  }
  if (!isEntity(entityParam)) {
    return NextResponse.json(
      { error: 'invalid_entity', allowed: EXPORT_ENTITIES },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const auth = await authenticateApiKey(
    supabase,
    request.headers.get('authorization'),
    'bi:export',
    `bi:${entityParam}`,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  // M11+ entities populated en vista v_bi_export_developer (proyecto-level units rollup).
  // FASE 16+ entities (leads/operations/campaigns) emiten array vacío con source=placeholder.
  let rows: ReadonlyArray<Record<string, string | number | boolean | null>> = [];
  let source: ExportPayload['source'] = 'placeholder';

  if (entityParam === 'units' || entityParam === 'all') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('desarrolladora_id')
      .eq('id', auth.profileId)
      .maybeSingle();
    if (profile?.desarrolladora_id) {
      let query = supabase
        .from('v_bi_export_developer')
        .select('*')
        .eq('desarrolladora_id', profile.desarrolladora_id);
      if (rangeFrom) query = query.gte('created_at', rangeFrom);
      if (rangeTo) query = query.lte('created_at', rangeTo);
      const { data: viewRows, error } = await query.limit(10000);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      rows = (viewRows ?? []) as ReadonlyArray<Record<string, string | number | boolean | null>>;
      source = 'v_bi_export_developer';
    }
  }

  const payload: ExportPayload = {
    entity: entityParam,
    rangeFrom,
    rangeTo,
    generatedAt: new Date().toISOString(),
    source,
    rows,
  };

  const formatted = formatExport(formatParam, payload);
  let body: BodyInit;
  if (typeof formatted.body === 'string') {
    body = formatted.body;
  } else {
    const buf = new ArrayBuffer(formatted.body.byteLength);
    new Uint8Array(buf).set(formatted.body);
    body = buf;
  }
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': formatted.contentType,
      'Content-Disposition': `attachment; filename="${formatted.filename}"`,
      'X-DMX-Export-Source': source,
      'X-DMX-Export-Rows': String(rows.length),
    },
  });
}
