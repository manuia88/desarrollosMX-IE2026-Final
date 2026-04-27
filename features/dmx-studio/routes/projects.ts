import { TRPCError } from '@trpc/server';
import {
  createStudioProjectInput,
  generateDirectorBriefInput,
  generateVideoInput,
  listProjectsInput,
  projectByIdInput,
  projectStatusInput,
  reorderProjectAssetsInput,
  selectHookVariantInput,
  submitProjectFeedbackInput,
  uploadProjectAssetInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';
import { studioProcedure } from './_studio-procedure';

export const studioProjectsRouter = router({
  list: studioProcedure.input(listProjectsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('studio_video_projects')
      .select('id, title, status, project_type, rendered_at, created_at, updated_at')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (input.status) {
      query = query.eq('status', input.status);
    }
    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  getById: studioProcedure.input(projectByIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project, error } = await supabase
      .from('studio_video_projects')
      .select('*')
      .eq('id', input.projectId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data: assets } = await supabase
      .from('studio_video_assets')
      .select('*')
      .eq('project_id', input.projectId)
      .order('order_index', { ascending: true });

    const { data: outputs } = await supabase
      .from('studio_video_outputs')
      .select('*')
      .eq('project_id', input.projectId);

    const { data: copy } = await supabase
      .from('studio_copy_outputs')
      .select('*')
      .eq('project_id', input.projectId);

    return {
      project,
      assets: assets ?? [],
      outputs: outputs ?? [],
      copy: copy ?? [],
    };
  }),

  create: studioProcedure.input(createStudioProjectInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();

    const { data: styleTemplate } = await supabase
      .from('studio_style_templates')
      .select('id')
      .eq('key', input.styleTemplateKey)
      .maybeSingle();

    const property = input.propertyData ?? {};
    const sourceMetadata: Record<string, Json> = {
      property: {
        ...(typeof property.price === 'number' ? { price: property.price } : {}),
        ...(property.currency ? { currency: property.currency } : {}),
        ...(typeof property.areaM2 === 'number' ? { area_m2: property.areaM2 } : {}),
        ...(typeof property.bedrooms === 'number' ? { bedrooms: property.bedrooms } : {}),
        ...(typeof property.bathrooms === 'number' ? { bathrooms: property.bathrooms } : {}),
        ...(typeof property.parking === 'number' ? { parking: property.parking } : {}),
        ...(property.zone ? { zone: property.zone } : {}),
        amenities: property.amenities ?? [],
      },
      ...(input.description ? { description: input.description } : {}),
      style_template_key: input.styleTemplateKey,
    };

    const { data, error } = await supabase
      .from('studio_video_projects')
      .insert({
        user_id: ctx.user.id,
        organization_id: ctx.studio.organizationId,
        title: input.title,
        project_type: input.projectType,
        status: 'draft',
        style_template_id: styleTemplate?.id ?? null,
        voice_clone_id: input.voiceCloneId ?? null,
        proyecto_id: input.proyectoId ?? null,
        unidad_id: input.unidadId ?? null,
        captacion_id: input.captacionId ?? null,
        source_metadata: sourceMetadata,
      })
      .select('id, title, status')
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  registerAsset: studioProcedure.input(uploadProjectAssetInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project } = await supabase
      .from('studio_video_projects')
      .select('id, user_id')
      .eq('id', input.projectId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data, error } = await supabase
      .from('studio_video_assets')
      .insert({
        project_id: input.projectId,
        user_id: ctx.user.id,
        asset_type: 'photo',
        storage_url: input.storagePath,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        width: input.width ?? null,
        height: input.height ?? null,
        order_index: input.orderIndex,
        meta: { file_name: input.fileName },
      })
      .select('id, order_index')
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  uploadAssetSignedUrl: studioProcedure
    .input(projectByIdInput.extend({}))
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: project } = await supabase
        .from('studio_video_projects')
        .select('id')
        .eq('id', input.projectId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      const path = `${ctx.user.id}/projects/${input.projectId}/${Date.now()}.bin`;
      const { data: signed, error } = await supabase.storage
        .from('studio-project-assets')
        .createSignedUploadUrl(path);
      if (error || !signed) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'createSignedUploadUrl failed',
        });
      }
      return {
        uploadUrl: signed.signedUrl,
        token: signed.token,
        path,
        bucket: 'studio-project-assets',
      };
    }),

  reorderAssets: studioProcedure
    .input(reorderProjectAssetsInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: project } = await supabase
        .from('studio_video_projects')
        .select('id')
        .eq('id', input.projectId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      for (let i = 0; i < input.assetOrder.length; i += 1) {
        const assetId = input.assetOrder[i];
        if (!assetId) continue;
        const { error } = await supabase
          .from('studio_video_assets')
          .update({ order_index: i })
          .eq('id', assetId)
          .eq('user_id', ctx.user.id);
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      }
      return { ok: true, count: input.assetOrder.length };
    }),

  generateDirectorBrief: studioProcedure
    .input(generateDirectorBriefInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: project } = await supabase
        .from('studio_video_projects')
        .select(
          'id, title, project_type, source_metadata, style_template_id, studio_style_templates!style_template_id(key, name)',
        )
        .eq('id', input.projectId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      const { data: assets } = await supabase
        .from('studio_video_assets')
        .select('id, storage_url, ai_classification, order_index, mime_type, meta')
        .eq('project_id', input.projectId)
        .order('order_index', { ascending: true });

      if (!assets || assets.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project has no assets to generate director brief',
        });
      }

      const { runDirectorAnalysis } = await import('@/features/dmx-studio/lib/claude-director');

      try {
        const brief = await runDirectorAnalysis({
          projectId: input.projectId,
          userId: ctx.user.id,
          title: project.title,
          projectType: project.project_type,
          sourceMetadata: project.source_metadata as Record<string, unknown>,
          styleTemplateKey:
            (Array.isArray(project.studio_style_templates)
              ? project.studio_style_templates[0]?.key
              : project.studio_style_templates?.key) ?? 'modern_cinematic',
          assets: assets.map((a) => ({
            id: a.id,
            storageUrl: a.storage_url,
            mimeType: a.mime_type ?? 'image/jpeg',
            orderIndex: a.order_index,
            spaceType:
              ((a.ai_classification as Record<string, unknown> | null)?.['space_type'] as
                | string
                | undefined) ?? null,
          })),
        });

        const { error: updateErr } = await supabase
          .from('studio_video_projects')
          .update({
            director_brief: brief as unknown as Json,
            status: 'scripting',
          })
          .eq('id', input.projectId);
        if (updateErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updateErr });

        return { ok: true, brief };
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.director', op: 'generateBrief' },
          extra: { projectId: input.projectId },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'director_failed',
        });
      }
    }),

  generateVideo: studioProcedure.input(generateVideoInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project } = await supabase
      .from('studio_video_projects')
      .select('id, status, director_brief')
      .eq('id', input.projectId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
    if (
      !project.director_brief ||
      Object.keys(project.director_brief as Record<string, unknown>).length === 0
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'director_brief required before generating video',
      });
    }

    const { kickoffVideoPipeline } = await import('@/features/dmx-studio/lib/pipeline');

    try {
      const result = await kickoffVideoPipeline({
        projectId: input.projectId,
        userId: ctx.user.id,
      });
      const { error: updErr } = await supabase
        .from('studio_video_projects')
        .update({ status: 'rendering' })
        .eq('id', input.projectId);
      if (updErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updErr });
      return result;
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.pipeline', op: 'kickoff' },
        extra: { projectId: input.projectId },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'pipeline_failed',
      });
    }
  }),

  getStatus: studioProcedure.input(projectStatusInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project } = await supabase
      .from('studio_video_projects')
      .select('id, status, rendered_at')
      .eq('id', input.projectId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data: jobs } = await supabase
      .from('studio_api_jobs')
      .select('id, job_type, provider, status, attempt_count, max_attempts, error_message')
      .eq('project_id', input.projectId)
      .order('created_at', { ascending: true });

    const { data: outputs } = await supabase
      .from('studio_video_outputs')
      .select('id, hook_variant, format, render_status')
      .eq('project_id', input.projectId);

    return {
      projectStatus: project.status,
      renderedAt: project.rendered_at,
      jobs: jobs ?? [],
      outputs: outputs ?? [],
    };
  }),

  selectHook: studioProcedure.input(selectHookVariantInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project } = await supabase
      .from('studio_video_projects')
      .select('id')
      .eq('id', input.projectId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

    await supabase
      .from('studio_video_outputs')
      .update({ selected_by_user: false })
      .eq('project_id', input.projectId);

    const { error } = await supabase
      .from('studio_video_outputs')
      .update({ selected_by_user: true })
      .eq('project_id', input.projectId)
      .eq('hook_variant', input.hookVariant);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { ok: true, hookVariant: input.hookVariant };
  }),

  submitFeedback: studioProcedure
    .input(submitProjectFeedbackInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: project } = await supabase
        .from('studio_video_projects')
        .select('id')
        .eq('id', input.projectId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      const { data, error } = await supabase
        .from('studio_feedback')
        .insert({
          project_id: input.projectId,
          user_id: ctx.user.id,
          rating: input.rating,
          selected_hook: input.selectedHook ?? null,
          preferred_format: input.preferredFormat ?? null,
          comments: input.comments ?? null,
          would_recommend: input.wouldRecommend ?? null,
        })
        .select('id')
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return { ok: true, feedbackId: data.id };
    }),
});
