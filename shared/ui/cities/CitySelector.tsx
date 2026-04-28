'use client';

// ADR-059 — Cities selector (canon ADR-050 visual language).
// URL state via Next.js useSearchParams + useRouter.replace (nuqs not installed).
// Cookie fallback via document.cookie (writes only).

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type CSSProperties, useCallback, useMemo } from 'react';
import { type CitySettings, getActiveCities, getCitySettings } from '@/shared/lib/cities/registry';

const COOKIE_NAME = 'dmx_city';
const COOKIE_MAX_AGE_DAYS = 30;

function persistCookie(slug: string): void {
  if (typeof document === 'undefined') return;
  const maxAgeSec = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  // biome-ignore lint/suspicious/noDocumentCookie: cookies-next not installed; document.cookie write is intentional fallback persistence
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(slug)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

export interface CitySelectorProps {
  readonly currentCity?: string;
  readonly onChange?: (slug: string) => void;
  readonly countryFilter?: string;
  readonly locale: string;
  readonly includeBeta?: boolean;
  readonly labelText?: string;
  readonly placeholderText?: string;
  readonly betaText?: string;
  readonly allCitiesText?: string;
  readonly className?: string;
}

interface LabeledCity {
  readonly settings: CitySettings;
  readonly displayName: string;
}

function resolveDisplayName(city: CitySettings, locale: string): string {
  const isEnglish = locale.toLowerCase().startsWith('en');
  const fallback = (() => {
    switch (city.slug) {
      case 'cdmx':
        return isEnglish ? 'Mexico City' : 'Ciudad de México';
      case 'playa-del-carmen':
        return 'Playa del Carmen';
      case 'guadalajara':
        return 'Guadalajara';
      case 'queretaro':
        return isEnglish ? 'Queretaro' : 'Querétaro';
      case 'dubai':
        return isEnglish ? 'Dubai' : 'Dubái';
      default:
        return city.slug;
    }
  })();
  return fallback;
}

export function CitySelector({
  currentCity,
  onChange,
  countryFilter,
  locale,
  includeBeta = true,
  labelText,
  placeholderText,
  betaText = 'Beta',
  allCitiesText,
  className,
}: CitySelectorProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const cities = useMemo<ReadonlyArray<LabeledCity>>(() => {
    const list = getActiveCities(countryFilter).filter((c) => {
      if (c.status === 'coming_soon') return false;
      if (c.status === 'beta' && !includeBeta) return false;
      return true;
    });
    return list.map((settings) => ({
      settings,
      displayName: resolveDisplayName(settings, locale),
    }));
  }, [countryFilter, includeBeta, locale]);

  const activeSlug = useMemo<string>(() => {
    if (currentCity && getCitySettings(currentCity)) return currentCity;
    const fromUrl = sp.get('city');
    if (fromUrl && getCitySettings(fromUrl)) return fromUrl;
    return '';
  }, [currentCity, sp]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value;
      const params = new URLSearchParams(sp.toString());
      if (next) {
        params.set('city', next);
        persistCookie(next);
      } else {
        params.delete('city');
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      onChange?.(next);
    },
    [onChange, pathname, router, sp],
  );

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };

  const selectStyle: CSSProperties = {
    appearance: 'none',
    padding: '8px 36px 8px 14px',
    borderRadius: 9999,
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg-2)',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    minWidth: 200,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    backgroundSize: '12px 12px',
    transition:
      'transform var(--canon-duration-fast) var(--canon-ease-out), border-color var(--canon-duration-fast) ease',
  };

  const activeBetaBadge = useMemo<string | null>(() => {
    if (!activeSlug) return null;
    const settings = getCitySettings(activeSlug);
    if (!settings) return null;
    return settings.status === 'beta' ? betaText : null;
  }, [activeSlug, betaText]);

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    background: 'rgba(99, 102, 241, 0.18)',
    color: 'var(--canon-indigo-2)',
    border: '1px solid rgba(99, 102, 241, 0.35)',
  };

  const accessibleLabel = labelText ?? 'Select city';

  return (
    <div className={className} style={wrapperStyle}>
      <select
        aria-label={accessibleLabel}
        aria-expanded={false}
        value={activeSlug}
        onChange={handleChange}
        style={selectStyle}
      >
        <option value="">{allCitiesText ?? placeholderText ?? accessibleLabel}</option>
        {cities.map((city) => {
          const suffix = city.settings.status === 'beta' ? ` (${betaText})` : '';
          return (
            <option key={city.settings.slug} value={city.settings.slug}>
              {city.displayName}
              {suffix}
            </option>
          );
        })}
      </select>
      {activeBetaBadge ? (
        <span style={badgeStyle} aria-hidden="true">
          {activeBetaBadge}
        </span>
      ) : null}
    </div>
  );
}
