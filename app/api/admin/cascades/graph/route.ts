// F1 — Cascade dependency graph admin endpoint.
// Protegido por is_superadmin() (ADR-009 §D2).
// Retorna { mermaid, json, summary } para portal admin + debugging.

import { NextResponse } from 'next/server';
import {
  exportGraphJson,
  exportSequenceMermaid,
  summarizeGraph,
} from '@/shared/lib/intelligence-engine/cascades/dependency-graph';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: isSuper, error } = await supabase.rpc('is_superadmin');
  if (error || !isSuper) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    summary: summarizeGraph(),
    mermaid: exportSequenceMermaid(),
    json: exportGraphJson(),
  });
}
