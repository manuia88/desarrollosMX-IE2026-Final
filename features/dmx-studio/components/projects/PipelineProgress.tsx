'use client';

// FASE 14.F.2 Sprint 1 — DMX Studio pipeline progress (Tarea 1.5 BIBLIA).
// Polling cada 5s a trpc.studio.projects.getStatus. Visual: 3 stages (Kling / Voice / Music).
// ADR-050 canon: pill buttons, brand gradient firma, motion ≤ 850ms, prefers-reduced-motion respect.
// A11y: aria-live polite, aria-progressbar valuenow, focus visible, keyboard-friendly retry.

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface PipelineProgressProps {
  readonly projectId: string;
  readonly locale: string;
}

type StageKey = 'kling' | 'voice' | 'music';
type StageStatus = 'pending' | 'running' | 'completed' | 'failed';

interface StageView {
  readonly key: StageKey;
  readonly labelKey: string;
  readonly status: StageStatus;
  readonly errorMessage: string | null;
}

interface JobShape {
  readonly job_type: string;
  readonly status: string;
  readonly error_message: string | null;
}

interface StatusPayload {
  readonly projectStatus: string;
  readonly jobs: ReadonlyArray<JobShape>;
}

function deriveStageStatus(
  jobs: ReadonlyArray<JobShape>,
  filter: (job: JobShape) => boolean,
): { status: StageStatus; errorMessage: string | null } {
  const matching = jobs.filter(filter);
  if (matching.length === 0) return { status: 'pending', errorMessage: null };
  if (matching.some((j) => j.status === 'failed')) {
    const firstFailed = matching.find((j) => j.status === 'failed');
    return { status: 'failed', errorMessage: firstFailed?.error_message ?? null };
  }
  if (matching.every((j) => j.status === 'completed')) {
    return { status: 'completed', errorMessage: null };
  }
  return { status: 'running', errorMessage: null };
}

function deriveStages(payload: StatusPayload | undefined): readonly StageView[] {
  const jobs = payload?.jobs ?? [];
  const klingState = deriveStageStatus(jobs, (j) => j.job_type === 'kling_render');
  const ttsState = deriveStageStatus(jobs, (j) => j.job_type === 'elevenlabs_voice' && true);
  // Voice stage: first elevenlabs_voice job is TTS (sub-agent 4 inserts TTS first then music in parallel).
  // Music stage: second elevenlabs_voice job. Approx: split halves de elevenlabs_voice array.
  const evJobs = jobs.filter((j) => j.job_type === 'elevenlabs_voice');
  const ttsJobs = evJobs.slice(0, Math.max(1, Math.floor(evJobs.length / 2)));
  const musicJobs = evJobs.slice(Math.max(1, Math.floor(evJobs.length / 2)));
  const ttsStateScoped = ttsJobs.length === 0 ? ttsState : deriveStageStatus(ttsJobs, () => true);
  const musicStateScoped =
    musicJobs.length === 0
      ? { status: 'pending' as StageStatus, errorMessage: null }
      : deriveStageStatus(musicJobs, () => true);

  return [
    {
      key: 'kling',
      labelKey: 'stageKling',
      status: klingState.status,
      errorMessage: klingState.errorMessage,
    },
    {
      key: 'voice',
      labelKey: 'stageVoice',
      status: ttsStateScoped.status,
      errorMessage: ttsStateScoped.errorMessage,
    },
    {
      key: 'music',
      labelKey: 'stageMusic',
      status: musicStateScoped.status,
      errorMessage: musicStateScoped.errorMessage,
    },
  ];
}

function progressPercent(stages: readonly StageView[]): number {
  if (stages.length === 0) return 0;
  const completed = stages.filter((s) => s.status === 'completed').length;
  const running = stages.filter((s) => s.status === 'running').length;
  const partial = running * 0.5;
  return Math.round(((completed + partial) / stages.length) * 100);
}

const TERMINAL_PROJECT_STATUSES = new Set(['rendered', 'failed', 'published', 'archived']);

