'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useId } from 'react';
import { useDesarrollosFilters } from '../hooks/use-desarrollos-filters';
import { SORT_KEYS, type SortKey } from '../lib/filter-schemas';

export function DesarrollosSort() {
  const t = useTranslations('AsesorDesarrollos.sort');
  const { filters, setFilter } = useDesarrollosFilters();
  const id = useId();

  const wrapperStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };
  const labelStyle: CSSProperties = {
    fontSize: 12,
    color: 'var(--canon-cream-2)',
    fontFamily: 'var(--font-body)',
  };
  const selectStyle: CSSProperties = {
    appearance: 'none',
    padding: '8px 32px 8px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg-2)',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    minWidth: 180,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px 12px',
  };

  return (
    <div style={wrapperStyle}>
      <label htmlFor={id} style={labelStyle}>
        {t('label')}
      </label>
      <select
        id={id}
        value={filters.sort}
        onChange={(e) => setFilter('sort', e.target.value as SortKey)}
        style={selectStyle}
        aria-label={t('label')}
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {t(key)}
          </option>
        ))}
      </select>
    </div>
  );
}
