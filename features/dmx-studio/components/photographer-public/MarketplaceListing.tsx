'use client';

// F14.F.10 Sprint 9 SUB-AGENT 4 — Marketplace listing (filters cliente).
// Split: applyMarketplaceFilters (pure helper) + MarketplaceListingPresentation (pure render)
// + MarketplaceListing (smart wrapper).

import Link from 'next/link';
import { type CSSProperties, useMemo, useState } from 'react';
import { IconCircle, ScorePill, tierFromScore } from '@/shared/ui/primitives/canon';

export interface MarketplacePhotographer {
  readonly id: string;
  readonly photographerId: string;
  readonly businessName: string;
  readonly slug: string;
  readonly bio: string | null;
  readonly ratingAvg: number;
  readonly specialityZones: ReadonlyArray<string>;
  readonly clientsCount: number;
  readonly tags: ReadonlyArray<string>;
  readonly listingPriority: number;
}

export interface MarketplaceFilters {
  readonly zone: string;
  readonly speciality: string;
  readonly minRating: number;
  readonly limit: number;
}

interface SmartProps {
  readonly photographers: ReadonlyArray<MarketplacePhotographer>;
  readonly locale: string;
}

interface PresentationProps {
  readonly photographers: ReadonlyArray<MarketplacePhotographer>;
  readonly locale: string;
  readonly filters: MarketplaceFilters;
  readonly allZones: ReadonlyArray<string>;
  readonly allSpecialities: ReadonlyArray<string>;
  readonly onFiltersChange: (next: MarketplaceFilters) => void;
}

const filterRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: '20px',
};

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--canon-border-2)',
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--canon-cream)',
  fontSize: '13px',
  fontFamily: 'var(--font-text)',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontSize: '11px',
  color: 'rgba(255,255,255,0.65)',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const cardStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  transition: 'transform var(--canon-duration-fast) var(--canon-ease-out)',
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 10px',
  borderRadius: '9999px',
  border: '1px solid rgba(99, 102, 241, 0.30)',
  background: 'rgba(99, 102, 241, 0.10)',
  color: 'var(--canon-indigo-2)',
  fontSize: '11px',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

/**
 * Pure filter helper. Aplica zone, speciality, minRating + limit.
 * Exportado para tests unitarios y reutilización externa.
 */
export function applyMarketplaceFilters(
  photographers: ReadonlyArray<MarketplacePhotographer>,
  filters: MarketplaceFilters,
): ReadonlyArray<MarketplacePhotographer> {
  return photographers
    .filter((p) => (filters.zone ? p.specialityZones.includes(filters.zone) : true))
    .filter((p) => (filters.speciality ? p.tags.includes(filters.speciality) : true))
    .filter((p) => p.ratingAvg >= filters.minRating)
    .slice(0, filters.limit);
}

export function MarketplaceListingPresentation({
  photographers,
  locale,
  filters,
  allZones,
  allSpecialities,
  onFiltersChange,
}: PresentationProps) {
  const filtered = applyMarketplaceFilters(photographers, filters);

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: filter row group; using fieldset/legend would conflict with grid layout. */}
      <div style={filterRowStyle} role="group" aria-label="Filtros marketplace">
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Zona</span>
          <select
            style={inputStyle}
            value={filters.zone}
            onChange={(e) => onFiltersChange({ ...filters, zone: e.target.value })}
            aria-label="Filtrar por zona"
            data-testid="filter-zone"
          >
            <option value="">Todas</option>
            {allZones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Especialidad</span>
          <select
            style={inputStyle}
            value={filters.speciality}
            onChange={(e) => onFiltersChange({ ...filters, speciality: e.target.value })}
            aria-label="Filtrar por especialidad"
            data-testid="filter-speciality"
          >
            <option value="">Todas</option>
            {allSpecialities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Rating mínimo: {filters.minRating.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={filters.minRating}
            onChange={(e) => onFiltersChange({ ...filters, minRating: Number(e.target.value) })}
            aria-label="Rating mínimo"
            data-testid="filter-min-rating"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Mostrar</span>
          <select
            style={inputStyle}
            value={String(filters.limit)}
            onChange={(e) => onFiltersChange({ ...filters, limit: Number(e.target.value) })}
            aria-label="Cantidad a mostrar"
            data-testid="filter-limit"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--canon-border)',
            borderRadius: 'var(--canon-radius-card)',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-text)',
            fontSize: '14px',
          }}
          data-empty-state="true"
        >
          No hay fotógrafos que coincidan con los filtros.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
          data-testid="marketplace-grid"
        >
          {filtered.map((p) => (
            <article key={p.id} style={cardStyle} data-testid="marketplace-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IconCircle
                  size="md"
                  tone="indigo"
                  icon={
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {getInitials(p.businessName)}
                    </span>
                  }
                />
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: 'var(--canon-cream)',
                      margin: 0,
                    }}
                  >
                    {p.businessName}
                  </h3>
                  {p.ratingAvg > 0 ? (
                    <ScorePill tier={tierFromScore(p.ratingAvg * 20)}>
                      {p.ratingAvg.toFixed(1)} ★
                    </ScorePill>
                  ) : null}
                </div>
              </div>
              {p.bio ? (
                <p
                  style={{
                    fontFamily: 'var(--font-text)',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.5,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.bio}
                </p>
              ) : null}
              {p.specialityZones.length > 0 ? (
                // biome-ignore lint/a11y/useSemanticElements: chips list with custom flex layout; ul/li would inject default list styling.
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
                  role="list"
                  aria-label="Zonas de especialidad"
                >
                  {p.specialityZones.slice(0, 3).map((z) => (
                    <span key={z} style={chipStyle}>
                      {z}
                    </span>
                  ))}
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: 'var(--font-text)',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                {p.clientsCount} {p.clientsCount === 1 ? 'cliente' : 'clientes'}
              </div>
              <Link
                href={`/${locale}/studio/foto/${p.slug}`}
                style={{
                  marginTop: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 18px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                Ver portfolio
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function MarketplaceListing({ photographers, locale }: SmartProps) {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    zone: '',
    speciality: '',
    minRating: 0,
    limit: 20,
  });

  const allZones = useMemo(() => {
    const set = new Set<string>();
    for (const p of photographers) {
      for (const z of p.specialityZones) set.add(z);
    }
    return Array.from(set).sort();
  }, [photographers]);

  const allSpecialities = useMemo(() => {
    const set = new Set<string>();
    for (const p of photographers) {
      for (const t of p.tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [photographers]);

  return (
    <MarketplaceListingPresentation
      photographers={photographers}
      locale={locale}
      filters={filters}
      allZones={allZones}
      allSpecialities={allSpecialities}
      onFiltersChange={setFilters}
    />
  );
}
