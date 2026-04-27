'use client';

// FASE 14.F.2 Sprint 1 — Project Result Page orchestrator (Client Component).
// Consume tRPC studio.projects.getById. Renders 3 hook tabs, video player,
// copy pack viewer, share whatsapp, download buttons, feedback form.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { CopyPackViewer } from './CopyPackViewer';
import { FeedbackForm } from './FeedbackForm';
import { HookSelector, type HookVariant } from './HookSelector';
import { ShareWhatsappButton } from './ShareWhatsappButton';

export interface ResultPageProps {
  readonly projectId: string;
  readonly locale: string;
}

interface VideoOutputShape {
  readonly id: string;
  readonly hook_variant: 'hook_a' | 'hook_b' | 'hook_c';
  readonly format: '9x16' | '1x1' | '16x9' | '4x5';
  readonly storage_url: string;
  readonly selected_by_user: boolean;
  readonly duration_seconds: number | null;
}

interface CopyOutputShape {
  readonly id: string;
  readonly channel: string;
  readonly content: string;
}

interface ProjectShape {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly director_brief: unknown;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
};

function extractHooks(brief: unknown): ReadonlyArray<string> {
  if (!brief || typeof brief !== 'object') return [];
  const shape = brief as { hooks?: unknown };
  if (!Array.isArray(shape.hooks)) return [];
  return shape.hooks.filter((h): h is string => typeof h === 'string').slice(0, 3);
}

function extractPortalDescription(copy: ReadonlyArray<CopyOutputShape>): string {
  const found = copy.find((c) => c.channel === 'portal_listing');
  return found?.content ?? '';
}

export function ResultPage({ projectId }: ResultPageProps) {
  const t = useTranslations('Studio.result');

  const projectQuery = trpc.studio.projects.getById.useQuery({ projectId });

  const initialSelected = useMemo<HookVariant>(() => {
    const outputs =
      (projectQuery.data?.outputs as ReadonlyArray<VideoOutputShape> | undefined) ?? [];
    const sel = outputs.find((o) => o.selected_by_user);
    return (sel?.hook_variant ?? 'hook_a') as HookVariant;
  }, [projectQuery.data]);

  const [currentHook, setCurrentHook] = useState<HookVariant>(initialSelected);

  if (projectQuery.isLoading) {
    return (
      <FadeUp delay={0}>
        <Card variant="elevated" className="flex flex-col gap-3 p-8">
          <h1 style={headingStyle}>{t('title')}</h1>
          <p style={subtitleStyle}>{t('subtitle')}</p>
        </Card>
      </FadeUp>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <FadeUp delay={0}>
        <Card variant="elevated" className="flex flex-col gap-3 p-8">
          <h1 style={headingStyle}>{t('errorTitle')}</h1>
          <p role="alert" style={subtitleStyle}>
            {projectQuery.error?.message ?? 'unknown_error'}
          </p>
        </Card>
      </FadeUp>
    );
  }

  const project = projectQuery.data.project as ProjectShape;
  const outputs = projectQuery.data.outputs as ReadonlyArray<VideoOutputShape>;
  const copy = projectQuery.data.copy as ReadonlyArray<CopyOutputShape>;
  const hooks = extractHooks(project.director_brief);
  const portalDescription = extractPortalDescription(copy);

  const selectedByUser = outputs.find((o) => o.selected_by_user)?.hook_variant ?? null;
  const currentVideo = outputs.find((o) => o.hook_variant === currentHook && o.format === '9x16');

  const downloads = outputs.filter((o) => o.hook_variant === currentHook);

  return (
    <>
      <FadeUp delay={0}>
        <header className="flex flex-col gap-2">
          <h1 style={headingStyle}>{t('title')}</h1>
          <p style={subtitleStyle}>{t('subtitle')}</p>
          <DisclosurePill tone="indigo">{project.title}</DisclosurePill>
        </header>
      </FadeUp>

      <FadeUp delay={0.1}>
        <HookSelector
          projectId={projectId}
          currentHook={currentHook}
          hooks={hooks}
          selectedByUser={(selectedByUser as HookVariant | null) ?? null}
          onSelect={(hook) => {
            setCurrentHook(hook);
          }}
        />
      </FadeUp>

      <FadeUp delay={0.15}>
        <Card
          variant="elevated"
          className="flex flex-col gap-4 p-5"
          data-testid="result-video-card"
        >
          {currentVideo ? (
            <video
              controls
              preload="metadata"
              src={currentVideo.storage_url}
              style={{
                width: '100%',
                maxHeight: '70vh',
                borderRadius: 'var(--canon-radius-card)',
                background: '#000',
              }}
              data-testid={`video-${currentHook}`}
            >
              <track kind="captions" />
            </video>
          ) : (
            <p style={subtitleStyle}>—</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <ShareWhatsappButton
              title={project.title}
              description={portalDescription}
              videoUrl={currentVideo?.storage_url ?? ''}
            />
            {downloads.map((d) => (
              <a
                key={d.id}
                href={d.storage_url}
                download
                data-testid={`download-${d.format}`}
                style={{
                  textDecoration: 'none',
                }}
              >
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.assign(d.storage_url);
                    }
                  }}
                >
                  {t('downloadButton')} · {t('formatLabel')} {d.format}
                </Button>
              </a>
            ))}
          </div>
        </Card>
      </FadeUp>

      <FadeUp delay={0.2}>
        <CopyPackViewer outputs={copy} />
      </FadeUp>

      <FadeUp delay={0.25}>
        <FeedbackForm projectId={projectId} currentHook={currentHook} />
      </FadeUp>
    </>
  );
}
