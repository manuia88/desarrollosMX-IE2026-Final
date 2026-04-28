'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useId, useMemo } from 'react';
import { getActiveCities } from '@/shared/lib/cities/registry';
import { IconSearch } from '@/shared/ui/icons/canon-icons';
import { useDesarrollosFilters } from '../hooks/use-desarrollos-filters';
import { tipoEnum } from '../lib/filter-schemas';
import { DesarrollosSort } from './desarrollos-sort';

// ADR-059 — registry-driven cities dropdown. Maps slug → display name; setFilter('city') stores the
// display name to preserve existing ILIKE-based string filter semantics.
const CITY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  cdmx: 'México',
  'playa-del-carmen': 'Playa del Carmen',
  guadalajara: 'Guadalajara',
  queretaro: 'Querétaro',
  dubai: 'Dubai',
};

export function DesarrollosFilters() {
  const t = useTranslations('AsesorDesarrollos.filters');
  const { filters, setFilter, clear, hasActiveFilters } = useDesarrollosFilters();
  const searchId = useId();

  const cityOptions = useMemo(() => {
    const list = getActiveCities(filters.countryCode);
    return list.map((c) => ({
      slug: c.slug,
      label: CITY_DISPLAY_NAMES[c.slug] ?? c.slug,
      isBeta: c.status === 'beta',
    }));
  }, [filters.countryCode]);

  const matchedCitySlug = useMemo<string>(() => {
    const current = filters.city;
    if (!current) return '';
    const found = cityOptions.find((o) => o.label === current);
    return found ? found.slug : '';
  }, [cityOptions, filters.city]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    padding: '12px 28px',
    borderBottom: '1px solid var(--canon-border)',
    background: 'var(--canon-bg)',
    position: 'sticky',
    top: 109,
    zIndex: 4,
  };

  const searchWrapStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    minWidth: 280,
    flex: '1 1 280px',
    maxWidth: 400,
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

  const dropdownBaseStyle: CSSProperties = {
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

  const numberInputStyle: CSSProperties = {
    padding: '8px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg-2)',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    width: 140,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <section style={containerStyle} aria-label={t('ariaSearch')}>
      <div style={searchWrapStyle}>
        <IconSearch size={16} aria-hidden="true" />
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
        style={dropdownBaseStyle}
      >
        <option value="">{t('country')}</option>
        <option value="MX">MX</option>
        <option value="CO">CO</option>
        <option value="AR">AR</option>
        <option value="BR">BR</option>
        <option value="US">US</option>
      </select>

      <select
        aria-label={t('city')}
        value={matchedCitySlug}
        onChange={(e) => {
          const slug = e.target.value;
          if (!slug) {
            setFilter('city', undefined);
            return;
          }
          const opt = cityOptions.find((o) => o.slug === slug);
          setFilter('city', opt ? opt.label : undefined);
        }}
        style={dropdownBaseStyle}
      >
        <option value="">{t('city')}</option>
        {cityOptions.map((opt) => (
          <option key={opt.slug} value={opt.slug}>
            {opt.label}
            {opt.isBeta ? ' (Beta)' : ''}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={filters.city && !matchedCitySlug ? filters.city : ''}
        onChange={(e) => setFilter('city', e.target.value || undefined)}
        placeholder={t('city')}
        aria-label={`${t('city')} (free)`}
        style={numberInputStyle}
      />

      <input
        type="text"
        value={filters.colonia ?? ''}
        onChange={(e) => setFilter('colonia', e.target.value || undefined)}
        placeholder={t('colonia')}
        aria-label={t('colonia')}
        style={numberInputStyle}
      />

      <input
        type="number"
        value={filters.priceMin ?? ''}
        onChange={(e) => setFilter('priceMin', e.target.value ? Number(e.target.value) : undefined)}
        placeholder={t('priceMin')}
        aria-label={t('priceMin')}
        min={0}
        style={numberInputStyle}
      />

      <input
        type="number"
        value={filters.priceMax ?? ''}
        onChange={(e) => setFilter('priceMax', e.target.value ? Number(e.target.value) : undefined)}
        placeholder={t('priceMax')}
        aria-label={t('priceMax')}
        min={0}
        style={numberInputStyle}
      />

      <select
        aria-label={t('tipo')}
        value={filters.tipo ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          setFilter('tipo', v ? tipoEnum.parse(v) : undefined);
        }}
        style={dropdownBaseStyle}
      >
        <option value="">{t('tipo')}</option>
        <option value="departamento">Departamento</option>
        <option value="casa">Casa</option>
        <option value="terreno">Terreno</option>
        <option value="oficina">Oficina</option>
        <option value="local">Local</option>
      </select>

      <DesarrollosSort />

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
