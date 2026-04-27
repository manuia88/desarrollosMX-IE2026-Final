// FASE 14.F.2 Sprint 1 — Video assembler (Tarea 1.6 BIBLIA).
// Vercel Sandbox FFmpeg orchestration: concat clips Kling + overlay narración
// ElevenLabs + background music ducked -20dB + crossfade 0.5s + export 9:16
// 1080x1920 30fps H.264 ~24Mbps. 3 hook variants (hook_a/b/c) por proyecto.
//
// Sandbox cleanup garantizado en finally block. Sentry wrapper canon.

import { createFFmpegSandbox } from '@/features/dmx-studio/lib/sandbox';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import {
  buildConcatCommand,
  buildCrossfadeCommand,
  buildExport9x16Command,
  buildMusicMixCommand,
  buildOverlayNarrationCommand,
} from './ffmpeg-commands';

export type StudioHookVariant = 'hook_a' | 'hook_b' | 'hook_c';
export type StudioVideoFormat = '9x16' | '1x1' | '16x9';

export interface AssembleVideoInput {
  readonly projectId: string;
  readonly userId: string;
}

export interface AssembleVideoOutputDescriptor {
  readonly hookVariant: StudioHookVariant;
  readonly format: StudioVideoFormat;
  readonly storagePath: string;
  readonly durationSeconds: number;
}

export interface AssembleVideoResult {
  readonly ok: boolean;
  readonly projectId: string;
  readonly outputs: ReadonlyArray<AssembleVideoOutputDescriptor>;
}

const HOOK_VARIANTS: ReadonlyArray<StudioHookVariant> = ['hook_a', 'hook_b', 'hook_c'];
const STORAGE_BUCKET = 'studio-outputs';
const SANDBOX_WORKDIR = '/tmp/studio-render';
const FFMPEG_TIMEOUT_MS = 8 * 60 * 1000;
const CROSSFADE_DURATION = 0.5;
const MUSIC_DUCK_DB = -20;
const FALLBACK_DURATION_SECONDS = 60;

interface SandboxCommandRunner {
  readonly runCommand: (
    command: string,
    args: ReadonlyArray<string>,
  ) => Promise<{ exitCode: number; stdout: () => Promise<string> }>;
  readonly stop: () => Promise<void>;
}

interface DirectorBriefShape {
  readonly hooks?: ReadonlyArray<string>;
}

interface KlingJobOutputShape {
  readonly clip_url?: string;
  readonly storage_path?: string;
  readonly duration_seconds?: number;
}

function extractHooks(brief: unknown): ReadonlyArray<string> {
  if (!brief || typeof brief !== 'object') return [];
  const shape = brief as DirectorBriefShape;
  return Array.isArray(shape.hooks) ? shape.hooks.slice(0, 3) : [];
}

function extractClipUrls(jobs: ReadonlyArray<{ output_payload: unknown }>): ReadonlyArray<string> {
  const urls: string[] = [];
  for (const job of jobs) {
    const payload = job.output_payload as KlingJobOutputShape | null;
    if (!payload) continue;
    const url = payload.clip_url ?? payload.storage_path;
    if (typeof url === 'string' && url.length > 0) {
      urls.push(url);
    }
  }
  return urls;
}

