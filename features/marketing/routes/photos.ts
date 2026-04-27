import { TRPCError } from '@trpc/server';
import { classifyPhoto } from '@/features/marketing/lib/photo-classify';
import {
  classifyPhotoInput,
  deletePhotoInput,
  listPhotosByProjectInput,
  listPhotosByUserInput,
  uploadPhotoInput,
} from '@/features/marketing/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const FIELDS =
  'id, user_id, proyecto_id, captacion_id, storage_path, url, mime_type, file_size_bytes, category, classify_confidence, classify_status, classify_error, display_order, created_at, updated_at';

export const photosRouter = router({
  upload: authenticatedProcedure.input(uploadPhotoInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('photos')
      .insert({
        user_id: ctx.user.id,
        storage_path: input.storagePath,
        url: input.url ?? null,
        mime_type: input.mimeType ?? null,
        file_size_bytes: input.fileSizeBytes ?? null,
        proyecto_id: input.proyectoId ?? null,
        captacion_id: input.captacionId ?? null,
        display_order: input.displayOrder,
        classify_status: 'pending',
      })
      .select(FIELDS)
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data;
  }),

  classify: authenticatedProcedure.input(classifyPhotoInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: photo, error: getErr } = await supabase
      .from('photos')
      .select('id, user_id, url, storage_path')
      .eq('id', input.photoId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (getErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: getErr.message });
    if (!photo) throw new TRPCError({ code: 'NOT_FOUND' });

    const imageUrl = photo.url;
    if (!imageUrl) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'photo.url required for classify',
      });
    }

    try {
      const result = await classifyPhoto({ imageUrl });
      const { data, error } = await supabase
        .from('photos')
        .update({
          category: result.category,
          classify_confidence: result.confidence,
          classify_status: 'done',
          classify_error: null,
        })
        .eq('id', input.photoId)
        .select(FIELDS)
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    } catch (err) {
      await supabase
        .from('photos')
        .update({
          classify_status: 'error',
          classify_error: err instanceof Error ? err.message : 'unknown classify error',
        })
        .eq('id', input.photoId);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'classify failed',
      });
    }
  }),

  listByProject: authenticatedProcedure
    .input(listPhotosByProjectInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('photos')
        .select(FIELDS)
        .eq('user_id', ctx.user.id)
        .eq('proyecto_id', input.proyectoId)
        .order('display_order', { ascending: true })
        .limit(input.limit);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  listByUser: authenticatedProcedure.input(listPhotosByUserInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('photos')
      .select(FIELDS)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (input.classifyStatus) query = query.eq('classify_status', input.classifyStatus);

    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  delete: authenticatedProcedure.input(deletePhotoInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', input.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return { success: true };
  }),
});
