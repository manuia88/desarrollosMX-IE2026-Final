// FASE 14.F.2 Sprint 1 — Pipeline orchestrator (Tarea 1.5 BIBLIA).
// Spawn parallel: A) Kling clips (1 por scene) B) ElevenLabs TTS narración C) ElevenLabs Music.
// Cost tracking via studio_api_jobs row por llamada + studio_usage_logs aggregate por run.
// Voice clone IVC permanece STUB: usa default ES-MX voice mientras
// FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED=false (canon Sprint 1).
// Status final pipeline: deja project status='rendering'. Sub-agent 5 (assembler) avanza a 'rendered'.

import { z } from 'zod';
import {
  type DirectorOutput,
  DirectorOutputSchema,
  type KlingPrompt,
} from '@/features/dmx-studio/lib/claude-director';
import { generateMusic, generateSpeech } from '@/features/dmx-studio/lib/elevenlabs';
import { DEFAULT_VOICE_ID_ES_MX } from '@/features/dmx-studio/lib/elevenlabs/voices-canon';
import { FEATURE_FLAGS } from '@/features/dmx-studio/lib/feature-flags';
import {
  type GenerateVideoFromImageInput,
  generateVideoFromImage,
} from '@/features/dmx-studio/lib/kling';
import { KLING_COST_PER_SECOND_USD } from '@/features/dmx-studio/lib/kling/config';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';
import { completeJob, failJob, logPipelineUsage, trackJob } from './cost-tracker';
import { retryWithBackoff } from './retry';

export interface KickoffPipelineInput {
  readonly projectId: string;
  readonly userId: string;
}

export type PipelineStageKey = 'kling_clips' | 'elevenlabs_tts' | 'elevenlabs_music' | 'assemble';

export type PipelineStageStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface PipelineStageResult {
  readonly stage: PipelineStageKey;
  readonly status: PipelineStageStatus;
  readonly jobIds: readonly string[];
}

export interface KickoffPipelineResult {
  readonly ok: boolean;
  readonly projectId: string;
  readonly stages: ReadonlyArray<PipelineStageResult>;
}

type AdminClient = ReturnType<typeof createAdminClient>;

export interface KickoffPipelineDeps {
  readonly client?: AdminClient;
  readonly runKling?: (input: GenerateVideoFromImageInput) => Promise<{
    videoUrl: string;
    durationSeconds: number;
    costUsd: number;
    requestId: string;
  }>;
  readonly runTts?: (input: { text: string; voiceId: string }) => Promise<{
    audioBuffer: Uint8Array;
    durationSecondsEstimate: number;
    costUsd: number;
  }>;
  readonly runMusic?: (input: {
    prompt: string;
    durationSeconds: number;
    genre?: string;
  }) => Promise<{
    audioBuffer: Uint8Array;
    durationSeconds: number;
  }>;
}

const PROJECT_BRIEF_SHAPE = z.object({
  director_brief: z.unknown(),
  voice_clone_id: z.string().nullable().optional(),
});

interface ProjectRow {
  readonly directorBrief: DirectorOutput;
  readonly voiceCloneId: string | null;
}

async function fetchProjectBrief(
  supabase: AdminClient,
  projectId: string,
  userId: string,
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('studio_video_projects')
    .select('director_brief, voice_clone_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(`pipeline.fetchProject failed: ${error.message}`);
  }
  if (!data) {
    throw new Error('pipeline.fetchProject: project not found or not owned by user');
  }
  const parsed = PROJECT_BRIEF_SHAPE.parse(data);
  const brief = DirectorOutputSchema.parse(parsed.director_brief);
  return {
    directorBrief: brief,
    voiceCloneId: parsed.voice_clone_id ?? null,
  };
}

