// FASE 14.F.3 Sprint 2 BIBLIA — Library router (Tarea 2.4).
// Lista videos del asesor, filtros, bulk download/share, delete, cross-link
// galería pública (Sprint 7 STUB).

import { TRPCError } from '@trpc/server';
import {
  bulkLibraryActionInput,
  deleteLibraryVideoInput,
  listLibraryInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

const VIDEO_OUTPUTS_BUCKET = 'studio-outputs';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function dateRangeToIsoStart(range: '7d' | '30d' | '90d' | 'all'): string | null {
  if (range === 'all') return null;
  const now = Date.now();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export const studioLibraryRouter = router({
  list: studioProcedure.input(listLibraryInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('studio_video_outputs')
      .select(
        'id, project_id, hook_variant, format, storage_url, thumbnail_url, duration_seconds, size_bytes, render_status, is_branded, has_beat_sync, has_branding_overlay, selected_by_user, created_at, studio_video_projects!project_id(id, title, project_type, status)',
      )
      .eq('user_id', ctx.user.id)
      .eq('render_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(input.limit);

    if (input.format) query = query.eq('format', input.format);

    const since = dateRangeToIsoStart(input.dateRange);
    if (since) query = query.gte('created_at', since);

    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

    const filtered = (data ?? []).filter((row) => {
      const projectShape = Array.isArray(row.studio_video_projects)
        ? row.studio_video_projects[0]
        : row.studio_video_projects;
      if (input.projectType && projectShape?.project_type !== input.projectType) return false;
      if (input.search) {
        const title = projectShape?.title?.toLowerCase() ?? '';
        if (!title.includes(input.search.toLowerCase())) return false;
      }
      return true;
    });

    return filtered;
  }),

  bulkSignedUrls: studioProcedure.input(bulkLibraryActionInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: outputs, error } = await supabase
      .from('studio_video_outputs')
      .select('id, storage_url')
      .in('id', input.videoOutputIds)
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

    const result: Array<{ id: string; signedUrl: string | null; storagePath: string }> = [];
    for (const row of outputs ?? []) {
      const { data: signed } = await supabase.storage
        .from(VIDEO_OUTPUTS_BUCKET)
        .createSignedUrl(row.storage_url, SIGNED_URL_TTL_SECONDS);
      result.push({
        id: row.id,
        signedUrl: signed?.signedUrl ?? null,
        storagePath: row.storage_url,
      });
    }
    return { items: result };
  }),

  bulkShareMessage: studioProcedure
    .input(bulkLibraryActionInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: outputs, error } = await supabase
        .from('studio_video_outputs')
        .select('id, storage_url, hook_variant, format, project_id')
        .in('id', input.videoOutputIds)
        .eq('user_id', ctx.user.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

      const lines: string[] = ['Te comparto videos generados con DMX Studio:', ''];
      for (const row of outputs ?? []) {
        const { data: signed } = await supabase.storage
          .from(VIDEO_OUTPUTS_BUCKET)
          .createSignedUrl(row.storage_url, SIGNED_URL_TTL_SECONDS);
        if (signed?.signedUrl) {
          lines.push(`- ${row.hook_variant} (${row.format}): ${signed.signedUrl}`);
        }
      }
      return { whatsappMessage: lines.join('\n'), count: outputs?.length ?? 0 };
    }),

  delete: studioProcedure.input(deleteLibraryVideoInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: row } = await supabase
      .from('studio_video_outputs')
      .select('id, storage_url')
      .eq('id', input.videoOutputId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
    if (row.storage_url) {
      await supabase.storage.from(VIDEO_OUTPUTS_BUCKET).remove([row.storage_url]);
    }
    const { error } = await supabase.from('studio_video_outputs').delete().eq('id', row.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { ok: true };
  }),

  countByUser: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('studio_video_outputs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('render_status', 'completed');
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { count: count ?? 0 };
  }),
});
