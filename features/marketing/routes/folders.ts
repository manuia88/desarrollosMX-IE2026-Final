import { TRPCError } from '@trpc/server';
import {
  addProjectInput,
  createFolderInput,
  deleteFolderInput,
  getPublicGalleryInput,
  listFoldersInput,
  removeProjectInput,
  updateFolderInput,
} from '@/features/marketing/schemas';
import { publicProcedure, router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

type ClientFoldersUpdate = Database['public']['Tables']['client_folders']['Update'];

const FIELDS =
  'id, user_id, cliente_contacto_id, title, description, slug, is_active, created_at, updated_at';

export const foldersRouter = router({
  list: authenticatedProcedure.input(listFoldersInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('client_folders')
      .select(FIELDS)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (input.onlyActive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  create: authenticatedProcedure.input(createFolderInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('client_folders')
      .insert({
        user_id: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        slug: input.slug,
        cliente_contacto_id: input.clienteContactoId ?? null,
        is_active: true,
      })
      .select(FIELDS)
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Slug ya existe en otro folder.' });
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data;
  }),

  update: authenticatedProcedure.input(updateFolderInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const patch: ClientFoldersUpdate = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await supabase
      .from('client_folders')
      .update(patch)
      .eq('id', input.id)
      .eq('user_id', ctx.user.id)
      .select(FIELDS)
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),

  addProject: authenticatedProcedure.input(addProjectInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: owns } = await supabase
      .from('client_folders')
      .select('id')
      .eq('id', input.folderId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!owns) throw new TRPCError({ code: 'NOT_FOUND' });

    const { error } = await supabase.from('folder_projects').insert({
      folder_id: input.folderId,
      project_id: input.projectId,
      sort_order: input.sortOrder,
    });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return { success: true };
  }),

  removeProject: authenticatedProcedure
    .input(removeProjectInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: owns } = await supabase
        .from('client_folders')
        .select('id')
        .eq('id', input.folderId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!owns) throw new TRPCError({ code: 'NOT_FOUND' });

      const { error } = await supabase
        .from('folder_projects')
        .delete()
        .eq('folder_id', input.folderId)
        .eq('project_id', input.projectId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),

  getPublicGallery: publicProcedure.input(getPublicGalleryInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: folder, error } = await supabase
      .from('client_folders')
      .select(FIELDS)
      .eq('slug', input.slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    if (!folder) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data: links, error: linksErr } = await supabase
      .from('folder_projects')
      .select('project_id, sort_order')
      .eq('folder_id', folder.id)
      .order('sort_order', { ascending: true });
    if (linksErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: linksErr.message });

    return { folder, projectIds: (links ?? []).map((l) => l.project_id) };
  }),

  delete: authenticatedProcedure.input(deleteFolderInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('client_folders')
      .delete()
      .eq('id', input.id)
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return { success: true };
  }),
});
