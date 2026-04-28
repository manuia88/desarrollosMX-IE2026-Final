'use client';

// ADR-059 — M17 (Atlas / Market Observatory) cities filter integration STUB.
// Atlas landing (app/[locale]/(public)/atlas/page.tsx) is a server component listing all
// published colonias. This client-side filter narrows the visible list by city when present
// in the URL via ?city=<slug>. Rendered as optional toolbar above the colonia grid.
// Full M17 cities-aware filtering (pre-fetch by city) agendado L-NEW-CITIES-ATLAS-FULL H2.

import { CitySelector } from './CitySelector';

export interface CitiesAtlasFilterProps {
  readonly locale: string;
  readonly currentCity?: string;
  readonly labelText?: string;
  readonly placeholderText?: string;
  readonly allCitiesText?: string;
}

export function CitiesAtlasFilter({
  locale,
  currentCity,
  labelText,
  placeholderText,
  allCitiesText,
}: CitiesAtlasFilterProps): React.ReactElement {
  return (
    <div
      role="toolbar"
      aria-label={labelText ?? 'Filter atlas by city'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
      }}
    >
      <CitySelector
        locale={locale}
        {...(currentCity !== undefined ? { currentCity } : {})}
        {...(labelText !== undefined ? { labelText } : {})}
        {...(placeholderText !== undefined ? { placeholderText } : {})}
        {...(allCitiesText !== undefined ? { allCitiesText } : {})}
        includeBeta
      />
    </div>
  );
}
