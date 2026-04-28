import { TRPCError } from '@trpc/server';
import { getPortalAdapter } from '@/features/marketing/lib/portals';
import {
  configurePortalInput,
  getPortalStatusInput,
  listPortalConfigsInput,
  listPublicationsInput,
  publishToPortalInput,
} from '@/features/marketing/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const PORTAL_FIELDS = 'id, user_id, portal, is_active, last_sync_at, created_at, updated_at';
const PUBLICATION_FIELDS =
  'id, user_id, project_id, portal, status, external_id, error_message, created_at, published_at';

export const portalsRouter = router({
  list: authenticatedProcedure.input(listPortalConfigsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('marketing_portales')
      .select(PORTAL_FIELDS)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  configure: authenticatedProcedure.input(configurePortalInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();

    const adapter = getPortalAdapter(input.portal);
    const validation = await adapter.validateCredentials(input.credentials);
    if (!validation.valid) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: validation.error ?? 'Credentials invalid',
      });
    }

    const credentialsJson = JSON.stringify(input.credentials);
    const { data: encryptedRow, error: encErr } = await supabase.rpc('encrypt_secret', {
      p_plaintext: credentialsJson,
    });
    if (encErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: encErr.message });

    const { data, error } = await supabase
      .from('marketing_portales')
      .upsert(
        {
          user_id: ctx.user.id,
          portal: input.portal,
          credentials_encrypted: encryptedRow,
          is_active: input.isActive,
        },
        { onConflict: 'user_id,portal' },
      )
      .select(PORTAL_FIELDS)
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data;
  }),

  publish: authenticatedProcedure.input(publishToPortalInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project, error: projErr } = await supabase
      .from('proyectos')
      .select('id, nombre, description, country_code, ciudad, colonia, units_total')
      .eq('id', input.projectId)
      .maybeSingle();
    if (projErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: projErr.message });
    if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });

    const { data: config, error: cfgErr } = await supabase
      .from('marketing_portales')
      .select('credentials_encrypted, is_active')
      .eq('user_id', ctx.user.id)
      .eq('portal', input.portal)
      .maybeSingle();
    if (cfgErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: cfgErr.message });
    if (!config?.is_active || !config.credentials_encrypted) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Portal credentials not configured. Configure via portals.configure first.',
      });
    }

    const { data: decrypted, error: decErr } = await supabase.rpc('decrypt_secret', {
      p_ciphertext: config.credentials_encrypted,
    });
    if (decErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: decErr.message });

    const credentials = JSON.parse(decrypted as string) as Record<string, string>;
    const adapter = getPortalAdapter(input.portal);

    const { data: pub } = await supabase
      .from('marketing_publications')
      .insert({
        user_id: ctx.user.id,
        project_id: input.projectId,
        portal: input.portal,
        status: 'pending',
      })
      .select(PUBLICATION_FIELDS)
      .single();

    try {
      const result = await adapter.publish({ project, credentials });
      await supabase
        .from('marketing_publications')
        .update({
          status: 'published',
          external_id: result.externalId,
          published_at: new Date().toISOString(),
        })
        .eq('id', pub?.id ?? '');
      return { success: true, externalId: result.externalId, url: result.url };
    } catch (err) {
      await supabase
        .from('marketing_publications')
        .update({
          status: 'error',
          error_message: err instanceof Error ? err.message : 'publish failed',
        })
        .eq('id', pub?.id ?? '');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'publish failed',
      });
    }
  }),

  getStatus: authenticatedProcedure.input(getPortalStatusInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('marketing_portales')
      .select(PORTAL_FIELDS)
      .eq('user_id', ctx.user.id)
      .eq('portal', input.portal)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? null;
  }),

  listPublications: authenticatedProcedure
    .input(listPublicationsInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('marketing_publications')
        .select(PUBLICATION_FIELDS)
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(input.limit);
      if (input.projectId) query = query.eq('project_id', input.projectId);
      if (input.portal) query = query.eq('portal', input.portal);

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),
});
