import { TRPCError } from '@trpc/server';
import { analyzeCompetition } from '@/features/dmx-studio/lib/competition-analysis';
import { generateCompleteCopyPack } from '@/features/dmx-studio/lib/director/copy-pack';
import { generateThreeVariations } from '@/features/dmx-studio/lib/director/copy-pack/variations';
import {
  analyzeCompetitionInput,
  generateCopyPackInput,
  getCopyPackByProjectInput,
  getCopyVariationsInput,
  regenerateCopyOutputInput,
  selectCopyVariationInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';
import { studioProcedure } from './_studio-procedure';

interface ProjectPropertyData {
  price?: number | null;
  currency?: string;
  areaM2?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  zone?: string | null;
  amenities?: string[];
}

function buildPropertyData(
  raw: Json | null,
  fallbackZone: string,
): {
  id: string;
  priceUsd: number;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  zone: string;
  city: string;
  country: 'MX';
} {
  const data = (raw ?? {}) as ProjectPropertyData;
  return {
    id: 'studio',
    priceUsd: data.price ?? 0,
    areaM2: data.areaM2 ?? 0,
    bedrooms: data.bedrooms ?? 0,
    bathrooms: data.bathrooms ?? 0,
    zone: data.zone ?? fallbackZone,
    city: data.zone ?? fallbackZone,
    country: 'MX',
  };
}

export const studioCopyPackRouter = router({
  generate: studioProcedure.input(generateCopyPackInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project, error: projErr } = await supabase
      .from('studio_video_projects')
      .select('id, title, source_metadata, brand_kit_id')
      .eq('id', input.projectId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (projErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: projErr });
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

    let brandKit: { display_name: string | null; contact_phone: string | null; tone: string } = {
      display_name: null,
      contact_phone: null,
      tone: 'professional',
    };
    if (project.brand_kit_id) {
      const { data: bk } = await supabase
        .from('studio_brand_kits')
        .select('display_name, contact_phone, tone')
        .eq('id', project.brand_kit_id)
        .maybeSingle();
      if (bk) brandKit = bk;
    }

    const propertyData = buildPropertyData(project.source_metadata, project.title ?? 'CDMX');
    const pack = await generateCompleteCopyPack(propertyData, {
      displayName: brandKit.display_name,
      contactPhone: brandKit.contact_phone,
      tone: brandKit.tone,
    });

    const channels: Array<{ channel: string; content: string; meta?: Record<string, unknown> }> = [
      {
        channel: 'instagram_caption',
        content: pack.captionInstagram,
        meta: { hashtags: pack.hashtags },
      },
      {
        channel: 'wa_message',
        content: pack.messageWhatsapp,
        meta: { whatsappDeepLink: pack.whatsappDeepLink },
      },
      { channel: 'portal_listing', content: pack.descriptionPortal },
      { channel: 'narration_script', content: pack.narrationScript },
      { channel: 'video_title', content: pack.videoTitle },
    ];

    const inserted: Array<{ id: string; channel: string }> = [];
    for (const c of channels) {
      const { data, error } = await supabase
        .from('studio_copy_outputs')
        .insert({
          project_id: project.id,
          user_id: ctx.user.id,
          channel: c.channel,
          language: 'es-MX',
          content: c.content,
          ai_model: pack.aiModel,
          ai_cost_usd: pack.costUsd / channels.length,
          variants: (c.meta ?? {}) as unknown as Json,
        } as never)
        .select('id, channel')
        .single();
      if (error) {
        sentry.captureException(error, { tags: { feature: 'studio-copy-pack-insert' } });
        continue;
      }
      if (data) {
        inserted.push(data);
        await supabase.from('studio_copy_versions').insert({
          copy_output_id: data.id,
          version_number: 1,
          content: c.content,
          tone: 'original',
          regenerated_by: ctx.user.id,
          is_current: true,
          cost_usd: pack.costUsd / channels.length,
          ai_model: pack.aiModel,
        });
      }
    }

    return { copyOutputs: inserted, costUsd: pack.costUsd };
  }),

  getByProject: studioProcedure.input(getCopyPackByProjectInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_copy_outputs')
      .select('*')
      .eq('project_id', input.projectId)
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: true });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  regenerateOutput: studioProcedure
    .input(regenerateCopyOutputInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: output, error } = await supabase
        .from('studio_copy_outputs')
        .select('id, channel, content')
        .eq('id', input.copyOutputId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      if (!output) throw new TRPCError({ code: 'NOT_FOUND' });

      const variations = await generateThreeVariations(output.content, output.channel);

      const { data: existingMax } = await supabase
        .from('studio_copy_versions')
        .select('version_number')
        .eq('copy_output_id', output.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = (existingMax?.version_number ?? 0) + 1;

      const tones = ['formal', 'cercano', 'aspiracional'] as const;
      const versionRows = tones.map((tone, i) => ({
        copy_output_id: output.id,
        version_number: nextVersion + i,
        content: variations[tone],
        tone,
        regenerated_by: ctx.user.id,
        is_current: false,
        cost_usd: variations.costUsd / 3,
        ai_model: variations.aiModel,
      }));

      const { data: insertedVersions, error: insertErr } = await supabase
        .from('studio_copy_versions')
        .insert(versionRows)
        .select('id, tone, content, version_number');
      if (insertErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertErr });

      return { variations: insertedVersions ?? [], costUsd: variations.costUsd };
    }),

  getVariations: studioProcedure.input(getCopyVariationsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: output } = await supabase
      .from('studio_copy_outputs')
      .select('id')
      .eq('id', input.copyOutputId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!output) throw new TRPCError({ code: 'NOT_FOUND' });
    const { data, error } = await supabase
      .from('studio_copy_versions')
      .select('*')
      .eq('copy_output_id', input.copyOutputId)
      .order('version_number', { ascending: false });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  selectVariation: studioProcedure
    .input(selectCopyVariationInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: output } = await supabase
        .from('studio_copy_outputs')
        .select('id')
        .eq('id', input.copyOutputId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!output) throw new TRPCError({ code: 'NOT_FOUND' });

      const { data: version } = await supabase
        .from('studio_copy_versions')
        .select('id, content')
        .eq('id', input.versionId)
        .eq('copy_output_id', input.copyOutputId)
        .maybeSingle();
      if (!version) throw new TRPCError({ code: 'NOT_FOUND' });

      await supabase
        .from('studio_copy_versions')
        .update({ is_current: false })
        .eq('copy_output_id', input.copyOutputId);
      await supabase
        .from('studio_copy_versions')
        .update({ is_current: true })
        .eq('id', input.versionId);
      await supabase
        .from('studio_copy_outputs')
        .update({ content: version.content, selected_by_user: true })
        .eq('id', input.copyOutputId);

      return { ok: true };
    }),

  competitionAnalysis: studioProcedure
    .input(analyzeCompetitionInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: project } = await supabase
        .from('studio_video_projects')
        .select('id, title, source_metadata')
        .eq('id', input.projectId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });

      const propertyData = buildPropertyData(project.source_metadata, project.title ?? 'CDMX');
      const insight = await analyzeCompetition(propertyData);
      return insight;
    }),
});
