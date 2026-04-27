'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Library video card.
// Per-video actions: download (signed url), share WA, delete (confirm), open project.
// Multi-select checkbox top-left. Card variant elevated, hover translateY-only (canon).

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type CSSProperties, useCallback, useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { type LibraryVideoRow, pickProject } from './types';

export interface LibraryVideoCardProps {
  readonly locale: string;
  readonly video: LibraryVideoRow;
  readonly selected: boolean;
  readonly onToggleSelect: (id: string) => void;
  readonly onDeleted?: (id: string) => void;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '14.5px',
  color: '#FFFFFF',
  lineHeight: 1.3,
};

const metaStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '12px',
  fontVariantNumeric: 'tabular-nums',
};

const thumbFallbackStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(99,102,241,0.30) 0%, rgba(236,72,153,0.20) 100%)',
  borderRadius: '12px',
  width: '100%',
  aspectRatio: '4 / 5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#FFFFFF',
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '24px',
  letterSpacing: '0.02em',
};

const checkboxStyle: CSSProperties = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  width: '20px',
  height: '20px',
  cursor: 'pointer',
  accentColor: '#6366F1',
  zIndex: 2,
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return 'hoy';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  if (days < 365) return `${Math.floor(days / 30)}mes`;
  return `${Math.floor(days / 365)}a`;
}

export function LibraryVideoCard({
  locale,
  video,
  selected,
  onToggleSelect,
  onDeleted,
}: LibraryVideoCardProps) {
  const t = useTranslations('Studio.library');
  const router = useRouter();

  const project = pickProject(video.studio_video_projects);
  const title = project?.title ?? video.id.slice(0, 8);
  const projectType = project?.project_type ?? 'standard';

  const bulkSignedUrls = trpc.studio.library.bulkSignedUrls.useMutation();
  const bulkShareMessage = trpc.studio.library.bulkShareMessage.useMutation();
  const deleteVideo = trpc.studio.library.delete.useMutation();
  const utils = trpc.useUtils();

  const formatLabel = useMemo<string>(() => {
    if (video.format === '9x16') return t('format9x16');
    if (video.format === '1x1') return t('format1x1');
    return t('format16x9');
  }, [video.format, t]);

  const projectTypeLabel = useMemo<string>(() => {
    const map: Record<string, string> = {
      standard: t('projectTypeStandard'),
      series: t('projectTypeSeries'),
      reel: t('projectTypeReel'),
      story: t('projectTypeStory'),
      portrait: t('projectTypePortrait'),
      documentary: t('projectTypeDocumentary'),
      remarketing: t('projectTypeRemarketing'),
    };
    return map[projectType] ?? projectType;
  }, [projectType, t]);

  const handleToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      event.stopPropagation();
      onToggleSelect(video.id);
    },
    [onToggleSelect, video.id],
  );

  const handleDownload = useCallback(async () => {
    const result = await bulkSignedUrls.mutateAsync({ videoOutputIds: [video.id] });
    const item = result.items[0];
    if (item?.signedUrl && typeof window !== 'undefined') {
      window.open(item.signedUrl, '_blank', 'noopener,noreferrer');
    }
  }, [bulkSignedUrls, video.id]);

  const handleShare = useCallback(async () => {
    const result = await bulkShareMessage.mutateAsync({ videoOutputIds: [video.id] });
    if (typeof window !== 'undefined') {
      const url = `https://wa.me/?text=${encodeURIComponent(result.whatsappMessage)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [bulkShareMessage, video.id]);

  const handleDelete = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm(t('deleteConfirm'));
    if (!confirmed) return;
    await deleteVideo.mutateAsync({ videoOutputId: video.id });
    await utils.studio.library.list.invalidate();
    await utils.studio.library.countByUser.invalidate();
    onDeleted?.(video.id);
  }, [deleteVideo, onDeleted, t, utils, video.id]);

  const handleOpen = useCallback(() => {
    router.push(`/${locale}/studio-app/projects/${video.project_id}`);
  }, [locale, router, video.project_id]);

  return (
    <Card
      variant="elevated"
      hoverable
      className="relative flex flex-col gap-3 p-4"
      data-testid={`library-video-card-${video.id}`}
    >
      <input
        type="checkbox"
        aria-label={t('bulkSelectLabel')}
        data-testid={`library-video-card-select-${video.id}`}
        checked={selected}
        onChange={handleToggle}
        style={checkboxStyle}
      />
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('actionOpen')}
        data-testid={`library-video-card-thumb-${video.id}`}
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {video.thumbnail_url ? (
          <span
            role="img"
            aria-label={title}
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '4 / 5',
              borderRadius: '12px',
              backgroundImage: `url(${video.thumbnail_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <span aria-hidden="true" style={thumbFallbackStyle}>
            DMX
          </span>
        )}
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <DisclosurePill tone="violet">{projectTypeLabel}</DisclosurePill>
        <DisclosurePill tone="indigo">{formatLabel}</DisclosurePill>
      </div>
      <p style={titleStyle}>{title}</p>
      <span style={metaStyle}>{formatRelative(video.created_at)}</span>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={bulkSignedUrls.isPending}
          aria-label={t('actionDownload')}
          data-testid={`library-video-card-download-${video.id}`}
        >
          {t('actionDownload')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleShare}
          disabled={bulkShareMessage.isPending}
          aria-label={t('actionShare')}
          data-testid={`library-video-card-share-${video.id}`}
        >
          {t('actionShare')}
        </Button>
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={handleOpen}
          aria-label={t('actionOpen')}
          data-testid={`library-video-card-open-${video.id}`}
        >
          {t('actionOpen')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleteVideo.isPending}
          aria-label={t('actionDelete')}
          data-testid={`library-video-card-delete-${video.id}`}
        >
          {t('actionDelete')}
        </Button>
      </div>
    </Card>
  );
}
