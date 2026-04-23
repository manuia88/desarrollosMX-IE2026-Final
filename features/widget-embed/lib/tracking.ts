// Best-effort views_count increment para widget_embed_registry.
// No bloquea el render del widget — silently swallows errors.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface EmbedView {
  readonly scopeType: 'colonia' | 'alcaldia' | 'city' | 'estado';
  readonly scopeId: string;
  readonly embedId?: string | undefined;
}

function safeAdmin(): ReturnType<typeof createAdminClient> | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function trackEmbedView(view: EmbedView): Promise<void> {
  const admin = safeAdmin();
  if (!admin) return;

  if (!view.embedId) return;

  try {
    const { data: row } = await admin
      .from('widget_embed_registry')
      .select('id, views_count')
      .eq('embed_id', view.embedId)
      .eq('active', true)
      .maybeSingle();

    if (!row) return;

    await admin
      .from('widget_embed_registry')
      .update({ views_count: (row.views_count ?? 0) + 1 })
      .eq('id', row.id);
  } catch {
    // Silencio intencional: tracking nunca debe romper la experiencia.
  }
}
