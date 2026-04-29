// STUB endpoint REST 15.H.3 B.5 BI Export Enterprise tier
// PM pre-registro — handler real CC-A cierre OLA 4
// Auth: API key Bearer prefix dmxe_*. Rate limit 100K/day.
// Formats: powerbi/tableau/looker/csv/xlsx
// Entity: units/leads/operations/campaigns/all
// Vista: v_bi_export_developer (shipped commit 5315304)

import { NextResponse } from 'next/server';

export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!apiKey?.startsWith('dmxe_')) {
    return NextResponse.json({ error: 'unauthorized', stub: true }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      'STUB FASE 15 ola 4 cierre — implementación real CC-A: query v_bi_export_developer + format converter Power BI/Tableau/Looker/CSV/XLSX',
    timestamp: new Date().toISOString(),
  });
}