function escapeShellArg(value: string): string {
  return value.replace(/'/g, "'\\''");
}

async function runShell(sandbox: SandboxCommandRunner, command: string): Promise<void> {
  const wrapped = `cd ${SANDBOX_WORKDIR} && ${command}`;
  const result = await sandbox.runCommand('bash', ['-lc', wrapped]);
  if (result.exitCode !== 0) {
    const stdout = await result.stdout();
    throw new Error(`ffmpeg_failed: ${stdout.slice(0, 512)}`);
  }
}

export async function assembleVideo(input: AssembleVideoInput): Promise<AssembleVideoResult> {
  const { projectId, userId } = input;
  const supabase = createAdminClient();
  let sandbox: SandboxCommandRunner | null = null;

  try {
    const { data: project, error: projectErr } = await supabase
      .from('studio_video_projects')
      .select('id, director_brief, status')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (projectErr) throw new Error(`project_fetch_failed: ${projectErr.message}`);
    if (!project) throw new Error('project_not_found');

    const { data: assets, error: assetsErr } = await supabase
      .from('studio_video_assets')
      .select('id, storage_url, asset_type, order_index, duration_seconds')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });
    if (assetsErr) throw new Error(`assets_fetch_failed: ${assetsErr.message}`);

    const { data: jobs, error: jobsErr } = await supabase
      .from('studio_api_jobs')
      .select('id, job_type, status, output_payload')
      .eq('project_id', projectId)
      .eq('job_type', 'kling_render')
      .eq('status', 'completed');
    if (jobsErr) throw new Error(`jobs_fetch_failed: ${jobsErr.message}`);

    const clipUrls = extractClipUrls(jobs ?? []);
    const narrationAsset = (assets ?? []).find((a) => a.asset_type === 'voiceover');
    const hooks = extractHooks(project.director_brief);

    if (clipUrls.length === 0) {
      throw new Error('no_kling_clips_available');
    }

    const sandboxInstance = (await createFFmpegSandbox()) as unknown as SandboxCommandRunner;
    sandbox = sandboxInstance;

    await runShell(sandbox, `mkdir -p ${SANDBOX_WORKDIR}`);

    const localClips: string[] = [];
    for (let i = 0; i < clipUrls.length; i += 1) {
      const url = clipUrls[i];
      if (!url) continue;
      const local = `${SANDBOX_WORKDIR}/clip_${i}.mp4`;
      await runShell(sandbox, `curl -sSL '${escapeShellArg(url)}' -o '${escapeShellArg(local)}'`);
      localClips.push(local);
    }

    let narrationPath: string | null = null;
    if (narrationAsset?.storage_url) {
      narrationPath = `${SANDBOX_WORKDIR}/narration.mp3`;
      await runShell(
        sandbox,
        `curl -sSL '${escapeShellArg(narrationAsset.storage_url)}' -o '${escapeShellArg(narrationPath)}'`,
      );
    }

    const concatOutput = `${SANDBOX_WORKDIR}/concat.mp4`;
    await runShell(sandbox, buildConcatCommand(localClips, concatOutput));

    const fadedOutput = `${SANDBOX_WORKDIR}/faded.mp4`;
    await runShell(sandbox, buildCrossfadeCommand(concatOutput, CROSSFADE_DURATION, fadedOutput));

    let composedOutput = fadedOutput;
    if (narrationPath) {
      const overlayed = `${SANDBOX_WORKDIR}/overlayed.mp4`;
      await runShell(sandbox, buildOverlayNarrationCommand(fadedOutput, narrationPath, overlayed));
      composedOutput = overlayed;
    }

    const musicPath = `${SANDBOX_WORKDIR}/music.mp3`;
    const hasMusic = await tryDownloadDefaultMusic(sandbox, musicPath);
    if (hasMusic) {
      const mixed = `${SANDBOX_WORKDIR}/mixed.mp4`;
      await runShell(
        sandbox,
        buildMusicMixCommand(composedOutput, musicPath, MUSIC_DUCK_DB, mixed),
      );
      composedOutput = mixed;
    }

    const outputs: AssembleVideoOutputDescriptor[] = [];
    for (let i = 0; i < HOOK_VARIANTS.length; i += 1) {
      const hookVariant = HOOK_VARIANTS[i] as StudioHookVariant;
      const hookText = hooks[i] ?? `Hook ${String.fromCharCode(65 + i)}`;
      const exportedLocal = `${SANDBOX_WORKDIR}/${hookVariant}_9x16.mp4`;
      await runShell(sandbox, buildExport9x16Command(composedOutput, exportedLocal, hookText));

      const storagePath = `${userId}/${projectId}/${hookVariant}_9x16.mp4`;

      const cat = await sandbox.runCommand('bash', [
        '-lc',
        `cat '${escapeShellArg(exportedLocal)}' | base64 -w0`,
      ]);
      if (cat.exitCode !== 0) throw new Error(`read_output_failed:${hookVariant}`);
      const b64 = (await cat.stdout()).trim();
      const buffer = Buffer.from(b64, 'base64');

      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'video/mp4',
          upsert: true,
        });
      if (uploadErr) throw new Error(`upload_failed:${hookVariant}:${uploadErr.message}`);

      const duration =
        typeof narrationAsset?.duration_seconds === 'number' && narrationAsset.duration_seconds > 0
          ? narrationAsset.duration_seconds
          : FALLBACK_DURATION_SECONDS;

      const { error: insertErr } = await supabase.from('studio_video_outputs').upsert(
        {
          project_id: projectId,
          user_id: userId,
          hook_variant: hookVariant,
          format: '9x16',
          storage_url: storagePath,
          duration_seconds: duration,
          size_bytes: buffer.byteLength,
          render_status: 'completed',
          render_provider: 'vercel_sandbox_ffmpeg',
        },
        { onConflict: 'project_id,hook_variant,format' },
      );
      if (insertErr) throw new Error(`insert_output_failed:${hookVariant}:${insertErr.message}`);

      outputs.push({
        hookVariant,
        format: '9x16',
        storagePath,
        durationSeconds: duration,
      });
    }

    const { error: updateErr } = await supabase
      .from('studio_video_projects')
      .update({ status: 'rendered', rendered_at: new Date().toISOString() })
      .eq('id', projectId);
    if (updateErr) throw new Error(`project_update_failed: ${updateErr.message}`);

    return { ok: true, projectId, outputs };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.assembler', op: 'assembleVideo' },
      extra: { projectId, userId },
    });
    throw err;
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { feature: 'dmx-studio.assembler', op: 'sandbox.stop' },
          extra: { projectId },
        });
      }
    }
  }
}

async function tryDownloadDefaultMusic(
  sandbox: SandboxCommandRunner,
  destination: string,
): Promise<boolean> {
  const url = process.env.DMX_STUDIO_DEFAULT_MUSIC_URL;
  if (!url) return false;
  try {
    const result = await sandbox.runCommand('bash', [
      '-lc',
      `curl -sSL '${escapeShellArg(url)}' -o '${escapeShellArg(destination)}'`,
    ]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export const __test__ = {
  HOOK_VARIANTS,
  STORAGE_BUCKET,
  SANDBOX_WORKDIR,
  FFMPEG_TIMEOUT_MS,
  CROSSFADE_DURATION,
  MUSIC_DUCK_DB,
  extractClipUrls,
  extractHooks,
};