async function resolveVoiceId(supabase: AdminClient, voiceCloneId: string | null): Promise<string> {
  if (!voiceCloneId || !FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED) {
    return DEFAULT_VOICE_ID_ES_MX;
  }
  const { data } = await supabase
    .from('studio_voice_clones')
    .select('elevenlabs_voice_id, status')
    .eq('id', voiceCloneId)
    .maybeSingle();
  if (data && data.status === 'ready' && data.elevenlabs_voice_id) {
    return data.elevenlabs_voice_id;
  }
  return DEFAULT_VOICE_ID_ES_MX;
}

async function fetchPrimaryAssetUrl(
  supabase: AdminClient,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('studio_video_assets')
    .select('storage_url')
    .eq('project_id', projectId)
    .eq('asset_type', 'photo')
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.storage_url ?? null;
}

interface StageOutcome {
  readonly status: PipelineStageStatus;
  readonly jobIds: string[];
}

async function runKlingClipsStage(args: {
  supabase: AdminClient;
  projectId: string;
  userId: string;
  klingPrompts: ReadonlyArray<KlingPrompt>;
  imageUrl: string;
  deps: KickoffPipelineDeps;
}): Promise<StageOutcome> {
  const jobIds: string[] = [];
  const renderer = args.deps.runKling ?? generateVideoFromImage;
  let stageFailed = false;

  await Promise.all(
    args.klingPrompts.map(async (prompt) => {
      const cameraMovement: GenerateVideoFromImageInput['cameraMovement'] =
        prompt.cameraMovement === 'tilt_up' ||
        prompt.cameraMovement === 'tilt_down' ||
        prompt.cameraMovement === 'zoom_in' ||
        prompt.cameraMovement === 'pan_left' ||
        prompt.cameraMovement === 'pan_right'
          ? prompt.cameraMovement
          : 'none';
      const durationSeconds = Math.min(Math.max(Math.round(prompt.durationSeconds), 3), 10);
      const estimatedCost = Math.round(durationSeconds * KLING_COST_PER_SECOND_USD * 100) / 100;

      const { id: jobId } = await trackJob(
        {
          projectId: args.projectId,
          userId: args.userId,
          jobType: 'kling_render',
          provider: 'kling',
          status: 'running',
          estimatedCost,
          inputPayload: {
            sceneIndex: prompt.sceneIndex,
            prompt: prompt.prompt,
            cameraMovement,
            durationSeconds,
          } as Json,
        },
        { client: args.supabase },
      );
      jobIds.push(jobId);

      let attempts = 0;
      try {
        const result = await retryWithBackoff(
          () =>
            renderer({
              imageUrl: args.imageUrl,
              prompt: prompt.prompt,
              cameraMovement,
              durationSeconds,
              aspectRatio: '16:9',
            }),
          {
            maxAttempts: 3,
            baseDelayMs: 1000,
            onAttemptError: () => {
              attempts += 1;
            },
          },
        );
        await completeJob(
          jobId,
          {
            videoUrl: result.videoUrl,
            durationSeconds: result.durationSeconds,
            requestId: result.requestId,
          } as Json,
          result.costUsd,
          { client: args.supabase },
        );
      } catch (err) {
        stageFailed = true;
        const message = err instanceof Error ? err.message : 'kling_render failed';
        await failJob(jobId, message, Math.max(attempts, 3), { client: args.supabase });
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.pipeline', op: 'kling_render' },
          extra: { projectId: args.projectId, sceneIndex: prompt.sceneIndex },
        });
      }
    }),
  );

  return { status: stageFailed ? 'failed' : 'completed', jobIds };
}

