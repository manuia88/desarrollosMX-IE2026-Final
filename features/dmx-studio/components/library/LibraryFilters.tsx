'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Library filters bar.
// 4 filters: projectType, format, dateRange, search. URL state via Next.js
// useSearchParams + router.replace (nuqs no en stack actual). Debounced search.

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  STUDIO_LIBRARY_DATE_RANGES,
  STUDIO_PROJECT_TYPES,
  STUDIO_VIDEO_FORMATS,
} from '@/features/dmx-studio/schemas';
import type { StudioLibraryDateRange, StudioProjectType, StudioVideoFormat } from './types';

const SEARCH_DEBOUNCE_MS = 300;

const fieldStyle: CSSProperties = {
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '36px',
  padding: '0 14px',
  borderRadius: 'var(--canon-radius-pill)',
  border: '1px solid var(--canon-border)',
  background: 'var(--surface-recessed)',
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  fontWeight: 500,
  outline: 'none',
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

export interface LibraryFiltersValue {
  readonly projectType: StudioProjectType | '';
  readonly format: StudioVideoFormat | '';
  readonly dateRange: StudioLibraryDateRange;
  readonly search: string;
}

export interface LibraryFiltersProps {
  readonly value: LibraryFiltersValue;
  readonly onChange: (next: LibraryFiltersValue) => void;
}

function isProjectType(value: string): value is StudioProjectType {
  return (STUDIO_PROJECT_TYPES as readonly string[]).includes(value);
}

function isFormat(value: string): value is StudioVideoFormat {
  return (STUDIO_VIDEO_FORMATS as readonly string[]).includes(value);
}

function isDateRange(value: string): value is StudioLibraryDateRange {
  return (STUDIO_LIBRARY_DATE_RANGES as readonly string[]).includes(value);
}

export function LibraryFilters({ value, onChange }: LibraryFiltersProps) {
  const t = useTranslations('Studio.library');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState<string>(value.search);

  const projectTypeLabel = useCallback(
    (type: StudioProjectType): string => {
      const map: Record<StudioProjectType, string> = {
        standard: t('projectTypeStandard'),
        series: t('projectTypeSeries'),
        reel: t('projectTypeReel'),
        story: t('projectTypeStory'),
        portrait: t('projectTypePortrait'),
        documentary: t('projectTypeDocumentary'),
        remarketing: t('projectTypeRemarketing'),
      };
      return map[type];
    },
    [t],
  );

  const formatLabel = useCallback(
    (format: StudioVideoFormat): string => {
      if (format === '9x16') return t('format9x16');
      if (format === '1x1') return t('format1x1');
      return t('format16x9');
    },
    [t],
  );

  const dateRangeLabel = useCallback(
    (range: StudioLibraryDateRange): string => {
      if (range === '7d') return t('dateRange7d');
      if (range === '30d') return t('dateRange30d');
      if (range === '90d') return t('dateRange90d');
      return t('dateRangeAll');
    },
    [t],
  );

  const writeUrl = useCallback(
    (next: LibraryFiltersValue) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (next.projectType) params.set('projectType', next.projectType);
      else params.delete('projectType');
      if (next.format) params.set('format', next.format);
      else params.delete('format');
      if (next.dateRange && next.dateRange !== 'all') params.set('dateRange', next.dateRange);
      else params.delete('dateRange');
      if (next.search) params.set('search', next.search);
      else params.delete('search');
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchParams],
  );

  const handleProjectType = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const raw = event.target.value;
      const next: LibraryFiltersValue = {
        ...value,
        projectType: raw === '' ? '' : isProjectType(raw) ? raw : '',
      };
      onChange(next);
      writeUrl(next);
    },
    [onChange, value, writeUrl],
  );

  const handleFormat = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const raw = event.target.value;
      const next: LibraryFiltersValue = {
        ...value,
        format: raw === '' ? '' : isFormat(raw) ? raw : '',
      };
      onChange(next);
      writeUrl(next);
    },
    [onChange, value, writeUrl],
  );

  const handleDateRange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const raw = event.target.value;
      const next: LibraryFiltersValue = {
        ...value,
        dateRange: isDateRange(raw) ? raw : 'all',
      };
      onChange(next);
      writeUrl(next);
    },
    [onChange, value, writeUrl],
  );

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(event.target.value);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localSearch === value.search) return;
      const next: LibraryFiltersValue = { ...value, search: localSearch };
      onChange(next);
      writeUrl(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [localSearch, onChange, value, writeUrl]);

  const projectOptions = useMemo(
    () => STUDIO_PROJECT_TYPES.map((type) => ({ value: type, label: projectTypeLabel(type) })),
    [projectTypeLabel],
  );
  const formatOptions = useMemo(
    () => STUDIO_VIDEO_FORMATS.map((format) => ({ value: format, label: formatLabel(format) })),
    [formatLabel],
  );
  const dateRangeOptions = useMemo(
    () =>
      STUDIO_LIBRARY_DATE_RANGES.map((range) => ({ value: range, label: dateRangeLabel(range) })),
    [dateRangeLabel],
  );

  return (
    <section
      aria-label={t('filterSearch')}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="library-filters"
    >
      <div>
        <label htmlFor="library-filter-project-type" style={labelStyle}>
          {t('filterProjectType')}
        </label>
        <select
          id="library-filter-project-type"
          data-testid="library-filter-project-type"
          value={value.projectType}
          onChange={handleProjectType}
          style={fieldStyle}
        >
          <option value="">{t('dateRangeAll')}</option>
          {projectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="library-filter-format" style={labelStyle}>
          {t('filterFormat')}
        </label>
        <select
          id="library-filter-format"
          data-testid="library-filter-format"
          value={value.format}
          onChange={handleFormat}
          style={fieldStyle}
        >
          <option value="">{t('dateRangeAll')}</option>
          {formatOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="library-filter-date-range" style={labelStyle}>
          {t('filterDateRange')}
        </label>
        <select
          id="library-filter-date-range"
          data-testid="library-filter-date-range"
          value={value.dateRange}
          onChange={handleDateRange}
          style={fieldStyle}
        >
          {dateRangeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="library-filter-search" style={labelStyle}>
          {t('filterSearch')}
        </label>
        <input
          id="library-filter-search"
          data-testid="library-filter-search"
          type="search"
          value={localSearch}
          onChange={handleSearchChange}
          placeholder={t('filterSearch')}
          style={fieldStyle}
        />
      </div>
    </section>
  );
}
