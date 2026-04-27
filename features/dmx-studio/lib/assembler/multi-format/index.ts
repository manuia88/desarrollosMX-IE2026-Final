// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — Multi-format orchestrator.
// Genera 16:9 + 1:1 desde 9:16 source. Beat-sync optional (solo metadata flag,
// MVP H1: filter no-op safe). Vercel Sandbox FFmpeg execution canon.
//
// Reuses sandbox lifecycle pattern de video-assembler.ts (Sprint 1):
// download source → reformat per target → upload to Supabase → upsert
// studio_video_outputs row. Sentry capture en catch + sandbox.stop() en finally.

import { createFFmpegSandbox } from '@/features/dmx-studio/lib/sandbox';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { buildBeatSyncFilter, detectBeats } from './beat-sync';
import { buildCropCommand, detectFocalArea } from './smart-crop';

export type StudioMultiFormatHookVariant = 'hook_a' | 'hook_b' | 'hook_c';
export type StudioMultiFormatTarget = '9x16' | '1x1' | '16x9';

export interface GenerateAllFormatsInput {
  readonly projectId: string;
  readonly userId: string;
  readonly hookVariant: StudioMultiFormatHookVariant;
  readonly sourceStoragePath: string;
  readonly enableBeatSync: boolean;
}

export interface GenerateAllFormatsOutputDescriptor {
  readonly format: StudioMultiFormatTarget;
  readonly storagePath: string;
  readonly sizeBytes: number;
  readonly hasBeatSync: boolean;
}

export interface GenerateAllFormatsResult {
  readonly ok: boolean;
  readonly outputs: ReadonlyArray<GenerateAllFormatsOutputDescriptor>;
  readonly totalSizeBytes: number;
}

interface SandboxCommandRunner {
  readonly runCommand: (
    command: string,
    args: ReadonlyArray<string>,
  ) => Promise<{ exitCode: number; stdout: () => Promise<string> }>;
  readonly stop: () => Promise<void>;
}

const STORAGE_BUCKET = 'studio-outputs';
const SANDBOX_WORKDIR = '/tmp/studio-multi-format';
const FALLBACK_DURATION_SECONDS = 60;
const RENDER_TARGETS: ReadonlyArray<StudioMultiFormatTarget> = ['9x16', '1x1', '16x9'];

function escapeShellArg(value: string): string {
  return value.replace(/'/g, "'\\''");
}

async function runShell(sandbox: SandboxCommandRunner, command: string): Promise<void> {
  const wrapped = `cd ${SANDBOX_WORKDIR} && ${command}`;
  const result = await sandbox.runCommand('bash', ['-lc', wrapped]);
  if (result.exitCode !== 0) {
    const stdout = await result.stdout();
    throw new Error(`ffmpeg_multi_format_failed: ${stdout.slice(0, 512)}`);
  }
}

export async function generateAllFormats(
  input: GenerateAllFormatsInput,
): Promise<GenerateAllFormatsResult> {
  const { projectId, userId, hookVariant, sourceStoragePath, enableBeatSync } = input;
  const supabase = createAdminClient();
  let sandbox: SandboxCommandRunner | null = null;

  try {
    const { data: signed, error: signedErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(sourceStoragePath, 60 * 10);
    if (signedErr || !signed?.signedUrl) {
      throw new Error(`multi_format_source_signed_url_failed: ${signedErr?.message ?? 'no_url'}`);
    }

    const { data: sourceRow } = await supabase
      .from('studio_video_outputs')
      .select('duration_seconds')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('hook_variant', hookVariant)
      .eq('format', '9x16')
      .maybeSingle();

    const durationSeconds =
      typeof sourceRow?.duration_seconds === 'number' && sourceRow.duration_seconds > 0
        ? sourceRow.duration_seconds
        : FALLBACK_DURATION_SECONDS;

    const sandboxInstance = (await createFFmpegSandbox()) as unknown as SandboxCommandRunner;
    sandbox = sandboxInstance;

    await runShell(sandbox, `mkdir -p ${SANDBOX_WORKDIR}`);

    const localSource = `${SANDBOX_WORKDIR}/source_9x16.mp4`;
    await runShell(
      sandbox,
      `curl -sSL '${escapeShellArg(signed.signedUrl)}' -o '${escapeShellArg(localSource)}'`,
    );

    // Beat-sync data prepared (no-op filter when feature disabled). Filter
    // value is currently logged as metadata — full integration into reformat
    // pipeline defer H2 (DSP audio analysis required for accurate detection).
    const beats = enableBeatSync ? detectBeats({ durationSeconds }) : [];
    const beatFilter = enableBeatSync ? buildBeatSyncFilter(beats) : 'null';
    if (beatFilter.length === 0) {
      throw new Error('beat_filter_invalid');
    }

    const focalArea = detectFocalArea(localSource);
    const outputs: GenerateAllFormatsOutputDescriptor[] = [];
    let totalSizeBytes = 0;

    for (const format of RENDER_TARGETS) {
      const localOutput = `${SANDBOX_WORKDIR}/${hookVariant}_${format}.mp4`;
      const storagePath = `${userId}/${projectId}/${hookVariant}_${format}.mp4`;

      if (format === '9x16') {
        // Source already in canon 9x16 → reuse storage path, no reformat run.
        const existing: GenerateAllFormatsOutputDescriptor = {
          format,
          storagePath: sourceStoragePath,
          sizeBytes: 0,
          hasBeatSync: enableBeatSync,
        };
        outputs.push(existing);
        continue;
      }

      const cropCommand = buildCropCommand(localSource, format, focalArea, localOutput);
      await runShell(sandbox, cropCommand);

      const cat = await sandbox.runCommand('bash', [
        '-lc',
        `cat '${escapeShellArg(localOutput)}' | base64 -w0`,
      ]);
      if (cat.exitCode !== 0) {
        throw new Error(`multi_format_read_output_failed:${format}`);
      }
      const b64 = (await cat.stdout()).trim();
      const buffer = Buffer.from(b64, 'base64');

      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'video/mp4',
          upsert: true,
        });
      if (uploadErr) {
        throw new Error(`multi_format_upload_failed:${format}:${uploadErr.message}`);
      }

      const { error: insertErr } = await supabase.from('studio_video_outputs').upsert(
        {
          project_id: projectId,
          user_id: userId,
          hook_variant: hookVariant,
          format,
          storage_url: storagePath,
          duration_seconds: durationSeconds,
          size_bytes: buffer.byteLength,
          render_status: 'completed',
          render_provider: 'vercel_sandbox_ffmpeg',
          has_beat_sync: enableBeatSync,
        },
        { onConflict: 'project_id,hook_variant,format' },
      );
      if (insertErr) {
        throw new Error(`multi_format_insert_output_failed:${format}:${insertErr.message}`);
      }

      totalSizeBytes += buffer.byteLength;
      outputs.push({
        format,
        storagePath,
        sizeBytes: buffer.byteLength,
        hasBeatSync: enableBeatSync,
      });
    }

    return { ok: true, outputs, totalSizeBytes };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.multi-format', op: 'generateAllFormats' },
      extra: { projectId, userId, hookVariant, enableBeatSync },
    });
    throw err;
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { feature: 'dmx-studio.multi-format', op: 'sandbox.stop' },
          extra: { projectId, hookVariant },
        });
      }
    }
  }
}

export const __test__ = {
  STORAGE_BUCKET,
  SANDBOX_WORKDIR,
  RENDER_TARGETS,
};