async function runTtsStage(args: {
  supabase: AdminClient;
  projectId: string;
  userId: string;
  narrationScript: string;
  voiceId: string;
  deps: KickoffPipelineDeps;
}): Promise<StageOutcome> {
  const ttsRunner =
    args.deps.runTts ?? ((input) => generateSpeech({ text: input.text, voiceId: input.voiceId }));
  const estimatedCost = Math.round((args.narrationScript.length / 1000) * 0.3 * 10000) / 10000;
  const { id: jobId } = await trackJob(
    {
      projectId: args.projectId,
      userId: args.userId,
      jobType: 'elevenlabs_voice',
      provider: 'elevenlabs',
      status: 'running',
      estimatedCost,
      inputPayload: {
        scriptLength: args.narrationScript.length,
        voiceId: args.voiceId,
        kind: 'tts',
      } as Json,
    },
    { client: args.supabase },
  );
  let attempts = 0;
  try {
    const result = await retryWithBackoff(
      () => ttsRunner({ text: args.narrationScript, voiceId: args.voiceId }),
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        onAttemptError: () => {
          attempts += 1;
        },
      },
    );
    await completeJob(
      jobId,
      {
        audioBytes: result.audioBuffer.byteLength,
        durationSecondsEstimate: result.durationSecondsEstimate,
      } as Json,
      result.costUsd,
      { client: args.supabase },
    );
    return { status: 'completed', jobIds: [jobId] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'elevenlabs_tts failed';
    await failJob(jobId, message, Math.max(attempts, 3), { client: args.supabase });
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.pipeline', op: 'elevenlabs_tts' },
      extra: { projectId: args.projectId },
    });
    return { status: 'failed', jobIds: [jobId] };
  }
}

async function runMusicStage(args: {
  supabase: AdminClient;
  projectId: string;
  userId: string;
  moodMusic: DirectorOutput['moodMusic'];
  deps: KickoffPipelineDeps;
}): Promise<StageOutcome> {
  const musicRunner = args.deps.runMusic ?? generateMusic;
  const durationSeconds = 30;
  // ElevenLabs Music ~$0.02 per second (BIBLIA v4 ref ~$0.60 por track 30s).
  const estimatedCost = Math.round(durationSeconds * 0.02 * 100) / 100;
  const { id: jobId } = await trackJob(
    {
      projectId: args.projectId,
      userId: args.userId,
      jobType: 'elevenlabs_voice',
      provider: 'elevenlabs',
      status: 'running',
      estimatedCost,
      inputPayload: {
        prompt: args.moodMusic.prompt,
        genre: args.moodMusic.genre,
        tempo: args.moodMusic.tempo,
        durationSeconds,
        kind: 'music',
      } as Json,
    },
    { client: args.supabase },
  );
  let attempts = 0;
  try {
    const result = await retryWithBackoff(
      () =>
        musicRunner({
          prompt: args.moodMusic.prompt,
          durationSeconds,
          genre: args.moodMusic.genre,
        }),
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        onAttemptError: () => {
          attempts += 1;
        },
      },
    );
    await completeJob(
      jobId,
      {
        audioBytes: result.audioBuffer.byteLength,
        durationSeconds: result.durationSeconds,
      } as Json,
      estimatedCost,
      { client: args.supabase },
    );
    return { status: 'completed', jobIds: [jobId] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'elevenlabs_music failed';
    await failJob(jobId, message, Math.max(attempts, 3), { client: args.supabase });
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.pipeline', op: 'elevenlabs_music' },
      extra: { projectId: args.projectId },
    });
    return { status: 'failed', jobIds: [jobId] };
  }
}

async function persistCopyOutputs(
  supabase: AdminClient,
  projectId: string,
  userId: string,
  brief: DirectorOutput,
): Promise<void> {
  const rows: ReadonlyArray<{ channel: string; content: string; meta?: Json }> = [
    { channel: 'instagram_caption', content: brief.copyPack.captionInstagram },
    { channel: 'wa_message', content: brief.copyPack.messageWhatsapp },
    { channel: 'portal_listing', content: brief.copyPack.descriptionPortal },
    {
      channel: 'hashtags',
      content: brief.copyPack.hashtags.join(' '),
      meta: { tags: brief.copyPack.hashtags } as Json,
    },
    { channel: 'narration_script', content: brief.narrationScript },
  ];
  const inserts = rows.map((row) => ({
    project_id: projectId,
    user_id: userId,
    channel: row.channel,
    language: 'es-MX',
    content: row.content,
    ai_model: 'claude-director',
    meta: row.meta ?? ({} as Json),
  }));
  const { error } = await supabase.from('studio_copy_outputs').insert(inserts);
  if (error) {
    throw new Error(`pipeline.persistCopyOutputs failed: ${error.message}`);
  }
}

