'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Library orchestrator (Client Component).
// Layout: header + filters + grid + sticky bulk operations + cross-link gallery STUB.
// Consume tRPC studio.library.{list, countByUser}. ADR-050 canon: pill buttons,
// white-pure heading, hover translateY-only, motion ≤ 850ms.

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import {
  STUDIO_LIBRARY_DATE_RANGES,
  STUDIO_PROJECT_TYPES,
  STUDIO_VIDEO_FORMATS,
} from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { BulkOperations } from './BulkOperations';
import { LibraryEmptyState } from './LibraryEmptyState';
import { LibraryFilters, type LibraryFiltersValue } from './LibraryFilters';
import { LibraryVideoCard } from './LibraryVideoCard';
import { StudioCrossLinkPublicGallery } from './StudioCrossLinkPublicGallery';
import type {
  LibraryVideoRow,
  StudioLibraryDateRange,
  StudioProjectType,
  StudioVideoFormat,
} from './types';

export interface LibraryPageProps {
  readonly locale: string;
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

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  aspectRatio: '4 / 5',
};

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

const errorStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  color: 'var(--canon-cream-2)',
  padding: '24px',
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
};

function isProjectType(value: string | null): value is StudioProjectType {
  if (!value) return false;
  return (STUDIO_PROJECT_TYPES as readonly string[]).includes(value);
}
function isFormat(value: string | null): value is StudioVideoFormat {
  if (!value) return false;
  return (STUDIO_VIDEO_FORMATS as readonly string[]).includes(value);
}
function isDateRange(value: string | null): value is StudioLibraryDateRange {
  if (!value) return false;
  return (STUDIO_LIBRARY_DATE_RANGES as readonly string[]).includes(value);
}

export function LibraryPage({ locale }: LibraryPageProps) {
  const t = useTranslations('Studio.library');
  const searchParams = useSearchParams();

  const initialFilters: LibraryFiltersValue = useMemo(() => {
    const projectTypeRaw = searchParams?.get('projectType') ?? null;
    const formatRaw = searchParams?.get('format') ?? null;
    const dateRangeRaw = searchParams?.get('dateRange') ?? null;
    const search = searchParams?.get('search') ?? '';
    return {
      projectType: isProjectType(projectTypeRaw) ? projectTypeRaw : '',
      format: isFormat(formatRaw) ? formatRaw : '',
      dateRange: isDateRange(dateRangeRaw) ? dateRangeRaw : 'all',
      search,
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<LibraryFiltersValue>(initialFilters);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set<string>());

  const countQuery = trpc.studio.library.countByUser.useQuery();

  const listQuery = trpc.studio.library.list.useQuery({
    limit: 24,
    ...(filters.projectType ? { projectType: filters.projectType } : {}),
    ...(filters.format ? { format: filters.format } : {}),
    dateRange: filters.dateRange,
    ...(filters.search ? { search: filters.search } : {}),
  });

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set<string>());
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const totalCount = countQuery.data?.count ?? 0;
  const isCountLoading = countQuery.isLoading;
  const videos = (listQuery.data ?? []) as ReadonlyArray<LibraryVideoRow>;
  const isListLoading = listQuery.isLoading;
  const isListError = listQuery.isError;

  if (!isCountLoading && totalCount === 0) {
    return (
      <>
        <FadeUp delay={0}>
          <header className="flex flex-col gap-2">
            <h1 style={headingStyle}>{t('pageTitle')}</h1>
            <p style={subtitleStyle}>{t('pageSubtitle')}</p>
          </header>
        </FadeUp>
        <FadeUp delay={0.1}>
          <LibraryEmptyState locale={locale} />
        </FadeUp>
        <FadeUp delay={0.2}>
          <StudioCrossLinkPublicGallery />
        </FadeUp>
      </>
    );
  }

  return (
    <>
      <FadeUp delay={0}>
        <header className="flex flex-col gap-2">
          <h1 style={headingStyle}>{t('pageTitle')}</h1>
          <p style={subtitleStyle}>{t('pageSubtitle')}</p>
        </header>
      </FadeUp>

      <FadeUp delay={0.1}>
        <LibraryFilters value={filters} onChange={setFilters} />
      </FadeUp>

      <FadeUp delay={0.2}>
        {isListError ? (
          <div role="alert" style={errorStyle} data-testid="library-error">
            {t('errorLoading')}
          </div>
        ) : isListLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3" data-testid="library-loading">
            {SKELETON_KEYS.map((key) => (
              <div key={key} aria-hidden="true" style={skeletonStyle} />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div role="status" style={errorStyle} data-testid="library-no-results">
            {t('emptyTitle')}
          </div>
        ) : (
          <ul
            className="grid grid-cols-2 gap-4 md:grid-cols-3"
            data-testid="library-grid"
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {videos.map((video) => (
              <li key={video.id}>
                <LibraryVideoCard
                  locale={locale}
                  video={video}
                  selected={selectedIds.has(video.id)}
                  onToggleSelect={handleToggleSelect}
                  onDeleted={handleDeleted}
                />
              </li>
            ))}
          </ul>
        )}
      </FadeUp>

      <BulkOperations selectedIds={selectedIds} onClear={handleClearSelection} />

      <FadeUp delay={0.3}>
        <StudioCrossLinkPublicGallery />
      </FadeUp>
    </>
  );
}
