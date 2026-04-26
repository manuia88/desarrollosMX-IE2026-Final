'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useContactosFilters } from '../hooks/use-contactos-filters';
import { STATUSES } from '../schemas/filter-schemas';

export function ContactsFilters() {
  const t = useTranslations('AsesorContactos.filters');
  const { filters, setStatus, setSearch } = useContactosFilters();

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: '16px 28px',
    borderBottom: '1px solid var(--canon-border)',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  const inputStyle: CSSProperties = {
    flex: '1 1 220px',
    minWidth: 220,
    padding: '8px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border)',
    background: 'var(--surface-recessed)',
    color: 'var(--canon-cream)',
    fontSize: 13,
  };

  const selectStyle: CSSProperties = {
    padding: '8px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border)',
    background: 'var(--surface-recessed)',
    color: 'var(--canon-cream)',
    fontSize: 13,
    cursor: 'pointer',
  };

  return (
    <search style={containerStyle} aria-label={t('aria')}>
      <input
        type="search"
        placeholder={t('searchPlaceholder')}
        defaultValue={filters.q ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          setSearch(value || undefined);
        }}
        style={inputStyle}
        aria-label={t('searchAria')}
      />
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--canon-cream-2)' }}>{t('statusLabel')}</span>
        <select
          value={filters.status ?? 'all'}
          onChange={(event) => {
            const value = event.target.value;
            setStatus(value === 'all' ? undefined : (value as (typeof STATUSES)[number]));
          }}
          style={selectStyle}
        >
          <option value="all">{t('statusAll')}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statusLabels.${status}`)}
            </option>
          ))}
        </select>
      </label>
    </search>
  );
}
