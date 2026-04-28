// F14.F.10 Sprint 9 SUB-AGENT 4 — Photographer portfolio public page (server component).

import type { CSSProperties } from 'react';
import { IconCircle } from '@/shared/ui/primitives/canon';
import { PortfolioVideoGrid, type PortfolioVideoItem } from './PortfolioVideoGrid';
import { PricingCalculator } from './PricingCalculator';

export interface PhotographerPortfolioData {
  readonly photographer: {
    readonly id: string;
    readonly userId: string;
    readonly businessName: string;
    readonly slug: string;
    readonly bio: string | null;
    readonly phone: string | null;
    readonly email: string;
    readonly website: string | null;
    readonly specialityZones: ReadonlyArray<string>;
    readonly yearsExperience: number | null;
    readonly ratingAvg: number;
    readonly clientsCount: number;
    readonly videosGeneratedTotal: number;
    readonly whiteLabelEnabled: boolean;
    readonly whiteLabelCustomFooter: string | null;
    readonly markupPct: number;
  };
  readonly videos: ReadonlyArray<PortfolioVideoItem>;
}

interface Props {
  readonly data: PhotographerPortfolioData;
  readonly slug: string;
  readonly locale: string;
}

const sectionStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
  padding: '32px',
};

const heroStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  padding: '48px 24px',
  textAlign: 'center',
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '40px',
  color: 'var(--canon-cream)',
  lineHeight: 1.1,
  margin: 0,
  backgroundImage: 'linear-gradient(90deg, #6366F1, #EC4899)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 12px',
  borderRadius: '9999px',
  border: '1px solid rgba(99, 102, 241, 0.30)',
  background: 'rgba(99, 102, 241, 0.10)',
  color: 'var(--canon-indigo-2)',
  fontSize: '12px',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
};

const statCardStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '8px',
};

const statNumberStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '28px',
  color: 'var(--canon-cream)',
  fontVariantNumeric: 'tabular-nums',
  margin: 0,
};

const statLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.65)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

export function PhotographerPortfolioPage({ data, slug }: Props) {
  const { photographer, videos } = data;
  const initials = getInitials(photographer.businessName);
  const mailtoHref = `mailto:${photographer.email}?subject=${encodeURIComponent(`Reservar sesión — ${photographer.businessName}`)}`;

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
      data-photographer-slug={slug}
    >
      <header style={heroStyle}>
        <IconCircle
          size="lg"
          tone="indigo"
          icon={
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '16px',
              }}
            >
              {initials}
            </span>
          }
        />
        <h1 style={titleStyle}>{photographer.businessName}</h1>
        {photographer.bio ? (
          <p
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.75)',
              maxWidth: '640px',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {photographer.bio}
          </p>
        ) : null}
        {photographer.specialityZones.length > 0 ? (
          // biome-ignore lint/a11y/useSemanticElements: chips list with custom flex layout; ul/li would inject default list styling.
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
            role="list"
            aria-label="Zonas de especialidad"
          >
            {photographer.specialityZones.map((zone) => (
              <span key={zone} style={chipStyle}>
                {zone}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section
        aria-label="Estadísticas del fotógrafo"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <article style={statCardStyle}>
          <span style={statLabelStyle}>Años de experiencia</span>
          <p style={statNumberStyle}>{photographer.yearsExperience ?? 0}</p>
        </article>
        <article style={statCardStyle}>
          <span style={statLabelStyle}>Clientes</span>
          <p style={statNumberStyle}>{photographer.clientsCount}</p>
        </article>
        <article style={statCardStyle}>
          <span style={statLabelStyle}>Videos generados</span>
          <p style={statNumberStyle}>{photographer.videosGeneratedTotal}</p>
        </article>
        <article style={statCardStyle}>
          <span style={statLabelStyle}>Rating promedio</span>
          <p style={statNumberStyle}>
            {photographer.ratingAvg > 0 ? photographer.ratingAvg.toFixed(1) : '—'}
          </p>
        </article>
      </section>

      <PortfolioVideoGrid videos={videos} photographerId={photographer.id} />

      <section style={sectionStyle} aria-label="Reservar sesión">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '22px',
            color: 'var(--canon-cream)',
            marginTop: 0,
          }}
        >
          Reservar sesión
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-text)',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
          }}
        >
          Contacta al fotógrafo para agendar tu sesión. Recibirás una respuesta directa.
        </p>
        <div
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#fcd34d',
            fontFamily: 'var(--font-text)',
            fontSize: '12px',
          }}
          data-disclosure-flag="true"
          role="status"
        >
          STUB ADR-018 — formulario de inquiry persistente disponible H2
          (L-NEW-PHOTOGRAPHER-LEAD-INQUIRIES). H1: usa el botón de email directo.
        </div>
        <a
          href={mailtoHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '16px',
            padding: '12px 24px',
            borderRadius: '9999px',
            background: 'linear-gradient(90deg, #6366F1, #EC4899)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
          }}
        >
          Enviar email al fotógrafo
        </a>
      </section>

      <PricingCalculator
        photographerId={photographer.id}
        initialMarkupPct={photographer.markupPct}
      />

      <footer
        style={{
          ...sectionStyle,
          textAlign: 'center',
          fontFamily: 'var(--font-text)',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.65)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <a href={mailtoHref} style={{ color: 'var(--canon-indigo-2)', textDecoration: 'none' }}>
            {photographer.email}
          </a>
          {photographer.phone ? (
            <a
              href={`tel:${photographer.phone}`}
              style={{ color: 'var(--canon-indigo-2)', textDecoration: 'none' }}
            >
              {photographer.phone}
            </a>
          ) : null}
          {photographer.website ? (
            <a
              href={photographer.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--canon-indigo-2)', textDecoration: 'none' }}
            >
              Web
            </a>
          ) : null}
        </div>
        <p style={{ marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          {photographer.whiteLabelEnabled && photographer.whiteLabelCustomFooter
            ? photographer.whiteLabelCustomFooter
            : 'Portfolio público generado automáticamente · DMX Studio'}
        </p>
      </footer>
    </main>
  );
}
