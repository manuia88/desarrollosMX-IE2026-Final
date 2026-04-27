// FASE 14.F.3 Sprint 2 — Branding overlay orchestration (Tarea 2.3 BIBLIA).
// Aplica branding del asesor (logo + colors + bottom bar nombre+phone) sobre
// videos via FFmpeg overlay en Vercel Sandbox. Foto plan exporta sin branding
// (reventa) — applyUnbrandedExport solo recodifica con crossfade básico.
//
// Sandbox cleanup garantizado en finally block. Sentry wrapper canon.

import { createFFmpegSandbox } from '@/features/dmx-studio/lib/sandbox';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { buildCrossfadeCommand } from '../ffmpeg-commands';
import { buildFullBrandingCommand } from './ffmpeg-overlay-generator';

const SANDBOX_WORKDIR = '/tmp/studio-branding';
const DEFAULT_BRAND_COLOR = '#6366F1';
const UNBRANDED_CROSSFADE_DURATION = 0.5;

interface SandboxCommandRunner {
  readonly runCommand: (
    command: string,
    args: ReadonlyArray<string>,
  ) => Promise<{ exitCode: number; stdout: () => Promise<string> }>;
  readonly stop: () => Promise<void>;
}

export interface BrandKitOverlay {
  readonly logoUrl: string | null;
  readonly displayName: string | null;
  readonly contactPhone: string | null;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly accentColor: string | null;
  readonly introText: string | null;
  readonly outroText: string | null;
}

export interface ApplyBrandingInput {
  readonly sourceVideoPath: string;
  readonly outputPath: string;
  readonly brandKit: BrandKitOverlay;
  readonly durationSeconds: number;
}

export interface ApplyBrandingResult {
  readonly ok: boolean;
  readonly outputPath: string;
  readonly hasBrandingOverlay: boolean;
}

function escapeShellArg(value: string): string {
  return value.replace(/'/g, "'\\''");
}

async function runShell(sandbox: SandboxCommandRunner, command: string): Promise<void> {
  const wrapped = `cd ${SANDBOX_WORKDIR} && ${command}`;
  const result = await sandbox.runCommand('bash', ['-lc', wrapped]);
  if (result.exitCode !== 0) {
    const stdout = await result.stdout();
    throw new Error(`branding_ffmpeg_failed: ${stdout.slice(0, 512)}`);
  }
}

/**
 * Apply asesor branding overlay (logo + bottom bar + intro/outro) sobre el
 * video source. Sandbox stop garantizado en finally. Sentry capture en errors.
 */
export async function applyBrandingOverlay(
  input: ApplyBrandingInput,
): Promise<ApplyBrandingResult> {
  const { sourceVideoPath, outputPath, brandKit, durationSeconds } = input;
  let sandbox: SandboxCommandRunner | null = null;

  try {
    const sandboxInstance = (await createFFmpegSandbox()) as unknown as SandboxCommandRunner;
    sandbox = sandboxInstance;

    await runShell(sandbox, `mkdir -p ${SANDBOX_WORKDIR}`);

    const localSource = `${SANDBOX_WORKDIR}/source.mp4`;
    await runShell(
      sandbox,
      `curl -sSL '${escapeShellArg(sourceVideoPath)}' -o '${escapeShellArg(localSource)}'`,
    );

    let localLogoPath: string | null = null;
    if (brandKit.logoUrl) {
      localLogoPath = `${SANDBOX_WORKDIR}/logo.png`;
      await runShell(
        sandbox,
        `curl -sSL '${escapeShellArg(brandKit.logoUrl)}' -o '${escapeShellArg(localLogoPath)}'`,
      );
    }

    const brandColor = brandKit.primaryColor ?? DEFAULT_BRAND_COLOR;
    const localOutput = `${SANDBOX_WORKDIR}/branded.mp4`;

    const command = buildFullBrandingCommand({
      videoPath: localSource,
      logoPath: localLogoPath,
      name: brandKit.displayName,
      phone: brandKit.contactPhone,
      brandColor,
      durationSeconds,
      outputPath: localOutput,
      introText: brandKit.introText,
      outroText: brandKit.outroText,
    });

    await runShell(sandbox, command);

    await runShell(sandbox, `cp '${escapeShellArg(localOutput)}' '${escapeShellArg(outputPath)}'`);

    return {
      ok: true,
      outputPath,
      hasBrandingOverlay: true,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.branding', op: 'applyBrandingOverlay' },
      extra: { sourceVideoPath, outputPath },
    });
    throw err;
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { feature: 'dmx-studio.branding', op: 'sandbox.stop' },
          extra: { outputPath },
        });
      }
    }
  }
}

/**
 * Re-export limpio sin overlay branding — Foto plan reventa. Aplica crossfade
 * 0.5s básico para asegurar transcoding consistente. hasBrandingOverlay=false.
 */
export async function applyUnbrandedExport(
  sourceVideoPath: string,
  outputPath: string,
): Promise<ApplyBrandingResult> {
  let sandbox: SandboxCommandRunner | null = null;

  try {
    const sandboxInstance = (await createFFmpegSandbox()) as unknown as SandboxCommandRunner;
    sandbox = sandboxInstance;

    await runShell(sandbox, `mkdir -p ${SANDBOX_WORKDIR}`);

    const localSource = `${SANDBOX_WORKDIR}/source.mp4`;
    await runShell(
      sandbox,
      `curl -sSL '${escapeShellArg(sourceVideoPath)}' -o '${escapeShellArg(localSource)}'`,
    );

    const localOutput = `${SANDBOX_WORKDIR}/unbranded.mp4`;
    await runShell(
      sandbox,
      buildCrossfadeCommand(localSource, UNBRANDED_CROSSFADE_DURATION, localOutput),
    );

    await runShell(sandbox, `cp '${escapeShellArg(localOutput)}' '${escapeShellArg(outputPath)}'`);

    return {
      ok: true,
      outputPath,
      hasBrandingOverlay: false,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.branding', op: 'applyUnbrandedExport' },
      extra: { sourceVideoPath, outputPath },
    });
    throw err;
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { feature: 'dmx-studio.branding', op: 'sandbox.stop' },
          extra: { outputPath },
        });
      }
    }
  }
}

export {
  buildBottomBarCommand,
  buildFullBrandingCommand,
  buildIntroOutroOverlayCommand,
  buildLogoOverlayCommand,
  type FullBrandingInput,
  type LogoPosition,
} from './ffmpeg-overlay-generator';
export { type StudioPlan, shouldApplyBranding } from './plan-logic';

export const __test__ = {
  SANDBOX_WORKDIR,
  DEFAULT_BRAND_COLOR,
  UNBRANDED_CROSSFADE_DURATION,
};
