// D10 FASE 09 — admin endpoint score dependency tree.
// GET /api/admin/scores/dependencies/:scoreId → { tree, mermaid, summary }.
// Protegido por is_superadmin().

import { NextResponse } from 'next/server';
import {
  exportScoreLineageMermaid,
  getScoreLineage,
} from '@/shared/lib/intelligence-engine/cascades/score-lineage';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ scoreId: string }> }) {
  const supabase = await createClient();
  const { data: isSuper, error } = await supabase.rpc('is_superadmin');
  if (error || !isSuper) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { scoreId } = await params;
  const tree = getScoreLineage(scoreId);
  if (!tree) {
    return NextResponse.json({ error: 'score_not_found', scoreId }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    tree,
    mermaid: exportScoreLineageMermaid(scoreId),
  });
}