export function PipelineProgress({ projectId, locale: _locale }: PipelineProgressProps) {
  const t = useTranslations('Studio.pipeline');
  const generateVideo = trpc.studio.projects.generateVideo.useMutation();

  const statusQuery = trpc.studio.projects.getStatus.useQuery(
    { projectId },
    {
      refetchInterval(query) {
        const data = query.state.data;
        if (!data) return 5000;
        if (TERMINAL_PROJECT_STATUSES.has(data.projectStatus)) return false;
        return 5000;
      },
      refetchIntervalInBackground: false,
    },
  );

  const payload = statusQuery.data as StatusPayload | undefined;
  const stages = useMemo(() => deriveStages(payload), [payload]);
  const percent = progressPercent(stages);
  const projectStatus = payload?.projectStatus ?? 'unknown';
  const isFailed = projectStatus === 'failed' || stages.some((s) => s.status === 'failed');
  const isEmpty = !payload || (payload.jobs.length === 0 && projectStatus === 'rendering');

  const handleRetry = (): void => {
    if (generateVideo.isPending) return;
    generateVideo.mutate({ projectId });
  };

  return (
    <FadeUp>
      <Card variant="elevated" className="flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-2">
          <h2
            className="font-[var(--font-display)] text-xl font-bold tracking-tight"
            style={{ color: '#FFFFFF' }}
          >
            {t('title')}
          </h2>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)', lineHeight: 1.55 }}>
            {t('subtitle')}
          </p>
        </header>

        <div
          aria-live="polite"
          aria-atomic="true"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t('title')}
          style={{
            position: 'relative',
            height: '8px',
            borderRadius: 'var(--canon-radius-pill)',
            background: 'var(--surface-recessed)',
            border: '1px solid var(--canon-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: 'var(--gradient-ai)',
              transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
              borderRadius: 'var(--canon-radius-pill)',
            }}
          />
        </div>

        {isEmpty ? (
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)', lineHeight: 1.55 }}>
            {t('initializing')}
          </p>
        ) : (
          <ol
            aria-label={t('title')}
            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}
          >
            {stages.map((stage) => (
              <StageRow key={stage.key} stage={stage} t={t} />
            ))}
          </ol>
        )}

        {isFailed && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              background: 'rgba(244,63,94,0.10)',
              border: '1px solid rgba(244,63,94,0.30)',
              borderRadius: 'var(--canon-radius-card)',
              display: 'grid',
              gap: '10px',
            }}
          >
            <p style={{ margin: 0, fontSize: '13px', color: '#FCA5A5' }}>{t('errorMessage')}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleRetry}
              disabled={generateVideo.isPending}
              aria-busy={generateVideo.isPending}
            >
              {t('retryButton')}
            </Button>
          </div>
        )}
      </Card>
    </FadeUp>
  );
}

interface StageRowProps {
  readonly stage: StageView;
  readonly t: (key: string) => string;
}

function StageRow({ stage, t }: StageRowProps) {
  const indicatorBackground =
    stage.status === 'completed'
      ? 'var(--gradient-ai)'
      : stage.status === 'running'
        ? 'var(--gradient-ai)'
        : stage.status === 'failed'
          ? 'rgba(244,63,94,0.18)'
          : 'var(--surface-recessed)';
  const indicatorColor =
    stage.status === 'pending'
      ? 'var(--canon-cream-2)'
      : stage.status === 'failed'
        ? '#FCA5A5'
        : '#FFFFFF';
  const showPulse = stage.status === 'running';
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        background: 'var(--surface-recessed)',
        border: '1px solid var(--canon-border)',
        borderRadius: 'var(--canon-radius-card)',
      }}
    >
      <span
        aria-hidden="true"
        className={showPulse ? 'pipeline-stage-pulse' : ''}
        style={{
          display: 'inline-flex',
          width: '12px',
          height: '12px',
          borderRadius: 'var(--canon-radius-pill)',
          background: indicatorBackground,
          border: '1px solid var(--canon-border-2)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: '13.5px',
          color: 'var(--canon-cream)',
          lineHeight: 1.45,
        }}
      >
        {t(stage.labelKey)}
      </span>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.02em',
          padding: '4px 10px',
          borderRadius: 'var(--canon-radius-pill)',
          background:
            stage.status === 'completed' || stage.status === 'running'
              ? 'rgba(99,102,241,0.16)'
              : stage.status === 'failed'
                ? 'rgba(244,63,94,0.16)'
                : 'transparent',
          color: indicatorColor,
          border:
            stage.status === 'pending' ? '1px solid var(--canon-border)' : '1px solid transparent',
        }}
      >
        {t(`status${capitalize(stage.status)}`)}
      </span>
      <style>{`
        @keyframes pipeline-stage-breath {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(99,102,241,0.45); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(99,102,241,0); }
        }
        .pipeline-stage-pulse { animation: pipeline-stage-breath 850ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pipeline-stage-pulse { animation: none !important; }
        }
      `}</style>
    </li>
  );
}

function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
