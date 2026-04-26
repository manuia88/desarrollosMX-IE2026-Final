'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useId } from 'react';
import { useFilterState } from '../hooks/use-filter-state';
import { captacionOperacionEnum, captacionStatusEnum } from '../lib/filter-schemas';

export function CaptacionFilters() {
  const t = useTranslations('AsesorCaptaciones.filters');
  const { filters, setFilter, clear, hasActiveFilters } = useFilterState();
  const searchId = useId();

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    padding: '12px 28px',
    borderBottom: '1px solid var(--canon-border)',
    background: 'var(--canon-bg)',
    position: 'sticky',
    top: 54,
    zIndex: 4,
  };

  const searchWrapStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    minWidth: 240,
    flex: '1 1 240px',
    maxWidth: 360,
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg-2)',
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
  };

  const dropdownStyle: CSSProperties = {
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
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px 12px',
  };

  return (
    <section style={containerStyle} aria-label={t('ariaSearch')}>
      <div style={searchWrapStyle}>
        <span aria-hidden="true" style={{ fontSize: 14, color: 'var(--canon-cream-3)' }}>
          ⌕
        </span>
        <input
          id={searchId}
          type="search"
          value={filters.q ?? ''}
          onChange={(e) => setFilter('q', e.target.value || undefined)}
          placeholder={t('search')}
          aria-label={t('ariaSearch')}
          style={inputStyle}
        />
      </div>

      <select
        aria-label={t('country')}
        value={filters.countryCode ?? ''}
        onChange={(e) => setFilter('countryCode', e.target.value || undefined)}
        style={dropdownStyle}
      >
        <option value="">{t('country')}</option>
        <option value="MX">MX</option>
        <option value="US">US</option>
        <option value="CO">CO</option>
        <option value="AR">AR</option>
        <option value="BR">BR</option>
      </select>

      <select
        aria-label={t('status')}
        value={filters.status ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setFilter('status', v ? captacionStatusEnum.parse(v) : undefined);
        }}
        style={dropdownStyle}
      >
        <option value="">{t('status')}</option>
        <option value="prospecto">{t('statusOption.prospecto')}</option>
        <option value="presentacion">{t('statusOption.presentacion')}</option>
        <option value="firmado">{t('statusOption.firmado')}</option>
        <option value="en_promocion">{t('statusOption.en_promocion')}</option>
        <option value="vendido">{t('statusOption.vendido')}</option>
        <option value="cerrado_no_listado">{t('statusOption.cerrado_no_listado')}</option>
      </select>

      <select
        aria-label={t('operacion')}
        value={filters.operacion ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setFilter('operacion', v ? captacionOperacionEnum.parse(v) : undefined);
        }}
        style={dropdownStyle}
      >
        <option value="">{t('operacion')}</option>
        <option value="venta">{t('operacionOption.venta')}</option>
        <option value="renta">{t('operacionOption.renta')}</option>
      </select>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clear}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--canon-radius-pill)',
            border: '1px solid var(--canon-border-2)',
            background: 'transparent',
            color: 'var(--canon-cream-2)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {t('clear')}
        </button>
      ) : null}
    </section>
  );
}