async function markProjectFailed(
  supabase: AdminClient,
  projectId: string,
  reason: string,
): Promise<void> {
  await supabase.from('studio_video_projects').update({ status: 'failed' }).eq('id', projectId);
  sentry.captureException(new Error(reason), {
    tags: { feature: 'dmx-studio.pipeline', op: 'markProjectFailed' },
    extra: { projectId, reason },
  });
}

export async function kickoffVideoPipeline(
  input: KickoffPipelineInput,
  deps: KickoffPipelineDeps = {},
): Promise<KickoffPipelineResult> {
  const supabase = deps.client ?? createAdminClient();
  let project: ProjectRow;
  try {
    project = await fetchProjectBrief(supabase, input.projectId, input.userId);
  } catch (err) {
    await markProjectFailed(
      supabase,
      input.projectId,
      err instanceof Error ? err.message : 'fetch_project_failed',
    );
    throw err;
  }

  const imageUrl = await fetchPrimaryAssetUrl(supabase, input.projectId);
  if (!imageUrl) {
    await markProjectFailed(supabase, input.projectId, 'no_primary_asset');
    throw new Error('pipeline.kickoff: project has no primary photo asset');
  }
  const safeImageUrl = imageUrl.startsWith('http')
    ? imageUrl
    : `https://storage.placeholder/${imageUrl}`;

  const voiceId = await resolveVoiceId(supabase, project.voiceCloneId);

  const [klingOutcome, ttsOutcome, musicOutcome] = await Promise.all([
    runKlingClipsStage({
      supabase,
      projectId: input.projectId,
      userId: input.userId,
      klingPrompts: project.directorBrief.klingPrompts,
      imageUrl: safeImageUrl,
      deps,
    }),
    runTtsStage({
      supabase,
      projectId: input.projectId,
      userId: input.userId,
      narrationScript: project.directorBrief.narrationScript,
      voiceId,
      deps,
    }),
    runMusicStage({
      supabase,
      projectId: input.projectId,
      userId: input.userId,
      moodMusic: project.directorBrief.moodMusic,
      deps,
    }),
  ]);

  const allOk =
    klingOutcome.status === 'completed' &&
    ttsOutcome.status === 'completed' &&
    musicOutcome.status === 'completed';

  if (!allOk) {
    await markProjectFailed(supabase, input.projectId, 'pipeline_stage_failed');
  } else {
    try {
      await persistCopyOutputs(supabase, input.projectId, input.userId, project.directorBrief);
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.pipeline', op: 'persistCopyOutputs' },
        extra: { projectId: input.projectId },
      });
    }

    const totalCost =
      project.directorBrief.klingPrompts.reduce(
        (acc, p) => acc + Math.min(Math.max(p.durationSeconds, 3), 10) * KLING_COST_PER_SECOND_USD,
        0,
      ) +
      (project.directorBrief.narrationScript.length / 1000) * 0.3 +
      30 * 0.02;
    try {
      await logPipelineUsage(
        {
          userId: input.userId,
          projectId: input.projectId,
          metricType: 'video_render',
          metricAmount: project.directorBrief.klingPrompts.length,
          costUsd: Math.round(totalCost * 10000) / 10000,
        },
        { client: supabase },
      );
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.pipeline', op: 'logPipelineUsage' },
        extra: { projectId: input.projectId },
      });
    }
  }

  return {
    ok: allOk,
    projectId: input.projectId,
    stages: [
      { stage: 'kling_clips', status: klingOutcome.status, jobIds: klingOutcome.jobIds },
      { stage: 'elevenlabs_tts', status: ttsOutcome.status, jobIds: ttsOutcome.jobIds },
      { stage: 'elevenlabs_music', status: musicOutcome.status, jobIds: musicOutcome.jobIds },
      { stage: 'assemble', status: 'queued', jobIds: [] },
    ],
  };
}
